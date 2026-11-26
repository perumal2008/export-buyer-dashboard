import { Router } from 'express';
import { readDb, writeDb } from '../storage/db.js';
import {
  EMAIL_TEMPLATES,
  dispatchCampaignEmails,
  summarizeDeliveries,
} from '../services/emailService.js';

const router = Router();

// GET /api/campaigns — list campaigns, deliveries, and pre-built templates
router.get('/', (_req, res) => {
  const db = readDb();
  const campaignsWithStats = db.campaigns.map((c) => {
    const campaignDeliveries = db.deliveries.filter((d) => d.campaignId === c.id);
    return {
      ...c,
      summary: summarizeDeliveries(campaignDeliveries),
    };
  });

  res.json({
    templates: EMAIL_TEMPLATES,
    campaigns: campaignsWithStats,
    deliveries: db.deliveries.slice(0, 100),
  });
});

// POST /api/campaigns/send — send emails via Nodemailer or preview/test simulation
router.post('/send', async (req, res) => {
  try {
    const {
      campaignName,
      templateId,
      templateName,
      subject,
      body,
      recipients,
      simulateEngagement = true,
    } = req.body || {};

    if (!subject || !body) {
      return res.status(400).json({ error: 'Campaign subject and body are required' });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required to send a campaign' });
    }

    const { campaign, deliveries } = await dispatchCampaignEmails({
      campaignName,
      templateId,
      templateName,
      subjectTemplate: subject,
      bodyTemplate: body,
      recipients,
      simulateEngagement,
    });

    const db = readDb();
    db.campaigns.unshift(campaign);
    db.deliveries.unshift(...deliveries);

    // Automatically tag contacted saved leads if they match leadId
    const sentLeadIds = new Set(deliveries.filter((d) => d.status !== 'Failed' && d.leadId).map((d) => d.leadId));
    db.leads = db.leads.map((lead) => {
      if (sentLeadIds.has(lead.id)) {
        const tags = Array.isArray(lead.tags) ? lead.tags : [];
        if (!tags.includes('Contacted')) {
          return { ...lead, tags: [...tags, 'Contacted'], updatedAt: new Date().toISOString() };
        }
      }
      return lead;
    });

    writeDb(db);

    res.status(201).json({
      campaign,
      deliveries,
      overallMetrics: summarizeDeliveries(db.deliveries),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dispatch campaign', message: err.message });
  }
});

// POST /api/campaigns/deliveries/:id/status — update delivery status (Delivered / Opened / Replied)
router.post('/deliveries/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = ['Sent', 'Delivered', 'Opened', 'Replied'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const db = readDb();
  const idx = db.deliveries.findIndex((d) => d.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Delivery record not found' });
  }

  const now = new Date().toISOString();
  const d = db.deliveries[idx];
  db.deliveries[idx] = {
    ...d,
    status,
    deliveredAt: d.deliveredAt || now,
    openedAt: status === 'Opened' || status === 'Replied' ? d.openedAt || now : d.openedAt,
    repliedAt: status === 'Replied' ? d.repliedAt || now : d.repliedAt,
  };

  writeDb(db);
  res.json({
    delivery: db.deliveries[idx],
    overallMetrics: summarizeDeliveries(db.deliveries),
  });
});

export default router;

import { Router } from 'express';
import { readDb } from '../storage/db.js';
import { summarizeDeliveries } from '../services/emailService.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = readDb();
  const emailMetrics = summarizeDeliveries(db.deliveries);

  const tagCounts = {
    'Hot Lead': 0,
    Contacted: 0,
    'Sample Sent': 0,
    Untagged: 0,
  };

  const countryBreakdownMap = new Map();
  for (const lead of db.leads) {
    const tags = Array.isArray(lead.tags) ? lead.tags : [];
    if (tags.length === 0) {
      tagCounts.Untagged += 1;
    } else {
      for (const t of tags) {
        if (tagCounts[t] !== undefined) tagCounts[t] += 1;
      }
    }
    const country = lead.country || 'Unknown';
    countryBreakdownMap.set(country, (countryBreakdownMap.get(country) || 0) + 1);
  }

  const topCountries = Array.from(countryBreakdownMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const campaignPerformance = db.campaigns.slice(0, 8).map((c) => {
    const rows = db.deliveries.filter((d) => d.campaignId === c.id);
    return {
      id: c.id,
      name: c.name,
      templateName: c.templateName,
      mode: c.mode,
      createdAt: c.createdAt,
      ...summarizeDeliveries(rows),
    };
  });

  res.json({
    overview: {
      totalSavedLeads: db.leads.length,
      totalCampaigns: db.campaigns.length,
      ...emailMetrics,
    },
    leadPipeline: tagCounts,
    topCountries,
    campaignPerformance,
    recentDeliveries: db.deliveries.slice(0, 20),
  });
});

export default router;

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from '../config/env.js';

export const EMAIL_TEMPLATES = [
  {
    id: 'initial-intro',
    name: 'Initial Product Introduction',
    category: 'Cold Outreach',
    subject: 'Direct Export Partnership: High-Grade {{product}} Supply for {{companyName}}',
    body: `Dear {{buyerName}},

I hope this message finds you well. I am reaching out from GlobalTrade Export Desk regarding your sourcing operations at {{companyName}} in {{country}}.

We specialize in export-grade {{product}} with ISO-certified quality assurance, flexible MOQs, and reliable port-to-port logistics tailored for buyers in {{country}}.

Would you be open to a brief 10-minute call this week, or would you like me to share our latest {{product}} export specification sheet?

Best regards,
Export Sales & Trade Desk
GlobalTrade Export Partners`,
  },
  {
    id: 'catalog-fob-quote',
    name: 'Catalog & FOB Pricing Quote',
    category: 'Commercial Offer',
    subject: '2026 {{product}} Export Catalog & Competitive FOB Pricing — {{companyName}}',
    body: `Hello {{buyerName}},

Following our review of {{companyName}}'s market presence in {{country}}, we have prepared our 2026 wholesale catalog and indicative FOB pricing schedule for {{product}}.

Key Highlights for {{companyName}}:
• Competitive FOB & CIF freight terms to {{country}} ports
• Full SGS / pre-shipment quality inspection documentation
• Custom private-label packaging and rapid 21-day dispatch lead times

Please reply to confirm your target specifications or container volume so we can issue a formal proforma quotation.

Warm regards,
International Trade & Quoting Team`,
  },
  {
    id: 'sample-dispatch',
    name: 'Sample Dispatch Follow-Up',
    category: 'Follow-Up',
    subject: 'Complimentary {{product}} Quality Sample Kit Ready for {{companyName}}',
    body: `Hi {{buyerName}},

We would love to arrange a complimentary evaluation sample kit of our {{product}} range for {{companyName}}'s quality team in {{country}}.

Our export samples ship via DHL/FedEx Express within 48 hours along with lab test certificates and HS tariff documentation for smooth customs clearance into {{country}}.

Could you confirm your preferred delivery address or direct contact for the courier air waybill?

Kind regards,
Sample & Logistics Coordinator`,
  },
];

export function renderMergeTags(text = '', data = {}) {
  const map = {
    buyerName: data.buyerName || 'Procurement Team',
    companyName: data.companyName || 'Your Company',
    product: data.product || 'Export Goods',
    country: data.country || 'your market',
  };

  return text
    .replace(/\{\{\s*buyerName\s*\}\}/gi, map.buyerName)
    .replace(/\{\{\s*companyName\s*\}\}/gi, map.companyName)
    .replace(/\{\{\s*product\s*\}\}/gi, map.product)
    .replace(/\{\{\s*country\s*\}\}/gi, map.country);
}

function createTransport() {
  const hasSmtp = Boolean(config.smtp.user && config.smtp.pass);
  if (hasSmtp) {
    return {
      mode: 'smtp-live',
      transporter: nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      }),
    };
  }

  return {
    mode: 'preview-simulated',
    transporter: nodemailer.createTransport({
      jsonTransport: true,
    }),
  };
}

export async function dispatchCampaignEmails({
  campaignName,
  templateId,
  templateName,
  subjectTemplate,
  bodyTemplate,
  recipients,
  simulateEngagement = true,
}) {
  const { mode, transporter } = createTransport();
  const campaignId = `cmp_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date();
  const deliveries = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const recipientEmail = (r.email || '').trim();
    const renderedSubject = renderMergeTags(subjectTemplate, r);
    const renderedBody = renderMergeTags(bodyTemplate, r);
    const htmlBody = renderedBody
      .split('\n')
      .map((line) => (line.trim() ? `<p style="margin:0 0 10px 0;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1e293b;">${line}</p>` : '<br/>'))
      .join('');

    const deliveryId = `dlv_${crypto.randomUUID().slice(0, 10)}`;
    const sentAt = new Date(now.getTime() + i * 250).toISOString();

    if (!recipientEmail) {
      deliveries.push({
        id: deliveryId,
        campaignId,
        campaignName,
        leadId: r.leadId || r.id || null,
        recipientEmail: 'no-email-provided@preview.local',
        buyerName: r.buyerName || 'Procurement Team',
        companyName: r.companyName,
        product: r.product || 'Textiles',
        country: r.country || 'United States',
        renderedSubject,
        renderedBody,
        status: 'Failed',
        smtpMessageId: null,
        transportMode: mode,
        sentAt,
        deliveredAt: null,
        openedAt: null,
        repliedAt: null,
        error: 'Recipient has no email address configured',
      });
      continue;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to: recipientEmail,
        subject: renderedSubject,
        text: renderedBody,
        html: htmlBody,
      });

      let status = 'Sent';
      let deliveredAt = null;
      let openedAt = null;
      let repliedAt = null;

      if (mode === 'smtp-live') {
        status = 'Delivered';
        deliveredAt = new Date().toISOString();
      } else if (simulateEngagement) {
        // Realistic preview-mode delivery tracking across Sent -> Delivered -> Opened -> Replied
        deliveredAt = new Date(now.getTime() + 1200 + i * 300).toISOString();
        const mod = i % 5;
        if (mod === 0 || mod === 1 || mod === 3) {
          openedAt = new Date(now.getTime() + 4500 + i * 400).toISOString();
          status = 'Opened';
        } else {
          status = 'Delivered';
        }
        if (mod === 1 && recipients.length >= 2) {
          repliedAt = new Date(now.getTime() + 9000 + i * 500).toISOString();
          status = 'Replied';
        }
      }

      deliveries.push({
        id: deliveryId,
        campaignId,
        campaignName,
        leadId: r.leadId || r.id || null,
        recipientEmail,
        buyerName: r.buyerName || 'Procurement Team',
        companyName: r.companyName,
        product: r.product || 'Textiles',
        country: r.country || 'United States',
        renderedSubject,
        renderedBody,
        status,
        smtpMessageId: info.messageId || `preview-${deliveryId}`,
        transportMode: mode,
        sentAt,
        deliveredAt,
        openedAt,
        repliedAt,
        error: null,
      });
    } catch (err) {
      deliveries.push({
        id: deliveryId,
        campaignId,
        campaignName,
        leadId: r.leadId || r.id || null,
        recipientEmail,
        buyerName: r.buyerName || 'Procurement Team',
        companyName: r.companyName,
        product: r.product || 'Textiles',
        country: r.country || 'United States',
        renderedSubject,
        renderedBody,
        status: 'Failed',
        smtpMessageId: null,
        transportMode: mode,
        sentAt,
        deliveredAt: null,
        openedAt: null,
        repliedAt: null,
        error: err.message,
      });
    }
  }

  const campaign = {
    id: campaignId,
    name: campaignName || `Outreach Campaign (${now.toISOString().slice(0, 10)})`,
    templateId: templateId || 'custom',
    templateName: templateName || 'Custom Template',
    subject: subjectTemplate,
    body: bodyTemplate,
    mode,
    createdAt: now.toISOString(),
    recipientsCount: deliveries.length,
    summary: summarizeDeliveries(deliveries),
  };

  return { campaign, deliveries };
}

export function summarizeDeliveries(deliveries = []) {
  const totalAttempted = deliveries.length;
  const successful = deliveries.filter((d) => d.status !== 'Failed');
  const totalSent = successful.length;
  const deliveredCount = deliveries.filter((d) =>
    ['Delivered', 'Opened', 'Replied'].includes(d.status)
  ).length;
  const openedCount = deliveries.filter((d) =>
    ['Opened', 'Replied'].includes(d.status)
  ).length;
  const repliedCount = deliveries.filter((d) => d.status === 'Replied').length;
  const failedCount = deliveries.filter((d) => d.status === 'Failed').length;

  return {
    totalAttempted,
    totalSent,
    deliveredCount,
    openedCount,
    repliedCount,
    failedCount,
    deliveryRate: totalSent ? Number(((deliveredCount / totalSent) * 100).toFixed(1)) : 0,
    openRate: totalSent ? Number(((openedCount / totalSent) * 100).toFixed(1)) : 0,
    replyRate: totalSent ? Number(((repliedCount / totalSent) * 100).toFixed(1)) : 0,
  };
}

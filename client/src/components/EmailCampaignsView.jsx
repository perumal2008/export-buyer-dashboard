import React, { useState, useEffect, useRef } from 'react';
import { renderTemplateText, formatTimestamp } from '../utils/formatters';

const MERGE_TAGS = ['{{buyerName}}', '{{companyName}}', '{{product}}', '{{country}}'];

export default function EmailCampaignsView({
  templates,
  campaigns,
  queuedRecipients,
  setQueuedRecipients,
  savedLeads,
  integrationStatus,
  onCampaignSent,
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('initial-intro');
  const [campaignName, setCampaignName] = useState('US Textiles Export Outreach Q4');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [testOverrideEmail, setTestOverrideEmail] = useState('');
  const [customRecipient, setCustomRecipient] = useState({
    buyerName: '',
    companyName: '',
    email: '',
    product: 'Textiles',
    country: 'United States',
  });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (tpl && !subject && !body) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  }, [templates, selectedTemplateId, subject, body]);

  const applyTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const insertMergeTag = (tag) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev} ${tag}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + tag + body.slice(end);
    setBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const activeRecipients =
    queuedRecipients.length > 0
      ? queuedRecipients
      : [
          {
            id: 'sample-preview',
            buyerName: 'Procurement & Import Desk',
            companyName: 'TIETEX INTERNATIONAL, LTD.',
            email: 'procurement@tietex.com',
            product: 'Textiles',
            country: 'United States',
          },
        ];

  const safePreviewIdx = Math.min(previewIdx, activeRecipients.length - 1);
  const previewRecipient = activeRecipients[safePreviewIdx] || {};

  const handleLoadSavedLeads = () => {
    if (savedLeads.length === 0) return;
    setQueuedRecipients(savedLeads);
    setPreviewIdx(0);
  };

  const handleAddCustomRecipient = (e) => {
    e.preventDefault();
    if (!customRecipient.companyName.trim() || !customRecipient.email.trim()) return;
    setQueuedRecipients((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        buyerName: customRecipient.buyerName.trim() || 'Procurement Manager',
        companyName: customRecipient.companyName.trim(),
        email: customRecipient.email.trim(),
        product: customRecipient.product.trim() || 'Textiles',
        country: customRecipient.country.trim() || 'United States',
      },
    ]);
    setCustomRecipient({
      buyerName: '',
      companyName: '',
      email: '',
      product: 'Textiles',
      country: 'United States',
    });
  };

  const handleRemoveRecipient = (id) => {
    setQueuedRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSendCampaign = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    setSendResult(null);

    try {
      const preparedRecipients = activeRecipients.map((r) => ({
        leadId: r.id,
        buyerName: r.buyerName || 'Procurement Team',
        companyName: r.companyName,
        email:
          testOverrideEmail.trim() ||
          r.email ||
          (r.domain ? `procurement@${r.domain}` : `outreach@${(r.companyName || 'buyer').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14)}.example.com`),
        product: r.product || 'Textiles',
        country: r.country || 'United States',
      }));

      const activeTpl = templates.find((t) => t.id === selectedTemplateId);
      const data = await onCampaignSent({
        campaignName: campaignName.trim() || 'Export Outreach Campaign',
        templateId: selectedTemplateId,
        templateName: activeTpl?.name || 'Custom Template',
        subject,
        body,
        recipients: preparedRecipients,
        simulateEngagement: true,
      });

      setSendResult(data);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const smtpConfigured = integrationStatus?.email?.smtpConfigured;

  return (
    <div className="row g-3">
      {/* Left Column: Composer */}
      <div className="col-12 col-xl-7 d-flex flex-column gap-3">
        <div className="saas-card p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <h2 className="h6 fw-bold mb-1">Interactive Email Campaign Composer</h2>
              <div className="text-muted small">
                Personalize B2B buyer outreach with dynamic merge tags and send via Nodemailer.
              </div>
            </div>
            <span className={`badge py-2 px-3 ${smtpConfigured ? 'text-bg-success' : 'text-bg-info bg-opacity-25 text-dark border'}`}>
              <i className={`bi ${smtpConfigured ? 'bi-send-check' : 'bi-flask'} me-1`} />
              {smtpConfigured ? 'Live SMTP Enabled' : 'Nodemailer Preview / Test Mode'}
            </span>
          </div>

          {/* Template Picker */}
          <div className="mb-3">
            <label className="form-label small fw-semibold text-secondary mb-2">
              Pre-Built B2B Export Templates
            </label>
            <div className="row g-2">
              {templates.map((tpl) => (
                <div key={tpl.id} className="col-12 col-md-4">
                  <button
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={`w-100 text-start p-2 rounded-3 border h-100 ${
                      selectedTemplateId === tpl.id
                        ? 'border-primary bg-primary bg-opacity-10'
                        : 'bg-light border-secondary-subtle'
                    }`}
                  >
                    <div className="small fw-semibold text-dark">{tpl.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {tpl.category}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendCampaign} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label small fw-semibold text-secondary mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                className="form-control"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label small fw-semibold text-secondary mb-1">
                Subject Line
              </label>
              <input
                type="text"
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                <label className="form-label small fw-semibold text-secondary mb-0">
                  Email Body
                </label>
                <div className="d-flex flex-wrap align-items-center gap-1">
                  <span className="small text-muted me-1">Insert Tag:</span>
                  {MERGE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="merge-chip"
                      onClick={() => insertMergeTag(tag)}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                ref={bodyRef}
                className="form-control font-mono"
                rows={9}
                style={{ fontSize: '0.84rem' }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            {/* Optional Test Override Email */}
            <div className="p-3 rounded-3 bg-light border">
              <label className="form-label small fw-semibold text-dark mb-1">
                Test Delivery Email Override (Optional)
              </label>
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="Leave blank to use each buyer's email, or enter a test inbox (e.g. your.email@gmail.com)"
                value={testOverrideEmail}
                onChange={(e) => setTestOverrideEmail(e.target.value)}
              />
              <div className="text-muted mt-1" style={{ fontSize: '0.73rem' }}>
                Useful when testing live SMTP or verifying rendered merge tags for registry entities without public contact emails.
              </div>
            </div>

            {sendError && (
              <div className="alert alert-danger py-2 mb-0">{sendError}</div>
            )}

            {sendResult && (
              <div className="alert alert-success mb-0">
                <div className="fw-bold d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-check-circle-fill" />
                  Campaign Dispatched ({sendResult.campaign.mode})
                </div>
                <div className="small">
                  Sent: <strong>{sendResult.campaign.summary.totalSent}</strong> · Delivered:{' '}
                  <strong>{sendResult.campaign.summary.deliveredCount}</strong> · Opened:{' '}
                  <strong>{sendResult.campaign.summary.openedCount}</strong> · Replied:{' '}
                  <strong>{sendResult.campaign.summary.repliedCount}</strong>
                </div>
              </div>
            )}

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="small text-muted">
                Ready to send to <strong>{activeRecipients.length}</strong> recipient(s)
              </div>
              <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={sending}>
                {sending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-2" />
                    Send Campaign ({activeRecipients.length})
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Recipients & Live Preview */}
      <div className="col-12 col-xl-5 d-flex flex-column gap-3">
        {/* Recipient Queue */}
        <div className="saas-card p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h3 className="h6 fw-bold mb-0">
              Recipient Queue ({queuedRecipients.length || 1})
            </h3>
            <div className="d-flex gap-1">
              {savedLeads.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleLoadSavedLeads}
                >
                  Load Saved ({savedLeads.length})
                </button>
              )}
              {queuedRecipients.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setQueuedRecipients([])}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: 190, overflowY: 'auto' }} className="d-flex flex-column gap-1 mb-2">
            {activeRecipients.map((r, idx) => (
              <div
                key={r.id || idx}
                className={`p-2 rounded border d-flex align-items-center justify-content-between gap-2 ${
                  idx === safePreviewIdx ? 'border-primary bg-primary bg-opacity-10' : 'bg-light'
                }`}
                style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                onClick={() => setPreviewIdx(idx)}
              >
                <div className="text-truncate">
                  <div className="fw-semibold text-dark text-truncate">{r.companyName}</div>
                  <div className="text-muted font-mono text-truncate" style={{ fontSize: '0.73rem' }}>
                    {testOverrideEmail.trim() || r.email || (r.domain ? `procurement@${r.domain}` : 'Preview test email')}
                  </div>
                </div>
                {queuedRecipients.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger p-0"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleRemoveRecipient(r.id);
                    }}
                    title="Remove"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Add Test Recipient */}
          <form onSubmit={handleAddCustomRecipient} className="row g-1 pt-2 border-top">
            <div className="col-6">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Company name"
                value={customRecipient.companyName}
                onChange={(e) => setCustomRecipient({ ...customRecipient, companyName: e.target.value })}
              />
            </div>
            <div className="col-6">
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="recipient@domain.com"
                value={customRecipient.email}
                onChange={(e) => setCustomRecipient({ ...customRecipient, email: e.target.value })}
              />
            </div>
            <div className="col-6">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Buyer name"
                value={customRecipient.buyerName}
                onChange={(e) => setCustomRecipient({ ...customRecipient, buyerName: e.target.value })}
              />
            </div>
            <div className="col-6 d-grid">
              <button type="submit" className="btn btn-sm btn-outline-dark">
                + Add Recipient
              </button>
            </div>
          </form>
        </div>

        {/* Live Merge-Tag Preview */}
        <div className="saas-card p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h3 className="h6 fw-bold mb-0">Live Merge-Tag Preview</h3>
            <span className="badge text-bg-light border text-dark">
              {previewRecipient.companyName}
            </span>
          </div>
          <div className="p-3 rounded-3 border bg-light">
            <div className="small text-muted mb-1">
              <strong>To:</strong>{' '}
              <span className="font-mono">
                {testOverrideEmail.trim() || previewRecipient.email || 'procurement@preview.local'}
              </span>
            </div>
            <div className="small text-dark mb-2 pb-2 border-bottom">
              <strong>Subject:</strong> {renderTemplateText(subject, previewRecipient)}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: 1.55 }}>
              {renderTemplateText(body, previewRecipient)}
            </div>
          </div>
        </div>

        {/* Recent Campaigns History */}
        {campaigns.length > 0 && (
          <div className="saas-card p-3">
            <h3 className="h6 fw-bold mb-2">Recent Dispatched Campaigns</h3>
            <div className="d-flex flex-column gap-2">
              {campaigns.slice(0, 4).map((cmp) => (
                <div key={cmp.id} className="p-2 rounded border bg-light small">
                  <div className="d-flex justify-content-between fw-semibold text-dark">
                    <span>{cmp.name}</span>
                    <span className="badge text-bg-primary">{cmp.summary?.totalSent || 0} sent</span>
                  </div>
                  <div className="text-muted d-flex justify-content-between mt-1" style={{ fontSize: '0.73rem' }}>
                    <span>{cmp.templateName}</span>
                    <span>{formatTimestamp(cmp.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { formatTimestamp } from '../utils/formatters';

function getDeliveryBadge(status) {
  switch (status) {
    case 'Replied':
      return 'text-bg-success';
    case 'Opened':
      return 'text-bg-primary';
    case 'Delivered':
      return 'text-bg-info bg-opacity-25 text-dark border';
    case 'Failed':
      return 'text-bg-danger';
    default:
      return 'text-bg-secondary';
  }
}

export default function AnalyticsView({ analytics, onRefresh, onUpdateDeliveryStatus }) {
  const overview = analytics?.overview || {};
  const pipeline = analytics?.leadPipeline || {};
  const topCountries = analytics?.topCountries || [];
  const campaignPerformance = analytics?.campaignPerformance || [];
  const recentDeliveries = analytics?.recentDeliveries || [];

  const totalLeads = overview.totalSavedLeads || 0;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h2 className="h6 fw-bold mb-0">Live Outreach &amp; Pipeline Metrics</h2>
          <div className="text-muted small">
            Real-time delivery telemetry and saved lead funnel persisted on backend storage.
          </div>
        </div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise me-1" />
          Refresh Metrics
        </button>
      </div>

      {/* KPI Row */}
      <div className="row g-3">
        <div className="col-6 col-xl-3">
          <div className="kpi-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium">Total Sent</div>
                <div className="fs-3 fw-bold text-dark mt-1">{overview.totalSent ?? 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Across {overview.totalCampaigns ?? 0} campaign(s)
                </div>
              </div>
              <div className="kpi-icon bg-primary bg-opacity-10 text-primary">
                <i className="bi bi-send-check" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="kpi-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium">Delivery Rate</div>
                <div className="fs-3 fw-bold text-dark mt-1">{overview.deliveryRate ?? 0}%</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {overview.deliveredCount ?? 0} delivered
                </div>
              </div>
              <div className="kpi-icon bg-info bg-opacity-10 text-info">
                <i className="bi bi-mailbox2" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="kpi-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium">Open Rate</div>
                <div className="fs-3 fw-bold text-success mt-1">{overview.openRate ?? 0}%</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {overview.openedCount ?? 0} opened
                </div>
              </div>
              <div className="kpi-icon bg-success bg-opacity-10 text-success">
                <i className="bi bi-envelope-open" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="kpi-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium">Reply Rate</div>
                <div className="fs-3 fw-bold text-dark mt-1">{overview.replyRate ?? 0}%</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {overview.repliedCount ?? 0} buyer replies
                </div>
              </div>
              <div className="kpi-icon bg-warning bg-opacity-10 text-warning">
                <i className="bi bi-chat-dots" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel & Country Distribution */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="saas-card p-3 p-md-4 h-100">
            <h3 className="h6 fw-bold mb-3">Saved Leads Funnel ({totalLeads} total)</h3>
            {[
              { label: 'Hot Lead', value: pipeline['Hot Lead'] || 0, color: 'bg-danger' },
              { label: 'Contacted', value: pipeline.Contacted || 0, color: 'bg-primary' },
              { label: 'Sample Sent', value: pipeline['Sample Sent'] || 0, color: 'bg-info' },
              { label: 'Untagged', value: pipeline.Untagged || 0, color: 'bg-secondary' },
            ].map((item) => {
              const pct = totalLeads ? Math.round((item.value / totalLeads) * 100) : 0;
              return (
                <div key={item.label} className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-medium text-dark">{item.label}</span>
                    <span className="text-muted font-mono">
                      {item.value} ({pct}%)
                    </span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className={`progress-bar ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="saas-card p-3 p-md-4 h-100">
            <h3 className="h6 fw-bold mb-3">Top Target Markets (Saved Leads)</h3>
            {topCountries.length === 0 ? (
              <div className="text-muted small py-4 text-center">
                Save leads from Buyer Discovery to visualize target market breakdown.
              </div>
            ) : (
              topCountries.map((row) => {
                const pct = totalLeads ? Math.round((row.count / totalLeads) * 100) : 0;
                return (
                  <div key={row.country} className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="fw-medium text-dark">{row.country}</span>
                      <span className="text-muted font-mono">
                        {row.count} leads ({pct}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Campaign Summary Table */}
      <div className="saas-card overflow-hidden">
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
          <h3 className="h6 fw-bold mb-0">Recent Delivery Activity Log</h3>
          <span className="text-muted small">{recentDeliveries.length} recent events</span>
        </div>

        {recentDeliveries.length === 0 ? (
          <div className="p-4 text-center text-muted small">
            No emails dispatched yet. Go to Email Campaigns to send your first outreach campaign.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table buyer-table mb-0">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Transport</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th className="text-end">Track Event</th>
                </tr>
              </thead>
              <tbody>
                {recentDeliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="fw-semibold text-dark">{d.companyName}</td>
                    <td className="font-mono small">{d.recipientEmail}</td>
                    <td className="text-truncate" style={{ maxWidth: 260 }}>
                      {d.renderedSubject}
                    </td>
                    <td>
                      <span className="badge text-bg-light border text-dark">
                        {d.transportMode}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getDeliveryBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="font-mono small text-muted">{formatTimestamp(d.sentAt)}</td>
                    <td className="text-end text-nowrap">
                      {d.status !== 'Opened' && d.status !== 'Replied' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => onUpdateDeliveryStatus(d.id, 'Opened')}
                        >
                          Mark Opened
                        </button>
                      )}
                      {d.status !== 'Replied' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => onUpdateDeliveryStatus(d.id, 'Replied')}
                        >
                          Mark Replied
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {campaignPerformance.length > 0 && (
        <div className="saas-card overflow-hidden">
          <div className="p-3 border-bottom">
            <h3 className="h6 fw-bold mb-0">Campaign Performance Breakdown</h3>
          </div>
          <div className="table-responsive">
            <table className="table buyer-table mb-0">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Template</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Open Rate</th>
                  <th>Reply Rate</th>
                </tr>
              </thead>
              <tbody>
                {campaignPerformance.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold text-dark">{c.name}</td>
                    <td className="text-muted">{c.templateName}</td>
                    <td className="font-mono">{c.totalSent}</td>
                    <td className="font-mono">{c.deliveredCount}</td>
                    <td className="font-mono text-success fw-semibold">{c.openRate}%</td>
                    <td className="font-mono">{c.replyRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

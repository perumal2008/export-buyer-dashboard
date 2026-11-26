import React from 'react';

const NAV_ITEMS = [
  { id: 'discovery', label: 'Buyer Discovery', icon: 'bi-globe-americas' },
  { id: 'leads', label: 'Saved Leads', icon: 'bi-bookmark-check' },
  { id: 'campaigns', label: 'Email Campaigns', icon: 'bi-envelope-paper' },
  { id: 'analytics', label: 'Analytics', icon: 'bi-bar-chart-line' },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  savedLeadsCount,
  queuedRecipientsCount,
  integrationStatus,
  mobileOpen,
  onCloseMobile,
}) {
  const buyerInfo = integrationStatus?.buyerDiscovery;
  const emailInfo = integrationStatus?.email;

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop d-lg-none" onClick={onCloseMobile} />}
      <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <i className="bi bi-compass-fill" />
          </div>
          <div>
            <div className="fw-bold text-white" style={{ fontSize: '1.02rem', lineHeight: 1.2 }}>
              TradePulse
            </div>
            <div className="text-secondary" style={{ fontSize: '0.73rem' }}>
              Export Buyer & Outreach
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const badge =
              item.id === 'leads'
                ? savedLeadsCount
                : item.id === 'campaigns' && queuedRecipientsCount > 0
                  ? queuedRecipientsCount
                  : null;

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
              >
                <span className="d-flex align-items-center gap-2">
                  <i className={`bi ${item.icon}`} />
                  <span>{item.label}</span>
                </span>
                {badge !== null && (
                  <span
                    className={`badge rounded-pill ${
                      isActive ? 'bg-white text-primary' : 'bg-secondary bg-opacity-50 text-light'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-semibold text-secondary" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                Live Connectors
              </span>
              <span className="live-dot" />
            </div>
            <div className="text-light fw-medium mb-1" style={{ fontSize: '0.77rem' }}>
              <i className="bi bi-database-check text-success me-1" />
              {buyerInfo?.mode || 'Checking live APIs...'}
            </div>
            <div className="text-secondary" style={{ fontSize: '0.74rem' }}>
              <i className={`bi ${emailInfo?.smtpConfigured ? 'bi-send-check text-success' : 'bi-envelope-check text-info'} me-1`} />
              {emailInfo?.smtpConfigured
                ? `SMTP Live (${emailInfo.smtpHost})`
                : 'Email: Nodemailer Preview Mode'}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

import React, { useState } from 'react';

export default function TopBar({
  activeTab,
  quickQuery,
  onQuickSearch,
  integrationStatus,
  onOpenMobileSidebar,
  onJumpToCampaign,
  queuedCount,
}) {
  const [inputVal, setInputVal] = useState(quickQuery || '');

  const tabTitles = {
    discovery: 'Real-Time Export Buyer Discovery',
    leads: 'Saved Leads & Shortlists',
    campaigns: 'Email Marketing & B2B Outreach',
    analytics: 'Outreach Funnel & Campaign Analytics',
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onQuickSearch(inputVal.trim());
    }
  };

  return (
    <header className="app-topbar d-flex flex-wrap align-items-center justify-content-between gap-3">
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-lg-none"
          onClick={onOpenMobileSidebar}
          aria-label="Toggle Menu"
        >
          <i className="bi bi-list fs-5" />
        </button>
        <div>
          <h1 className="h6 mb-0 fw-bold text-dark">{tabTitles[activeTab] || 'Dashboard'}</h1>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
            Live Trade & Importer Intelligence Platform
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
        <form onSubmit={handleSubmit} className="d-flex align-items-center">
          <div className="input-group input-group-sm" style={{ width: '270px' }}>
            <span className="input-group-text bg-light border-end-0 text-muted">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 bg-light"
              placeholder="Quick search product or HS code..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Go
            </button>
          </div>
        </form>

        <span className="badge rounded-pill text-bg-light border d-none d-md-inline-flex align-items-center gap-1 py-2 px-3">
          <span className="live-dot" />
          <span className="text-dark fw-medium">
            {integrationStatus?.buyerDiscovery?.apolloConfigured ? 'Apollo Live' : 'Open-Data Live'}
          </span>
        </span>

        <button
          type="button"
          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
          onClick={onJumpToCampaign}
        >
          <i className="bi bi-send" />
          <span>Campaigns</span>
          {queuedCount > 0 && <span className="badge bg-primary text-white">{queuedCount}</span>}
        </button>
      </div>
    </header>
  );
}

import React, { useState, useMemo } from 'react';
import {
  formatCurrencyCompact,
  formatTimestamp,
  LEAD_TAGS,
  getTagBadgeClass,
} from '../utils/formatters';
import { exportBuyersToCsv } from '../utils/csvExport';

const PRESET_SEARCHES = [
  { label: 'Textiles · United States', product: 'Textiles', country: 'United States', industry: 'Apparel & Textiles', role: 'Importer' },
  { label: 'Coffee & Spices · Germany', product: 'Coffee', country: 'Germany', industry: 'Food & Beverage', role: 'Wholesale Buyer' },
  { label: 'Electronics · United Kingdom', product: 'Electronics', country: 'United Kingdom', industry: 'Consumer Electronics', role: 'Procurement Manager' },
  { label: 'Machinery · Canada', product: 'Machinery', country: 'Canada', industry: 'Industrial Equipment', role: 'Purchasing Director' },
];

const COUNTRY_SUGGESTIONS = [
  'United States',
  'Germany',
  'United Kingdom',
  'Canada',
  'Netherlands',
  'France',
  'Japan',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'India',
  'Italy',
  'Spain',
  'Brazil',
];

const ROLE_OPTIONS = [
  'Importer',
  'Wholesale Buyer',
  'Procurement Manager',
  'Purchasing Director',
  'Supply Chain Head',
];

export default function BuyerDiscoveryView({
  searchParams,
  onChangeSearchParams,
  onRunSearch,
  discoveryData,
  loading,
  error,
  savedLeads,
  onSaveLeads,
  onToggleLeadTag,
  onSendToCampaign,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [showTrace, setShowTrace] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const buyers = discoveryData?.buyers || [];
  const meta = discoveryData?.meta;
  const tradeContext = discoveryData?.tradeContext;

  const savedLookup = useMemo(() => {
    const map = new Map();
    for (const lead of savedLeads) {
      if (lead.lei) map.set(`lei:${lead.lei}`, lead);
      map.set(`name:${lead.companyName.toLowerCase()}`, lead);
    }
    return map;
  }, [savedLeads]);

  const findSavedLead = (buyer) => {
    if (buyer.lei && savedLookup.has(`lei:${buyer.lei}`)) {
      return savedLookup.get(`lei:${buyer.lei}`);
    }
    return savedLookup.get(`name:${(buyer.companyName || '').toLowerCase()}`) || null;
  };

  const allSelected = buyers.length > 0 && selectedIds.length === buyers.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(buyers.map((b) => b.id));
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedBuyers = useMemo(
    () => buyers.filter((b) => selectedIds.includes(b.id)),
    [buyers, selectedIds]
  );

  const notifyAction = (text, variant = 'success') => {
    setActionMsg({ text, variant });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setSelectedIds([]);
    onRunSearch(searchParams);
  };

  const handleBulkSave = async (tags = []) => {
    if (selectedBuyers.length === 0) return;
    const payload = selectedBuyers.map((b) => ({ ...b, tags }));
    await onSaveLeads(payload);
    notifyAction(
      tags.length
        ? `Saved ${selectedBuyers.length} buyer(s) and tagged as "${tags.join(', ')}"`
        : `Saved ${selectedBuyers.length} buyer(s) to Saved Leads`
    );
  };

  const handleExportCsv = () => {
    const rows = selectedBuyers.length > 0 ? selectedBuyers : buyers;
    if (rows.length === 0) return;
    const slug = (searchParams.product || 'buyers').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportBuyersToCsv(rows, `export-buyers-${slug}.csv`);
    notifyAction(`Exported ${rows.length} buyer record(s) to CSV`, 'info');
  };

  const handleBulkCampaign = () => {
    const rows = selectedBuyers.length > 0 ? selectedBuyers : buyers.slice(0, 5);
    if (rows.length === 0) return;
    onSendToCampaign(rows);
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Search Filters Card */}
      <div className="saas-card p-3 p-md-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h2 className="h6 fw-bold mb-1">Discover Verified Global Importers & Buyers</h2>
            <p className="text-muted mb-0" style={{ fontSize: '0.83rem' }}>
              Queries Apollo.io / Hunter.io when configured, or automatically cascades to live OpenCorporates, GLEIF Legal Entity Registry &amp; UN Comtrade trade data.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-1">
            {PRESET_SEARCHES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="btn btn-light btn-sm border"
                style={{ fontSize: '0.75rem' }}
                onClick={() => {
                  const next = {
                    product: preset.product,
                    country: preset.country,
                    industry: preset.industry,
                    role: preset.role,
                  };
                  onChangeSearchParams(next);
                  setSelectedIds([]);
                  onRunSearch(next);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label fw-semibold small text-secondary mb-1">
              Product / HS Code
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Textiles, 5208, Coffee..."
              value={searchParams.product}
              onChange={(e) => onChangeSearchParams({ ...searchParams, product: e.target.value })}
              required
            />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label fw-semibold small text-secondary mb-1">
              Target Country
            </label>
            <input
              type="text"
              list="country-suggestions"
              className="form-control"
              placeholder="e.g. United States, Germany..."
              value={searchParams.country}
              onChange={(e) => onChangeSearchParams({ ...searchParams, country: e.target.value })}
              required
            />
            <datalist id="country-suggestions">
              {COUNTRY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="col-12 col-md-2">
            <label className="form-label fw-semibold small text-secondary mb-1">
              Industry
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Apparel & Wholesale"
              value={searchParams.industry}
              onChange={(e) => onChangeSearchParams({ ...searchParams, industry: e.target.value })}
            />
          </div>

          <div className="col-12 col-md-2">
            <label className="form-label fw-semibold small text-secondary mb-1">
              Target Buyer Role
            </label>
            <select
              className="form-select"
              value={searchParams.role}
              onChange={(e) => onChangeSearchParams({ ...searchParams, role: e.target.value })}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-2 d-grid">
            <button type="submit" className="btn btn-primary fw-semibold" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Querying...
                </>
              ) : (
                <>
                  <i className="bi bi-radar me-2" />
                  Find Buyers
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Live API Proof & Telemetry Banner */}
      {meta && !loading && (
        <div className="saas-card p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="live-source-badge" data-testid="live-source-badge">
                <span className="live-dot" />
                Live API Source: {meta.sourceLabel}
              </span>

              <span className="badge text-bg-light border font-mono text-dark py-2 px-2">
                <i className="bi bi-clock me-1 text-primary" />
                Fetched: {formatTimestamp(meta.fetchedAt)}
              </span>

              <span className="badge text-bg-light border font-mono text-dark py-2 px-2">
                <i className="bi bi-lightning-charge me-1 text-warning" />
                Server: {meta.latencyMs} ms · Total: {discoveryData?.clientLatencyMs ?? meta.latencyMs} ms
              </span>

              <span className="badge text-bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 py-2 px-2">
                {meta.total} Live Records
              </span>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowTrace((v) => !v)}
            >
              <i className="bi bi-terminal me-1" />
              {showTrace ? 'Hide API Trace' : 'Inspect API Trace'}
            </button>
          </div>

          {showTrace && Array.isArray(meta.providerTrace) && (
            <div className="mt-3 pt-3 border-top">
              <div className="row g-2">
                {meta.providerTrace.map((trace) => (
                  <div key={trace.provider} className="col-12 col-md-6 col-xl-3">
                    <div className="p-2 rounded border bg-light h-100" style={{ fontSize: '0.77rem' }}>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-semibold text-dark">{trace.provider}</span>
                        <span
                          className={`badge ${
                            trace.status === 'ok'
                              ? 'text-bg-success'
                              : trace.status === 'fallback'
                                ? 'text-bg-warning'
                                : 'text-bg-secondary'
                          }`}
                        >
                          {trace.httpStatus ? `HTTP ${trace.httpStatus}` : trace.status}
                        </span>
                      </div>
                      <div className="text-muted font-mono">
                        Latency: {trace.latencyMs} ms {trace.records ? `· ${trace.records} rows` : ''}
                      </div>
                      {trace.reason && (
                        <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                          {trace.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* UN Comtrade Trade Flow Strip */}
      {tradeContext?.available && !loading && (
        <div className="saas-card p-3 bg-white">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge text-bg-dark font-mono">UN COMTRADE LIVE</span>
                <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>
                  {tradeContext.commodityLabel} → {tradeContext.reporterName}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                Annual Reported Import Value ({tradeContext.period}):{' '}
                <strong className="text-success font-mono">
                  {formatCurrencyCompact(tradeContext.totalImportValueUsd)}
                </strong>{' '}
                across {tradeContext.partnerRecordsCount} bilateral flow records ({tradeContext.latencyMs} ms)
              </div>
            </div>

            {Array.isArray(tradeContext.topExportersToMarket) && tradeContext.topExportersToMarket.length > 0 && (
              <div className="d-flex flex-wrap align-items-center gap-1">
                <span className="text-muted small me-1">Top Origin Suppliers:</span>
                {tradeContext.topExportersToMarket.slice(0, 4).map((p) => (
                  <span key={p.partnerCode} className="badge text-bg-light border text-dark">
                    {p.partnerName} ({formatCurrencyCompact(p.importValueUsd)})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {actionMsg && (
        <div className={`alert alert-${actionMsg.variant} py-2 px-3 mb-0 d-flex align-items-center gap-2`}>
          <i className="bi bi-check-circle-fill" />
          <span>{actionMsg.text}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-0 d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill" />
          <span>{error}</span>
        </div>
      )}

      {/* Results & Bulk Action Table */}
      <div className="saas-card overflow-hidden">
        <div className="p-3 border-bottom bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="fw-semibold text-dark">
              Discovered Buyers
            </span>
            {selectedIds.length > 0 && (
              <span className="badge bg-primary">{selectedIds.length} selected</span>
            )}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={selectedBuyers.length === 0}
              onClick={() => handleBulkSave([])}
            >
              <i className="bi bi-bookmark-plus me-1" />
              Save Selected
            </button>

            <div className="btn-group btn-group-sm">
              {LEAD_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={selectedBuyers.length === 0}
                  onClick={() => handleBulkSave([tag])}
                  title={`Save & tag selected as ${tag}`}
                >
                  + {tag}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={buyers.length === 0}
              onClick={handleBulkCampaign}
            >
              <i className="bi bi-envelope-paper me-1" />
              Email {selectedBuyers.length > 0 ? `Selected (${selectedBuyers.length})` : 'Top 5'}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              disabled={buyers.length === 0}
              onClick={handleExportCsv}
            >
              <i className="bi bi-download me-1" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="p-4">
            <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-medium">
              <div className="spinner-border spinner-border-sm" />
              <span>Fetching real-time importer records &amp; UN Comtrade flow data...</span>
            </div>
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="d-flex align-items-center gap-3 py-3 border-bottom">
                <div className="skeleton-box" style={{ width: 20, height: 20 }} />
                <div className="skeleton-box" style={{ width: 36, height: 36, borderRadius: 9 }} />
                <div className="flex-grow-1">
                  <div className="skeleton-box mb-2" style={{ width: '38%', height: 15 }} />
                  <div className="skeleton-box" style={{ width: '24%', height: 12 }} />
                </div>
                <div className="skeleton-box d-none d-md-block" style={{ width: '18%', height: 15 }} />
                <div className="skeleton-box d-none d-lg-block" style={{ width: '16%', height: 15 }} />
              </div>
            ))}
          </div>
        ) : buyers.length === 0 ? (
          <div className="p-5 text-center text-muted">
            <i className="bi bi-search fs-2 d-block mb-2 text-secondary" />
            <div className="fw-semibold text-dark">No live records matched those exact filters</div>
            <div className="small">Try broadening the product keyword (e.g., "Textiles" or "Import") or choosing another country.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table buyer-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: 42 }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all buyers"
                    />
                  </th>
                  <th>Company &amp; Registry</th>
                  <th>Decision Maker &amp; Role</th>
                  <th>Contact &amp; Website</th>
                  <th>Location</th>
                  <th>Status / Tags</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((buyer) => {
                  const isChecked = selectedIds.includes(buyer.id);
                  const saved = findSavedLead(buyer);
                  const initials = (buyer.companyName || 'CO')
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={buyer.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isChecked}
                          onChange={() => toggleRow(buyer.id)}
                          aria-label={`Select ${buyer.companyName}`}
                        />
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="company-avatar">
                            {buyer.logo ? (
                              <img src={buyer.logo} alt={buyer.companyName} />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <div className="fw-semibold text-dark">{buyer.companyName}</div>
                            <div className="text-muted font-mono" style={{ fontSize: '0.73rem' }}>
                              {buyer.lei ? `LEI: ${buyer.lei}` : buyer.registrationNumber ? `Reg: ${buyer.registrationNumber}` : buyer.source}
                              {buyer.registryUrl && (
                                <>
                                  {' · '}
                                  <a
                                    href={buyer.registryUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-decoration-none"
                                  >
                                    Verify <i className="bi bi-box-arrow-up-right" style={{ fontSize: '0.68rem' }} />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="fw-medium text-dark">{buyer.buyerName}</div>
                        <div className="text-muted" style={{ fontSize: '0.77rem' }}>
                          {buyer.role}
                        </div>
                      </td>

                      <td>
                        {buyer.email ? (
                          <div className="font-mono text-dark" style={{ fontSize: '0.79rem' }}>
                            {buyer.email}
                          </div>
                        ) : (
                          <div className="text-muted fst-italic" style={{ fontSize: '0.77rem' }}>
                            No public email returned
                          </div>
                        )}
                        <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                          <span
                            className={`badge ${
                              buyer.emailStatus?.startsWith('Verified')
                                ? 'text-bg-success'
                                : buyer.email
                                  ? 'text-bg-info bg-opacity-25 text-dark'
                                  : 'text-bg-light text-muted border'
                            }`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {buyer.emailStatus}
                          </span>
                          {buyer.website && (
                            <a
                              href={buyer.website}
                              target="_blank"
                              rel="noreferrer"
                              className="small text-decoration-none"
                            >
                              {buyer.domain || buyer.website}
                            </a>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="text-dark">{[buyer.city, buyer.region].filter(Boolean).join(', ') || buyer.country}</div>
                        <div className="text-muted" style={{ fontSize: '0.76rem' }}>
                          {buyer.country}
                        </div>
                      </td>

                      <td>
                        {saved ? (
                          <div className="d-flex flex-wrap gap-1">
                            <span className="badge text-bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                              Saved
                            </span>
                            {(saved.tags || []).map((t) => (
                              <span
                                key={t}
                                className={getTagBadgeClass(t)}
                                onClick={() => onToggleLeadTag(saved, t)}
                                title="Click to remove tag"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="badge text-bg-light border text-secondary">
                            {buyer.entityStatus || 'ACTIVE'}
                          </span>
                        )}
                      </td>

                      <td className="text-end text-nowrap">
                        <button
                          type="button"
                          className={`btn btn-sm me-1 ${saved ? 'btn-outline-success' : 'btn-outline-primary'}`}
                          onClick={async () => {
                            await onSaveLeads([buyer]);
                            notifyAction(`Saved ${buyer.companyName} to Saved Leads`);
                          }}
                          title="Save to Leads"
                        >
                          <i className={`bi ${saved ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}`} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => onSendToCampaign([saved || buyer])}
                          title="Compose Email"
                        >
                          <i className="bi bi-send" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

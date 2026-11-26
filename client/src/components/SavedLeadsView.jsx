import React, { useState, useMemo } from 'react';
import { LEAD_TAGS, getTagBadgeClass, formatTimestamp } from '../utils/formatters';
import { exportBuyersToCsv } from '../utils/csvExport';

export default function SavedLeadsView({
  leads,
  onToggleTag,
  onUpdateLead,
  onDeleteLead,
  onSendToCampaign,
  onGoToDiscovery,
}) {
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editForm, setEditForm] = useState({ buyerName: '', email: '', notes: '' });

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (tagFilter && !(lead.tags || []).includes(tagFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return [lead.companyName, lead.buyerName, lead.email, lead.country, lead.product]
          .filter(Boolean)
          .some((val) => val.toLowerCase().includes(q));
      }
      return true;
    });
  }, [leads, tagFilter, searchQuery]);

  const allSelected =
    filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.includes(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedLeads = useMemo(
    () => filteredLeads.filter((l) => selectedIds.includes(l.id)),
    [filteredLeads, selectedIds]
  );

  const startEditing = (lead) => {
    setEditingLeadId(lead.id);
    setEditForm({
      buyerName: lead.buyerName || '',
      email: lead.email || '',
      notes: lead.notes || '',
    });
  };

  const saveEdit = async (leadId) => {
    await onUpdateLead(leadId, editForm);
    setEditingLeadId(null);
  };

  const handleExport = () => {
    const rows = selectedLeads.length > 0 ? selectedLeads : filteredLeads;
    if (rows.length === 0) return;
    exportBuyersToCsv(rows, 'saved-export-leads.csv');
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Filter & Actions Bar */}
      <div className="saas-card p-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm ${tagFilter === '' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setTagFilter('')}
            >
              All ({leads.length})
            </button>
            {LEAD_TAGS.map((tag) => {
              const count = leads.filter((l) => (l.tags || []).includes(tag)).length;
              return (
                <button
                  key={tag}
                  type="button"
                  className={`btn btn-sm ${tagFilter === tag ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                >
                  {tag} ({count})
                </button>
              );
            })}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ width: 220 }}>
              <span className="input-group-text bg-light">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Filter saved leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={filteredLeads.length === 0}
              onClick={() =>
                onSendToCampaign(selectedLeads.length > 0 ? selectedLeads : filteredLeads)
              }
            >
              <i className="bi bi-envelope-paper me-1" />
              Email {selectedLeads.length > 0 ? `Selected (${selectedLeads.length})` : 'Filtered'}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              disabled={filteredLeads.length === 0}
              onClick={handleExport}
            >
              <i className="bi bi-download me-1" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="saas-card overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-5 text-center text-muted">
            <i className="bi bi-bookmark fs-1 d-block mb-2 text-secondary" />
            <h3 className="h6 fw-bold text-dark">No saved leads yet</h3>
            <p className="small mb-3">
              Discover live buyers in Buyer Discovery and save or tag them to build your outreach shortlist.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onGoToDiscovery}>
              <i className="bi bi-globe-americas me-1" />
              Go to Buyer Discovery
            </button>
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
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Company</th>
                  <th>Contact &amp; Email</th>
                  <th>Market &amp; Product</th>
                  <th>Lead Tags (Click to Toggle)</th>
                  <th>Saved At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const isEditing = editingLeadId === lead.id;
                  return (
                    <tr key={lead.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleOne(lead.id)}
                        />
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{lead.companyName}</div>
                        <div className="text-muted small">
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="text-decoration-none">
                              {lead.domain || lead.website}
                            </a>
                          ) : (
                            lead.source
                          )}
                        </div>
                      </td>

                      <td>
                        {isEditing ? (
                          <div className="d-flex flex-column gap-1" style={{ minWidth: 210 }}>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Contact Name"
                              value={editForm.buyerName}
                              onChange={(e) => setEditForm({ ...editForm, buyerName: e.target.value })}
                            />
                            <input
                              type="email"
                              className="form-control form-control-sm"
                              placeholder="Contact Email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                            <div className="d-flex gap-1 mt-1">
                              <button
                                type="button"
                                className="btn btn-xs btn-primary py-0 px-2"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => saveEdit(lead.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-secondary py-0 px-2"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => setEditingLeadId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="fw-medium text-dark">{lead.buyerName}</div>
                            <div className="font-mono small text-muted">
                              {lead.email || <span className="fst-italic">No email set</span>}
                            </div>
                          </div>
                        )}
                      </td>

                      <td>
                        <div>{lead.country}</div>
                        <div className="text-muted small">
                          {lead.product || 'General'} {lead.hsCode ? `(HS ${lead.hsCode})` : ''}
                        </div>
                      </td>

                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {LEAD_TAGS.map((tag) => {
                            const active = (lead.tags || []).includes(tag);
                            return (
                              <span
                                key={tag}
                                className={active ? getTagBadgeClass(tag) : 'tag-pill tag-outline'}
                                onClick={() => onToggleTag(lead, tag)}
                                title={active ? `Remove ${tag}` : `Add ${tag}`}
                              >
                                {active && <i className="bi bi-check2" />}
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>
                        {formatTimestamp(lead.savedAt)}
                      </td>

                      <td className="text-end text-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => startEditing(lead)}
                          title="Edit contact email / name"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => onSendToCampaign([lead])}
                          title="Send Email"
                        >
                          <i className="bi bi-send" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onDeleteLead(lead.id)}
                          title="Delete Lead"
                        >
                          <i className="bi bi-trash" />
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

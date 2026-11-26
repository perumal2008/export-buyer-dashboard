const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getStatus: () => request('/status'),
  searchBuyers: async ({ product, country, industry, role }) => {
    const params = new URLSearchParams();
    if (product) params.set('product', product);
    if (country) params.set('country', country);
    if (industry) params.set('industry', industry);
    if (role) params.set('role', role);

    const t0 = performance.now();
    const data = await request(`/buyers?${params.toString()}`);
    const clientLatencyMs = Math.round(performance.now() - t0);
    return { ...data, clientLatencyMs };
  },
  getLeads: ({ tag = '', q = '' } = {}) => {
    const params = new URLSearchParams();
    if (tag) params.set('tag', tag);
    if (q) params.set('q', q);
    const qs = params.toString();
    return request(`/leads${qs ? `?${qs}` : ''}`);
  },
  saveLeads: (leads) =>
    request('/leads', {
      method: 'POST',
      body: JSON.stringify({ leads: Array.isArray(leads) ? leads : [leads] }),
    }),
  updateLead: (id, patch) =>
    request(`/leads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteLead: (id) =>
    request(`/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  getCampaigns: () => request('/campaigns'),
  sendCampaign: (payload) =>
    request('/campaigns/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDeliveryStatus: (id, status) =>
    request(`/campaigns/deliveries/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  getAnalytics: () => request('/analytics'),
};

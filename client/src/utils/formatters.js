export function formatCurrencyCompact(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '$0';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toLocaleString()}`;
}

export function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    return dt.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function renderTemplateText(text = '', recipient = {}) {
  const buyerName = recipient.buyerName || 'Procurement Team';
  const companyName = recipient.companyName || 'Your Company';
  const product = recipient.product || 'Textiles';
  const country = recipient.country || 'United States';

  return text
    .replace(/\{\{\s*buyerName\s*\}\}/gi, buyerName)
    .replace(/\{\{\s*companyName\s*\}\}/gi, companyName)
    .replace(/\{\{\s*product\s*\}\}/gi, product)
    .replace(/\{\{\s*country\s*\}\}/gi, country);
}

export const LEAD_TAGS = ['Hot Lead', 'Contacted', 'Sample Sent'];

export function getTagBadgeClass(tag) {
  if (tag === 'Hot Lead') return 'tag-pill tag-hot';
  if (tag === 'Contacted') return 'tag-pill tag-contacted';
  if (tag === 'Sample Sent') return 'tag-pill tag-sample';
  return 'tag-pill';
}

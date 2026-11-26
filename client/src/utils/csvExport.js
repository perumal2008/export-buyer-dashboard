function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportBuyersToCsv(rows = [], filename = 'export-buyers.csv') {
  if (!rows.length) return;

  const headers = [
    'Company Name',
    'Buyer / Contact Name',
    'Role',
    'Email',
    'Email Status',
    'Website',
    'Country',
    'City',
    'Region',
    'Address',
    'Product / Keyword',
    'HS Code',
    'Industry',
    'Tags',
    'Registration / LEI',
    'Data Source',
  ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) =>
      [
        row.companyName,
        row.buyerName,
        row.role,
        row.email || '',
        row.emailStatus || '',
        row.website || '',
        row.country || '',
        row.city || '',
        row.region || '',
        row.address || '',
        row.product || '',
        row.hsCode || '',
        row.industry || '',
        Array.isArray(row.tags) ? row.tags.join('; ') : '',
        row.lei || row.registrationNumber || '',
        row.source || '',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

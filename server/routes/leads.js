import { Router } from 'express';
import crypto from 'crypto';
import { readDb, writeDb } from '../storage/db.js';

const router = Router();
const VALID_TAGS = ['Hot Lead', 'Contacted', 'Sample Sent'];

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter((t) => VALID_TAGS.includes(t)))];
}

// GET /api/leads — list persisted saved leads with optional tag/search filtering
router.get('/', (req, res) => {
  const { tag = '', q = '' } = req.query;
  const db = readDb();
  let leads = db.leads;

  if (tag && VALID_TAGS.includes(String(tag))) {
    leads = leads.filter((l) => Array.isArray(l.tags) && l.tags.includes(String(tag)));
  }

  if (q) {
    const term = String(q).toLowerCase();
    leads = leads.filter((l) =>
      [l.companyName, l.buyerName, l.country, l.product, l.email, l.industry]
        .filter(Boolean)
        .some((val) => val.toLowerCase().includes(term))
    );
  }

  res.json({
    total: leads.length,
    leads,
  });
});

// POST /api/leads — save one lead or an array of leads (idempotent by companyName + country or externalId)
router.post('/', (req, res) => {
  const payload = req.body;
  const items = Array.isArray(payload?.leads) ? payload.leads : [payload];
  const validItems = items.filter((item) => item && item.companyName);

  if (validItems.length === 0) {
    return res.status(400).json({ error: 'Lead payload must include companyName' });
  }

  const db = readDb();
  const now = new Date().toISOString();
  const saved = [];

  for (const item of validItems) {
    const existingIdx = db.leads.findIndex(
      (l) =>
        (item.id && l.id === item.id) ||
        (item.lei && l.lei === item.lei) ||
        (l.companyName.toLowerCase() === item.companyName.toLowerCase() &&
          (l.country || '').toLowerCase() === (item.country || '').toLowerCase())
    );

    if (existingIdx >= 0) {
      const existing = db.leads[existingIdx];
      const mergedTags = sanitizeTags([...(existing.tags || []), ...(item.tags || [])]);
      const updated = {
        ...existing,
        ...item,
        id: existing.id,
        tags: mergedTags,
        updatedAt: now,
      };
      db.leads[existingIdx] = updated;
      saved.push(updated);
    } else {
      const newLead = {
        id: item.id || `lead_${crypto.randomUUID().slice(0, 10)}`,
        companyName: item.companyName,
        buyerName: item.buyerName || 'Procurement & Import Desk',
        role: item.role || 'Importer',
        email: item.email || null,
        emailStatus: item.emailStatus || 'Registry Entity',
        website: item.website || null,
        domain: item.domain || null,
        logo: item.logo || null,
        country: item.country || '',
        countryCode: item.countryCode || '',
        city: item.city || '',
        region: item.region || '',
        address: item.address || '',
        industry: item.industry || '',
        product: item.product || '',
        hsCode: item.hsCode || '',
        lei: item.lei || null,
        registrationNumber: item.registrationNumber || null,
        entityStatus: item.entityStatus || 'ACTIVE',
        registryUrl: item.registryUrl || null,
        source: item.source || 'Live Discovery',
        tags: sanitizeTags(item.tags),
        notes: item.notes || '',
        savedAt: now,
        updatedAt: now,
      };
      db.leads.unshift(newLead);
      saved.push(newLead);
    }
  }

  writeDb(db);
  res.status(201).json({
    savedCount: saved.length,
    leads: saved,
    totalSaved: db.leads.length,
  });
});

// PATCH /api/leads/:id — update lead tags, email, buyerName, or notes
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const idx = db.leads.findIndex((l) => l.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const current = db.leads[idx];
  const updated = {
    ...current,
    ...(req.body.tags !== undefined ? { tags: sanitizeTags(req.body.tags) } : {}),
    ...(req.body.email !== undefined ? { email: req.body.email } : {}),
    ...(req.body.buyerName !== undefined ? { buyerName: req.body.buyerName } : {}),
    ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}),
    updatedAt: new Date().toISOString(),
  };

  db.leads[idx] = updated;
  writeDb(db);
  res.json({ lead: updated });
});

// DELETE /api/leads/:id — remove a saved lead
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const before = db.leads.length;
  db.leads = db.leads.filter((l) => l.id !== id);

  if (db.leads.length === before) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  writeDb(db);
  res.json({ deletedId: id, totalSaved: db.leads.length });
});

export default router;

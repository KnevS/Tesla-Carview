import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

const CATEGORIES = ['note', 'maintenance', 'repair', 'tire', 'inspection', 'accident', 'other'];

router.get('/', (req, res) => {
  const db = getDb();
  const { vehicle_id, category, limit = 50, offset = 0 } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (vehicle_id) { conditions.push('vehicle_id = ?'); params.push(vehicle_id); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const entries = db.prepare(
      `SELECT * FROM logbook_entries ${where} ORDER BY entry_date DESC LIMIT ? OFFSET ?`
    ).all(...params, +limit, +offset);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const db = getDb();
  const { vehicle_id, entry_date, category = 'note', title, description, mileage_km, cost, currency } = req.body;
  if (!vehicle_id || !title) return res.status(400).json({ error: 'vehicle_id und title sind Pflichtfelder' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Ungültige Kategorie' });
  try {
    const result = db.prepare(
      `INSERT INTO logbook_entries (vehicle_id, entry_date, category, title, description, mileage_km, cost, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicle_id, entry_date || Math.floor(Date.now() / 1000), category, title, description, mileage_km, cost, currency || 'EUR');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { title, description, category, mileage_km, cost, entry_date } = req.body;
  try {
    db.prepare(
      `UPDATE logbook_entries SET title=?, description=?, category=?, mileage_km=?, cost=?,
       entry_date=?, updated_at=unixepoch() WHERE id=?`
    ).run(title, description, category, mileage_km, cost, entry_date, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM logbook_entries WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

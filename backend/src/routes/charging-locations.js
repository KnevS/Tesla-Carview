import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
  const rows = db.prepare(`SELECT * FROM charging_locations ${where} ORDER BY is_default DESC, name`).all(...(vehicle_id ? [vehicle_id] : []));
  res.json(rows);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { vehicle_id, name, address, type = 'home', rate_kwh, is_default = 0 } = req.body;
  if (!name || !vehicle_id) return res.status(400).json({ error: 'name und vehicle_id erforderlich' });
  if (is_default) db.prepare('UPDATE charging_locations SET is_default=0 WHERE vehicle_id=?').run(vehicle_id);
  const r = db.prepare(
    'INSERT INTO charging_locations (vehicle_id,name,address,type,rate_kwh,is_default) VALUES (?,?,?,?,?,?)'
  ).run(vehicle_id, name, address ?? null, type, rate_kwh ?? null, is_default ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM charging_locations WHERE id=?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, address, type, rate_kwh, is_default } = req.body;
  const loc = db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Ladeort nicht gefunden' });
  if (is_default) db.prepare('UPDATE charging_locations SET is_default=0 WHERE vehicle_id=?').run(loc.vehicle_id);
  db.prepare(
    `UPDATE charging_locations SET name=COALESCE(?,name), address=COALESCE(?,address),
     type=COALESCE(?,type), rate_kwh=COALESCE(?,rate_kwh), is_default=COALESCE(?,is_default) WHERE id=?`
  ).run(name ?? null, address ?? null, type ?? null, rate_kwh ?? null, is_default != null ? (is_default ? 1 : 0) : null, req.params.id);
  res.json(db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM charging_locations WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

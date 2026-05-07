import { Router } from 'express';
import { registerVin } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
  res.json(req.db.prepare(
    `SELECT * FROM charging_locations ${where} ORDER BY is_default DESC, name`
  ).all(...(vehicle_id ? [vehicle_id] : [])));
});

router.post('/', (req, res) => {
  const { vehicle_id, name, address, type = 'home', rate_kwh, is_default = 0, lat, lon, radius_m = 200 } = req.body;
  if (!name || !vehicle_id) return res.status(400).json({ error: 'name und vehicle_id erforderlich' });
  if (is_default) req.db.prepare('UPDATE charging_locations SET is_default=0 WHERE vehicle_id=?').run(vehicle_id);
  const r = req.db.prepare(
    `INSERT INTO charging_locations (vehicle_id, name, address, type, rate_kwh, is_default, lat, lon, radius_m)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(vehicle_id, name, address ?? null, type, rate_kwh ?? null, is_default ? 1 : 0, lat ?? null, lon ?? null, radius_m);
  res.status(201).json(req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, address, type, rate_kwh, is_default, lat, lon, radius_m } = req.body;
  const loc = req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Ladeort nicht gefunden' });
  if (is_default) req.db.prepare('UPDATE charging_locations SET is_default=0 WHERE vehicle_id=?').run(loc.vehicle_id);
  req.db.prepare(
    `UPDATE charging_locations SET
       name=COALESCE(?,name), address=COALESCE(?,address), type=COALESCE(?,type),
       rate_kwh=COALESCE(?,rate_kwh), is_default=COALESCE(?,is_default),
       lat=COALESCE(?,lat), lon=COALESCE(?,lon), radius_m=COALESCE(?,radius_m)
     WHERE id=?`
  ).run(
    name ?? null, address ?? null, type ?? null, rate_kwh ?? null,
    is_default != null ? (is_default ? 1 : 0) : null,
    lat ?? null, lon ?? null, radius_m ?? null,
    req.params.id
  );
  res.json(req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  req.db.prepare('DELETE FROM charging_locations WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

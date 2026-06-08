// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
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

function normLimit(v) {
  if (v == null || v === '') return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

router.post('/', (req, res) => {
  const { vehicle_id, name, address, type = 'home', rate_kwh, is_default = 0, lat, lon, radius_m = 200, default_charge_limit } = req.body;
  if (!name || !vehicle_id) return res.status(400).json({ error: 'name und vehicle_id erforderlich' });
  if (is_default) req.db.prepare('UPDATE charging_locations SET is_default=0 WHERE vehicle_id=?').run(vehicle_id);
  const r = req.db.prepare(
    `INSERT INTO charging_locations (vehicle_id, name, address, type, rate_kwh, is_default, lat, lon, radius_m, default_charge_limit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(vehicle_id, name, address ?? null, type, rate_kwh ?? null, is_default ? 1 : 0, lat ?? null, lon ?? null, radius_m,
        normLimit(default_charge_limit));
  res.status(201).json(req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, address, type, rate_kwh, is_default, lat, lon, radius_m, default_charge_limit } = req.body;
  const loc = req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Ladeort nicht gefunden' });
  if (is_default) req.db.prepare('UPDATE charging_locations SET is_default=0 WHERE vehicle_id=?').run(loc.vehicle_id);
  // default_charge_limit: explizit Null setzen wenn '' kommt, sonst gar nicht anfassen
  const limitProvided = Object.prototype.hasOwnProperty.call(req.body, 'default_charge_limit');
  req.db.prepare(
    `UPDATE charging_locations SET
       name=COALESCE(?,name), address=COALESCE(?,address), type=COALESCE(?,type),
       rate_kwh=COALESCE(?,rate_kwh), is_default=COALESCE(?,is_default),
       lat=COALESCE(?,lat), lon=COALESCE(?,lon), radius_m=COALESCE(?,radius_m),
       default_charge_limit = CASE WHEN ? = 1 THEN ? ELSE default_charge_limit END
     WHERE id=?`
  ).run(
    name ?? null, address ?? null, type ?? null, rate_kwh ?? null,
    is_default != null ? (is_default ? 1 : 0) : null,
    lat ?? null, lon ?? null, radius_m ?? null,
    limitProvided ? 1 : 0,
    limitProvided ? normLimit(default_charge_limit) : null,
    req.params.id
  );
  res.json(req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.params.id));
});

// Manuelles Anwenden des Limits via Tesla-Befehl — Best-Effort
router.post('/:id/apply-charge-limit', async (req, res) => {
  try {
    const loc = req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.params.id);
    if (!loc) return res.status(404).json({ error: 'Ladeort nicht gefunden' });
    if (loc.default_charge_limit == null) return res.status(400).json({ error: 'kein Limit konfiguriert' });
    const v = req.db.prepare('SELECT * FROM vehicles WHERE id=?').get(loc.vehicle_id);
    if (!v) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
    const { apiProxyPost } = await import('../services/teslaApi.js');
    const r = await apiProxyPost(req.db, v, 'set_charge_limit', { percent: loc.default_charge_limit });
    res.json({ applied: true, limit: loc.default_charge_limit, response: r });
  } catch (err) {
    res.status(500).json({ error: err.message, applied: false });
  }
});

router.delete('/:id', (req, res) => {
  req.db.prepare('DELETE FROM charging_locations WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

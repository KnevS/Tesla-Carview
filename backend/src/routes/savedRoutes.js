// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

function parseRoute(r) {
  return {
    ...r,
    waypoints: JSON.parse(r.waypoints ?? '[]'),
    auto_send: Boolean(r.auto_send),
  };
}

router.get('/', (req, res) => {
  const { vehicleId } = req.query;
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId erforderlich' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;
  const rows = req.db.prepare(
    'SELECT * FROM saved_routes WHERE vehicle_id=? ORDER BY created_at DESC'
  ).all(vehicleId);
  res.json(rows.map(parseRoute));
});

router.post('/', (req, res) => {
  const {
    vehicle_id, name,
    destination_name, destination_lat, destination_lon,
    start_name, start_lat, start_lon,
    waypoints = [],
    scheduled_date = null, departure_time = null,
    auto_send = 0, notes = null,
  } = req.body;
  if (!vehicle_id || !name || !destination_name || destination_lat == null || destination_lon == null) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen' });
  }
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicle_id, req.user))) return;
  const { lastInsertRowid } = req.db.prepare(`
    INSERT INTO saved_routes
      (vehicle_id, name, destination_name, destination_lat, destination_lon,
       start_name, start_lat, start_lon,
       waypoints, scheduled_date, departure_time, auto_send, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    vehicle_id, name.trim().substring(0, 100),
    destination_name, destination_lat, destination_lon,
    start_name ?? null, start_lat ?? null, start_lon ?? null,
    JSON.stringify(waypoints),
    scheduled_date ?? null, departure_time ?? null,
    auto_send ? 1 : 0, notes ?? null,
  );
  const row = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(lastInsertRowid);
  res.status(201).json(parseRoute(row));
});

router.put('/:id', (req, res) => {
  const route = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route nicht gefunden' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, route.vehicle_id, req.user))) return;
  const {
    name, destination_name, destination_lat, destination_lon,
    start_name, start_lat, start_lon,
    waypoints,
    scheduled_date, departure_time, auto_send, notes,
  } = req.body;
  req.db.prepare(`
    UPDATE saved_routes SET
      name             = COALESCE(?,name),
      destination_name = COALESCE(?,destination_name),
      destination_lat  = COALESCE(?,destination_lat),
      destination_lon  = COALESCE(?,destination_lon),
      start_name       = COALESCE(?,start_name),
      start_lat        = COALESCE(?,start_lat),
      start_lon        = COALESCE(?,start_lon),
      waypoints        = COALESCE(?,waypoints),
      scheduled_date   = COALESCE(?,scheduled_date),
      departure_time   = COALESCE(?,departure_time),
      auto_send        = COALESCE(?,auto_send),
      notes            = COALESCE(?,notes),
      updated_at       = unixepoch()
    WHERE id=?
  `).run(
    name?.trim()?.substring(0, 100) ?? null,
    destination_name ?? null, destination_lat ?? null, destination_lon ?? null,
    start_name ?? null, start_lat ?? null, start_lon ?? null,
    waypoints !== undefined ? JSON.stringify(waypoints) : null,
    scheduled_date !== undefined ? scheduled_date : null,
    departure_time !== undefined ? departure_time : null,
    auto_send !== undefined ? (auto_send ? 1 : 0) : null,
    notes !== undefined ? notes : null,
    req.params.id,
  );
  const updated = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(req.params.id);
  res.json(parseRoute(updated));
});

router.delete('/:id', (req, res) => {
  const route = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route nicht gefunden' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, route.vehicle_id, req.user))) return;
  req.db.prepare('DELETE FROM saved_routes WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

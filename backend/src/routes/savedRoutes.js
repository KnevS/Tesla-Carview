import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

router.get('/', (req, res) => {
  const { vehicleId } = req.query;
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId erforderlich' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;
  const rows = req.db.prepare(
    'SELECT * FROM saved_routes WHERE vehicle_id=? ORDER BY created_at DESC'
  ).all(vehicleId);
  res.json(rows.map(r => ({ ...r, waypoints: JSON.parse(r.waypoints) })));
});

router.post('/', (req, res) => {
  const { vehicle_id, name, destination_name, destination_lat, destination_lon, waypoints = [] } = req.body;
  if (!vehicle_id || !name || !destination_name || destination_lat == null || destination_lon == null) {
    return res.status(400).json({ error: 'Pflichtfelder: vehicle_id, name, destination_name, destination_lat, destination_lon' });
  }
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicle_id, req.user))) return;
  const { lastInsertRowid } = req.db.prepare(
    `INSERT INTO saved_routes (vehicle_id, name, destination_name, destination_lat, destination_lon, waypoints)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(vehicle_id, name.trim(), destination_name, destination_lat, destination_lon, JSON.stringify(waypoints));
  const row = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(lastInsertRowid);
  res.status(201).json({ ...row, waypoints: JSON.parse(row.waypoints) });
});

router.put('/:id', (req, res) => {
  const route = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route nicht gefunden' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, route.vehicle_id, req.user))) return;
  const { name, destination_name, destination_lat, destination_lon, waypoints } = req.body;
  req.db.prepare(
    `UPDATE saved_routes SET
       name=COALESCE(?,name),
       destination_name=COALESCE(?,destination_name),
       destination_lat=COALESCE(?,destination_lat),
       destination_lon=COALESCE(?,destination_lon),
       waypoints=COALESCE(?,waypoints),
       updated_at=unixepoch()
     WHERE id=?`
  ).run(
    name?.trim() ?? null,
    destination_name ?? null,
    destination_lat ?? null,
    destination_lon ?? null,
    waypoints !== undefined ? JSON.stringify(waypoints) : null,
    req.params.id
  );
  const updated = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(req.params.id);
  res.json({ ...updated, waypoints: JSON.parse(updated.waypoints) });
});

router.delete('/:id', (req, res) => {
  const route = req.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route nicht gefunden' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, route.vehicle_id, req.user))) return;
  req.db.prepare('DELETE FROM saved_routes WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

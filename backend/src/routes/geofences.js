// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  assertVehicleAccess, guardAccess, restrictToOwnVehicles,
} from '../middleware/vehicleAccess.js';

const router = Router();

/** Liste der Geofences des aktuellen Users — pro Vehicle gefiltert,
 *  Admins sehen alle. */
router.get('/', (req, res) => {
  const { vehicle_id } = req.query;
  try {
    const restrict = restrictToOwnVehicles(req, 'vehicle_id');
    const conds  = [];
    const params = [];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    const where = conds.length || restrict.fragment
      ? 'WHERE ' + (conds.length ? conds.join(' AND ') : '1=1') + restrict.fragment
      : '';
    params.push(...restrict.params);
    const rows = req.db.prepare(
      `SELECT * FROM geofences ${where} ORDER BY kind, name`
    ).all(...params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const writeSchema = z.object({
  vehicle_id: z.number().int().positive(),
  kind:       z.enum(['home', 'work', 'other']),
  name:       z.string().min(1).max(100),
  lat:        z.number().min(-90).max(90),
  lon:        z.number().min(-180).max(180),
  radius_m:   z.number().int().positive().max(50_000).default(200),
});

router.post('/', validate(writeSchema), (req, res) => {
  const b = req.body;
  if (guardAccess(res, () => assertVehicleAccess(req.db, b.vehicle_id, req.user))) return;
  try {
    const r = req.db.prepare(
      `INSERT INTO geofences (vehicle_id, kind, name, lat, lon, radius_m)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(b.vehicle_id, b.kind, b.name, b.lat, b.lon, b.radius_m);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', validate(writeSchema.partial()), (req, res) => {
  const existing = req.db.prepare('SELECT * FROM geofences WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Geofence nicht gefunden' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, existing.vehicle_id, req.user))) return;
  const b = req.body;
  req.db.prepare(
    `UPDATE geofences SET
       kind     = COALESCE(?, kind),
       name     = COALESCE(?, name),
       lat      = COALESCE(?, lat),
       lon      = COALESCE(?, lon),
       radius_m = COALESCE(?, radius_m)
     WHERE id = ?`
  ).run(b.kind ?? null, b.name ?? null, b.lat ?? null, b.lon ?? null, b.radius_m ?? null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const existing = req.db.prepare('SELECT * FROM geofences WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Geofence nicht gefunden' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, existing.vehicle_id, req.user))) return;
  req.db.prepare('DELETE FROM geofences WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

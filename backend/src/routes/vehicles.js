import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { getVehicles, getVehicleData } from '../services/teslaApi.js';
import { getDb } from '../db/database.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const db = getDb();
    const local = db.prepare('SELECT * FROM vehicles').all();
    if (local.length > 0) return res.json(local);

    const data = await getVehicles();
    const vehicles = data.response || [];
    const insert = db.prepare(
      'INSERT OR REPLACE INTO vehicles (tesla_id, vin, display_name, model) VALUES (?, ?, ?, ?)'
    );
    vehicles.forEach(v => insert.run(String(v.id), v.vin, v.display_name, v.model_name));
    res.json(db.prepare('SELECT * FROM vehicles').all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:vehicleId/status', async (req, res) => {
  try {
    const data = await getVehicleData(req.params.vehicleId);
    res.json(data.response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (_req, res) => {
  try {
    const db = getDb();
    const vehicles = db.prepare('SELECT * FROM vehicles').all();
    const result = vehicles.map(v => {
      const lastTrip = db.prepare(
        'SELECT * FROM trips WHERE vehicle_id=? ORDER BY start_time DESC LIMIT 1'
      ).get(v.id);
      const totalKm = db.prepare(
        'SELECT COALESCE(SUM(distance_km),0) as total FROM trips WHERE vehicle_id=?'
      ).get(v.id)?.total || 0;
      const totalEnergy = db.prepare(
        'SELECT COALESCE(SUM(energy_added_kwh),0) as total FROM charging_sessions WHERE vehicle_id=?'
      ).get(v.id)?.total || 0;
      return { ...v, lastTrip, totalKm, totalEnergy };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const patchSchema = z.object({
  display_name:  z.string().max(100).optional(),
  license_plate: z.string().max(20).optional(),
  image_color:   z.string().max(50).optional(),
  color:         z.string().max(50).optional(),
  model:         z.string().max(100).optional(),
});

router.put('/:vehicleId', validate(patchSchema), (req, res) => {
  try {
    const db = getDb();
    const { display_name, license_plate, image_color, color, model } = req.body;
    db.prepare(
      `UPDATE vehicles SET
         display_name  = COALESCE(?, display_name),
         license_plate = COALESCE(?, license_plate),
         image_color   = COALESCE(?, image_color),
         color         = COALESCE(?, color),
         model         = COALESCE(?, model)
       WHERE id = ?`
    ).run(display_name, license_plate, image_color, color, model, req.params.vehicleId);
    res.json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.vehicleId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

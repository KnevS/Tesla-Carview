import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireCanEditVehicles, requireCanAddVehicles } from '../middleware/auth.js';
import { getVehicles, getVehicleData } from '../services/teslaApi.js';
import { registerVin } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(req.db.prepare('SELECT * FROM vehicles').all());
});

// POST /api/vehicles/sync — Fahrzeuge vom Tesla-Account synchronisieren.
// Schreibt neue vehicles-Rows → benötigt can_add_vehicles (oder Admin).
router.post('/sync', requireCanAddVehicles, async (req, res) => {
  try {
    const db   = req.db;
    const data = await getVehicles(db);
    const list = data.response || [];
    if (!list.length) return res.json({ synced: 0, vehicles: db.prepare('SELECT * FROM vehicles').all() });

    const insert = db.prepare(
      'INSERT OR REPLACE INTO vehicles (tesla_id, vin, display_name, model) VALUES (?, ?, ?, ?)'
    );
    for (const v of list) {
      insert.run(String(v.id), v.vin, v.display_name, v.model_name);
      if (v.vin) registerVin(v.vin, req.tenantId);
    }
    const vehicles = db.prepare('SELECT * FROM vehicles').all();
    res.json({ synced: list.length, vehicles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const db       = req.db;
    const vehicles = db.prepare('SELECT * FROM vehicles').all();
    const result   = vehicles.map(v => {
      const lastTrip   = db.prepare('SELECT * FROM trips WHERE vehicle_id=? ORDER BY start_time DESC LIMIT 1').get(v.id);
      const totalKm    = db.prepare('SELECT COALESCE(SUM(distance_km),0) as total FROM trips WHERE vehicle_id=?').get(v.id)?.total || 0;
      const totalEnergy = db.prepare('SELECT COALESCE(SUM(energy_added_kwh),0) as total FROM charging_sessions WHERE vehicle_id=?').get(v.id)?.total || 0;
      const assignedUsers = db.prepare(
        'SELECT u.id, u.username FROM users u JOIN vehicle_users vu ON vu.user_id=u.id WHERE vu.vehicle_id=?'
      ).all(v.id);
      return { ...v, lastTrip, totalKm, totalEnergy, assignedUsers };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:vehicleId/status', async (req, res) => {
  try {
    const data = await getVehicleData(req.db, req.params.vehicleId);
    res.json(data.response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const patchSchema = z.object({
  display_name:           z.string().max(100).optional(),
  license_plate:          z.string().max(20).optional(),
  image_color:            z.string().max(50).optional(),
  color:                  z.string().max(50).optional(),
  model:                  z.string().max(100).optional(),
  category:               z.enum(['private','company']).optional(),
  company_name:           z.string().max(200).optional().nullable(),
  electricity_rate_kwh:   z.number().min(0).max(5).optional().nullable(),
  monta_client_id:        z.string().max(200).optional().nullable(),
  monta_api_key:          z.string().max(500).optional().nullable(),
  monta_charge_point_id:  z.string().max(100).optional().nullable(),
});

// Aendert Fahrzeug-Grunddaten (Name, Farbe, Tarif, Monta-Konfig …).
// Endpoint nur fuer Admins oder User mit can_edit_vehicles=1.
router.put('/:vehicleId', requireCanEditVehicles, validate(patchSchema), (req, res) => {
  try {
    const db = req.db;
    const { display_name, license_plate, image_color, color, model,
            category, company_name, electricity_rate_kwh,
            monta_client_id, monta_api_key, monta_charge_point_id } = req.body;
    db.prepare(
      `UPDATE vehicles SET
         display_name          = COALESCE(?, display_name),
         license_plate         = COALESCE(?, license_plate),
         image_color           = COALESCE(?, image_color),
         color                 = COALESCE(?, color),
         model                 = COALESCE(?, model),
         category              = COALESCE(?, category),
         company_name          = COALESCE(?, company_name),
         electricity_rate_kwh  = COALESCE(?, electricity_rate_kwh),
         monta_client_id       = COALESCE(?, monta_client_id),
         monta_api_key         = COALESCE(?, monta_api_key),
         monta_charge_point_id = COALESCE(?, monta_charge_point_id)
       WHERE id=?`
    ).run(display_name, license_plate, image_color, color, model,
          category, company_name, electricity_rate_kwh,
          monta_client_id, monta_api_key, monta_charge_point_id,
          req.params.vehicleId);
    res.json(db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

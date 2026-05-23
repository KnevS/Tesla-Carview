import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireCanEditVehicles, requireCanAddVehicles } from '../middleware/auth.js';
import { getVehicles, getVehicleData } from '../services/teslaApi.js';
import { registerVin } from '../db/database.js';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

router.get('/', (req, res) => {
  // Admins sehen alle Fahrzeuge des Tenants, normale User nur die, fuer
  // die in vehicle_users eine Zuordnung existiert. Sonst koennte ein
  // User in einem Multi-Fahrer-Tenant fremde VINs / Display-Namen sehen.
  // vehicle_state_cache wird per LEFT JOIN eingeblendet (kein Tesla-Call,
  // nur DB-Cache) — liefert battery_level, shift_state, odometer_km
  // und updated_at fuer den Status-Bar im Nevs-Edition Design.
  const join = `
    LEFT JOIN vehicle_state_cache sc ON sc.vehicle_id = v.id`;
  const cols = `v.*, sc.battery_level, sc.shift_state,
    COALESCE(sc.odometer_km, v.odometer_km) AS odometer_km_live,
    sc.updated_at AS state_cached_at`;
  if (req.user?.role === 'admin') {
    return res.json(req.db.prepare(
      `SELECT ${cols} FROM vehicles v ${join}`
    ).all());
  }
  res.json(req.db.prepare(
    `SELECT ${cols} FROM vehicles v ${join}
       JOIN vehicle_users vu ON vu.vehicle_id = v.id
      WHERE vu.user_id = ?`
  ).all(req.user.sub));
});

// POST /api/vehicles/sync — Fahrzeuge vom Tesla-Account synchronisieren.
// Schreibt neue vehicles-Rows → benötigt can_add_vehicles (oder Admin).
router.post('/sync', requireCanAddVehicles, async (req, res) => {
  try {
    const db   = req.db;
    const data = await getVehicles(db);
    const list = data.response || [];
    if (!list.length) return res.json({ synced: 0, vehicles: db.prepare('SELECT * FROM vehicles').all() });

    const upsert = db.prepare(`
      INSERT INTO vehicles (tesla_id, vin, display_name, model) VALUES (?, ?, ?, ?)
      ON CONFLICT(tesla_id) DO UPDATE SET
        vin          = excluded.vin,
        display_name = excluded.display_name,
        model        = excluded.model
    `);
    for (const v of list) {
      upsert.run(String(v.id), v.vin, v.display_name, v.model_name);
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
    // Auf eigene Fahrzeuge einschraenken (Admin sieht alle).
    const vehicles = req.user?.role === 'admin'
      ? db.prepare('SELECT * FROM vehicles').all()
      : db.prepare(
          `SELECT v.* FROM vehicles v
             JOIN vehicle_users vu ON vu.vehicle_id = v.id
            WHERE vu.user_id = ?`
        ).all(req.user.sub);
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
  // Verhindert, dass ein User Tesla-API-Calls auf fremde Fahrzeuge
  // im Tenant abfeuert (kostet Tesla-Daily-Budget + zeigt SOC/Position).
  if (guardAccess(res, () => assertVehicleAccess(req.db, req.params.vehicleId, req.user))) return;
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
  abrp_token:             z.string().max(200).optional().nullable(),
});

// Aendert Fahrzeug-Grunddaten (Name, Farbe, Tarif, Monta-Konfig …).
// Endpoint nur fuer Admins oder User mit can_edit_vehicles=1.
router.put('/:vehicleId', requireCanEditVehicles, validate(patchSchema), (req, res) => {
  if (guardAccess(res, () => assertVehicleAccess(req.db, req.params.vehicleId, req.user))) return;
  try {
    const db = req.db;
    const { display_name, license_plate, image_color, color, model,
            category, company_name, electricity_rate_kwh,
            monta_client_id, monta_api_key, monta_charge_point_id,
            abrp_token } = req.body;
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
         monta_charge_point_id = COALESCE(?, monta_charge_point_id),
         abrp_token            = ?
       WHERE id=?`
    ).run(display_name, license_plate, image_color, color, model,
          category, company_name, electricity_rate_kwh,
          monta_client_id, monta_api_key, monta_charge_point_id,
          abrp_token ?? null,
          req.params.vehicleId);
    res.json(db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

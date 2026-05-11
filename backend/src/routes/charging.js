import { Router } from 'express';
import { matchChargingLocation } from '../services/dataSync.js';

const router = Router();

router.get('/', (req, res) => {
  const { vehicle_id, limit = 50, offset = 0 } = req.query;
  try {
    const where  = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id, +limit, +offset] : [+limit, +offset];
    res.json(req.db.prepare(
      `SELECT * FROM charging_sessions ${where} ORDER BY start_time DESC LIMIT ? OFFSET ?`
    ).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  const { vehicle_id } = req.query;
  try {
    const where  = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];
    const stats  = req.db.prepare(
      `SELECT COUNT(*) as total_sessions,
              COALESCE(SUM(energy_added_kwh), 0) as total_energy_kwh,
              COALESCE(SUM(cost), 0) as total_cost,
              COALESCE(AVG(max_power_kw), 0) as avg_max_power,
              COALESCE(MAX(max_power_kw), 0) as peak_power
       FROM charging_sessions ${where}`
    ).get(...params);
    const byType = req.db.prepare(
      `SELECT charger_type, COUNT(*) as count, COALESCE(SUM(energy_added_kwh),0) as energy
       FROM charging_sessions ${where} GROUP BY charger_type`
    ).all(...params);
    res.json({ ...stats, byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const session = req.db.prepare('SELECT * FROM charging_sessions WHERE id=?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Ladesession nicht gefunden' });
    const points = req.db.prepare(
      'SELECT * FROM charging_points WHERE session_id=? ORDER BY timestamp ASC'
    ).all(session.id);
    res.json({ ...session, points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const { vehicle_id, start_time, end_time, location_name, lat, lon, charger_type,
          start_soc, end_soc, energy_added_kwh, max_power_kw, cost, currency } = req.body;
  try {
    const result = req.db.prepare(
      `INSERT INTO charging_sessions
       (vehicle_id, start_time, end_time, location_name, lat, lon, charger_type,
        start_soc, end_soc, energy_added_kwh, max_power_kw, cost, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicle_id, start_time, end_time, location_name, lat, lon, charger_type,
      start_soc, end_soc, energy_added_kwh, max_power_kw, cost, currency || 'EUR');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/charging/:id — Kosten anpassen (inkl. auf 0 setzen)
router.patch('/:id', (req, res) => {
  try {
    const session = req.db.prepare('SELECT * FROM charging_sessions WHERE id=?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Ladesession nicht gefunden' });

    const { cost, location_id, billing_rate_kwh, billing_status,
            location_name, is_free, lat, lon } = req.body;

    // Koordinaten-Validierung (nur wenn mitgegeben) — fuer manuelle Eingabe
    // bei Fahrzeugen, die kein GPS uebermitteln. Sobald lat/lon gesetzt
    // sind, springt das normale GPS-basierte Location-Matching an.
    for (const [k, v] of Object.entries({ lat, lon })) {
      if (v == null || v === '') continue;
      const n = +v;
      if (!Number.isFinite(n)) return res.status(400).json({ error: `${k} ist keine Zahl` });
      if (k === 'lat' && (n < -90  || n > 90))  return res.status(400).json({ error: `lat ausserhalb [-90, 90]` });
      if (k === 'lon' && (n < -180 || n > 180)) return res.status(400).json({ error: `lon ausserhalb [-180, 180]` });
    }
    const norm = v => (typeof v === 'string' && v.trim() === '') ? null : v;

    // cost darf explizit auf 0 gesetzt werden; bei neuem Tarif auto-berechnen
    let newCost = cost !== undefined ? cost : session.cost;
    if (billing_rate_kwh !== undefined && cost === undefined && session.energy_added_kwh) {
      newCost = Math.round(billing_rate_kwh * session.energy_added_kwh * 100) / 100;
    }
    const newStatus = (cost !== undefined || billing_rate_kwh !== undefined)
      ? (newCost === null ? 'pending' : 'calculated')
      : (billing_status ?? session.billing_status);
    const newIsFree = is_free !== undefined ? (is_free ? 1 : 0) : session.is_free;

    req.db.prepare(
      `UPDATE charging_sessions SET
         cost             = ?,
         billing_rate_kwh = COALESCE(?, billing_rate_kwh),
         billing_status   = ?,
         location_id      = COALESCE(?, location_id),
         location_name    = COALESCE(?, location_name),
         lat              = COALESCE(?, lat),
         lon              = COALESCE(?, lon),
         is_free          = ?
       WHERE id=?`
    ).run(newCost, billing_rate_kwh ?? null, newStatus,
          location_id ?? null, norm(location_name) ?? null,
          norm(lat) ?? null, norm(lon) ?? null,
          newIsFree, req.params.id);

    res.json(req.db.prepare('SELECT * FROM charging_sessions WHERE id=?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/charging/:id/assign-location — Ladeort manuell zuweisen oder per GPS ermitteln
router.post('/:id/assign-location', (req, res) => {
  try {
    const session = req.db.prepare('SELECT * FROM charging_sessions WHERE id=?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Ladesession nicht gefunden' });

    let loc = null;
    if (req.body.location_id) {
      loc = req.db.prepare('SELECT * FROM charging_locations WHERE id=?').get(req.body.location_id);
    } else if (session.lat != null && session.lon != null) {
      loc = matchChargingLocation(req.db, session.vehicle_id, session.lat, session.lon);
    }

    if (!loc) return res.status(404).json({ error: 'Kein passender Ladeort gefunden' });

    const energyKwh = session.energy_added_kwh || 0;
    const cost      = loc.rate_kwh != null ? energyKwh * loc.rate_kwh : session.cost;

    req.db.prepare(
      `UPDATE charging_sessions SET location_id=?, location_name=?, billing_rate_kwh=?, cost=?,
       billing_status=CASE WHEN ? IS NOT NULL THEN 'calculated' ELSE billing_status END WHERE id=?`
    ).run(loc.id, loc.name, loc.rate_kwh ?? null, cost, cost, req.params.id);

    res.json(req.db.prepare('SELECT * FROM charging_sessions WHERE id=?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/charging/:id
router.delete('/:id', (req, res) => {
  try {
    const session = req.db.prepare('SELECT id FROM charging_sessions WHERE id=?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Ladesession nicht gefunden' });
    req.db.prepare('DELETE FROM charging_sessions WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { vehicle_id, limit = 50, offset = 0 } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id, +limit, +offset] : [+limit, +offset];
    const sessions = db.prepare(
      `SELECT * FROM charging_sessions ${where} ORDER BY start_time DESC LIMIT ? OFFSET ?`
    ).all(...params);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const { vehicle_id } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];
    const stats = db.prepare(
      `SELECT
         COUNT(*) as total_sessions,
         COALESCE(SUM(energy_added_kwh), 0) as total_energy_kwh,
         COALESCE(SUM(cost), 0) as total_cost,
         COALESCE(AVG(max_power_kw), 0) as avg_max_power,
         COALESCE(MAX(max_power_kw), 0) as peak_power
       FROM charging_sessions ${where}`
    ).get(...params);
    const byType = db.prepare(
      `SELECT charger_type, COUNT(*) as count, COALESCE(SUM(energy_added_kwh),0) as energy
       FROM charging_sessions ${where} GROUP BY charger_type`
    ).all(...params);
    res.json({ ...stats, byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  try {
    const session = db.prepare('SELECT * FROM charging_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Ladesession nicht gefunden' });
    const points = db.prepare(
      'SELECT * FROM charging_points WHERE session_id = ? ORDER BY timestamp ASC'
    ).all(session.id);
    res.json({ ...session, points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const db = getDb();
  const {
    vehicle_id, start_time, end_time, location_name, lat, lon, charger_type,
    start_soc, end_soc, energy_added_kwh, max_power_kw, cost, currency,
  } = req.body;
  try {
    const result = db.prepare(
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

export default router;

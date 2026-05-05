import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { vehicle_id, limit = 50, offset = 0 } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id, +limit, +offset] : [+limit, +offset];
    const trips = db.prepare(
      `SELECT t.*, v.display_name as vehicle_name FROM trips t
       JOIN vehicles v ON v.id = t.vehicle_id
       ${where} ORDER BY t.start_time DESC LIMIT ? OFFSET ?`
    ).all(...params);
    res.json(trips);
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
         COUNT(*) as total_trips,
         COALESCE(SUM(distance_km), 0) as total_km,
         COALESCE(AVG(distance_km), 0) as avg_km,
         COALESCE(SUM(energy_used_kwh), 0) as total_energy_kwh,
         COALESCE(AVG(energy_used_kwh / NULLIF(distance_km, 0) * 100), 0) as avg_consumption
       FROM trips ${where}`
    ).get(...params);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
    const points = db.prepare(
      'SELECT * FROM trip_points WHERE trip_id = ? ORDER BY timestamp ASC'
    ).all(trip.id);
    res.json({ ...trip, points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const db = getDb();
  const {
    vehicle_id, start_time, end_time, start_lat, start_lon, end_lat, end_lon,
    start_address, end_address, distance_km, energy_used_kwh, avg_speed_kmh,
    max_speed_kmh, start_soc, end_soc,
  } = req.body;
  try {
    const result = db.prepare(
      `INSERT INTO trips (vehicle_id, start_time, end_time, start_lat, start_lon,
       end_lat, end_lon, start_address, end_address, distance_km, energy_used_kwh,
       avg_speed_kmh, max_speed_kmh, start_soc, end_soc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicle_id, start_time, end_time, start_lat, start_lon, end_lat, end_lon,
      start_address, end_address, distance_km, energy_used_kwh, avg_speed_kmh,
      max_speed_kmh, start_soc, end_soc);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

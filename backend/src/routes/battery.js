import { Router } from 'express';

const router = Router();

router.get('/snapshots', (req, res) => {
  const db = req.db;
  const { vehicle_id, days = 90 } = req.query;
  try {
    const since = Math.floor(Date.now() / 1000) - +days * 86400;
    const where = vehicle_id
      ? 'WHERE vehicle_id = ? AND timestamp >= ?'
      : 'WHERE timestamp >= ?';
    const params = vehicle_id ? [vehicle_id, since] : [since];
    const snapshots = db.prepare(
      `SELECT * FROM battery_snapshots ${where} ORDER BY timestamp ASC`
    ).all(...params);
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/degradation', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];
    const data = db.prepare(
      `SELECT
         date(timestamp, 'unixepoch') as day,
         MAX(rated_range_km) as max_range,
         AVG(rated_range_km) as avg_range,
         AVG(soc) as avg_soc
       FROM battery_snapshots ${where}
       GROUP BY day ORDER BY day ASC`
    ).all(...params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/snapshot', (req, res) => {
  const db = req.db;
  const { vehicle_id, soc, rated_range_km, ideal_range_km, battery_level, usable_battery_level } = req.body;
  try {
    const result = db.prepare(
      `INSERT INTO battery_snapshots
       (vehicle_id, timestamp, soc, rated_range_km, ideal_range_km, battery_level, usable_battery_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicle_id, Math.floor(Date.now() / 1000), soc, rated_range_km, ideal_range_km,
      battery_level, usable_battery_level);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

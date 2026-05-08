import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const db = req.db;
  const { vehicle_id, limit = 50, offset = 0, driver_id } = req.query;
  try {
    const conds = [];
    const params = [];
    if (vehicle_id) { conds.push('t.vehicle_id = ?'); params.push(vehicle_id); }
    if (driver_id === 'null') { conds.push('t.driver_id IS NULL'); }
    else if (driver_id) { conds.push('t.driver_id = ?'); params.push(driver_id); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    params.push(+limit, +offset);
    const trips = db.prepare(
      `SELECT t.*, v.display_name as vehicle_name, d.name as driver_name, d.color as driver_color
       FROM trips t
       JOIN vehicles v ON v.id = t.vehicle_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       ${where} ORDER BY t.start_time DESC LIMIT ? OFFSET ?`
    ).all(...params);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  const db = req.db;
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
         COALESCE(AVG(energy_used_kwh / NULLIF(distance_km, 0) * 100), 0) as avg_consumption,
         COALESCE(SUM(CASE WHEN trip_type='private'  THEN distance_km ELSE 0 END), 0) as private_km,
         COALESCE(SUM(CASE WHEN trip_type='business' THEN distance_km ELSE 0 END), 0) as business_km,
         COALESCE(SUM(CASE WHEN trip_type='commute'  THEN distance_km ELSE 0 END), 0) as commute_km,
         COUNT(CASE WHEN trip_type != 'private' THEN 1 END) as classified_trips
       FROM trips ${where}`
    ).get(...params);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fahrtenbuch: Fahrten mit Klassifikations-Filter + Monatsgruppen
router.get('/logbook', (req, res) => {
  const db = req.db;
  const { vehicle_id, year, month, trip_type } = req.query;
  try {
    const conds = [];
    const params = [];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    if (trip_type)  { conds.push('trip_type = ?');  params.push(trip_type); }
    if (year)  { conds.push("strftime('%Y', datetime(start_time,'unixepoch')) = ?"); params.push(year); }
    if (month) { conds.push("strftime('%m', datetime(start_time,'unixepoch')) = ?"); params.push(month.padStart(2,'0')); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const trips = db.prepare(
      `SELECT t.id, t.start_time, t.end_time, t.start_lat, t.start_lon, t.end_lat, t.end_lon,
              t.start_address, t.end_address, t.distance_km, t.energy_used_kwh,
              t.start_soc, t.end_soc, t.trip_type, t.purpose, t.driver_id,
              d.name as driver_name, d.color as driver_color
       FROM trips t LEFT JOIN drivers d ON d.id = t.driver_id
       ${where} ORDER BY t.start_time DESC`
    ).all(...params);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monatsübersicht für Fahrtenbuch-Auswertung
router.get('/logbook/months', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];
    const rows = db.prepare(
      `SELECT
         strftime('%Y-%m', datetime(start_time,'unixepoch')) as month,
         COUNT(*) as trips,
         COALESCE(SUM(distance_km), 0) as total_km,
         COALESCE(SUM(CASE WHEN trip_type='private'  THEN distance_km ELSE 0 END), 0) as private_km,
         COALESCE(SUM(CASE WHEN trip_type='business' THEN distance_km ELSE 0 END), 0) as business_km,
         COALESCE(SUM(CASE WHEN trip_type='commute'  THEN distance_km ELSE 0 END), 0) as commute_km
       FROM trips ${where}
       GROUP BY month ORDER BY month DESC`
    ).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/driver', (req, res) => {
  const db = req.db;
  const { driver_id } = req.body;
  try {
    db.prepare('UPDATE trips SET driver_id=? WHERE id=?').run(driver_id ?? null, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const db = req.db;
  try {
    const trip = db.prepare(
      `SELECT t.*, d.name as driver_name, d.color as driver_color
       FROM trips t LEFT JOIN drivers d ON d.id = t.driver_id
       WHERE t.id = ?`
    ).get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Fahrt nicht gefunden' });


    const points = trip.source === 'telemetry'
      ? db.prepare(
          `SELECT timestamp, lat, lon, speed_kmh, power_kw, soc AS battery_level
           FROM telemetry_points WHERE trip_id = ? ORDER BY timestamp ASC`
        ).all(trip.id)
      : db.prepare(
          `SELECT timestamp, lat, lon, speed_kmh, power_kw, soc AS battery_level
           FROM trip_points WHERE trip_id = ? ORDER BY timestamp ASC`
        ).all(trip.id);

    res.json({ ...trip, points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const db = req.db;
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

// Fahrt klassifizieren
router.patch('/:id/classify', (req, res) => {
  const db = req.db;
  const { trip_type, purpose } = req.body;
  const allowed = ['private', 'business', 'commute'];
  if (!allowed.includes(trip_type)) {
    return res.status(400).json({ error: 'Ungültiger Typ. Erlaubt: private, business, commute' });
  }
  try {
    db.prepare('UPDATE trips SET trip_type=?, purpose=? WHERE id=?')
      .run(trip_type, purpose ?? null, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = req.db;
  try {
    db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

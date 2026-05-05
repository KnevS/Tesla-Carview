import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// CSV-Export Fahrten
router.get('/trips.csv', (req, res) => {
  const db = getDb();
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
  const rows = db.prepare(
    `SELECT t.*, v.display_name FROM trips t JOIN vehicles v ON v.id=t.vehicle_id ${where} ORDER BY start_time DESC`
  ).all(...(vehicle_id ? [vehicle_id] : []));

  const headers = ['id','start_time','end_time','start_address','end_address','distance_km',
    'energy_used_kwh','avg_speed_kmh','max_speed_kmh','start_soc','end_soc','vehicle'];
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => {
      const v = h === 'vehicle' ? r.display_name : r[h];
      return v != null ? String(v).replace(/;/g, ',') : '';
    }).join(';')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fahrten.csv"');
  res.send('﻿' + csv); // BOM für Excel
});

// JSON-Export Fahrten
router.get('/trips.json', (req, res) => {
  const db = getDb();
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE t.vehicle_id = ?' : '';
  const trips = db.prepare(
    `SELECT t.*, v.display_name FROM trips t JOIN vehicles v ON v.id=t.vehicle_id ${where} ORDER BY start_time DESC`
  ).all(...(vehicle_id ? [vehicle_id] : []));

  const withPoints = trips.map(t => ({
    ...t,
    points: db.prepare('SELECT * FROM trip_points WHERE trip_id=? ORDER BY timestamp ASC').all(t.id),
  }));
  res.json(withPoints);
});

// CSV-Export Ladevorgänge
router.get('/charging.csv', (req, res) => {
  const db = getDb();
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
  const rows = db.prepare(
    `SELECT * FROM charging_sessions ${where} ORDER BY start_time DESC`
  ).all(...(vehicle_id ? [vehicle_id] : []));

  const headers = ['id','start_time','end_time','location_name','charger_type',
    'start_soc','end_soc','energy_added_kwh','max_power_kw','cost','currency'];
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => r[h] != null ? String(r[h]).replace(/;/g, ',') : '').join(';')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ladevorgaenge.csv"');
  res.send('﻿' + csv);
});

// Vollständiges Backup als JSON
router.get('/backup.json', (req, res) => {
  const db = getDb();
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE id = ?' : '';
  const vehicles = db.prepare(`SELECT * FROM vehicles ${where}`).all(...(vehicle_id ? [vehicle_id] : []));

  const backup = vehicles.map(v => ({
    vehicle: v,
    trips: db.prepare('SELECT * FROM trips WHERE vehicle_id=?').all(v.id),
    charging: db.prepare('SELECT * FROM charging_sessions WHERE vehicle_id=?').all(v.id),
    battery: db.prepare('SELECT * FROM battery_snapshots WHERE vehicle_id=?').all(v.id),
    logbook: db.prepare('SELECT * FROM logbook_entries WHERE vehicle_id=?').all(v.id),
  }));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tesla-carview-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), data: backup });
});

export default router;

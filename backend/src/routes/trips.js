import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { logChanges, isLocked } from '../services/tripAudit.js';
import {
  assertVehicleAccess, assertTripAccess,
  restrictToOwnVehicles, guardAccess,
} from '../middleware/vehicleAccess.js';

const router = Router();

/** Helper: lehnt Aenderungen an einem Finanzamt-exportierten (locked)
 *  Trip ab. Wird oben in jedem schreibenden Handler aufgerufen. */
function checkLocked(req, res, trip) {
  if (isLocked(trip)) {
    res.status(423).json({ error: 'Trip ist Finanzamt-gesperrt — keine Aenderung mehr moeglich.' });
    return true;
  }
  return false;
}

router.get('/', (req, res) => {
  const db = req.db;
  const { vehicle_id, limit = 50, offset = 0, driver_id } = req.query;
  try {
    const conds = [];
    const params = [];
    if (vehicle_id) { conds.push('t.vehicle_id = ?'); params.push(vehicle_id); }
    if (driver_id === 'null') { conds.push('t.driver_id IS NULL'); }
    else if (driver_id) { conds.push('t.driver_id = ?'); params.push(driver_id); }
    // Auf eigene Fahrzeuge einschraenken — Admins sehen alles im Tenant.
    const restrict = restrictToOwnVehicles(req, 't.vehicle_id');
    const where = conds.length
      ? 'WHERE ' + conds.join(' AND ') + restrict.fragment
      : (restrict.fragment ? 'WHERE 1=1' + restrict.fragment : '');
    params.push(...restrict.params, +limit, +offset);
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
    const restrict = restrictToOwnVehicles(req, 'vehicle_id');
    const conds  = [];
    const params = [];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    const where = conds.length || restrict.fragment
      ? 'WHERE ' + (conds.length ? conds.join(' AND ') : '1=1') + restrict.fragment
      : '';
    params.push(...restrict.params);
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
              t.start_odometer_km, t.end_odometer_km,
              t.start_soc, t.end_soc, t.trip_type, t.purpose, t.business_partner,
              t.driver_id, t.is_manual, t.locked_at, t.exported_at,
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
    const restrict = restrictToOwnVehicles(req, 'vehicle_id');
    const conds  = [];
    const params = [];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    const where = conds.length || restrict.fragment
      ? 'WHERE ' + (conds.length ? conds.join(' AND ') : '1=1') + restrict.fragment
      : '';
    params.push(...restrict.params);
    const rows = db.prepare(
      `SELECT
         strftime('%Y-%m', datetime(start_time,'unixepoch')) as month,
         COUNT(*) as trips,
         COALESCE(SUM(distance_km), 0) as total_km,
         COALESCE(SUM(CASE WHEN trip_type='private'  THEN distance_km ELSE 0 END), 0) as private_km,
         COALESCE(SUM(CASE WHEN trip_type='business' THEN distance_km ELSE 0 END), 0) as business_km,
         COALESCE(SUM(CASE WHEN trip_type='commute'  THEN distance_km ELSE 0 END), 0) as commute_km,
         SUM(CASE WHEN trip_type='private'  THEN 1 ELSE 0 END) as private_trips,
         SUM(CASE WHEN trip_type='business' THEN 1 ELSE 0 END) as business_trips,
         SUM(CASE WHEN trip_type='commute'  THEN 1 ELSE 0 END) as commute_trips
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
  if (guardAccess(res, () => assertTripAccess(db, req.params.id, req.user))) return;
  const { driver_id } = req.body;
  const before = db.prepare('SELECT * FROM trips WHERE id=?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
  if (checkLocked(req, res, before)) return;
  try {
    db.prepare('UPDATE trips SET driver_id=? WHERE id=?').run(driver_id ?? null, req.params.id);
    logChanges(db, +req.params.id, req.user?.sub, before, { driver_id: driver_id ?? null }, ['driver_id']);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const db = req.db;
  if (guardAccess(res, () => assertTripAccess(db, req.params.id, req.user))) return;
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
  if (guardAccess(res, () => assertVehicleAccess(db, vehicle_id, req.user))) return;
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
// PATCH /api/trips/:id/business-partner — Geschaeftspartner setzen (BMF-Pflicht
// bei Dienstfahrten). Wir akzeptieren leere Strings als „loeschen".
router.patch('/:id/business-partner', validate(z.object({
  business_partner: z.string().max(500).nullable(),
})), (req, res) => {
  const db = req.db;
  if (guardAccess(res, () => assertTripAccess(db, req.params.id, req.user))) return;
  const before = db.prepare('SELECT * FROM trips WHERE id=?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
  if (checkLocked(req, res, before)) return;
  const bp = req.body.business_partner?.trim() || null;
  db.prepare('UPDATE trips SET business_partner=? WHERE id=?').run(bp, req.params.id);
  logChanges(db, +req.params.id, req.user?.sub, before, { business_partner: bp }, ['business_partner']);
  res.json({ ok: true });
});

// GET /api/trips/:id/history — Aenderungsverlauf
router.get('/:id/history', (req, res) => {
  if (guardAccess(res, () => assertTripAccess(req.db, req.params.id, req.user))) return;
  const rows = req.db.prepare(
    `SELECT tc.*, u.username AS changed_by_username
       FROM trip_changes tc
       LEFT JOIN users u ON u.id = tc.changed_by_user_id
      WHERE tc.trip_id = ?
      ORDER BY tc.changed_at ASC`
  ).all(req.params.id);
  res.json(rows);
});

// POST /api/trips/manual — komplett manuelle Fahrt-Erfassung
router.post('/manual', validate(z.object({
  vehicle_id:        z.number().int().positive(),
  start_time:        z.number().int().positive(),
  end_time:          z.number().int().positive(),
  start_address:     z.string().max(200).optional().nullable(),
  end_address:       z.string().max(200).optional().nullable(),
  start_odometer_km: z.number().min(0).optional().nullable(),
  end_odometer_km:   z.number().min(0).optional().nullable(),
  distance_km:       z.number().min(0).optional().nullable(),
  trip_type:         z.enum(['private','business','commute']).default('private'),
  purpose:           z.string().max(500).optional().nullable(),
  business_partner:  z.string().max(500).optional().nullable(),
  driver_id:         z.number().int().positive().optional().nullable(),
})), (req, res) => {
  const b = req.body;
  if (guardAccess(res, () => assertVehicleAccess(req.db, b.vehicle_id, req.user))) return;
  // distance_km automatisch aus Odometer-Diff ableiten, falls nicht gegeben.
  let distKm = b.distance_km;
  if (distKm == null && b.start_odometer_km != null && b.end_odometer_km != null) {
    distKm = Math.max(0, b.end_odometer_km - b.start_odometer_km);
  }
  if (b.end_time <= b.start_time) {
    return res.status(400).json({ error: 'end_time muss nach start_time liegen' });
  }
  try {
    const r = req.db.prepare(
      `INSERT INTO trips
         (vehicle_id, start_time, end_time, start_address, end_address,
          start_odometer_km, end_odometer_km, distance_km,
          trip_type, purpose, business_partner, driver_id, is_manual, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'manual')`
    ).run(b.vehicle_id, b.start_time, b.end_time,
          b.start_address ?? null, b.end_address ?? null,
          b.start_odometer_km ?? null, b.end_odometer_km ?? null, distKm ?? null,
          b.trip_type, b.purpose ?? null, b.business_partner ?? null,
          b.driver_id ?? null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/merge — Fahrten zusammenfuehren. Beide Trips muessen
// vom gleichen Fahrzeug sein. Resultat: erster Trip uebernimmt Endwerte +
// Distanz vom zweiten; zweiter wird geloescht. trip_points werden uebertragen.
router.post('/:id/merge', validate(z.object({
  other_trip_id: z.number().int().positive(),
})), (req, res) => {
  const db = req.db;
  if (guardAccess(res, () => assertTripAccess(db, req.params.id,    req.user))) return;
  if (guardAccess(res, () => assertTripAccess(db, req.body.other_trip_id, req.user))) return;
  const a = db.prepare('SELECT * FROM trips WHERE id=?').get(req.params.id);
  const b = db.prepare('SELECT * FROM trips WHERE id=?').get(req.body.other_trip_id);
  if (!a || !b) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
  if (a.vehicle_id !== b.vehicle_id) return res.status(400).json({ error: 'Verschiedene Fahrzeuge' });
  if (checkLocked(req, res, a) || checkLocked(req, res, b)) return;
  // Reihenfolge erzwingen — a ist die zeitlich fruehere Fahrt.
  const [first, second] = a.start_time <= b.start_time ? [a, b] : [b, a];
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE trips SET
         end_time         = ?,
         end_lat          = ?,
         end_lon          = ?,
         end_address      = COALESCE(?, end_address),
         end_odometer_km  = COALESCE(?, end_odometer_km),
         distance_km      = COALESCE(?, distance_km),
         energy_used_kwh  = COALESCE(?, energy_used_kwh),
         end_soc          = COALESCE(?, end_soc)
       WHERE id = ?`
    ).run(second.end_time, second.end_lat, second.end_lon,
          second.end_address, second.end_odometer_km,
          (first.distance_km || 0) + (second.distance_km || 0),
          (first.energy_used_kwh || 0) + (second.energy_used_kwh || 0),
          second.end_soc, first.id);
    // trip_points umhaengen, dann zweiten Trip + trip_changes loeschen
    db.prepare('UPDATE trip_points SET trip_id = ? WHERE trip_id = ?').run(first.id, second.id);
    db.prepare('DELETE FROM trips WHERE id = ?').run(second.id);
    logChanges(db, first.id, req.user?.sub,
      first, { merged_with: second.id }, ['merged_with']);
  });
  tx();
  res.json({ ok: true, merged_into: first.id });
});

// POST /api/trips/:id/split — Trip an gegebenem Zeitpunkt teilen.
router.post('/:id/split', validate(z.object({
  at: z.number().int().positive(),
})), (req, res) => {
  const db = req.db;
  if (guardAccess(res, () => assertTripAccess(db, req.params.id, req.user))) return;
  const a = db.prepare('SELECT * FROM trips WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
  if (checkLocked(req, res, a)) return;
  const at = req.body.at;
  if (at <= a.start_time || at >= a.end_time) {
    return res.status(400).json({ error: 'Teilungszeitpunkt liegt ausserhalb der Fahrt' });
  }
  // Aufteilung: Hälfte der Distanz/Energie pro Teil (Naeherung). Wer es
  // exakter braucht, kann nachtraeglich anpassen.
  const half = v => v == null ? null : Math.round((v / 2) * 100) / 100;
  const tx = db.transaction(() => {
    // Original behält start_*, bekommt at als end_time.
    db.prepare(
      `UPDATE trips SET
         end_time = ?, end_lat = NULL, end_lon = NULL, end_address = NULL,
         end_odometer_km = NULL,
         distance_km = ?, energy_used_kwh = ?
       WHERE id = ?`
    ).run(at, half(a.distance_km), half(a.energy_used_kwh), a.id);
    // Neuer Trip uebernimmt at..end_time
    const r = db.prepare(
      `INSERT INTO trips
         (vehicle_id, start_time, end_time, end_lat, end_lon, end_address,
          end_odometer_km, distance_km, energy_used_kwh, end_soc,
          trip_type, source, is_manual, driver_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'split', 1, ?)`
    ).run(a.vehicle_id, at, a.end_time, a.end_lat, a.end_lon, a.end_address,
          a.end_odometer_km, half(a.distance_km), half(a.energy_used_kwh), a.end_soc,
          a.trip_type, a.driver_id);
    // trip_points anhand des Zeitpunkts an den neuen Trip umhaengen
    db.prepare(
      'UPDATE trip_points SET trip_id = ? WHERE trip_id = ? AND timestamp >= ?'
    ).run(r.lastInsertRowid, a.id, at);
    logChanges(db, a.id, req.user?.sub, a, { split_at: at }, ['split_at']);
  });
  tx();
  res.json({ ok: true });
});

/** PATCH /api/trips/:id/location
 *  Manuelle Eingabe von Start/Ziel — fuer Fahrzeuge, deren Tesla-Account
 *  keine GPS-Koordinaten liefert (XP7-VIN ohne Fleet Telemetry).
 *  Erlaubt: nur die Adress- und Koordinatenfelder; alles andere bleibt
 *  unangetastet. Leere Strings werden als „nichts gesetzt" interpretiert. */
router.patch('/:id/location', (req, res) => {
  const db = req.db;
  if (guardAccess(res, () => assertTripAccess(db, req.params.id, req.user))) return;
  const norm = v => (typeof v === 'string' && v.trim() === '') ? null : v;
  const { start_address, end_address, start_lat, start_lon, end_lat, end_lon } = req.body;
  // Koordinaten-Validierung — nur falls mitgegeben.
  for (const [k, v] of Object.entries({ start_lat, start_lon, end_lat, end_lon })) {
    if (v == null || v === '') continue;
    const n = +v;
    if (!Number.isFinite(n)) return res.status(400).json({ error: `${k} ist keine Zahl` });
    if (k.endsWith('_lat') && (n < -90  || n > 90))  return res.status(400).json({ error: `${k} ausserhalb [-90, 90]` });
    if (k.endsWith('_lon') && (n < -180 || n > 180)) return res.status(400).json({ error: `${k} ausserhalb [-180, 180]` });
  }
  const before = db.prepare('SELECT * FROM trips WHERE id=?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
  if (checkLocked(req, res, before)) return;
  try {
    db.prepare(
      `UPDATE trips SET
         start_address = COALESCE(?, start_address),
         end_address   = COALESCE(?, end_address),
         start_lat     = COALESCE(?, start_lat),
         start_lon     = COALESCE(?, start_lon),
         end_lat       = COALESCE(?, end_lat),
         end_lon       = COALESCE(?, end_lon)
       WHERE id = ?`
    ).run(
      norm(start_address), norm(end_address),
      norm(start_lat), norm(start_lon),
      norm(end_lat), norm(end_lon),
      req.params.id,
    );
    const after = db.prepare('SELECT * FROM trips WHERE id=?').get(req.params.id);
    logChanges(db, +req.params.id, req.user?.sub, before, after,
      ['start_address','end_address','start_lat','start_lon','end_lat','end_lon']);
    res.json(after);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/classify', (req, res) => {
  const db = req.db;
  if (guardAccess(res, () => assertTripAccess(db, req.params.id, req.user))) return;
  const { trip_type, purpose } = req.body;
  const allowed = ['private', 'business', 'commute'];
  if (!allowed.includes(trip_type)) {
    return res.status(400).json({ error: 'Ungültiger Typ. Erlaubt: private, business, commute' });
  }
  const before = db.prepare('SELECT * FROM trips WHERE id=?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
  if (checkLocked(req, res, before)) return;
  try {
    db.prepare('UPDATE trips SET trip_type=?, purpose=? WHERE id=?')
      .run(trip_type, purpose ?? null, req.params.id);
    logChanges(db, +req.params.id, req.user?.sub, before,
      { trip_type, purpose: purpose ?? null }, ['trip_type', 'purpose']);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/trips/logbook/finanzamt-lock — sperrt alle Fahrten eines
 *  Jahres/Monats fuer das Finanzamt (locked_at = now, exported_at = now).
 *  Wird nach dem PDF-Export aufgerufen. Nur Admin. */
router.post('/logbook/finanzamt-lock', validate(z.object({
  vehicle_id: z.number().int().positive(),
  from:       z.number().int().nonnegative(),
  to:         z.number().int().nonnegative(),
})), (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur Admin' });
  const now = Math.floor(Date.now() / 1000);
  const r = req.db.prepare(
    `UPDATE trips
        SET locked_at = COALESCE(locked_at, ?),
            exported_at = ?
      WHERE vehicle_id = ?
        AND start_time >= ?
        AND start_time <  ?`
  ).run(now, now, req.body.vehicle_id, req.body.from, req.body.to);
  res.json({ ok: true, locked: r.changes });
});

router.delete('/:id', (req, res) => {
  const db = req.db;
  if (guardAccess(res, () => assertTripAccess(db, req.params.id, req.user))) return;
  try {
    db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

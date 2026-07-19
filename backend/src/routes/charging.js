// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { matchChargingLocation } from '../services/dataSync.js';
import {
  computeSessionEfficiency, summarizeEfficiency, bandForPower,
} from '../services/chargingEfficiency.js';
import {
  assertVehicleAccess, assertChargingAccess,
  restrictToOwnVehicles, guardAccess,
} from '../middleware/vehicleAccess.js';

const router = Router();

router.get('/', (req, res) => {
  const { vehicle_id, limit = 50, offset = 0, sort } = req.query;
  try {
    const restrict = restrictToOwnVehicles(req, 'vehicle_id');
    const conds  = [];
    const params = [];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    const where = conds.length || restrict.fragment
      ? 'WHERE ' + (conds.length ? conds.join(' AND ') : '1=1') + restrict.fragment
      : '';
    params.push(...restrict.params, +limit, +offset);
    // Sortierreihenfolge: desc (Default, neueste zuerst) oder asc.
    const orderDir = sort === 'asc' ? 'ASC' : 'DESC';
    res.json(req.db.prepare(
      `SELECT * FROM charging_sessions ${where} ORDER BY start_time ${orderDir} LIMIT ? OFFSET ?`
    ).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/charging/efficiency?vehicle_id=&days=180
 *
 *  Ladewirkungsgrad: wie viel der bezogenen Energie kommt im Akku an?
 *  Beantwortet die Dauerfrage „wo verpufft mein Strom" — an der Wallbox
 *  sind es wenige Prozent, an der Schuko-Dose ueber ein Fuenftel.
 *
 *  Liefert die Gesamtbilanz, die Aufschluesselung nach Leistungsband und
 *  die bewerteten Einzelsessions. Sessions ohne belastbare Datenlage
 *  (zu wenige Messpunkte, zu wenig Energie, unplausibles Ergebnis) werden
 *  bewusst NICHT geschaetzt, sondern als unbewertet gefuehrt — die
 *  Rechenlogik steckt in services/chargingEfficiency.js. */
router.get('/efficiency', (req, res) => {
  const { vehicle_id } = req.query;
  try {
    const days = Math.min(730, Math.max(1, parseInt(req.query.days) || 180));
    const restrict = restrictToOwnVehicles(req, 'vehicle_id');
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    const conds  = ['end_time IS NOT NULL', 'start_time >= ?'];
    const params = [since];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    const where = 'WHERE ' + conds.join(' AND ') + restrict.fragment;
    params.push(...restrict.params);

    const sessions = req.db.prepare(
      `SELECT id, vehicle_id, start_time, end_time, location_name, charger_type,
              start_soc, end_soc, energy_added_kwh, energy_kwh_mid, max_power_kw
       FROM charging_sessions ${where} ORDER BY start_time DESC`
    ).all(...params);

    // Messpunkte fuer alle Sessions in EINEM Query holen und im Speicher
    // gruppieren — ein Query je Session waere ein klassisches N+1.
    const pointsBySession = new Map();
    if (sessions.length) {
      const ids  = sessions.map(s => s.id);
      const rows = req.db.prepare(
        `SELECT session_id, timestamp, power_kw, energy_added_kwh
         FROM charging_points
         WHERE session_id IN (${ids.map(() => '?').join(',')})
         ORDER BY session_id, timestamp ASC`
      ).all(...ids);
      for (const row of rows) {
        if (!pointsBySession.has(row.session_id)) pointsBySession.set(row.session_id, []);
        pointsBySession.get(row.session_id).push(row);
      }
    }

    const rated = sessions.map(s => {
      const eff  = computeSessionEfficiency(s, pointsBySession.get(s.id) ?? []);
      const band = bandForPower(s.max_power_kw);
      return {
        id:             s.id,
        start_time:     s.start_time,
        location_name:  s.location_name,
        charger_type:   s.charger_type,
        max_power_kw:   s.max_power_kw,
        band:           band?.key ?? null,
        energy_added_kwh: s.energy_added_kwh,
        efficiency:     eff?.efficiency  ?? null,
        method:         eff?.method      ?? null,
        grid_kwh:       eff?.grid_kwh    ?? 0,
        battery_kwh:    eff?.battery_kwh ?? 0,
        lost_kwh:       eff ? Math.round((eff.grid_kwh - eff.battery_kwh) * 1000) / 1000 : null,
      };
    });

    res.json({ ...summarizeEfficiency(rated), days, sessions: rated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/charging/heatmap
 *
 *  Liefert pro Wochentag × Stunde:
 *   - count: wie viele Ladesessions in diesem Slot gestartet
 *   - avg_kw: durchschnittliche max_power_kw in diesem Slot
 *   - total_kwh: Summe der geladenen Energie in diesem Slot
 *
 *  Damit kann das Frontend zwei Heatmaps zeigen:
 *  - Haeufigkeit (count) → wann lade ich typischerweise
 *  - Leistung (avg_kw) → wo gibt's die schnelleren Ladungen
 *
 *  Aggregation per strftime: weekday 0..6 (Sonntag=0), hour 0..23. */
router.get('/heatmap', (req, res) => {
  const { vehicle_id } = req.query;
  try {
    const restrict = restrictToOwnVehicles(req, 'vehicle_id');
    const conds  = ['start_time IS NOT NULL'];
    const params = [];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    const where = 'WHERE ' + conds.join(' AND ') + restrict.fragment;
    params.push(...restrict.params);

    // strftime ohne 'localtime' waere UTC — User-Wahrnehmung ist aber lokal.
    // 'localtime' ist der Modifier in SQLite.
    const rows = req.db.prepare(
      `SELECT
         CAST(strftime('%w', datetime(start_time, 'unixepoch', 'localtime')) AS INTEGER) AS weekday,
         CAST(strftime('%H', datetime(start_time, 'unixepoch', 'localtime')) AS INTEGER) AS hour,
         COUNT(*)                              AS count,
         COALESCE(AVG(max_power_kw), 0)        AS avg_kw,
         COALESCE(SUM(energy_added_kwh), 0)    AS total_kwh,
         COALESCE(MAX(max_power_kw), 0)        AS peak_kw
       FROM charging_sessions
       ${where}
       GROUP BY weekday, hour
       ORDER BY weekday, hour`
    ).all(...params);
    res.json({ cells: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/charging/location-heatmap
 *
 * Geografische Dichte der Ladevorgänge: aggregiert `charging_sessions` mit
 * GPS auf ~100-m-Raster (ROUND(lat/lon, 3)); Gewicht = Anzahl Sessions,
 * zusätzlich total_kwh je Punkt für spätere Gewichtung. Pendant zu
 * `/api/trips/location-heatmap`. Schutz: restrictToOwnVehicles + vehicle_id.
 */
router.get('/location-heatmap', (req, res) => {
  const { vehicle_id, since } = req.query;
  try {
    const restrict = restrictToOwnVehicles(req, 'vehicle_id');
    const conds  = ['lat IS NOT NULL', 'lon IS NOT NULL'];
    const params = [];
    if (vehicle_id) { conds.push('vehicle_id = ?'); params.push(vehicle_id); }
    const sinceTs = since
      ? parseInt(since, 10)
      : Math.floor(Date.now() / 1000) - 365 * 86400;
    conds.push('start_time >= ?');
    params.push(sinceTs);
    const where = 'WHERE ' + conds.join(' AND ') + restrict.fragment;
    params.push(...restrict.params);

    const rows = req.db.prepare(
      `SELECT ROUND(lat, 3) AS lat, ROUND(lon, 3) AS lon,
              COUNT(*) AS weight,
              COALESCE(SUM(energy_added_kwh), 0) AS total_kwh,
              MAX(location_name) AS location_name
         FROM charging_sessions
         ${where}
         GROUP BY ROUND(lat, 3), ROUND(lon, 3)
         ORDER BY weight DESC
         LIMIT 5000`
    ).all(...params);
    res.json({ since: sinceTs, points: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
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

/** GET /api/charging/cost-by-location
 *
 *  Aggregiert die Ladungen je Ort (location_name). Liefert pro Ort:
 *   - sessions:      Anzahl Ladungen
 *   - energy_kwh:    Summe nachgeladene Energie
 *   - cost:          Summe Kosten (kostenlose Ladungen zaehlen 0)
 *   - free_sessions: davon als kostenlos markiert
 *   - any_home:      1, wenn am Ort mind. einmal an der Heim-Wallbox geladen
 *
 *  €/kWh berechnet das Frontend (Division, robust gegen 0-Energie).
 *  Aggregation komplett in SQL — keine JS-Schleife. */
router.get('/cost-by-location', (req, res) => {
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
    const rows = req.db.prepare(
      `SELECT location_name,
              COUNT(*)                                              AS sessions,
              COALESCE(SUM(energy_added_kwh), 0)                    AS energy_kwh,
              COALESCE(SUM(CASE WHEN is_free = 1 THEN 0 ELSE cost END), 0) AS cost,
              SUM(CASE WHEN is_free = 1 THEN 1 ELSE 0 END)          AS free_sessions,
              MAX(COALESCE(is_home_charged, 0))                     AS any_home
       FROM charging_sessions
       ${where}
       GROUP BY location_name
       ORDER BY cost DESC, energy_kwh DESC`
    ).all(...params);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /charging/current?vehicle_id= — laufende (offene) Ladesession live.
// Liefert die offene Session (end_time IS NULL) samt bisher erfassten Punkten
// plus eine Referenz-/Erwartungskurve aus einer vergleichbaren, abgeschlossenen
// Session (gleiches Fahrzeug + Ladetyp). Nutzt die vom Poller ohnehin
// geschriebenen charging_points — kein zusätzlicher Tesla-API-Call.
router.get('/current', (req, res) => {
  const { vehicle_id } = req.query;
  if (!vehicle_id) return res.json({ active: false });
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicle_id, req.user))) return;
  try {
    const session = req.db.prepare(
      'SELECT * FROM charging_sessions WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
    ).get(vehicle_id);
    if (!session) return res.json({ active: false });

    const points = req.db.prepare(
      'SELECT timestamp, soc, power_kw, voltage, current, energy_added_kwh FROM charging_points WHERE session_id=? ORDER BY timestamp ASC'
    ).all(session.id);

    // Erwartungskurve: jüngste abgeschlossene Session mit gleichem Ladetyp und
    // genügend Punkten — als soc→kW-Referenz. Fehlt sie, bleibt expected leer.
    const ref = req.db.prepare(
      `SELECT id FROM charging_sessions
       WHERE vehicle_id=? AND end_time IS NOT NULL AND id<>?
         AND (charger_type IS ? OR ? IS NULL)
       ORDER BY id DESC LIMIT 1`
    ).get(session.vehicle_id, session.id, session.charger_type, session.charger_type);
    let expected = [];
    if (ref) {
      expected = req.db.prepare(
        'SELECT soc, power_kw FROM charging_points WHERE session_id=? AND soc IS NOT NULL AND power_kw IS NOT NULL ORDER BY soc ASC'
      ).all(ref.id);
    }

    res.json({ active: true, session, points, expected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  if (guardAccess(res, () => assertChargingAccess(req.db, req.params.id, req.user))) return;
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
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicle_id, req.user))) return;
  try {
    const result = req.db.prepare(
      `INSERT INTO charging_sessions
       (vehicle_id, start_time, end_time, location_name, lat, lon, charger_type,
        start_soc, end_soc, energy_added_kwh, max_power_kw, cost, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicle_id, start_time, end_time, location_name, lat, lon, charger_type,
      start_soc, end_soc, energy_added_kwh, max_power_kw, cost, currency || 'EUR');
    const sessionId = result.lastInsertRowid;
    // Fire-and-forget: Reverse-Geocoding wenn location_name leer
    if (!location_name && lat != null && lon != null) {
      import('../services/geocodingService.js')
        .then(({ geocodeCharge }) => geocodeCharge(req.db, sessionId))
        .catch(() => {});
    }
    res.status(201).json({ id: sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/charging/:id — Kosten anpassen (inkl. auf 0 setzen)
router.patch('/:id', (req, res) => {
  if (guardAccess(res, () => assertChargingAccess(req.db, req.params.id, req.user))) return;
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
  if (guardAccess(res, () => assertChargingAccess(req.db, req.params.id, req.user))) return;
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
  if (guardAccess(res, () => assertChargingAccess(req.db, req.params.id, req.user))) return;
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

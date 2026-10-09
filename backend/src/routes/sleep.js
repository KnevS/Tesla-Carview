// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';
import { analyzeStandby } from '../services/sleepDetective.js';
import { usableBatteryKwh } from '../services/vehicleModel.js';
import { validTimeZone } from '../services/timeZone.js';

const router = Router();

// Mindestdauer, damit eine Schlafphase in den Ø-Verlust eingeht. Ein Auto,
// das im Tunnel oder in der Tiefgarage kurz auf `offline` flappt, erzeugt
// sonst Mini-Phasen, deren Hochrechnung auf %/h absurde Werte liefert
// (2 % in 5 Minuten wuerden zu 24 %/h). Fuer die Ereignisliste bleiben
// solche Phasen sichtbar — nur die Kennzahl wird geschuetzt.
const MIN_DRAIN_SAMPLE_MIN = 60;

// GET /api/sleep/:vehicleId?days=30
router.get('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const days      = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
    if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

    const since  = Math.floor(Date.now() / 1000) - days * 86400;
    const events = req.db.prepare(`
      SELECT * FROM vehicle_sleep_events
      WHERE vehicle_id=? AND sleep_at>=?
      ORDER BY sleep_at DESC
    `).all(vehicleId, since);

    const closed = events.filter(e => e.wake_at != null);
    const stats  = {
      events_count:       events.length,
      total_sleep_hours:  closed.length ? +(closed.reduce((s, e) => s + (e.duration_min || 0), 0) / 60).toFixed(1) : 0,
      longest_sleep_min:  closed.length ? Math.max(...closed.map(e => e.duration_min || 0)) : 0,
      avg_sleep_min:      closed.length ? Math.round(closed.reduce((s, e) => s + (e.duration_min || 0), 0) / closed.length) : 0,
      avg_drain_pct_per_hour: (() => {
        // Negativer Drain heisst: waehrend der Phase wurde geladen — das ist
        // kein Standby-Verlust und verfaelscht den Mittelwert.
        const withDrain = closed.filter(e =>
          e.drain_pct != null
          && e.drain_pct >= 0
          && e.duration_min >= MIN_DRAIN_SAMPLE_MIN,
        );
        if (!withDrain.length) return null;
        const rates = withDrain.map(e => e.drain_pct / (e.duration_min / 60));
        return +(rates.reduce((s, r) => s + r, 0) / rates.length).toFixed(2);
      })(),
    };

    res.json({ events, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Energiegewichteter Heimstrompreis der letzten 12 Monate — dieselbe
 * Heim-Definition wie das Ladepreis-Ranking. Rueckfall: der am Heim-Ladeort
 * gepflegte Tarif. Ohne beides gibt es keine Kostenschaetzung.
 */
function homePriceKwh(db, vehicleId) {
  const since = Math.floor(Date.now() / 1000) - 365 * 86400;
  const row = db.prepare(`
    SELECT SUM(cs.cost) AS cost, SUM(cs.energy_added_kwh) AS kwh
    FROM charging_sessions cs
    LEFT JOIN charging_locations cl ON cl.id = cs.location_id
    WHERE cs.vehicle_id = ? AND cs.start_time >= ? AND cs.end_time IS NOT NULL
      AND cs.energy_added_kwh > 0 AND cs.cost IS NOT NULL AND COALESCE(cs.is_free, 0) = 0
      AND (cs.is_home_charged = 1 OR cl.type = 'home'
           OR (cs.location_id IS NULL AND cs.charger_type NOT IN ('Supercharger','DC')))
  `).get(vehicleId, since);
  if (row?.kwh > 0 && row.cost > 0) return Math.round(row.cost / row.kwh * 10000) / 10000;
  const loc = db.prepare(
    `SELECT rate_kwh FROM charging_locations
     WHERE type='home' AND rate_kwh > 0 AND (vehicle_id = ? OR vehicle_id IS NULL)
     ORDER BY is_default DESC LIMIT 1`
  ).get(vehicleId);
  return loc?.rate_kwh ?? null;
}

// GET /api/sleep/:vehicleId/detective?days=14&tz=Europe/Berlin
// „Warum schlaeft mein Auto nicht?" — Rechenlogik in services/sleepDetective.js.
router.get('/:vehicleId/detective', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const days      = Math.min(30, Math.max(3, parseInt(req.query.days) || 14));
    if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

    const now  = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;
    const vehicle = req.db.prepare('SELECT model, vin, trim_badging FROM vehicles WHERE id=?').get(vehicleId);

    const points = req.db.prepare(`
      SELECT timestamp, trip_id, gear, soc, power_kw FROM telemetry_points
      WHERE vehicle_id=? AND timestamp>=? ORDER BY timestamp
    `).all(vehicleId, from);
    const trips = req.db.prepare(`
      SELECT start_time, end_time FROM trips
      WHERE vehicle_id=? AND (end_time IS NULL OR end_time>=?) AND start_time<=?
    `).all(vehicleId, from, now);
    const charges = req.db.prepare(`
      SELECT start_time, end_time FROM charging_sessions
      WHERE vehicle_id=? AND (end_time IS NULL OR end_time>=?) AND start_time<=?
    `).all(vehicleId, from, now);
    const sleepEvents = req.db.prepare(`
      SELECT sleep_at, wake_at, duration_min FROM vehicle_sleep_events
      WHERE vehicle_id=? AND (wake_at IS NULL OR wake_at>=?)
    `).all(vehicleId, from);

    res.json({
      window_days: days,
      ...analyzeStandby({
        points, trips, charges, sleepEvents, from, now,
        tz: validTimeZone(req.query.tz),
        batteryKwh: usableBatteryKwh(vehicle),
        homePrice: homePriceKwh(req.db, vehicleId),
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

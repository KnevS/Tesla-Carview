// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';
import { analyzeWinter } from '../services/winterAnalysis.js';
import { usableBatteryKwh } from '../services/vehicleModel.js';
import { lastKnownPosition } from '../services/vehiclePosition.js';

const router = Router();

// Vorhersage je Rasterfeld eine Stunde lang wiederverwenden — die Ansicht
// wird oft geoeffnet, das Wetter aendert sich nicht im Minutentakt.
const FORECAST_TTL_MS = 60 * 60 * 1000;
const forecastCache = new Map();

/**
 * 7-Tage-Vorhersage (Tages-Min/-Max) von Open-Meteo. Wie beim
 * Temperatur-Nachtrag verlassen nur auf 0,1° gerundete Koordinaten den
 * Server (Raster ~11 km).
 */
async function fetchForecast(lat, lon) {
  const rl = Math.round(lat * 10) / 10, ro = Math.round(lon * 10) / 10;
  const key = `${rl}|${ro}`;
  const hit = forecastCache.get(key);
  if (hit && Date.now() - hit.at < FORECAST_TTL_MS) return hit.days;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${rl.toFixed(1)}&longitude=${ro.toFixed(1)}`
    + '&daily=temperature_2m_min,temperature_2m_max&forecast_days=7&timezone=auto';
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const j = await r.json();
    const d = j?.daily;
    const days = (d?.time ?? []).map((date, i) => ({
      date, tmin: d.temperature_2m_min?.[i], tmax: d.temperature_2m_max?.[i],
    })).filter(x => x.tmin != null && x.tmax != null);
    forecastCache.set(key, { at: Date.now(), days });
    return days;
  } catch {
    return [];
  }
}

// GET /api/winter/:vehicleId
router.get('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

    const since = Math.floor(Date.now() / 1000) - 365 * 86400;
    const trips = req.db.prepare(`
      SELECT id, start_time, distance_km, energy_used_kwh, outside_temp_avg_c, outside_temp_source
      FROM trips
      WHERE vehicle_id=? AND start_time>=? AND end_time IS NOT NULL
    `).all(vehicleId, since);

    const vehicle = req.db.prepare('SELECT model, vin, trim_badging FROM vehicles WHERE id=?').get(vehicleId);
    const pos = lastKnownPosition(req.db, vehicleId);
    const forecastDays = pos ? await fetchForecast(pos.lat, pos.lon) : [];

    // Ladestand: juengster Telemetrie-Wert (bis 2 Tage alt), sonst der
    // State-Cache des Pollers — bei Telemetrie-Nutzern ist der oft veraltet.
    const tlmSoc = req.db.prepare(
      'SELECT soc FROM telemetry_points WHERE vehicle_id=? AND soc IS NOT NULL AND timestamp>=? ORDER BY timestamp DESC LIMIT 1'
    ).get(vehicleId, Math.floor(Date.now() / 1000) - 2 * 86400);
    const socRow = tlmSoc ? { battery_level: tlmSoc.soc }
      : req.db.prepare('SELECT battery_level FROM vehicle_state_cache WHERE vehicle_id=?').get(vehicleId);
    res.json(analyzeWinter(trips, {
      forecastDays,
      batteryKwh: usableBatteryKwh(vehicle),
      socPct: socRow?.battery_level ?? null,
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

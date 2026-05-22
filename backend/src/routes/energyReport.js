import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

const WLTP_MAP = { 'model y': 16.9, 'model 3': 14.9, 'model s': 19.5, 'model x': 22.0 };
function wltpFor(model) {
  const m = (model || '').toLowerCase();
  for (const [k, v] of Object.entries(WLTP_MAP)) {
    if (m.includes(k)) return v;
  }
  return 18.0;
}

function ecoScore(avgKwh100, wltp) {
  if (!avgKwh100 || !wltp) return null;
  return Math.max(0, Math.min(100, Math.round(100 - (avgKwh100 - wltp) / wltp * 100)));
}

function weekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const kw = Math.ceil(((d - jan1) / 86400000 + jan1.getUTCDay() + 1) / 7);
  return `KW ${kw}`;
}

// GET /api/energy/report?weeks=4&vehicle_id=X
router.get('/report', async (req, res) => {
  try {
    const weeks     = Math.min(52, Math.max(1, parseInt(req.query.weeks) || 4));
    const vehicleId = parseInt(req.query.vehicle_id);
    if (!vehicleId) return res.status(400).json({ error: 'vehicle_id erforderlich' });
    if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

    const vehicle = req.db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicleId);
    const wltp    = wltpFor(vehicle?.model);
    const since   = Math.floor(Date.now() / 1000) - weeks * 7 * 86400;

    const trips = req.db.prepare(`
      SELECT id, start_time, distance_km, energy_used_kwh
      FROM trips
      WHERE vehicle_id=? AND start_time>=? AND distance_km>1 AND energy_used_kwh>0
      ORDER BY start_time ASC
    `).all(vehicleId, since);

    // Gruppieren nach Kalenderwochen (ISO Montag)
    const byWeek = new Map();
    for (const t of trips) {
      const d   = new Date(t.start_time * 1000);
      const dow = (d.getUTCDay() + 6) % 7; // 0=Mo
      const mon = new Date(d);
      mon.setUTCDate(d.getUTCDate() - dow);
      const key = mon.toISOString().slice(0, 10);
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key).push(t);
    }

    // Leere Wochen auffüllen
    const weekData = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const mon = new Date();
      const dow = (mon.getUTCDay() + 6) % 7;
      mon.setUTCDate(mon.getUTCDate() - dow - w * 7);
      const key = mon.toISOString().slice(0, 10);
      const wt  = byWeek.get(key) || [];

      const totalKm  = wt.reduce((s, t) => s + t.distance_km, 0);
      const totalKwh = wt.reduce((s, t) => s + t.energy_used_kwh, 0);
      const avg      = totalKm > 0 ? totalKwh / totalKm * 100 : null;
      const score    = avg ? ecoScore(avg, wltp) : null;

      const sorted   = [...wt].sort((a, b) => (a.energy_used_kwh / a.distance_km) - (b.energy_used_kwh / b.distance_km));
      const best     = sorted[0]  ? { id: sorted[0].id,  start_time: sorted[0].start_time,  distance_km: +sorted[0].distance_km.toFixed(1),  avg_consumption_kwh_100km: +(sorted[0].energy_used_kwh  / sorted[0].distance_km  * 100).toFixed(1) } : null;
      const worst    = sorted.at(-1) && sorted.length > 1 ? { id: sorted.at(-1).id, start_time: sorted.at(-1).start_time, distance_km: +sorted.at(-1).distance_km.toFixed(1), avg_consumption_kwh_100km: +(sorted.at(-1).energy_used_kwh / sorted.at(-1).distance_km * 100).toFixed(1) } : null;

      weekData.push({
        week_label: weekLabel(key),
        week_start: key,
        total_km:   +totalKm.toFixed(1),
        total_kwh:  +totalKwh.toFixed(1),
        avg_consumption: avg ? +avg.toFixed(1) : null,
        trips:   wt.length,
        eco_score: score,
        best_trip:  best,
        worst_trip: worst,
      });
    }

    const allKm  = trips.reduce((s, t) => s + t.distance_km, 0);
    const allKwh = trips.reduce((s, t) => s + t.energy_used_kwh, 0);
    const allAvg = allKm > 0 ? allKwh / allKm * 100 : null;

    // Score-Trend: letzte vs. vorletzte Woche
    const last2 = weekData.slice(-2);
    let trend = null;
    if (last2.length === 2 && last2[0].eco_score != null && last2[1].eco_score != null) {
      const diff = last2[1].eco_score - last2[0].eco_score;
      trend = (diff >= 0 ? '+' : '') + diff;
    }

    // CO₂-Vergleich: Tesla-Strom vs. Diesel-Äquivalent
    // Deutscher Strommix ~0.38 kg CO₂/kWh, Diesel 7L/100km × 2.65 kg/L
    const gridKgPerKwh    = 0.38;
    const dieselKgPer100km = 7 * 2.65;
    const co2_tesla_kg    = +(allKwh * gridKgPerKwh).toFixed(1);
    const co2_diesel_kg   = +(allKm * dieselKgPer100km / 100).toFixed(1);
    const co2_saved_kg    = +Math.max(0, co2_diesel_kg - co2_tesla_kg).toFixed(1);
    // CO₂ auch pro Woche berechnen
    for (const w of weekData) {
      const wElec   = +(w.total_kwh * gridKgPerKwh).toFixed(1);
      const wDiesel = +(w.total_km  * dieselKgPer100km / 100).toFixed(1);
      w.co2_tesla_kg  = wElec;
      w.co2_diesel_kg = wDiesel;
      w.co2_saved_kg  = +Math.max(0, wDiesel - wElec).toFixed(1);
    }

    res.json({
      wltp_kwh_100km: wltp,
      weeks: weekData,
      overall: {
        total_km:        +allKm.toFixed(1),
        total_kwh:       +allKwh.toFixed(1),
        avg_consumption: allAvg ? +allAvg.toFixed(1) : null,
        eco_score:       ecoScore(allAvg, wltp),
        score_trend:     trend,
        co2: {
          tesla_kg:        co2_tesla_kg,
          diesel_kg:       co2_diesel_kg,
          saved_kg:        co2_saved_kg,
          grid_kg_per_kwh: gridKgPerKwh,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

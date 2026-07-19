// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';
import { computeEnergyBalance, estimateUsableCapacity, extraVsTesla } from '../services/energyBalance.js';
import { computeSessionEfficiency, summarizeEfficiency } from '../services/chargingEfficiency.js';

const router = Router();

// Wie weit ein battery_snapshot vom Fensterrand entfernt sein darf, um noch
// als Randwert zu taugen. Snapshots entstehen alle 15 Minuten, ein Tag
// Abstand heisst: das Auto stand die ganze Zeit ohne Verbindung.
const SOC_BOUND_MAX_LAG_S = 86400;

// Anteil des Fensters, innerhalb dessen der erste Schlaf-Event liegen muss,
// damit die Standby-Aufschluesselung den Zeitraum plausibel abdeckt. Der
// Schlaf-Monitor schreibt erst seit v3.47.1 — fuer aeltere Fenster gibt es
// am Anfang keine Events, und eine Standby-Zeile waere dort eine
// Behauptung statt einer Messung.
const STANDBY_COVERAGE_HEAD = 0.2;

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
/** GET /api/energy/balance?vehicle_id=&days=90
 *
 *  Energiebilanz: „welche Verbrauchsangabe ist eigentlich echt?"
 *
 *  Tesla zeigt nur den Fahrtverbrauch. Standby, Waechter-Modus und
 *  Ladeverluste tauchen dort nicht auf, bezahlt werden sie trotzdem.
 *  Geliefert wird eine Leiter aus drei Sprossen (Fahrt → Akku-zu-Rad →
 *  Netz-zu-Rad), Rechenlogik in services/energyBalance.js.
 *
 *  Faellt eine Datenquelle aus, endet die Leiter eine Sprosse frueher —
 *  geraten wird nichts. */
router.get('/balance', (req, res) => {
  try {
    const vehicleId = parseInt(req.query.vehicle_id);
    if (!vehicleId) return res.status(400).json({ error: 'vehicle_id erforderlich' });
    if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

    // Default bewusst lang: Δsoc skaliert mit der Akkukapazitaet, der
    // Durchsatz mit der Nutzung. Ueber wenige Tage dominiert ein einzelner
    // Ladehub die Bilanz, ueber ein Quartal faellt er kaum ins Gewicht.
    const days  = Math.min(730, Math.max(7, parseInt(req.query.days) || 90));
    const now   = Math.floor(Date.now() / 1000);
    const since = now - days * 86400;

    const trips = req.db.prepare(`
      SELECT COALESCE(SUM(distance_km), 0) AS km,
             COALESCE(SUM(energy_used_kwh), 0) AS kwh
      FROM trips
      WHERE vehicle_id=? AND start_time>=? AND end_time IS NOT NULL
        AND distance_km > 0
    `).get(vehicleId, since);

    const sessions = req.db.prepare(`
      SELECT id, start_soc, end_soc, energy_added_kwh, energy_kwh_mid, max_power_kw
      FROM charging_sessions
      WHERE vehicle_id=? AND start_time>=? AND end_time IS NOT NULL
        AND energy_added_kwh > 0
    `).all(vehicleId, since);

    const chargedKwh = sessions.reduce((s, r) => s + (r.energy_added_kwh ?? 0), 0);
    const capacity   = estimateUsableCapacity(sessions);

    // SoC-Randwerte: naechster Snapshot zum Fensterrand. Liegt keiner nah
    // genug, bleibt Δsoc unbekannt und die Bilanz endet bei Sprosse 1.
    const socStart = nearestSoc(req.db, vehicleId, since, SOC_BOUND_MAX_LAG_S);
    const socEnd   = nearestSoc(req.db, vehicleId, now,   SOC_BOUND_MAX_LAG_S);

    // Ladewirkungsgrad ueber dasselbe Fenster — nur so passt die Netz-Sprosse
    // zum betrachteten Zeitraum.
    const efficiency = windowEfficiency(req.db, sessions);

    const standby = standbyKwh(req.db, vehicleId, since, now, days, capacity.kwh);

    const balance = computeEnergyBalance({
      km:         trips?.km  ?? 0,
      driveKwh:   trips?.kwh ?? 0,
      chargedKwh,
      socStart, socEnd, capacity, efficiency,
      standbyKwh: standby,
    });

    res.json({
      ...balance,
      days,
      sessions_count: sessions.length,
      extra_vs_tesla: extraVsTesla(balance),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** SoC aus dem Snapshot, der einem Zeitpunkt am naechsten liegt. */
function nearestSoc(db, vehicleId, at, maxLagS) {
  const row = db.prepare(`
    SELECT soc, ABS(timestamp - ?) AS lag
    FROM battery_snapshots
    WHERE vehicle_id=? AND soc IS NOT NULL
    ORDER BY lag ASC LIMIT 1
  `).get(at, vehicleId);
  if (!row || row.lag > maxLagS) return null;
  return row.soc;
}

/** Energiegewichteter Ladewirkungsgrad ueber die Sessions des Fensters. */
function windowEfficiency(db, sessions) {
  if (!sessions.length) return null;

  const ids  = sessions.map(s => s.id);
  const pts  = db.prepare(`
    SELECT session_id, timestamp, power_kw, energy_added_kwh
    FROM charging_points
    WHERE session_id IN (${ids.map(() => '?').join(',')})
    ORDER BY session_id, timestamp ASC
  `).all(...ids);

  const bySession = new Map();
  for (const p of pts) {
    if (!bySession.has(p.session_id)) bySession.set(p.session_id, []);
    bySession.get(p.session_id).push(p);
  }

  const rated = sessions.map(s => {
    const eff = computeSessionEfficiency(s, bySession.get(s.id) ?? []);
    return {
      efficiency:  eff?.efficiency  ?? null,
      grid_kwh:    eff?.grid_kwh    ?? 0,
      battery_kwh: eff?.battery_kwh ?? 0,
      method:      eff?.method      ?? null,
      band:        null,
    };
  });

  return summarizeEfficiency(rated).avg_efficiency;
}

/**
 * Standby-Verlust aus den Schlaf-Events — aber nur, wenn sie den Zeitraum
 * plausibel abdecken. Der Schlaf-Monitor schreibt erst seit v3.47.1; fuer
 * aeltere Fenster faende sich am Anfang kein Event, und die Bilanz wuerde
 * einen Verlust von 0 kWh behaupten, der nie gemessen wurde.
 */
function standbyKwh(db, vehicleId, since, now, days, capacityKwh) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(drain_pct), 0) AS drain, MIN(sleep_at) AS first_at, COUNT(*) AS n
    FROM vehicle_sleep_events
    WHERE vehicle_id=? AND sleep_at>=? AND wake_at IS NOT NULL AND drain_pct > 0
  `).get(vehicleId, since);

  if (!row?.n || row.first_at == null) return null;

  // Beginnt die Aufzeichnung erst spaet im Fenster, deckt sie es nicht ab.
  const headWindow = since + (now - since) * STANDBY_COVERAGE_HEAD;
  if (row.first_at > headWindow) return null;

  return row.drain / 100 * capacityKwh;
}

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

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Companion Phase 2 — Anomalie-Engine + Vorklimatisierungs-Empfehlung.
 *
 * Quellen: battery_snapshots, trips, charging_sessions (alles lokal).
 * Side-Effects: persistiert in battery_anomalies + precondition_suggestions,
 * sendet Push via notifyService.
 *
 * Wird vom nightlyMaintenance.runOnce() aufgerufen — pro Tenant, pro
 * Vehicle. Idempotent durch UNIQUE(vehicle_id, hash).
 */
import { createHash } from 'node:crypto';
import { getAllTenants, getDb, getMasterDb } from '../db/database.js';
import { notify } from './notifyService.js';

const ANOMALY_LOOKBACK_DAYS = 14;
const PRECONDITION_LOOKBACK_DAYS = 30;
const COLD_THRESHOLD_C = 5;
const HOT_THRESHOLD_C  = 30;
const PHANTOM_SPIKE_THRESHOLD_PCT_PER_H = 1.5;

function hashOf(parts) {
  return createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
}

/** Findet alle Anomalien eines Vehicles im Lookback-Fenster. */
function findAnomaliesForVehicle(db, vehicleId, lookbackS) {
  const since = Math.floor(Date.now() / 1000) - lookbackS;
  const anomalies = [];

  const snapshots = db.prepare(
    `SELECT timestamp, soc, rated_range_km
     FROM battery_snapshots
     WHERE vehicle_id=? AND timestamp >= ?
     ORDER BY timestamp ASC`
  ).all(vehicleId, since);

  const trips = db.prepare(
    `SELECT start_time, end_time FROM trips
     WHERE vehicle_id=? AND end_time IS NOT NULL AND end_time >= ?`
  ).all(vehicleId, since);
  const charges = db.prepare(
    `SELECT start_time, end_time FROM charging_sessions
     WHERE vehicle_id=? AND end_time IS NOT NULL AND end_time >= ?`
  ).all(vehicleId, since);
  const busy = [...trips, ...charges];
  const overlapsBusy = (t0, t1) => busy.some(b => b.start_time < t1 && b.end_time > t0);

  // SOC-/Range-Sprünge in kurzen Fenstern (≤30 min) ohne Trip/Charge
  for (let i = 1; i < snapshots.length; i++) {
    const a = snapshots[i - 1], b = snapshots[i];
    const dt = b.timestamp - a.timestamp;
    if (dt <= 0 || dt > 1800) continue;

    if (a.soc != null && b.soc != null) {
      const dsoc = Math.abs(b.soc - a.soc);
      if (dsoc >= 10 && !overlapsBusy(a.timestamp, b.timestamp)) {
        anomalies.push({
          type: 'soc_jump',
          occurred_at: b.timestamp,
          details: { soc_from: a.soc, soc_to: b.soc, window_min: Math.round(dt / 60) },
        });
      }
    }
    if (a.rated_range_km != null && b.rated_range_km != null) {
      const drange = Math.abs(b.rated_range_km - a.rated_range_km);
      if (drange >= 30) {
        anomalies.push({
          type: 'range_jump',
          occurred_at: b.timestamp,
          details: { range_from: +a.rated_range_km.toFixed(1), range_to: +b.rated_range_km.toFixed(1), window_min: Math.round(dt / 60) },
        });
      }
    }
  }

  // Phantom-Drain-Spike (1-48h Stillstand mit >1.5 %/h Verlust)
  for (let i = 1; i < snapshots.length; i++) {
    const a = snapshots[i - 1], b = snapshots[i];
    const dh = (b.timestamp - a.timestamp) / 3600;
    if (dh < 1 || dh > 48) continue;
    if (a.soc == null || b.soc == null) continue;
    const dsoc = a.soc - b.soc;
    if (dsoc <= 0) continue;
    if (overlapsBusy(a.timestamp, b.timestamp)) continue;
    const rate = dsoc / dh;
    if (rate >= PHANTOM_SPIKE_THRESHOLD_PCT_PER_H) {
      anomalies.push({
        type: 'phantom_spike',
        occurred_at: b.timestamp,
        details: { soc_loss: dsoc, hours: +dh.toFixed(2), pct_per_hour: +rate.toFixed(3) },
      });
    }
  }

  // Effizienz-Outlier aus Trips
  const oddTrips = db.prepare(
    `SELECT id, start_time, distance_km, energy_used_kwh
     FROM trips
     WHERE vehicle_id=? AND start_time >= ? AND distance_km > 5 AND energy_used_kwh > 0`
  ).all(vehicleId, since);
  for (const t of oddTrips) {
    const eff = (t.energy_used_kwh / t.distance_km) * 100;
    if (eff > 35 || eff < 7) {
      anomalies.push({
        type: 'efficiency_outlier',
        occurred_at: t.start_time,
        details: { kwh_per_100km: +eff.toFixed(2), distance_km: +t.distance_km.toFixed(1), trip_id: t.id },
      });
    }
  }

  return anomalies;
}

/** Persistiert neue Anomalien — idempotent durch (vehicle_id, hash). */
function persistAnomalies(db, vehicleId, found) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO battery_anomalies
       (vehicle_id, hash, type, occurred_at, details_json)
     VALUES (?, ?, ?, ?, ?)`
  );
  let inserted = 0;
  for (const a of found) {
    const h = hashOf([a.type, a.occurred_at, JSON.stringify(a.details)]);
    const r = insert.run(vehicleId, h, a.type, a.occurred_at, JSON.stringify(a.details));
    if (r.changes > 0) inserted++;
  }
  return inserted;
}

/** Pusht alle status='new'-Anomalien des Tenants. */
async function notifyNewAnomalies(db, tenantId) {
  const rows = db.prepare(
    `SELECT a.id, a.vehicle_id, a.type, a.occurred_at, a.details_json,
            v.display_name, v.vin
     FROM battery_anomalies a
     JOIN vehicles v ON v.id = a.vehicle_id
     WHERE a.status='new'
     ORDER BY a.occurred_at DESC
     LIMIT 5`
  ).all();
  if (rows.length === 0) return 0;

  // Empfänger: alle User des Fahrzeugs (vehicle_users) — bei Privat-Auto idR. nur einer.
  let sent = 0;
  for (const r of rows) {
    const users = db.prepare(
      'SELECT user_id FROM vehicle_users WHERE vehicle_id=?'
    ).all(r.vehicle_id);
    if (users.length === 0) continue;

    const det = JSON.parse(r.details_json);
    const carLabel = r.display_name || (r.vin ? r.vin.slice(-6) : `#${r.vehicle_id}`);
    const { title, body } = buildAnomalyMessage(r.type, det, carLabel);

    for (const u of users) {
      await notify({
        tenantId, userId: u.user_id, db,
        title, body, url: '/battery',
        emoji: '🔍', type: 'generic', vehicleId: r.vehicle_id,
      }).catch(() => {});
    }

    db.prepare(
      `UPDATE battery_anomalies SET status='notified', notified_at=unixepoch() WHERE id=?`
    ).run(r.id);
    sent++;
  }
  return sent;
}

function buildAnomalyMessage(type, det, car) {
  switch (type) {
    case 'soc_jump':
      return {
        title: `Akku-Anomalie: SOC-Sprung an ${car}`,
        body:  `${det.soc_from} % → ${det.soc_to} % in ${det.window_min} min ohne Fahrt/Laden — bitte prüfen.`,
      };
    case 'range_jump':
      return {
        title: `Reichweite-Sprung an ${car}`,
        body:  `${det.range_from} km → ${det.range_to} km in ${det.window_min} min (möglich nach Update/Recalibration).`,
      };
    case 'phantom_spike':
      return {
        title: `Phantom-Drain-Spike an ${car}`,
        body:  `${det.soc_loss} % Verlust in ${det.hours} h (${det.pct_per_hour} %/h) — Sentry/Preconditioning?`,
      };
    case 'efficiency_outlier':
      return {
        title: `Effizienz-Ausreißer an ${car}`,
        body:  `${det.kwh_per_100km} kWh/100km auf ${det.distance_km} km — Wetter/Stau/Topographie prüfen.`,
      };
    default:
      return { title: `Anomalie an ${car}`, body: `Typ ${type}` };
  }
}

/** Open-Meteo-Forecast für eine Position — minimal, mit Timeout. */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&hourly=temperature_2m&forecast_days=2&timezone=auto`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Häufigste Abfahrts-Zeitscheibe (HH:MM) aus den letzten 30 Tagen. */
function deriveTypicalDeparture(db, vehicleId, lookbackS) {
  const since = Math.floor(Date.now() / 1000) - lookbackS;
  const trips = db.prepare(
    `SELECT start_time FROM trips WHERE vehicle_id=? AND start_time >= ?`
  ).all(vehicleId, since);
  if (trips.length < 5) return null;
  // Buckets nach Stunde+Minute-Quartal
  const counts = {};
  for (const t of trips) {
    const d = new Date(t.start_time * 1000);
    const h = d.getHours();
    const q = Math.floor(d.getMinutes() / 15) * 15;
    const key = `${String(h).padStart(2, '0')}:${String(q).padStart(2, '0')}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

/** Erzeugt morgige Vorklim-Empfehlung wenn Temp <5°C oder >30°C zur typ. Abfahrt. */
async function generatePreconditionForVehicle(db, vehicleId) {
  const v = db.prepare(
    'SELECT id, display_name, vin, latitude, longitude FROM vehicles WHERE id=?'
  ).get(vehicleId);
  if (!v || v.latitude == null || v.longitude == null) {
    // Fallback: letzte bekannte GPS-Position aus telemetry_points o.ä.
    const fallback = db.prepare(
      `SELECT lat, lon FROM telemetry_points WHERE vehicle_id=? AND lat IS NOT NULL
       ORDER BY timestamp DESC LIMIT 1`
    ).get(vehicleId);
    if (!fallback) return null;
    v.latitude = fallback.lat;
    v.longitude = fallback.lon;
  }

  const depart = deriveTypicalDeparture(db, vehicleId, PRECONDITION_LOOKBACK_DAYS * 86400);
  if (!depart) return null;

  const wx = await fetchWeather(v.latitude, v.longitude);
  if (!wx?.hourly?.time?.length) return null;

  // Morgen-Datum + Departure-Zeit → Index in hourly
  const tomorrow = new Date(Date.now() + 86400 * 1000);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  const targetTs = `${dateStr}T${depart}`;
  const idx = wx.hourly.time.findIndex(t => t >= targetTs);
  if (idx < 0) return null;

  const temp = wx.hourly.temperature_2m[idx];
  if (temp == null) return null;
  if (temp >= COLD_THRESHOLD_C && temp <= HOT_THRESHOLD_C) return null;

  const reason_code = temp < COLD_THRESHOLD_C ? 'cold' : 'hot';
  const details = {
    vehicle_label: v.display_name || (v.vin ? v.vin.slice(-6) : `#${v.id}`),
    expected_temp_c: temp,
    expected_departure_hhmm: depart,
    forecast_time: wx.hourly.time[idx],
  };

  const result = db.prepare(
    `INSERT OR IGNORE INTO precondition_suggestions
       (vehicle_id, for_date, expected_temp_c, expected_departure_hhmm, reason_code, details_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(vehicleId, dateStr, temp, depart, reason_code, JSON.stringify(details));

  return result.changes > 0 ? { vehicleId, dateStr, reason_code, temp, depart, details } : null;
}

/** Pusht offene Vorklim-Empfehlungen einmalig pro for_date. */
async function notifyOpenSuggestions(db, tenantId) {
  const rows = db.prepare(
    `SELECT s.id, s.vehicle_id, s.for_date, s.reason_code, s.expected_temp_c,
            s.expected_departure_hhmm, s.details_json
     FROM precondition_suggestions s
     WHERE s.status='open' AND s.acknowledged_at IS NULL`
  ).all();
  let sent = 0;
  for (const r of rows) {
    const det = JSON.parse(r.details_json);
    const users = db.prepare('SELECT user_id FROM vehicle_users WHERE vehicle_id=?').all(r.vehicle_id);
    if (users.length === 0) continue;

    const cold = r.reason_code === 'cold';
    const title = cold
      ? `Frostige Abfahrt morgen — Vorklima empfohlen`
      : `Hitze morgen — Vorklima empfohlen`;
    const body = `${det.vehicle_label}: ${r.expected_temp_c.toFixed(1)} °C um ${r.expected_departure_hhmm} — `
      + (cold ? 'Akku rechtzeitig warm fahren spart Reichweite.'
              : 'Innenraum vorab kühlen, Akku schont sich beim Tritt aufs Gas.');

    for (const u of users) {
      await notify({
        tenantId, userId: u.user_id, db,
        title, body, url: '/battery',
        emoji: cold ? '❄️' : '☀️',
        type: 'generic', vehicleId: r.vehicle_id,
      }).catch(() => {});
    }
    db.prepare(
      `UPDATE precondition_suggestions SET acknowledged_at=unixepoch() WHERE id=?`
    ).run(r.id);
    sent++;
  }
  return sent;
}

/** Top-Level: läuft über alle Tenants + Vehicles. */
export async function runCompanionCycle({ skipPreconditions = false } = {}) {
  const tenants = getAllTenants().filter(t => t.status !== 'suspended');
  const summary = { tenants: 0, anomalies_found: 0, anomalies_notified: 0, suggestions_created: 0, suggestions_notified: 0 };

  for (const tenant of tenants) {
    let db;
    try { db = getDb(tenant.id); } catch { continue; }
    summary.tenants++;

    try {
      const vehicles = db.prepare('SELECT id FROM vehicles').all();
      const lookbackS = ANOMALY_LOOKBACK_DAYS * 86400;
      for (const v of vehicles) {
        const found = findAnomaliesForVehicle(db, v.id, lookbackS);
        summary.anomalies_found += persistAnomalies(db, v.id, found);

        if (!skipPreconditions) {
          const sug = await generatePreconditionForVehicle(db, v.id);
          if (sug) summary.suggestions_created++;
        }
      }
      summary.anomalies_notified  += await notifyNewAnomalies(db, tenant.id);
      summary.suggestions_notified += await notifyOpenSuggestions(db, tenant.id);
    } catch (e) {
      console.error('[CompanionEngine] Tenant', tenant.slug, 'Fehler:', e.message);
    }
  }
  return summary;
}

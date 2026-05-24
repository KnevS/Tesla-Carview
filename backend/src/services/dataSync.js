import { sendChargingCompleteNotification, sendPush } from './notifications.js';
import { maybeAutoClassify } from './geofenceClassifier.js';
import { maybeFuzz } from './gpsFuzzing.js';
import { dispatch as dispatchWebhook } from './webhookDispatcher.js';
import { buildTlmFromState, sendToAbrp } from './abrpService.js';
import { notifySentryAlert } from './notifyService.js';

const BATTERY_SNAPSHOT_INTERVAL = 15 * 60;
const MODEL_Y_USABLE_KWH = 75;
const milesToKm = m => m * 1.60934;

export async function syncVehicleState(db, vehicle, state, tenantId = null) {
  const now = Math.floor(Date.now() / 1000);

  const drive   = state.drive_state;
  const charge  = state.charge_state;
  const vs      = state.vehicle_state;
  const climate = state.climate_state;
  // Aussentemperatur bei diesem Sync — wird beim Trip-Abschluss
  // persistiert (Annaeherung an „Mittelwert ueber die Fahrt"; ein
  // echter Durchschnitt aus telemetry_points kann spaeter folgen).
  const outsideTempC = typeof climate?.outside_temp === 'number'
    ? climate.outside_temp
    : null;

  // display_name + odometer_km direkt mitziehen, damit
  // /api/service-intervals + /api/system/health stets aktuelle Werte
  // finden (Faelligkeit nach km nutzt v.odometer_km).
  const odomKmCurrent = vs?.odometer ? milesToKm(vs.odometer) : null;

  // option_codes + vehicle_config in einem Rutsch mit synchronisieren —
  // bilden die Grundlage fuer das korrekte Compositor-Vorschaubild
  // (Farbe, Felgen, Spoiler, Trim). Tesla liefert die Werte teilweise
  // top-level (option_codes), teilweise unter vehicle_config. COALESCE
  // sorgt dafuer, dass manuelle Admin-Edits nicht ueberschrieben werden,
  // wenn Tesla in einem Refresh die Felder mal nicht zurueckliefert.
  const cfg = state.vehicle_config || {};
  db.prepare(
    `UPDATE vehicles SET
       display_name      = ?,
       state_updated_at  = ?,
       odometer_km       = COALESCE(?, odometer_km),
       option_codes      = COALESCE(?, option_codes),
       wheel_type        = COALESCE(?, wheel_type),
       exterior_color    = COALESCE(?, exterior_color),
       trim_badging      = COALESCE(?, trim_badging),
       spoiler_type      = COALESCE(?, spoiler_type)
     WHERE id=?`
  ).run(
    state.display_name || vehicle.display_name, now, odomKmCurrent,
    state.option_codes || vs?.option_codes || null,
    cfg.wheel_type     || null,
    cfg.exterior_color || null,
    cfg.trim_badging   || null,
    cfg.spoiler_type   || null,
    vehicle.id,
  );

  // Batterie-Snapshot (alle 15 Min)
  const lastSnap = db.prepare(
    'SELECT timestamp FROM battery_snapshots WHERE vehicle_id=? ORDER BY timestamp DESC LIMIT 1'
  ).get(vehicle.id);
  if (!lastSnap || now - lastSnap.timestamp >= BATTERY_SNAPSHOT_INTERVAL) {
    db.prepare(
      `INSERT INTO battery_snapshots
       (vehicle_id, timestamp, soc, rated_range_km, ideal_range_km, battery_level, usable_battery_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      vehicle.id, now,
      charge?.battery_level,
      charge?.battery_range        ? milesToKm(charge.battery_range)      : null,
      charge?.ideal_battery_range  ? milesToKm(charge.ideal_battery_range) : null,
      charge?.battery_level,
      charge?.usable_battery_level,
    );
  }

  // GPS-basiertes Tracking (ältere Fahrzeuge mit drive_state inkl. Koordinaten).
  // Bei XP7-Modellen liefert Tesla manchmal shift_state, aber lat/lon = null —
  // dann ist drive_state nicht nutzbar und wir fallen unten auf den Odometer-Pfad.
  const driveValid = drive?.shift_state != null
                  && drive.latitude != null
                  && drive.longitude != null;

  if (driveValid && drive.shift_state !== 'P') {
    handleDriving(db, vehicle, drive, charge, now);
  } else if (driveValid) {
    finishGpsTrip(db, vehicle, drive, charge, now, outsideTempC);
  }

  // Odometer-basiertes Tracking — greift auch, wenn drive_state vorhanden,
  // aber unbrauchbar ist (kein lat/lon).
  if (!driveValid && vs) {
    const odomKm     = vs.odometer ? milesToKm(vs.odometer) : null;
    const nowPresent = vs.is_user_present ? 1 : 0;
    const cache      = getOrCreateCache(db, vehicle.id);
    const wasPresent = cache.is_user_present;

    if (!wasPresent && nowPresent)       startOdometerTrip(db, vehicle, charge, odomKm, now);
    else if (wasPresent && !nowPresent)  finishOdometerTrip(db, vehicle, charge, odomKm, now, outsideTempC);
    else if (nowPresent && odomKm)       keepOdometerTripAlive(db, vehicle, odomKm);

    // Sentry-Modus-Änderung erkennen: wenn Wächter aktiviert wird während
    // kein Nutzer anwesend ist → Wächter-Alarm senden (Fahrzeug berührt/geweckt).
    const wasSentry  = cache?.sentry_mode ?? 0;
    const nowSentry  = vs.sentry_mode ? 1 : 0;
    const sentryTriggered = !wasSentry && nowSentry && !nowPresent;

    // Sentry-Modus in Cache schreiben (Spalte nachrüsten falls fehlend)
    try {
      db.exec("ALTER TABLE vehicle_state_cache ADD COLUMN sentry_mode INTEGER NOT NULL DEFAULT 0");
    } catch { /* Spalte existiert bereits */ }

    db.prepare(`
      INSERT INTO vehicle_state_cache (vehicle_id, is_user_present, odometer_km, battery_level, sentry_mode, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(vehicle_id) DO UPDATE SET
        is_user_present=excluded.is_user_present,
        odometer_km=excluded.odometer_km,
        battery_level=excluded.battery_level,
        sentry_mode=excluded.sentry_mode,
        updated_at=excluded.updated_at
    `).run(vehicle.id, nowPresent, odomKm, charge?.battery_level, nowSentry, now);

    // Sentry-Alarm asynchron senden (blockiert nicht den Sync-Loop)
    if (sentryTriggered && tenantId) {
      notifySentryAlert(vehicle, db, tenantId).catch(() => {});
    }
  }

  // GPS-Fahrzeuge nehmen nie den !driveValid-Pfad oben, weshalb
  // vehicle_state_cache.updated_at nie aktualisiert wird und das
  // Monitoring einen Stale-Cache-WARN ausloest. Immer timestamp + SoC
  // schreiben ohne is_user_present / odometer_km zu ueberschreiben.
  db.prepare(`
    INSERT INTO vehicle_state_cache (vehicle_id, battery_level, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(vehicle_id) DO UPDATE SET
      battery_level = excluded.battery_level,
      updated_at    = excluded.updated_at
  `).run(vehicle.id, charge?.battery_level, now);

  // Lade-Tracking
  if (charge?.charging_state === 'Charging') {
    handleCharging(db, vehicle, charge, drive, now);
  } else {
    finishActiveCharging(db, vehicle, charge, now);
  }

  // ABRP Live-Telemetrie (best-effort, blockiert nicht)
  if (vehicle.abrp_token) {
    const freshVehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicle.id);
    sendToAbrp(freshVehicle, buildTlmFromState(state, now)).catch(() => {});
  }

  // Notification-Rules + Sleep-Monitoring (best-effort, darf Sync nie crashen)
  evaluateRules(db, vehicle.id, charge, drive).catch(() => {});
  trackSleepEvents(db, vehicle.id, vs?.state || 'unknown', charge?.battery_level);

  // Software-Update-Tracker: neue Firmware-Version erkennen und speichern
  const carVersion = vs?.car_version;
  if (carVersion) {
    try {
      db.prepare(
        'INSERT OR IGNORE INTO firmware_versions (vehicle_id, version, detected_at) VALUES (?, ?, ?)'
      ).run(vehicle.id, carVersion, now);
    } catch { /* ignore */ }
  }

  // HVAC-Statistiken aggregieren (best-effort)
  try { trackHvacStats(db, vehicle.id, climate, now); } catch { /* ignore */ }
}

// ---- Odometer Trip Helpers ------------------------------------------------

function getOrCreateCache(db, vehicleId) {
  let cache = db.prepare('SELECT * FROM vehicle_state_cache WHERE vehicle_id=?').get(vehicleId);
  if (!cache) {
    db.prepare('INSERT OR IGNORE INTO vehicle_state_cache (vehicle_id) VALUES (?)').run(vehicleId);
    cache = { vehicle_id: vehicleId, is_user_present: 0, odometer_km: null, battery_level: null };
  }
  return cache;
}

function startOdometerTrip(db, vehicle, charge, odomKm, now) {
  const existing = db.prepare(
    'SELECT id FROM trips WHERE vehicle_id=? AND end_time IS NULL LIMIT 1'
  ).get(vehicle.id);
  if (existing) return;
  db.prepare(
    `INSERT INTO trips (vehicle_id, start_time, start_soc, start_odometer_km, source)
     VALUES (?, ?, ?, ?, 'odometer')`
  ).run(vehicle.id, now, charge?.battery_level, odomKm);
}

function finishOdometerTrip(db, vehicle, charge, odomKm, now, outsideTempC = null) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) return;

  const distKm   = odomKm && active.start_odometer_km != null ? odomKm - active.start_odometer_km : null;
  const startSoc = active.start_soc;
  const endSoc   = charge?.battery_level ?? null;
  const energyKwh = startSoc != null && endSoc != null && startSoc > endSoc
    ? (startSoc - endSoc) / 100 * MODEL_Y_USABLE_KWH
    : null;

  // outside_temp_avg_c: aktuell der Wert beim Trip-Abschluss
  // (Annaeherung an Mittelwert ueber die Fahrt). Ein echter Durchschnitt
  // aus telemetry_points kann hier spaeter ergaenzt werden. COALESCE
  // mit dem alten Wert, damit ein nachlaufendes Re-Sync ohne Climate-
  // Payload einen bereits geschriebenen Wert nicht ueberschreibt.
  db.prepare(
    `UPDATE trips SET end_time=?, end_soc=?, end_odometer_km=?, distance_km=?, energy_used_kwh=?,
       outside_temp_avg_c=COALESCE(?, outside_temp_avg_c)
     WHERE id=?`
  ).run(now, endSoc, odomKm, distKm, energyKwh, outsideTempC, active.id);

  // Auto-Klassifikation anhand der Geofences (Home/Work). No-op wenn
  // der User schon manuell gesetzt hat oder kein Geofence matched.
  try { maybeAutoClassify(db, active.id); } catch { /* ignore */ }

  // trip.completed-Webhook (best-effort, darf den Sync nie crashen)
  dispatchWebhook(db, 'trip.completed', {
    trip_id:    active.id,
    vehicle_id: vehicle.id,
    start_time: active.start_time,
    end_time:   now,
    distance_km: distKm,
    trip_type:   active.trip_type ?? 'private',
  }).catch(() => { /* dispatcher swallows errors itself */ });
}

function keepOdometerTripAlive(db, vehicle, odomKm) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL LIMIT 1'
  ).get(vehicle.id);
  if (!active || odomKm == null) return;
  const distKm = active.start_odometer_km != null ? odomKm - active.start_odometer_km : null;
  db.prepare('UPDATE trips SET end_odometer_km=?, distance_km=? WHERE id=?')
    .run(odomKm, distKm, active.id);
}

// ---- GPS Trip Helpers (drive_state) ----------------------------------------

function handleDriving(db, vehicle, drive, charge, now) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) {
    // GPS-Fuzzing nur fuer den aggregierten Trip-Start, NICHT fuer
    // trip_points — sonst zerstoert das die Karten-Linie.
    const fuzzed = maybeFuzz(db, drive.latitude, drive.longitude);
    db.prepare(
      `INSERT INTO trips (vehicle_id, start_time, start_lat, start_lon, start_soc, source)
       VALUES (?, ?, ?, ?, ?, 'gps')`
    ).run(vehicle.id, now, fuzzed.lat, fuzzed.lon, charge?.battery_level);
  } else {
    db.prepare(
      `INSERT INTO trip_points (trip_id, timestamp, lat, lon, speed_kmh, power_kw, soc)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      active.id, now,
      drive.latitude, drive.longitude,
      drive.speed ? milesToKm(drive.speed) : 0,
      drive.power || 0,
      charge?.battery_level,
    );
  }
}

function finishGpsTrip(db, vehicle, drive, charge, now, outsideTempC = null) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) return;

  const points  = db.prepare('SELECT * FROM trip_points WHERE trip_id=? ORDER BY timestamp ASC').all(active.id);
  const distKm  = calcDistanceKm(points);
  const avgSpeed = points.length ? points.reduce((s, p) => s + (p.speed_kmh || 0), 0) / points.length : 0;
  const maxSpeed = points.length ? Math.max(...points.map(p => p.speed_kmh || 0)) : 0;

  // GPS-Fuzzing nur fuer das aggregierte Trip-Ende — trip_points
  // bleiben unangetastet (Karten-Track soll prazise bleiben).
  const rawLat = drive?.latitude  ?? active.start_lat;
  const rawLon = drive?.longitude ?? active.start_lon;
  const fuzzed = maybeFuzz(db, rawLat, rawLon);

  db.prepare(
    `UPDATE trips SET end_time=?, end_lat=?, end_lon=?, end_soc=?,
       distance_km=?, avg_speed_kmh=?, max_speed_kmh=?,
       outside_temp_avg_c=COALESCE(?, outside_temp_avg_c)
     WHERE id=?`
  ).run(
    now,
    fuzzed.lat,
    fuzzed.lon,
    charge?.battery_level,
    distKm, avgSpeed, maxSpeed,
    outsideTempC,
    active.id,
  );

  // trip.completed-Webhook (best-effort, darf den Sync nie crashen)
  dispatchWebhook(db, 'trip.completed', {
    trip_id:     active.id,
    vehicle_id:  vehicle.id,
    start_time:  active.start_time,
    end_time:    now,
    distance_km: distKm,
    trip_type:   active.trip_type ?? 'private',
  }).catch(() => { /* dispatcher swallows errors itself */ });
}

// ---- Lade-Tracking ---------------------------------------------------------

function handleCharging(db, vehicle, charge, drive, now) {
  const active = db.prepare(
    'SELECT * FROM charging_sessions WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);

  if (!active) {
    // Ladeort per GPS ermitteln (drive_state oder letzter bekannter Telemetriepunkt)
    const lat = drive?.latitude  ?? getLastKnownLat(db, vehicle.id);
    const lon = drive?.longitude ?? getLastKnownLon(db, vehicle.id);
    const loc = lat != null ? matchChargingLocation(db, vehicle.id, lat, lon) : null;

    // Tesla liefert manchmal 'Invalid' als fast_charger_type, wenn die
    // Lade-Hardware nicht eindeutig erkannt wurde (z.B. unsicherer
    // Adapter-Typ). Wir behandeln das wie „nicht gesetzt" und greifen
    // auf das fast_charger_present-Flag als Fallback zurueck.
    const fct = charge.fast_charger_type;
    const chargerType = (fct && fct !== 'Invalid')
      ? fct
      : (charge.fast_charger_present ? 'DC' : 'AC');

    db.prepare(
      `INSERT INTO charging_sessions
       (vehicle_id, start_time, charger_type, start_soc, max_power_kw, lat, lon, location_id, location_name, billing_rate_kwh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      vehicle.id, now,
      chargerType,
      charge.battery_level,
      charge.charger_power || 0,
      lat ?? null,
      lon ?? null,
      loc?.id ?? null,
      loc?.name ?? null,
      loc?.rate_kwh ?? null,
    );
    console.log(`[Sync] Laden gestartet: ${vehicle.display_name}${loc ? ` @ ${loc.name}` : ''}`);
  } else {
    db.prepare(
      `INSERT INTO charging_points (session_id, timestamp, soc, power_kw, voltage, current, energy_added_kwh)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      active.id, now,
      charge.battery_level,
      charge.charger_power || 0,
      charge.charger_voltage || 0,
      charge.charger_actual_current || 0,
      charge.charge_energy_added || 0,
    );
    if ((charge.charger_power || 0) > (active.max_power_kw || 0)) {
      db.prepare('UPDATE charging_sessions SET max_power_kw=? WHERE id=?')
        .run(charge.charger_power, active.id);
    }
  }
}

function finishActiveCharging(db, vehicle, charge, now) {
  const active = db.prepare(
    'SELECT * FROM charging_sessions WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) return;

  const energyKwh = charge?.charge_energy_added || 0;
  const rateKwh   = active.billing_rate_kwh;
  const cost      = rateKwh != null ? energyKwh * rateKwh : null;

  db.prepare(
    `UPDATE charging_sessions SET end_time=?, end_soc=?, energy_added_kwh=?, cost=?,
     billing_status=CASE WHEN ? IS NOT NULL THEN 'calculated' ELSE 'pending' END WHERE id=?`
  ).run(now, charge?.battery_level, energyKwh, cost, cost, active.id);

  console.log(`[Sync] Laden beendet: +${energyKwh.toFixed(1)} kWh${cost != null ? `, ${cost.toFixed(2)} EUR` : ''}`);
  sendChargingCompleteNotification(vehicle, charge, db).catch(() => {});

  // charging.completed-Webhook (best-effort)
  dispatchWebhook(db, 'charging.completed', {
    session_id:        active.id,
    vehicle_id:        vehicle.id,
    energy_added_kwh:  energyKwh,
    cost,
    location_name:     active.location_name ?? null,
  }).catch(() => { /* dispatcher swallows errors itself */ });
}

// ---- GPS Helpers -----------------------------------------------------------

function getLastKnownLat(db, vehicleId) {
  return db.prepare(
    'SELECT lat FROM telemetry_points WHERE vehicle_id=? AND lat IS NOT NULL ORDER BY timestamp DESC LIMIT 1'
  ).get(vehicleId)?.lat ?? null;
}

function getLastKnownLon(db, vehicleId) {
  return db.prepare(
    'SELECT lon FROM telemetry_points WHERE vehicle_id=? AND lon IS NOT NULL ORDER BY timestamp DESC LIMIT 1'
  ).get(vehicleId)?.lon ?? null;
}

export function matchChargingLocation(db, vehicleId, lat, lon) {
  const locations = db.prepare(
    'SELECT * FROM charging_locations WHERE (vehicle_id=? OR vehicle_id IS NULL) AND lat IS NOT NULL AND lon IS NOT NULL'
  ).all(vehicleId);

  let best = null;
  let bestDist = Infinity;
  for (const loc of locations) {
    const dist = haversineM(lat, lon, loc.lat, loc.lon);
    const radius = loc.radius_m ?? 200;
    if (dist <= radius && dist < bestDist) {
      bestDist = dist;
      best = loc;
    }
  }
  return best;
}

function calcDistanceKm(points) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineM(points[i-1].lat, points[i-1].lon, points[i].lat, points[i].lon) / 1000;
  }
  return total;
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Notification Rules ────────────────────────────────────────────────────────

const lastGeofenceState = new Map(); // key: `${vehicleId}_${geofenceId}` → boolean (inGeofence)

export async function evaluateRules(db, vehicleId, chargeState, driveState) {
  try {
    const rules = db.prepare(
      'SELECT * FROM notification_rules WHERE vehicle_id=? AND enabled=1'
    ).all(vehicleId);
    if (!rules.length) return;

    const now = Math.floor(Date.now() / 1000);

    for (const rule of rules) {
      if (rule.last_triggered_at && (now - rule.last_triggered_at) < rule.cooldown_minutes * 60) continue;

      let triggered = false;
      const soc = chargeState?.battery_level;

      if (rule.rule_type === 'soc_above' && soc != null)
        triggered = soc >= rule.threshold;
      else if (rule.rule_type === 'soc_below' && soc != null)
        triggered = soc <= rule.threshold;
      else if (rule.rule_type === 'charging_complete')
        triggered = chargeState?.charging_state === 'Complete';
      else if ((rule.rule_type === 'geofence_enter' || rule.rule_type === 'geofence_exit') && driveState?.lat && rule.geofence_id) {
        const gf = db.prepare('SELECT * FROM geofences WHERE id=?').get(rule.geofence_id);
        if (gf) {
          const dist     = haversineM(driveState.lat, driveState.lon, gf.lat, gf.lon);
          const inNow    = dist <= gf.radius_m;
          const stateKey = `${vehicleId}_${rule.geofence_id}`;
          const wasIn    = lastGeofenceState.get(stateKey);
          if (wasIn !== undefined) {
            if (rule.rule_type === 'geofence_enter' && !wasIn && inNow) triggered = true;
            if (rule.rule_type === 'geofence_exit'  && wasIn  && !inNow) triggered = true;
          }
          lastGeofenceState.set(stateKey, inNow);
        }
      }

      if (!triggered) continue;

      const param = rule.action_param ? JSON.parse(rule.action_param) : {};
      if (rule.action_type === 'push_notify') {
        const msg = param.message || 'Tesla-Alarm ausgelöst';
        await sendPush(db, vehicleId, 'Tesla Carview', msg);
      }
      // climate actions: fire-and-forget via teslaApi (imported lazily to avoid circular)
      if (['climate_on', 'climate_off', 'climate_set_temp'].includes(rule.action_type)) {
        try {
          const { apiProxyPost } = await import('./teslaApi.js');
          const v = db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicleId);
          if (v) {
            if (rule.action_type === 'climate_on')       await apiProxyPost(db, v, 'auto_conditioning_start', {});
            if (rule.action_type === 'climate_off')      await apiProxyPost(db, v, 'auto_conditioning_stop', {});
            if (rule.action_type === 'climate_set_temp') await apiProxyPost(db, v, 'set_temps', { driver_temp: param.temp_c ?? 21, passenger_temp: param.temp_c ?? 21 });
          }
        } catch (e) {
          console.error('[NotificationRules] Climate-Action fehlgeschlagen:', e.message);
        }
      }

      db.prepare('UPDATE notification_rules SET last_triggered_at=? WHERE id=?').run(now, rule.id);
    }
  } catch (err) {
    console.error('[NotificationRules] Fehler:', err.message);
  }
}

// ── Sleep Monitoring ──────────────────────────────────────────────────────────

const lastVehicleState = new Map(); // vehicleId → { state, soc, timestamp }

export function trackSleepEvents(db, vehicleId, currentState, currentSoc) {
  try {
    const prev = lastVehicleState.get(vehicleId);
    const now  = Math.floor(Date.now() / 1000);

    if (prev) {
      const wasAwake  = prev.state !== 'asleep';
      const isAsleep  = currentState === 'asleep';
      const wasAsleep = prev.state === 'asleep';
      const isAwake   = currentState !== 'asleep';

      if (wasAwake && isAsleep) {
        db.prepare(
          'INSERT INTO vehicle_sleep_events (vehicle_id, sleep_at, soc_at_sleep) VALUES (?, ?, ?)'
        ).run(vehicleId, now, prev.soc ?? currentSoc);
      } else if (wasAsleep && isAwake) {
        const open = db.prepare(
          'SELECT * FROM vehicle_sleep_events WHERE vehicle_id=? AND wake_at IS NULL ORDER BY sleep_at DESC LIMIT 1'
        ).get(vehicleId);
        if (open) {
          const durationMin = Math.round((now - open.sleep_at) / 60);
          const drainPct    = open.soc_at_sleep != null && currentSoc != null ? open.soc_at_sleep - currentSoc : null;
          db.prepare(
            'UPDATE vehicle_sleep_events SET wake_at=?, soc_at_wake=?, drain_pct=?, duration_min=? WHERE id=?'
          ).run(now, currentSoc, drainPct, durationMin, open.id);
        }
      }
    }

    lastVehicleState.set(vehicleId, { state: currentState, soc: currentSoc, timestamp: now });
  } catch (err) {
    console.error('[SleepMonitor] Fehler:', err.message);
  }
}

// ── HVAC-Statistiken ──────────────────────────────────────────────────────────

/**
 * Aggregiert Klimaanlagen- und Sitzheizungsnutzung in hvac_daily_stats.
 * Wird bei jedem Sync-Aufruf aufgerufen (best-effort, nie crashen).
 *
 * climate_state-Felder die ausgewertet werden:
 *   is_climate_on       — Klimaanlage/Heizung aktiv
 *   is_preconditioning  — Vorklimatisierung aktiv
 *   seat_heater_left    — Sitzheizung Fahrer (0–3)
 *   seat_heater_right   — Sitzheizung Beifahrer (0–3)
 *   inside_temp         — Innentemperatur °C
 *   outside_temp        — Außentemperatur °C
 */
export function trackHvacStats(db, vehicleId, climate, nowTs) {
  if (!climate) return;
  const day = new Date(nowTs * 1000).toISOString().slice(0, 10);
  // Poll-Intervall: Poller läuft alle 10min im PARKED-Modus → 10 min = 1 Poll
  const POLL_MINUTES = 10;

  const climateOn    = climate.is_climate_on       ? 1 : 0;
  const precon       = climate.is_preconditioning   ? 1 : 0;
  const seatLeft     = (climate.seat_heater_left  ?? 0) > 0 ? 1 : 0;
  const seatRight    = (climate.seat_heater_right ?? 0) > 0 ? 1 : 0;
  const insideTemp   = typeof climate.inside_temp  === 'number' ? climate.inside_temp  : null;
  const outsideTemp  = typeof climate.outside_temp === 'number' ? climate.outside_temp : null;

  db.prepare(`
    INSERT INTO hvac_daily_stats
      (vehicle_id, day, climate_on_minutes, seat_heat_left_on, seat_heat_right_on,
       precondition_count, max_inside_temp_c, min_outside_temp_c)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vehicle_id, day) DO UPDATE SET
      climate_on_minutes  = climate_on_minutes  + excluded.climate_on_minutes,
      seat_heat_left_on   = seat_heat_left_on   + excluded.seat_heat_left_on,
      seat_heat_right_on  = seat_heat_right_on  + excluded.seat_heat_right_on,
      precondition_count  = precondition_count  + excluded.precondition_count,
      max_inside_temp_c   = CASE
        WHEN excluded.max_inside_temp_c IS NOT NULL
             AND (max_inside_temp_c IS NULL OR excluded.max_inside_temp_c > max_inside_temp_c)
        THEN excluded.max_inside_temp_c ELSE max_inside_temp_c END,
      min_outside_temp_c  = CASE
        WHEN excluded.min_outside_temp_c IS NOT NULL
             AND (min_outside_temp_c IS NULL OR excluded.min_outside_temp_c < min_outside_temp_c)
        THEN excluded.min_outside_temp_c ELSE min_outside_temp_c END
  `).run(
    vehicleId, day,
    climateOn ? POLL_MINUTES : 0,
    seatLeft, seatRight, precon,
    insideTemp, outsideTemp,
  );
}

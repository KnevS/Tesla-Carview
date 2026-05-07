import { getDb } from '../db/database.js';
import { sendChargingCompleteNotification } from './notifications.js';

const BATTERY_SNAPSHOT_INTERVAL = 15 * 60;
const MODEL_Y_USABLE_KWH = 75;
const milesToKm = m => m * 1.60934;

export async function syncVehicleState(vehicle, state) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const drive  = state.drive_state;
  const charge = state.charge_state;
  const vs     = state.vehicle_state;

  db.prepare('UPDATE vehicles SET display_name=? WHERE id=?')
    .run(state.display_name || vehicle.display_name, vehicle.id);

  // -- Batterie-Snapshot (alle 15 Min)
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
      charge?.battery_range        ? milesToKm(charge.battery_range)       : null,
      charge?.ideal_battery_range  ? milesToKm(charge.ideal_battery_range) : null,
      charge?.battery_level,
      charge?.usable_battery_level,
    );
  }

  // -- GPS-basiertes Tracking (aeltere Fahrzeuge mit drive_state)
  if (drive?.shift_state && drive.shift_state !== 'P') {
    handleDriving(db, vehicle, drive, charge, now);
  } else if (drive) {
    finishGpsTrip(db, vehicle, drive, charge, now);
  }

  // -- Odometer-basiertes Tracking (neue Fahrzeuge ohne drive_state)
  if (!drive && vs) {
    const odomKm = vs.odometer ? milesToKm(vs.odometer) : null;
    const nowPresent = vs.is_user_present ? 1 : 0;
    const cache = getOrCreateCache(db, vehicle.id);
    const wasPresent = cache.is_user_present;

    if (!wasPresent && nowPresent) {
      startOdometerTrip(db, vehicle, charge, odomKm, now);
    } else if (wasPresent && !nowPresent) {
      finishOdometerTrip(db, vehicle, charge, odomKm, now);
    } else if (nowPresent && odomKm) {
      keepOdometerTripAlive(db, vehicle, charge, odomKm, now);
    }

    db.prepare(`
      INSERT INTO vehicle_state_cache (vehicle_id, is_user_present, odometer_km, battery_level, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(vehicle_id) DO UPDATE SET
        is_user_present=excluded.is_user_present,
        odometer_km=excluded.odometer_km,
        battery_level=excluded.battery_level,
        updated_at=excluded.updated_at
    `).run(vehicle.id, nowPresent, odomKm, charge?.battery_level, now);
  }

  // -- Lade-Tracking
  if (charge?.charging_state === 'Charging') {
    handleCharging(db, vehicle, charge, now);
  } else {
    finishActiveCharging(db, vehicle, charge, now);
  }
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
  console.log(`[Sync] Fahrt gestartet (Odometer): ${odomKm?.toFixed(1)} km, SoC ${charge?.battery_level}%`);
}

function finishOdometerTrip(db, vehicle, charge, odomKm, now) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) return;

  const distKm = odomKm && active.start_odometer_km != null
    ? odomKm - active.start_odometer_km
    : null;
  const startSoc = active.start_soc;
  const endSoc   = charge?.battery_level ?? null;
  const energyKwh = startSoc != null && endSoc != null && startSoc > endSoc
    ? (startSoc - endSoc) / 100 * MODEL_Y_USABLE_KWH
    : null;

  db.prepare(
    `UPDATE trips SET end_time=?, end_soc=?, end_odometer_km=?, distance_km=?, energy_used_kwh=?
     WHERE id=?`
  ).run(now, endSoc, odomKm, distKm, energyKwh, active.id);
  console.log(`[Sync] Fahrt beendet: ${distKm?.toFixed(1)} km, ${energyKwh?.toFixed(1)} kWh`);
}

function keepOdometerTripAlive(db, vehicle, charge, odomKm, now) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL LIMIT 1'
  ).get(vehicle.id);
  if (!active || odomKm == null) return;
  const distKm = active.start_odometer_km != null ? odomKm - active.start_odometer_km : null;
  db.prepare('UPDATE trips SET end_odometer_km=?, distance_km=? WHERE id=?')
    .run(odomKm, distKm, active.id);
}

// ---- GPS Trip Helpers (drive_state – aeltere Fahrzeuge) -------------------

function handleDriving(db, vehicle, drive, charge, now) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) {
    db.prepare(
      `INSERT INTO trips (vehicle_id, start_time, start_lat, start_lon, start_soc, source)
       VALUES (?, ?, ?, ?, ?, 'gps')`
    ).run(vehicle.id, now, drive.latitude, drive.longitude, charge?.battery_level);
    console.log(`[Sync] Fahrt gestartet (GPS): Fahrzeug ${vehicle.display_name}`);
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

function finishGpsTrip(db, vehicle, drive, charge, now) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) return;

  const points = db.prepare(
    'SELECT * FROM trip_points WHERE trip_id=? ORDER BY timestamp ASC'
  ).all(active.id);
  const distKm = calcDistanceKm(points);
  const avgSpeed = points.length ? points.reduce((s, p) => s + (p.speed_kmh || 0), 0) / points.length : 0;
  const maxSpeed = points.length ? Math.max(...points.map(p => p.speed_kmh || 0)) : 0;

  db.prepare(
    `UPDATE trips SET end_time=?, end_lat=?, end_lon=?, end_soc=?,
     distance_km=?, avg_speed_kmh=?, max_speed_kmh=? WHERE id=?`
  ).run(
    now,
    drive?.latitude ?? active.start_lat,
    drive?.longitude ?? active.start_lon,
    charge?.battery_level,
    distKm, avgSpeed, maxSpeed,
    active.id,
  );
  console.log(`[Sync] Fahrt beendet (GPS): ${distKm.toFixed(1)} km`);
}

// ---- Lade-Tracking --------------------------------------------------------

function handleCharging(db, vehicle, charge, now) {
  const active = db.prepare(
    'SELECT * FROM charging_sessions WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) {
    db.prepare(
      `INSERT INTO charging_sessions
       (vehicle_id, start_time, charger_type, start_soc, max_power_kw)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      vehicle.id, now,
      charge.fast_charger_type || (charge.fast_charger_present ? 'DC' : 'AC'),
      charge.battery_level,
      charge.charger_power || 0,
    );
    console.log(`[Sync] Laden gestartet: Fahrzeug ${vehicle.display_name}`);
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
  db.prepare(
    `UPDATE charging_sessions SET end_time=?, end_soc=?, energy_added_kwh=? WHERE id=?`
  ).run(now, charge?.battery_level, charge?.charge_energy_added || 0, active.id);
  console.log(`[Sync] Laden beendet: +${(charge?.charge_energy_added || 0).toFixed(1)} kWh`);
  sendChargingCompleteNotification(vehicle, charge).catch(() => {});
}

// ---- Geo-Helpers ----------------------------------------------------------

function calcDistanceKm(points) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i-1].lat, points[i-1].lon, points[i].lat, points[i].lon);
  }
  return total;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const toRad = d => d * Math.PI / 180;

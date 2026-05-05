import { getDb } from '../db/database.js';
import { sendChargingCompleteNotification } from './notifications.js';

const BATTERY_SNAPSHOT_INTERVAL = 15 * 60; // 15 Minuten in Sekunden

export async function syncVehicleState(vehicle, state) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const drive  = state.drive_state;
  const charge = state.charge_state;
  const vehicleState = state.vehicle_state;

  // -- Fahrzeug-Metadaten aktualisieren
  db.prepare('UPDATE vehicles SET display_name=? WHERE id=?')
    .run(state.display_name || vehicle.display_name, vehicle.id);

  // -- Batterie-Snapshot (alle 15 Min)
  const lastSnapshot = db.prepare(
    'SELECT timestamp FROM battery_snapshots WHERE vehicle_id=? ORDER BY timestamp DESC LIMIT 1'
  ).get(vehicle.id);

  if (!lastSnapshot || now - lastSnapshot.timestamp >= BATTERY_SNAPSHOT_INTERVAL) {
    db.prepare(
      `INSERT INTO battery_snapshots
       (vehicle_id, timestamp, soc, rated_range_km, ideal_range_km, battery_level, usable_battery_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      vehicle.id, now,
      charge?.battery_level,
      charge?.battery_range ? milesToKm(charge.battery_range) : null,
      charge?.ideal_battery_range ? milesToKm(charge.ideal_battery_range) : null,
      charge?.battery_level,
      charge?.usable_battery_level,
    );
  }

  // -- Fahrt-Tracking
  if (drive?.shift_state && drive.shift_state !== 'P') {
    handleDriving(db, vehicle, drive, charge, now);
  } else {
    finishActiveTrip(db, vehicle, drive, charge, now);
  }

  // -- Lade-Tracking
  if (charge?.charging_state === 'Charging') {
    handleCharging(db, vehicle, charge, now);
  } else {
    finishActiveCharging(db, vehicle, charge, now);
  }
}

function handleDriving(db, vehicle, drive, charge, now) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);

  if (!active) {
    db.prepare(
      `INSERT INTO trips (vehicle_id, start_time, start_lat, start_lon, start_soc)
       VALUES (?, ?, ?, ?, ?)`
    ).run(vehicle.id, now, drive.latitude, drive.longitude, charge?.battery_level);
    console.log(`[Sync] Fahrt gestartet: Fahrzeug ${vehicle.display_name}`);
  } else {
    // GPS-Punkt hinzufügen
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

function finishActiveTrip(db, vehicle, drive, charge, now) {
  const active = db.prepare(
    'SELECT * FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);
  if (!active) return;

  const points = db.prepare(
    'SELECT * FROM trip_points WHERE trip_id=? ORDER BY timestamp ASC'
  ).all(active.id);

  const distanceKm = calcDistanceKm(points);
  const avgSpeed   = points.length
    ? points.reduce((s, p) => s + (p.speed_kmh || 0), 0) / points.length
    : 0;
  const maxSpeed = points.length
    ? Math.max(...points.map(p => p.speed_kmh || 0))
    : 0;

  db.prepare(
    `UPDATE trips SET end_time=?, end_lat=?, end_lon=?, end_soc=?,
     distance_km=?, avg_speed_kmh=?, max_speed_kmh=? WHERE id=?`
  ).run(
    now,
    drive?.latitude ?? active.start_lat,
    drive?.longitude ?? active.start_lon,
    charge?.battery_level,
    distanceKm, avgSpeed, maxSpeed,
    active.id,
  );
  console.log(`[Sync] Fahrt beendet: ${distanceKm.toFixed(1)} km`);
}

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
    // Ladekurven-Punkt hinzufügen
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
    // Max-Leistung aktualisieren
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
    `UPDATE charging_sessions
     SET end_time=?, end_soc=?, energy_added_kwh=? WHERE id=?`
  ).run(now, charge?.battery_level, charge?.charge_energy_added || 0, active.id);
  console.log(`[Sync] Laden beendet: +${(charge?.charge_energy_added || 0).toFixed(1)} kWh`);

  // Push-Benachrichtigung senden
  sendChargingCompleteNotification(vehicle, charge).catch(() => {});
}

function calcDistanceKm(points) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
  }
  return total;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const toRad = d => d * Math.PI / 180;
const milesToKm = m => m * 1.60934;

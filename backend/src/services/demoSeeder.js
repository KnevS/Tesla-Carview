// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Fake-Daten-Generator für den Demo-Mandanten.
 *
 * Zwei Pfade:
 *   1. seedNewDemoUser(db, userId)  — beim Tester-Signup einmalig
 *      ein eigenes Fahrzeug + 3 Wochen Historie anlegen.
 *   2. tickDemoActivity(db)         — periodisch (alle 30 min), pro
 *      aktivem Demo-Fahrzeug eine neue „aktuelle" Fahrt + ggf. eine
 *      Ladesession ergaenzen, damit die App lebendig wirkt.
 *
 * Alle Werte sind frei erfunden; VIN-Prefix `DEMO` macht sie auch in
 * der Datenbank sofort als Fake erkennbar. Keine externen API-Calls.
 */

import { randomBytes } from 'crypto';

const MODEL_Y_USABLE_KWH = 75;

// Wenige feste Fahrt-Templates (~ Stuttgart-Umgebung, weil viele User
// dort sind), zufallsgemischt. Realistische Daten machen die Demo
// glaubhaft, ohne dass wir auf Map-APIs zurueckgreifen muessen.
const TRIP_TEMPLATES = [
  { from: 'Mercedesstraße 120, Stuttgart',    to: 'Hauptstraße 1, Esslingen',         km: 17.3, lat1: 48.7758, lon1: 9.1829, lat2: 48.7404, lon2: 9.3097 },
  { from: 'Königstraße, Stuttgart',           to: 'Markt 1, Ludwigsburg',             km: 22.8, lat1: 48.7780, lon1: 9.1730, lat2: 48.8973, lon2: 9.1916 },
  { from: 'Stuttgarter Str. 33, Waiblingen',  to: 'Marktplatz, Backnang',             km: 14.4, lat1: 48.8326, lon1: 9.3175, lat2: 48.9469, lon2: 9.4283 },
  { from: 'Musterstraße 1, Stuttgart',         to: 'Tesla Center Sindelfingen',        km: 24.6, lat1: 48.7800, lon1: 9.1750, lat2: 48.7100, lon2: 9.0083 },
  { from: 'Flughafen Stuttgart (STR)',        to: 'Musterstraße 1, Stuttgart',         km: 13.2, lat1: 48.6900, lon1: 9.2200, lat2: 48.7800, lon2: 9.1750 },
  { from: 'Schloßplatz, Stuttgart',           to: 'Mercedes-Benz Museum',             km:  4.5, lat1: 48.7780, lon1: 9.1800, lat2: 48.7888, lon2: 9.2342 },
  { from: 'Musterstraße 1, Stuttgart',         to: 'IKEA Sindelfingen',                km: 23.1, lat1: 48.7800, lon1: 9.1750, lat2: 48.7280, lon2: 9.0030 },
];
const CHARGER_TYPES = ['AC', 'AC', 'AC', 'AC', 'Tesla', 'DC']; // Heim-AC dominiert
const TRIP_PURPOSES = [
  'Privatfahrt', 'Einkauf', 'Familie besuchen', 'Pendeln',
  'Sport-Training', 'Wochenendausflug',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function jitter(value, percent) {
  const delta = value * percent * (Math.random() * 2 - 1);
  return value + delta;
}

/** Legt ein Fake-Fahrzeug + ~3 Wochen Daten fuer einen Demo-User an. */
export function seedNewDemoUser(db, userId, username) {
  const now    = Math.floor(Date.now() / 1000);
  const startTs = now - 21 * 86400;

  // Eindeutige Fake-VIN, damit der globale vin_registry-Constraint
  // (siehe master.db) nicht in die Quere kommt. „DEMOKRSC" gefolgt von
  // 9 Zufalls-Alphanumerischen. „KRSC"-Marker = TeslaView-Originalsignatur.
  const vin = 'DEMOKRSC' + randomBytes(5).toString('hex').slice(0, 9).toUpperCase();

  const carName = `${username}-Otto`;
  const r = db.prepare(
    `INSERT INTO vehicles
       (tesla_id, vin, display_name, model, color, license_plate, image_color,
        category, electricity_rate_kwh, state_updated_at)
     VALUES (?, ?, ?, 'my', 'white', 'DEMO-1', 'PPSW', 'private', 0.30, ?)`
  ).run('demo-' + randomBytes(4).toString('hex'), vin, carName, now);
  const vehicleId = r.lastInsertRowid;

  // User dem Fahrzeug zuweisen → Fahrzeug-Wechsler im Frontend zeigt nur
  // seines, andere Tester sind isoliert.
  db.prepare('INSERT INTO vehicle_users (vehicle_id, user_id) VALUES (?, ?)')
    .run(vehicleId, userId);

  // Ein Heim-Ladeort fuer die Abrechnung — gibt der Demo Tiefe.
  const homeLoc = db.prepare(
    `INSERT INTO charging_locations
       (vehicle_id, name, address, type, rate_kwh, is_default, lat, lon, radius_m)
     VALUES (?, 'Zuhause', 'Musterstraße 1, Stuttgart', 'home', 0.30, 1, ?, ?, 200)`
  ).run(vehicleId, 48.7800, 9.1750);
  const homeLocId = homeLoc.lastInsertRowid;

  // Tagweise vergangene Fahrten generieren — 1–3 pro Tag, zufaellig
  // klassifiziert (~30% Dienst, ~50% Privat, ~20% Arbeitsweg).
  let odometer = 12_400; // Start-Kilometerstand
  const tripStmt = db.prepare(
    `INSERT INTO trips
       (vehicle_id, start_time, end_time, start_lat, start_lon, end_lat, end_lon,
        start_address, end_address, distance_km, energy_used_kwh,
        start_soc, end_soc, start_odometer_km, end_odometer_km,
        trip_type, purpose, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo')`
  );
  const chargeStmt = db.prepare(
    `INSERT INTO charging_sessions
       (vehicle_id, start_time, end_time, location_name, location_id, lat, lon,
        charger_type, start_soc, end_soc, energy_added_kwh, max_power_kw,
        billing_rate_kwh, billing_status, is_free, is_home_charged)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  );
  const batteryStmt = db.prepare(
    `INSERT INTO battery_snapshots
       (vehicle_id, timestamp, soc, rated_range_km, battery_level, usable_battery_level)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  let soc = 75;
  for (let day = 21; day >= 0; day--) {
    const tripsToday = 1 + Math.floor(Math.random() * 3); // 1–3
    const dayStart = startTs + (21 - day) * 86400 + 6 * 3600;
    let dayCursor = dayStart;
    for (let t = 0; t < tripsToday; t++) {
      const tpl = pick(TRIP_TEMPLATES);
      const km   = Math.round(jitter(tpl.km, 0.12) * 10) / 10;
      const durS = Math.max(300, Math.round(km / 50 * 3600 + Math.random() * 600));
      const startSoc = Math.max(15, Math.min(95, soc));
      const used = km / 100 * (15 + Math.random() * 4); // 15–19 kWh/100km
      const usedSoc = Math.max(1, Math.round(used / MODEL_Y_USABLE_KWH * 100));
      const endSoc = Math.max(10, startSoc - usedSoc);
      const tripType = Math.random() < 0.3 ? 'business'
                     : Math.random() < 0.3 ? 'commute'
                     : 'private';
      tripStmt.run(
        vehicleId, dayCursor, dayCursor + durS,
        tpl.lat1, tpl.lon1, tpl.lat2, tpl.lon2,
        tpl.from, tpl.to, km, Math.round(used * 100) / 100,
        startSoc, endSoc,
        Math.round(odometer), Math.round(odometer + km),
        tripType, pick(TRIP_PURPOSES),
      );
      odometer += km;
      soc = endSoc;
      dayCursor += durS + 600;
    }

    // Alle 2 Tage eine Heim-Ladung
    if (day % 2 === 0) {
      const chargeStart = startTs + (21 - day) * 86400 + 22 * 3600;
      const targetSoc = 80;
      if (soc < targetSoc) {
        const addedKwh = (targetSoc - soc) / 100 * MODEL_Y_USABLE_KWH;
        const durSec = Math.round(addedKwh / 7.4 * 3600); // ~7,4 kW AC
        chargeStmt.run(
          vehicleId, chargeStart, chargeStart + durSec,
          'Zuhause', homeLocId, 48.7800, 9.1750,
          pick(CHARGER_TYPES), soc, targetSoc,
          Math.round(addedKwh * 100) / 100, 7.4, 0.30, 'pending', 1,
        );
        soc = targetSoc;
      }
    }

    // Ein Battery-Snapshot pro Tag — fuer die Degradations-Anzeige.
    batteryStmt.run(
      vehicleId, dayStart, soc,
      Math.round((400 + Math.random() * 30) * 10) / 10,
      soc, soc,
    );
  }

  const vin2 = 'DEMO' + randomBytes(7).toString('hex').slice(0, 13).toUpperCase();
  const r2 = db.prepare("INSERT INTO vehicles (tesla_id, vin, display_name, model, color, license_plate, image_color, category, electricity_rate_kwh, company_name, state_updated_at) VALUES (?, ?, ?, 'm3', 'black', 'S-TC 2024', 'PMNG', 'company', 0.00, 'Musterwerk GmbH', ?)").run('demo-' + randomBytes(4).toString('hex'), vin2, 'Dienstwagen', now);
  const vehicleId2 = r2.lastInsertRowid;
  db.prepare('INSERT INTO vehicle_users (vehicle_id, user_id) VALUES (?, ?)').run(vehicleId2, userId);
  db.prepare("INSERT INTO charging_locations (vehicle_id, name, address, type, rate_kwh, is_default, lat, lon, radius_m) VALUES (?, 'Buero', 'Buerostrasse 1, Stuttgart', 'work', 0.00, 1, ?, ?, 200)").run(vehicleId2, 48.7774, 9.1800);

  // Seed initial business trips for company vehicle
  const bizTemplates = [{from:"Buerostr. 1, Stuttgart",to:"Bosch Gerlingen",km:18.2,lat1:48.7774,lon1:9.18,lat2:48.799,lon2:9.036},{from:"Buerostr. 1, Stuttgart",to:"Messe Stuttgart",km:14.8,lat1:48.7774,lon1:9.18,lat2:48.6978,lon2:9.2154},{from:"Buerostr. 1, Stuttgart",to:"Flughafen STR",km:13.5,lat1:48.7774,lon1:9.18,lat2:48.69,lon2:9.22}];
  let bizSoc = 80, bizOdo = 8400;
  for (let d = 14; d >= 0; d--) {
    const tp = bizTemplates[d % bizTemplates.length], km = Math.round(tp.km * (0.9 + Math.random()*0.2) * 10)/10;
    const dur = Math.max(300, Math.round(km/55*3600)), ts0 = startTs + (21-d)*86400 + 8*3600;
    const used = km/100*14.5, usedSoc = Math.max(1,Math.round(used/75*100)), endSoc = Math.max(10, bizSoc - usedSoc);
    tripStmt.run(vehicleId2, ts0, ts0+dur, tp.lat1, tp.lon1, tp.lat2, tp.lon2, tp.from, tp.to, km, Math.round(used*10)/10, bizSoc, endSoc, bizOdo, bizOdo+km, "business", "Kundentermin");
    bizOdo += km; bizSoc = endSoc < 30 ? 85 : endSoc;
  }

  return { vehicleId, vin };
}

/** Wird periodisch vom Scheduler aufgerufen: pro Demo-Mandant + pro
 *  Demo-Fahrzeug eine kleine Aktualisierung — eine kurze neue Fahrt
 *  und etwa jede 4. Iteration auch eine Ladesession.
 *
 *  Prepared Statements werden einmalig VOR der Schleife erstellt —
 *  nicht pro Iteration — damit kein unnötiger GC-Druck entsteht. */
export function tickDemoActivity(db) {
  const vehicles = db.prepare(
    "SELECT id, vin FROM vehicles WHERE vin LIKE 'DEMO%'"
  ).all();
  if (!vehicles.length) return 0;

  // Statements einmalig vorkompilieren (nicht in der Schleife)
  const stmtLastTrip = db.prepare(
    'SELECT MAX(end_time) AS ts, MAX(end_odometer_km) AS km, MAX(end_soc) AS soc FROM trips WHERE vehicle_id=?'
  );
  const stmtInsertTrip = db.prepare(
    `INSERT INTO trips
       (vehicle_id, start_time, end_time, start_lat, start_lon, end_lat, end_lon,
        start_address, end_address, distance_km, energy_used_kwh,
        start_soc, end_soc, start_odometer_km, end_odometer_km,
        trip_type, purpose, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo')`
  );
  const stmtUpdateVehicle = db.prepare(
    'UPDATE vehicles SET state_updated_at=? WHERE id=?'
  );

  const now = Math.floor(Date.now() / 1000);
  let touched = 0;
  for (const v of vehicles) {
    const last = stmtLastTrip.get(v.id) ?? {};
    const startSoc = last.soc ?? 70;
    const lastTs   = last.ts  ?? (now - 86400);
    if (now - lastTs < 25 * 60) continue; // <25 min seit letzter Fahrt → skip

    const tpl   = pick(TRIP_TEMPLATES);
    const km    = Math.round(jitter(tpl.km, 0.18) * 10) / 10;
    const used  = km / 100 * (15 + Math.random() * 4);
    const dur   = Math.max(360, Math.round(km / 50 * 3600 + Math.random() * 600));
    const endSoc = Math.max(15, startSoc - Math.round(used / MODEL_Y_USABLE_KWH * 100));
    const tripType = Math.random() < 0.3 ? 'business' : 'private';
    stmtInsertTrip.run(
      v.id, now - dur, now,
      tpl.lat1, tpl.lon1, tpl.lat2, tpl.lon2,
      tpl.from, tpl.to, km, Math.round(used * 100) / 100,
      startSoc, endSoc,
      Math.round(last.km ?? 12500),
      Math.round((last.km ?? 12500) + km),
      tripType, pick(TRIP_PURPOSES),
    );
    stmtUpdateVehicle.run(now, v.id);
    touched++;
  }
  return touched;
}

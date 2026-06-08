// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Reverse-Geocoding via Nominatim/OSM mit lokalem persistentem Cache.
 *
 * - Cache-Key: lat/lon auf 4 Dezimalstellen gerundet (~11 m). Damit reichen
 *   für die meisten realen Fahrzeug-Standorte ein bis zwei Lookups pro Ort,
 *   und neue Trips/Sessions vom selben Punkt holen die Adresse aus der DB.
 * - Nominatim-Public-Instance: max. 1 Request/Sekunde laut OSM-ToS. Wir
 *   serialisieren alle Calls über eine globale Promise-Queue.
 * - User-Agent-Pflicht laut OSM-ToS — ein eindeutiger Name + Kontakt.
 */

const NOMINATIM_BASE = process.env.NOMINATIM_BASE_URL
  || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.NOMINATIM_USER_AGENT
  || 'Tesla-Carview-Selfhost (https://github.com/KnevS/Tesla-Carview)';
const MIN_INTERVAL_MS = 1100; // 1 req/sec + Sicherheit
const TIMEOUT_MS = 8000;

const toKey = (n) => Math.round(n * 10000);   // 4 Nachkommastellen
const validCoord = (n) => Number.isFinite(n) && Math.abs(n) <= 180;

let _lastCallAt = 0;
let _chain = Promise.resolve();
async function throttle() {
  _chain = _chain.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - _lastCallAt));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _lastCallAt = Date.now();
  });
  return _chain;
}

/** Holt die Adresse zu (lat, lon) — erst aus dem DB-Cache, dann Nominatim. */
export async function reverseGeocode(db, lat, lon, { lang = 'de' } = {}) {
  if (!validCoord(lat) || !validCoord(lon)) return null;
  const latK = toKey(lat);
  const lonK = toKey(lon);

  const hit = db.prepare(
    'SELECT address FROM geocode_cache WHERE lat_key=? AND lon_key=?'
  ).get(latK, lonK);
  if (hit) return hit.address;

  await throttle();
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}`
      + `&format=json&zoom=18&addressdetails=0`
      + `&accept-language=${encodeURIComponent(lang)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const addr = data?.display_name;
    if (!addr) return null;
    db.prepare(
      'INSERT OR REPLACE INTO geocode_cache (lat_key, lon_key, address) VALUES (?, ?, ?)'
    ).run(latK, lonK, addr);
    return addr;
  } catch {
    return null;
  }
}

/**
 * Batch-Backfill für eine Tenant-DB. Holt fehlende Trip- und
 * Charging-Session-Adressen aus dem Cache oder via Nominatim.
 *
 * Beachtet das 1-req/s-ToS — bei vielen ungecachten Daten dauert das
 * entsprechend lange. Daher: max `limit` Lookups pro Aufruf (Standard 60).
 */
export async function backfillAddresses(db, { limit = 60, lang = 'de' } = {}) {
  let lookups = 0;
  let updated = 0;

  // 1. Trips: start_address + end_address fehlt, GPS vorhanden
  const tripStartCandidates = db.prepare(
    `SELECT id, start_lat as lat, start_lon as lon
     FROM trips
     WHERE start_lat IS NOT NULL AND start_lon IS NOT NULL
       AND (start_address IS NULL OR start_address = '')
     ORDER BY start_time DESC
     LIMIT ?`
  ).all(limit);
  for (const t of tripStartCandidates) {
    if (lookups >= limit) break;
    const addr = await reverseGeocode(db, t.lat, t.lon, { lang });
    lookups++;
    if (!addr) continue;
    db.prepare('UPDATE trips SET start_address=? WHERE id=?').run(addr, t.id);
    updated++;
  }

  const tripEndCandidates = db.prepare(
    `SELECT id, end_lat as lat, end_lon as lon
     FROM trips
     WHERE end_lat IS NOT NULL AND end_lon IS NOT NULL
       AND (end_address IS NULL OR end_address = '')
     ORDER BY end_time DESC
     LIMIT ?`
  ).all(limit);
  for (const t of tripEndCandidates) {
    if (lookups >= limit) break;
    const addr = await reverseGeocode(db, t.lat, t.lon, { lang });
    lookups++;
    if (!addr) continue;
    db.prepare('UPDATE trips SET end_address=? WHERE id=?').run(addr, t.id);
    updated++;
  }

  // 2. Charging-Sessions: location_name fehlt, GPS vorhanden
  const chargeCandidates = db.prepare(
    `SELECT id, lat, lon FROM charging_sessions
     WHERE lat IS NOT NULL AND lon IS NOT NULL
       AND (location_name IS NULL OR location_name = '')
     ORDER BY start_time DESC
     LIMIT ?`
  ).all(limit);
  for (const c of chargeCandidates) {
    if (lookups >= limit) break;
    const addr = await reverseGeocode(db, c.lat, c.lon, { lang });
    lookups++;
    if (!addr) continue;
    db.prepare('UPDATE charging_sessions SET location_name=? WHERE id=?').run(addr, c.id);
    updated++;
  }

  return { lookups, updated };
}

/** Backfill ein konkretes Trip (für Live-Hook nach OwnTracks-Trip-Close). */
export async function geocodeTrip(db, tripId, { lang = 'de' } = {}) {
  const t = db.prepare(
    'SELECT id, start_lat, start_lon, end_lat, end_lon, start_address, end_address FROM trips WHERE id=?'
  ).get(tripId);
  if (!t) return;
  if (!t.start_address && t.start_lat != null) {
    const a = await reverseGeocode(db, t.start_lat, t.start_lon, { lang });
    if (a) db.prepare('UPDATE trips SET start_address=? WHERE id=?').run(a, tripId);
  }
  if (!t.end_address && t.end_lat != null) {
    const a = await reverseGeocode(db, t.end_lat, t.end_lon, { lang });
    if (a) db.prepare('UPDATE trips SET end_address=? WHERE id=?').run(a, tripId);
  }
}

/** Backfill eine Charging-Session (für Live-Hook nach Insert). */
export async function geocodeCharge(db, sessionId, { lang = 'de' } = {}) {
  const c = db.prepare(
    'SELECT id, lat, lon, location_name FROM charging_sessions WHERE id=?'
  ).get(sessionId);
  if (!c || c.location_name || c.lat == null) return;
  const addr = await reverseGeocode(db, c.lat, c.lon, { lang });
  if (addr) db.prepare('UPDATE charging_sessions SET location_name=? WHERE id=?').run(addr, sessionId);
}

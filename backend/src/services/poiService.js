// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Phase 4 — POIs in der Nähe via OpenStreetMap Overpass-API.
 *
 * Datenquelle: overpass-api.de (kostenlos, OSM-Foundation, EU, kein
 * Account, kein API-Key). 0.0001°-Cache-Key (~11 m) und Cache-TTL von
 * 24 Stunden für POIs (stabile Daten, niedrige Last).
 *
 * Aufnahme-Kriterien:
 *   - rein lesend, keine Server-Last-Erhöhung durch Polling
 *   - Cache aggressiv (täglich neu reicht)
 *   - Fail-soft: bei API-Aus liefert der Service einfach `[]`
 *   - User-Agent gemäß Overpass-ToS
 */
import { createHash } from 'node:crypto';

const OVERPASS_BASE = process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter';
const USER_AGENT = process.env.OVERPASS_USER_AGENT
  || 'Tesla-Carview-Selfhost (https://github.com/KnevS/Tesla-Carview)';
const CACHE_TTL_S = 24 * 3600;
const TIMEOUT_MS = 15000;

const toKey = (n) => Math.round(n * 10000);

// Mapping unserer POI-Typen → Overpass-Filter
const TYPE_TO_OVERPASS = {
  cafe:        '[amenity=cafe]',
  restaurant:  '[amenity=restaurant]',
  fast_food:   '[amenity=fast_food]',
  bakery:      '[shop=bakery]',
  supermarket: '[shop=supermarket]',
  toilets:     '[amenity=toilets]',
  drinking_water: '[amenity=drinking_water]',
  playground:  '[leisure=playground]',
  park:        '[leisure=park]',
  bench:       '[amenity=bench]',
  atm:         '[amenity=atm]',
  pharmacy:    '[amenity=pharmacy]',
  geocache:    '[leisure=geocache]',
  picnic:      '[leisure=picnic_table]',
  viewpoint:   '[tourism=viewpoint]',
};
export const POI_TYPES = Object.keys(TYPE_TO_OVERPASS);

function buildQuery(lat, lon, radiusM, types) {
  const filters = types
    .filter(t => TYPE_TO_OVERPASS[t])
    .map(t => `nwr(around:${radiusM},${lat},${lon})${TYPE_TO_OVERPASS[t]};`)
    .join('\n  ');
  return `[out:json][timeout:10];\n(\n  ${filters}\n);\nout center tags 60;`;
}

function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function elementToPoi(el, lat, lon) {
  const elat = el.lat ?? el.center?.lat;
  const elon = el.lon ?? el.center?.lon;
  if (elat == null || elon == null) return null;
  const tags = el.tags || {};
  const type = Object.keys(TYPE_TO_OVERPASS).find(t => {
    const filter = TYPE_TO_OVERPASS[t]; // e.g. [amenity=cafe]
    const m = filter.match(/\[(\w+)=(\w+)\]/);
    if (!m) return false;
    return tags[m[1]] === m[2];
  });
  return {
    id: `${el.type}/${el.id}`,
    type: type || 'other',
    name: tags.name || tags['name:de'] || tags['name:en'] || null,
    lat: elat,
    lon: elon,
    distance_m: distanceM(lat, lon, elat, elon),
    address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
      .filter(Boolean).join(' ') || null,
    opening_hours: tags.opening_hours || null,
    website: tags.website || tags['contact:website'] || null,
    wheelchair: tags.wheelchair || null,
  };
}

export async function getNearbyPOIs(db, { lat, lon, radius = 1500, types }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  const reqTypes = Array.isArray(types) && types.length
    ? types.filter(t => TYPE_TO_OVERPASS[t])
    : POI_TYPES;
  if (!reqTypes.length) return [];

  const latK = toKey(lat);
  const lonK = toKey(lon);
  const typesKey = createHash('sha1').update(reqTypes.slice().sort().join(',')).digest('hex').slice(0, 16);
  const now = Math.floor(Date.now() / 1000);

  // Cache-Hit innerhalb TTL
  const hit = db.prepare(
    `SELECT pois_json, fetched_at FROM poi_cache
     WHERE lat_key=? AND lon_key=? AND radius_m=? AND types_key=?`
  ).get(latK, lonK, radius, typesKey);
  if (hit && (now - hit.fetched_at) < CACHE_TTL_S) {
    try {
      return JSON.parse(hit.pois_json);
    } catch { /* fall through */ }
  }

  // Overpass-Call
  const query = buildQuery(lat, lon, radius, reqTypes);
  try {
    const r = await fetch(OVERPASS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': USER_AGENT },
      body: query,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) {
      // Fallback: alten Cache zurückgeben falls vorhanden (auch wenn abgelaufen)
      if (hit) try { return JSON.parse(hit.pois_json); } catch { /* */ }
      return [];
    }
    const data = await r.json();
    const pois = (data.elements || [])
      .map(el => elementToPoi(el, lat, lon))
      .filter(Boolean)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 200);

    db.prepare(
      `INSERT INTO poi_cache (lat_key, lon_key, radius_m, types_key, pois_json, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(lat_key, lon_key, radius_m, types_key)
       DO UPDATE SET pois_json=excluded.pois_json, fetched_at=excluded.fetched_at`
    ).run(latK, lonK, radius, typesKey, JSON.stringify(pois), now);

    return pois;
  } catch {
    if (hit) try { return JSON.parse(hit.pois_json); } catch { /* */ }
    return [];
  }
}

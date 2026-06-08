// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Geofence-Auto-Klassifikation fuer Trips.
 *
 * Regeln (so wie sich das fuer BMF-konformes Fahrtenbuch lohnt):
 *   - Start UND Ziel in home-Geofence       → private
 *   - Start in home  + Ziel in work         → commute (Arbeitsweg)
 *   - Start in work  + Ziel in home         → commute
 *   - Start in work  + Ziel in work         → business
 *   - sonst (irgendeiner liegt in 'other'-Geofence, oder gar keiner) → unklassifiziert
 *
 * Wird in dataSync.js beim Trip-Abschluss aufgerufen. Schreibt NUR,
 * wenn trip.trip_type aktuell null/private (Default) ist — sonst hat
 * der User schon manuell klassifiziert und wir wollen ihn nicht
 * ueberstimmen.
 *
 * Haversine fuer Distanz-Berechnung — Kreisradius reicht, kein
 * Polygon-Test noetig fuer den self-hosting Use-Case.
 */

const EARTH_R = 6_371_000; // m

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
          * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

/** Liefert den ersten Geofence, in dessen Radius (lat,lon) liegt — oder null. */
function findFence(geofences, lat, lon) {
  if (lat == null || lon == null) return null;
  for (const g of geofences) {
    if (haversine(g.lat, g.lon, lat, lon) <= (g.radius_m || 200)) return g;
  }
  return null;
}

/** Hauptklassifikator. Liefert string|null.
 *  Nicht null → Aufrufer schreibt trip_type. */
export function classifyTrip(db, trip) {
  const geofences = db.prepare(
    'SELECT * FROM geofences WHERE vehicle_id = ? OR vehicle_id IS NULL'
  ).all(trip.vehicle_id);
  if (!geofences.length) return null;

  const startFence = findFence(geofences, trip.start_lat, trip.start_lon);
  const endFence   = findFence(geofences, trip.end_lat,   trip.end_lon);

  // Erst spezifischere Match-Reihenfolge, dann generischere.
  const sk = startFence?.kind;
  const ek = endFence?.kind;

  if (sk === 'home' && ek === 'home') return 'private';
  if ((sk === 'home' && ek === 'work') || (sk === 'work' && ek === 'home')) return 'commute';
  if (sk === 'work' && ek === 'work') return 'business';
  // 'other' wird aktuell nicht eindeutig geroutet — Operator kann das
  // spaeter ueber das UI vom Hand setzen.
  return null;
}

/** Convenience-Wrapper: setzt trip_type, wenn der Trip noch
 *  unklassifiziert ist (private Default) UND ein eindeutiger Match
 *  besteht. Wird in dataSync.js beim Trip-Abschluss aufgerufen. */
export function maybeAutoClassify(db, tripId) {
  const t = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  if (!t || t.locked_at) return;
  // Nur klassifizieren, wenn noch nicht manuell gesetzt (Heuristik:
  // trip_type='private' und purpose IS NULL = wahrscheinlich Default).
  if (t.trip_type && t.trip_type !== 'private') return;
  if (t.purpose) return;

  const kind = classifyTrip(db, t);
  if (!kind || kind === t.trip_type) return;
  db.prepare('UPDATE trips SET trip_type = ? WHERE id = ?').run(kind, tripId);
}

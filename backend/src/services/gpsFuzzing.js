/**
 * GPS-Fuzzing-Modus pro Mandant.
 *
 * Liefert eine gerundete Variante eines Koordinaten-Paares zurueck, sofern
 * der Tenant die Funktion in tenant_settings aktiviert hat. Ziel ist
 * Schutz der Wohnort-Genauigkeit fuer Trip-Start/Ende, wenn mehrere Fahrer
 * denselben Mandanten teilen oder Trip-Daten exportiert werden.
 *
 * Wichtig: telemetry_points + trip_points werden NICHT gefuzzt — das
 * wuerde die GPS-Track-Anzeige (Karten, Heatmap) zerschiessen. Nur die
 * aggregierten Trip-Start- und Trip-Ende-Koordinaten gehen durch diese
 * Funktion.
 *
 * Mathematik:
 *   1 Breitengrad   ≈ 111 km
 *   1 Laengengrad   ≈ 111 km * cos(lat) → schrumpft Richtung Pol
 *   Wir runden auf Vielfache des Radius (in Grad), so dass das Ergebnis
 *   auf ein quasi-Grid faellt — Nachbar-Punkte landen exakt auf derselben
 *   Gitter-Koordinate, was die Verfremdung deterministisch macht.
 */

/** Liefert die fuzzed Coords falls aktiv, sonst die Originale.
 *  Defensive: laesst null/undefined unveraendert, damit Aufrufer
 *  unbesorgt durchschleifen koennen. */
export function maybeFuzz(db, lat, lon) {
  if (lat == null || lon == null) return { lat, lon };
  let enabled;
  try {
    enabled = db.prepare(
      "SELECT value FROM tenant_settings WHERE key='gps_fuzzing_enabled'"
    ).get();
  } catch {
    return { lat, lon };
  }
  if (!enabled || enabled.value !== '1') return { lat, lon };

  const r = db.prepare(
    "SELECT value FROM tenant_settings WHERE key='gps_fuzzing_radius_m'"
  ).get();
  const radius = Math.max(50, parseInt(r?.value, 10) || 200);

  // 200 m Radius ≈ 0.0018° Breite. Die Laengengrad-Skala wird mit
  // cos(lat) skaliert, um in mittleren Breiten ein realistisches Gitter
  // zu bekommen — am Aequator (cos=1) ist stepLon == stepLat, am Pol
  // wird stepLon gross (faellt aber nicht durch /0, weil wir lat<90
  // praktisch immer haben).
  const stepLat = radius / 111_000;
  const cosLat  = Math.cos(lat * Math.PI / 180);
  const stepLon = radius / (111_000 * Math.max(0.0001, Math.abs(cosLat)));

  return {
    lat: Math.round(lat / stepLat) * stepLat,
    lon: Math.round(lon / stepLon) * stepLon,
  };
}

/** Liest die aktuellen Tenant-Settings als {enabled, radius_m}. Wird
 *  vom Settings-Endpoint und vom Frontend (Settings-Card) benutzt. */
export function getFuzzingConfig(db) {
  const e = db.prepare(
    "SELECT value FROM tenant_settings WHERE key='gps_fuzzing_enabled'"
  ).get();
  const r = db.prepare(
    "SELECT value FROM tenant_settings WHERE key='gps_fuzzing_radius_m'"
  ).get();
  return {
    enabled: e?.value === '1',
    radius_m: Math.max(50, parseInt(r?.value, 10) || 200),
  };
}

/** Schreibt die Tenant-Settings. Aufrufer pruefen Admin-Rechte. */
export function setFuzzingConfig(db, { enabled, radius_m }) {
  const upsert = db.prepare(
    `INSERT INTO tenant_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  upsert.run('gps_fuzzing_enabled',  enabled ? '1' : '0');
  upsert.run('gps_fuzzing_radius_m', String(radius_m));
}

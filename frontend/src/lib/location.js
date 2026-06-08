/**
 * Zentrale Helper für die Anzeige von Orten.
 *
 * Adresse hat IMMER Vorrang vor Koordinaten. Wenn weder noch da ist,
 * gibt's einen sauberen Fallback-String. Koordinaten werden auf 4
 * Dezimalstellen formatiert (~11 m Genauigkeit), reicht für Anzeige.
 *
 * Verwendung:
 *   <span>{{ formatLocation({ address: t.start_address, lat: t.start_lat, lon: t.start_lon }) }}</span>
 *   <span :title="coordTooltip(t.start_lat, t.start_lon)">…</span>
 */

const COORD_DECIMALS = 4;

export function formatCoords(lat, lon) {
  if (lat == null || lon == null || isNaN(+lat) || isNaN(+lon)) return null;
  return `${(+lat).toFixed(COORD_DECIMALS)}, ${(+lon).toFixed(COORD_DECIMALS)}`;
}

/**
 * Gibt die beste verfügbare Repräsentation des Ortes zurück.
 *
 * @param {object} opts
 * @param {?string} opts.address  Adresse oder Locationname (bevorzugt)
 * @param {?number} opts.lat
 * @param {?number} opts.lon
 * @param {?string} opts.fallback Was zurückgegeben werden soll wenn nichts da ist
 */
export function formatLocation({ address, lat, lon, fallback = '–' } = {}) {
  if (address && String(address).trim()) return String(address).trim();
  const c = formatCoords(lat, lon);
  return c || fallback;
}

/** Tooltip-Text mit Koordinaten falls vorhanden — sonst leerer String (kein Tooltip). */
export function coordTooltip(lat, lon) {
  return formatCoords(lat, lon) || '';
}

/** Hat dieser Ort eine echte Adresse? (z.B. zum Steuern von Buttons) */
export function hasAddress(address) {
  return !!(address && String(address).trim());
}

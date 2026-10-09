// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Zeitzonen-Helfer fuer Auswertungen mit Tages-/Jahresgrenzen in der
 * Zeitzone des Betrachters (Browser schickt `tz`).
 */

/** Unix-Zeit von Mitternacht des Tages `key` (YYYY-MM-DD) in der Zeitzone `tz`. */
export function localMidnight(key, tz) {
  const [y, m, d] = key.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d) / 1000;
  // Versatz der Zone zu UTC an diesem Tag bestimmen (beruecksichtigt Sommerzeit).
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(guess * 1000));
  const p = Object.fromEntries(parts.map(x => [x.type, Number(x.value)]));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) / 1000;
  return guess - (asUtc - guess);
}

/** IANA-Zeitzone aus einer Anfrage pruefen; Unbekanntes faellt auf UTC. */
export function validTimeZone(tz) {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'UTC'; }
}

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
//
// Persönliches Verbrauchsmodell — REINE STATISTIK, KEINE KI.
//
// Aus der Trip-Historie (kWh/100 km je Fahrt) wird der erwartete Verbrauch
// geschätzt. Wenn eine Zieltemperatur bekannt ist, zieht das Modell nur Fahrten
// aus einem Temperaturfenster (±7 °C) heran — so wird der bekannte Mehrverbrauch
// bei Kälte/Hitze datengetrieben abgebildet, ohne eine Kurvenform anzunehmen.
// Das Unsicherheitsband ist die Streuung der einzelnen Fahrten (nicht der
// Standardfehler des Mittels), weil es eine EINZELNE künftige Fahrt einschätzt.

const TEMP_WINDOW = 7;   // °C um die Zieltemperatur
const MIN_NEAR    = 5;   // Mindest-Fahrten im Fenster für eine temperatur-spezifische Schätzung
const MIN_TOTAL   = 5;   // Mindest-Fahrten insgesamt für eine überhaupt sinnvolle Schätzung

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const stddev = (a) => {
  if (a.length < 2) return 0;
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - mean) ** 2, 0) / (a.length - 1));
};
const round = (v, d = 1) => v == null ? null : Math.round(v * 10 ** d) / 10 ** d;

const confidenceFor = (n) => n >= 30 ? 90 : n >= 15 ? 80 : n >= 8 ? 70 : 60;

/**
 * @param {Array} trips  [{distance_km, energy_used_kwh, outside_temp_avg_c}]
 * @param {number|null} tempC  Zieltemperatur (z. B. Ziel-Wetter) oder null
 * @returns {object|null} Schätzung oder null bei zu wenig Daten
 */
export function estimateConsumption(trips, tempC = null) {
  const rows = (trips || [])
    .filter(t => t.distance_km > 2 && t.energy_used_kwh > 0)
    .map(t => ({ kwh: (t.energy_used_kwh / t.distance_km) * 100, temp: t.outside_temp_avg_c }));
  if (rows.length < MIN_TOTAL) return null;

  let pool = null, basis = 'overall';
  if (tempC != null && Number.isFinite(tempC)) {
    const near = rows.filter(r => r.temp != null && Math.abs(r.temp - tempC) <= TEMP_WINDOW).map(r => r.kwh);
    if (near.length >= MIN_NEAR) { pool = near; basis = 'temp'; }
  }
  if (!pool) pool = rows.map(r => r.kwh);

  const point = median(pool);
  const sd = stddev(pool);
  const n = pool.length;
  // Band: Streuung einzelner Fahrten, mindestens ±5 % (vermeidet trügerische Genauigkeit)
  const half = Math.max(sd, point * 0.05);

  return {
    kwh_per_100km: round(point, 1),
    kwh_lower: round(Math.max(0, point - half), 1),
    kwh_upper: round(point + half, 1),
    basis,                       // 'temp' = temperatur-spezifisch, 'overall' = Gesamtschnitt
    temp_c: basis === 'temp' ? round(tempC, 0) : null,
    confidence_pct: confidenceFor(n),
    sample_count: n,
  };
}

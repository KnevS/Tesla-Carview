// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Winter-Auswertung — was Kaelte beim eigenen Auto tatsaechlich kostet.
 *
 * Reine Statistik ueber die eigene Fahrthistorie, keine Annahme einer
 * Kurvenform:
 *  - Verbrauch nach Temperatur in 5-°C-Stufen (Median je Stufe),
 *  - Referenz = Median der Fahrten bei 15–25 °C (dem Bereich, in dem ein
 *    E-Auto praktisch weder heizt noch kuehlt),
 *  - Kaelte-Aufschlag einer Fahrt = ihr Verbrauch gegen diese Referenz,
 *  - Frost-Reichweite der naechsten Tage aus der Wettervorhersage und dem
 *    eigenen Verbrauch bei aehnlicher Temperatur (consumptionModel).
 *
 * Kurzstrecken unter 2 km bleiben draussen: Dort dominiert die Heizenergie
 * fuer den Innenraum, der Wert pro 100 km waere eine Hochrechnung auf eine
 * Strecke, die nie gefahren wurde.
 */
import { estimateConsumption } from './consumptionModel.js';

export const BASE_MIN_C = 15;
export const BASE_MAX_C = 25;
const BUCKET_C        = 5;
const MIN_BUCKET_TRIPS = 3;
const MIN_BASE_TRIPS   = 5;
const MIN_DISTANCE_KM  = 2;

const round1 = v => Math.round(v * 10) / 10;

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const efficiency = t => t.energy_used_kwh / t.distance_km * 100;
const usable = t => t.distance_km > MIN_DISTANCE_KM && t.energy_used_kwh > 0 && t.outside_temp_avg_c != null
  // Ausreisser (Messfehler, Vorklimatisierung auf kurzer Strecke) begrenzen.
  && efficiency(t) > 5 && efficiency(t) < 60;

/** Median-Verbrauch bei 15–25 °C oder null bei zu wenig Fahrten. */
export function baselineKwh100(trips) {
  const base = trips.filter(t => usable(t) && t.outside_temp_avg_c >= BASE_MIN_C && t.outside_temp_avg_c <= BASE_MAX_C);
  if (base.length < MIN_BASE_TRIPS) return null;
  return { kwh_100km: round1(median(base.map(efficiency))), trips: base.length };
}

/** Mehrverbrauch einer Fahrt gegen die Referenz in %, nur unter 15 °C. */
export function coldSurcharge(trip, baseline) {
  if (!baseline || !usable(trip) || trip.outside_temp_avg_c >= BASE_MIN_C) return null;
  return {
    pct: Math.round((efficiency(trip) / baseline.kwh_100km - 1) * 100),
    temp_c: round1(trip.outside_temp_avg_c),
    kwh_100km: round1(efficiency(trip)),
    baseline_kwh_100km: baseline.kwh_100km,
  };
}

/** Verbrauch je 5-°C-Stufe. */
export function temperatureCurve(trips, baseline) {
  const buckets = new Map();
  for (const t of trips) {
    if (!usable(t)) continue;
    const from = Math.floor(t.outside_temp_avg_c / BUCKET_C) * BUCKET_C;
    if (!buckets.has(from)) buckets.set(from, { eff: [], km: 0 });
    const b = buckets.get(from);
    b.eff.push(efficiency(t));
    b.km += t.distance_km;
  }
  return [...buckets.entries()]
    .filter(([, b]) => b.eff.length >= MIN_BUCKET_TRIPS)
    .sort((a, b) => a[0] - b[0])
    .map(([from, b]) => {
      const kwh = median(b.eff);
      return {
        from_c: from, to_c: from + BUCKET_C,
        kwh_100km: round1(kwh),
        trips: b.eff.length,
        km: Math.round(b.km),
        vs_baseline_pct: baseline ? Math.round((kwh / baseline.kwh_100km - 1) * 100) : null,
      };
    });
}

/**
 * Reichweite der naechsten Tage.
 * @param {Array<{date:string, tmin:number, tmax:number}>} days Vorhersage
 */
export function frostRange(trips, days, { batteryKwh, socPct = null, baseline = null }) {
  return days.map(d => {
    // Tagesmittel aus Min/Max — fuer den Verbrauch zaehlt die Temperatur
    // waehrend der Fahrten, nicht das naechtliche Minimum.
    const tMean = (d.tmin + d.tmax) / 2;
    const est = estimateConsumption(trips.filter(usable), tMean);
    if (!est) return { date: d.date, tmin: d.tmin, tmax: d.tmax, kwh_100km: null, range_full_km: null, range_now_km: null };
    const full = batteryKwh / est.kwh_per_100km * 100;
    return {
      date: d.date,
      tmin: round1(d.tmin), tmax: round1(d.tmax),
      kwh_100km: est.kwh_per_100km,
      basis: est.basis,
      range_full_km: Math.round(full),
      range_now_km: socPct != null ? Math.round(full * socPct / 100) : null,
      vs_baseline_pct: baseline ? Math.round((est.kwh_per_100km / baseline.kwh_100km - 1) * 100) : null,
    };
  });
}

/** Gesamtauswertung fuer die Winter-Ansicht. */
export function analyzeWinter(trips, { forecastDays = [], batteryKwh = 75, socPct = null } = {}) {
  const withTemp = trips.filter(t => t.outside_temp_avg_c != null);
  const baseline = baselineKwh100(trips);
  const curve    = temperatureCurve(trips, baseline);
  const recentCold = trips
    .filter(t => coldSurcharge(t, baseline))
    .sort((a, b) => b.start_time - a.start_time)
    .slice(0, 15)
    .map(t => ({ id: t.id, start_time: t.start_time, distance_km: round1(t.distance_km), ...coldSurcharge(t, baseline) }));

  const coldest = curve[0];
  const fromVehicle = withTemp.filter(t => !t.outside_temp_source).length;
  return {
    coverage: {
      trips_total: trips.length,
      trips_with_temp: withTemp.length,
      from_vehicle: fromVehicle,
      from_weather: withTemp.filter(t => t.outside_temp_source === 'weather').length,
    },
    baseline,
    curve,
    // Grosser Aufschlag in der kaeltesten Stufe, die belegt ist.
    coldest_bucket: coldest && coldest.from_c < BASE_MIN_C ? coldest : null,
    recent_cold_trips: recentCold,
    forecast: frostRange(trips, forecastDays, { batteryKwh, socPct, baseline }),
  };
}

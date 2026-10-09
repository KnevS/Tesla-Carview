// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Jahresrueckblick — das Fahrzeugjahr in Zahlen.
 *
 * Reine Aggregation ueber Fahrten und Ladungen eines Kalenderjahres (in der
 * Zeitzone des Betrachters). Keine Orte im Ergebnis ausser den selbst
 * gepflegten Ladeort-Namen — die teilbare Karte im Frontend zeigt nur
 * Zahlen.
 *
 * Datenehrlichkeit: Nicht jede Fahrt traegt einen Energiewert (GPS-Fahrten,
 * Kurzfahrten vor v3.57.4). Verbrauch und CO₂ werden deshalb aus dem
 * energiegewichteten Durchschnitt der Fahrten MIT Energiewert auf die
 * Gesamtstrecke hochgerechnet und als hochgerechnet gekennzeichnet —
 * Fahrten ohne Wert als 0 kWh zu zaehlen, saehe nach einem
 * Phantom-Sparauto aus.
 */

// Gleiche Faktoren wie die CO₂-Bilanz (routes/co2.js).
const GRID_CO2_G_PER_KWH = 363;
const ICE_CO2_G_PER_KM   = (6.5 / 100) * 2370;
const EARTH_KM = 40075;
const MOON_KM  = 384400;
const MIN_MONTH_KM_FOR_EFFICIENCY = 100;

const round1 = v => Math.round(v * 10) / 10;


/**
 * @param {object} p
 * @param {Array}  p.trips    [{start_time, end_time, distance_km, energy_used_kwh, outside_temp_avg_c}]
 * @param {Array}  p.charges  [{start_time, energy_added_kwh, cost, is_free, is_home, location_name, charger_type}]
 * @param {number} p.year
 * @param {string} p.tz
 * @param {boolean} p.complete  ob das Jahr bereits abgeschlossen ist
 */
export function buildYearReview({ trips = [], charges = [], year, tz = 'UTC', complete = false }) {
  const monthFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' });
  const monthOf  = ts => Number(monthFmt.format(new Date(ts * 1000)).slice(5, 7));
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, km: 0, trips: 0, kwh: 0, km_with_energy: 0 }));

  let km = 0, driveS = 0, kmWithEnergy = 0, kwhDriven = 0;
  let longest = null, coldest = null;
  const days = new Set();
  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });

  for (const t of trips) {
    const d = t.distance_km ?? 0;
    if (d <= 0) continue;
    km += d;
    if (t.end_time && t.end_time > t.start_time) driveS += t.end_time - t.start_time;
    const m = months[monthOf(t.start_time) - 1];
    m.km += d; m.trips += 1;
    if (t.energy_used_kwh > 0) {
      kmWithEnergy += d; kwhDriven += t.energy_used_kwh;
      m.kwh += t.energy_used_kwh; m.km_with_energy += d;
    }
    days.add(dayKey.format(new Date(t.start_time * 1000)));
    if (!longest || d > longest.distance_km) longest = { distance_km: round1(d), start_time: t.start_time };
    if (t.outside_temp_avg_c != null && (!coldest || t.outside_temp_avg_c < coldest.temp_c)) {
      coldest = { temp_c: round1(t.outside_temp_avg_c), start_time: t.start_time, distance_km: round1(d) };
    }
  }

  const tripCount = trips.filter(t => (t.distance_km ?? 0) > 0).length;
  const kwh100 = kmWithEnergy > 0 ? kwhDriven / kmWithEnergy * 100 : null;
  const kwhEstimated = kwh100 != null ? kwh100 * km / 100 : null;
  const energyCoverage = km > 0 ? kmWithEnergy / km : 0;

  // CO₂: Strom mit dem hochgerechneten Verbrauch, Verbrenner mit Referenzwert.
  const co2Ev  = kwhEstimated != null ? kwhEstimated * GRID_CO2_G_PER_KWH / 1000 : null;
  const co2Ice = km * ICE_CO2_G_PER_KM / 1000;
  const co2Saved = co2Ev != null ? Math.max(0, co2Ice - co2Ev) : null;

  // Effizientester Monat: niedrigster Verbrauch bei genug Strecke mit Energiewert.
  const effMonths = months
    .filter(m => m.km_with_energy >= MIN_MONTH_KM_FOR_EFFICIENCY)
    .map(m => ({ month: m.month, kwh_100km: round1(m.kwh / m.km_with_energy * 100) }));
  const bestMonth = effMonths.length ? effMonths.reduce((a, b) => (b.kwh_100km < a.kwh_100km ? b : a)) : null;
  const busiest = months.reduce((a, b) => (b.km > a.km ? b : a));

  // ── Laden ─────────────────────────────────────────────────────────────
  let chargedKwh = 0, homeKwh = 0, cost = 0, pricedKwh = 0, dcCount = 0;
  const byLoc = new Map();
  let cheapest = null;
  for (const c of charges) {
    const k = c.energy_added_kwh ?? 0;
    if (k <= 0) continue;
    chargedKwh += k;
    if (c.is_home) homeKwh += k;
    if (c.charger_type && /supercharger|dc/i.test(c.charger_type)) dcCount++;
    const priced = c.is_free === 1 || (c.cost != null && c.cost >= 0);
    if (priced) {
      const cc = c.is_free === 1 ? 0 : c.cost;
      cost += cc; pricedKwh += k;
      // Guenstigste bezahlte Ladung ab 5 kWh (geschenkte zaehlen nicht als „Preis").
      if (c.is_free !== 1 && k >= 5) {
        const p = cc / k;
        if (!cheapest || p < cheapest.price_kwh) cheapest = { price_kwh: Math.round(p * 1000) / 1000, location_name: c.location_name || null };
      }
    }
    const key = c.location_name || null;
    if (key) byLoc.set(key, (byLoc.get(key) ?? 0) + 1);
  }
  const favorite = [...byLoc.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    year,
    complete,
    driving: {
      km: Math.round(km),
      trips: tripCount,
      driving_hours: Math.round(driveS / 3600),
      days_driven: days.size,
      longest_trip: longest,
      coldest_trip: coldest,
      busiest_month: busiest.km > 0 ? { month: busiest.month, km: Math.round(busiest.km) } : null,
      best_efficiency_month: bestMonth,
      earth_laps: round1(km / EARTH_KM),
      moon_share_pct: round1(km / MOON_KM * 100),
    },
    energy: {
      kwh_100km: kwh100 != null ? round1(kwh100) : null,
      kwh_driven: kwhEstimated != null ? Math.round(kwhEstimated) : null,
      // Anteil der Strecke mit gemessenem Energiewert — darunter ist hochgerechnet.
      coverage: Math.round(energyCoverage * 100) / 100,
      co2_saved_kg: co2Saved != null ? Math.round(co2Saved) : null,
      trees_equivalent: co2Saved != null ? Math.round(co2Saved / 10) : null,
    },
    charging: {
      sessions: charges.filter(c => (c.energy_added_kwh ?? 0) > 0).length,
      kwh: Math.round(chargedKwh),
      home_share_pct: chargedKwh > 0 ? Math.round(homeKwh / chargedKwh * 100) : null,
      cost: pricedKwh > 0 ? Math.round(cost) : null,
      cost_coverage: chargedKwh > 0 ? Math.round(pricedKwh / chargedKwh * 100) / 100 : null,
      avg_price_kwh: pricedKwh > 0 ? Math.round(cost / pricedKwh * 1000) / 1000 : null,
      dc_sessions: dcCount,
      cheapest,
      favorite_location: favorite ? { name: favorite[0], sessions: favorite[1] } : null,
    },
    months: months.map(m => ({ month: m.month, km: Math.round(m.km), trips: m.trips })),
  };
}

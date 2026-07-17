// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Strompreis-Service fuer dynamische Tarife.
 *
 * Unterstuetzt zwei Anbieter:
 *  - aWattar (DE/AT) — Spotmarkt-Preise, OEFFENTLICH, kein Token
 *  - Tibber (DE/SE/NO/NL/...) — GraphQL, USER-TOKEN noetig
 *
 * Antwort-Format vereinheitlicht:
 *   [{ start: unix_seconds, end: unix_seconds, ct_per_kwh: number }, ...]
 *
 * Caching: in-memory pro Mandant, TTL 30 Minuten. Preise aktualisieren
 * sich bei beiden Anbietern frueh-nachmittags fuer den naechsten Tag,
 * eine 30-Min-Cache reicht voellig.
 */

import axios from 'axios';

const CACHE = new Map(); // key = tenantId → { fetched_at, provider, prices }
const CACHE_TTL_MS = 30 * 60 * 1000;

// aWattar — Spotmarktpreise im EUR/MWh-Format. Wir rechnen auf ct/kWh
// um (÷ 10) und addieren optional einen Aufschlag fuer Steuern/Netz/
// Vertrieb. Ohne Aufschlag spiegelt der Wert reine EPEX-Spot-Preise,
// was fuer „Lade-Fenster finden" voellig ausreicht.
async function fetchAwattar({ country = 'de', surcharge_ct = 0 } = {}) {
  const host = country === 'at' ? 'api.awattar.at' : 'api.awattar.de';
  const { data } = await axios.get(`https://${host}/v1/marketdata`, { timeout: 10_000 });
  const rows = data?.data ?? [];
  return rows.map(r => ({
    start: Math.floor(r.start_timestamp / 1000),
    end:   Math.floor(r.end_timestamp / 1000),
    // aWattar liefert EUR/MWh → /10 = ct/kWh.
    ct_per_kwh: Math.round((r.marketprice / 10 + (surcharge_ct ?? 0)) * 100) / 100,
  }));
}

// Tibber — GraphQL „today + tomorrow"-Abfrage. Tomorrow ist bis ~13:00
// noch nicht verfuegbar; wir liefern dann nur den aktuellen Tag zurueck.
async function fetchTibber({ token }) {
  if (!token) throw new Error('Tibber: kein API-Token konfiguriert');
  const query = `{
    viewer { homes { currentSubscription { priceInfo {
      today    { startsAt total }
      tomorrow { startsAt total }
    } } } }
  }`;
  const { data } = await axios.post('https://api.tibber.com/v1-beta/gql',
    { query },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000 });
  const home = data?.data?.viewer?.homes?.[0];
  if (!home) throw new Error('Tibber: kein Home im Account');
  const { today = [], tomorrow = [] } = home.currentSubscription?.priceInfo ?? {};
  return [...today, ...tomorrow].map(p => {
    const start = Math.floor(new Date(p.startsAt).getTime() / 1000);
    return {
      start,
      end:   start + 3600,
      // Tibber liefert EUR/kWh inkl. aller Steuern → ×100 = ct/kWh.
      ct_per_kwh: Math.round(p.total * 100 * 100) / 100,
    };
  });
}

/** Public API: holt Preise gemaess Mandanten-Konfig, ggf. aus Cache. */
export async function getPrices(tenantId, config) {
  const cached = CACHE.get(tenantId);
  if (cached && Date.now() - cached.fetched_at < CACHE_TTL_MS
      && cached.provider === config.provider) {
    return cached.prices;
  }
  let prices = [];
  if (config.provider === 'awattar') {
    prices = await fetchAwattar({ country: config.country, surcharge_ct: config.surcharge_ct });
  } else if (config.provider === 'tibber') {
    prices = await fetchTibber({ token: config.token });
  } else {
    return [];
  }
  CACHE.set(tenantId, { fetched_at: Date.now(), provider: config.provider, prices });
  return prices;
}

/** Aktueller Stundenpreis — null falls keine Daten vorhanden. */
export function currentPrice(prices) {
  const now = Math.floor(Date.now() / 1000);
  return prices.find(p => p.start <= now && now < p.end) ?? null;
}

/** Findet das billigste zusammenhaengende Fenster der Laenge N Stunden in
 *  den naechsten 24 h. Gibt das Fenster + Durchschnittspreis zurueck. */
export function bestWindow(prices, hours = 4) {
  const now = Math.floor(Date.now() / 1000);
  const future = prices.filter(p => p.end > now);
  if (future.length < hours) return null;
  let best = null;
  for (let i = 0; i + hours <= future.length; i++) {
    const slice = future.slice(i, i + hours);
    const avg = slice.reduce((s, p) => s + p.ct_per_kwh, 0) / hours;
    if (!best || avg < best.avg_ct_per_kwh) {
      best = {
        start: slice[0].start,
        end:   slice[slice.length - 1].end,
        avg_ct_per_kwh: Math.round(avg * 100) / 100,
        hours,
      };
    }
  }
  return best;
}

/**
 * Ladeplan-Rechner (S08 „Laden, das sich selbst timt").
 *
 * Gegeben aktueller/gewuenschter Ladestand, Akkukapazitaet, Ladeleistung
 * und optionale Abfahrtszeit: waehlt aus der dynamischen Preiskurve die
 * *guenstigsten* Stundenslots (nicht zwingend zusammenhaengend, anders
 * als bestWindow) bis zur Abfahrt und rechnet Kosten + Ersparnis gegen
 * „sofort durchladen" aus. Reine Berechnung auf vorhandenen Tarifdaten —
 * kein Tesla-/Fleet-Call noetig.
 *
 * Modell: aWattar/Tibber liefern Stundenslots. Pro Slot koennen bis zu
 * `powerKw` kWh geladen werden (1 h × Leistung); teilangebrochene Slots
 * am Rand des Planungsfensters werden anteilig gewertet. Ladeverluste
 * (AC ~10 %) ueber `efficiency`: aus dem Netz gezogene Energie ist hoeher
 * als die im Akku ankommende.
 *
 * @returns {object} Plan mit feasible-Flag, gewaehlten Slots und Kosten
 *   in ganzen Cent. `null` nur bei voellig fehlenden Preisdaten.
 */
export function planCharge(prices, {
  currentSoc,
  targetSoc,
  capacityKwh,
  powerKw,
  readyBy = null,      // Abfahrt als unix_seconds; null => naechste 24 h
  efficiency = 0.9,    // Ladewirkungsgrad (Netz -> Akku), AC typ. ~0,9
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  const eff = Math.min(1, Math.max(0.5, efficiency || 0.9));

  const socDelta = Math.max(0, (targetSoc ?? 0) - (currentSoc ?? 0));
  const energyToBatteryKwh = (socDelta / 100) * (capacityKwh || 0);
  const energyFromGridKwh  = energyToBatteryKwh / eff;
  const hoursNeeded        = powerKw > 0 ? energyFromGridKwh / powerKw : 0;

  const horizonEnd = readyBy && readyBy > now ? readyBy : now + 24 * 3600;

  // Verfuegbare Slots im Planungsfenster inkl. anteiliger Rand-Slots.
  const slots = (prices || [])
    .filter(p => p.end > now && p.start < horizonEnd)
    .map(p => {
      const from = Math.max(now, p.start);
      const to   = Math.min(horizonEnd, p.end);
      const durationH = Math.max(0, (to - from) / 3600);
      return {
        start: p.start,
        end:   p.end,
        ct_per_kwh: p.ct_per_kwh,
        capacity_kwh: (powerKw || 0) * durationH,
      };
    })
    .filter(s => s.capacity_kwh > 0);

  const totalAvailableKwh = slots.reduce((s, x) => s + x.capacity_kwh, 0);

  // Greedy-Fueller: fuellt `need` kWh aus den nach `keyFn` sortierten Slots.
  const fill = (need, ordered) => {
    let remaining = need;
    let costCt = 0;
    const used = [];
    for (const s of ordered) {
      if (remaining <= 1e-6) break;
      const take = Math.min(s.capacity_kwh, remaining);
      used.push({ start: s.start, end: s.end, ct_per_kwh: s.ct_per_kwh, kwh: Math.round(take * 1000) / 1000 });
      costCt += take * s.ct_per_kwh;
      remaining -= take;
    }
    return { used, costCt, chargedKwh: need - Math.max(0, remaining) };
  };

  // Optimal: guenstigste Slots zuerst (bei Gleichstand frueher Slot zuerst).
  const byPrice = [...slots].sort((a, b) => a.ct_per_kwh - b.ct_per_kwh || a.start - b.start);
  const optimal = fill(energyFromGridKwh, byPrice);
  // Sofort durchladen: zusammenhaengend ab jetzt (Slots nach Zeit).
  const byTime = [...slots].sort((a, b) => a.start - b.start);
  const immediate = fill(energyFromGridKwh, byTime);

  const feasible = totalAvailableKwh + 1e-6 >= energyFromGridKwh;
  const chargedKwh = optimal.chargedKwh;
  const achievedSoc = (currentSoc ?? 0) + (chargedKwh * eff / (capacityKwh || 1)) * 100;

  const avg = (costCt, kwh) => (kwh > 0 ? Math.round((costCt / kwh) * 100) / 100 : 0);
  const round2 = v => Math.round(v * 100) / 100;

  return {
    feasible,
    energy_to_battery_kwh: round2(energyToBatteryKwh),
    energy_from_grid_kwh:  round2(energyFromGridKwh),
    hours_needed:          round2(hoursNeeded),
    charged_kwh:           round2(chargedKwh),
    achieved_soc:          Math.round(Math.min(targetSoc ?? 100, achievedSoc)),
    efficiency:            eff,
    window: { start: now, end: horizonEnd },
    // Gewaehlte Slots nach Zeit sortiert fuer die Balken-Darstellung.
    slots: optimal.used.sort((a, b) => a.start - b.start),
    optimal_cost_ct:            Math.round(optimal.costCt),
    optimal_avg_ct_per_kwh:     avg(optimal.costCt, optimal.chargedKwh),
    immediate_cost_ct:          Math.round(immediate.costCt),
    immediate_avg_ct_per_kwh:   avg(immediate.costCt, immediate.chargedKwh),
    savings_ct:                 Math.max(0, Math.round(immediate.costCt - optimal.costCt)),
    // Prozent auf [0,100] gedeckelt: bei negativen Spotpreisen (optimal < 0,
    // z.B. Solar-Mittag) laege der Rohwert sonst ueber 100 % und wirkt im UI
    // widerspruechlich — die absolute Euro-Ersparnis bleibt die ehrliche Zahl.
    savings_pct:                immediate.costCt > 0
      ? Math.min(100, Math.max(0, Math.round(((immediate.costCt - optimal.costCt) / immediate.costCt) * 100)))
      : 0,
  };
}

/** Cache invalidieren (nach Config-Aenderung). */
export function invalidateCache(tenantId) { CACHE.delete(tenantId); }

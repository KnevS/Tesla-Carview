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

/** Cache invalidieren (nach Config-Aenderung). */
export function invalidateCache(tenantId) { CACHE.delete(tenantId); }

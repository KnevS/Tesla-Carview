// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Schlaf-Detektiv — „Warum schlaeft mein Auto nicht?"
 *
 * Der Schlaf-Monitor (vehicle_sleep_events) sieht nur Uebergaenge, die der
 * Listen-Poll alle 15 Minuten erwischt. Wie lange das Auto im Stand
 * tatsaechlich WACH war, steckt dagegen in den Fleet-Telemetry-Punkten:
 * Tesla streamt nur, solange das Fahrzeug wach ist. Ein dichter Strom von
 * Punkten im Stand heisst also „wach", eine Luecke heisst „schlaeft".
 *
 * Daraus entstehen:
 *  - je Tag die Aufteilung Fahrt / Laden / wach im Stand / schlaeft,
 *  - je Standphase (zwischen zwei Fahrten bzw. Ladungen) Wachanteil und
 *    Ladestandsverlust,
 *  - datenbelegte Hinweise auf die Ursache (Leistungsaufnahme im Stand,
 *    Aufwachen kurz nach dem Einschlafen, regelmaessiges Wecken).
 *
 * Datenehrlichkeit: Ein Tag ohne einen einzigen Telemetrie-Punkt ist nur
 * dann „geschlafen", wenn der Schlaf-Monitor das bestaetigt — sonst kann
 * genauso gut die Telemetrie ausgefallen sein, und der Tag bleibt
 * „unbekannt".
 *
 * Reine Rechenlogik ohne DB-Zugriff — die Route liefert die Zeilen.
 */

// Groesster Abstand zweier Telemetrie-Punkte, der noch als durchgehend wach
// gilt. Ein waches Auto streamt im Sekundenbereich; Luecken darueber sind
// Schlaf oder Funkloch.
export const AWAKE_GAP_S = 300;

// Eine Luecke ab dieser Laenge vor einem Punkt im Stand gilt als „ist
// aufgewacht" (fuer die Erkennung regelmaessigen Weckens).
const WAKE_GAP_S = 15 * 60;

// Standphasen unter dieser Laenge sagen nichts ueber das Schlafverhalten.
const MIN_STRETCH_S = 2 * 3600;

// Maximaler Abstand des SoC-Messwerts zur Phasengrenze. Weiter entfernt
// steckt schon Verbrauch von Fahrt oder Ladung im Wert.
const SOC_EDGE_MAX_S = 30 * 60;

// Schlafphasen bis zu dieser Laenge zaehlen als „sofort wieder geweckt".
const QUICK_REWAKE_MAX_MIN = 20;

const DRIVE_GEARS = new Set(['D', 'R', 'N']);

const round1 = v => Math.round(v * 10) / 10;
const round2 = v => Math.round(v * 100) / 100;

/** Datumsschluessel YYYY-MM-DD einer Unix-Zeit in der Zeitzone `tz`. */
function dayKeyFormatter(tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return t => f.format(new Date(t * 1000));
}

/** Unix-Zeit von Mitternacht des Tages `key` (YYYY-MM-DD) in der Zeitzone `tz`. */
function localMidnight(key, tz) {
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

/** Ueberlappungen zusammenfassen; Eingabe [{start, end}], end darf null sein (laeuft noch). */
function mergeIntervals(list, now) {
  const sorted = list
    .map(i => ({ start: i.start, end: i.end ?? now }))
    .filter(i => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  const out = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Summe der Ueberlappung einer Intervallliste mit [a, b). */
function overlap(intervals, a, b) {
  let s = 0;
  for (const i of intervals) {
    if (i.end <= a) continue;
    if (i.start >= b) break;
    s += Math.min(b, i.end) - Math.max(a, i.start);
  }
  return s;
}

/** Liegt t in einem der (sortierten) Intervalle? Zeiger-Variante fuer aufsteigende t. */
function makeContains(intervals) {
  let k = 0;
  return t => {
    while (k < intervals.length && intervals[k].end <= t) k++;
    return k < intervals.length && intervals[k].start <= t;
  };
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * @param {object}   p
 * @param {Array}    p.points       telemetry_points [{timestamp, trip_id, gear, soc, power_kw}], aufsteigend
 * @param {Array}    p.trips        [{start_time, end_time}]
 * @param {Array}    p.charges      [{start_time, end_time}]
 * @param {Array}    p.sleepEvents  vehicle_sleep_events-Zeilen
 * @param {number}   p.from         Fensterbeginn (Unix)
 * @param {number}   p.now          Fensterende (Unix)
 * @param {string}   p.tz           IANA-Zeitzone fuer die Tagesgrenzen
 * @param {number}   p.batteryKwh   nutzbare Kapazitaet
 * @param {number|null} p.homePrice €/kWh fuer die Kostenschaetzung
 */
export function analyzeStandby({ points = [], trips = [], charges = [], sleepEvents = [], from, now, tz = 'UTC', batteryKwh = 75, homePrice = null }) {
  if (!points.length) {
    return { has_telemetry: false, summary: null, days: [], stretches: [], hints: [{ code: 'no_telemetry', severity: 'info' }] };
  }

  const dayKey   = dayKeyFormatter(tz);
  const tripIv   = mergeIntervals(trips.map(t => ({ start: t.start_time, end: t.end_time })), now);
  const chargeIv = mergeIntervals(charges.map(c => ({ start: c.start_time, end: c.end_time })), now);
  const busyIv   = mergeIntervals([...tripIv, ...chargeIv], now);
  const inCharge = makeContains(chargeIv);

  // ── Wache Zeit im Stand aus den Telemetrie-Punkten ────────────────────
  const parkedAwakeByDay = new Map();
  const parkedAwakeIv    = [];          // fuer die Standphasen
  const parkedPowerW     = [];          // Leistungsaufnahme im wachen Stand
  const wakeStarts       = [];          // Aufwach-Zeitpunkte im Stand
  const daysWithPoints   = new Set(points.map(p => dayKey(p.timestamp)));
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dt = b.timestamp - a.timestamp;
    if (dt <= 0 || dt > AWAKE_GAP_S) continue;
    const driving = a.trip_id != null || b.trip_id != null || DRIVE_GEARS.has(a.gear) || DRIVE_GEARS.has(b.gear);
    if (driving || inCharge(a.timestamp)) continue;
    const key = dayKey(a.timestamp);
    parkedAwakeByDay.set(key, (parkedAwakeByDay.get(key) ?? 0) + dt);
    const last = parkedAwakeIv[parkedAwakeIv.length - 1];
    if (last && last.end === a.timestamp) last.end = b.timestamp;
    else parkedAwakeIv.push({ start: a.timestamp, end: b.timestamp });
    // Tesla meldet Entladen als negative Leistung.
    if (a.power_kw != null && a.power_kw < 0) parkedPowerW.push(-a.power_kw * 1000);
  }
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.timestamp - points[i - 1].timestamp < WAKE_GAP_S) continue;
    if (p.trip_id != null || DRIVE_GEARS.has(p.gear)) continue;
    wakeStarts.push(p.timestamp);
  }

  // ── Tage ──────────────────────────────────────────────────────────────
  const sleepIv  = mergeIntervals(sleepEvents.map(e => ({ start: e.sleep_at, end: e.wake_at })), now);
  const firstKey = dayKey(Math.max(from, points[0].timestamp));
  const days = [];
  for (let key = dayKey(now); key >= firstKey;) {
    const start = localMidnight(key, tz);
    // +25 h liegt sicher im Folgetag, auch an Tagen mit Zeitumstellung (23/25 h).
    const end   = Math.min(now, localMidnight(dayKey(start + 90000), tz));
    const len   = end - start;
    if (len <= 0) { key = dayKey(start - 3600); continue; }
    const hasPts = daysWithPoints.has(key);
    // Zeit vor dem ersten Telemetrie-Punkt ist nie „geschlafen", sondern unbekannt.
    const beforeData = Math.max(0, Math.min(end, points[0].timestamp) - start);
    const driving  = overlap(tripIv, start, end);
    const charging = overlap(chargeIv, start, end);
    const awake    = parkedAwakeByDay.get(key) ?? 0;
    const rest     = Math.max(0, len - beforeData - driving - charging - awake);
    // Ohne Punkte nur dann „geschlafen", wenn der Schlaf-Monitor es stuetzt.
    const confirmedSleep = overlap(sleepIv, start, end);
    const covered = hasPts || confirmedSleep >= len * 0.5;
    days.push({
      date: key,
      hours: round1(len / 3600),
      driving_h:      round1(driving / 3600),
      charging_h:     round1(charging / 3600),
      parked_awake_h: round1(awake / 3600),
      asleep_h:       covered ? round1(rest / 3600) : 0,
      unknown_h:      round1(((covered ? 0 : rest) + beforeData) / 3600),
    });
    key = dayKey(start - 3600);
  }

  // ── Standphasen ───────────────────────────────────────────────────────
  const stretches = [];
  const gaps = [];
  let cursor = from;
  for (const b of busyIv) {
    if (b.start > cursor) gaps.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (now > cursor) gaps.push({ start: cursor, end: now, ongoing: true });

  const socPts = points.filter(p => p.soc != null);
  // dir = +1: erster Wert ab t; dir = -1: letzter Wert bis t (binaere Suche).
  const socNear = (t, dir) => {
    let lo = 0, hi = socPts.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (socPts[mid].timestamp < t) lo = mid + 1; else hi = mid; }
    const best = dir > 0 ? socPts[lo] : (socPts[lo]?.timestamp === t ? socPts[lo] : socPts[lo - 1]);
    return best && Math.abs(best.timestamp - t) <= SOC_EDGE_MAX_S ? best.soc : null;
  };

  let lossPctSum = 0, lossHoursSum = 0;
  for (const g of gaps) {
    const len = g.end - g.start;
    if (len < MIN_STRETCH_S || g.start < points[0].timestamp - AWAKE_GAP_S) continue;
    const awake = overlap(parkedAwakeIv, g.start, g.end);
    const s0 = socNear(g.start, +1);
    // Laufende Phase: nur mit frischem Messwert, sonst waere die Rate verduennt.
    const s1 = socNear(g.end, -1);
    const drop = s0 != null && s1 != null && s0 >= s1 && s0 - s1 < 30 ? s0 - s1 : null;
    if (drop != null) { lossPctSum += drop; lossHoursSum += len / 3600; }
    const kwh = drop != null ? drop / 100 * batteryKwh : null;
    const intervals = wakeStarts.filter(t => t > g.start && t < g.end);
    stretches.push({
      start: g.start, end: g.end, ongoing: !!g.ongoing,
      hours: round1(len / 3600),
      awake_h: round1(awake / 3600),
      awake_share: round2(awake / len),
      soc_start: s0, soc_end: s1,
      loss_pct: drop != null ? round1(drop) : null,
      loss_kwh: kwh != null ? round2(kwh) : null,
      cost: kwh != null && homePrice ? round2(kwh * homePrice) : null,
      wakeups: intervals.length,
    });
  }
  stretches.sort((a, b) => b.start - a.start);

  // ── Kennzahlen ────────────────────────────────────────────────────────
  const parkedS      = stretches.reduce((s, x) => s + x.hours * 3600, 0);
  const parkedAwakeS = stretches.reduce((s, x) => s + x.awake_h * 3600, 0);
  const awakeShare   = parkedS > 0 ? parkedAwakeS / parkedS : null;
  const lossPerDay   = lossHoursSum >= 12 ? lossPctSum / lossHoursSum * 24 : null;
  const kwhPerDay    = lossPerDay != null ? lossPerDay / 100 * batteryKwh : null;
  const powerW       = parkedPowerW.length >= 20 ? median(parkedPowerW) : null;

  const quick = sleepEvents.filter(e => e.wake_at != null && e.duration_min != null && e.duration_min <= QUICK_REWAKE_MAX_MIN);
  const closedSleeps = sleepEvents.filter(e => e.wake_at != null);

  // Regelmaessiges Wecken: Abstaende der Aufwach-Zeitpunkte je Standphase.
  const spacings = [];
  for (const s of stretches) {
    const ws = wakeStarts.filter(t => t > s.start && t < s.end);
    for (let i = 1; i < ws.length; i++) spacings.push(ws[i] - ws[i - 1]);
  }
  let periodicMin = null;
  if (spacings.length >= 4) {
    const med = median(spacings);
    const close = spacings.filter(x => Math.abs(x - med) <= med * 0.2).length;
    if (close / spacings.length >= 0.6) periodicMin = Math.round(med / 60);
  }

  const hints = [];
  if (awakeShare != null) {
    if (awakeShare >= 0.5)      hints.push({ code: 'rarely_sleeps', severity: 'high',   params: { pct: Math.round(awakeShare * 100) } });
    else if (awakeShare >= 0.2) hints.push({ code: 'often_awake',   severity: 'medium', params: { pct: Math.round(awakeShare * 100) } });
  }
  // Die Leistung im wachen Stand sagt nur etwas, wenn das Auto dort viel Zeit
  // verbringt — direkt nach dem Parken zieht jedes Auto ein paar Minuten
  // lang einige hundert Watt, bevor es einschlaeft.
  const powerRelevant = awakeShare != null && awakeShare >= 0.2;
  if (powerRelevant && powerW >= 800)      hints.push({ code: 'power_climate', severity: 'high',   params: { watts: Math.round(powerW) } });
  else if (powerRelevant && powerW >= 150) hints.push({ code: 'power_sentry',  severity: 'medium', params: { watts: Math.round(powerW) } });
  if (quick.length >= 3 && quick.length / Math.max(1, closedSleeps.length) >= 0.5) {
    hints.push({ code: 'quick_rewake', severity: 'medium', params: { count: quick.length, total: closedSleeps.length, minutes: QUICK_REWAKE_MAX_MIN } });
  }
  if (periodicMin != null) hints.push({ code: 'periodic_wake', severity: 'medium', params: { minutes: periodicMin } });
  if (lossPerDay != null && lossPerDay >= 1.5) hints.push({ code: 'high_drain', severity: 'high', params: { pct: round1(lossPerDay) } });
  if (!hints.length && awakeShare != null && awakeShare < 0.1) hints.push({ code: 'sleeps_well', severity: 'ok', params: { pct: Math.round(awakeShare * 100) } });

  return {
    has_telemetry: true,
    summary: {
      parked_h:          round1(parkedS / 3600),
      parked_awake_h:    round1(parkedAwakeS / 3600),
      awake_share:       awakeShare != null ? round2(awakeShare) : null,
      loss_pct_per_day:  lossPerDay != null ? round2(lossPerDay) : null,
      kwh_per_month:     kwhPerDay != null ? round1(kwhPerDay * 30) : null,
      cost_per_month:    kwhPerDay != null && homePrice ? round2(kwhPerDay * 30 * homePrice) : null,
      home_price_kwh:    homePrice,
      parked_power_w:    powerW != null ? Math.round(powerW) : null,
      sleep_events:      closedSleeps.length,
      quick_rewakes:     quick.length,
    },
    days,
    stretches: stretches.slice(0, 30),
    hints,
  };
}


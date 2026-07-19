// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Ladewirkungsgrad — wie viel der bezogenen Energie kommt im Akku an?
 *
 * Tesla zeigt nur `charge_energy_added` (im Akku angekommen). Was die
 * Wallbox tatsaechlich gezogen hat, steht nirgends — die Differenz ist der
 * Ladeverlust und schwankt drastisch: an 11 kW sind es wenige Prozent, an
 * einer Schuko-Dose mit 5 A einphasig ueber 20 %.
 *
 * Zwei Quellen, bewusst getrennt gehalten (nie vermischt — die eine Zahl ist
 * geeicht, die andere geschaetzt):
 *
 *   1. `metered`   — `energy_kwh_mid` aus dem MID-Zaehler (via Monta).
 *                    Exakt, aber nur fuer Nutzer mit angebundener Wallbox.
 *   2. `telemetry` — aus `charging_points`: `power_kw` ist `charger_power`
 *                    und damit die NETZSEITE, `energy_added_kwh` der
 *                    kumulative Akku-Zaehler. Fuer alle Nutzer verfuegbar,
 *                    aber approximativ.
 *
 * Warum intervallweise gerechnet wird (und nicht Session-Summe gegen
 * Session-Summe): Der erste Messpunkt faellt erst auf den Poll NACH dem
 * Ladestart, der letzte auf den Poll DAVOR. Ueber die Session summiert
 * fehlte damit die Netz-Energie der unbedeckten Raender, waehrend der
 * Akku-Zaehler die volle Ladung enthaelt — das Ergebnis laege systematisch
 * ueber 100 %. Rechnet man je Intervall, tragen unbedeckte Raender zu
 * KEINER der beiden Summen bei und der Fehler entfaellt.
 */

// Groesste Luecke zwischen zwei Messpunkten, die noch als zusammenhaengend
// gilt. Bei aktiver Fleet-Telemetry pollt die App nur stuendlich, deshalb
// etwas ueber einer Stunde.
const MAX_GAP_S = 70 * 60;

// Mindestmenge an Akku-Energie in den bewerteten Intervallen. Darunter ist
// die Aussage Rauschen — eine DC-Ladung mit einem einzigen Messpunkt liefert
// lieber gar keinen Wert als einen erfundenen.
const MIN_COVERED_KWH = 3;

// Plausibler Bereich. Ueber 100 % ist physikalisch unmoeglich, unter 60 %
// deutet auf Messfehler hin (fehlende Punkte, Standheizung waehrend der
// Ladung) — beides lieber verwerfen als ausweisen.
const MIN_PLAUSIBLE = 0.60;
const MAX_PLAUSIBLE = 1.0;

/**
 * Wirkungsgrad einer einzelnen Ladesession.
 *
 * @param {object}   session  Zeile aus charging_sessions
 * @param {object[]} points   charging_points der Session, nach timestamp aufsteigend
 * @returns {{efficiency:number, method:string, grid_kwh:number, battery_kwh:number}|null}
 *          null, wenn die Datenlage keine belastbare Aussage hergibt
 */
export function computeSessionEfficiency(session, points = []) {
  const metered = meteredEfficiency(session);
  if (metered) return metered;
  return telemetryEfficiency(points);
}

/** Geeichter Weg: MID-Zaehlerstand gegen Akku-Zuwachs. */
function meteredEfficiency(session) {
  const grid    = session?.energy_kwh_mid;
  const battery = session?.energy_added_kwh;
  if (!(grid > 0) || !(battery > 0)) return null;

  const efficiency = battery / grid;
  if (!isPlausible(efficiency)) return null;

  return {
    efficiency:  round3(efficiency),
    method:      'metered',
    grid_kwh:    round3(grid),
    battery_kwh: round3(battery),
  };
}

/** Geschaetzter Weg: intervallweise Netz-Trapez gegen Akku-Delta. */
function telemetryEfficiency(points) {
  if (!Array.isArray(points) || points.length < 2) return null;

  let gridKwh = 0;
  let batteryKwh = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    const dt = (b.timestamp ?? 0) - (a.timestamp ?? 0);
    if (dt <= 0 || dt > MAX_GAP_S) continue;

    // Akku-Zuwachs exakt aus dem kumulativen Zaehler — nicht integriert.
    // Ein Rueckwaertssprung heisst Zaehler-Reset und macht das Intervall
    // unbrauchbar.
    const dBattery = (b.energy_added_kwh ?? 0) - (a.energy_added_kwh ?? 0);
    if (!(dBattery > 0)) continue;

    // Netz-Energie als Trapez ueber die Momentanleistung. Sind beide
    // Randwerte 0, hat die App waehrend einer Pause gemessen.
    const pA = a.power_kw ?? 0;
    const pB = b.power_kw ?? 0;
    if (pA <= 0 && pB <= 0) continue;

    const dGrid = ((pA + pB) / 2) * (dt / 3600);
    if (dGrid <= 0) continue;

    gridKwh    += dGrid;
    batteryKwh += dBattery;
  }

  if (batteryKwh < MIN_COVERED_KWH || gridKwh <= 0) return null;

  const efficiency = batteryKwh / gridKwh;
  if (!isPlausible(efficiency)) return null;

  return {
    efficiency:  round3(efficiency),
    method:      'telemetry',
    grid_kwh:    round3(gridKwh),
    battery_kwh: round3(batteryKwh),
  };
}

function isPlausible(eff) {
  return Number.isFinite(eff) && eff >= MIN_PLAUSIBLE && eff <= MAX_PLAUSIBLE;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

/**
 * Leistungsbaender fuer die Auswertung „Verlust nach Ladeleistung".
 * Genau die Frage, die im Forum immer wieder gestellt wird: an der
 * Schuko-Dose verpufft ein Fuenftel, an der Wallbox fast nichts.
 */
export const POWER_BANDS = [
  { key: 'schuko', min: 0,  max: 2.5, label_kw: '< 2,5 kW'  },
  { key: 'low',    min: 2.5, max: 5,  label_kw: '2,5–5 kW'  },
  { key: 'mid',    min: 5,   max: 8,  label_kw: '5–8 kW'    },
  { key: 'ac11',   min: 8,   max: 12, label_kw: '8–12 kW'   },
  { key: 'ac22',   min: 12,  max: 25, label_kw: '12–25 kW'  },
  { key: 'dc',     min: 25,  max: Infinity, label_kw: '> 25 kW' },
];

export function bandForPower(kw) {
  if (!(kw > 0)) return null;
  return POWER_BANDS.find(b => kw >= b.min && kw < b.max) ?? null;
}

/**
 * Fasst bewertete Sessions zu Kennzahlen zusammen: Gesamtwirkungsgrad,
 * verlorene kWh und die Aufschluesselung nach Leistungsband.
 *
 * Gewichtet wird nach Energie, nicht nach Anzahl Sessions — eine
 * 60-kWh-Ladung sagt mehr ueber den realen Verlust als eine 3-kWh-Ladung.
 */
export function summarizeEfficiency(rows) {
  const rated = rows.filter(r => r.efficiency != null);
  if (!rated.length) {
    return {
      sessions_rated: 0, sessions_total: rows.length,
      avg_efficiency: null, grid_kwh: 0, battery_kwh: 0, lost_kwh: 0,
      by_band: [], by_method: {},
    };
  }

  const gridKwh    = rated.reduce((s, r) => s + r.grid_kwh, 0);
  const batteryKwh = rated.reduce((s, r) => s + r.battery_kwh, 0);

  const byBand = POWER_BANDS.map(band => {
    const inBand = rated.filter(r => r.band === band.key);
    if (!inBand.length) return null;
    const g = inBand.reduce((s, r) => s + r.grid_kwh, 0);
    const b = inBand.reduce((s, r) => s + r.battery_kwh, 0);
    return {
      band:       band.key,
      label_kw:   band.label_kw,
      sessions:   inBand.length,
      efficiency: g > 0 ? round3(b / g) : null,
      grid_kwh:   round3(g),
      lost_kwh:   round3(g - b),
    };
  }).filter(Boolean);

  const byMethod = rated.reduce((acc, r) => {
    acc[r.method] = (acc[r.method] ?? 0) + 1;
    return acc;
  }, {});

  return {
    sessions_rated: rated.length,
    sessions_total: rows.length,
    avg_efficiency: gridKwh > 0 ? round3(batteryKwh / gridKwh) : null,
    grid_kwh:       round3(gridKwh),
    battery_kwh:    round3(batteryKwh),
    lost_kwh:       round3(gridKwh - batteryKwh),
    by_band:        byBand,
    by_method:      byMethod,
  };
}

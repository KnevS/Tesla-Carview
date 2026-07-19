// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Energiebilanz — „welche Verbrauchsangabe ist eigentlich echt?"
 *
 * Tesla zeigt den Fahrtverbrauch: Energie, die waehrend der Fahrt aus dem
 * Akku floss. Nicht enthalten sind Standby, Waechter-Modus, Klimatisierung
 * im Stand und die Ladeverluste. Bezahlt wird aber alles davon.
 *
 * Statt einer einzigen fragilen Gesamtbilanz rechnet dieses Modul eine
 * LEITER aus drei Sprossen. Jede Sprosse ist fuer sich aussagekraeftig, und
 * jede naechste addiert einen weiteren Verlusttopf — faellt eine Datenquelle
 * aus, bleiben die unteren Sprossen stehen:
 *
 *   1. Fahrt        `energy_used / km`                exakt (= Teslas Zahl)
 *   2. Akku-zu-Rad  `(geladen − Δsoc) / km`           exakt
 *   3. Netz-zu-Rad  Sprosse 2 ÷ Ladewirkungsgrad      geschaetzt
 *
 * Sprosse 2 enthaelt den Standby-Verlust bereits IMPLIZIT: Es ist Energie,
 * die den Akku verlassen hat, ohne dass gefahren wurde. Der Schlaf-Monitor
 * wird nur zur Aufschluesselung genutzt — und nur, wenn er den Zeitraum
 * tatsaechlich abdeckt. Eine Zeile „Standby: 0,0 kWh", die bloss aus einer
 * leeren Tabelle stammt, waere eine Behauptung und keine Messung.
 *
 * Absicherung ist die Bilanzgleichung selbst:
 *
 *   geladen ≈ Fahrt + Standby + Δsoc·Kapazitaet + Residuum
 *
 * Bleibt zu viel Residuum uebrig, ist die Datenlage luecken haft (nicht
 * erfasste Fahrten, fehlende Ladungen) — dann gibt es bewusst KEINE
 * Schlagzeilen-Zahl. Dieselbe Linie wie beim Drain im Schlaf-Monitor und
 * beim Ladewirkungsgrad: lieber keine Zahl als eine erfundene.
 */

// Anteil am Ladedurchsatz, ab dem das Residuum die Bilanz unglaubwuerdig
// macht. Darunter erklaeren Messrauschen und Rundung die Differenz.
const MAX_RESIDUAL_SHARE = 0.15;

// Mindest-Datenbasis, damit ueberhaupt gerechnet wird.
const MIN_KM = 100;
const MIN_CHARGED_KWH = 20;

// Fuer die Kapazitaetsmessung: `start_soc`/`end_soc` sind ganze Prozent,
// bei kleinem Hub schlaegt die Rundung voll durch. 40 Punkte Hub halten
// den Quantisierungsfehler unter ~2,5 %.
const MIN_SOC_SPAN_FOR_CAPACITY = 40;

// Rueckfall, wenn sich keine Kapazitaet messen laesst (Model Y Long Range).
const FALLBACK_USABLE_KWH = 75;

/**
 * Schaetzt die nutzbare Akkukapazitaet aus abgeschlossenen Ladungen:
 * geladene kWh geteilt durch den SoC-Hub ergibt kWh pro Prozentpunkt.
 *
 * Bewusst nur eine Hilfsgroesse fuer Δsoc und Standby — beides Terme
 * zweiter Ordnung. Die belastbare SoH-Aussage liefert die Batterie-Ansicht
 * mit ihrer Degradationsanalyse, nicht diese Ueberschlagsrechnung.
 */
export function estimateUsableCapacity(sessions = []) {
  const samples = [];
  for (const s of sessions) {
    const span = (s.end_soc ?? 0) - (s.start_soc ?? 0);
    if (span < MIN_SOC_SPAN_FOR_CAPACITY) continue;
    if (!(s.energy_added_kwh > 0)) continue;
    const kwhPerPct = s.energy_added_kwh / span;
    // Plausibel sind grob 0,4–1,2 kWh je Prozent (40–120 kWh Gesamtkapazitaet)
    if (kwhPerPct < 0.4 || kwhPerPct > 1.2) continue;
    samples.push(kwhPerPct * 100);
  }

  if (!samples.length) {
    return { kwh: FALLBACK_USABLE_KWH, source: 'default', samples: 0 };
  }

  samples.sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  const median = samples.length % 2
    ? samples[mid]
    : (samples[mid - 1] + samples[mid]) / 2;

  return { kwh: round2(median), source: 'measured', samples: samples.length };
}

/**
 * Baut die Verbrauchs-Leiter.
 *
 * @param {object}   p
 * @param {number}   p.km              gefahrene Kilometer im Fenster
 * @param {number}   p.driveKwh        Σ energy_used_kwh der Fahrten
 * @param {number}   p.chargedKwh      Σ energy_added_kwh der Ladungen (Akku-Seite)
 * @param {number?}  p.socStart        SoC am Fensteranfang (Prozent)
 * @param {number?}  p.socEnd          SoC am Fensterende (Prozent)
 * @param {object}   p.capacity        aus estimateUsableCapacity()
 * @param {number?}  p.efficiency      Ladewirkungsgrad 0..1 (aus chargingEfficiency)
 * @param {number?}  p.standbyKwh      Standby-Verlust, nur wenn Schlafdaten den Zeitraum decken
 */
export function computeEnergyBalance(p) {
  const {
    km = 0, driveKwh = 0, chargedKwh = 0,
    socStart = null, socEnd = null,
    capacity, efficiency = null, standbyKwh = null,
  } = p;

  const base = {
    km: round2(km),
    drive_kwh: round2(driveKwh),
    charged_kwh: round2(chargedKwh),
    capacity,
    reliable: false,
    reason: null,
    rungs: { drive: null, battery: null, grid: null },
    residual_kwh: null,
    residual_share: null,
    soc: { start: socStart, end: socEnd, delta_kwh: null },
    standby_kwh: standbyKwh != null ? round2(standbyKwh) : null,
  };

  // Sprosse 1 steht immer, sobald ueberhaupt gefahren wurde — das ist
  // Teslas eigene Zahl und braucht keine Bilanz.
  if (km >= MIN_KM && driveKwh > 0) {
    base.rungs.drive = {
      kwh_100km:  round2(driveKwh / km * 100),
      kwh:        round2(driveKwh),
      confidence: 'exact',
    };
  }

  if (km < MIN_KM)                 return { ...base, reason: 'not_enough_km' };
  if (chargedKwh < MIN_CHARGED_KWH) return { ...base, reason: 'not_enough_charged' };

  // Δsoc: Am Fensterende mehr im Akku als am Anfang heisst, ein Teil der
  // geladenen Energie steht noch drin und wurde nicht gefahren.
  if (socStart == null || socEnd == null) {
    return { ...base, reason: 'no_soc_bounds' };
  }
  const deltaKwh = (socEnd - socStart) / 100 * capacity.kwh;
  base.soc.delta_kwh = round2(deltaKwh);

  // Sprosse 2: Was hat den Akku wirklich verlassen, pro km? Standby steckt
  // hier bereits drin.
  const batteryKwh = chargedKwh - deltaKwh;
  if (batteryKwh <= 0) return { ...base, reason: 'implausible_balance' };

  // Bilanzprobe: Was bleibt uebrig, wenn Fahrt und (falls bekannt) Standby
  // abgezogen sind?
  const residual = batteryKwh - driveKwh - (standbyKwh ?? 0);
  base.residual_kwh   = round2(residual);
  base.residual_share = round3(Math.abs(residual) / chargedKwh);

  if (base.residual_share > MAX_RESIDUAL_SHARE) {
    return { ...base, reason: 'residual_too_large' };
  }

  base.rungs.battery = {
    kwh_100km:  round2(batteryKwh / km * 100),
    kwh:        round2(batteryKwh),
    confidence: 'exact',
  };

  // Sprosse 3: Netzseite. Nur mit gemessenem Wirkungsgrad — ohne ihn
  // bleibt die Leiter eine Sprosse kuerzer, statt einen Faktor zu raten.
  if (efficiency > 0 && efficiency <= 1) {
    const gridKwh = batteryKwh / efficiency;
    base.rungs.grid = {
      kwh_100km:  round2(gridKwh / km * 100),
      kwh:        round2(gridKwh),
      confidence: 'estimated',
      efficiency: round3(efficiency),
    };
  }

  base.reliable = true;
  return base;
}

/**
 * Wie viel Mehrverbrauch zeigt die ehrliche Zahl gegenueber Teslas Anzeige?
 * Genau die Zahl, um die es in den Forendiskussionen geht.
 */
export function extraVsTesla(balance) {
  const drive = balance?.rungs?.drive?.kwh_100km;
  const top   = balance?.rungs?.grid?.kwh_100km ?? balance?.rungs?.battery?.kwh_100km;
  if (!(drive > 0) || !(top > 0)) return null;
  return {
    kwh_100km: round2(top - drive),
    percent:   round1((top / drive - 1) * 100),
    basis:     balance.rungs.grid ? 'grid' : 'battery',
  };
}

function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }
function round3(v) { return Math.round(v * 1000) / 1000; }

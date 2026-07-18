// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Dienstwagen-Versteuerung (S09) — reine Rechenlogik, damit sie testbar bleibt.
 *
 * Bildet die deutsche 1-%-/Fahrtenbuch-Methode für den geldwerten Vorteil
 * ab, inkl. der **stichtagsabhängigen** E-Fahrzeug-Privilegien (Viertelung
 * 0,25 % / Halbierung 0,5 %). Der maßgebliche Satz hängt vom Fahrzeugtyp,
 * vom Bruttolistenpreis UND vom Anschaffungs-/Überlassungsdatum ab — die
 * BLP-Grenze für die Viertelung wurde mehrfach angehoben.
 *
 * Rechtsstand (§ 6 Abs. 1 Nr. 4 EStG), verifiziert 2026-07 gegen ADAC/Haufe:
 *   BEV, Viertelung (0,25 %) wenn BLP ≤ Grenze zum Anschaffungsdatum:
 *     - ab 01.07.2025: 100.000 €
 *     - 01.01.2024–30.06.2025: 70.000 €
 *     - 2019–31.12.2023: 60.000 €
 *     darüber bzw. BEV: Halbierung (0,5 %). Sonderregel läuft Ende 2030 aus.
 *   PHEV, Halbierung (0,5 %) wenn ≤ 50 g/km CO₂ ODER E-Mindestreichweite
 *     erfüllt (≥ 40 km bis 2021, ≥ 60 km 2022–2024, ≥ 80 km ab 2025), sonst 1 %.
 *   Sonst (Verbrenner): 1 %.
 *
 * Keine Steuerberatung — Orientierungsrechnung.
 */

const D = (y, m, d) => Date.UTC(y, m, d);

/** BLP-Grenze (€) für die BEV-Viertelung nach Anschaffungsdatum. 0 = vor 2019. */
export function bevThreshold(acquisitionDate) {
  const t = new Date(acquisitionDate).getTime();
  if (Number.isNaN(t)) return 70000;
  if (t >= D(2025, 6, 1)) return 100000;   // ab 01.07.2025
  if (t >= D(2024, 0, 1)) return 70000;    // 01.01.2024–30.06.2025
  if (t >= D(2019, 0, 1)) return 60000;    // 2019–31.12.2023
  return 0;                                // vor 2019: kein E-Privileg
}

/** Mindest-E-Reichweite (km) für den PHEV-0,5-%-Satz nach Anschaffungsdatum. */
export function phevRangeRequirement(acquisitionDate) {
  const t = new Date(acquisitionDate).getTime();
  if (Number.isNaN(t)) return 80;
  if (t >= D(2025, 0, 1)) return 80;
  if (t >= D(2022, 0, 1)) return 60;
  return 40;                               // 2019–2021
}

/**
 * Bestimmt den Reduktionsfaktor auf die Bemessungsgrundlage (0.25 / 0.5 / 1)
 * samt Prozent-Label und Begründung.
 */
export function determineFactor({ vehicleType = 'bev', blp = 0, acquisitionDate, phevRangeKm = null, phevCo2 = null }) {
  const t = new Date(acquisitionDate).getTime();
  const expired = !Number.isNaN(t) && t >= D(2031, 0, 1); // Sonderregel bis Ende 2030
  const fmt = n => n.toLocaleString('de-DE');

  if (vehicleType === 'bev') {
    if (expired) return { factor: 1, rate: '1 %', reason: 'BEV-Sonderregelung ist Ende 2030 ausgelaufen' };
    const thr = bevThreshold(acquisitionDate);
    if (thr === 0) return { factor: 1, rate: '1 %', reason: 'Anschaffung vor 2019 — kein E-Privileg' };
    if (blp <= thr) return { factor: 0.25, rate: '0,25 %', reason: `Elektro, Bruttolistenpreis ≤ ${fmt(thr)} € (Grenze zum Anschaffungsdatum)` };
    return { factor: 0.5, rate: '0,5 %', reason: `Elektro, Bruttolistenpreis über ${fmt(thr)} € → nur Halbierung` };
  }

  if (vehicleType === 'phev') {
    if (expired) return { factor: 1, rate: '1 %', reason: 'Hybrid-Sonderregelung ist Ende 2030 ausgelaufen' };
    const req = phevRangeRequirement(acquisitionDate);
    const co2ok   = phevCo2 != null && phevCo2 <= 50;
    const rangeok = phevRangeKm != null && phevRangeKm >= req;
    if (co2ok || rangeok) {
      return { factor: 0.5, rate: '0,5 %', reason: `Plug-in-Hybrid erfüllt das Kriterium (≤ 50 g/km CO₂ oder ≥ ${req} km E-Reichweite)` };
    }
    return { factor: 1, rate: '1 %', reason: `Plug-in-Hybrid erfüllt das Kriterium nicht (nötig: ≤ 50 g/km oder ≥ ${req} km)` };
  }

  return { factor: 1, rate: '1 %', reason: 'Verbrenner — kein E-Privileg' };
}

/** BLP auf volle 100 € abrunden (§ 6 Abs. 1 Nr. 4 EStG). */
const roundBlp = blp => Math.floor((blp || 0) / 100) * 100;
const r2 = v => Math.round((v || 0) * 100) / 100;

/**
 * Pauschalmethode (1-%-Regel): monatlicher geldwerter Vorteil.
 * Nutzungsvorteil = 1 % der reduzierten Bemessungsgrundlage; die Reduktion
 * (Viertelung/Halbierung) wirkt auch auf den 0,03-%-Pendlerzuschlag.
 */
export function pauschalMethod({ blp, factor, commuteKm = 0 }) {
  const reduced = roundBlp(blp) * factor;
  const privateUse = 0.01 * reduced;
  const commute    = 0.0003 * reduced * commuteKm;
  return {
    reduced_blp:       r2(reduced),
    private_use_month: r2(privateUse),
    commute_month:     r2(commute),
    total_month:       r2(privateUse + commute),
    total_year:        r2((privateUse + commute) * 12),
  };
}

/**
 * Fahrtenbuchmethode: geldwerter Vorteil = Privatanteil × tatsächliche Kosten.
 * Die AfA (Abschreibung) geht bei E-Fahrzeugen nur mit dem Faktor reduziert
 * in die Gesamtkosten ein (Viertelung/Halbierung), die übrigen Kosten voll.
 */
export function fahrtenbuchMethod({ totalCostsYear = 0, depreciationYear = 0, privateShare = 0, factor = 1 }) {
  const dep   = depreciationYear || 0;
  const other = Math.max(0, (totalCostsYear || 0) - dep);
  const adjustedYear = dep * factor + other;
  const privateYear  = adjustedYear * privateShare;
  return {
    adjusted_costs_year: r2(adjustedYear),
    private_share_pct:   Math.round(privateShare * 100),
    total_year:          r2(privateYear),
    total_month:         r2(privateYear / 12),
  };
}

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Zerlegt einen fertig formatierten Anzeigewert („1.698 kWh", „16,5 %",
 * „€ 1,234.50", „12 850 km") in Praefix, Zahl, Nachkommastellen und Suffix —
 * damit StatCard ihn hochzaehlen kann, ohne den Wert zu verfaelschen.
 *
 * Vorher wurde jedes Komma zum Punkt und dann `parseFloat` gerufen: Ein
 * deutscher Tausenderpunkt wurde so zum Dezimalpunkt („1.698" → 2), jede
 * Nachkommastelle ging verloren (Standard 0 Stellen) und das Leerzeichen vor
 * der Einheit verschwand („36km").
 *
 * Regeln:
 *  - Leerzeichen, Apostroph und schmale Leerzeichen sind Tausendertrenner.
 *  - Kommen Punkt und Komma vor, ist das letzte Zeichen der Dezimaltrenner.
 *  - Mehrfach vorkommendes Zeichen = Tausendertrenner.
 *  - Einmaliges Zeichen mit genau drei folgenden Ziffern ist mehrdeutig
 *    („1.698" / „1,698") — entschieden wird nach der Oberflaechensprache.
 *  - Nur gueltige Tausendergruppen (1–3 Ziffern, dann je 3) gelten als Zahl.
 *    Alles andere — Datum „09.10.26", Uhrzeit, „3/5", Versionsnummern —
 *    liefert `null`, und der Text wird unveraendert angezeigt.
 *
 * @param {string} text
 * @param {string} locale  z. B. 'de', 'en', 'fr'
 * @returns {{num:number, decimals:number, prefix:string, suffix:string}|null}
 */
export function parseDisplayNumber(text, locale = 'de') {
  if (typeof text !== 'string') return null;
  const m = text.match(/^(\D*?)([-+−]?\d(?:[\d.,'   ]*\d)?)(.*)$/s);
  if (!m) return null;
  const [, prefix, token, suffix] = m;
  // Weitere Ziffern im Suffix („3/5", „12 / 15", „08:30") → keine Einzelzahl.
  // Ausnahme: Verbrauchseinheiten wie „kWh/100 km".
  if (/\d/.test(suffix.replace(/\/\s?100\s?(km|mi)\b/gi, ''))) return null;

  const negative = /^[-−]/.test(token);
  const body = token.replace(/^[-+−]/, '').replace(/['   ]/g, ' ');

  const groupSepOf = (loc) => {
    try {
      return new Intl.NumberFormat(loc).formatToParts(1234567.5).find(p => p.type === 'group')?.value ?? ',';
    } catch { return ','; }
  };

  let decSep = null;
  const hasDot = body.includes('.'), hasComma = body.includes(',');
  if (hasDot && hasComma) {
    decSep = body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ',';
  } else if (hasDot || hasComma) {
    const ch = hasDot ? '.' : ',';
    const count = body.split(ch).length - 1;
    const after = body.slice(body.lastIndexOf(ch) + 1);
    if (count > 1) decSep = null;                        // nur Tausendertrenner
    else if (after.length !== 3) decSep = ch;            // „16,5", „0.32"
    else decSep = groupSepOf(locale).trim() === ch ? null : ch; // mehrdeutig
  }

  const [intRaw, fracRaw = ''] = decSep ? [body.slice(0, body.lastIndexOf(decSep)), body.slice(body.lastIndexOf(decSep) + 1)] : [body, ''];
  if (!/^\d*$/.test(fracRaw)) return null;
  const groups = intRaw.split(/[.,' ]/);
  if (groups.length > 1) {
    if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some(g => !/^\d{3}$/.test(g))) return null;
    // Gemischte Tausendertrenner („1.234,567.8") sind keine Zahl.
    const seps = new Set(intRaw.replace(/\d/g, ''));
    if (seps.size > 1) return null;
  } else if (!/^\d+$/.test(intRaw)) {
    return null;
  }

  const num = Number(groups.join('') + (fracRaw ? `.${fracRaw}` : ''));
  if (!Number.isFinite(num)) return null;
  // Ein ausdrueckliches „+" („+28 %") gehoert zur Aussage und bleibt stehen.
  return { num: negative ? -num : num, decimals: fracRaw.length, prefix: token[0] === '+' ? `${prefix}+` : prefix, suffix };
}

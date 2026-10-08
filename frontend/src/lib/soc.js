// Telemetrie-Fahrten speichern den SoC seit v3.57.4 mit einer Nachkommastelle
// (fuer den Verbrauch von Kurzstrecken). Angezeigt wird weiter auf ganze Prozent.
export function fmtSoc(soc, fallback = '–') {
  return soc == null ? fallback : Math.round(soc);
}

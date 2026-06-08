// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * WLTP-Konsumwerte pro Tesla-Modell.
 *
 * Quelle: oeffentlich publizierte WLTP-Werte der Tesla-Konfigurator-
 * Seiten (Stand 2025). Die Zahlen sind reine technische Spec-Daten —
 * keine Texte oder UI-Elemente uebernommen.
 *
 * model = vehicles.model wie in der Tesla-API ('m3', 'my', 'ms', 'mx',
 * 'ct'). Wenn unbekannt: null → keine Vergleichszahl, Frontend zeigt
 * '—' an.
 */
const WLTP_KWH_PER_100KM = {
  m3: 14.0,  // Model 3 (Long Range / Performance gemittelt)
  my: 15.5,  // Model Y (Long Range / Performance gemittelt)
  ms: 17.5,  // Model S (Long Range / Plaid gemittelt)
  mx: 19.0,  // Model X (Long Range / Plaid gemittelt)
  ct: 28.0,  // Cybertruck (US-EPA-äquivalent — kein offizielles WLTP fuer den EU-Markt zum Zeitpunkt)
};

export function wltpConsumption(model) {
  if (!model) return null;
  const key = String(model).toLowerCase();
  return WLTP_KWH_PER_100KM[key] ?? null;
}

/** Liefert die WLTP-Abweichung in Prozent fuer einen Trip — oder null
 *  wenn Distanz oder Verbrauch fehlen, oder das Modell unbekannt ist.
 *
 *  delta > 0 bedeutet: Verbrauch HOEHER als WLTP (Autobahn, Winter, …).
 *  delta < 0 bedeutet: Verbrauch NIEDRIGER (Stadt, milder Sommer, …). */
export function wltpDeltaPct(model, distance_km, energy_used_kwh) {
  if (!distance_km || distance_km < 1) return null;
  if (energy_used_kwh == null) return null;
  const actual = (energy_used_kwh / distance_km) * 100;
  const wltp   = wltpConsumption(model);
  if (!wltp) return null;
  return Math.round(((actual - wltp) / wltp) * 1000) / 10; // 1 Nachkommastelle
}

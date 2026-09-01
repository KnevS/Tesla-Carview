// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Fahrzeugmodell und nutzbare Akkukapazitaet bestimmen.
 *
 * Anlass: `vehicles.model` bleibt bei Fleet-API-Instanzen leer — die
 * Fahrzeugliste der Fleet-API liefert kein `model_name` (die alte
 * Owner-API tat es). Folge: Die WLTP-Vergleichsspalte blieb dauerhaft
 * leer, und die Energie-Schaetzung rechnete mit einer fest verdrahteten
 * Model-Y-Kapazitaet — fuer ein Model S rund 20 kWh daneben.
 *
 * Die Information ist aber vorhanden: Die VIN kodiert das Modell an
 * Stelle 4, und `trim_badging` traegt bei Tesla die Kapazitaet als Zahl
 * ("p74d" = Performance, 74 kWh, Dual Motor).
 */

/** Stelle 4 der Tesla-VIN kodiert die Baureihe. Unbekanntes Zeichen →
 *  null; lieber keine Angabe als eine falsche. */
const VIN_MODEL_CHAR = { '3': 'm3', 'Y': 'my', 'S': 'ms', 'X': 'mx', 'C': 'ct' };

export function modelFromVin(vin) {
  if (typeof vin !== 'string' || vin.length !== 17) return null;
  return VIN_MODEL_CHAR[vin[3].toUpperCase()] ?? null;
}

/** Modell aus dem Datensatz, sonst aus der VIN. Rueckgabe im selben
 *  Kuerzel-Format wie `vehicles.model` ('m3' | 'my' | 'ms' | 'mx' | 'ct'). */
export function resolveModel(vehicle) {
  const stored = vehicle?.model ? String(vehicle.model).toLowerCase().trim() : null;
  if (stored) return stored;
  return modelFromVin(vehicle?.vin);
}

/** Nutzbare Kapazitaet je Baureihe in kWh.
 *
 *  Naeherungen: Innerhalb einer Baureihe streuen die Varianten erheblich
 *  (Model 3 Standard 57,5 vs. Long Range 75). Diese Tabelle greift nur,
 *  wenn `trim_badging` nichts hergibt — sie ist die zweitbeste Quelle,
 *  nicht die erste. */
const USABLE_KWH_BY_MODEL = { m3: 70, my: 75, ms: 95, mx: 95, ct: 120 };

/** Default, wenn weder Badging noch Modell bekannt sind. Entspricht dem
 *  Wert, mit dem frueher unabhaengig vom Fahrzeug gerechnet wurde. */
export const FALLBACK_USABLE_KWH = 75;

/** Nutzbare Akkukapazitaet in kWh.
 *
 *  Reihenfolge: `trim_badging` (traegt die Kapazitaet als Zahl und ist
 *  damit fahrzeuggenau) → Baureihe → Default. Plausibilitaetsfenster
 *  40..130 kWh, damit ein Badging wie "m3p" oder eine Jahreszahl nicht
 *  als Kapazitaet durchgeht. */
export function usableBatteryKwh(vehicle) {
  const badge = vehicle?.trim_badging ? String(vehicle.trim_badging) : '';
  const m = badge.match(/(\d{2,3})/);
  if (m) {
    const kwh = parseInt(m[1], 10);
    if (kwh >= 40 && kwh <= 130) return kwh;
  }
  const model = resolveModel(vehicle);
  return (model && USABLE_KWH_BY_MODEL[model]) || FALLBACK_USABLE_KWH;
}

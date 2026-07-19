// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Ladepreis-Ranking — „wo lade ich eigentlich am guenstigsten?"
 *
 * Die bestehende Auswertung „Kosten nach Ort" beantwortet, wo das meiste
 * GELD hinfliesst. Das ist etwas anderes als der PREIS: Ein Ort mit hohen
 * Gesamtkosten kann schlicht der sein, an dem am meisten geladen wird.
 * Diese Auswertung sortiert nach €/kWh und rechnet den Aufpreis gegen die
 * eigene Heim-Referenz.
 *
 * Datenehrlichkeit: In die Preisrechnung gehen nur Ladungen mit BEKANNTEM
 * Preis ein. Eine Ladung ohne hinterlegten Tarif ist nicht „kostenlos" —
 * sie ist unbekannt. Wuerde man sie als 0 € mitzaehlen, saehe jeder Ort
 * kuenstlich guenstig aus. Die Abdeckung wird deshalb mit ausgewiesen, und
 * unterhalb einer Mindestabdeckung gibt es keine Gesamtaussage.
 */

// Anteil der Energie, der bepreist sein muss, damit die Gesamtaussage
// („so viel zahlst du drauf") belastbar ist. Darunter bleiben nur die
// Einzelorte stehen.
const MIN_PRICED_SHARE = 0.5;

// Mindestenergie je Ort, damit er im Ranking auftaucht. Eine einzelne
// 2-kWh-Ladung sagt nichts ueber das Preisniveau eines Ortes.
const MIN_ENERGY_PER_LOCATION = 5;

/**
 * @param {object[]} sessions Zeilen aus charging_sessions, angereichert um
 *                            `is_home` (0/1) aus der Heim-Definition des
 *                            Abrechnungs-Moduls.
 */
export function buildPriceRanking(sessions = []) {
  const byLocation = new Map();
  let energyTotal = 0;
  let energyPriced = 0;

  for (const s of sessions) {
    const kwh = s.energy_added_kwh ?? 0;
    if (kwh <= 0) continue;
    energyTotal += kwh;

    // Bekannt ist ein Preis, wenn Kosten hinterlegt sind — oder die Ladung
    // ausdruecklich als kostenlos markiert wurde (dann ist 0 die Wahrheit,
    // keine Annahme).
    const isFree  = s.is_free === 1;
    const hasCost = isFree || (s.cost != null && s.cost >= 0);
    const cost    = isFree ? 0 : (s.cost ?? 0);

    const key = s.location_name || null;
    if (!byLocation.has(key)) {
      byLocation.set(key, {
        location_name: key,
        sessions: 0, sessions_priced: 0,
        energy_kwh: 0, energy_priced_kwh: 0, cost: 0,
        is_home: 0, free_sessions: 0,
      });
    }
    const loc = byLocation.get(key);
    loc.sessions   += 1;
    loc.energy_kwh += kwh;
    if (s.is_home) loc.is_home = 1;
    if (isFree)    loc.free_sessions += 1;

    if (hasCost) {
      loc.sessions_priced   += 1;
      loc.energy_priced_kwh += kwh;
      loc.cost              += cost;
      energyPriced          += kwh;
    }
  }

  // Heim-Referenz: energiegewichteter Preis aller Heimladungen. Kostenlose
  // Ladungen bleiben draussen — sonst zoege eine geschenkte kWh den
  // Referenzpreis nach unten und jeder Vergleich waere geschoent.
  let homeEnergy = 0, homeCost = 0;
  for (const s of sessions) {
    if (!s.is_home || s.is_free === 1) continue;
    if (s.cost == null || !(s.energy_added_kwh > 0)) continue;
    homeEnergy += s.energy_added_kwh;
    homeCost   += s.cost;
  }
  const homePriceKwh = homeEnergy > 0 ? round4(homeCost / homeEnergy) : null;

  const locations = [...byLocation.values()]
    .filter(l => l.energy_priced_kwh >= MIN_ENERGY_PER_LOCATION)
    .map(l => {
      const priceKwh = l.energy_priced_kwh > 0 ? l.cost / l.energy_priced_kwh : null;
      return {
        location_name:     l.location_name,
        sessions:          l.sessions,
        sessions_priced:   l.sessions_priced,
        free_sessions:     l.free_sessions,
        is_home:           l.is_home,
        energy_kwh:        round2(l.energy_kwh),
        energy_priced_kwh: round2(l.energy_priced_kwh),
        cost:              round2(l.cost),
        price_kwh:         priceKwh != null ? round4(priceKwh) : null,
        // Aufpreis gegenueber dem eigenen Heimstrom — die Zahl, die den
        // Unterschied greifbar macht.
        vs_home_pct: homePriceKwh > 0 && priceKwh != null
          ? round1((priceKwh / homePriceKwh - 1) * 100) : null,
        extra_vs_home: homePriceKwh > 0 && priceKwh != null
          ? round2((priceKwh - homePriceKwh) * l.energy_priced_kwh) : null,
      };
    })
    .sort((a, b) => (a.price_kwh ?? Infinity) - (b.price_kwh ?? Infinity));

  const pricedShare = energyTotal > 0 ? energyPriced / energyTotal : 0;
  const reliable    = pricedShare >= MIN_PRICED_SHARE && locations.length > 0;

  // Was haette das Laden gekostet, waere ueberall zum Heimpreis geladen
  // worden? Die Differenz ist der Aufpreis fuers Unterwegsladen.
  let extraTotal = null;
  if (reliable && homePriceKwh > 0) {
    extraTotal = round2(
      locations
        .filter(l => !l.is_home && l.extra_vs_home != null && l.extra_vs_home > 0)
        .reduce((s, l) => s + l.extra_vs_home, 0),
    );
  }

  const priced = locations.filter(l => l.price_kwh != null);
  return {
    locations,
    home_price_kwh: homePriceKwh,
    cheapest:       priced[0] ?? null,
    most_expensive: priced.length > 1 ? priced[priced.length - 1] : null,
    extra_vs_home_total: extraTotal,
    coverage: {
      energy_total_kwh:  round2(energyTotal),
      energy_priced_kwh: round2(energyPriced),
      share:             round3(pricedShare),
    },
    reliable,
  };
}

function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }
function round3(v) { return Math.round(v * 1000) / 1000; }
function round4(v) { return Math.round(v * 10000) / 10000; }

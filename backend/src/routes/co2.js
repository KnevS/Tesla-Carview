// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * CO₂-Bilanz — Vergleich Elektro vs. fiktiver Verbrenner.
 *
 * Methodik:
 *  - Strommix DE 2024 (UBA): 363 g CO₂/kWh
 *  - Referenz-Verbrenner: 6.5 l/100km Benzin → 2.37 kg CO₂/l × 6.5 = ~154 g/km
 *  - Tesla-Verbrauch: tatsächlicher kWh-Wert aus trips
 *
 *  Eingesparte CO₂ = (referenzG_per_km - tesla_g_per_km) × km
 *  tesla_g_per_km   = (kwh_used / km * 1000) * 363 / 1000  → effektive g/km
 *
 * Quellen-Hinweis im Response damit Nutzer verstehen woher die Zahl kommt.
 */

import { Router } from 'express';

const router = Router();

// UBA-Wert Strommix DE 2024
const GRID_CO2_G_PER_KWH = 363;
// Benzin-Vergleich: 6.5 l/100km, 2.37 kg CO₂/l
const ICE_LITERS_PER_100KM = 6.5;
const ICE_CO2_PER_LITER    = 2370; // g
const ICE_CO2_G_PER_KM     = (ICE_LITERS_PER_100KM / 100) * ICE_CO2_PER_LITER;

// GET /api/co2/summary?vehicle_id=...&days=365
router.get('/summary', (req, res) => {
  const db = req.db;
  const days       = Math.min(parseInt(req.query.days, 10) || 365, 3650);
  const vehicleId  = req.query.vehicle_id ? parseInt(req.query.vehicle_id, 10) : null;
  const sinceEpoch = Math.floor(Date.now() / 1000) - days * 86400;

  let where = 'WHERE start_time >= ?';
  const params = [sinceEpoch];
  if (vehicleId) { where += ' AND vehicle_id = ?'; params.push(vehicleId); }

  const row = db.prepare(
    `SELECT COUNT(*) AS trips,
            COALESCE(SUM(distance_km), 0)     AS km,
            COALESCE(SUM(energy_used_kwh), 0) AS kwh
     FROM trips ${where}`
  ).get(...params);

  const km           = Number(row.km || 0);
  const kwhUsed      = Number(row.kwh || 0);
  const teslaCo2Kg   = (kwhUsed * GRID_CO2_G_PER_KWH) / 1000;
  const iceCo2Kg     = (km * ICE_CO2_G_PER_KM) / 1000;
  const savedCo2Kg   = Math.max(0, iceCo2Kg - teslaCo2Kg);
  // 1 Baum bindet ca. 10 kg CO₂/Jahr (BMU-Daumenregel)
  const treeEquivalent = savedCo2Kg / 10;
  // 1 Flug FRA-PMI ~ 280 kg pro Pax
  const flightEquivalent = savedCo2Kg / 280;

  res.json({
    period_days:  days,
    vehicle_id:   vehicleId,
    trips:        row.trips,
    km,
    kwh_used:     kwhUsed,
    tesla_co2_kg: Math.round(teslaCo2Kg * 10) / 10,
    ice_co2_kg:   Math.round(iceCo2Kg * 10) / 10,
    saved_co2_kg: Math.round(savedCo2Kg * 10) / 10,
    equivalent: {
      trees_per_year:    Math.round(treeEquivalent * 10) / 10,
      flights_fra_pmi:   Math.round(flightEquivalent * 10) / 10,
    },
    assumptions: {
      grid_co2_g_per_kwh:   GRID_CO2_G_PER_KWH,
      ice_liters_per_100km: ICE_LITERS_PER_100KM,
      ice_co2_g_per_km:     Math.round(ICE_CO2_G_PER_KM),
      source: 'UBA Strommix DE 2024, Benzin 6.5 l/100km',
    },
  });
});

export default router;

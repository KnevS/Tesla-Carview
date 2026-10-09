// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';
import { buildYearReview } from '../services/yearReview.js';
import { localMidnight, validTimeZone } from '../services/timeZone.js';

const router = Router();

// GET /api/year-review/:vehicleId?year=2026&tz=Europe/Berlin
router.get('/:vehicleId', (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

    const tz  = validTimeZone(req.query.tz);
    const now = Math.floor(Date.now() / 1000);
    const thisYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(new Date()));
    const year = Math.min(thisYear, Math.max(2012, parseInt(req.query.year) || thisYear));
    const from = localMidnight(`${year}-01-01`, tz);
    const to   = localMidnight(`${year + 1}-01-01`, tz);

    const trips = req.db.prepare(`
      SELECT start_time, end_time, distance_km, energy_used_kwh, outside_temp_avg_c
      FROM trips WHERE vehicle_id=? AND start_time>=? AND start_time<? AND end_time IS NOT NULL
    `).all(vehicleId, from, to);
    // Heim-Definition wie Ladepreis-Ranking und Abrechnung.
    const charges = req.db.prepare(`
      SELECT cs.start_time, cs.energy_added_kwh, cs.cost, cs.is_free, cs.charger_type,
             COALESCE(cl.name, cs.location_name) AS location_name,
             CASE WHEN cs.is_home_charged = 1 OR cl.type = 'home'
                    OR (cs.location_id IS NULL AND cs.charger_type NOT IN ('Supercharger','DC'))
                  THEN 1 ELSE 0 END AS is_home
      FROM charging_sessions cs
      LEFT JOIN charging_locations cl ON cl.id = cs.location_id
      WHERE cs.vehicle_id=? AND cs.start_time>=? AND cs.start_time<?
    `).all(vehicleId, from, to);

    // Jahre mit Daten fuer die Auswahl im Frontend.
    const years = req.db.prepare(`
      SELECT DISTINCT CAST(strftime('%Y', start_time, 'unixepoch') AS INTEGER) AS y
      FROM trips WHERE vehicle_id=? ORDER BY y DESC
    `).all(vehicleId).map(r => r.y);

    res.json({
      years,
      ...buildYearReview({ trips, charges, year, tz, complete: now >= to }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

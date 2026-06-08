// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * HVAC-/Klimastatistiken: Klimaanlagen- und Sitzheizungsnutzung pro Tag.
 */
import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

// GET /api/hvac/:vehicleId?days=30 — aggregierte HVAC-Statistiken
router.get('/:vehicleId', (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);
  const days      = Math.min(365, Math.max(7, parseInt(req.query.days) || 30));
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

  try {
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10);

    const rows = req.db.prepare(`
      SELECT day, climate_on_minutes, seat_heat_left_on, seat_heat_right_on,
             precondition_count, max_inside_temp_c, min_outside_temp_c
      FROM hvac_daily_stats
      WHERE vehicle_id = ? AND day >= ?
      ORDER BY day DESC
    `).all(vehicleId, since);

    if (!rows.length) return res.json({ days: [], totals: null });

    const totals = {
      climate_on_hours:    +(rows.reduce((s, r) => s + (r.climate_on_minutes ?? 0), 0) / 60).toFixed(1),
      seat_heat_left_days: rows.filter(r => r.seat_heat_left_on  > 0).length,
      seat_heat_right_days:rows.filter(r => r.seat_heat_right_on > 0).length,
      precondition_total:  rows.reduce((s, r) => s + (r.precondition_count ?? 0), 0),
      coldest_day:         rows.reduce((a, r) =>
        r.min_outside_temp_c != null && (a == null || r.min_outside_temp_c < a.min_outside_temp_c)
          ? r : a, null),
      hottest_day:         rows.reduce((a, r) =>
        r.max_inside_temp_c != null && (a == null || r.max_inside_temp_c > a.max_inside_temp_c)
          ? r : a, null),
    };

    res.json({ days: rows, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

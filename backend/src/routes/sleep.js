import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

// GET /api/sleep/:vehicleId?days=30
router.get('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const days      = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
    if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

    const since  = Math.floor(Date.now() / 1000) - days * 86400;
    const events = req.db.prepare(`
      SELECT * FROM vehicle_sleep_events
      WHERE vehicle_id=? AND sleep_at>=?
      ORDER BY sleep_at DESC
    `).all(vehicleId, since);

    const closed = events.filter(e => e.wake_at != null);
    const stats  = {
      events_count:       events.length,
      total_sleep_hours:  closed.length ? +(closed.reduce((s, e) => s + (e.duration_min || 0), 0) / 60).toFixed(1) : 0,
      longest_sleep_min:  closed.length ? Math.max(...closed.map(e => e.duration_min || 0)) : 0,
      avg_sleep_min:      closed.length ? Math.round(closed.reduce((s, e) => s + (e.duration_min || 0), 0) / closed.length) : 0,
      avg_drain_pct_per_hour: (() => {
        const withDrain = closed.filter(e => e.drain_pct != null && e.duration_min > 0);
        if (!withDrain.length) return null;
        const rates = withDrain.map(e => e.drain_pct / (e.duration_min / 60));
        return +(rates.reduce((s, r) => s + r, 0) / rates.length).toFixed(2);
      })(),
    };

    res.json({ events, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

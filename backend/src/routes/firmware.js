// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Firmware-Version-Historie pro Fahrzeug.
 * Jede erstmals gesehene car_version wird in firmware_versions gespeichert.
 */
import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

// GET /api/firmware/:vehicleId — komplette Versions-Historie
router.get('/:vehicleId', (req, res) => {
  const vehicleId = parseInt(req.params.vehicleId);
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

  try {
    const rows = req.db.prepare(`
      SELECT version, detected_at
      FROM firmware_versions
      WHERE vehicle_id = ?
      ORDER BY detected_at DESC
    `).all(vehicleId);

    // Aktuelle Version (zuletzt gesehen)
    const current = rows[0] ?? null;

    // Gruppierung: Haupt-Version (z.B. "2025.2") aus "2025.2.3 abc1234"
    const grouped = rows.map((r, idx) => ({
      version:       r.version,
      detected_at:   r.detected_at,
      days_installed: idx < rows.length - 1
        ? Math.floor((rows[idx].detected_at - (rows[idx + 1]?.detected_at ?? rows[idx].detected_at)) / 86400)
        : null,
      is_current:    idx === 0,
    }));

    res.json({ current, history: grouped, total_updates: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditLog } from '../services/auditService.js';
import { copyFileSync } from 'fs';
import { join } from 'path';
import { getTenantById } from '../db/database.js';

const router = Router();
router.use(requireAuth);

const BACKUP_WARNING = 'Ohne vorheriges Backup sind die Daten unwiderruflich gelöscht.';

// DELETE /api/data/trips/:id
router.delete('/trips/:id', validate(z.object({ confirm: z.literal(true) })), (req, res) => {
  const trip = req.db.prepare('SELECT id, vehicle_id FROM trips WHERE id=?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Fahrt nicht gefunden' });
  req.db.prepare('DELETE FROM trips WHERE id=?').run(req.params.id);
  auditLog(req.db, req.user.sub, 'trip_deleted', req, { tripId: req.params.id });
  res.json({ ok: true });
});

// DELETE /api/data/charging/:id
router.delete('/charging/:id', validate(z.object({ confirm: z.literal(true) })), (req, res) => {
  const session = req.db.prepare('SELECT id FROM charging_sessions WHERE id=?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Ladesession nicht gefunden' });
  req.db.prepare('DELETE FROM charging_sessions WHERE id=?').run(req.params.id);
  auditLog(req.db, req.user.sub, 'charging_session_deleted', req, { sessionId: req.params.id });
  res.json({ ok: true });
});

// DELETE /api/data/vehicle/:vehicleId/all — Alle Daten eines Fahrzeugs löschen (nur Admin)
router.delete('/vehicle/:vehicleId/all', requireAdmin, validate(z.object({
  confirm:          z.literal(true),
  confirmationText: z.literal('DATEN LÖSCHEN'),
})), (req, res) => {
  const vehicle = req.db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

  const db = req.db;
  db.transaction(() => {
    db.prepare('DELETE FROM trip_points WHERE trip_id IN (SELECT id FROM trips WHERE vehicle_id=?)').run(vehicle.id);
    db.prepare('DELETE FROM trips WHERE vehicle_id=?').run(vehicle.id);
    db.prepare('DELETE FROM charging_points WHERE session_id IN (SELECT id FROM charging_sessions WHERE vehicle_id=?)').run(vehicle.id);
    db.prepare('DELETE FROM charging_sessions WHERE vehicle_id=?').run(vehicle.id);
    db.prepare('DELETE FROM battery_snapshots WHERE vehicle_id=?').run(vehicle.id);
    db.prepare('DELETE FROM telemetry_points WHERE vehicle_id=?').run(vehicle.id);
    db.prepare('DELETE FROM logbook_entries WHERE vehicle_id=?').run(vehicle.id);
    db.prepare('DELETE FROM vehicle_state_cache WHERE vehicle_id=?').run(vehicle.id);
  })();

  auditLog(db, req.user.sub, 'vehicle_data_deleted', req, { vehicleId: vehicle.id, vin: vehicle.vin });
  res.json({ ok: true, deleted: { vehicle: vehicle.display_name } });
});

// DELETE /api/data/tenant/all — Alle Mandantendaten löschen (nur Admin, Sicherheitsstufe hoch)
router.delete('/tenant/all', requireAdmin, validate(z.object({
  confirm:          z.literal(true),
  confirmationText: z.literal('ALLE DATEN LÖSCHEN'),
})), (req, res) => {
  // Backup erstellen
  const tenant   = getTenantById(req.tenantId);
  const backupPath = tenant.db_path.replace('.db', `_backup_${Date.now()}.db`);
  try { copyFileSync(tenant.db_path, backupPath); } catch { /* ignore */ }

  const db = req.db;
  db.transaction(() => {
    db.prepare('DELETE FROM trip_points').run();
    db.prepare('DELETE FROM trips').run();
    db.prepare('DELETE FROM charging_points').run();
    db.prepare('DELETE FROM charging_sessions').run();
    db.prepare('DELETE FROM battery_snapshots').run();
    db.prepare('DELETE FROM telemetry_points').run();
    db.prepare('DELETE FROM logbook_entries').run();
    db.prepare('DELETE FROM vehicle_state_cache').run();
    db.prepare('DELETE FROM audit_logs').run();
  })();

  auditLog(db, req.user.sub, 'tenant_data_purged', req, { backupPath });
  res.json({ ok: true, warning: BACKUP_WARNING, backupCreated: backupPath });
});

// GET /api/data/info — Übersicht der vorhandenen Datenmenge (für Pre-Delete-Warnung)
router.get('/info', (req, res) => {
  const db = req.db;
  res.json({
    warning: BACKUP_WARNING,
    counts: {
      trips:             db.prepare('SELECT COUNT(*) as n FROM trips').get().n,
      charging_sessions: db.prepare('SELECT COUNT(*) as n FROM charging_sessions').get().n,
      battery_snapshots: db.prepare('SELECT COUNT(*) as n FROM battery_snapshots').get().n,
      telemetry_points:  db.prepare('SELECT COUNT(*) as n FROM telemetry_points').get().n,
      logbook_entries:   db.prepare('SELECT COUNT(*) as n FROM logbook_entries').get().n,
    },
  });
});

export default router;

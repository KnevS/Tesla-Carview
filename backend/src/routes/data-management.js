// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditLog } from '../services/auditService.js';
import { copyFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { getTenantById } from '../db/database.js';
import { BACKUP_TABLES } from '../db/backupTables.js';

const router = Router();
router.use(requireAuth);

// Restore-Upload bis 500 MB im RAM — fuer einen Tenant ueblicherweise
// 10–100 MB. Falls jemand riesige Telemetrie-Datenbanken sichert,
// kann das Limit angepasst werden.
const restoreUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

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

/**
 * GET /api/data/backup — vollstaendiger JSON-Dump des aktuellen Tenants.
 * Nur Admin. Enthaelt alle in BACKUP_TABLES gelisteten Tabellen plus
 * ein Meta-Objekt zur Identifikation beim Restore.
 */
router.get('/backup', requireAdmin, (req, res) => {
  const db     = req.db;
  const tenant = getTenantById(req.tenantId) || {};
  const data   = {};
  for (const table of BACKUP_TABLES) {
    try {
      data[table] = db.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      // Tabelle existiert nicht (z.B. nach Migration) → leeres Array
      data[table] = [];
    }
  }
  const payload = {
    meta: {
      format:       'tesla-carview-backup',
      version:      2,
      exportedAt:   new Date().toISOString(),
      exportedByUserId: req.user.sub,
      tenant:       { id: tenant.id, slug: tenant.slug, name: tenant.name },
      counts:       Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v.length])
      ),
    },
    data,
  };
  auditLog(db, req.user.sub, 'data_backup_created', req, {
    counts: payload.meta.counts,
  });
  const filename = `tesla-carview-backup-${tenant.slug || 'tenant'}-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(payload));
});

/**
 * POST /api/data/restore — vollstaendiger Restore aus einer Backup-JSON.
 *
 * Sicherheits-Schichten:
 *   1. requireAdmin
 *   2. confirmationText 'WIEDERHERSTELLEN' im Body
 *   3. Vor dem Restore wird automatisch eine .db-Kopie als Sicherheits-
 *      Backup neben die Tenant-DB gelegt (Datei-Level, falls JSON-Restore
 *      irgendwo daneben geht).
 *   4. Transaktional: alle Tabellen werden im selben Lauf geleert und
 *      neu eingefuegt; bei Fehler wird gerollt back.
 *
 * Erwartet als multipart/form-data:
 *   - file:             Backup-JSON (siehe /api/data/backup-Format)
 *   - confirmationText: 'WIEDERHERSTELLEN'
 */
router.post('/restore', requireAdmin, restoreUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Backup-Datei hochgeladen' });
  if (req.body?.confirmationText !== 'WIEDERHERSTELLEN') {
    return res.status(400).json({
      error: 'Bestaetigungstext fehlt — bitte „WIEDERHERSTELLEN" eingeben.',
    });
  }

  // 1. Parsen + Format pruefen
  let backup;
  try {
    backup = JSON.parse(req.file.buffer.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'Backup-Datei ist kein gueltiges JSON.' });
  }
  if (backup?.meta?.format !== 'tesla-carview-backup' || !backup.data) {
    return res.status(400).json({
      error: 'Datei wurde nicht als Tesla-Carview-Backup erkannt. '
           + 'Bitte eine Datei aus „Backup erstellen" hochladen.',
    });
  }

  // 2. Datei-Level-Sicherheitsbackup
  let safetyBackup = null;
  try {
    const tenant = getTenantById(req.tenantId);
    safetyBackup = tenant.db_path.replace(/\.db$/, `_pre_restore_${Date.now()}.db`);
    copyFileSync(tenant.db_path, safetyBackup);
  } catch (e) {
    console.warn('[Restore] Pre-Restore-Backup fehlgeschlagen:', e.message);
  }

  // 3. Restore in einer Transaktion. PRAGMA foreign_keys=OFF erlaubt
  //    beliebige Insert-Reihenfolge; nach Erfolg wieder ON.
  const db = req.db;
  const inserted = {};
  let aborted = null;

  try {
    db.exec('PRAGMA foreign_keys = OFF');
    const tx = db.transaction(() => {
      for (const table of BACKUP_TABLES) {
        const rows = Array.isArray(backup.data[table]) ? backup.data[table] : [];
        // Existiert Tabelle? Sonst skip.
        const exists = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
        ).get(table);
        if (!exists) { inserted[table] = 'skipped (table missing)'; continue; }

        db.prepare(`DELETE FROM ${table}`).run();
        if (!rows.length) { inserted[table] = 0; continue; }

        // Spalten aus dem ersten Row ableiten. Wenn das aktuelle Schema
        // eine Spalte hat, die im Backup fehlt, bekommt sie ihren Default.
        const allCols = Object.keys(rows[0]);
        // Nur Spalten verwenden, die in der aktuellen Tabelle existieren —
        // sonst killt eine umbenannte Spalte das gesamte Restore.
        const tableCols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
        const cols = allCols.filter(c => tableCols.includes(c));
        if (!cols.length) { inserted[table] = 'skipped (no matching cols)'; continue; }

        const placeholders = cols.map(() => '?').join(',');
        const stmt = db.prepare(
          `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`
        );
        for (const row of rows) {
          stmt.run(...cols.map(c => row[c] ?? null));
        }
        inserted[table] = rows.length;
      }
    });
    tx();
  } catch (err) {
    aborted = err.message;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }

  if (aborted) {
    auditLog(db, req.user.sub, 'data_restore_failed', req, { error: aborted, safetyBackup });
    return res.status(500).json({
      error: 'Restore fehlgeschlagen — Daten wurden zurueckgerollt. '
           + `Sicherheits-Backup: ${safetyBackup}. Fehler: ${aborted}`,
    });
  }

  auditLog(db, req.user.sub, 'data_restore_completed', req, {
    inserted, safetyBackup,
    backupMeta: backup.meta,
  });
  res.json({
    ok: true,
    inserted,
    safetyBackup,
    note: 'Restore abgeschlossen. Bitte einmal abmelden und neu anmelden, '
        + 'damit alle Benutzerdaten frisch geladen werden.',
  });
});

export default router;

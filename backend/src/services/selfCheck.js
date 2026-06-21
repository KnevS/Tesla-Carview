// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
//
// Betrieblicher Selbsttest — REINE DIAGNOSTIK, KEINE KI.
//
// Führt deterministische Sicherheits- und Backup-Prüfungen gegen die
// Tenant-DB + das Dateisystem aus und verdichtet sie zu einem Ampel-Report.
// Persistenz bewusst über tenant_settings (wie der Backup-Status) — KEIN
// Schema-Change. Läuft on-demand (Admin-Button) und wöchentlich im
// nightlyMaintenance-Lauf.

import { existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { getTenantSetting, setTenantSetting } from './configService.js';
import { getBackupConfig } from './autoBackupService.js';
import { BACKUP_TABLES } from '../db/backupTables.js';

const DAY = 86400;
const SEV = { error: 3, warn: 2, ok: 1, info: 0 };
const mk = (key, status, message, meta = null) => ({ key, status, message, meta });

function backupIntegrity(bc) {
  try {
    const file = join(bc.path || '/app/data/backups', bc.last_filename);
    if (!existsSync(file)) return mk('backup_integrity', 'error', 'Letzte Backup-Datei nicht gefunden');
    const size = statSync(file).size;
    if (size < 1024) return mk('backup_integrity', 'error', `Backup verdächtig klein (${size} B)`);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    if (json?.meta?.format !== 'tesla-carview-backup') return mk('backup_integrity', 'error', 'Unerwartetes Backup-Format');
    const present = Object.keys(json.data || {});
    const missing = BACKUP_TABLES.filter(t => !present.includes(t));
    if (missing.length) return mk('backup_integrity', 'warn', `${missing.length} Tabellen fehlen im Backup`, { missing });
    return mk('backup_integrity', 'ok', `Backup geprüft: ${Math.round(size / 1024)} KB, ${present.length} Tabellen, JSON gültig`);
  } catch (e) {
    return mk('backup_integrity', 'error', `Backup nicht lesbar: ${e.message}`);
  }
}

/** Führt den Selbsttest aus, speichert den Report in tenant_settings und gibt ihn zurück. */
export function runSelfCheck(db) {
  const now = Math.floor(Date.now() / 1000);
  const checks = [];

  // ── Sicherheit ────────────────────────────────────────────────────────
  // MFA-Abdeckung
  try {
    const u = db.prepare('SELECT COUNT(*) AS n, SUM(CASE WHEN mfa_enabled=1 THEN 1 ELSE 0 END) AS m FROM users').get();
    const total = u.n || 0, mfa = u.m || 0;
    const pct = total ? Math.round((mfa / total) * 100) : 0;
    checks.push(mk('mfa_coverage',
      total === 0 ? 'info' : pct >= 100 ? 'ok' : pct >= 50 ? 'warn' : 'error',
      total === 0 ? 'Keine Benutzer angelegt' : `${mfa}/${total} Benutzer mit MFA (${pct} %)`,
      { pct, total, mfa }));
  } catch { checks.push(mk('mfa_coverage', 'info', 'MFA-Status nicht ermittelbar')); }

  // Encryption-Key (At-Rest)
  const keyPath = join(process.env.DATA_DIR || '/app/data', '.encryption-key');
  checks.push(existsSync(keyPath)
    ? mk('encryption_key', 'ok', 'At-Rest-Verschlüsselungsschlüssel vorhanden')
    : mk('encryption_key', 'error', 'Encryption-Key fehlt — Tokens/MFA-Secrets nicht verschlüsselt'));

  // Kritische Secrets
  const teslaId = getTenantSetting(db, 'tesla.client_id', 'TESLA_CLIENT_ID');
  const vapid   = getTenantSetting(db, 'vapid.public_key', 'VAPID_PUBLIC_KEY');
  checks.push(mk('secrets', teslaId && vapid ? 'ok' : 'warn',
    `Tesla-Credentials ${teslaId ? '✓' : '✗'} · WebPush/VAPID ${vapid ? '✓' : '✗'}`));

  // Audit-Log aktiv
  try {
    const a = db.prepare('SELECT COUNT(*) AS n FROM audit_logs WHERE created_at > ?').get(now - 7 * DAY);
    checks.push(mk('audit_active', a.n > 0 ? 'ok' : 'warn',
      a.n > 0 ? `${a.n} Audit-Einträge in den letzten 7 Tagen` : 'Keine Audit-Einträge in 7 Tagen'));
  } catch { checks.push(mk('audit_active', 'info', 'Audit-Log nicht prüfbar')); }

  // DB-Integrität
  try {
    const r = db.pragma('integrity_check', { simple: true });
    checks.push(r === 'ok'
      ? mk('db_integrity', 'ok', 'Datenbank-Integrität bestätigt')
      : mk('db_integrity', 'error', `Integritätsfehler: ${r}`));
  } catch { checks.push(mk('db_integrity', 'warn', 'Integritätsprüfung fehlgeschlagen')); }

  // ── Backup ────────────────────────────────────────────────────────────
  const bc = getBackupConfig(db);
  const lastRun = bc.last_run ? Number(bc.last_run) : null;
  if (!bc.enabled) {
    checks.push(mk('backup_recent', 'info', 'Auto-Backup ist deaktiviert'));
  } else if (lastRun && (now - lastRun) < 2 * DAY && bc.last_status === 'success') {
    checks.push(mk('backup_recent', 'ok', `Letztes Backup erfolgreich vor ${Math.round((now - lastRun) / 3600)} h`));
  } else {
    checks.push(mk('backup_recent', 'warn',
      bc.last_status === 'error' ? `Letztes Backup fehlgeschlagen: ${bc.last_error || ''}` : 'Kein aktuelles erfolgreiches Backup'));
  }
  if (bc.enabled && bc.mode === 'local' && bc.last_filename) checks.push(backupIntegrity(bc));

  const summary = checks.reduce((s, c) => (SEV[c.status] > SEV[s] ? c.status : s), 'ok');
  const report = { generated_at: now, summary, checks };
  try {
    setTenantSetting(db, 'selfcheck.last_report', JSON.stringify(report));
    setTenantSetting(db, 'selfcheck.last_run', String(now));
  } catch { /* Persistenz best-effort */ }
  return report;
}

/** Letzter gespeicherter Report (oder null). */
export function getLastSelfCheck(db) {
  const raw = getTenantSetting(db, 'selfcheck.last_report', null);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Wöchentliches Gate für den Scheduler: true, wenn seit >7 Tagen kein Lauf war. */
export function selfCheckDue(db) {
  const last = getTenantSetting(db, 'selfcheck.last_run', null);
  if (!last) return true;
  return (Math.floor(Date.now() / 1000) - Number(last)) > 7 * DAY;
}

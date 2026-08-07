// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
//
// Betrieblicher Selbsttest — REINE DIAGNOSTIK, KEINE KI.
//
// Führt deterministische Sicherheits- und Backup-Prüfungen gegen die
// Tenant-DB + das Dateisystem aus und verdichtet sie zu einem Ampel-Report.
// Persistenz bewusst über tenant_settings (wie der Backup-Status) — KEIN
// Schema-Change. Läuft on-demand (Admin-Button) und wöchentlich im
// nightlyMaintenance-Lauf.

import { existsSync, statSync, openSync, readSync, closeSync } from 'fs';
import { join } from 'path';
import { getTenantSetting, setTenantSetting } from './configService.js';
import { getBackupConfig } from './autoBackupService.js';
import { BACKUP_TABLES } from '../db/backupTables.js';

const DAY = 86400;
const SEV = { error: 3, warn: 2, ok: 1, info: 0 };
const mk = (key, status, message, meta = null) => ({ key, status, message, meta });

// Prueft ohne Voll-Parse: Backups erreichen dreistellige MB-Groessen, und
// JSON.parse der gesamten Datei haette hier denselben Heap-Ueberlauf ausgeloest
// wie frueher das Schreiben. Der meta-Block steht am Dateianfang und traegt die
// Tabellenliste, das Dateiende belegt den vollstaendigen Schreibvorgang.
const HEAD_BYTES = 256 * 1024;

function readHead(file, bytes) {
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n).toString('utf8');
  } finally { closeSync(fd); }
}

function readTail(file, size, bytes) {
  const fd = openSync(file, 'r');
  try {
    const len = Math.min(bytes, size);
    const buf = Buffer.alloc(len);
    const n = readSync(fd, buf, 0, len, size - len);
    return buf.subarray(0, n).toString('utf8');
  } finally { closeSync(fd); }
}

function backupIntegrity(bc) {
  try {
    const file = join(bc.path || '/app/data/backups', bc.last_filename);
    if (!existsSync(file)) return mk('backup_integrity', 'error', 'Letzte Backup-Datei nicht gefunden');
    const size = statSync(file).size;
    if (size < 1024) return mk('backup_integrity', 'error', `Backup verdächtig klein (${size} B)`);

    const head = readHead(file, HEAD_BYTES);
    const marker = head.indexOf(',"data":{');
    if (marker < 0 || !head.startsWith('{"meta":')) {
      return mk('backup_integrity', 'error', 'Unerwartetes Backup-Format');
    }
    const meta = JSON.parse(head.slice('{"meta":'.length, marker));
    if (meta?.format !== 'tesla-carview-backup') {
      return mk('backup_integrity', 'error', 'Unerwartetes Backup-Format');
    }
    if (!readTail(file, size, 16).trimEnd().endsWith('}}')) {
      return mk('backup_integrity', 'error', 'Backup unvollständig — Datei endet abrupt');
    }

    const present = Object.keys(meta.counts || {});
    const missing = BACKUP_TABLES.filter(t => !present.includes(t));
    if (missing.length) return mk('backup_integrity', 'warn', `${missing.length} Tabellen fehlen im Backup`, { missing });
    return mk('backup_integrity', 'ok', `Backup geprüft: ${Math.round(size / 1024)} KB, ${present.length} Tabellen, Struktur gültig`);
  } catch (e) {
    return mk('backup_integrity', 'error', `Backup nicht lesbar: ${e.message}`);
  }
}

// Der zu pruefende Pfad kommt aus backup.last_snapshot, die Aussage aber von
// der Platte. Das Verzeichnis selbst zu erraten waere falsch: Der Schreiber
// waehlt es abhaengig vom Modus, und der Dateiname traegt den Mandanten-Slug —
// ein Verzeichnis-Scan ohne beides meldet bei zwei Mandanten den einen gruen,
// weil der andere frisch gesichert hat.
function snapshotRecent(bc, now) {
  const v = bc.last_snapshot;
  if (!v) return mk('backup_snapshot', 'warn', 'Noch kein Datenbank-Snapshot erstellt');
  if (v.startsWith('FEHLER')) return mk('backup_snapshot', 'error', `Snapshot fehlgeschlagen: ${v.slice(7)}`);

  try {
    const sep  = v.indexOf(' ');
    const file = sep > 0 ? v.slice(sep + 1) : '';
    if (!file || !existsSync(file)) {
      return mk('backup_snapshot', 'error', `Snapshot-Datei fehlt: ${file || '(kein Pfad vermerkt)'}`);
    }
    const st   = statSync(file);
    const ageH = Math.round((now - st.mtimeMs / 1000) / 3600);
    if (st.size < 1024) return mk('backup_snapshot', 'error', `Snapshot verdächtig klein (${st.size} B)`);
    if (ageH > 48) return mk('backup_snapshot', 'warn', `Neuester Snapshot ist ${Math.round(ageH / 24)} Tage alt`);
    return mk('backup_snapshot', 'ok', `Snapshot vor ${ageH} h, ${Math.round(st.size / 1048576)} MB`);
  } catch (e) {
    return mk('backup_snapshot', 'error', `Snapshot nicht prüfbar: ${e.message}`);
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
  // backup.last_run wird als ISO-String abgelegt — Number() ergab NaN, damit war
  // jeder Vergleich unten falsch und der Check meldete dauerhaft "warn",
  // unabhaengig vom tatsaechlichen Backup-Zustand.
  const parsedRun = bc.last_run ? Math.floor(Date.parse(bc.last_run) / 1000) : NaN;
  const lastRun = Number.isFinite(parsedRun) ? parsedRun : null;
  if (!bc.enabled) {
    checks.push(mk('backup_recent', 'info', 'Auto-Backup ist deaktiviert'));
  } else if (lastRun && (now - lastRun) < 2 * DAY && bc.last_status === 'success') {
    checks.push(mk('backup_recent', 'ok', `Letztes Backup erfolgreich vor ${Math.round((now - lastRun) / 3600)} h`));
  } else {
    const age = lastRun ? ` (letzter Lauf vor ${Math.round((now - lastRun) / DAY)} Tagen)` : ' (noch nie gelaufen)';
    checks.push(mk('backup_recent', 'warn',
      bc.last_status === 'error'
        ? `Letztes Backup fehlgeschlagen: ${bc.last_error || ''}${age}`
        : `Kein aktuelles erfolgreiches Backup${age}`));
  }
  if (bc.enabled && bc.mode === 'local' && bc.last_filename) checks.push(backupIntegrity(bc));

  // Der Snapshot ist der Weg, der sich im Ernstfall wirklich zurueckspielen
  // laesst — er wird deshalb eigenstaendig geprueft und nicht mit dem
  // JSON-Status vermischt. Gemessen wird die Datei auf der Platte, nicht ein
  // Statusfeld: Genau ein solches Feld meldete 17 Tage lang faelschlich
  // Erfolg, weil der Prozess vor dem Schreiben des Fehlers starb.
  if (bc.enabled && bc.db_snapshot) checks.push(snapshotRecent(bc, now));

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

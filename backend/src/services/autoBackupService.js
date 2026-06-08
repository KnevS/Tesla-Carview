// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Automatischer Backup-Dienst.
 *
 * Laeuft einmal pro Tag zur konfigurierten UTC-Stunde und sichert alle
 * aktiven Tenant-DBs in dem vom Admin gewaehlten Modus:
 *
 *   local  — JSON-Datei in ./data/backups/ (immer vorhanden, kein Setup)
 *   path   — JSON-Datei in einem beliebigen Container-Pfad (muss gemountet sein)
 *   s3     — Upload zu Amazon S3 oder kompatiblem Dienst (MinIO u.a.)
 *   sftp   — Upload auf einen SFTP-Server
 *
 * Konfiguration je Tenant in tenant_settings (Praefix "backup.").
 * Sensible Felder (S3-Secret, SFTP-Passwort) werden mit AES-256-GCM
 * verschluesselt (gleicher Mechanismus wie Tesla-Tokens).
 */

import { mkdirSync, writeFileSync, readdirSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getAllTenants, getDb } from '../db/database.js';
import { BACKUP_TABLES } from '../db/backupTables.js';
import { encrypt, decrypt } from './cryptoService.js';
import { auditLog } from './auditService.js';

// ---- Scheduler-State ----
let lastRunDay = {};  // { [tenantId]: 'YYYY-MM-DD' }
let schedulerTimer = null;
const CHECK_EVERY_MS = 60 * 1000;   // jede Minute pruefen
const STARTUP_DELAY_MS = 90 * 1000; // kurze Verzoegerung nach Start

// ---- Config-Schluessel (tenant_settings) ----
const CFG_KEYS = [
  'backup.enabled', 'backup.mode', 'backup.hour_utc', 'backup.retention_days',
  'backup.path',
  'backup.s3_bucket', 'backup.s3_region', 'backup.s3_endpoint',
  'backup.s3_key_id', 'backup.s3_secret', 'backup.s3_prefix',
  'backup.sftp_host', 'backup.sftp_port', 'backup.sftp_user',
  'backup.sftp_password', 'backup.sftp_path',
  'backup.last_run', 'backup.last_status', 'backup.last_error', 'backup.last_filename',
];

// Welche Felder werden bei Lesen/Schreiben verschluesselt?
const ENCRYPTED_FIELDS = new Set(['backup.s3_secret', 'backup.sftp_password']);

// ---- Config-Helfer ----

export function getBackupConfig(db) {
  const rows = db.prepare(
    `SELECT key, value FROM tenant_settings WHERE key IN (${CFG_KEYS.map(() => '?').join(',')})`
  ).all(...CFG_KEYS);
  const raw = Object.fromEntries(rows.map(r => [r.key.replace('backup.', ''), r.value]));
  if (raw.s3_secret)    raw.s3_secret    = tryDecrypt(raw.s3_secret);
  if (raw.sftp_password) raw.sftp_password = tryDecrypt(raw.sftp_password);
  return {
    enabled:        raw.enabled === '1',
    mode:           raw.mode           || 'local',
    hour_utc:       parseInt(raw.hour_utc ?? '2', 10),
    retention_days: parseInt(raw.retention_days ?? '30', 10),
    path:           raw.path           || '/app/data/backups',
    s3_bucket:      raw.s3_bucket      || '',
    s3_region:      raw.s3_region      || 'us-east-1',
    s3_endpoint:    raw.s3_endpoint    || '',
    s3_key_id:      raw.s3_key_id      || '',
    s3_secret:      raw.s3_secret      || '',
    s3_prefix:      raw.s3_prefix      || 'tesla-carview/',
    sftp_host:      raw.sftp_host      || '',
    sftp_port:      parseInt(raw.sftp_port ?? '22', 10),
    sftp_user:      raw.sftp_user      || '',
    sftp_password:  raw.sftp_password  || '',
    sftp_path:      raw.sftp_path      || '/backups/',
    last_run:       raw.last_run       || null,
    last_status:    raw.last_status    || null,
    last_error:     raw.last_error     || null,
    last_filename:  raw.last_filename  || null,
  };
}

export function setBackupConfig(db, updates) {
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)'
  );
  const set = (k, v) => upsert.run(`backup.${k}`, v ?? '');
  if (updates.enabled   !== undefined) set('enabled',  updates.enabled ? '1' : '0');
  if (updates.mode      !== undefined) set('mode',      updates.mode);
  if (updates.hour_utc  !== undefined) set('hour_utc',  String(updates.hour_utc));
  if (updates.retention_days !== undefined) set('retention_days', String(updates.retention_days));
  if (updates.path      !== undefined) set('path',      updates.path);
  if (updates.s3_bucket !== undefined) set('s3_bucket', updates.s3_bucket);
  if (updates.s3_region !== undefined) set('s3_region', updates.s3_region);
  if (updates.s3_endpoint !== undefined) set('s3_endpoint', updates.s3_endpoint);
  if (updates.s3_key_id !== undefined) set('s3_key_id', updates.s3_key_id);
  if (updates.s3_secret !== undefined && updates.s3_secret !== '')
    set('s3_secret', encrypt(updates.s3_secret));
  if (updates.s3_prefix !== undefined) set('s3_prefix', updates.s3_prefix);
  if (updates.sftp_host !== undefined) set('sftp_host', updates.sftp_host);
  if (updates.sftp_port !== undefined) set('sftp_port', String(updates.sftp_port));
  if (updates.sftp_user !== undefined) set('sftp_user', updates.sftp_user);
  if (updates.sftp_password !== undefined && updates.sftp_password !== '')
    set('sftp_password', encrypt(updates.sftp_password));
  if (updates.sftp_path !== undefined) set('sftp_path', updates.sftp_path);
}

function setStatus(db, status, error, filename) {
  const upsert = db.prepare('INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)');
  upsert.run('backup.last_run',      new Date().toISOString());
  upsert.run('backup.last_status',   status);
  upsert.run('backup.last_error',    error   || '');
  upsert.run('backup.last_filename', filename || '');
}

function tryDecrypt(v) {
  try { return decrypt(v); } catch { return v; }
}

// ---- Backup-Daten erzeugen ----

function buildBackupPayload(db, tenant) {
  const data = {};
  for (const table of BACKUP_TABLES) {
    try {
      data[table] = db.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      data[table] = [];
    }
  }
  return {
    meta: {
      format:     'tesla-carview-backup',
      version:    2,
      exportedAt: new Date().toISOString(),
      source:     'auto-backup',
      tenant:     { id: tenant.id, slug: tenant.slug, name: tenant.name },
      counts:     Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
    },
    data,
  };
}

function makeFilename(slug) {
  return `tesla-carview-backup-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
}

// ---- Modus A + B: lokaler Pfad ----

function saveLocal(jsonStr, targetDir, filename, retentionDays, slug) {
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, filename), jsonStr, 'utf8');
  // Rotation: alte Dateien loeschen
  if (retentionDays > 0) {
    const cutoff = Date.now() - retentionDays * 86400 * 1000;
    try {
      readdirSync(targetDir)
        .filter(f => f.startsWith(`tesla-carview-backup-${slug}-`) && f.endsWith('.json'))
        .forEach(f => {
          try {
            const full = join(targetDir, f);
            const stat = statSync(full);
            if (stat.mtimeMs < cutoff) unlinkSync(full);
          } catch { /* ignore */ }
        });
    } catch { /* ignore rotation errors */ }
  }
}

// ---- Modus S3 ----

async function uploadS3(jsonStr, cfg, filename) {
  // Lazy-import: kein Start-Fehler wenn nicht installiert.
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3').catch(() => {
    throw new Error('@aws-sdk/client-s3 nicht installiert — bitte `npm install @aws-sdk/client-s3` im Backend');
  });
  const clientCfg = {
    region: cfg.s3_region || 'us-east-1',
    credentials: { accessKeyId: cfg.s3_key_id, secretAccessKey: cfg.s3_secret },
  };
  if (cfg.s3_endpoint) clientCfg.endpoint = cfg.s3_endpoint;
  const client = new S3Client(clientCfg);
  const key    = (cfg.s3_prefix || '').replace(/\/$/, '') + '/' + filename;
  await client.send(new PutObjectCommand({
    Bucket:      cfg.s3_bucket,
    Key:         key,
    Body:        jsonStr,
    ContentType: 'application/json',
  }));
  return key;
}

// ---- Modus SFTP ----

async function uploadSftp(jsonStr, cfg, filename) {
  const SftpClient = await import('ssh2-sftp-client').catch(() => {
    throw new Error('ssh2-sftp-client nicht installiert — bitte `npm install ssh2-sftp-client` im Backend');
  });
  const sftp = new (SftpClient.default || SftpClient)();
  const remoteDir  = cfg.sftp_path.replace(/\/$/, '');
  const remotePath = `${remoteDir}/${filename}`;
  try {
    await sftp.connect({
      host:     cfg.sftp_host,
      port:     cfg.sftp_port || 22,
      username: cfg.sftp_user,
      password: cfg.sftp_password || undefined,
      readyTimeout: 10000,
    });
    await sftp.mkdir(remoteDir, true).catch(() => {});
    await sftp.put(Buffer.from(jsonStr, 'utf8'), remotePath);
  } finally {
    sftp.end().catch(() => {});
  }
  return remotePath;
}

// ---- Haupt-Orchestrator ----

export async function runBackupForTenant(tenantId) {
  const tenants = getAllTenants();
  const tenant  = tenants.find(t => t.id === tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} nicht gefunden`);

  const db  = getDb(tenantId);
  const cfg = getBackupConfig(db);

  const filename = makeFilename(tenant.slug);
  const payload  = buildBackupPayload(db, tenant);
  const jsonStr  = JSON.stringify(payload);

  let targetDescription = '';

  try {
    switch (cfg.mode) {
      case 'local': {
        const dir = '/app/data/backups';
        saveLocal(jsonStr, dir, filename, cfg.retention_days, tenant.slug);
        targetDescription = `${dir}/${filename}`;
        break;
      }
      case 'path': {
        if (!cfg.path) throw new Error('Kein Ziel-Pfad konfiguriert');
        saveLocal(jsonStr, cfg.path, filename, cfg.retention_days, tenant.slug);
        targetDescription = `${cfg.path}/${filename}`;
        break;
      }
      case 's3': {
        if (!cfg.s3_bucket || !cfg.s3_key_id || !cfg.s3_secret)
          throw new Error('S3-Konfiguration unvollstaendig (Bucket, Key-ID oder Secret fehlt)');
        const key = await uploadS3(jsonStr, cfg, filename);
        targetDescription = `s3://${cfg.s3_bucket}/${key}`;
        break;
      }
      case 'sftp': {
        if (!cfg.sftp_host || !cfg.sftp_user)
          throw new Error('SFTP-Konfiguration unvollstaendig (Host oder Benutzer fehlt)');
        const path = await uploadSftp(jsonStr, cfg, filename);
        targetDescription = `sftp://${cfg.sftp_host}${path}`;
        break;
      }
      default:
        throw new Error(`Unbekannter Backup-Modus: ${cfg.mode}`);
    }

    setStatus(db, 'success', '', targetDescription);
    auditLog(db, null, 'auto_backup_success', { ip: 'system' }, { filename, target: targetDescription });
    console.log(`[AutoBackup] ${tenant.slug}: OK → ${targetDescription}`);
    return { ok: true, filename, target: targetDescription };
  } catch (err) {
    setStatus(db, 'error', err.message, '');
    auditLog(db, null, 'auto_backup_failed', { ip: 'system' }, { error: err.message });
    console.error(`[AutoBackup] ${tenant.slug}: FEHLER — ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ---- Tages-Scheduler ----

function currentUtcHour() {
  return new Date().getUTCHours();
}

function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

async function tick() {
  const hour = currentUtcHour();
  const day  = todayKey();

  for (const tenant of getAllTenants()) {
    if (lastRunDay[tenant.id] === day) continue;  // heute schon gelaufen
    try {
      const db  = getDb(tenant.id);
      const cfg = getBackupConfig(db);
      if (!cfg.enabled) continue;
      if (cfg.hour_utc !== hour) continue;

      lastRunDay[tenant.id] = day;
      await runBackupForTenant(tenant.id);
    } catch (err) {
      console.error(`[AutoBackup] Tick-Fehler fuer ${tenant.id}:`, err.message);
    }
  }
}

export function startAutoBackupScheduler() {
  if (schedulerTimer) return;
  setTimeout(() => {
    tick().catch(e => console.error('[AutoBackup] Erster Tick:', e.message));
    schedulerTimer = setInterval(() => {
      tick().catch(e => console.error('[AutoBackup] Tick:', e.message));
    }, CHECK_EVERY_MS);
  }, STARTUP_DELAY_MS);
  console.log('[AutoBackup] Scheduler aktiv — prueft jede Minute auf faelligen Backup');
}

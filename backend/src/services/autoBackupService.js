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

import {
  mkdirSync, readdirSync, unlinkSync, existsSync, statSync,
  openSync, writeSync, closeSync, renameSync, createReadStream, createWriteStream,
} from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
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
  'backup.last_attempt_day',
  'backup.db_snapshot', 'backup.snapshot_retention_days', 'backup.last_snapshot',
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
    last_attempt_day: raw.last_attempt_day || null,
    // Standardmaessig an: der Snapshot ist der einzige Weg, der sich ohne
    // Speicherprobleme zurueckspielen laesst.
    db_snapshot:    raw.db_snapshot !== '0',
    snapshot_retention_days: parseInt(raw.snapshot_retention_days ?? '14', 10),
    last_snapshot:  raw.last_snapshot  || null,
  };
}

export function setBackupConfig(db, updates) {
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)'
  );
  const set = (k, v) => upsert.run(`backup.${k}`, v ?? '');
  if (updates.enabled   !== undefined) set('enabled',  updates.enabled ? '1' : '0');
  if (updates.db_snapshot !== undefined) set('db_snapshot', updates.db_snapshot ? '1' : '0');
  if (updates.snapshot_retention_days !== undefined)
    set('snapshot_retention_days', String(updates.snapshot_retention_days));
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

// Zeilenweise auf Platte statt komplett in den Heap: Ein Tenant mit ~40 MB DB
// erzeugte als JS-Objektgraph plus JSON.stringify-Kopie mehrere hundert MB und
// sprengte das V8-Heap-Limit — der Prozess starb, bevor der catch-Zweig unten
// den Fehlerstatus schreiben konnte.
const FLUSH_AT_BYTES = 1 << 20;

function countRows(db, table) {
  try {
    return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  } catch {
    return 0;
  }
}

/** Schreibt das Backup-JSON streamend nach targetPath. Format identisch zu Version 2. */
export function writeBackupJson(db, tenant, targetPath, metaExtra = {}) {
  const counts = Object.fromEntries(BACKUP_TABLES.map(t => [t, countRows(db, t)]));
  const meta = {
    format:     'tesla-carview-backup',
    version:    2,
    exportedAt: new Date().toISOString(),
    ...metaExtra,
    tenant:     { id: tenant.id, slug: tenant.slug, name: tenant.name },
    counts,
  };

  const fd = openSync(targetPath, 'w');
  let buf = '';
  const push = (s) => {
    buf += s;
    if (buf.length >= FLUSH_AT_BYTES) {
      writeSync(fd, buf);
      buf = '';
    }
  };

  try {
    push(`{"meta":${JSON.stringify(meta)},"data":{`);
    BACKUP_TABLES.forEach((table, ti) => {
      push(`${ti ? ',' : ''}${JSON.stringify(table)}:[`);
      try {
        let ri = 0;
        for (const row of db.prepare(`SELECT * FROM ${table}`).iterate()) {
          push(`${ri++ ? ',' : ''}${JSON.stringify(row)}`);
        }
      } catch { /* Tabelle fehlt in dieser DB -> leeres Array */ }
      push(']');
    });
    push('}}');
    if (buf) writeSync(fd, buf);
  } finally {
    closeSync(fd);
  }
  return { bytes: statSync(targetPath).size, counts };
}

function makeFilename(slug) {
  return `tesla-carview-backup-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
}

// ---- Modus A + B: lokaler Pfad ----

function saveLocal(sourcePath, targetDir, filename, retentionDays, slug) {
  mkdirSync(targetDir, { recursive: true });
  renameSync(sourcePath, join(targetDir, filename));
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

async function uploadS3(sourcePath, cfg, filename) {
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
    Bucket:        cfg.s3_bucket,
    Key:           key,
    Body:          createReadStream(sourcePath),
    ContentLength: statSync(sourcePath).size,
    ContentType:   'application/json',
  }));
  return key;
}

// ---- Modus SFTP ----

async function uploadSftp(sourcePath, cfg, filename) {
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
    await sftp.put(sourcePath, remotePath);
  } finally {
    sftp.end().catch(() => {});
  }
  return remotePath;
}

// ---- Datenbank-Snapshot ----

/**
 * Konsistente, kompakte Kopie der Tenant-DB als `.db.gz`.
 *
 * Ergaenzt den JSON-Dump um den Weg, der im Ernstfall zaehlt: Eine
 * SQLite-Datei laesst sich direkt zurueckspielen, waehrend der JSON-Restore
 * die gesamte Sicherung als Objektgraph in den Speicher laedt (gemessen
 * 405 MB Spitze bei 92 MB Datei — mehr, als der Container uebrig hat).
 *
 * `VACUUM INTO` schreibt einen transaktional konsistenten Stand, auch waehrend
 * Schreibzugriffe laufen — anders als ein blosses Kopieren der Datei, das im
 * WAL-Modus einen zerrissenen Stand liefern kann. SQLite erledigt das intern,
 * der Node-Heap bleibt unberuehrt; das anschliessende Gzip laeuft streamend
 * (gemessen: 6 MB Heap, ~1 s fuer 44 MB, rund 50 % kleiner).
 */
export async function writeDbSnapshot(db, tenant, targetDir, retentionDays) {
  mkdirSync(targetDir, { recursive: true });
  const base    = `tesla-carview-snapshot-${tenant.slug}-${new Date().toISOString().slice(0, 10)}`;
  const rawPath = join(targetDir, `${base}.db`);
  const gzPath  = join(targetDir, `${base}.db.gz`);

  try { if (existsSync(rawPath)) unlinkSync(rawPath); } catch { /* ignore */ }
  // Parameterbindung statt String-Interpolation — der Pfad landet sonst
  // ungeprueft in einer SQL-Anweisung.
  db.prepare('VACUUM INTO ?').run(rawPath);

  try {
    await pipeline(createReadStream(rawPath), createGzip({ level: 6 }), createWriteStream(gzPath));
  } finally {
    try { unlinkSync(rawPath); } catch { /* ignore */ }
  }

  // Eigene, kuerzere Aufbewahrung als beim JSON: Snapshots dienen der schnellen
  // Wiederherstellung, nicht der Archivierung — und die Platte ist knapp.
  if (retentionDays > 0) {
    const cutoff = Date.now() - retentionDays * 86400 * 1000;
    try {
      readdirSync(targetDir)
        .filter(f => f.startsWith(`tesla-carview-snapshot-${tenant.slug}-`) && f.endsWith('.db.gz'))
        .forEach(f => {
          try {
            const full = join(targetDir, f);
            if (statSync(full).mtimeMs < cutoff) unlinkSync(full);
          } catch { /* ignore */ }
        });
    } catch { /* ignore rotation errors */ }
  }
  return { path: gzPath, bytes: statSync(gzPath).size };
}

// ---- Haupt-Orchestrator ----

export async function runBackupForTenant(tenantId) {
  const tenants = getAllTenants();
  const tenant  = tenants.find(t => t.id === tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} nicht gefunden`);

  const db  = getDb(tenantId);
  const cfg = getBackupConfig(db);

  const filename = makeFilename(tenant.slug);

  // Bei local/path liegt die Temp-Datei im Zielverzeichnis, damit der
  // abschliessende Rename atomar bleibt (ueber Mount-Grenzen scheitert er).
  const localDir = cfg.mode === 'local' ? '/app/data/backups'
                 : cfg.mode === 'path'  ? cfg.path
                 : null;
  if (cfg.mode === 'path' && !cfg.path) throw new Error('Kein Ziel-Pfad konfiguriert');
  if (localDir) mkdirSync(localDir, { recursive: true });
  const tmpPath = join(localDir ?? tmpdir(), `${filename}.part`);

  let targetDescription = '';

  try {
    const { bytes } = writeBackupJson(db, tenant, tmpPath, { source: 'auto-backup' });
    console.log(`[AutoBackup] ${tenant.slug}: ${(bytes / 1048576).toFixed(1)} MB geschrieben`);

    switch (cfg.mode) {
      case 'local':
      case 'path': {
        saveLocal(tmpPath, localDir, filename, cfg.retention_days, tenant.slug);
        targetDescription = `${localDir}/${filename}`;
        break;
      }
      case 's3': {
        if (!cfg.s3_bucket || !cfg.s3_key_id || !cfg.s3_secret)
          throw new Error('S3-Konfiguration unvollstaendig (Bucket, Key-ID oder Secret fehlt)');
        const key = await uploadS3(tmpPath, cfg, filename);
        targetDescription = `s3://${cfg.s3_bucket}/${key}`;
        break;
      }
      case 'sftp': {
        if (!cfg.sftp_host || !cfg.sftp_user)
          throw new Error('SFTP-Konfiguration unvollstaendig (Host oder Benutzer fehlt)');
        const path = await uploadSftp(tmpPath, cfg, filename);
        targetDescription = `sftp://${cfg.sftp_host}${path}`;
        break;
      }
      default:
        throw new Error(`Unbekannter Backup-Modus: ${cfg.mode}`);
    }

    // Snapshot als Zusatz: Ein Fehlschlag hier darf das gelungene JSON-Backup
    // nicht als gescheitert markieren, muss aber sichtbar bleiben.
    if (cfg.db_snapshot) {
      const snapDir = localDir ?? '/app/data/backups';
      const noteSnapshot = (v) => db
        .prepare('INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)')
        .run('backup.last_snapshot', v);
      try {
        const snap = await writeDbSnapshot(db, tenant, snapDir, cfg.snapshot_retention_days);
        noteSnapshot(`${new Date().toISOString()} ${snap.path}`);
        console.log(`[AutoBackup] ${tenant.slug}: DB-Snapshot ${(snap.bytes / 1048576).toFixed(1)} MB → ${snap.path}`);
      } catch (e) {
        noteSnapshot(`FEHLER ${new Date().toISOString()}: ${e.message}`);
        console.error(`[AutoBackup] ${tenant.slug}: DB-Snapshot fehlgeschlagen — ${e.message}`);
      }
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
  } finally {
    // Nach erfolgreichem local/path-Rename existiert die Datei nicht mehr.
    try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* ignore */ }
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
      if (cfg.last_attempt_day === day) {   // ueberlebt einen Prozessabsturz
        lastRunDay[tenant.id] = day;
        continue;
      }

      // Tagesmarke persistent und VOR dem Lauf setzen. Nur im Speicher gehalten
      // ging sie beim Prozessabsturz verloren, sodass der Backup-Versuch nach
      // jedem Neustart erneut startete — eine Absturzschleife ueber die volle
      // Stunde statt eines einzelnen fehlgeschlagenen Laufs.
      lastRunDay[tenant.id] = day;
      db.prepare('INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)')
        .run('backup.last_attempt_day', day);
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

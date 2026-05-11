import { Router } from 'express';
import { execSync } from 'child_process';
import os from 'os';
import { readFileSync, statSync, copyFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditLog } from '../services/auditService.js';
import {
  getAllTenants, getDb, getTenantById,
  setTenantStatus, renameTenant, dropTenant,
  regenerateTenantPseudonym,
} from '../db/database.js';
import { getFuzzingConfig, setFuzzingConfig } from '../services/gpsFuzzing.js';
import https from 'https';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
    return pkg.version ?? '1.0.0';
  } catch { return '1.0.0'; }
}

function getGitInfo() {
  if (process.env.GIT_HASH && process.env.GIT_HASH !== 'unknown') {
    return {
      hash:   process.env.GIT_HASH,
      branch: process.env.GIT_BRANCH ?? 'unknown',
      date:   process.env.BUILD_DATE ?? null,
    };
  }
  try {
    const hash   = execSync('git rev-parse --short HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    const date   = execSync('git log -1 --format=%ci 2>/dev/null', { encoding: 'utf8' }).trim();
    return { hash, branch, date };
  } catch { return { hash: 'unknown', branch: 'unknown', date: null }; }
}

// Public version endpoint (anyone authenticated can see version).
// Liefert auch die Copyright-/Lizenz-Attribution mit — nuetzlich fuer
// die Forensik bei Forks (laesst sich aus der laufenden Instanz heraus
// ueberpruefen, ob das Required-Notice intakt geblieben ist).
router.get('/version', requireAuth, (_req, res) => {
  res.json({
    version:     getVersion(),
    git:         getGitInfo(),
    nodeVersion: process.version,
    uptime:      process.uptime(),
    copyright:   '© 2024–2026 Sven Krische',
    license:     'PolyForm Noncommercial 1.0.0',
    licenseUrl:  'https://polyformproject.org/licenses/noncommercial/1.0.0/',
    repository:  'https://github.com/KnevS/Tesla-Carview',
  });
});

/** GET /api/system/maintenance-log — letzte naechtliche Wartungslaeufe.
 *  Admin-only. Zeigt was bereinigt wurde + Dauer + Fehlerstatus. */
router.get('/maintenance-log', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur Admin' });
  const { getMaintenanceLog } = await import('../services/nightlyMaintenance.js');
  res.json({
    auto_update_enabled: process.env.AUTO_UPDATE_ENABLED === 'true',
    runs: getMaintenanceLog(),
  });
});

/** POST /api/system/maintenance-now — manuell den Wartungslauf ausloesen
 *  (z.B. nach grossem Datenimport, ohne bis 03:30 warten zu wollen). */
router.post('/maintenance-now', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur Admin' });
  const { triggerNow } = await import('../services/nightlyMaintenance.js');
  try {
    const result = await triggerNow();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/system/health — kompakte Diagnose-Karte fuer Admins.
 *  Bewertet, ob die wichtigen Subsysteme „gruen" sind: Tesla-Token,
 *  Virtual Key, Fleet-Telemetry-Heartbeat, Poller, Datenbanken.
 *  Liefert pro Check status + Details, das Frontend zeigt eine farbige
 *  Ampel an. */
router.get('/health', requireAuth, (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const db = req.db;
  const now = Math.floor(Date.now() / 1000);
  const checks = [];

  // 1. Tesla OAuth Token
  try {
    const tok = db.prepare('SELECT expires_at FROM tokens ORDER BY id DESC LIMIT 1').get();
    if (!tok) {
      checks.push({ key: 'tesla_token', label: 'Tesla OAuth-Token', status: 'error',
        message: 'Nicht verbunden — Einstellungen → Tesla verbinden' });
    } else {
      const daysLeft = Math.floor((tok.expires_at - now) / 86400);
      const status = tok.expires_at < now ? 'error'
        : daysLeft < 7 ? 'warn' : 'ok';
      checks.push({ key: 'tesla_token', label: 'Tesla OAuth-Token', status,
        message: tok.expires_at < now ? 'Abgelaufen' :
          (daysLeft < 7 ? `Läuft in ${daysLeft} Tagen ab` : `Gültig (refresht automatisch)`),
        meta: { expires_at: tok.expires_at } });
    }
  } catch (e) {
    checks.push({ key: 'tesla_token', label: 'Tesla OAuth-Token', status: 'unknown', message: e.message });
  }

  // 2. Virtual Key
  try {
    const vk = db.prepare('SELECT created_at FROM virtual_key LIMIT 1').get();
    checks.push({ key: 'virtual_key', label: 'Virtual Key', status: vk ? 'ok' : 'warn',
      message: vk ? 'Erzeugt' : 'Nicht erzeugt — keine Fahrzeugbefehle möglich',
      meta: vk ? { created_at: vk.created_at } : null });
  } catch (e) {
    checks.push({ key: 'virtual_key', label: 'Virtual Key', status: 'unknown', message: e.message });
  }

  // 3. Fleet Telemetry: letzter empfangener telemetry_point
  try {
    const lastPt = db.prepare('SELECT MAX(timestamp) AS ts FROM telemetry_points').get()?.ts;
    if (!lastPt) {
      checks.push({ key: 'fleet_telemetry', label: 'Fleet Telemetry', status: 'warn',
        message: 'Noch keine Daten empfangen — beim Tesla Support beantragen' });
    } else {
      const mins = Math.round((now - lastPt) / 60);
      const status = mins > 60 * 24 ? 'warn' : 'ok';
      checks.push({ key: 'fleet_telemetry', label: 'Fleet Telemetry', status,
        message: mins < 60 ? `Letzter Datenpunkt vor ${mins} Min`
          : mins < 60 * 24 ? `Letzter Datenpunkt vor ${Math.round(mins/60)} h`
          : `Inaktiv seit ${Math.round(mins / 60 / 24)} Tagen`,
        meta: { last_point: lastPt } });
    }
  } catch (e) {
    checks.push({ key: 'fleet_telemetry', label: 'Fleet Telemetry', status: 'unknown', message: e.message });
  }

  // 4. Letztes Vehicle-Update (Poller-Heartbeat-Proxy: irgendein
  //    vehicle.odometer_km_updated_at — wenn das laeuft, laeuft der Poller)
  try {
    const v = db.prepare('SELECT MAX(state_updated_at) AS ts FROM vehicles').get()?.ts;
    if (!v) {
      checks.push({ key: 'poller', label: 'Tesla-Poller', status: 'warn',
        message: 'Keine Fahrzeug-Daten gepollt' });
    } else {
      const mins = Math.round((now - v) / 60);
      checks.push({ key: 'poller', label: 'Tesla-Poller', status: mins > 60 ? 'warn' : 'ok',
        message: mins < 5 ? 'Aktiv' : mins < 60 ? `Letztes Update vor ${mins} Min`
          : `Letztes Update vor ${Math.round(mins/60)} h`,
        meta: { last_update: v } });
    }
  } catch {
    checks.push({ key: 'poller', label: 'Tesla-Poller', status: 'unknown',
      message: 'Status nicht verfuegbar (vehicles.state_updated_at fehlt)' });
  }

  // 5. Datenbanken-Groesse — primaer informativ
  try {
    const tenantSize = db.prepare("SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()").get()?.size;
    checks.push({ key: 'tenant_db_size', label: 'Tenant-DB', status: 'ok',
      message: tenantSize ? `${(tenantSize/1024/1024).toFixed(1)} MB` : '–',
      meta: { bytes: tenantSize } });
  } catch (e) {
    checks.push({ key: 'tenant_db_size', label: 'Tenant-DB', status: 'unknown', message: e.message });
  }

  res.json({
    summary: checks.some(c => c.status === 'error') ? 'error'
           : checks.some(c => c.status === 'warn')  ? 'warn'
           : 'ok',
    uptime_seconds: process.uptime(),
    node_version:   process.version,
    checks,
  });
});

// Full system stats – admin only
router.get('/stats', requireAuth, (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Nur für Administratoren' });
  }

  const cpus    = os.cpus();
  const loadAvg = os.loadavg();
  const total   = os.totalmem();
  const free    = os.freemem();
  const used    = total - free;
  const cpuPct  = Math.min(100, (loadAvg[0] / cpus.length) * 100).toFixed(1);

  let dbSize = null;
  let dbStats = {};
  try {
    const db = req.db;
    const row = db.prepare("SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()").get();
    dbSize = row?.size ?? null;
    dbStats = {
      trips:             db.prepare('SELECT COUNT(*) AS n FROM trips').get().n,
      charging_sessions: db.prepare('SELECT COUNT(*) AS n FROM charging_sessions').get().n,
      battery_snapshots: db.prepare('SELECT COUNT(*) AS n FROM battery_snapshots').get().n,
      logbook_entries:   db.prepare('SELECT COUNT(*) AS n FROM logbook_entries').get().n,
      audit_logs:        db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n,
    };
  } catch { /* DB might not have all tables */ }

  // Mandanten-Übersicht (alle Mandanten, auch fremde — nur für Admin sichtbar)
  let tenants = { count: 0, items: [] };
  try {
    const list = getAllTenants();
    tenants.count = list.length;
    tenants.items = list.map(t => {
      let sizeByte = null, vehicleCount = 0, userCount = 0, lastActivity = null;
      try { sizeByte = statSync(t.db_path).size; } catch { /* db file missing */ }
      try {
        const tdb = getDb(t.id);
        vehicleCount = tdb.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n;
        userCount    = tdb.prepare('SELECT COUNT(*) AS n FROM users').get().n;
        lastActivity = tdb.prepare(
          'SELECT MAX(ts) AS ts FROM (SELECT MAX(start_time) AS ts FROM trips UNION SELECT MAX(start_time) AS ts FROM charging_sessions)'
        ).get()?.ts ?? null;
      } catch { /* tenant DB might be missing tables */ }
      return {
        id:           t.id,
        slug:         t.slug,
        name:         t.name,
        status:       t.status ?? 'active',
        suspendedAt:  t.suspended_at ?? null,
        createdAt:    t.created_at,
        sizeByte,
        vehicleCount,
        userCount,
        lastActivity,
        isSelf:       t.id === req.tenantId,
      };
    });
  } catch { /* master DB unavailable — leave defaults */ }

  res.json({
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAvg,
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model ?? 'unknown',
      cpuUsagePct: Number(cpuPct),
      memory: {
        total, used, free,
        usedPct: ((used / total) * 100).toFixed(1),
      },
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      nodeVersion: process.version,
      memUsage: process.memoryUsage(),
    },
    database: { sizeByte: dbSize, records: dbStats },
    tenants,
    version: getVersion(),
    git: getGitInfo(),
  });
});

// ───────────────────────── Mandanten-Verwaltung (admin) ─────────────────────────
// Detail-Ansicht eines einzelnen Mandanten
router.get('/tenants/:id', requireAuth, requireAdmin, (req, res) => {
  const t = getTenantById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Mandant nicht gefunden' });

  let sizeByte = null;
  try { sizeByte = statSync(t.db_path).size; } catch { /* missing */ }

  let vehicles = [], users = [], counts = {}, lastActivity = null;
  try {
    const tdb = getDb(t.id);
    vehicles = tdb.prepare(
      'SELECT id, vin, display_name, model, category, created_at FROM vehicles ORDER BY created_at'
    ).all();
    users = tdb.prepare(
      `SELECT id, username, email, role, lang, is_active, last_login, created_at
         FROM users ORDER BY created_at`
    ).all();
    counts = {
      trips:             tdb.prepare('SELECT COUNT(*) AS n FROM trips').get().n,
      charging_sessions: tdb.prepare('SELECT COUNT(*) AS n FROM charging_sessions').get().n,
      battery_snapshots: tdb.prepare('SELECT COUNT(*) AS n FROM battery_snapshots').get().n,
      telemetry_points:  tdb.prepare('SELECT COUNT(*) AS n FROM telemetry_points').get().n,
      logbook_entries:   tdb.prepare('SELECT COUNT(*) AS n FROM logbook_entries').get().n,
      audit_logs:        tdb.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n,
    };
    lastActivity = tdb.prepare(
      'SELECT MAX(ts) AS ts FROM (SELECT MAX(start_time) AS ts FROM trips UNION SELECT MAX(start_time) AS ts FROM charging_sessions)'
    ).get()?.ts ?? null;
  } catch { /* tenant DB unavailable */ }

  let pseudonymHistory = [];
  try { pseudonymHistory = JSON.parse(t.pseudonym_history || '[]'); } catch { /* invalid JSON */ }

  res.json({
    id:           t.id,
    slug:         t.slug,
    name:         t.name,
    pseudonym:    t.pseudonym,
    pseudonymHistory,
    status:       t.status ?? 'active',
    suspendedAt:  t.suspended_at ?? null,
    createdAt:    t.created_at,
    dbPath:       t.db_path,
    sizeByte,
    isSelf:       t.id === req.tenantId,
    vehicles, users, counts, lastActivity,
  });
});

// Mandant umbenennen (Name, nicht Slug)
router.patch('/tenants/:id', requireAuth, requireAdmin,
  validate(z.object({ name: z.string().trim().min(1).max(100) })),
  (req, res) => {
    const t = getTenantById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Mandant nicht gefunden' });
    renameTenant(t.id, req.body.name);
    auditLog(req.db, req.user.sub, 'tenant_renamed', req,
      { tenantId: t.id, oldName: t.name, newName: req.body.name });
    res.json({ ok: true, id: t.id, name: req.body.name });
  });

// Mandant pausieren — Login + Sync gestoppt
router.post('/tenants/:id/suspend', requireAuth, requireAdmin, (req, res) => {
  const t = getTenantById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Mandant nicht gefunden' });
  if (t.id === req.tenantId) {
    return res.status(400).json({ error: 'Eigenen Mandanten kann man nicht pausieren' });
  }
  setTenantStatus(t.id, 'suspended');
  auditLog(req.db, req.user.sub, 'tenant_suspended', req, { tenantId: t.id, slug: t.slug });
  res.json({ ok: true, id: t.id, status: 'suspended' });
});

// Pseudonym neu generieren — der nach aussen sichtbare Login-Identifier.
// Admin-only, weil ein Wechsel bedeutet, dass alle berechtigten User
// sich ab sofort den neuen Pseudonym merken muessen. Alter Name landet
// in pseudonym_history, Audit-Log behaelt den Verlauf.
router.post('/tenants/:id/regenerate-pseudonym', requireAuth, requireAdmin, (req, res) => {
  const t = getTenantById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Mandant nicht gefunden' });
  // Nur den eigenen Mandanten umbenennen lassen — sonst koennte ein
  // Admin-A in einem anderen Mandanten-B dort den Login-Identifier
  // wechseln, was die User in B aussperrt.
  if (t.id !== req.tenantId) {
    return res.status(403).json({ error: 'Nur der eigene Mandant kann sein Pseudonym aendern' });
  }
  try {
    const result = regenerateTenantPseudonym(t.id);
    auditLog(req.db, req.user.sub, 'tenant_pseudonym_regenerated', req,
      { tenantId: t.id, previous: result.previous, current: result.current });
    res.json({
      ok: true,
      previous_pseudonym: result.previous,
      current_pseudonym:  result.current,
      history_size:       result.history.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mandant reaktivieren
router.post('/tenants/:id/unsuspend', requireAuth, requireAdmin, (req, res) => {
  const t = getTenantById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Mandant nicht gefunden' });
  setTenantStatus(t.id, 'active');
  auditLog(req.db, req.user.sub, 'tenant_unsuspended', req, { tenantId: t.id, slug: t.slug });
  res.json({ ok: true, id: t.id, status: 'active' });
});

// Mandant löschen — mit Backup, dreifache Bestätigung
router.delete('/tenants/:id', requireAuth, requireAdmin,
  validate(z.object({
    confirm:          z.literal(true),
    confirmationText: z.string(),
  })),
  (req, res) => {
    const t = getTenantById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Mandant nicht gefunden' });
    if (t.id === req.tenantId) {
      return res.status(400).json({ error: 'Eigenen Mandanten kann man nicht löschen' });
    }
    if (req.body.confirmationText !== t.slug) {
      return res.status(400).json({ error: `Bitte exakt den Slug "${t.slug}" zur Bestätigung eingeben` });
    }

    // Backup vor dem Löschen
    let backupPath = null;
    try {
      if (existsSync(t.db_path)) {
        backupPath = t.db_path.replace(/\.db$/, `_deleted_${Date.now()}.db`);
        copyFileSync(t.db_path, backupPath);
      }
    } catch (e) {
      return res.status(500).json({ error: 'Backup fehlgeschlagen — Löschung abgebrochen', detail: e.message });
    }

    // Master-Einträge entfernen (Connection schließen, Master-Reihen weg)
    dropTenant(t.id);

    // DB-Datei + WAL/SHM löschen
    for (const suffix of ['', '-wal', '-shm']) {
      try { unlinkSync(t.db_path + suffix); } catch { /* darf fehlen */ }
    }

    auditLog(req.db, req.user.sub, 'tenant_deleted', req,
      { tenantId: t.id, slug: t.slug, name: t.name, backupPath });
    res.json({ ok: true, id: t.id, backupPath });
  });

// ───────────────────────── Mandanten-Standard-Sprache ─────────────────────────
// Whitelist analog zu users.lang (siehe users.js). Single-Source-of-Truth wäre eine
// gemeinsame Konstante; vorerst hier als kleines Array, da dies der einzige
// zweite Konsument ist.
const LOCALE_WHITELIST = ['de', 'en', 'fr', 'es', 'tr', 'el'];

router.get('/tenant-settings/default-locale', requireAuth, (req, res) => {
  const row = req.db.prepare(
    "SELECT value FROM tenant_settings WHERE key='i18n.default_locale'"
  ).get();
  res.json({ defaultLocale: row?.value || 'de' });
});

router.put('/tenant-settings/default-locale', requireAuth, requireAdmin,
  validate(z.object({ defaultLocale: z.enum(LOCALE_WHITELIST) })),
  (req, res) => {
    req.db.prepare(
      `INSERT INTO tenant_settings (key, value) VALUES ('i18n.default_locale', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(req.body.defaultLocale);
    auditLog(req.db, req.user.sub, 'tenant_default_locale_set', req,
      { defaultLocale: req.body.defaultLocale });
    res.json({ ok: true, defaultLocale: req.body.defaultLocale });
  });

// ───────────────────────── GPS-Fuzzing-Modus (Datenschutz) ─────────────────────
// Schuetzt die Genauigkeit von Trip-Start/Ende-Koordinaten, indem neue
// Trips auf ein Gitter mit Radius X gerundet werden. Bestehende Trips
// bleiben unberuehrt. Telemetrie-Punkte / Trip-Track bleiben praezise —
// gefuzzt werden nur die aggregierten Start/End-Lat/Lon der trips-Tabelle.
router.get('/tenant-settings/gps-fuzzing', requireAuth, (req, res) => {
  try {
    res.json(getFuzzingConfig(req.db));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tenant-settings/gps-fuzzing', requireAuth, requireAdmin,
  validate(z.object({
    enabled:  z.boolean(),
    radius_m: z.number().int().min(50).max(5000),
  })),
  (req, res) => {
    try {
      setFuzzingConfig(req.db, req.body);
      auditLog(req.db, req.user.sub, 'tenant_gps_fuzzing_set', req, req.body);
      res.json({ ok: true, ...getFuzzingConfig(req.db) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'tesla-carview' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

router.get('/update-check', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const current = getGitInfo();
  try {
    const data = await fetchJson('https://api.github.com/repos/KnevS/Tesla-Carview/commits/main');
    const latestHash   = data.sha?.slice(0, 7) ?? null;
    const latestDate   = data.commit?.committer?.date ?? null;
    const latestMsg    = data.commit?.message?.split('\n')[0] ?? null;
    const updateAvailable = latestHash && current.hash !== 'unknown' && latestHash !== current.hash;
    res.json({ current: current.hash, currentDate: current.date, latest: latestHash, latestDate, latestMsg, updateAvailable });
  } catch (e) {
    res.status(502).json({ error: 'GitHub nicht erreichbar', current: current.hash });
  }
});

export default router;

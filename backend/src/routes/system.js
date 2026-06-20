// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { execSync } from 'child_process';
import os from 'os';
import { sendEmail, isSmtpConfigured } from '../utils/email.js';
import { readFileSync, statSync, copyFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditLog } from '../services/auditService.js';
import geoip from 'geoip-lite';
import {
  getAllTenants, getDb, getTenantById,
  setTenantStatus, renameTenant, dropTenant,
  regenerateTenantPseudonym,
} from '../db/database.js';
import { getFuzzingConfig, setFuzzingConfig } from '../services/gpsFuzzing.js';
import { getTenantStatus as getCircuitStatus, CIRCUIT_THRESHOLD } from '../services/teslaCircuitBreaker.js';
import { getBackupConfig, setBackupConfig, runBackupForTenant } from '../services/autoBackupService.js';
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

// Country → language mapping (one dominant language per country).
// Used by the frontend as last-resort fallback when navigator.language
// doesn't match a supported locale.
const COUNTRY_LOCALE = {
  DE: 'de', AT: 'de', CH: 'de', LI: 'de', LU: 'de',
  FR: 'fr', BE: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', MA: 'fr', DZ: 'fr', TN: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
         UY: 'es', EC: 'es', BO: 'es', PY: 'es', CR: 'es', PA: 'es', GT: 'es',
         HN: 'es', SV: 'es', NI: 'es', DO: 'es', CU: 'es',
  TR: 'tr',
  GR: 'el', CY: 'el',
};
const SUPPORTED = new Set(['de', 'en', 'fr', 'es', 'tr', 'el']);

// Public — no auth, called before login to detect locale from client IP.
router.get('/geolocale', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress || '').trim();
  const geo = geoip.lookup(ip);
  const locale = (geo?.country && COUNTRY_LOCALE[geo.country]) || 'de';
  res.json({ locale, country: geo?.country ?? null });
});

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
    copyright:   '© 2026 Sven Krische',
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
router.get('/health', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const db = req.db;
  const now = Math.floor(Date.now() / 1000);
  const checks = [];
  const authMode = (() => {
    try { return db.prepare("SELECT value FROM tenant_settings WHERE key='tesla.auth_mode'").get()?.value || 'fleet'; }
    catch { return 'fleet'; }
  })();

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

  // 1b. Tesla API-Modus — surface Owner-API-Limitierung sichtbar:
  //     ownerapi-Tokens werden seit 2026 von der Fleet API mit HTTP 401
  //     abgelehnt (siehe CHANGELOG v3.4.23). Wir behalten den Modus aber
  //     bei, damit Admins ihn pausieren statt loeschen koennen.
  if (authMode === 'owner') {
    const paused = (() => {
      try { return db.prepare("SELECT value FROM tenant_settings WHERE key='tesla.owner_api_paused'").get()?.value === 'true'; }
      catch { return false; }
    })();
    if (paused) {
      checks.push({ key: 'tesla_api_mode', label: 'Tesla API-Modus', status: 'info',
        message: 'Owner API verbunden, pausiert (Tokens behalten)' });
    } else {
      checks.push({ key: 'tesla_api_mode', label: 'Tesla API-Modus', status: 'warn',
        message: 'Owner API: Tesla blockiert Vehicle-Daten (HTTP 401). Bitte Fleet OAuth nutzen oder Owner API pausieren.' });
    }
  }

  // 2. Virtual Key
  try {
    if (authMode === 'owner') {
      checks.push({ key: 'virtual_key', label: 'Virtual Key', status: 'info',
        message: 'Im Owner API-Modus nicht erforderlich' });
    } else {
      const vk = db.prepare('SELECT created_at FROM virtual_key LIMIT 1').get();
      checks.push({ key: 'virtual_key', label: 'Virtual Key', status: vk ? 'ok' : 'warn',
        message: vk ? 'Erzeugt' : 'Nicht erzeugt — keine Fahrzeugbefehle möglich',
        meta: vk ? { created_at: vk.created_at } : null });
    }
  } catch (e) {
    checks.push({ key: 'virtual_key', label: 'Virtual Key', status: 'unknown', message: e.message });
  }

  // 3. Fleet Telemetry: letzter empfangener telemetry_point
  try {
    if (authMode === 'owner') {
      checks.push({ key: 'fleet_telemetry', label: 'Fleet Telemetry', status: 'info',
        message: 'Im Owner API-Modus nicht verfügbar — benötigt Fleet API-Zulassung' });
    } else {
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

  // 5. Tesla API Circuit Breaker — zeigt, ob der Poller diesen
  //    Mandanten gerade wegen 403-Serie pausiert hat. Wenn open:
  //    Tesla-Account ist wahrscheinlich gesperrt (Billing-Limit), und
  //    der Admin sollte in developer.tesla.com nachsehen.
  try {
    const cb = getCircuitStatus(req.tenantId);
    if (cb.open) {
      const minsLeft = Math.max(1, Math.round((cb.paused_until_ms - Date.now()) / 60000));
      checks.push({ key: 'tesla_circuit_breaker', label: 'Tesla API Circuit Breaker', status: 'error',
        message: `Pausiert für ~${minsLeft} Min — Tesla-Account vermutlich gesperrt. ` +
          `Bitte in developer.tesla.com Billing & Limits prüfen.`,
        meta: cb });
    } else if (cb.consecutive_403s > 0) {
      checks.push({ key: 'tesla_circuit_breaker', label: 'Tesla API Circuit Breaker', status: 'warn',
        message: `${cb.consecutive_403s}/${CIRCUIT_THRESHOLD} aufeinanderfolgende 403er — bei ${CIRCUIT_THRESHOLD} pausiert der Poller`,
        meta: cb });
    } else {
      checks.push({ key: 'tesla_circuit_breaker', label: 'Tesla API Circuit Breaker', status: 'ok',
        message: 'Geschlossen — Tesla-API antwortet normal',
        meta: cb });
    }
  } catch (e) {
    checks.push({ key: 'tesla_circuit_breaker', label: 'Tesla API Circuit Breaker', status: 'unknown', message: e.message });
  }

  // 6. Datenbanken-Groesse — primaer informativ
  try {
    const tenantSize = db.prepare("SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()").get()?.size;
    checks.push({ key: 'tenant_db_size', label: 'Tenant-DB', status: 'ok',
      message: tenantSize ? `${(tenantSize/1024/1024).toFixed(1)} MB` : '–',
      meta: { bytes: tenantSize } });
  } catch (e) {
    checks.push({ key: 'tenant_db_size', label: 'Tenant-DB', status: 'unknown', message: e.message });
  }

  // 7. OpenChargeMap — Ladestationen im Routenplaner
  {
    const ocmKey = (() => {
      try {
        const row = db?.prepare("SELECT value FROM tenant_settings WHERE key='ocm_api_key'").get();
        if (row?.value) return row.value;
      } catch { /* ignore */ }
      return process.env.OPENCHARGEMAP_API_KEY || null;
    })();

    if (!ocmKey) {
      checks.push({ key: 'ocm', label: 'OpenChargeMap (Ladestationen)', status: 'info',
        message: 'Kein API-Key konfiguriert — Schnellladestationen im Routenplaner nicht verfügbar' });
    } else {
      try {
        const url = `https://api.openchargemap.io/v3/poi/?maxresults=1&compact=true&verbose=false&latitude=48.137&longitude=11.576&key=${ocmKey}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (r.status === 403) {
          checks.push({ key: 'ocm', label: 'OpenChargeMap (Ladestationen)', status: 'error',
            message: 'API-Key ungültig oder abgelaufen — neuen Key in Einstellungen eintragen' });
        } else if (r.ok) {
          const data = await r.json();
          checks.push({ key: 'ocm', label: 'OpenChargeMap (Ladestationen)', status: 'ok',
            message: `Verbunden — API antwortet (${Array.isArray(data) ? data.length : '?'} Treffer bei Testabfrage)` });
        } else {
          checks.push({ key: 'ocm', label: 'OpenChargeMap (Ladestationen)', status: 'warn',
            message: `Unerwarteter HTTP ${r.status}` });
        }
      } catch (e) {
        checks.push({ key: 'ocm', label: 'OpenChargeMap (Ladestationen)', status: 'warn',
          message: 'Nicht erreichbar: ' + e.message });
      }
    }
  }

  // 8. HERE Maps — Echtzeit-Verkehr im Routenplaner
  {
    const hereKey = (() => {
      try { return db?.prepare("SELECT value FROM tenant_settings WHERE key='here_api_key'").get()?.value || null; }
      catch { return null; }
    })();

    if (!hereKey) {
      checks.push({ key: 'here', label: 'HERE Maps (Echtzeit-Verkehr)', status: 'info',
        message: 'Kein API-Key konfiguriert — Echtzeit-Verkehr im Routenplaner nicht verfügbar' });
    } else {
      try {
        const url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=48.137,11.576&destination=52.52,13.405&return=summary&apiKey=${hereKey}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (r.status === 401 || r.status === 403) {
          checks.push({ key: 'here', label: 'HERE Maps (Echtzeit-Verkehr)', status: 'error',
            message: 'API-Key ungültig oder abgelaufen — in Einstellungen → Routenplaner aktualisieren' });
        } else if (r.ok) {
          checks.push({ key: 'here', label: 'HERE Maps (Echtzeit-Verkehr)', status: 'ok',
            message: 'Verbunden — Echtzeit-Verkehrsdaten aktiv' });
        } else {
          checks.push({ key: 'here', label: 'HERE Maps (Echtzeit-Verkehr)', status: 'warn',
            message: `Unerwarteter HTTP ${r.status}` });
        }
      } catch (e) {
        checks.push({ key: 'here', label: 'HERE Maps (Echtzeit-Verkehr)', status: 'warn',
          message: 'Nicht erreichbar: ' + e.message });
      }
    }
  }

  res.json({
    summary: checks.some(c => c.status === 'error') ? 'error'
           : checks.some(c => c.status === 'warn')  ? 'warn'
           : 'ok',
    auth_mode: authMode,
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
    // Fetch recent commits and skip CI bot commits (version-badge, wiki-sync)
    // so automated housekeeping commits don't falsely trigger an update banner.
    const commits = await fetchJson(
      'https://api.github.com/repos/KnevS/Tesla-Carview/commits?sha=main&per_page=10'
    );
    const realCommit = Array.isArray(commits)
      ? commits.find(c =>
          c.committer?.login !== 'github-actions[bot]' &&
          c.author?.login    !== 'github-actions[bot]'
        )
      : null;
    const latestHash = realCommit?.sha?.slice(0, 7) ?? null;
    const latestDate = realCommit?.commit?.committer?.date ?? null;
    const latestMsg  = realCommit?.commit?.message?.split('\n')[0] ?? null;
    // GIT_HASH may be a full 40-char SHA (set by CI via github.sha) or a short
    // 7-char hash (set by the old server-side git rev-parse). Normalise to 7
    // chars before comparing so both sources match.
    const currentShort = current.hash !== 'unknown' ? current.hash.slice(0, 7) : 'unknown';
    const updateAvailable = latestHash && currentShort !== 'unknown' && currentShort !== latestHash;
    res.json({ current: currentShort, currentDate: current.date, latest: latestHash, latestDate, latestMsg, updateAvailable });
  } catch (e) {
    res.status(502).json({ error: 'GitHub nicht erreichbar', current: current.hash });
  }
});


// POST /api/system/update/trigger — fires the configured deploy webhook.
// Activate by setting DEPLOY_WEBHOOK_URL in backend/.env (any webhook-based
// deploy system works: Dokploy, Coolify, Portainer webhooks, etc.).
// Returns 501 when not configured so the frontend can hide the button.
router.post('/update/trigger', requireAuth, requireAdmin, async (req, res) => {
  const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
  if (!webhookUrl) return res.status(501).json({ error: 'DEPLOY_WEBHOOK_URL nicht konfiguriert' });
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error('Webhook Status ' + resp.status + (txt ? ': ' + txt.slice(0, 120) : ''));
    }
    auditLog(req.db, req.user.sub, 'system_update_triggered', req, {});
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// POST /api/system/container-restart — graceful Node.js exit.
// Docker restart-policy (unless-stopped) bringt den Container automatisch
// wieder hoch. Antwort wird vor dem Exit gesendet; Neustart dauert ~2-3 s.
router.post('/container-restart', requireAuth, requireAdmin, (req, res) => {
  auditLog(req.db, req.user.sub, 'container_restart', req, {});
  res.json({ ok: true, message: 'Container wird neu gestartet…' });
  // Kurze Verzögerung damit die Response noch rausgeht, dann Exit
  setTimeout(() => process.exit(0), 400);
});

// In-Memory-Timer für geplante Neustarts. Lebt nur im aktuellen Prozess —
// das ist OK: wenn der Container zwischenzeitlich aus anderem Grund neu
// startet, ist der Plan ohnehin überflüssig. Nur EIN Timer gleichzeitig.
let _scheduledRestart = null;

// POST /api/system/container-restart-schedule { delaySec, reason? }
//   delaySec = 0       → sofort (wie /container-restart)
//   delaySec > 0       → setTimeout für genau diesen Zeitpunkt
//   delaySec = null/-1 → vorhandenen geplanten Restart abbrechen
router.post('/container-restart-schedule', requireAuth, requireAdmin, (req, res) => {
  const { delaySec, reason } = req.body || {};
  const num = Number(delaySec);

  if (delaySec === null || num < 0) {
    if (_scheduledRestart) {
      clearTimeout(_scheduledRestart.timer);
      _scheduledRestart = null;
    }
    auditLog(req.db, req.user.sub, 'container_restart_cancelled', req, {});
    return res.json({ cancelled: true });
  }

  if (!Number.isFinite(num) || num < 0 || num > 86400) {
    return res.status(400).json({ error: 'delaySec muss zwischen 0 und 86400 (24h) liegen' });
  }

  if (_scheduledRestart) clearTimeout(_scheduledRestart.timer);

  if (num === 0) {
    auditLog(req.db, req.user.sub, 'container_restart', req, { reason: reason || null });
    res.json({ ok: true, scheduled_for: new Date().toISOString(), immediate: true });
    setTimeout(() => process.exit(0), 400);
    return;
  }

  const scheduledFor = new Date(Date.now() + num * 1000);
  _scheduledRestart = {
    scheduledFor, reason: reason || null, requestedBy: req.user.sub,
    timer: setTimeout(() => {
      console.log(`[Restart] Geplanter Neustart fällig (Verzögerung ${num}s, Grund: ${reason || '-'})`);
      _scheduledRestart = null;
      process.exit(0);
    }, num * 1000),
  };
  auditLog(req.db, req.user.sub, 'container_restart_scheduled', req, {
    delaySec: num, reason: reason || null,
  });
  res.json({
    scheduled_for: scheduledFor.toISOString(),
    delay_sec:     num,
    immediate:     false,
  });
});

// GET /api/system/container-restart-schedule — Status des aktuellen Plans.
// Frontend ruft das, um „Neustart in 4:32 min" zu zeigen.
router.get('/container-restart-schedule', requireAuth, requireAdmin, (_req, res) => {
  if (!_scheduledRestart) return res.json({ scheduled: false });
  const remainingMs = _scheduledRestart.scheduledFor.getTime() - Date.now();
  res.json({
    scheduled:     true,
    scheduled_for: _scheduledRestart.scheduledFor.toISOString(),
    remaining_sec: Math.max(0, Math.round(remainingMs / 1000)),
    reason:        _scheduledRestart.reason,
  });
});

// ── Monitoring-Konfiguration ─────────────────────────────────────────────────

const MONITORING_KEYS = ['monitoring.alert_email', 'monitoring.heal_enabled', 'monitoring.anthropic_key'];

router.get('/monitoring-config', requireAuth, requireAdmin, (req, res) => {
  const rows = req.db.prepare(
    `SELECT key, value FROM tenant_settings WHERE key IN (${MONITORING_KEYS.map(() => '?').join(',')})`
  ).all(...MONITORING_KEYS);
  const cfg = Object.fromEntries(rows.map(r => [r.key.replace('monitoring.', ''), r.value]));
  res.json({
    alert_email:          cfg.alert_email   ?? '',
    heal_enabled:         cfg.heal_enabled  !== 'false',  // default: true
    anthropic_configured: !!(cfg.anthropic_key),
  });
});

router.put('/monitoring-config', requireAuth, requireAdmin, (req, res) => {
  const { alert_email, heal_enabled, anthropic_key } = req.body;
  const upsert = req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  );
  if (alert_email !== undefined) {
    if (typeof alert_email !== 'string' || (alert_email && !/^[^@]+@[^@]+\.[^@]+$/.test(alert_email))) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }
    upsert.run('monitoring.alert_email', alert_email);
  }
  if (heal_enabled !== undefined) upsert.run('monitoring.heal_enabled', String(heal_enabled));
  if (anthropic_key && typeof anthropic_key === 'string' && anthropic_key.trim())
    upsert.run('monitoring.anthropic_key', anthropic_key.trim());
  res.json({ ok: true });
});

// E-Mail-Host-Status: prüft ob msmtp auf dem Host installiert und konfiguriert ist
router.get('/email-status', requireAuth, requireAdmin, (_req, res) => {
  const installed = ['/usr/bin/msmtp', '/usr/local/bin/msmtp'].some(p => existsSync(p));
  const configured = ['/etc/msmtprc', '/root/.msmtprc'].some(p => {
    try { return existsSync(p) && statSync(p).size > 20; } catch { return false; }
  });
  res.json({ installed, configured });
});

// Letzte N Zeilen aus Heal-Log und Security-Check-Log
router.get('/monitoring-log', requireAuth, requireAdmin, (req, res) => {
  const n = Math.min(parseInt(req.query.lines) || 50, 200);
  const tail = (path) => {
    try {
      return execSync(`tail -${n} ${path} 2>/dev/null || true`, { encoding: 'utf8' })
        .split('\n').filter(Boolean);
    } catch { return []; }
  };
  res.json({
    heal:     tail('/var/log/tcv-heal.log'),
    security: tail('/var/log/security-check.log'),
  });
});

// ── SMTP-Konfiguration ───────────────────────────────────────────────────────

const SMTP_KEYS = ['smtp.host', 'smtp.port', 'smtp.user', 'smtp.password', 'smtp.from'];

router.get('/smtp-config', requireAuth, requireAdmin, (req, res) => {
  const rows = req.db.prepare(
    `SELECT key, value FROM tenant_settings WHERE key IN (${SMTP_KEYS.map(() => '?').join(',')})`
  ).all(...SMTP_KEYS);
  const cfg = Object.fromEntries(rows.map(r => [r.key.replace('smtp.', ''), r.value]));
  res.json({
    host:        cfg.host  || '',
    port:        cfg.port  || '587',
    user:        cfg.user  || '',
    from:        cfg.from  || '',
    configured:  !!(cfg.host && cfg.user && cfg.password),
  });
});

router.put('/smtp-config', requireAuth, requireAdmin, (req, res) => {
  const { host, port, user, password, from } = req.body;
  const upsert = req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  );
  if (host     !== undefined) upsert.run('smtp.host', host.trim());
  if (port     !== undefined) upsert.run('smtp.port', String(parseInt(port) || 587));
  if (user     !== undefined) upsert.run('smtp.user', user.trim());
  if (password && typeof password === 'string' && password.trim())
    upsert.run('smtp.password', password.trim());
  if (from     !== undefined) upsert.run('smtp.from', from.trim());
  res.json({ ok: true });
});

// ── Auto-Backup-Konfiguration ────────────────────────────────────────────────

router.get('/backup-config', requireAuth, requireAdmin, (req, res) => {
  const cfg = getBackupConfig(req.db);
  // Sensible Felder maskieren — Frontend zeigt "••••••" wenn gesetzt
  res.json({
    ...cfg,
    s3_secret:     cfg.s3_secret     ? '••••••' : '',
    sftp_password: cfg.sftp_password ? '••••••' : '',
    s3_secret_set:     !!cfg.s3_secret,
    sftp_password_set: !!cfg.sftp_password,
  });
});

router.put('/backup-config', requireAuth, requireAdmin, (req, res) => {
  const allowed = [
    'enabled', 'mode', 'hour_utc', 'retention_days', 'path',
    's3_bucket', 's3_region', 's3_endpoint', 's3_key_id', 's3_secret', 's3_prefix',
    'sftp_host', 'sftp_port', 'sftp_user', 'sftp_password', 'sftp_path',
  ];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (updates.mode && !['local', 'path', 's3', 'sftp'].includes(updates.mode)) {
    return res.status(400).json({ error: 'Ungültiger Modus' });
  }
  if (updates.hour_utc !== undefined) {
    updates.hour_utc = parseInt(updates.hour_utc, 10);
    if (isNaN(updates.hour_utc) || updates.hour_utc < 0 || updates.hour_utc > 23)
      return res.status(400).json({ error: 'Stunde muss 0–23 sein' });
  }
  // Leerer String = "nicht ändern" für Passwortfelder
  if (updates.s3_secret     === '••••••') delete updates.s3_secret;
  if (updates.sftp_password === '••••••') delete updates.sftp_password;
  setBackupConfig(req.db, updates);
  auditLog(req.db, req.user.sub, 'backup_config_updated', req, { mode: updates.mode });
  res.json({ ok: true });
});

router.post('/backup-now', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await runBackupForTenant(req.tenantId);
    if (result.ok) {
      auditLog(req.db, req.user.sub, 'manual_backup_triggered', req, { target: result.target });
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/smtp-test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const to = req.body?.to || req.user?.email;
    if (!to) return res.status(400).json({ error: 'Empfänger fehlt' });
    await sendEmail(req.db, {
      to,
      subject: 'Tesla Carview — Test-E-Mail',
      text: `Test-E-Mail von Tesla Carview.\nZeit: ${new Date().toISOString()}\nServer: ${os.hostname()}`,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ── Tesla Fleet-API Credentials ──────────────────────────────────────────────

router.get('/tesla-credentials', requireAuth, requireAdmin, (req, res) => {
  const keys = ['tesla.client_id', 'tesla.client_secret', 'tesla.audience', 'tesla.auth_base', 'tesla.partner_registered_domain'];
  const rows = req.db.prepare(
    `SELECT key, value FROM tenant_settings WHERE key IN (${keys.map(() => '?').join(',')})`
  ).all(...keys);
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
  // Betriebs-Domain: FRONTEND_URL ist autoritativ, sonst der aktuelle Host —
  // das ist die Domain, die TeslaView bei der Partner-Registrierung verwendet
  // und die der Wizard zur einmaligen Bestätigung anzeigt.
  const domain = (process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || (req.headers.host || ''))
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
  res.json({
    client_id:   cfg['tesla.client_id']   || (process.env.TESLA_CLIENT_ID   ? '(aus .env)' : ''),
    client_secret_set: !!(cfg['tesla.client_secret'] || process.env.TESLA_CLIENT_SECRET),
    audience:    cfg['tesla.audience']    || process.env.TESLA_AUDIENCE    || '',
    auth_base:   cfg['tesla.auth_base']   || process.env.TESLA_AUTH_BASE   || '',
    from_env: !cfg['tesla.client_id'] && !!process.env.TESLA_CLIENT_ID,
    domain,
    partner_registered_domain: cfg['tesla.partner_registered_domain'] || '',
  });
});

router.put('/tesla-credentials', requireAuth, requireAdmin, (req, res) => {
  const { client_id, client_secret, audience, auth_base } = req.body;
  const upsert = req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  );
  if (client_id     !== undefined) upsert.run('tesla.client_id',     client_id.trim());
  if (client_secret && typeof client_secret === 'string' && client_secret.trim() && !client_secret.startsWith('••'))
    upsert.run('tesla.client_secret', client_secret.trim());
  if (audience      !== undefined) upsert.run('tesla.audience',      audience.trim());
  if (auth_base     !== undefined) upsert.run('tesla.auth_base',     auth_base.trim());
  auditLog(req.db, req.user.sub, 'tesla_credentials_updated', req, {});
  res.json({ ok: true });
});

// ── VAPID / Web Push ──────────────────────────────────────────────────────────

router.get('/vapid-config', requireAuth, requireAdmin, (req, res) => {
  const keys = ['vapid.public_key', 'vapid.private_key', 'vapid.contact'];
  const rows = req.db.prepare(
    `SELECT key, value FROM tenant_settings WHERE key IN (${keys.map(() => '?').join(',')})`
  ).all(...keys);
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const pubKey = cfg['vapid.public_key'] || process.env.VAPID_PUBLIC_KEY || '';
  res.json({
    public_key:      pubKey,
    private_key_set: !!(cfg['vapid.private_key'] || process.env.VAPID_PRIVATE_KEY),
    contact:         cfg['vapid.contact'] || process.env.VAPID_CONTACT || '',
    configured:      !!(pubKey && (cfg['vapid.private_key'] || process.env.VAPID_PRIVATE_KEY)),
    from_env:        !cfg['vapid.public_key'] && !!process.env.VAPID_PUBLIC_KEY,
  });
});

router.put('/vapid-config', requireAuth, requireAdmin, (req, res) => {
  const { public_key, private_key, contact } = req.body;
  const upsert = req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  );
  if (public_key  !== undefined) upsert.run('vapid.public_key',  public_key.trim());
  if (private_key && typeof private_key === 'string' && private_key.trim() && !private_key.startsWith('••'))
    upsert.run('vapid.private_key', private_key.trim());
  if (contact     !== undefined) {
    // Web-Push verlangt URL oder mailto:-URI. Plain-E-Mail vom Admin-UI
    // wird transparent mit mailto: präfixt, damit setVapidDetails() später
    // nicht „Vapid subject is not a valid URL" wirft.
    const c = (contact || '').trim();
    const normalized =
      !c                            ? '' :
      /^(https?|mailto):/i.test(c)  ? c :
      c.includes('@')               ? `mailto:${c}` :
                                      c;
    upsert.run('vapid.contact', normalized);
  }
  auditLog(req.db, req.user.sub, 'vapid_config_updated', req, {});
  res.json({ ok: true });
});

router.post('/vapid-generate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const webPush = await import('web-push');
    const generateVAPIDKeys = webPush.generateVAPIDKeys ?? webPush.default?.generateVAPIDKeys;
    if (typeof generateVAPIDKeys !== 'function') throw new Error('web-push: generateVAPIDKeys nicht gefunden');
    const keys = generateVAPIDKeys();
    const upsert = req.db.prepare(
      "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    );
    upsert.run('vapid.public_key',  keys.publicKey);
    upsert.run('vapid.private_key', keys.privateKey);
    auditLog(req.db, req.user.sub, 'vapid_keys_generated', req, {});
    res.json({ public_key: keys.publicKey, configured: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Telegram Bot ──────────────────────────────────────────────────────────────

router.get('/telegram-config', requireAuth, requireAdmin, (req, res) => {
  const keys = ['telegram.bot_token', 'telegram.webhook_url'];
  const rows = req.db.prepare(
    `SELECT key, value FROM tenant_settings WHERE key IN (${keys.map(() => '?').join(',')})`
  ).all(...keys);
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({
    bot_token_set:  !!(cfg['telegram.bot_token']  || process.env.TELEGRAM_BOT_TOKEN),
    webhook_url:    cfg['telegram.webhook_url'] || process.env.TELEGRAM_WEBHOOK_URL || '',
    configured:     !!(cfg['telegram.bot_token']  || process.env.TELEGRAM_BOT_TOKEN),
    from_env:       !cfg['telegram.bot_token']     && !!process.env.TELEGRAM_BOT_TOKEN,
  });
});

router.put('/telegram-config', requireAuth, requireAdmin, (req, res) => {
  const { bot_token, webhook_url } = req.body;
  const upsert = req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  );
  if (bot_token && typeof bot_token === 'string' && bot_token.trim() && !bot_token.includes('••'))
    upsert.run('telegram.bot_token', bot_token.trim());
  if (webhook_url !== undefined) upsert.run('telegram.webhook_url', webhook_url.trim());
  auditLog(req.db, req.user.sub, 'telegram_config_updated', req, {});
  res.json({ ok: true, restart_required: true });
});

// ── ABRP Global API Key ────────────────────────────────────────────────────────

router.get('/abrp-config', requireAuth, requireAdmin, (req, res) => {
  const row = req.db.prepare("SELECT value FROM tenant_settings WHERE key='abrp.api_key'").get();
  const key = row?.value || '';
  res.json({
    configured: !!(key || process.env.ABRP_API_KEY),
    masked:     key ? key.slice(0, 8) + '…' + key.slice(-4) : (process.env.ABRP_API_KEY ? '(aus .env)' : ''),
    from_env:   !key && !!process.env.ABRP_API_KEY,
  });
});

router.put('/abrp-config', requireAuth, requireAdmin, (req, res) => {
  const { abrp_api_key } = req.body;
  if (abrp_api_key === '' || abrp_api_key == null) {
    req.db.prepare("DELETE FROM tenant_settings WHERE key='abrp.api_key'").run();
    return res.json({ configured: false });
  }
  if (typeof abrp_api_key !== 'string' || abrp_api_key.length < 4) {
    return res.status(400).json({ error: 'Ungültiger ABRP API-Key' });
  }
  req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES ('abrp.api_key',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(abrp_api_key);
  auditLog(req.db, req.user.sub, 'abrp_config_updated', req, {});
  res.json({ configured: true, masked: abrp_api_key.slice(0, 8) + '…' + abrp_api_key.slice(-4) });
});


// ── Wizard Prefill ────────────────────────────────────────────────────────────
//
// Liefert dem Admin-Setup-Wizard auf einen Schwung zwei Dinge:
//   1. Defaults für leere Felder (Geo-IP → Audience, Admin-Mail → Alert-Mail,
//      Land → Strompreis-Default …). So muss der Admin diese Werte nicht
//      selbst nachschlagen oder doppelt tippen.
//   2. Status pro Wizard-Schritt: was ist bereits konfiguriert/ausgeführt?
//      Das Frontend kann erledigte Schritte einklappen, sodass nur die
//      tatsächlich offenen Schritte expandiert bleiben.
//
// Read-only, kein Side-Effect — sicher mehrfach aufrufbar.
const COUNTRY_RATE_EUR_PER_KWH = {
  // Europa (Q1 2026 Richtwerte für Haushaltsstrom inkl. Steuern; bewusst
  // konservativ, nur Vorbelegung — der Admin überschreibt im Wizard).
  DE: 0.40, AT: 0.32, CH: 0.30, IT: 0.35, FR: 0.25, ES: 0.28, NL: 0.40,
  BE: 0.39, LU: 0.21, IE: 0.34, PT: 0.21, SE: 0.20, NO: 0.15, FI: 0.20,
  DK: 0.41, PL: 0.24, CZ: 0.22, SK: 0.20, HU: 0.13, RO: 0.15, BG: 0.13,
  GR: 0.20, CY: 0.32, MT: 0.13, SI: 0.20, HR: 0.16, EE: 0.20, LV: 0.20, LT: 0.20,
  GB: 0.30, UK: 0.30,
  TR: 0.10,
  // Nord-/Südamerika & APAC (€/kWh, grob umgerechnet — nur Hint, kein Tarif).
  US: 0.16, CA: 0.13, MX: 0.08,
  AU: 0.30, NZ: 0.22,
  JP: 0.20, KR: 0.10,
};

// EU-Region nach Tesla-Convention: alles in Europa + GB + TR.
const EU_AUDIENCE_COUNTRIES = new Set([
  'DE','AT','CH','LI','LU','FR','BE','MC','ES','PT','IT','VA','SM','MT',
  'NL','IE','GB','UK','DK','NO','SE','FI','IS','EE','LV','LT','PL','CZ',
  'SK','HU','RO','BG','GR','CY','SI','HR','BA','RS','ME','MK','AL','XK',
  'TR','AD','UA','MD','BY',
]);

router.get('/wizard-prefill', requireAuth, requireAdmin, async (req, res) => {
  // ── Geo-IP des aktuellen Admins ────────────────────────────────────────
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress || '').trim();
  let country = null;
  try {
    const geo = geoip.lookup(ip);
    country = geo?.country ?? null;
  } catch { /* geoip-lite nicht verfügbar → country bleibt null */ }
  const region = (country && EU_AUDIENCE_COUNTRIES.has(country)) ? 'eu' : 'na';
  const audienceDefault = region === 'eu'
    ? 'https://fleet-api.prd.eu.vn.cloud.tesla.com'
    : 'https://fleet-api.prd.na.vn.cloud.tesla.com';
  const electricityDefault = (country && COUNTRY_RATE_EUR_PER_KWH[country]) || null;

  // ── Admin-User für Mail-Defaults ──────────────────────────────────────
  let adminEmail = '';
  try {
    const row = req.db.prepare('SELECT email FROM users WHERE id = ? LIMIT 1').get(req.user.sub);
    adminEmail = row?.email || '';
  } catch { /* users-Schema variiert nicht — Sicherheitsnetz */ }
  // Falls der erste Admin im Setup noch keine E-Mail eingetragen hat,
  // bleibt der Default leer und der Admin tippt sie wie bisher von Hand.

  // ── Tenant-Slug-Vorschlag aus Host-Header ─────────────────────────────
  const host = (req.headers.host || '').split(':')[0];
  // erste Subdomain ohne www. → guter Hint für den ersten Mandanten
  const slugSuggestion = host
    .replace(/^www\./, '')
    .split('.')
    .filter(Boolean)[0] || '';

  // ── Step-Status: was ist schon erledigt? ──────────────────────────────
  const cfg = Object.fromEntries(
    req.db.prepare('SELECT key, value FROM tenant_settings').all().map(r => [r.key, r.value])
  );

  const authMode = cfg['tesla.auth_mode'] || 'fleet';
  const haveTeslaCreds = authMode === 'owner' || !!(
    (cfg['tesla.client_id']     || process.env.TESLA_CLIENT_ID) &&
    (cfg['tesla.client_secret'] || process.env.TESLA_CLIENT_SECRET)
  );
  const haveTeslaAuthRefresh = (() => {
    try { return !!req.db.prepare('SELECT 1 FROM tokens LIMIT 1').get(); }
    catch { return !!cfg['tesla.refresh_token']; }
  })();
  const vehicleCount = (() => {
    try { return req.db.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n; }
    catch { return 0; }
  })();
  const haveVirtualKey = (() => {
    try { return !!req.db.prepare('SELECT 1 FROM virtual_key LIMIT 1').get(); }
    catch { return false; }
  })();
  const haveVapid = !!(
    (cfg['vapid.public_key']  || process.env.VAPID_PUBLIC_KEY) &&
    (cfg['vapid.private_key'] || process.env.VAPID_PRIVATE_KEY)
  );
  const haveTelegram = !!(cfg['telegram.bot_token'] || process.env.TELEGRAM_BOT_TOKEN);
  const externalConfigured = [
    !!cfg['ocm_api_key'],
    !!cfg['here_api_key'],
    !!cfg['xai.api_key'],
    !!cfg['abrp.api_key'],
  ].filter(Boolean).length;
  const haveAlertEmail = !!cfg['monitoring.alert_email'];
  const electricitySet = (() => {
    try {
      const row = req.db.prepare(
        'SELECT COUNT(*) AS n FROM vehicles WHERE electricity_rate_kwh IS NOT NULL'
      ).get();
      return vehicleCount > 0 && row.n === vehicleCount;
    } catch { return false; }
  })();

  res.json({
    country,
    region,
    defaults: {
      tesla_audience:    audienceDefault,
      alert_email:       adminEmail,
      vapid_contact:     adminEmail ? `mailto:${adminEmail}` : '',
      electricity_rate:  electricityDefault,
      tenant_slug:       slugSuggestion,
    },
    auth_mode: authMode,
    steps: {
      credentials: { done: haveTeslaCreds, ownerSkip: authMode === 'owner' && !cfg['tesla.client_id'] },
      oauth:       { done: haveTeslaAuthRefresh, mode: authMode },
      vehicles:    { done: vehicleCount > 0, count: vehicleCount },
      virtualkey:  { done: authMode === 'owner' || haveVirtualKey, ownerSkip: authMode === 'owner' },
      // telemetry.done analog zu virtualkey: im Owner-Mode unnötig, also
      // als „done" markieren damit der Skip-Banner sichtbar wird. ready
      // bleibt false — interne Anzeige weiß damit dass Telemetry NICHT
      // aktiv ist (z.B. für System-Health-Check).
      // Telemetry hängt am Virtual Key + mind. einem Fahrzeug — Status wird
      // weiterhin live über /telemetry/status geprüft. Hier nur Vor-Indikator.
      telemetry:   { done: authMode === 'owner', ready: authMode !== 'owner' && haveVirtualKey && vehicleCount > 0, ownerSkip: authMode === 'owner' },
      vapid:       { done: haveVapid, auto: haveVapid && !cfg['vapid.contact'] },
      telegram:    { done: haveTelegram, optional: true },
      electricity: { done: electricitySet, optional: true },
      external:    { done: externalConfigured > 0, configured: externalConfigured, optional: true },
      monitoring:  { done: haveAlertEmail, optional: true },
    },
  });
});

// Reverse-Geocode-Backfill für Trips/Charging-Sessions ohne Adresse.
// Admin-only — pro Aufruf bis zu 60 Nominatim-Requests (Rate-Limit 1/s).
router.post('/geocode-backfill', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { backfillAddresses } = await import('../services/geocodingService.js');
    const limit = Math.min(+req.body?.limit || 60, 200);
    const lang = String(req.body?.lang || 'de').slice(0, 5);
    const result = await backfillAddresses(req.db, { limit, lang });
    auditLog(req.db, req.user.sub, 'geocode_backfill', null, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

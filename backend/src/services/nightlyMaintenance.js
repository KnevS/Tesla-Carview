/**
 * Naechtliche System-Wartung.
 *
 * Laeuft 1× pro Tag um ~03:30 deutscher Zeit (Europe/Berlin) und macht
 * die App-interne Hygiene — alles, was kein Risiko traegt und nie
 * waehrend des aktiven Tagesbetriebs anlaufen sollte:
 *
 *   - SQLite WAL-Checkpoint + VACUUM pro Tenant-DB
 *   - Abgelaufene refresh_tokens loeschen (master.db)
 *   - oauth_pkce-State-Eintraege > 24 h loeschen
 *   - audit_logs > 180 Tage loeschen
 *   - registration_invites (Tenant-Invites) > 30 d nach revoked_at loeschen
 *   - user_invites (used / expired) > 30 d loeschen
 *   - Tesla-OAuth-Token proaktiv refreshen, falls < 24 h Restlaufzeit
 *   - Verbleibende Maintenance schreibt einen Audit-Eintrag pro Tenant
 *
 * Optional, opt-in per ENV AUTO_UPDATE_ENABLED=true:
 *   - git fetch + Vergleich main:HEAD; bei neuem Commit:
 *     deploy/update.sh ausfuehren (sofern vorhanden) und Admins via
 *     Web-Push informieren
 *
 * Ergebnisse + Fehler landen in /api/system/maintenance-log fuer den
 * Admin-Health-Check.
 */

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getMasterDb, getAllTenants, getDb } from '../db/database.js';
import { auditLog } from './auditService.js';

const TARGET_HOUR_DE   = 3;   // 03:30 Europe/Berlin
const TARGET_MINUTE_DE = 30;
const CHECK_EVERY_MS   = 5 * 60 * 1000;   // alle 5 min prufen ob das Zeitfenster offen ist
const STARTUP_DELAY_MS = 2 * 60 * 1000;
const SKEW_BUDGET_MIN  = 10;  // Fenster, in dem geprueft + ggf. ausgeloest wird

const REFRESH_TOKEN_GRACE = 60;       // Sek — schon abgelaufen ist abgelaufen
const PKCE_MAX_AGE_S      = 24 * 3600;
const AUDIT_MAX_AGE_S     = 180 * 86400;
const INVITE_MAX_AGE_S    = 30 * 86400;

// Marker, damit wir nicht zweimal am selben Tag laufen — der Scheduler
// tickt alle 5 min, das Fenster ist groesser.
let lastRunDay = null;
const log = [];

function addLog(entry) {
  log.unshift({ at: Date.now(), ...entry });
  if (log.length > 50) log.length = 50;
}

export function getMaintenanceLog() {
  return log;
}

/** Aktuelle Zeit in Europe/Berlin als {h,m,day}. Funktioniert ueber
 *  Intl.DateTimeFormat, deshalb DST-korrekt ohne externe Lib. */
function nowBerlin() {
  const fmt = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date());
  const get = key => +fmt.find(p => p.type === key).value;
  return { y: get('year'), mo: get('month'), d: get('day'),
           h: get('hour'),  m: get('minute'),
           dayKey: `${get('year')}-${get('month')}-${get('day')}` };
}

function isInWindow(t) {
  if (t.h !== TARGET_HOUR_DE) return false;
  return t.m >= TARGET_MINUTE_DE && t.m < TARGET_MINUTE_DE + SKEW_BUDGET_MIN;
}

/** Verspricht einen exec-Aufruf mit Timeout, gibt {ok, stdout, stderr} zurueck. */
function execAsync(cmd, opts = {}) {
  return new Promise(resolve => {
    exec(cmd, { timeout: 90_000, ...opts }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, stdout: stdout?.toString() ?? '', stderr: stderr?.toString() ?? err?.message ?? '' });
    });
  });
}

async function runOnce() {
  const startedAt = Date.now();
  const result = { startedAt, tasks: {} };

  // 1. Master-DB-Cleanup
  try {
    const master = getMasterDb();
    const now = Math.floor(Date.now() / 1000);

    const rtok = master.prepare(
      'DELETE FROM refresh_tokens WHERE expires_at < ?'
    ).run(now - REFRESH_TOKEN_GRACE);
    result.tasks.refresh_tokens_purged = rtok.changes;

    const pkce = master.prepare(
      'DELETE FROM oauth_pkce WHERE created_at < ?'
    ).run(now - PKCE_MAX_AGE_S);
    result.tasks.oauth_pkce_purged = pkce.changes;

    // Soft-revoked Tenant-Invites > 30 d entfernen (wir hatten note + revoked_at)
    try {
      const inv = master.prepare(
        'DELETE FROM registration_invites WHERE revoked_at IS NOT NULL AND revoked_at < ?'
      ).run(now - INVITE_MAX_AGE_S);
      result.tasks.tenant_invites_purged = inv.changes;
    } catch { /* Tabelle u.U. noch nicht migriert */ }

    master.exec('VACUUM');
    master.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    result.tasks.master_vacuumed = true;
  } catch (e) {
    result.tasks.master_error = e.message;
  }

  // 2. Pro Tenant-DB: Cleanup + WAL-Checkpoint + ggf. VACUUM
  const tenantSummaries = [];
  for (const tenant of getAllTenants()) {
    if (tenant.status === 'suspended') continue;
    let db;
    try { db = getDb(tenant.id); } catch { continue; }
    const sum = { tenant: tenant.slug };

    try {
      const now = Math.floor(Date.now() / 1000);

      const audit = db.prepare(
        'DELETE FROM audit_logs WHERE created_at < ?'
      ).run(now - AUDIT_MAX_AGE_S);
      sum.audit_purged = audit.changes;

      // Abgelaufene + verwendete User-Invites > 30 d → weg
      try {
        const ui = db.prepare(
          `DELETE FROM user_invites
            WHERE (used_at IS NOT NULL AND used_at  < ?)
               OR (used_at IS NULL     AND expires_at < ? AND expires_at IS NOT NULL)`
        ).run(now - INVITE_MAX_AGE_S, now - INVITE_MAX_AGE_S);
        sum.user_invites_purged = ui.changes;
      } catch { /* Tabelle u.U. noch nicht da */ }

      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      // VACUUM nur, wenn die DB > 50 MB ist — sonst lohnt es nicht.
      const size = db.prepare(
        'SELECT page_count * page_size AS s FROM pragma_page_count(), pragma_page_size()'
      ).get()?.s ?? 0;
      if (size > 50 * 1024 * 1024) {
        db.exec('VACUUM');
        sum.vacuumed = true;
      }
      sum.size_after = size;

      auditLog(db, null, 'system_maintenance', null, sum);
    } catch (e) {
      sum.error = e.message;
    }
    tenantSummaries.push(sum);
  }
  result.tasks.tenants = tenantSummaries;

  // 3. System-Hygiene: Docker + npm audit + Bundle-Größe
  try {
    const hygieneReport = {};

    // 3a. Docker dangling images + build-cache bereinigen
    const prune = await execAsync('docker image prune -f 2>/dev/null && docker builder prune -f --filter until=168h 2>/dev/null || true');
    hygieneReport.docker_prune = prune.ok ? 'ok' : 'skipped';

    // 3b. npm audit Backend — kritische Schwachstellen in den Audit-Log schreiben
    const auditRaw = await execAsync('npm audit --json', {
      cwd: path.join(process.env.APP_DIR || '/opt/tesla-carview', 'backend'),
    });
    if (auditRaw.stdout) {
      try {
        const auditData = JSON.parse(auditRaw.stdout);
        const vulns = auditData.metadata?.vulnerabilities ?? {};
        hygieneReport.npm_audit = {
          critical: vulns.critical ?? 0,
          high:     vulns.high     ?? 0,
          moderate: vulns.moderate ?? 0,
          low:      vulns.low      ?? 0,
        };
        // Kritische Schwachstellen → System-Audit-Eintrag pro Tenant
        if ((vulns.critical ?? 0) > 0) {
          for (const t of getAllTenants()) {
            try {
              auditLog(getDb(t.id), null, 'security_vulnerability',
                null, { severity: 'critical', count: vulns.critical, source: 'npm-audit-backend' });
            } catch { /* Tenant ggf. gesperrt */ }
          }
        }
      } catch { hygieneReport.npm_audit = 'parse_failed'; }
    }

    // 3c. Bundle-Größe messen und mit Schwelle vergleichen
    const BUNDLE_WARN_KB = 800;
    const distDir = process.env.DIST_DIR || '/opt/tesla-carview/frontend-dist-private';
    const bundleCheck = await execAsync(
      `find "${distDir}/assets" -name "index-*.js" -o -name "index.js" 2>/dev/null | xargs ls -la 2>/dev/null | awk '{print $5}' | sort -rn | head -1`
    );
    if (bundleCheck.ok && bundleCheck.stdout.trim()) {
      const sizeKB = Math.round(parseInt(bundleCheck.stdout.trim(), 10) / 1024);
      hygieneReport.bundle_size_kb = sizeKB;
      hygieneReport.bundle_ok = sizeKB < BUNDLE_WARN_KB;
      if (sizeKB >= BUNDLE_WARN_KB) {
        for (const t of getAllTenants()) {
          try {
            auditLog(getDb(t.id), null, 'performance_warning',
              null, { type: 'bundle_too_large', size_kb: sizeKB, threshold_kb: BUNDLE_WARN_KB });
          } catch { /* ignore */ }
        }
      }
    }

    result.tasks.hygiene = hygieneReport;
  } catch (e) {
    result.tasks.hygiene_error = e.message;
  }

  // 3b. Companion Phase 2: Anomalien + Vorklim-Empfehlungen
  try {
    const { runCompanionCycle } = await import('./companionEngine.js');
    result.tasks.companion = await runCompanionCycle();
  } catch (e) {
    result.tasks.companion_error = e.message;
  }

  // 3c. Reverse-Geocode-Backfill (max. 60 Lookups pro Tenant — 1/s wegen Nominatim-ToS)
  try {
    const { backfillAddresses } = await import('./geocodingService.js');
    const geoSummaries = [];
    for (const tenant of getAllTenants()) {
      if (tenant.status === 'suspended') continue;
      let tdb;
      try { tdb = getDb(tenant.id); } catch { continue; }
      try {
        const r = await backfillAddresses(tdb, { limit: 60, lang: 'de' });
        geoSummaries.push({ tenant: tenant.slug, ...r });
      } catch (e) {
        geoSummaries.push({ tenant: tenant.slug, error: e.message });
      }
    }
    result.tasks.geocode = geoSummaries;
  } catch (e) {
    result.tasks.geocode_error = e.message;
  }

  // 4. Optional: Auto-Update aus dem Git-Repo (opt-in)
  if (process.env.AUTO_UPDATE_ENABLED === 'true') {
    const repoDir = process.env.UPDATE_REPO_DIR || '/opt/tesla-carview';
    try {
      const fetch  = await execAsync('git fetch origin main', { cwd: repoDir });
      const local  = await execAsync('git rev-parse HEAD',     { cwd: repoDir });
      const remote = await execAsync('git rev-parse origin/main', { cwd: repoDir });
      const hasNew = fetch.ok && local.ok && remote.ok && local.stdout.trim() !== remote.stdout.trim();
      result.tasks.git = {
        local: local.stdout.trim().slice(0,7),
        remote: remote.stdout.trim().slice(0,7),
        has_new: hasNew,
      };
      const script = path.join(repoDir, 'deploy', 'update.sh');
      if (hasNew && existsSync(script)) {
        const up = await execAsync(`bash ${script}`, { cwd: repoDir, timeout: 10 * 60_000 });
        result.tasks.git.update_ok     = up.ok;
        result.tasks.git.update_stderr = up.stderr.slice(-400);
      } else if (hasNew) {
        result.tasks.git.skipped = 'deploy/update.sh nicht gefunden';
      }
    } catch (e) {
      result.tasks.git_error = e.message;
    }
  }

  result.durationMs = Date.now() - startedAt;
  addLog(result);
  console.log('[NightlyMaintenance] erledigt in', (result.durationMs / 1000).toFixed(1), 's');
  return result;
}

function tick() {
  const t = nowBerlin();
  if (lastRunDay === t.dayKey) return;
  if (!isInWindow(t))           return;
  lastRunDay = t.dayKey;
  runOnce().catch(err => {
    addLog({ error: err.message });
    console.error('[NightlyMaintenance] Fehler:', err.message);
  });
}

export function startNightlyMaintenance() {
  console.log(
    '[NightlyMaintenance] Scheduler aktiv —',
    `Run-Fenster ${String(TARGET_HOUR_DE).padStart(2,'0')}:${String(TARGET_MINUTE_DE).padStart(2,'0')}–${TARGET_MINUTE_DE + SKEW_BUDGET_MIN} Europe/Berlin`,
    process.env.AUTO_UPDATE_ENABLED === 'true' ? '(Auto-Update: AN)' : '(Auto-Update: AUS)',
  );
  setTimeout(() => {
    tick();
    setInterval(tick, CHECK_EVERY_MS);
  }, STARTUP_DELAY_MS);
}

// Admin-Endpoint kann das manuell triggern — z.B. wenn die DB stark
// gewachsen ist und man nicht bis 03:30 warten will.
export async function triggerNow() {
  return runOnce();
}

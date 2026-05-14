/**
 * Lebenszyklus-Verwaltung der Demo-Sandbox.
 *
 *   - Cleanup: taeglich abgelaufene Tester rueckstandlos loeschen.
 *   - Periodic Activity: alle 30 Min frische Fake-Fahrten erzeugen,
 *     damit die Demo lebendig wirkt.
 *
 * Beide Loops laufen in einem einzigen Setup-Aufruf vom Backend-Start.
 * Wenn DEMO_ENABLED nicht gesetzt ist, passiert hier nichts.
 */

import { getAllTenants, getDb } from '../db/database.js';
import { tickDemoActivity } from './demoSeeder.js';

const CLEANUP_INTERVAL_MS  = 6 * 3600 * 1000;   // 4× pro Tag
const ACTIVITY_INTERVAL_MS = 30 * 60 * 1000;    // alle 30 min
const STARTUP_DELAY_MS     = 90_000;            // 90 s nach Start

/** Loescht einen einzelnen User + alle direkt mit ihm verbundenen
 *  Daten — Fahrzeuge, deren einziger Owner er war; Fahrten, Lade-
 *  sessions, Battery, Telemetry, Logbuch, MFA-Codes, Audit-Eintraege.
 *  Inneres ist transaktional. */
export function deleteDemoUser(db, userId) {
  db.transaction(() => {
    db.exec('PRAGMA foreign_keys = OFF');
    try {
      // Fahrzeuge, die ausschliesslich diesem User zugeordnet sind →
      // mit kompletter Historie weg. Andere bleiben.
      const vehicles = db.prepare(`
        SELECT v.id FROM vehicles v
          JOIN vehicle_users vu ON vu.vehicle_id = v.id
         WHERE vu.user_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM vehicle_users vu2
              WHERE vu2.vehicle_id = v.id AND vu2.user_id != ?
           )
      `).all(userId, userId);

      for (const { id: vid } of vehicles) {
        db.prepare('DELETE FROM trip_points WHERE trip_id IN (SELECT id FROM trips WHERE vehicle_id=?)').run(vid);
        db.prepare('DELETE FROM trips WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM charging_points WHERE session_id IN (SELECT id FROM charging_sessions WHERE vehicle_id=?)').run(vid);
        db.prepare('DELETE FROM charging_sessions WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM battery_snapshots WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM telemetry_points WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM logbook_entries WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM vehicle_state_cache WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM charging_locations WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM service_intervals WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM vehicle_users WHERE vehicle_id=?').run(vid);
        db.prepare('DELETE FROM vehicles WHERE id=?').run(vid);
      }

      db.prepare('DELETE FROM vehicle_users WHERE user_id=?').run(userId);
      db.prepare('DELETE FROM mfa_backup_codes WHERE user_id=?').run(userId);
      db.prepare('DELETE FROM audit_logs WHERE user_id=?').run(userId);
      db.prepare('DELETE FROM legal_acceptance WHERE user_id=?').run(userId);
      db.prepare('DELETE FROM logbook_entries WHERE created_by_user_id=?').run(userId);
      db.prepare('DELETE FROM users WHERE id=?').run(userId);
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  })();
}

function runCleanupOnce() {
  const now = Math.floor(Date.now() / 1000);
  for (const tenant of getAllTenants()) {
    if (!tenant.is_demo) continue;
    let db;
    try { db = getDb(tenant.id); } catch { continue; }
    const expired = db.prepare(
      'SELECT id, username FROM users WHERE expires_at IS NOT NULL AND expires_at <= ?'
    ).all(now);
    for (const u of expired) {
      try {
        deleteDemoUser(db, u.id);
        console.log('[DemoCleanup] Tester abgelaufen + geloescht:', u.username);
      } catch (e) {
        console.error('[DemoCleanup] Fehler beim Loeschen von', u.username, ':', e.message);
      }
    }
  }
}

function runActivityOnce() {
  for (const tenant of getAllTenants()) {
    if (!tenant.is_demo) continue;
    let db;
    try { db = getDb(tenant.id); } catch { continue; }
    try {
      const n = tickDemoActivity(db);
      if (n) console.log('[DemoActivity]', n, 'frische Trip(s) erzeugt.');
    } catch (e) {
      console.error('[DemoActivity] Fehler:', e.message);
    }
  }
}

export function startDemoLifecycle() {
  if (process.env.DEMO_ENABLED !== 'true') return;
  console.log('[Demo] Lifecycle-Scheduler aktiv — Cleanup alle 6h, Activity alle 30 min');

  setTimeout(() => {
    runCleanupOnce();
    setInterval(runCleanupOnce, CLEANUP_INTERVAL_MS);
  }, STARTUP_DELAY_MS);

  setTimeout(() => {
    runActivityOnce();
    setInterval(runActivityOnce, ACTIVITY_INTERVAL_MS);
  }, STARTUP_DELAY_MS + 30_000);
}

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Wöchentlicher Fahr-Report — sendet jeden Montag morgens
 * pro Tenant + User eine Zusammenfassung der vergangenen Woche.
 *
 * Inhalt: km, kWh, Ladekosten, Anzahl Fahrten, Vergleich Vorwoche.
 * Kanäle: Web Push + Telegram + E-Mail (via notify()).
 *
 * Per-User opt-out via tenant_setting `weekly_report.disabled_users` (CSV von User-IDs).
 */

import { getAllTenants, getDb } from '../db/database.js';
import { notify } from './notifyService.js';

const HOUR_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;  // alle 30 min prüfen
const STARTUP_DELAY_MS  = 90 * 1000;       // 90s nach Start

// Sendet immer Montag zwischen 07:00 und 07:30 (Europe/Berlin)
const REPORT_DOW       = 1;   // Montag
const REPORT_HOUR_FROM = 7;
const REPORT_HOUR_TO   = 8;

// Pro Tenant + User merken wir uns die letzte Versendung in tenant_settings
// → idempotent über mehrere ticks und über Container-Restarts.
function lastSentKey(userId) { return `weekly_report.last_sent:${userId}`; }

function isInBerlinReportWindow() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    weekday: 'short', hour: 'numeric', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const dowMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const dow = dowMap[parts.weekday];
  const hour = parseInt(parts.hour, 10);
  return dow === REPORT_DOW && hour >= REPORT_HOUR_FROM && hour < REPORT_HOUR_TO;
}

function sumWeek(db, userId, fromEpoch, toEpoch) {
  // Fahrten: Summen pro User. Wenn user_id nicht in trips ist, nehmen wir
  // alle Fahrzeuge die dem User über vehicle_users zugeordnet sind.
  const trips = db.prepare(`
    SELECT COUNT(*) AS n,
           COALESCE(SUM(distance_km), 0)       AS km,
           COALESCE(SUM(energy_used_kwh), 0)   AS kwh
    FROM trips
    WHERE start_time >= ? AND start_time < ?
      AND vehicle_id IN (SELECT vehicle_id FROM vehicle_users WHERE user_id = ?)
  `).get(fromEpoch, toEpoch, userId);

  const charging = db.prepare(`
    SELECT COUNT(*) AS n,
           COALESCE(SUM(energy_added_kwh), 0) AS kwh,
           COALESCE(SUM(cost), 0)             AS cost
    FROM charging_sessions
    WHERE start_time >= ? AND start_time < ?
      AND vehicle_id IN (SELECT vehicle_id FROM vehicle_users WHERE user_id = ?)
  `).get(fromEpoch, toEpoch, userId);

  return {
    trips:    trips.n || 0,
    km:       Number(trips.km || 0),
    kwh_used: Number(trips.kwh || 0),
    sessions: charging.n || 0,
    kwh_charged: Number(charging.kwh || 0),
    cost:     Number(charging.cost || 0),
  };
}

function trendArrow(curr, prev) {
  if (prev === 0) return curr > 0 ? '↑' : '–';
  const diff = ((curr - prev) / prev) * 100;
  if (Math.abs(diff) < 5) return '→';
  return diff > 0 ? '↑' : '↓';
}

function formatSummary(curr, prev) {
  const lines = [
    `🚗 ${curr.trips} Fahrten · ${curr.km.toFixed(0)} km ${trendArrow(curr.km, prev.km)}`,
    `⚡ Verbrauch: ${curr.kwh_used.toFixed(1)} kWh ${trendArrow(curr.kwh_used, prev.kwh_used)}`,
    `🔌 ${curr.sessions} Ladevorgänge · ${curr.kwh_charged.toFixed(1)} kWh geladen`,
  ];
  if (curr.cost > 0) {
    lines.push(`💶 Ladekosten: ${curr.cost.toFixed(2)} €`);
  }
  return lines.join('\n');
}

async function runOnce() {
  if (!isInBerlinReportWindow()) return;

  for (const tenant of getAllTenants()) {
    if (tenant.is_demo || tenant.status === 'suspended') continue;
    let db;
    try { db = getDb(tenant.id); } catch { continue; }

    // Welche User haben weekly_report aktiv? Standard: alle User des Tenants.
    const users = db.prepare(
      'SELECT id, username FROM users WHERE is_active = 1'
    ).all();

    const disabledRow = db.prepare(
      "SELECT value FROM tenant_settings WHERE key='weekly_report.disabled_users'"
    ).get();
    const disabled = new Set(
      (disabledRow?.value || '').split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean)
    );

    // Wochenfenster: letzter abgeschlossener Mo-So (in UTC, einfach)
    const now = Math.floor(Date.now() / 1000);
    const ONE_WEEK = 7 * 24 * 3600;
    const lastWeekStart = now - 2 * ONE_WEEK;
    const lastWeekEnd   = now - 1 * ONE_WEEK;
    const thisWeekStart = lastWeekEnd;
    const thisWeekEnd   = now;

    for (const user of users) {
      if (disabled.has(user.id)) continue;

      // Idempotenz: schon diese Woche gesendet?
      const lastSentRow = db.prepare(
        'SELECT value FROM tenant_settings WHERE key=?'
      ).get(lastSentKey(user.id));
      const lastSentEpoch = parseInt(lastSentRow?.value || '0', 10);
      if (lastSentEpoch > now - 6 * 24 * 3600) continue; // < 6 Tage her → skip

      const curr = sumWeek(db, user.id, thisWeekStart, thisWeekEnd);
      const prev = sumWeek(db, user.id, lastWeekStart, lastWeekEnd);

      // Kein einziger Trip diese Woche → keine Nachricht
      if (curr.trips === 0 && curr.sessions === 0) continue;

      try {
        await notify({
          tenantId: tenant.id,
          userId:   user.id,
          db,
          title:    'Deine Woche im Tesla',
          body:     formatSummary(curr, prev),
          url:      '/trips',
          emoji:    '📊',
          type:     'generic',
        });

        db.prepare(
          'INSERT INTO tenant_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
        ).run(lastSentKey(user.id), String(now));

        console.log(`[WeeklySummary] gesendet an User ${user.username} (tenant ${tenant.slug})`);
      } catch (err) {
        console.warn(`[WeeklySummary] notify fehlgeschlagen für User ${user.id}:`, err.message);
      }
    }
  }
}

export function startWeeklySummaryScheduler() {
  console.log('[WeeklySummary] Scheduler aktiv — Versand Montag 07:00–08:00 Europe/Berlin');
  setTimeout(async function tick() {
    try { await runOnce(); }
    catch (err) { console.error('[WeeklySummary] Lauf fehlgeschlagen:', err.message); }
    setTimeout(tick, CHECK_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Taeglicher Reminder-Scheduler fuer Wartungs-Intervalle.
 *
 * Laeuft alle ~24h nach dem Backend-Start. Geht alle Tenants durch,
 * berechnet pro service_interval die Faelligkeit und sendet eine
 * Web-Push-Benachrichtigung an die Push-Subscriptions des Fahrzeugs,
 * wenn Faelligkeit < 30 Tage oder < 1000 km. notified_at wird gesetzt,
 * damit nicht jeden Tag dieselbe Erinnerung kommt — frische Push erst
 * wieder, wenn last_done_at oder Snooze geaendert wird (Route ruft
 * notified_at = NULL auf).
 *
 * Anti-Spam:
 *   - notified_at !== null  → bereits erinnert, ueberspringen
 *   - snoozed_until > now   → user-stille, ueberspringen
 *   - is_active = 0         → user-still, ueberspringen
 */

import { getAllTenants, getDb } from '../db/database.js';
import { dispatch as dispatchWebhook } from './webhookDispatcher.js';
import { notifyAllInTenant } from './notifyService.js';

const CHECK_INTERVAL_MS = 24 * 3600 * 1000;          // taeglich
const STARTUP_DELAY_MS  = 60 * 1000;                 // 1 Min nach Server-Start
const MONTH_S           = 30 * 24 * 3600;
const PUSH_DAYS_AHEAD   = 30;
const PUSH_KM_AHEAD     = 1000;

/** Berechnet, ob ein Intervall in Push-Naehe ist. Liefert null, wenn
 *  nichts zu tun ist; sonst eine kurze Beschreibung fuer die Push-Body. */
function dueDescription(row, vehicle, now) {
  if (!row.is_active) return null;
  if (row.snoozed_until && row.snoozed_until > now) return null;

  const parts = [];
  let urgent = false;

  if (row.last_done_at && row.interval_months) {
    const dueAt    = row.last_done_at + row.interval_months * MONTH_S;
    const daysLeft = Math.floor((dueAt - now) / 86400);
    if (daysLeft <= PUSH_DAYS_AHEAD) {
      urgent = true;
      parts.push(daysLeft < 0
        ? `${-daysLeft} Tage überfällig`
        : `in ${daysLeft} Tagen fällig`);
    }
  }

  if (row.last_done_km != null && row.interval_km && vehicle.odometer_km != null) {
    const dueKm  = row.last_done_km + row.interval_km;
    const kmLeft = Math.round(dueKm - vehicle.odometer_km);
    if (kmLeft <= PUSH_KM_AHEAD) {
      urgent = true;
      parts.push(kmLeft < 0
        ? `${-kmLeft} km überfällig`
        : `noch ${kmLeft} km`);
    }
  }

  return urgent ? parts.join(' · ') : null;
}

async function runOnce() {
  const now = Math.floor(Date.now() / 1000);

  for (const tenant of getAllTenants()) {
    if (tenant.status === 'suspended') continue;
    let db;
    try { db = getDb(tenant.id); } catch { continue; }

    const items = db.prepare(`
      SELECT si.*, v.display_name AS vehicle_name, v.vin, v.odometer_km
        FROM service_intervals si
        JOIN vehicles v ON v.id = si.vehicle_id
       WHERE si.is_active = 1
         AND (si.snoozed_until IS NULL OR si.snoozed_until <= ?)
         AND si.notified_at IS NULL
    `).all(now);

    for (const it of items) {
      const desc = dueDescription(it, { odometer_km: it.odometer_km }, now);
      if (!desc) continue;

      // Multi-channel Push: WebPush + Telegram via notifyService.
      await notifyAllInTenant({
        tenantId: tenant.id,
        db,
        title: `${it.label} — ${it.vehicle_name}`,
        body:  desc,
        url:   '/',
        emoji: '🔧',
        type:  'generic',
        vehicleId: it.vehicle_id,
        vin:       it.vin,
      }).catch(err => console.warn('[ServiceReminders] notify fehlgeschlagen:', err.message));

      // Marker setzen, damit nicht morgen die gleiche Push erneut rausgeht.
      db.prepare('UPDATE service_intervals SET notified_at = ? WHERE id = ?').run(now, it.id);

      // service.due-Webhook (best-effort) — feuert genau einmal pro
      // Faelligkeits-Zyklus, weil notified_at hier oben gesetzt wurde.
      dispatchWebhook(db, 'service.due', {
        service_interval_id: it.id,
        vehicle_id:          it.vehicle_id,
        kind:                it.kind,
        label:               it.label,
        description:         desc,
        odometer_km:         it.odometer_km ?? null,
      }).catch(() => { /* dispatcher swallows errors itself */ });
    }
  }
}

export function startServiceReminderScheduler() {
  console.log('[ServiceReminders] Scheduler gestartet — taegliche Wartungspruefung in', STARTUP_DELAY_MS / 1000, 's');
  setTimeout(async function tick() {
    try { await runOnce(); }
    catch (err) { console.error('[ServiceReminders] Lauf fehlgeschlagen:', err.message); }
    setTimeout(tick, CHECK_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

/**
 * Zentraler Benachrichtigungs-Dispatcher.
 *
 * Sendet eine Nachricht über ALLE konfigurierten Kanäle eines Nutzers:
 *   • Web Push (VAPID, Service Worker)
 *   • Telegram Bot
 *
 * Alle Fehler werden isoliert behandelt — ein Fehler in einem Kanal
 * blockiert nicht die anderen. Fehlende Konfiguration wird still ignoriert.
 *
 * Verwendung:
 *   import { notify } from '../services/notifyService.js';
 *   await notify({ tenantId, userId, db, masterDb, title, body, url, icon });
 */

import { getMasterDb, getAllTenants, getDb } from '../db/database.js';
import { buildPayload } from './pushPayloads.js';

// Liest die im User-Profil gewählte Sprache aus der Tenant-DB. Wird für
// Action-Labels in Web-Push-Notifications benötigt — der Service-Worker
// kann die Labels nicht selbst lokalisieren, weil sie OS-seitig schon
// in der Notification stehen müssen, wenn sie ankommt.
function getUserLang(db, userId) {
  if (!db || !userId) return 'de';
  try {
    const row = db.prepare('SELECT lang FROM users WHERE id = ?').get(userId);
    return row?.lang || 'de';
  } catch { return 'de'; }
}

// ── Web Push ──────────────────────────────────────────────────────────────────

let _webpush = null;
async function getWebpush() {
  if (_webpush !== null) return _webpush;
  try {
    const mod = await import('web-push');
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      mod.setVapidDetails(
        process.env.VAPID_CONTACT || 'mailto:noreply@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
      _webpush = mod;
    } else {
      _webpush = false;
    }
  } catch {
    _webpush = false;
  }
  return _webpush;
}

async function sendWebPush(masterDb, tenantId, userId, payload) {
  const wp = await getWebpush();
  if (!wp) return;

  // Sowohl vehicle-basierte (legacy) als auch user-basierte Subscriptions senden.
  const userSubs = masterDb.prepare(
    'SELECT subscription_json FROM user_push_subscriptions WHERE tenant_id=? AND user_id=?'
  ).all(tenantId, userId);

  await Promise.allSettled(
    userSubs.map(s => wp.sendNotification(JSON.parse(s.subscription_json), payload))
  );
}

// ── Telegram ─────────────────────────────────────────────────────────────────

async function sendTelegram(masterDb, tenantId, userId, text) {
  try {
    const { sendTelegramMessage } = await import('./telegramBot.js');
    const link = masterDb.prepare(
      'SELECT chat_id FROM telegram_links WHERE tenant_id=? AND user_id=?'
    ).get(tenantId, userId);
    if (!link) return;
    await sendTelegramMessage(link.chat_id, text);
  } catch {
    // Telegram nicht konfiguriert oder Bot nicht gestartet
  }
}

// ── Haupt-Dispatcher ─────────────────────────────────────────────────────────

/**
 * Schickt eine Benachrichtigung an alle Kanäle des Nutzers.
 *
 * @param {object} opts
 * @param {string}  opts.tenantId
 * @param {number}  opts.userId
 * @param {object}  opts.db         Tenant-DB (für Fallback-Lookups)
 * @param {string}  opts.title      Push-Titel / Telegram-Betreff
 * @param {string}  opts.body       Push-Body-Text
 * @param {string}  [opts.url]      Deep-Link der App (Push-Klick-Ziel)
 * @param {string}  [opts.icon]     Icon-Pfad für Web Push
 * @param {string}  [opts.emoji]    Emoji-Präfix für Telegram-Text
 */
export async function notify({
  tenantId, userId, db, title, body,
  url = '/', icon = '/icon-192.png', emoji = '🔔',
  type = 'generic',  // siehe pushPayloads.js → bestimmt Actions/Tag/Vibrate
  vehicleId = null, vin = null,
}) {
  const masterDb = getMasterDb();
  const lang     = getUserLang(db, userId);
  const pushPayload = JSON.stringify(buildPayload(type, {
    lang, title, body, url, icon, vehicleId, vin,
  }));
  const tgText = `${emoji} *${escMd(title)}*\n${escMd(body)}`;

  await Promise.allSettled([
    sendWebPush(masterDb, tenantId, userId, pushPayload),
    sendTelegram(masterDb, tenantId, userId, tgText),
  ]);
}

/** Sendet an ALLE Nutzer eines Mandanten (z.B. Admin-Alarm). */
export async function notifyAllInTenant({
  tenantId, db, title, body,
  url = '/', icon = '/icon-192.png', emoji = '🔔',
  type = 'generic',
  vehicleId = null, vin = null,
}) {
  const masterDb = getMasterDb();
  // Mandant-weite Pushs nutzen Default-Sprache 'de' für Action-Labels —
  // pro-User-Lang würde hier 1 Payload pro Lang-Bucket erzwingen.
  const pushPayload = JSON.stringify(buildPayload(type, {
    lang: 'de', title, body, url, icon, vehicleId, vin,
  }));
  const tgText = `${emoji} *${escMd(title)}*\n${escMd(body)}`;

  // Alle verlinkten Telegram-Nutzer des Mandanten
  const links = masterDb.prepare('SELECT user_id, chat_id FROM telegram_links WHERE tenant_id=?').all(tenantId);
  // Alle User-Push-Subs des Mandanten
  const subs = masterDb.prepare('SELECT subscription_json FROM user_push_subscriptions WHERE tenant_id=?').all(tenantId);

  const wp = await getWebpush();
  const tasks = [];

  if (wp && subs.length) {
    tasks.push(...subs.map(s => wp.sendNotification(JSON.parse(s.subscription_json), pushPayload)));
  }

  for (const { chat_id } of links) {
    tasks.push((async () => {
      try {
        const { sendTelegramMessage } = await import('./telegramBot.js');
        await sendTelegramMessage(chat_id, tgText);
      } catch { /* ignorieren */ }
    })());
  }

  await Promise.allSettled(tasks);
}

/**
 * Sentry-Wächter-Alarm.
 * Sendet an alle Nutzer, die dem Fahrzeug zugeordnet sind.
 */
export async function notifySentryAlert(vehicle, db, tenantId) {
  const masterDb = getMasterDb();
  const links = masterDb.prepare('SELECT user_id, chat_id FROM telegram_links WHERE tenant_id=?').all(tenantId);
  const subs  = masterDb.prepare('SELECT user_id, subscription_json FROM user_push_subscriptions WHERE tenant_id=?').all(tenantId);

  const title = `🚨 Wächter-Alarm: ${vehicle.display_name || vehicle.vin?.slice(-6) || 'Fahrzeug'}`;
  const body  = 'Das Fahrzeug wurde möglicherweise berührt oder ist im Parkzustand aufgewacht.';
  const url   = '/';
  // Sentry-Rezept: requireInteraction + starke Vibration + renotify.
  // Mandant-weite Verteilung, daher Default-Sprache.
  const pushPayload = JSON.stringify(buildPayload('sentry_alert', {
    lang: 'de', title, body, url,
    vehicleId: vehicle.id, vin: vehicle.vin,
  }));
  const tgText = `🚨 *${escMd(title)}*\n${escMd(body)}\n\n_Carview · ${new Date().toLocaleTimeString('de-DE')}_`;

  const wp = await getWebpush();
  const tasks = [];

  if (wp) {
    tasks.push(...subs.map(s => wp.sendNotification(JSON.parse(s.subscription_json), pushPayload).catch(() => {})));
  }
  for (const { chat_id } of links) {
    tasks.push((async () => {
      try {
        const { sendTelegramMessage } = await import('./telegramBot.js');
        await sendTelegramMessage(chat_id, tgText, { parse_mode: 'MarkdownV2' });
      } catch { /* ignorieren */ }
    })());
  }

  await Promise.allSettled(tasks);
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

/** Escaped Text für Telegram MarkdownV2. */
function escMd(str) {
  return String(str || '').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
}

export { escMd };

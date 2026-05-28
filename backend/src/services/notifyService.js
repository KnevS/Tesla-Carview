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
//
// VAPID-Schlüssel können sowohl in der .env als auch pro Mandant in
// tenant_settings stehen (DB hat Vorrang, autoInit erzeugt sie dort).
// Daher: web-push einmal laden, aber VAPID je nach Mandanten-DB vor jedem
// Send neu setzen. setVapidDetails überschreibt nur das Modul-State —
// für unsere typischerweise sequenziellen Push-Sequenzen ausreichend.

let _webpushModule = null;
async function loadWebpush() {
  if (_webpushModule !== null) return _webpushModule;
  try {
    const mod = await import('web-push');
    // setVapidDetails findet sich je nach ESM/CJS-Build entweder direkt
    // oder unter mod.default — beides abdecken.
    _webpushModule = mod.setVapidDetails ? mod : (mod.default || false);
    if (_webpushModule && typeof _webpushModule.setVapidDetails !== 'function') {
      _webpushModule = false;
    }
  } catch {
    _webpushModule = false;
  }
  return _webpushModule;
}

function readVapidFromDb(db) {
  if (!db) return null;
  try {
    const rows = db.prepare(
      "SELECT key, value FROM tenant_settings WHERE key IN ('vapid.public_key','vapid.private_key','vapid.contact')"
    ).all();
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const pub  = cfg['vapid.public_key']  || process.env.VAPID_PUBLIC_KEY;
    const priv = cfg['vapid.private_key'] || process.env.VAPID_PRIVATE_KEY;
    const cont = cfg['vapid.contact']     || process.env.VAPID_CONTACT || 'mailto:noreply@example.com';
    if (!pub || !priv) return null;
    return { pub, priv, contact: cont };
  } catch { return null; }
}

/** Sichert ab, dass web-push mit den richtigen VAPID-Keys für den
 *  Mandanten konfiguriert ist, und liefert das Modul zurück.
 *  Liefert null, wenn keine Keys verfügbar sind (weder DB noch env). */
async function getWebpushForTenant(db) {
  const wp = await loadWebpush();
  if (!wp) return null;
  const v = readVapidFromDb(db);
  if (!v) return null;
  try {
    wp.setVapidDetails(v.contact, v.pub, v.priv);
  } catch (err) {
    console.warn('[notifyService] setVapidDetails fehlgeschlagen:', err.message);
    return null;
  }
  return wp;
}

async function sendWebPush(masterDb, tenantDb, tenantId, userId, payload) {
  const wp = await getWebpushForTenant(tenantDb);
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
    sendWebPush(masterDb, db, tenantId, userId, pushPayload),
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

  const wp = await getWebpushForTenant(db);
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

  const wp = await getWebpushForTenant(db);
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

/**
 * Telegram-Bot-Service (Telegraf).
 *
 * Modi:
 *  • Webhook  — wenn TELEGRAM_WEBHOOK_URL gesetzt ist (empfohlen für Produktion).
 *               Bot registriert sich selbst bei Telegram; Express leitet
 *               POST /api/telegram/webhook weiter.
 *  • Long-Polling — Fallback wenn kein WEBHOOK_URL (für lokale Entwicklung).
 *
 * Verknüpfungsflow:
 *  1. Nutzer öffnet Carview → Einstellungen → Telegram → erhält 6-stelligen Code.
 *  2. Nutzer schickt /start <code> an den Bot.
 *  3. Bot liest Code aus DB, verknüpft chat_id mit user_id+tenant_id, löscht Code.
 *
 * Bot-Befehle:
 *  /start <code>  — Konto verknüpfen
 *  /status        — Fahrzeugstatus (Batterie, km, Verriegelung)
 *  /battery       — Detailliertere Akkuinfos
 *  /trips         — Letzte 5 Fahrten
 *  /help          — Befehlsliste
 *  /unlink        — Verknüpfung aufheben
 */

import { Telegraf } from 'telegraf';
import { getMasterDb, getAllTenants, getDb } from '../db/database.js';
import { getTenantSetting } from './configService.js';

let bot = null;
let webhookMiddleware = null;

/** Initialisiert den Bot. Gibt Express-Middleware zurück (Webhook) oder null (Polling). */
export async function initTelegramBot() {
  // DB has priority: use token from first active non-demo tenant, fall back to .env
  let token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const tenants = getAllTenants().filter(t => t.status !== 'suspended' && !t.is_demo);
    for (const t of tenants) {
      const db  = getDb(t.id);
      const tok = getTenantSetting(db, 'telegram.bot_token', null);
      if (tok) { token = tok; break; }
    }
  } catch { /* ignore */ }
  if (!token) {
    console.log('[Telegram] Kein TELEGRAM_BOT_TOKEN — Bot deaktiviert.');
    return null;
  }

  try {
    bot = new Telegraf(token);
    registerCommands(bot);

    const tdb = (() => { try { const ts = getAllTenants().filter(t => !t.is_demo); return ts.length ? getDb(ts[0].id) : null; } catch { return null; } })();
    const dbWebhook = tdb ? getTenantSetting(tdb, 'telegram.webhook_url', null) : null;
    // Webhook nur wenn explizit gesetzt. FRONTEND_URL ist KEIN gültiger Fallback —
    // reverse-proxy/Auth-Middlewares können /api/telegram/webhook blockieren,
    // Telegram bekäme dann nur 401/403 und der Bot bliebe stumm (siehe v3.4.2).
    const webhookUrl = dbWebhook || process.env.TELEGRAM_WEBHOOK_URL || null;
    if (webhookUrl) {
      // Webhook-Modus: Express übernimmt die Webhook-Route
      const fullUrl = `${webhookUrl}/api/telegram/webhook`;
      try {
        await bot.telegram.setWebhook(fullUrl);
        console.log(`[Telegram] Webhook registriert: ${fullUrl}`);
      } catch (err) {
        console.warn(`[Telegram] Webhook-Registrierung fehlgeschlagen: ${err.message}. Falle auf Polling zurück.`);
        await startPolling();
        return null;
      }
      webhookMiddleware = bot.webhookCallback('/api/telegram/webhook');
      return webhookMiddleware;
    } else {
      await startPolling();
      return null;
    }
  } catch (err) {
    console.error('[Telegram] Init-Fehler:', err.message);
    return null;
  }
}

async function startPolling() {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });
    bot.launch().catch(err => console.error('[Telegram] Polling-Fehler:', err.message));
    console.log('[Telegram] Long-Polling gestartet.');

    // Graceful stop
    process.once('SIGINT',  () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    console.error('[Telegram] Polling-Start-Fehler:', err.message);
  }
}

/** Gibt den Webhook-Handler zurück (für POST /api/telegram/webhook). */
export function getTelegramWebhookHandler() {
  return webhookMiddleware;
}

/** Sendet eine Nachricht an eine Chat-ID. */
export async function sendTelegramMessage(chatId, text, extra = {}) {
  if (!bot) throw new Error('Telegram Bot nicht initialisiert');
  return bot.telegram.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', ...extra });
}

/** Gibt den Bot-Username zurück (für den Link-Button in der UI). */
export async function getBotUsername() {
  if (!bot) return null;
  try {
    const me = await bot.telegram.getMe();
    return me.username;
  } catch {
    return null;
  }
}

// ── Befehle ───────────────────────────────────────────────────────────────────

function registerCommands(bot) {
  // /start [code] — Verknüpfung oder Begrüßung
  bot.command('start', async ctx => {
    const code = ctx.message?.text?.split(' ')[1]?.trim();
    if (!code) {
      return ctx.reply(
        '👋 *Willkommen bei Tesla Carview\\!*\n\n' +
        'Um deinen Account zu verknüpfen:\n' +
        '1\\. Öffne Carview → Einstellungen → Benachrichtigungen\n' +
        '2\\. Klicke auf „Telegram verknüpfen"\n' +
        '3\\. Sende den angezeigten Code als `/start <Code>` hier\\.',
        { parse_mode: 'MarkdownV2' }
      );
    }

    const masterDb = getMasterDb();
    masterDb.prepare('DELETE FROM telegram_link_codes WHERE expires_at < unixepoch()').run();
    const row = masterDb.prepare('SELECT * FROM telegram_link_codes WHERE code=?').get(code);

    if (!row) {
      return ctx.reply('❌ Code ungültig oder abgelaufen\\. Bitte erzeuge einen neuen Code in Carview\\.',
        { parse_mode: 'MarkdownV2' });
    }

    // Verknüpfen
    const chatId   = String(ctx.chat.id);
    const username = ctx.from?.username || null;

    masterDb.prepare('DELETE FROM telegram_link_codes WHERE code=?').run(code);

    try {
      masterDb.prepare(`
        INSERT INTO telegram_links (tenant_id, user_id, chat_id, telegram_username)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tenant_id, user_id) DO UPDATE SET chat_id=excluded.chat_id, telegram_username=excluded.telegram_username
        ON CONFLICT(chat_id) DO UPDATE SET tenant_id=excluded.tenant_id, user_id=excluded.user_id, telegram_username=excluded.telegram_username
      `).run(row.tenant_id, row.user_id, chatId, username);
    } catch (err) {
      console.error('[Telegram] Link-Fehler:', err.message);
      return ctx.reply('❌ Verknüpfung fehlgeschlagen\\. Bitte versuche es erneut\\.', { parse_mode: 'MarkdownV2' });
    }

    // Nutzernamen aus Tenant-DB lesen
    let userName = 'Nutzer';
    try {
      const db = getDb(row.tenant_id);
      const user = db.prepare('SELECT username FROM users WHERE id=?').get(row.user_id);
      userName = user?.username || userName;
    } catch { /* ignorieren */ }

    return ctx.reply(
      `✅ *Verknüpft\\!* Hallo ${esc(userName)} 👋\n\n` +
      'Du erhältst jetzt Benachrichtigungen für:\n' +
      '• 🔋 Ladevorgang abgeschlossen\n' +
      '• ⚠️ Akku unter Schwellwert\n' +
      '• 🚨 Wächter\\-Alarm\n' +
      '• 📋 Fahrtenbuch\\-Erinnerungen\n\n' +
      'Tippe /help für alle Befehle\\.',
      { parse_mode: 'MarkdownV2' }
    );
  });

  // /status — Fahrzeugstatus
  bot.command('status', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const statusText = await getStatusText(link.tenant_id, link.user_id);
    return ctx.reply(statusText, { parse_mode: 'MarkdownV2' });
  });

  // /battery — Akkudetails
  bot.command('battery', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const text = await getBatteryText(link.tenant_id, link.user_id);
    return ctx.reply(text, { parse_mode: 'MarkdownV2' });
  });

  // /trips — Letzte Fahrten
  bot.command('trips', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const text = await getTripsText(link.tenant_id, link.user_id);
    return ctx.reply(text, { parse_mode: 'MarkdownV2' });
  });

  // /unlink — Verknüpfung aufheben
  bot.command('unlink', async ctx => {
    const chatId = String(ctx.chat.id);
    const masterDb = getMasterDb();
    const rows = masterDb.prepare('DELETE FROM telegram_links WHERE chat_id=? RETURNING id').all(chatId);
    if (rows.length) {
      return ctx.reply('✅ Verknüpfung aufgehoben\\. Keine weiteren Benachrichtigungen\\.',
        { parse_mode: 'MarkdownV2' });
    } else {
      return ctx.reply('ℹ️ Kein verknüpfter Account gefunden\\.', { parse_mode: 'MarkdownV2' });
    }
  });

  // /help
  bot.command('help', async ctx => {
    return ctx.reply(
      '*Tesla Carview Bot — Befehle*\n\n' +
      '/status — Fahrzeugstatus\n' +
      '/battery — Akkustand & Reichweite\n' +
      '/trips — Letzte 5 Fahrten\n' +
      '/unlink — Bot\\-Verknüpfung aufheben\n' +
      '/help — Diese Hilfe\n\n' +
      '_Einstellungen findest du in Carview → Einstellungen → Benachrichtigungen_',
      { parse_mode: 'MarkdownV2' }
    );
  });

  // Unbekannte Befehle
  bot.on('message', async ctx => {
    const text = ctx.message?.text || '';
    if (text.startsWith('/')) {
      return ctx.reply('❓ Unbekannter Befehl\\. Tippe /help für alle Befehle\\.', { parse_mode: 'MarkdownV2' });
    }
  });

  // Globaler Error-Handler — ein Handler-Fehler darf das Polling nicht killen.
  bot.catch((err, ctx) => {
    console.error(`[Telegram] Handler-Fehler (${ctx?.updateType}):`, err.message);
  });
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

async function getLinkForChat(ctx) {
  const chatId = String(ctx.chat.id);
  const masterDb = getMasterDb();
  const link = masterDb.prepare('SELECT * FROM telegram_links WHERE chat_id=?').get(chatId);
  if (!link) {
    await ctx.reply('❌ Kein Carview\\-Account verknüpft\\. Starte die Verknüpfung mit /start \\<Code\\>\\.', { parse_mode: 'MarkdownV2' });
    return null;
  }
  return link;
}

async function getStatusText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE is_active=1 LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein aktives Fahrzeug gefunden\\.';

    const lines = ['🚗 *Fahrzeugstatus*\n'];
    for (const v of vehicles) {
      const cache = db.prepare('SELECT * FROM vehicle_state_cache WHERE vehicle_id=?').get(v.id);
      const name  = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      const soc   = cache?.battery_level != null ? `${cache.battery_level}%` : '–';
      const km    = cache?.odometer_km   != null ? `${esc(Math.round(cache.odometer_km).toLocaleString('de-DE'))} km` : '–';
      const lock  = cache?.is_user_present ? '🔓 Nutzer anwesend' : '🔒 Geparkt';
      const sentry = cache?.sentry_mode ? ' 🛡️ Wächter aktiv' : '';
      lines.push(`*${name}*\n🔋 ${soc}  📍 ${km}  ${lock}${sentry}`);
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

async function getBatteryText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE is_active=1 LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein aktives Fahrzeug\\.';

    const lines = ['🔋 *Akkustand*\n'];
    for (const v of vehicles) {
      const cache = db.prepare('SELECT * FROM vehicle_state_cache WHERE vehicle_id=?').get(v.id);
      const name  = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      const soc   = cache?.battery_level != null ? `${cache.battery_level}%` : '–';

      // Letzte Ladung
      const lastCharge = db.prepare(
        'SELECT * FROM charging_sessions ORDER BY start_time DESC LIMIT 1'
      ).get();
      const addedKwh = lastCharge?.charge_energy_added != null
        ? `\\+${esc(Number(lastCharge.charge_energy_added).toFixed(1))} kWh`
        : '–';

      lines.push(`*${name}*\n🔋 Akku: ${soc}\n⚡ Letzte Ladung: ${addedKwh}`);
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

async function getTripsText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const trips = db.prepare(
      'SELECT * FROM trips ORDER BY start_time DESC LIMIT 5'
    ).all();

    if (!trips.length) return 'ℹ️ Noch keine Fahrten aufgezeichnet\\.';

    const lines = ['🗺️ *Letzte 5 Fahrten*\n'];
    for (const t of trips) {
      const date = esc(new Date(t.start_time * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }));
      const km   = t.distance_km ? `${esc(Number(t.distance_km).toFixed(1))} km` : '– km';
      const from = esc(t.start_address?.split(',')[0] || '–');
      const to   = esc(t.end_address?.split(',')[0]   || '–');
      const type = { private: '🏠', business: '💼', commute: '🏢' }[t.trip_type] || '🚗';
      lines.push(`${type} ${date} · ${km}\n_${from} → ${to}_`);
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

/** Escaped Text für Telegram MarkdownV2. */
function esc(str) {
  return String(str || '').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
}

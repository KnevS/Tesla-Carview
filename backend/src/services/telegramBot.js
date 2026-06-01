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
 *  /location      — Aktueller Standort (Google-Maps-Link)
 *  /range         — Restreichweite + verbleibende km bei aktuellem Verbrauch
 *  /today         — Tagesbilanz (km, kWh, Kosten, Anzahl Fahrten)
 *  /service       — Naechste faellige Wartung
 *  /firmware      — Aktuelle Software-Version + letztes Update
 *  /help          — Befehlsliste
 *  /unlink        — Verknüpfung aufheben
 *
 * Inline-Buttons (unter /status):
 *  🔒 Lock / 🔓 Unlock  — Tueren ver-/entriegeln (Unlock mit Confirm-Step)
 *  ❄️ Klima an/aus      — Vorklimatisierung starten/stoppen
 *  🛡 Sentry an/aus      — Wachmodus aktivieren/deaktivieren
 *  ⚡ Laden an/aus       — Ladevorgang starten/stoppen
 *  ⟳ Aktualisieren       — Status neu rendern (kein Tesla-Call)
 * Jede Aktion wird in audit_logs unter "telegram_command" geloggt.
 */

import { Telegraf, Markup } from 'telegraf';
import { getMasterDb, getAllTenants, getDb } from '../db/database.js';
import { getTenantSetting } from './configService.js';
import { apiProxyPost } from './teslaApi.js';
import { auditLog } from './auditService.js';

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

  // /status — Fahrzeugstatus mit Inline-Buttons fuer Schnell-Aktionen
  bot.command('status', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const statusText = await getStatusText(link.tenant_id, link.user_id);
    const keyboard   = buildStatusKeyboard(link.tenant_id);
    return ctx.reply(statusText, {
      parse_mode: 'MarkdownV2',
      ...(keyboard ? { reply_markup: keyboard.reply_markup } : {}),
    });
  });

  // Callback fuer Inline-Buttons: cmd:<vehicle_id>:<action>[:<confirm>]
  bot.action(/^cmd:(\d+):([a-z_]+)(?::(confirm))?$/, async ctx => {
    const vehicleId = Number(ctx.match[1]);
    const action    = ctx.match[2];
    const confirmed = ctx.match[3] === 'confirm';
    const link = await getLinkForChat(ctx);
    if (!link) { await ctx.answerCbQuery('Nicht verknüpft'); return; }

    await handleVehicleAction(ctx, link, vehicleId, action, confirmed);
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

  // /location — Aktueller Standort
  bot.command('location', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const text = await getLocationText(link.tenant_id, link.user_id);
    return ctx.reply(text, { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } });
  });

  // /range — Restreichweite
  bot.command('range', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const text = await getRangeText(link.tenant_id, link.user_id);
    return ctx.reply(text, { parse_mode: 'MarkdownV2' });
  });

  // /today — Tagesbilanz
  bot.command('today', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const text = await getTodayText(link.tenant_id, link.user_id);
    return ctx.reply(text, { parse_mode: 'MarkdownV2' });
  });

  // /service — Naechste Wartung
  bot.command('service', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const text = await getServiceText(link.tenant_id, link.user_id);
    return ctx.reply(text, { parse_mode: 'MarkdownV2' });
  });

  // /firmware — Software-Version
  bot.command('firmware', async ctx => {
    const link = await getLinkForChat(ctx);
    if (!link) return;
    const text = await getFirmwareText(link.tenant_id, link.user_id);
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
      '/range — Restreichweite\n' +
      '/location — Aktueller Standort \\(Maps\\-Link\\)\n' +
      '/today — Tagesbilanz \\(km, kWh, Kosten\\)\n' +
      '/trips — Letzte 5 Fahrten\n' +
      '/service — Naechste faellige Wartung\n' +
      '/firmware — Software\\-Version\n' +
      '/unlink — Bot\\-Verknüpfung aufheben\n' +
      '/help — Diese Hilfe\n\n' +
      '💡 _Unter /status erscheinen Inline\\-Buttons fuer Lock, Klima, Sentry, Laden_\n' +
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
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein Fahrzeug gefunden\\.';

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
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein Fahrzeug\\.';

    const lines = ['🔋 *Akkustand*\n'];
    for (const v of vehicles) {
      const cache = db.prepare('SELECT * FROM vehicle_state_cache WHERE vehicle_id=?').get(v.id);
      const name  = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      const soc   = cache?.battery_level != null ? `${cache.battery_level}%` : '–';

      // Letzte Ladung
      const lastCharge = db.prepare(
        'SELECT * FROM charging_sessions ORDER BY start_time DESC LIMIT 1'
      ).get();
      const addedKwh = lastCharge?.energy_added_kwh != null
        ? `\\+${esc(Number(lastCharge.energy_added_kwh).toFixed(1))} kWh`
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

async function getLocationText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein Fahrzeug gefunden\\.';

    const lines = ['📍 *Standort*\n'];
    for (const v of vehicles) {
      const last = db.prepare(
        'SELECT lat, lon, timestamp FROM telemetry_points WHERE vehicle_id=? AND lat IS NOT NULL AND lon IS NOT NULL ORDER BY timestamp DESC LIMIT 1'
      ).get(v.id);
      const name = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      if (!last) {
        lines.push(`*${name}*\n_Keine Positionsdaten verfuegbar_`);
        continue;
      }
      const lat = Number(last.lat).toFixed(5);
      const lon = Number(last.lon).toFixed(5);
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
      const age = esc(_relTime(last.timestamp));
      // MarkdownV2-Link: [label](url). lat/lon escapen weil Punkt drin.
      lines.push(`*${name}*\n[${esc(lat)}, ${esc(lon)}](${mapsUrl})\n_${age}_`);
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

async function getRangeText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein Fahrzeug gefunden\\.';

    const lines = ['🛣 *Restreichweite*\n'];
    for (const v of vehicles) {
      const snap = db.prepare(
        'SELECT soc, rated_range_km, ideal_range_km, timestamp FROM battery_snapshots WHERE vehicle_id=? ORDER BY timestamp DESC LIMIT 1'
      ).get(v.id);
      const cache = db.prepare('SELECT battery_level FROM vehicle_state_cache WHERE vehicle_id=?').get(v.id);
      const name  = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      const soc   = snap?.soc ?? cache?.battery_level ?? null;
      const rated = snap?.rated_range_km != null
        ? `${esc(Math.round(snap.rated_range_km))} km`
        : '–';
      const ideal = snap?.ideal_range_km != null
        ? ` \\(ideal: ${esc(Math.round(snap.ideal_range_km))} km\\)`
        : '';
      const socStr = soc != null ? `${soc}%` : '–';
      const age = snap?.timestamp ? `\n_Stand: ${esc(_relTime(snap.timestamp))}_` : '';
      lines.push(`*${name}*\n🔋 ${socStr} · ${rated}${ideal}${age}`);
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

async function getTodayText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein Fahrzeug gefunden\\.';

    // Tagesgrenze in Europe/Berlin — Carview rechnet auch in lokaler TZ.
    const todayStart = Math.floor(new Date(new Date().toLocaleDateString('en-CA') + 'T00:00:00').getTime() / 1000);

    const lines = ['📊 *Tagesbilanz heute*\n'];
    for (const v of vehicles) {
      const trips = db.prepare(
        'SELECT COUNT(*) AS n, COALESCE(SUM(distance_km), 0) AS km FROM trips WHERE vehicle_id=? AND start_time >= ? AND end_time IS NOT NULL'
      ).get(v.id, todayStart);

      const chg = db.prepare(
        'SELECT COUNT(*) AS n, COALESCE(SUM(energy_added_kwh), 0) AS kwh, COALESCE(SUM(cost), 0) AS cost ' +
        'FROM charging_sessions WHERE vehicle_id=? AND start_time >= ?'
      ).get(v.id, todayStart);

      const name = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      const km   = esc(Number(trips.km).toFixed(1));
      const kwh  = esc(Number(chg.kwh).toFixed(1));
      const cost = chg.cost > 0 ? ` · ${esc(Number(chg.cost).toFixed(2))} €` : '';
      lines.push(
        `*${name}*\n` +
        `🚗 ${trips.n} Fahrt${trips.n === 1 ? '' : 'en'} · ${km} km\n` +
        `⚡ ${chg.n} Ladung${chg.n === 1 ? '' : 'en'} · ${kwh} kWh${cost}`
      );
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

async function getServiceText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein Fahrzeug gefunden\\.';

    const nowS  = Math.floor(Date.now() / 1000);
    const lines = ['🔧 *Wartung*\n'];

    for (const v of vehicles) {
      const cache = db.prepare('SELECT odometer_km FROM vehicle_state_cache WHERE vehicle_id=?').get(v.id);
      const odoKm = cache?.odometer_km ?? v.odometer_km ?? 0;

      const items = db.prepare(
        `SELECT label, interval_months, interval_km, last_done_at, last_done_km, snoozed_until
         FROM service_intervals
         WHERE vehicle_id=? AND is_active=1
         ORDER BY kind`
      ).all(v.id);

      const name = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      if (!items.length) {
        lines.push(`*${name}*\n_Keine Wartungsintervalle konfiguriert_`);
        continue;
      }

      const due = [];
      for (const si of items) {
        if (si.snoozed_until && si.snoozed_until > nowS) continue;
        const dueByMonth = si.interval_months && si.last_done_at
          ? si.last_done_at + si.interval_months * 30 * 86400
          : null;
        const dueByKm    = si.interval_km && si.last_done_km != null
          ? si.last_done_km + si.interval_km
          : null;
        const monthsLeft = dueByMonth != null ? Math.round((dueByMonth - nowS) / (30 * 86400)) : null;
        const kmLeft     = dueByKm    != null ? Math.round(dueByKm - odoKm) : null;
        const overdue    = (monthsLeft != null && monthsLeft <= 0) || (kmLeft != null && kmLeft <= 0);
        due.push({ label: si.label, monthsLeft, kmLeft, overdue });
      }

      if (!due.length) {
        lines.push(`*${name}*\n_Aktuell nichts faellig_`);
        continue;
      }
      // Aelteste/dringlichste zuerst — sortiere nach kleinstem Wert
      due.sort((a, b) => {
        const ax = Math.min(a.monthsLeft ?? 1e9, (a.kmLeft ?? 1e9) / 1000);
        const bx = Math.min(b.monthsLeft ?? 1e9, (b.kmLeft ?? 1e9) / 1000);
        return ax - bx;
      });
      const list = due.slice(0, 4).map(d => {
        const icon = d.overdue ? '⚠️' : '🔧';
        const parts = [];
        if (d.monthsLeft != null) parts.push(`${d.monthsLeft <= 0 ? `${esc(-d.monthsLeft)} Monate ueberfaellig` : `noch ${esc(d.monthsLeft)} Monat${d.monthsLeft === 1 ? '' : 'e'}`}`);
        if (d.kmLeft != null)     parts.push(`${d.kmLeft <= 0 ? `${esc(-d.kmLeft)} km ueberfaellig` : `noch ${esc(d.kmLeft)} km`}`);
        return `${icon} ${esc(d.label)} — ${parts.join(' · ')}`;
      }).join('\n');
      lines.push(`*${name}*\n${list}`);
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

async function getFirmwareText(tenantId, userId) {
  try {
    const db = getDb(tenantId);
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id LIMIT 3').all();
    if (!vehicles.length) return 'ℹ️ Kein Fahrzeug gefunden\\.';

    const lines = ['💾 *Software*\n'];
    for (const v of vehicles) {
      const cur = db.prepare(
        'SELECT version, detected_at FROM firmware_versions WHERE vehicle_id=? ORDER BY detected_at DESC LIMIT 2'
      ).all(v.id);
      const name = esc(v.display_name || v.vin?.slice(-6) || 'Tesla');
      if (!cur.length) {
        lines.push(`*${name}*\n_Noch keine Versions-Historie_`);
        continue;
      }
      const latest    = cur[0];
      const prev      = cur[1];
      const installed = esc(_relTime(latest.detected_at));
      const fromPart  = prev ? `\nVorher: \`${esc(prev.version)}\`` : '';
      lines.push(`*${name}*\n\`${esc(latest.version)}\` _\\(installiert ${installed}\\)_${fromPart}`);
    }
    return lines.join('\n\n');
  } catch (err) {
    return `❌ Fehler: ${esc(err.message)}`;
  }
}

/** Relativ-Zeit ausgehend von einem Unix-Timestamp (Sekunden). */
function _relTime(ts) {
  if (!ts) return 'unbekannt';
  const diffS = Math.floor(Date.now() / 1000 - Number(ts));
  if (diffS < 60)    return 'gerade eben';
  if (diffS < 3600)  return `vor ${Math.floor(diffS / 60)} min`;
  if (diffS < 86400) return `vor ${Math.floor(diffS / 3600)} h`;
  if (diffS < 30 * 86400) return `vor ${Math.floor(diffS / 86400)} Tag${Math.floor(diffS / 86400) === 1 ? '' : 'en'}`;
  if (diffS < 365 * 86400) return `vor ${Math.floor(diffS / (30 * 86400))} Monaten`;
  return `vor ${Math.floor(diffS / (365 * 86400))} Jahren`;
}

// ── Inline-Buttons + Vehicle-Actions ────────────────────────────────────────

/**
 * Mapping von Callback-Action zu Tesla-Command. Body wird je nach Toggle-Wert
 * dynamisch zusammengesetzt (siehe handleVehicleAction).
 */
const ACTION_MAP = {
  lock:         { tesla: 'door_lock',                emoji: '🔒', label: 'Verriegelt'   },
  unlock:       { tesla: 'door_unlock',              emoji: '🔓', label: 'Entriegelt', confirm: true },
  climate_on:   { tesla: 'auto_conditioning_start',  emoji: '❄️', label: 'Klima an'    },
  climate_off:  { tesla: 'auto_conditioning_stop',   emoji: '⏹', label: 'Klima aus'   },
  sentry_on:    { tesla: 'set_sentry_mode', body: { on: true },  emoji: '🛡', label: 'Wachmodus an'  },
  sentry_off:   { tesla: 'set_sentry_mode', body: { on: false }, emoji: '⏸', label: 'Wachmodus aus' },
  charge_start: { tesla: 'charge_start',             emoji: '⚡', label: 'Laden gestartet' },
  charge_stop:  { tesla: 'charge_stop',              emoji: '⏹', label: 'Laden gestoppt' },
};

/**
 * Baut das Inline-Keyboard fuer /status. Liefert null, wenn keine Fahrzeuge
 * existieren. Aktuell ein einziger Button-Block pro erstem Fahrzeug (LIMIT 1):
 * sobald wir hier multi-vehicle unterstuetzen, kommt eine Auswahl-Reihe dazu.
 */
function buildStatusKeyboard(tenantId) {
  try {
    const db = getDb(tenantId);
    const v  = db.prepare('SELECT id FROM vehicles ORDER BY id LIMIT 1').get();
    if (!v) return null;
    const id = v.id;
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔒 Lock',    `cmd:${id}:lock`),
        Markup.button.callback('🔓 Unlock',  `cmd:${id}:unlock`),
      ],
      [
        Markup.button.callback('❄️ Klima an', `cmd:${id}:climate_on`),
        Markup.button.callback('⏹ Klima aus', `cmd:${id}:climate_off`),
      ],
      [
        Markup.button.callback('🛡 Sentry an', `cmd:${id}:sentry_on`),
        Markup.button.callback('⏸ Sentry aus', `cmd:${id}:sentry_off`),
      ],
      [
        Markup.button.callback('⚡ Laden start', `cmd:${id}:charge_start`),
        Markup.button.callback('⏹ Laden stop',  `cmd:${id}:charge_stop`),
      ],
      [
        Markup.button.callback('⟳ Aktualisieren', `cmd:${id}:refresh`),
      ],
    ]);
  } catch {
    return null;
  }
}

/**
 * Fuehrt eine Vehicle-Action aus, loggt in audit_logs und beantwortet den
 * Callback. Bei "unlock" wird ein Confirm-Schritt eingefuegt.
 */
async function handleVehicleAction(ctx, link, vehicleId, action, confirmed) {
  // /refresh: Status neu rendern, kein Tesla-Call
  if (action === 'refresh') {
    try {
      const text = await getStatusText(link.tenant_id, link.user_id);
      const kb   = buildStatusKeyboard(link.tenant_id);
      await ctx.editMessageText(text, {
        parse_mode: 'MarkdownV2',
        ...(kb ? { reply_markup: kb.reply_markup } : {}),
      });
      await ctx.answerCbQuery('Aktualisiert');
    } catch (e) {
      await ctx.answerCbQuery(`Fehler: ${e.message?.slice(0, 100) || 'unbekannt'}`);
    }
    return;
  }

  const spec = ACTION_MAP[action];
  if (!spec) { await ctx.answerCbQuery('Unbekannte Aktion'); return; }

  // Confirm-Step fuer riskante Aktionen (unlock)
  if (spec.confirm && !confirmed) {
    await ctx.answerCbQuery();
    await ctx.reply(
      `⚠️ *${spec.emoji} Wirklich ${esc(spec.label.toLowerCase())}?*\n` +
      `Diese Aktion wird im Audit\\-Log protokolliert\\.`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback(`✅ Ja, ${spec.label.toLowerCase()}`, `cmd:${vehicleId}:${action}:confirm`),
            Markup.button.callback('✖ Abbrechen', `cmd:${vehicleId}:refresh`),
          ],
        ]).reply_markup,
      }
    );
    return;
  }

  // Tesla-Command ausfuehren
  const db = getDb(link.tenant_id);
  const v  = db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicleId);
  if (!v) { await ctx.answerCbQuery('Fahrzeug nicht gefunden'); return; }
  if (!v.vin) { await ctx.answerCbQuery('Keine VIN hinterlegt'); return; }

  await ctx.answerCbQuery(`${spec.emoji} ${spec.label} …`);
  let okText, errText;
  try {
    await apiProxyPost(db, `/api/1/vehicles/${v.vin}/command/${spec.tesla}`, spec.body ?? {});
    okText = `${spec.emoji} ${spec.label}`;
    auditLog(db, link.user_id, 'telegram_command', null, {
      vehicle_id: vehicleId,
      command: spec.tesla,
      body: spec.body ?? null,
      result: 'ok',
    });
  } catch (e) {
    const status = e.response?.status;
    const apiErr = e.response?.data?.error || e.response?.data || e.message;
    if (status === 408 || /offline|asleep/i.test(String(apiErr))) {
      errText = 'Fahrzeug schläft oder ist offline';
    } else {
      errText = String(apiErr).slice(0, 150);
    }
    auditLog(db, link.user_id, 'telegram_command', null, {
      vehicle_id: vehicleId,
      command: spec.tesla,
      body: spec.body ?? null,
      result: 'error',
      error: errText,
    });
  }

  // Status neu rendern, damit der Nutzer sofort sieht ob's gewirkt hat
  try {
    const statusText = await getStatusText(link.tenant_id, link.user_id);
    const kb         = buildStatusKeyboard(link.tenant_id);
    const suffix     = errText
      ? `\n\n❌ ${esc(errText)}`
      : `\n\n✅ ${esc(okText)}`;
    await ctx.reply(statusText + suffix, {
      parse_mode: 'MarkdownV2',
      ...(kb ? { reply_markup: kb.reply_markup } : {}),
    });
  } catch { /* Reply darf nicht crashen */ }
}

/** Escaped Text für Telegram MarkdownV2. */
function esc(str) {
  return String(str || '').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
}

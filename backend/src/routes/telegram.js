/**
 * /api/telegram — Telegram-Bot-Verknüpfung für Endnutzer.
 *
 * GET  /api/telegram/status        — Verknüpfungsstatus + Bot-Username
 * POST /api/telegram/generate-code — Erzeugt 6-stelligen Link-Code (10 min gültig)
 * DELETE /api/telegram/unlink      — Verknüpfung aufheben
 * POST /api/telegram/webhook       — Telegram-Webhook-Empfänger (kein Auth)
 * GET  /api/telegram/vapid-key     — VAPID Public Key für Web Push (öffentlich)
 */

import { Router }       from 'express';
import { randomBytes }  from 'crypto';
import { getMasterDb }  from '../db/database.js';
import { getTenantSetting } from '../services/configService.js';
import { requireAuth }  from '../middleware/auth.js';
import { getBotUsername, getTelegramWebhookHandler } from '../services/telegramBot.js';

const router = Router();

// ── Status ────────────────────────────────────────────────────────────────────

router.get('/status', requireAuth, async (req, res) => {
  try {
    const masterDb = getMasterDb();
    const link = masterDb.prepare(
      'SELECT telegram_username, linked_at FROM telegram_links WHERE tenant_id=? AND user_id=?'
    ).get(req.user.tenantId, req.user.sub);

    const botUsername = await getBotUsername().catch(() => null);

    res.json({
      linked:           !!link,
      telegram_username: link?.telegram_username || null,
      linked_at:        link?.linked_at || null,
      bot_username:     botUsername,
      bot_configured:   !!(process.env.TELEGRAM_BOT_TOKEN || getTenantSetting(req.db, 'telegram.bot_token', null)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Link-Code erzeugen ────────────────────────────────────────────────────────

router.post('/generate-code', requireAuth, (req, res) => {
  try {
    const masterDb = getMasterDb();
    // Alten Code dieses Nutzers löschen
    masterDb.prepare(
      'DELETE FROM telegram_link_codes WHERE tenant_id=? AND user_id=?'
    ).run(req.user.tenantId, req.user.sub);

    // Abgelaufene Codes aufräumen
    masterDb.prepare('DELETE FROM telegram_link_codes WHERE expires_at < unixepoch()').run();

    // 6-stelligen alphanumerischen Code erzeugen
    const code = randomBytes(4).toString('base64url').slice(0, 6).toUpperCase();
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60; // 10 Minuten

    masterDb.prepare(
      'INSERT INTO telegram_link_codes (code, tenant_id, user_id, expires_at) VALUES (?, ?, ?, ?)'
    ).run(code, req.user.tenantId, req.user.sub, expiresAt);

    const botUsername = process.env.TELEGRAM_BOT_TOKEN
      ? null // wird async geladen; Frontend kann /status für Bot-Username abfragen
      : null;

    res.json({ code, expiresAt, botUsername });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Verknüpfung aufheben ──────────────────────────────────────────────────────

router.delete('/unlink', requireAuth, (req, res) => {
  try {
    const masterDb = getMasterDb();
    masterDb.prepare(
      'DELETE FROM telegram_links WHERE tenant_id=? AND user_id=?'
    ).run(req.user.tenantId, req.user.sub);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Telegram Webhook ──────────────────────────────────────────────────────────
// Diese Route wird von Telegram aufgerufen — KEIN requireAuth.
// Sicherheit: Telegraf validiert das Secret intern.

router.post('/webhook', (req, res, next) => {
  const handler = getTelegramWebhookHandler();
  if (handler) {
    return handler(req, res, next);
  }
  // Webhook nicht konfiguriert (Polling-Modus) — 200 zurückgeben damit Telegram nicht wiederholt
  res.sendStatus(200);
});

export default router;

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * /api/notifications — Web-Push-Subscriptions verwalten.
 *
 * POST   /subscribe         — Browser-Subscription speichern (user-basiert)
 * DELETE /unsubscribe       — Subscription entfernen
 * POST   /test              — Test-Push an aktuellen Nutzer senden
 * GET    /vapid-public-key  — VAPID Public Key (für PushManager.subscribe)
 * GET    /prefs             — Benachrichtigungseinstellungen des Nutzers
 * PUT    /prefs             — Einstellungen aktualisieren
 *
 * Legacy-Route (vehicle-basiert) bleibt erhalten für Rückwärtskompatibilität.
 */

import { Router }      from 'express';
import { getMasterDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { getTenantSetting } from '../services/configService.js';

const router = Router();

// ── VAPID Public Key (kein Auth nötig — nur öffentlicher Schlüssel) ──────────

router.get('/vapid-public-key', (req, res) => {
  const key = req.db
    ? getTenantSetting(req.db, 'vapid.public_key', 'VAPID_PUBLIC_KEY')
    : (process.env.VAPID_PUBLIC_KEY || null);
  res.json({ key });
});

// ── User-basierte Subscription ────────────────────────────────────────────────

router.post('/subscribe', requireAuth, (req, res) => {
  const masterDb = getMasterDb();
  const { subscription } = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'subscription.endpoint fehlt' });
  }
  try {
    masterDb.prepare(`
      INSERT INTO user_push_subscriptions (tenant_id, user_id, subscription_json, user_agent)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id, user_id, subscription_json) DO NOTHING
    `).run(req.user.tenantId, req.user.sub, JSON.stringify(subscription),
           req.headers['user-agent']?.slice(0, 300) || null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/unsubscribe', requireAuth, (req, res) => {
  const masterDb = getMasterDb();
  const { endpoint } = req.body;
  try {
    if (endpoint) {
      // Nur diesen Endpoint entfernen
      const subs = masterDb.prepare(
        'SELECT id, subscription_json FROM user_push_subscriptions WHERE tenant_id=? AND user_id=?'
      ).all(req.user.tenantId, req.user.sub);
      for (const s of subs) {
        const parsed = JSON.parse(s.subscription_json);
        if (parsed.endpoint === endpoint) {
          masterDb.prepare('DELETE FROM user_push_subscriptions WHERE id=?').run(s.id);
        }
      }
    } else {
      // Alle Subscriptions des Nutzers
      masterDb.prepare(
        'DELETE FROM user_push_subscriptions WHERE tenant_id=? AND user_id=?'
      ).run(req.user.tenantId, req.user.sub);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Test-Push ─────────────────────────────────────────────────────────────────

router.post('/test', requireAuth, async (req, res) => {
  try {
    const { notify } = await import('../services/notifyService.js');
    await notify({
      tenantId: req.user.tenantId,
      userId:   req.user.sub,
      db:       req.db,    // damit user.lang gelesen wird für Action-Labels
      type:     'generic',
      title:    '🔔 Tesla Carview — Testbenachrichtigung',
      body:     'Push-Notifications funktionieren korrekt!',
      url:      '/',
      emoji:    '✅',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Benachrichtigungseinstellungen ────────────────────────────────────────────

const DEFAULT_PREFS = {
  charging_complete: true,
  battery_low:       true,
  sentry_alert:      true,
  trip_recorded:     false,
  logbook_reminder:  true,
};

router.get('/prefs', requireAuth, (req, res) => {
  try {
    const row = req.db.prepare(
      "SELECT value FROM tenant_settings WHERE key=?"
    ).get(`notify_prefs_${req.user.sub}`);
    const prefs = row ? { ...DEFAULT_PREFS, ...JSON.parse(row.value) } : DEFAULT_PREFS;
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/prefs', requireAuth, (req, res) => {
  try {
    const allowed = Object.keys(DEFAULT_PREFS);
    const prefs   = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) prefs[k] = !!req.body[k];
    }
    req.db.prepare(`
      INSERT INTO tenant_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).run(`notify_prefs_${req.user.sub}`, JSON.stringify(prefs));
    res.json({ success: true, prefs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Legacy: vehicle-basierte Subscription (Rückwärtskompatibilität) ───────────

router.post('/subscribe-vehicle', (req, res) => {
  const db = req.db;
  const { vehicle_id, subscription } = req.body;
  if (!vehicle_id || !subscription) {
    return res.status(400).json({ error: 'vehicle_id und subscription erforderlich' });
  }
  try {
    db.prepare(
      'INSERT OR REPLACE INTO push_subscriptions (vehicle_id, subscription_json) VALUES (?, ?)'
    ).run(vehicle_id, JSON.stringify(subscription));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/unsubscribe-vehicle', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.body;
  db.prepare('DELETE FROM push_subscriptions WHERE vehicle_id=?').run(vehicle_id);
  res.json({ success: true });
});

export default router;

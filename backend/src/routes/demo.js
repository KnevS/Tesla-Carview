/**
 * Demo-/Tester-Sandbox.
 *
 * Eine einzige public Route: POST /api/demo/signup.
 *   - Aktiv nur, wenn ENV DEMO_ENABLED=true.
 *   - Erzeugt einen frischen Tester-User mit 14-Tage-Lebensdauer im
 *     Demo-Mandanten (slug=demo), seedet ein Fake-Fahrzeug + 3 Wochen
 *     Historie und liefert direkt einen Access-Token zurueck.
 *   - Harte Limits, damit der Self-Hoster sich nicht versehentlich
 *     ueberlaesst:
 *       MAX_ACTIVE_DEMO_USERS  globale Obergrenze (aktive Tester)
 *       DEMO_SIGNUPS_PER_IP    pro IP & 24h
 *       DEMO_LIFETIME_DAYS     pro Tester
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import { getMasterDb, getDb, ensureDemoTenant } from '../db/database.js';
import { createUser } from '../services/userService.js';
import { auditLog } from '../services/auditService.js';
import { seedNewDemoUser } from '../services/demoSeeder.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { deleteDemoUser } from '../services/demoLifecycle.js';

const router = Router();

// Alle Demo-Parameter per ENV konfigurierbar — Defaults fuer einen
// oeffentlichen Showcase-Server:
//   MAX_ACTIVE_DEMO_USERS  Gleichzeitig aktive Tester (Default 200)
//   DEMO_LIFETIME_DAYS     Lebenszeit pro Account in Tagen (Default 2)
//   DEMO_SIGNUPS_PER_IP    Anmeldungen pro IP & 24 h (Default 2)
const MAX_ACTIVE_DEMO_USERS = parseInt(process.env.MAX_ACTIVE_DEMO_USERS ?? '200', 10);
const DEMO_LIFETIME_DAYS    = parseInt(process.env.DEMO_LIFETIME_DAYS    ?? '2',   10);
const DEMO_SIGNUPS_PER_IP   = parseInt(process.env.DEMO_SIGNUPS_PER_IP   ?? '2',   10);
/** Cleanup laeuft alle 6h (siehe demoLifecycle.js). Zwischen Account-
 *  Ablauf und tatsaechlicher Loeschung kann also bis zu 6h Slack
 *  liegen. Wir addieren das auf next-free, damit die UI ehrlich ist. */
const CLEANUP_GRACE_S       = 6 * 3600;

const ACCESS_TTL  = '15m';
const REFRESH_TTL = 7 * 24 * 60 * 60;

// IP-Rate-Limit fuer den Signup-Endpoint — der teuerste Endpoint im
// System (legt User + ganze Historie an).
const signupRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: DEMO_SIGNUPS_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Pro IP nur ${DEMO_SIGNUPS_PER_IP} Demo-Account(s) in 24 Stunden.` },
});

function makeTesterName() {
  return 'tester-' + randomBytes(3).toString('hex');
}

function makeRandomPassword() {
  // 28 Zeichen, alphanum — der Tester braucht das Passwort sowieso nie
  // selber. Nur damit das User-Setup nicht crasht.
  return randomBytes(20).toString('base64url').slice(0, 28);
}

function issueAccessToken(user, tenantId) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, tenantId },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL, algorithm: 'HS256' },
  );
}

function issueRefreshToken(userId, tenantId, req) {
  const raw  = randomBytes(48).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  getMasterDb().prepare(
    `INSERT INTO refresh_tokens (tenant_id, user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(tenantId, userId, hash,
    Math.floor(Date.now() / 1000) + REFRESH_TTL,
    req.ip, req.headers['user-agent']?.slice(0, 255));
  return raw;
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true, secure: true, sameSite: 'Lax',
    maxAge: REFRESH_TTL * 1000, path: '/api/auth',
  });
}

router.post('/signup', signupRateLimit, async (req, res) => {
  if (process.env.DEMO_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Demo-Modus ist auf diesem System nicht aktiviert.' });
  }

  // Demo-Tenant existiert garantiert (wird beim Backend-Start angelegt).
  // Doppelt sichern — ensureDemoTenant ist idempotent.
  const tenantId = ensureDemoTenant();
  const db       = getDb(tenantId);

  // 1) globales Active-Limit. Aktive Tester = nicht abgelaufen, is_active=1.
  const now = Math.floor(Date.now() / 1000);
  const active = db.prepare(
    `SELECT COUNT(*) AS n FROM users
       WHERE is_active = 1
         AND expires_at IS NOT NULL
         AND expires_at > ?`
  ).get(now).n;
  if (active >= MAX_ACTIVE_DEMO_USERS) {
    // Konkretes Datum berechnen: ab wann ist wieder ein Platz frei?
    // = naechstes expires_at + 6h Cleanup-Slack.
    const nextExpiry = db.prepare(
      `SELECT MIN(expires_at) AS ts FROM users
         WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at > ?`
    ).get(now)?.ts;
    const retryAtS  = nextExpiry ? nextExpiry + CLEANUP_GRACE_S : null;
    const retryInS  = retryAtS ? Math.max(60, retryAtS - now)   : 3600;
    const retryAtIso = retryAtS ? new Date(retryAtS * 1000).toISOString() : null;
    const retryAtDe  = retryAtS
      ? new Date(retryAtS * 1000).toLocaleString('de-DE',
          { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;
    res.setHeader('Retry-After', String(retryInS));
    return res.status(503).json({
      error: retryAtDe
        ? `Demo-Sandbox aktuell voll — alle ${MAX_ACTIVE_DEMO_USERS} genehmigten Test-Plätze sind in Benutzung. `
          + `Ein neuer Platz wird voraussichtlich am ${retryAtDe} Uhr frei (sobald der nächste Tester-Account abläuft und die Cleanup-Routine ihn entfernt).`
        : `Demo-Sandbox aktuell voll — alle ${MAX_ACTIVE_DEMO_USERS} Test-Plätze in Benutzung.`,
      max_active: MAX_ACTIVE_DEMO_USERS,
      active,
      retry_at_iso:     retryAtIso,
      retry_at_de:      retryAtDe,
      retry_in_minutes: Math.ceil(retryInS / 60),
    });
  }

  // 2) Tester-User anlegen mit Ablaufdatum 14 Tage in Zukunft.
  const username = makeTesterName();
  const password = makeRandomPassword();
  const expires  = now + DEMO_LIFETIME_DAYS * 86400;
  try {
    const userId = await createUser(db, username, password, 'user');
    db.prepare('UPDATE users SET expires_at = ?, mfa_required = 0 WHERE id = ?')
      .run(expires, userId);

    // 3) Fake-Daten seeden.
    seedNewDemoUser(db, userId, username);

    // 4) JWT + Refresh-Cookie — User ist direkt eingeloggt.
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
    const accessToken  = issueAccessToken(user, tenantId);
    const refreshToken = issueRefreshToken(userId, tenantId, req);
    setRefreshCookie(res, refreshToken);

    auditLog(db, userId, 'demo_signup', req, { username, expires_at: expires });

    res.status(201).json({
      accessToken,
      user: {
        id: user.id, username: user.username, role: user.role,
        tenantId, tenantSlug: 'demo',
        mfaEnabled: false, mfaRequired: false,
        canEditVehicles: false, canAddVehicles: false,
      },
      demo: {
        expires_at: expires,
        days_left:  DEMO_LIFETIME_DAYS,
        note: `Demo-Account — alle Daten sind frei erfunden. Wird nach ${DEMO_LIFETIME_DAYS} Tag(en) automatisch geloescht.`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Demo-Setup fehlgeschlagen: ' + err.message });
  }
});

/** GET /api/demo/status — public; sagt dem Frontend, ob Demo aktiviert
 *  ist und wie viele Slots noch frei sind. Bei voll wird auch der
 *  voraussichtliche Zeitpunkt mitgeliefert, ab dem wieder ein Platz
 *  frei ist — damit die Login-Seite schon proaktiv hinweisen kann,
 *  ohne dass der Tester erst auf „Demo starten" klickt. */
router.get('/status', (_req, res) => {
  if (process.env.DEMO_ENABLED !== 'true') {
    return res.json({ enabled: false });
  }
  try {
    const tenantId = ensureDemoTenant();
    const db = getDb(tenantId);
    const now = Math.floor(Date.now() / 1000);
    const active = db.prepare(
      `SELECT COUNT(*) AS n FROM users
         WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at > ?`
    ).get(now).n;
    const slotsFree = Math.max(0, MAX_ACTIVE_DEMO_USERS - active);

    let next_slot_free_at_iso = null;
    let next_slot_free_at_de  = null;
    if (slotsFree === 0) {
      const nextExpiry = db.prepare(
        `SELECT MIN(expires_at) AS ts FROM users
           WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at > ?`
      ).get(now)?.ts;
      if (nextExpiry) {
        const retryAtS = nextExpiry + CLEANUP_GRACE_S;
        next_slot_free_at_iso = new Date(retryAtS * 1000).toISOString();
        next_slot_free_at_de  = new Date(retryAtS * 1000).toLocaleString('de-DE',
          { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    }

    res.json({
      enabled:       true,
      max_active:    MAX_ACTIVE_DEMO_USERS,
      active,
      slots_free:    slotsFree,
      lifetime_days: DEMO_LIFETIME_DAYS,
      next_slot_free_at_iso,
      next_slot_free_at_de,
    });
  } catch (e) {
    res.json({ enabled: false, error: e.message });
  }
});

// ── Admin-Routen (erfordern Auth + Admin-Rolle) ───────────────────────────────

/** GET /api/demo/admin/users — Liste aller Demo-Tester mit Ablaufdatum */
router.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
  if (process.env.DEMO_ENABLED !== 'true') return res.json({ users: [] });
  try {
    const tenantId = ensureDemoTenant();
    const db       = getDb(tenantId);
    const now      = Math.floor(Date.now() / 1000);
    const users    = db.prepare(`
      SELECT u.id, u.username, u.created_at, u.expires_at, u.is_active,
             (u.expires_at IS NOT NULL AND u.expires_at <= ?) AS is_expired,
             (SELECT COUNT(*) FROM vehicle_users vu WHERE vu.user_id = u.id) AS vehicle_count
      FROM users u
      WHERE u.expires_at IS NOT NULL
      ORDER BY u.created_at DESC
    `).all(now);
    res.json({ users, tenant_id: tenantId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/demo/admin/users/:id — einzelnen Demo-Tester löschen */
router.delete('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  if (process.env.DEMO_ENABLED !== 'true') return res.status(400).json({ error: 'Demo nicht aktiviert' });
  try {
    const tenantId = ensureDemoTenant();
    const db       = getDb(tenantId);
    const user     = db.prepare('SELECT id, username FROM users WHERE id=? AND expires_at IS NOT NULL').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Demo-User nicht gefunden' });
    deleteDemoUser(db, user.id);
    res.json({ ok: true, deleted: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/demo/admin/cleanup — alle abgelaufenen Tester sofort löschen */
router.post('/admin/cleanup', requireAuth, requireAdmin, (req, res) => {
  if (process.env.DEMO_ENABLED !== 'true') return res.json({ deleted: 0 });
  try {
    const tenantId = ensureDemoTenant();
    const db       = getDb(tenantId);
    const now      = Math.floor(Date.now() / 1000);
    const expired  = db.prepare('SELECT id, username FROM users WHERE expires_at IS NOT NULL AND expires_at <= ?').all(now);
    let deleted    = 0;
    for (const u of expired) {
      try { deleteDemoUser(db, u.id); deleted++; } catch { /* ignore single-user errors */ }
    }
    res.json({ deleted, message: `${deleted} abgelaufene Demo-User gelöscht` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

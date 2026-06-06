import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { validate } from '../middleware/validate.js';
import { loginRateLimit } from '../middleware/security.js';
import { requireAuth } from '../middleware/auth.js';
import {
  findUserByUsername, verifyPassword, rehashIfLegacy,
  recordFailedLogin, resetFailedLogins, isLockedOut,
} from '../services/userService.js';
import { verifyTotp, verifyBackupCode, decryptMfaSecret } from '../services/mfaService.js';
import { auditLog } from '../services/auditService.js';
import { getAuthUrl, getOwnerAuthUrl, exchangeCode, exchangeOwnerCode, getAccessToken, connectOwnerToken, getAuthMode, isOwnerApiPaused } from '../services/teslaApi.js';
import { setTenantSetting } from '../services/configService.js';
import { getMasterDb, getDb, getTenantBySlug, getTenantByPseudonym, getAllTenants, getTenantById } from '../db/database.js';

const router = Router();

const ACCESS_TTL  = '15m';
const REFRESH_TTL = 7 * 24 * 60 * 60;

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

/** Akzeptiert sowohl den internen slug als auch den nach aussen
 *  sichtbaren Pseudonym (Login-Seite uebergibt heute den slug aus dem
 *  Dropdown-Wert; getippt kann aber auch der Pseudonym kommen).
 *  Kein tenantIdent + mehrere Mandanten: auto-select, wenn es
 *  genau einen nicht-Demo-, nicht-suspendierten Mandanten gibt — z.B.
 *  wenn DEMO_ENABLED=true einen zweiten Mandanten anlegt und der Nutzer
 *  keinen Mandanten im Dropdown ausgewaehlt hat. */
function resolveTenant(tenantIdent) {
  if (tenantIdent) {
    return getTenantBySlug(tenantIdent) ?? getTenantByPseudonym(tenantIdent);
  }
  const tenants = getAllTenants();
  if (tenants.length === 1) return tenants[0];
  const active = tenants.filter(t => !t.is_demo && t.status !== 'suspended');
  if (active.length === 1) return active[0];
  return null;
}

// POST /api/auth/login
router.post('/login', loginRateLimit, validate(z.object({
  username:    z.string().min(1).max(64),
  password:    z.string().min(1).max(256),
  tenantSlug:  z.string().min(1).max(64).optional(),
})), async (req, res) => {
  const { username, password, tenantSlug } = req.body;

  const tenant = resolveTenant(tenantSlug);
  if (!tenant) {
    await new Promise(r => setTimeout(r, 300));
    return res.status(401).json({ error: 'Mandant nicht gefunden. Bitte tenantSlug angeben.' });
  }
  if (tenant.status === 'suspended') {
    await new Promise(r => setTimeout(r, 300));
    return res.status(403).json({ error: 'Mandant pausiert. Bitte Administrator kontaktieren.' });
  }

  const db   = getDb(tenant.id);
  const user = findUserByUsername(db, username);

  if (!user || !user.is_active) {
    await new Promise(r => setTimeout(r, 300));
    auditLog(db, null, 'login_failed', req, { username, reason: 'unknown_user' });
    return res.status(401).json({ error: 'Ungueltiger Benutzername oder Passwort' });
  }

  if (isLockedOut(user)) {
    auditLog(db, user.id, 'login_blocked', req);
    return res.status(423).json({ error: 'Konto gesperrt. Bitte 15 Minuten warten.' });
  }

  const valid = await verifyPassword(user, password);
  if (!valid) {
    recordFailedLogin(db, user.id);
    auditLog(db, user.id, 'login_failed', req, { reason: 'wrong_password' });
    return res.status(401).json({ error: 'Ungueltiger Benutzername oder Passwort' });
  }

  if (user.mfa_enabled) {
    const tempToken = jwt.sign(
      { sub: user.id, tenantId: tenant.id, mfa_pending: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' },
    );
    auditLog(db, user.id, 'login_mfa_pending', req);
    return res.json({ requiresMfa: true, tempToken });
  }

  resetFailedLogins(db, user.id);
  // Transparentes Upgrade bcrypt -> Argon2id beim ersten Login nach Update.
  await rehashIfLegacy(db, user, password);
  const accessToken  = issueAccessToken(user, tenant.id);
  const refreshToken = issueRefreshToken(user.id, tenant.id, req);
  setRefreshCookie(res, refreshToken);
  auditLog(db, user.id, 'login_success', req);
  res.json({
    accessToken,
    user: {
      id: user.id, username: user.username, role: user.role,
      tenantId: tenant.id, tenantSlug: tenant.slug,
      // Frontend-Flags fuer Pflicht-MFA und Permission-Toggles.
      // mfa_required && !mfa_enabled → Router-Guard zwingt zu /mfa/setup.
      mfaEnabled:        !!user.mfa_enabled,
      mfaRequired:       !!user.mfa_required,
      canEditVehicles:   user.role === 'admin' || !!user.can_edit_vehicles,
      canAddVehicles:    user.role === 'admin' || !!user.can_add_vehicles,
    },
  });
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', loginRateLimit, validate(z.object({
  tempToken: z.string().min(1),
  code:      z.string().min(4).max(12),
})), async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.body.tempToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Temporaeres Token abgelaufen. Bitte neu anmelden.' });
  }
  if (!payload.mfa_pending) return res.status(401).json({ error: 'Kein MFA-Pending-Token' });

  const db   = getDb(payload.tenantId);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(payload.sub);
  if (!user?.mfa_secret) return res.status(401).json({ error: 'MFA nicht konfiguriert' });

  // mfa_secret liegt in der DB verschluesselt (AES-256-GCM); fuer die
  // TOTP-Verifikation brauchen wir den Klartext.
  const validTotp   = verifyTotp(decryptMfaSecret(user.mfa_secret), req.body.code);
  const validBackup = !validTotp && await verifyBackupCode(db, user.id, req.body.code);

  if (!validTotp && !validBackup) {
    recordFailedLogin(db, user.id);
    auditLog(db, user.id, 'mfa_failed', req);
    return res.status(401).json({ error: 'Ungueltiger MFA-Code' });
  }

  resetFailedLogins(db, user.id);
  const accessToken  = issueAccessToken(user, payload.tenantId);
  const refreshToken = issueRefreshToken(user.id, payload.tenantId, req);
  setRefreshCookie(res, refreshToken);
  auditLog(db, user.id, 'login_success', req, { method: validBackup ? 'backup_code' : 'totp' });
  res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const raw = req.cookies?.refresh_token;
  if (!raw) return res.status(401).json({ error: 'Kein Refresh-Token' });

  const hash   = createHash('sha256').update(raw).digest('hex');
  const master = getMasterDb();
  const token  = master.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash=? AND expires_at > unixepoch()'
  ).get(hash);
  if (!token) return res.status(401).json({ error: 'Refresh-Token ungueltig oder abgelaufen' });

  const db   = getDb(token.tenant_id);
  const user = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(token.user_id);
  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden' });

  master.prepare('DELETE FROM refresh_tokens WHERE id=?').run(token.id);
  const newRefresh = issueRefreshToken(user.id, token.tenant_id, req);
  setRefreshCookie(res, newRefresh);
  res.json({ accessToken: issueAccessToken(user, token.tenant_id) });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const raw = req.cookies?.refresh_token;
  if (raw) {
    const hash = createHash('sha256').update(raw).digest('hex');
    getMasterDb().prepare('DELETE FROM refresh_tokens WHERE token_hash=?').run(hash);
  }
  res.clearCookie('refresh_token', { path: '/api/auth' });
  auditLog(req.db, req.user.sub, 'logout', req);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = req.db.prepare(
    `SELECT id, username, role, email, lang, mfa_enabled, mfa_required,
            can_edit_vehicles, can_add_vehicles, last_login, created_at,
            expires_at
       FROM users WHERE id=?`
  ).get(req.user.sub);
  // Demo-Status: ist der aktive Mandant der Demo-Sandbox?
  const isDemo = !!getTenantById(req.tenantId)?.is_demo;
  // Mandanten-Standard-Sprache mitliefern, damit Frontend ohne Flash umschalten kann
  const tenantDefaultLocale = req.db.prepare(
    "SELECT value FROM tenant_settings WHERE key='i18n.default_locale'"
  ).get()?.value || 'de';
  // Effektive Berechtigungen — Admin erhaelt alles, unabhaengig von Flags.
  const effective = {
    canEditVehicles: user.role === 'admin' || !!user.can_edit_vehicles,
    canAddVehicles:  user.role === 'admin' || !!user.can_add_vehicles,
  };
  res.json({
    ...user,
    mfa_enabled:  !!user.mfa_enabled,
    mfa_required: !!user.mfa_required,
    ...effective,
    tenantId: req.tenantId,
    tenantSlug: getTenantById(req.tenantId)?.slug ?? null,
    tenantDefaultLocale,
    is_demo: isDemo,
  });
});

// GET /api/auth/tenants — öffentlich. Liefert pro Mandant NUR den
// Pseudonym (z.B. „brave-eagle") als Display-Name nach aussen, NICHT
// den Klarnamen. Datenschutz-Hintergrund: ohne diese Schicht koennte
// jeder, der die Login-URL kennt, auflisten welche Firmen / Personen
// den Self-Hoster nutzen. Slug bleibt in der Response (internes
// Routing in der API), Frontend zeigt ausschliesslich den Pseudonym.
router.get('/tenants', (_req, res) => {
  const tenants = getAllTenants().map(t => ({
    slug:      t.slug,
    pseudonym: t.pseudonym,
    is_demo:   t.is_demo === 1,
  }));
  res.json(tenants);
});

// --- Tesla Fleet OAuth ---
router.get('/tesla/auth-url', requireAuth, (req, res) => {
  res.json({ url: getAuthUrl(req.tenantId) });
});
router.get('/tesla/owner-auth-url', requireAuth, (req, res) => {
  res.json({ url: getOwnerAuthUrl(req.tenantId) });
});
router.get('/tesla/login', requireAuth, (req, res) => {
  res.redirect(getAuthUrl(req.tenantId));
});

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/?auth_error=${error || 'no_code'}`);
  }
  if (!state) {
    return res.redirect(`${process.env.FRONTEND_URL}/?auth_error=missing_state`);
  }
  try {
    const pkce = getMasterDb().prepare('SELECT * FROM oauth_pkce WHERE state=?').get(state);
    if (!pkce) return res.redirect(`${process.env.FRONTEND_URL}/?auth_error=invalid_state`);
    const db = getDb(pkce.tenant_id);
    if ((pkce.mode || 'fleet') === 'owner') {
      await exchangeOwnerCode(db, code, state);
    } else {
      await exchangeCode(db, code, state);
    }
    // FRONTEND_URL ist Operator-kontrolliert, aber wir escapen es per
    // JSON.stringify, damit ein Single-Quote oder ungewollter Whitespace
    // im ENV-Wert nicht das Inline-<script> sprengt (Audit M5).
    const targetUrl = JSON.stringify(`${process.env.FRONTEND_URL}/?tesla_connected=1`);
    res.send(`<!DOCTYPE html><html><head><title>Verbunden</title></head><body>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'tesla_connected' }, window.opener.location.origin);
      setTimeout(() => window.close(), 300);
    } else {
      window.location.replace(${targetUrl});
    }
  } catch(e) {
    window.location.replace(${targetUrl});
  }
<\/script>
<p style="font-family:sans-serif;text-align:center;margin-top:80px">Tesla verbunden ✓<br><small>Dieses Fenster schließt sich automatisch.</small></p>
</body></html>`);
  } catch (e) {
    console.error('[Auth] Token-Exchange fehlgeschlagen:', e.response?.data || e.message);
    res.redirect(`${process.env.FRONTEND_URL}/?auth_error=exchange_failed`);
  }
});

router.get('/tesla/status', requireAuth, async (req, res) => {
  // Lese den Token-Status direkt aus der DB statt getAccessToken() —
  // getAccessToken wirft jetzt im pausierten Owner-Modus, soll aber
  // im Status-Endpoint genau das beschreibbar machen.
  const haveToken = !!req.db.prepare('SELECT 1 FROM tokens LIMIT 1').get();
  if (!haveToken) {
    return res.json({ connected: false, mode: 'fleet', paused: false });
  }
  const mode = getAuthMode(req.db);
  const paused = mode === 'owner' && isOwnerApiPaused(req.db);
  res.json({ connected: true, mode, paused });
});

// POST /api/auth/tesla/connect-owner-token
router.post('/tesla/connect-owner-token', requireAuth, async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token || typeof refresh_token !== 'string' || refresh_token.trim().length < 20) {
    return res.status(400).json({ error: 'Refresh-Token fehlt oder zu kurz' });
  }
  try {
    await connectOwnerToken(req.db, refresh_token.trim());
    // Beim Connect immer aktivieren — falls zuvor manuell pausiert.
    setTenantSetting(req.db, 'tesla.owner_api_paused', 'false');
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth] Owner-Token-Connect fehlgeschlagen:', err.response?.data || err.message);
    res.status(400).json({ error: 'Token ungültig oder abgelaufen. Bitte neuen Token generieren.' });
  }
});

// Owner API pausieren/wieder aktivieren ohne Tokens zu loeschen.
// Sinnvoll wenn Tesla die ownerapi-Tokens an Fleet API ablehnt — wir
// behalten die Konfiguration fuer den Fall dass Tesla wieder oeffnet
// oder spaeter Fleet OAuth eingerichtet wird.
router.post('/tesla/owner-api/pause', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  setTenantSetting(req.db, 'tesla.owner_api_paused', 'true');
  res.json({ ok: true, paused: true });
});

router.post('/tesla/owner-api/resume', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  setTenantSetting(req.db, 'tesla.owner_api_paused', 'false');
  res.json({ ok: true, paused: false });
});

export default router;

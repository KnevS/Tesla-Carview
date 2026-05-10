import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { validate } from '../middleware/validate.js';
import { loginRateLimit } from '../middleware/security.js';
import { requireAuth } from '../middleware/auth.js';
import {
  findUserByUsername, verifyPassword,
  recordFailedLogin, resetFailedLogins, isLockedOut,
} from '../services/userService.js';
import { verifyTotp, verifyBackupCode } from '../services/mfaService.js';
import { auditLog } from '../services/auditService.js';
import { getAuthUrl, exchangeCode, getAccessToken } from '../services/teslaApi.js';
import { getMasterDb, getDb, getTenantBySlug, getAllTenants, getTenantById } from '../db/database.js';

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

function resolveTenant(tenantSlug) {
  if (tenantSlug) {
    return getTenantBySlug(tenantSlug);
  }
  const tenants = getAllTenants();
  if (tenants.length === 1) return tenants[0];
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
  const accessToken  = issueAccessToken(user, tenant.id);
  const refreshToken = issueRefreshToken(user.id, tenant.id, req);
  setRefreshCookie(res, refreshToken);
  auditLog(db, user.id, 'login_success', req);
  res.json({
    accessToken,
    user: { id: user.id, username: user.username, role: user.role, tenantId: tenant.id, tenantSlug: tenant.slug },
  });
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', loginRateLimit, validate(z.object({
  tempToken: z.string().min(1),
  code:      z.string().min(4).max(12),
})), async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.body.tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Temporaeres Token abgelaufen. Bitte neu anmelden.' });
  }
  if (!payload.mfa_pending) return res.status(401).json({ error: 'Kein MFA-Pending-Token' });

  const db   = getDb(payload.tenantId);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(payload.sub);
  if (!user?.mfa_secret) return res.status(401).json({ error: 'MFA nicht konfiguriert' });

  const validTotp   = verifyTotp(user.mfa_secret, req.body.code);
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
    'SELECT id, username, role, email, lang, mfa_enabled, last_login, created_at FROM users WHERE id=?'
  ).get(req.user.sub);
  // Mandanten-Standard-Sprache mitliefern, damit Frontend ohne Flash umschalten kann
  const tenantDefaultLocale = req.db.prepare(
    "SELECT value FROM tenant_settings WHERE key='i18n.default_locale'"
  ).get()?.value || 'de';
  res.json({ ...user, tenantId: req.tenantId, tenantDefaultLocale });
});

// GET /api/auth/tenants — öffentlich, gibt verfügbare Slugs zurück (ohne sensitive Infos)
router.get('/tenants', (_req, res) => {
  const tenants = getAllTenants().map(t => ({ slug: t.slug, name: t.name }));
  res.json(tenants);
});

// --- Tesla Fleet OAuth ---
router.get('/tesla/auth-url', requireAuth, (req, res) => {
  res.json({ url: getAuthUrl(req.tenantId) });
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
    await exchangeCode(db, code, state);
    res.send(`<!DOCTYPE html><html><head><title>Verbunden</title></head><body>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'tesla_connected' }, window.opener.location.origin);
      setTimeout(() => window.close(), 300);
    } else {
      window.location.replace('${process.env.FRONTEND_URL}/?tesla_connected=1');
    }
  } catch(e) {
    window.location.replace('${process.env.FRONTEND_URL}/?tesla_connected=1');
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
  try {
    await getAccessToken(req.db);
    res.json({ connected: true });
  } catch {
    res.json({ connected: false });
  }
});

export default router;

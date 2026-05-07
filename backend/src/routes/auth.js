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
import { getDb } from '../db/database.js';

const router = Router();

const ACCESS_TTL  = '15m';
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 Tage in Sekunden

function issueAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL, algorithm: 'HS256' },
  );
}

function issueRefreshToken(userId, req) {
  const raw  = randomBytes(48).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  getDb().prepare(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, hash, Math.floor(Date.now() / 1000) + REFRESH_TTL,
    req.ip, req.headers['user-agent']?.slice(0, 255));
  return raw;
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: REFRESH_TTL * 1000,
    path: '/api/auth',
  });
}

// POST /api/auth/login
router.post('/login', loginRateLimit, validate(z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
})), async (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username);

  // Verzögerung verhindert Timing-Angriffe zur Benutzer-Enumeration
  if (!user || !user.is_active) {
    await new Promise(r => setTimeout(r, 300));
    auditLog(null, 'login_failed', req, { username, reason: 'unknown_user' });
    return res.status(401).json({ error: 'Ungueltiger Benutzername oder Passwort' });
  }

  if (isLockedOut(user)) {
    auditLog(user.id, 'login_blocked', req);
    return res.status(423).json({ error: 'Konto gesperrt. Bitte 15 Minuten warten.' });
  }

  const valid = await verifyPassword(user, password);
  if (!valid) {
    recordFailedLogin(user.id);
    auditLog(user.id, 'login_failed', req, { reason: 'wrong_password' });
    return res.status(401).json({ error: 'Ungueltiger Benutzername oder Passwort' });
  }

  // MFA aktiv: kein vollstaendiges Token, nur temporaeres MFA-Pending-Token (5 Min)
  if (user.mfa_enabled) {
    const tempToken = jwt.sign(
      { sub: user.id, mfa_pending: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' },
    );
    auditLog(user.id, 'login_mfa_pending', req);
    return res.json({ requiresMfa: true, tempToken });
  }

  resetFailedLogins(user.id);
  const accessToken  = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user.id, req);
  setRefreshCookie(res, refreshToken);
  auditLog(user.id, 'login_success', req);
  res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', loginRateLimit, validate(z.object({
  tempToken: z.string().min(1),
  code: z.string().min(4).max(12),
})), async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.body.tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Temporaeres Token abgelaufen. Bitte neu anmelden.' });
  }
  if (!payload.mfa_pending) return res.status(401).json({ error: 'Kein MFA-Pending-Token' });

  const user = getDb().prepare('SELECT * FROM users WHERE id=?').get(payload.sub);
  if (!user?.mfa_secret) return res.status(401).json({ error: 'MFA nicht konfiguriert' });

  const validTotp   = verifyTotp(user.mfa_secret, req.body.code);
  const validBackup = !validTotp && await verifyBackupCode(user.id, req.body.code);

  if (!validTotp && !validBackup) {
    recordFailedLogin(user.id);
    auditLog(user.id, 'mfa_failed', req);
    return res.status(401).json({ error: 'Ungueltiger MFA-Code' });
  }

  resetFailedLogins(user.id);
  const accessToken  = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user.id, req);
  setRefreshCookie(res, refreshToken);
  auditLog(user.id, 'login_success', req, { method: validBackup ? 'backup_code' : 'totp' });
  res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/refresh  (Refresh-Token-Rotation)
router.post('/refresh', (req, res) => {
  const raw = req.cookies?.refresh_token;
  if (!raw) return res.status(401).json({ error: 'Kein Refresh-Token' });

  const hash  = createHash('sha256').update(raw).digest('hex');
  const db    = getDb();
  const token = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash=? AND expires_at > unixepoch()'
  ).get(hash);
  if (!token) return res.status(401).json({ error: 'Refresh-Token ungueltig oder abgelaufen' });

  const user = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(token.user_id);
  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden' });

  // Token-Rotation: altes Token loeschen, neues ausstellen
  db.prepare('DELETE FROM refresh_tokens WHERE id=?').run(token.id);
  const newRefresh = issueRefreshToken(user.id, req);
  setRefreshCookie(res, newRefresh);
  res.json({ accessToken: issueAccessToken(user) });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const raw = req.cookies?.refresh_token;
  if (raw) {
    const hash = createHash('sha256').update(raw).digest('hex');
    getDb().prepare('DELETE FROM refresh_tokens WHERE token_hash=?').run(hash);
  }
  res.clearCookie('refresh_token', { path: '/api/auth' });
  auditLog(req.user.sub, 'logout', req);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = getDb().prepare(
    'SELECT id, username, role, mfa_enabled, last_login, created_at FROM users WHERE id=?'
  ).get(req.user.sub);
  res.json(user);
});

// --- Tesla Fleet OAuth (wird vom Benutzer initiiert) ---
router.get('/tesla/auth-url', requireAuth, (_req, res) => res.json({ url: getAuthUrl() }));
router.get('/tesla/login',    requireAuth, (_req, res) => res.redirect(getAuthUrl()));

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/?auth_error=${error || 'no_code'}`);
  }
  if (!state) {
    return res.redirect(`${process.env.FRONTEND_URL}/?auth_error=missing_state`);
  }
  try {
    await exchangeCode(code, state);
    res.redirect(`${process.env.FRONTEND_URL}/?tesla_connected=1`);
  } catch (e) {
    console.error('[Auth] Token-Exchange fehlgeschlagen:', e.response?.data || e.message);
    res.redirect(`${process.env.FRONTEND_URL}/?auth_error=exchange_failed`);
  }
});

router.get('/tesla/status', requireAuth, async (_req, res) => {
  try {
    await getAccessToken();
    res.json({ connected: true });
  } catch {
    res.json({ connected: false });
  }
});

export default router;

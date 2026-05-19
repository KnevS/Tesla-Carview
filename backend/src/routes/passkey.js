import { Router } from 'express';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { getMasterDb, getTenantBySlug, getAllTenants, getDb } from '../db/database.js';
import { auditLog } from '../services/auditService.js';

const router = Router();

const RP_NAME   = process.env.RP_NAME   || 'Tesla Carview';
const RP_ID     = process.env.RP_ID     || (process.env.FRONTEND_URL?.replace(/^https?:\/\//, '').split(':')[0]) || 'localhost';
const RP_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const ACCESS_TTL  = '15m';
const REFRESH_TTL = 7 * 24 * 60 * 60;

// Hilfsfunktion: Passkey-Tabelle sicherstellen
function ensurePasskeyTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS passkey_credentials (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_type TEXT,
    transports TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`);
}

// Herausforderungen werden im master DB gespeichert (kurze TTL)
function storeChallenge(tenantId, userId, challenge) {
  getMasterDb().exec(`CREATE TABLE IF NOT EXISTS passkey_challenges (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id INTEGER,
    challenge TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  )`);
  getMasterDb().prepare('DELETE FROM passkey_challenges WHERE created_at < unixepoch() - 300').run();
  const id = randomBytes(16).toString('hex');
  // In simplewebauthn v10, challenge is a Uint8Array — immer als base64url-String speichern.
  const challengeStr = typeof challenge === 'string'
    ? challenge
    : Buffer.from(challenge).toString('base64url');
  getMasterDb().prepare(
    'INSERT INTO passkey_challenges (id, tenant_id, user_id, challenge) VALUES (?, ?, ?, ?)'
  ).run(id, tenantId, userId ?? null, challengeStr);
  return id;
}

function getAndDeleteChallenge(challengeId) {
  const row = getMasterDb().prepare('SELECT * FROM passkey_challenges WHERE id=?').get(challengeId);
  if (row) getMasterDb().prepare('DELETE FROM passkey_challenges WHERE id=?').run(challengeId);
  return row;
}

// ---- Registrierung (für eingeloggte Benutzer) ----

// POST /api/passkey/register-options
router.post('/register-options', requireAuth, async (req, res) => {
  try {
    ensurePasskeyTable(req.db);
    const user = req.db.prepare('SELECT * FROM users WHERE id=?').get(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    const existingCredentials = req.db.prepare(
      'SELECT credential_id FROM passkey_credentials WHERE user_id=?'
    ).all(user.id);

    const options = await generateRegistrationOptions({
      rpName:  RP_NAME,
      rpID:    RP_ID,
      userID:  new TextEncoder().encode(String(user.id)),
      userName: user.username,
      userDisplayName: user.username,
      excludeCredentials: existingCredentials.map(c => ({
        id: c.credential_id, // v10: base64url-String, kein Buffer
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const challengeId = storeChallenge(req.tenantId, user.id, options.challenge);
    res.json({ ...options, challengeId });
  } catch (err) {
    console.error('[Passkey] register-options Fehler:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/passkey/register-verify
router.post('/register-verify', requireAuth, async (req, res) => {
  ensurePasskeyTable(req.db);
  const { challengeId, response, deviceName } = req.body;
  const stored = getAndDeleteChallenge(challengeId);
  if (!stored || stored.user_id !== req.user.sub) {
    return res.status(400).json({ error: 'Challenge ungültig oder abgelaufen' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin:    RP_ORIGIN,
      expectedRPID:      RP_ID,
    });

    if (!verification.verified) return res.status(400).json({ error: 'Verifikation fehlgeschlagen' });

    const { credentialID, credentialPublicKey, counter, credentialDeviceType } = verification.registrationInfo;
    // v10: credentialID ist ein Uint8Array — als base64url-String in DB speichern.
    const credIdStr = typeof credentialID === 'string'
      ? credentialID
      : Buffer.from(credentialID).toString('base64url');
    req.db.prepare(
      `INSERT OR REPLACE INTO passkey_credentials
       (user_id, credential_id, public_key, counter, device_type, transports)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.sub,
      credIdStr,
      Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
      deviceName ?? credentialDeviceType ?? null,
      response.response?.transports ? JSON.stringify(response.response.transports) : null,
    );

    auditLog(req.db, req.user.sub, 'passkey_registered', req, { device: deviceName });
    res.json({ success: true });
  } catch (err) {
    console.error('[Passkey] register-verify Fehler:', err.message, '| Origin erwartet:', RP_ORIGIN, '| RP_ID:', RP_ID);
    res.status(400).json({ error: err.message });
  }
});

// ---- Authentifizierung (ohne Login) ----

// POST /api/passkey/login-options
router.post('/login-options', async (req, res) => {
  const { tenantSlug, tenantId } = req.body ?? {};
  let tenant;
  if (tenantSlug) {
    tenant = getTenantBySlug(tenantSlug);
  } else if (tenantId) {
    const all = getAllTenants();
    tenant = all.find(t => t.id === tenantId) ?? null;
  } else {
    const tenants = getAllTenants();
    if (tenants.length === 1) tenant = tenants[0];
  }
  if (!tenant) return res.status(400).json({ error: 'Mandant nicht gefunden' });

  const db = getDb(tenant.id);
  ensurePasskeyTable(db);

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
  });

  const challengeId = storeChallenge(tenant.id, null, options.challenge);
  res.json({ ...options, challengeId, tenantId: tenant.id });
});

// POST /api/passkey/login-verify
router.post('/login-verify', async (req, res) => {
  const { challengeId, response, tenantId } = req.body;
  const stored = getAndDeleteChallenge(challengeId);
  if (!stored || stored.tenant_id !== tenantId) {
    return res.status(400).json({ error: 'Challenge ungültig oder abgelaufen' });
  }

  const db = getDb(tenantId);
  ensurePasskeyTable(db);

  const credentialId = response.id; // base64url
  const credential   = db.prepare(
    'SELECT * FROM passkey_credentials WHERE credential_id=?'
  ).get(credentialId);
  if (!credential) return res.status(401).json({ error: 'Passkey nicht registriert' });

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin:    RP_ORIGIN,
      expectedRPID:      RP_ID,
      // v10: 'authenticator' → 'credential', credentialPublicKey → publicKey (Uint8Array)
      credential: {
        id:         credential.credential_id,
        publicKey:  Buffer.from(credential.public_key, 'base64url'),
        counter:    credential.counter,
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    });

    if (!verification.verified) return res.status(401).json({ error: 'Passkey-Verifikation fehlgeschlagen' });

    // Counter aktualisieren
    db.prepare('UPDATE passkey_credentials SET counter=? WHERE id=?')
      .run(verification.authenticationInfo.newCounter, credential.id);

    const user = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(credential.user_id);
    if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden oder deaktiviert' });

    const accessToken  = jwt.sign(
      { sub: user.id, username: user.username, role: user.role, tenantId },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TTL, algorithm: 'HS256' },
    );
    const refreshRaw  = randomBytes(48).toString('hex');
    const refreshHash = createHash('sha256').update(refreshRaw).digest('hex');
    getMasterDb().prepare(
      `INSERT INTO refresh_tokens (tenant_id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(tenantId, user.id, refreshHash,
      Math.floor(Date.now() / 1000) + REFRESH_TTL,
      req.ip, req.headers['user-agent']?.slice(0, 255));

    res.cookie('refresh_token', refreshRaw, {
      httpOnly: true, secure: true, sameSite: 'Strict',
      maxAge: REFRESH_TTL * 1000, path: '/api/auth',
    });

    auditLog(db, user.id, 'login_passkey', req);
    res.json({
      accessToken,
      user: { id: user.id, username: user.username, role: user.role, tenantId },
    });
  } catch (err) {
    console.error('[Passkey] login-verify Fehler:', err.message, '| RP_ID:', RP_ID, '| Origin:', RP_ORIGIN);
    res.status(401).json({ error: err.message });
  }
});

// GET /api/passkey/credentials — eigene Passkeys auflisten
router.get('/credentials', requireAuth, (req, res) => {
  ensurePasskeyTable(req.db);
  const creds = req.db.prepare(
    'SELECT id, device_type, created_at FROM passkey_credentials WHERE user_id=?'
  ).all(req.user.sub);
  res.json(creds);
});

// DELETE /api/passkey/credentials/:id — Passkey entfernen
router.delete('/credentials/:id', requireAuth, (req, res) => {
  const cred = req.db.prepare(
    'SELECT * FROM passkey_credentials WHERE id=? AND user_id=?'
  ).get(req.params.id, req.user.sub);
  if (!cred) return res.status(404).json({ error: 'Passkey nicht gefunden' });
  req.db.prepare('DELETE FROM passkey_credentials WHERE id=?').run(req.params.id);
  auditLog(req.db, req.user.sub, 'passkey_removed', req);
  res.json({ success: true });
});

export default router;

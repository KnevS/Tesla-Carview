// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getMasterDb, getTenantBySlug, getAllTenants, getDb } from '../db/database.js';
import { auditLog } from '../services/auditService.js';
import { loginRateLimit } from '../middleware/security.js';

const router = Router();

const RP_ID     = process.env.RP_ID || (process.env.FRONTEND_URL?.replace(/^https?:\/\//, '').split(':')[0]) || 'localhost';
const RP_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const PAIR_TTL  = 5 * 60; // 5 Minuten
const ACCESS_TTL  = '15m';
const REFRESH_TTL = 7 * 24 * 60 * 60;

function ensurePairTable() {
  getMasterDb().exec(`CREATE TABLE IF NOT EXISTS pair_sessions (
    token TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    user_id INTEGER,
    used_at INTEGER,
    redirect_path TEXT
  )`);
  // redirect_path-Spalte nachrüsten falls Tabelle älter als dieses Migrationsskript ist
  try {
    getMasterDb().exec("ALTER TABLE pair_sessions ADD COLUMN redirect_path TEXT");
  } catch { /* Spalte existiert bereits */ }
  getMasterDb().prepare('DELETE FROM pair_sessions WHERE expires_at < unixepoch() - 300').run();
}

// GET /api/pair/init?tenantSlug=xxx&redirect=/fahrtenbuch
// Tesla-Browser oder beliebiger Client erstellt neue Pair-Session.
// Optionaler ?redirect=-Pfad wird nach erfolgreichem Login verwendet.
router.get('/init', loginRateLimit, async (req, res) => {
  try {
    ensurePairTable();
    const { tenantSlug, redirect: redirectPath } = req.query;
    // Sicherheitsprüfung: nur interne Pfade erlaubt (keine externe URLs)
    const safeRedirect = (redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//'))
      ? redirectPath.slice(0, 200)
      : null;
    let tenant;
    if (tenantSlug) {
      tenant = getTenantBySlug(tenantSlug);
    } else {
      const tenants = getAllTenants();
      if (tenants.length === 1) {
        tenant = tenants[0];
      } else {
        // Bei mehreren Mandanten: ersten nicht-Demo-Mandanten mit aktiven Nutzern nehmen
        const active = tenants.filter(t => t.status !== 'suspended' && !t.is_demo);
        if (active.length === 1) {
          tenant = active[0];
        } else {
          // Fallback-Priorität: 'default' > erster aktiver > null
          tenant = active.find(t => t.slug === 'default')
            ?? active.find(t => t.slug && !t.slug.startsWith('demo'))
            ?? null;
        }
      }
    }
    if (!tenant) return res.status(400).json({ error: 'Mandant nicht gefunden' });

    const token = randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + PAIR_TTL;

    getMasterDb().prepare(
      'INSERT INTO pair_sessions (token, tenant_id, expires_at, redirect_path) VALUES (?, ?, ?, ?)'
    ).run(token, tenant.id, expiresAt, safeRedirect);

    const pairUrl = `${RP_ORIGIN}/pair/${token}`;
    const qrDataUrl = await QRCode.toDataURL(pairUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#e8e8e8', light: '#1a1a1a' },
    });

    res.json({ token, qrDataUrl, expiresAt, tenantId: tenant.id, redirectPath: safeRedirect });
  } catch (err) {
    console.error('[Pair] init Fehler:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pair/poll/:token
// Tesla-Browser fragt alle 2s ob bestätigt; bei Bestätigung: JWT zurück
router.get('/poll/:token', async (req, res) => {
  try {
    ensurePairTable();
    const row = getMasterDb().prepare('SELECT * FROM pair_sessions WHERE token=?').get(req.params.token);

    if (!row) return res.json({ status: 'expired' });
    if (row.used_at) return res.json({ status: 'expired' });
    if (row.expires_at < Math.floor(Date.now() / 1000)) {
      getMasterDb().prepare('DELETE FROM pair_sessions WHERE token=?').run(req.params.token);
      return res.json({ status: 'expired' });
    }
    if (!row.user_id) return res.json({ status: 'pending' });

    // Bestätigt — JWT für den wartenden Browser ausstellen
    const db = getDb(row.tenant_id);
    const user = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(row.user_id);
    if (!user) {
      getMasterDb().prepare('DELETE FROM pair_sessions WHERE token=?').run(req.params.token);
      return res.json({ status: 'expired' });
    }

    const accessToken = jwt.sign(
      { sub: user.id, username: user.username, role: user.role, tenantId: row.tenant_id },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TTL, algorithm: 'HS256' },
    );
    const refreshRaw  = randomBytes(48).toString('hex');
    const refreshHash = createHash('sha256').update(refreshRaw).digest('hex');
    getMasterDb().prepare(
      `INSERT INTO refresh_tokens (tenant_id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(row.tenant_id, user.id, refreshHash,
      Math.floor(Date.now() / 1000) + REFRESH_TTL,
      req.ip, req.headers['user-agent']?.slice(0, 255));

    getMasterDb().prepare('UPDATE pair_sessions SET used_at=unixepoch() WHERE token=?').run(req.params.token);

    res.cookie('refresh_token', refreshRaw, {
      httpOnly: true, secure: true, sameSite: 'Strict',
      maxAge: REFRESH_TTL * 1000, path: '/api/auth',
    });

    auditLog(db, user.id, 'login_pair_qr', req);
    res.json({
      status: 'confirmed',
      accessToken,
      user: { id: user.id, username: user.username, role: user.role, tenantId: row.tenant_id },
      redirectPath: row.redirect_path ?? null,
    });
  } catch (err) {
    console.error('[Pair] poll Fehler:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pair/info/:token — Smartphone holt Session-Info (tenantId + Ablauf)
router.get('/info/:token', (req, res) => {
  try {
    ensurePairTable();
    const row = getMasterDb().prepare(
      'SELECT tenant_id, expires_at, user_id, used_at, redirect_path FROM pair_sessions WHERE token=?'
    ).get(req.params.token);

    if (!row) return res.status(404).json({ error: 'Session nicht gefunden' });
    if (row.used_at || row.expires_at < Math.floor(Date.now() / 1000)) {
      return res.status(410).json({ error: 'Session abgelaufen' });
    }
    if (row.user_id) return res.json({ status: 'already_confirmed' });

    res.json({ status: 'pending', tenantId: row.tenant_id, expiresAt: row.expires_at, redirectPath: row.redirect_path ?? null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pair/confirm/:token
// Smartphone bestätigt nach Passkey-Auth; nutzt challenge_table aus passkey.js
router.post('/confirm/:token', loginRateLimit, async (req, res) => {
  try {
    ensurePairTable();
    const row = getMasterDb().prepare('SELECT * FROM pair_sessions WHERE token=?').get(req.params.token);

    if (!row) return res.status(404).json({ error: 'Pair-Session nicht gefunden' });
    if (row.used_at) return res.status(400).json({ error: 'Pair-Session bereits abgeschlossen' });
    if (row.expires_at < Math.floor(Date.now() / 1000)) return res.status(400).json({ error: 'Pair-Session abgelaufen' });
    if (row.user_id) return res.status(400).json({ error: 'Pair-Session bereits bestätigt' });

    const { challengeId, response, tenantId } = req.body;
    if (tenantId !== row.tenant_id) return res.status(400).json({ error: 'Mandant stimmt nicht überein' });

    // Challenge aus gemeinsamer Tabelle laden (angelegt von passkey.js)
    const masterDb = getMasterDb();
    const stored = masterDb.prepare('SELECT * FROM passkey_challenges WHERE id=?').get(challengeId);
    if (stored) masterDb.prepare('DELETE FROM passkey_challenges WHERE id=?').run(challengeId);
    if (!stored || stored.tenant_id !== tenantId) {
      return res.status(400).json({ error: 'Challenge ungültig oder abgelaufen' });
    }

    const db = getDb(tenantId);
    const credentialId = response.id;
    const credential = db.prepare('SELECT * FROM passkey_credentials WHERE credential_id=?').get(credentialId);
    if (!credential) return res.status(401).json({ error: 'Passkey nicht registriert' });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin:    RP_ORIGIN,
      expectedRPID:      RP_ID,
      // v13: 'credential' (vorher 'authenticator') mit { id, publicKey, counter, transports }
      credential: {
        id:        credential.credential_id,
        publicKey: Buffer.from(credential.public_key, 'base64url'),
        counter:   credential.counter,
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    });

    if (!verification.verified) return res.status(401).json({ error: 'Passkey-Verifikation fehlgeschlagen' });

    db.prepare('UPDATE passkey_credentials SET counter=? WHERE id=?')
      .run(verification.authenticationInfo.newCounter, credential.id);

    const user = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(credential.user_id);
    if (!user) return res.status(401).json({ error: 'Benutzer nicht aktiv' });

    getMasterDb().prepare('UPDATE pair_sessions SET user_id=? WHERE token=?').run(user.id, req.params.token);

    auditLog(db, user.id, 'pair_confirmed_passkey', req);
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error('[Pair] confirm Fehler:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default router;

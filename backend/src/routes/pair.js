/**
 * QR-Pair-Login: kurzlebige Tokens, mit denen ein eingeloggter Nutzer
 * dem Tesla-Browser (oder einem anderen Zweitgerät) per QR-Code-Scan
 * eine fertige Session überträgt — ohne Passwort, ohne Passkey-Setup
 * im Auto.
 *
 * Sicherheits-Modell:
 *  - 32 Byte zufälliger Token (256-bit Entropie), 60 s TTL
 *  - SHA-256-Hash in master.pair_tokens; Klartext-Token nur einmal in der
 *    /create-Antwort, danach kennt der Server nur den Hash.
 *  - timing-safe Hash-Vergleich beim /consume
 *  - single-use: erfolgreicher Verbrauch loescht den Eintrag sofort
 *  - rate-limit auf /create (pro Auth) und /consume (pro IP)
 *  - Audit-Log fuer create+consume
 *  - Verbrauchender Request bekommt den gleichen JWT/Refresh-Cookie-
 *    Flow wie ein normaler Passwort- oder Passkey-Login.
 */
import { Router } from 'express';
import { randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth.js';
import { sensitiveTokenRateLimit } from '../middleware/security.js';
import { getMasterDb, getDb } from '../db/database.js';
import { auditLog } from '../services/auditService.js';
import { hashToken, timingSafeCompare } from '../services/cryptoService.js';

const router = Router();

const TOKEN_TTL_SECONDS = 60;
const ACCESS_TTL        = '15m';
const REFRESH_TTL       = 7 * 24 * 60 * 60;

// Tabelle wird lazy angelegt (analog passkey_credentials, damit kein
// Schema-Migrationspfad noetig ist).
function ensurePairTable() {
  getMasterDb().exec(`CREATE TABLE IF NOT EXISTS pair_tokens (
    token_hash TEXT PRIMARY KEY,
    tenant_id  TEXT NOT NULL,
    user_id    INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_ip TEXT
  )`);
  // Alte Reste rauswerfen — billiger als ein eigener cron-Job.
  getMasterDb().prepare('DELETE FROM pair_tokens WHERE expires_at < unixepoch()').run();
}

/**
 * POST /api/auth/pair/create
 * Eingeloggter Nutzer erzeugt einen Pair-Token + QR-Code (data:URL).
 * Wird im Frontend in einem Modal angezeigt; das Zweitgeraet scannt den
 * QR und landet auf /pair/<token>, was den Token verbraucht.
 */
router.post('/create', requireAuth, sensitiveTokenRateLimit, async (req, res) => {
  ensurePairTable();

  const raw     = randomBytes(32).toString('hex');     // 64 Hex-Zeichen
  const hash    = hashToken(raw);
  const expires = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

  getMasterDb().prepare(
    `INSERT INTO pair_tokens (token_hash, tenant_id, user_id, expires_at, created_ip)
     VALUES (?, ?, ?, ?, ?)`
  ).run(hash, req.tenantId, req.user.sub, expires, req.ip);

  const url = `${process.env.FRONTEND_URL || ''}/pair/${raw}`;
  // QR im Backend rendern: kein zusaetzlicher Frontend-Bundle-Cost.
  // errorCorrectionLevel 'M' ist Standard, margin=1 spart Platz im Modal.
  const qrDataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 320 });

  auditLog(req.db, req.user.sub, 'pair_token_created', req);
  res.json({
    url,
    qrDataUrl,
    expiresAt:        expires,
    expiresInSeconds: TOKEN_TTL_SECONDS,
  });
});

/**
 * POST /api/auth/pair/consume
 * Zweitgeraet (Tesla-Browser, iPhone) tauscht den Token gegen eine
 * Session. Bewusst KEIN requireAuth — der Token IST die Auth.
 * Setzt das gleiche refresh_token-Cookie wie /api/auth/login.
 */
router.post('/consume', sensitiveTokenRateLimit, async (req, res) => {
  ensurePairTable();

  const { token } = req.body ?? {};
  if (typeof token !== 'string' || token.length !== 64) {
    return res.status(400).json({ error: 'Token ungültig' });
  }

  const hash = hashToken(token);
  const row  = getMasterDb().prepare(
    'SELECT * FROM pair_tokens WHERE token_hash=?'
  ).get(hash);

  // Auch wenn der Hash nicht passt: timing-safe-Vergleich, damit der
  // Antwortzeit-Unterschied keinen Side-Channel auf "Token existiert"
  // hergibt. row.token_hash ist gleich hash falls SELECT was zurueckgab.
  const compareTarget = row ? row.token_hash : hash;
  if (!row || !timingSafeCompare(compareTarget, hash)) {
    return res.status(400).json({ error: 'Token ungültig oder abgelaufen' });
  }
  if (row.expires_at < Math.floor(Date.now() / 1000)) {
    getMasterDb().prepare('DELETE FROM pair_tokens WHERE token_hash=?').run(hash);
    return res.status(400).json({ error: 'Token abgelaufen' });
  }

  // Token einmalig verbrauchen — DELETE vor JWT-Issue, damit ein
  // Crash zwischendrin nicht den Token weiterverbrauchbar laesst.
  getMasterDb().prepare('DELETE FROM pair_tokens WHERE token_hash=?').run(hash);

  const db   = getDb(row.tenant_id);
  const user = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(row.user_id);
  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden oder deaktiviert' });

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

  res.cookie('refresh_token', refreshRaw, {
    httpOnly: true, secure: true, sameSite: 'Lax',
    maxAge: REFRESH_TTL * 1000, path: '/api/auth',
  });

  auditLog(db, user.id, 'login_pair_qr', req);
  res.json({
    accessToken,
    user: { id: user.id, username: user.username, role: user.role, tenantId: row.tenant_id },
  });
});

export default router;

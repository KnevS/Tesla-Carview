// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sensitiveTokenRateLimit } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { changePassword } from '../services/userService.js';
import { auditLog } from '../services/auditService.js';
import { hashToken, timingSafeCompare } from '../services/cryptoService.js';

const router = Router();
const TOKEN_TTL = 60 * 60; // 1 Stunde

/**
 * Reset-Tokens werden NUR als SHA-256-Hash in tenant_settings abgelegt.
 * Der Raw-Token verlaesst den /generate-Endpoint einmal als JSON-Response
 * an den Admin (→ Reset-Link); danach existiert er nur noch beim User.
 * DB-Leak → Angreifer hat Hash, nicht Token, kann das Reset also nicht
 * ausloesen.
 *
 * Der Hash-Vergleich in consumeResetToken() laeuft ueber timingSafeCompare,
 * damit Angreifer aus der Antwortzeit nicht Zeichen fuer Zeichen den Hash
 * rekonstruieren koennen.
 */
function storeResetToken(db, userId, rawToken) {
  const expires = Math.floor(Date.now() / 1000) + TOKEN_TTL;
  db.prepare(
    `INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)`
  ).run(`reset:${userId}`, JSON.stringify({ tokenHash: hashToken(rawToken), expires }));
}

function consumeResetToken(db, userId, rawToken) {
  const row = db.prepare("SELECT value FROM tenant_settings WHERE key=?").get(`reset:${userId}`);
  if (!row) return false;
  const data = JSON.parse(row.value);
  if (data.expires < Math.floor(Date.now() / 1000)) {
    db.prepare("DELETE FROM tenant_settings WHERE key=?").run(`reset:${userId}`);
    return false;
  }
  // timing-safe Vergleich der Hashes. data.tokenHash kann fehlen, wenn
  // noch eine alte Klartext-Reihe aus dem Pre-Hash-Schema in der DB liegt
  // — die laeuft mit Ablauf binnen 1h aus und wird hier hart abgelehnt
  // (besser: User loest Reset neu aus, als ein insecures Fallback).
  if (!data.tokenHash) {
    db.prepare("DELETE FROM tenant_settings WHERE key=?").run(`reset:${userId}`);
    return false;
  }
  if (!timingSafeCompare(data.tokenHash, hashToken(rawToken))) return false;
  db.prepare("DELETE FROM tenant_settings WHERE key=?").run(`reset:${userId}`);
  return true;
}

// POST /api/password-reset/generate — Admin generiert Token für User
router.post('/generate', requireAuth, requireAdmin, validate(z.object({
  userId: z.number().int().positive(),
})), (req, res) => {
  const user = req.db.prepare('SELECT id, username FROM users WHERE id=? AND is_active=1').get(req.body.userId);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  const token = randomBytes(32).toString('hex');
  storeResetToken(req.db, user.id, token);
  auditLog(req.db, req.user.sub, 'password_reset_generated', req, { targetUser: user.username });

  res.json({
    token,
    userId: user.id,
    username: user.username,
    expiresInMinutes: TOKEN_TTL / 60,
    resetUrl: `${process.env.FRONTEND_URL}/reset-password?userId=${user.id}&token=${token}`,
  });
});

// POST /api/password-reset/apply — Neues Passwort setzen (kein Auth erforderlich)
// Rate-Limit: 5 pro 5 min pro IP, Defense-in-Depth gegen Brute-Force
// auf 256-bit-Entropie-Tokens (Audit M6).
router.post('/apply', sensitiveTokenRateLimit, validate(z.object({
  userId:      z.number().int().positive(),
  token:       z.string().length(64),
  newPassword: z.string().min(12).max(256),
  tenantSlug:  z.string().min(1).optional(),
})), async (req, res) => {
  const { userId, token, newPassword, tenantSlug } = req.body;

  // Mandanten finden
  const { getAllTenants, getTenantBySlug, getDb } = await import('../db/database.js');
  let tenant;
  if (tenantSlug) {
    tenant = getTenantBySlug(tenantSlug);
  } else {
    const tenants = getAllTenants();
    if (tenants.length === 1) tenant = tenants[0];
  }
  if (!tenant) return res.status(400).json({ error: 'Mandant nicht gefunden' });

  const db = getDb(tenant.id);
  if (!consumeResetToken(db, userId, token)) {
    return res.status(400).json({ error: 'Token ungültig oder abgelaufen' });
  }

  await changePassword(db, userId, newPassword);
  auditLog(db, userId, 'password_reset_applied', req);
  res.json({ success: true });
});

export default router;

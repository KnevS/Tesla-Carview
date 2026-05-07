import { Router } from 'express';
import { randomBytes } from 'crypto';
import { getMasterDb } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const INVITE_TTL = 7 * 24 * 60 * 60; // 7 Tage

function ensureInviteTable() {
  getMasterDb().exec(`
    CREATE TABLE IF NOT EXISTS registration_invites (
      token      TEXT PRIMARY KEY,
      created_by_tenant TEXT NOT NULL,
      created_by_user   INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL,
      used_at    INTEGER,
      used_by_tenant TEXT
    )
  `);
}

// POST /api/invites — Einladungslink generieren (nur Admins)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const token     = randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + INVITE_TTL;
  getMasterDb().prepare(
    'INSERT INTO registration_invites (token, created_by_tenant, created_by_user, expires_at) VALUES (?,?,?,?)'
  ).run(token, req.tenantId, req.user.sub, expiresAt);

  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.json({ token, url: `${base}/register?invite=${token}`, expiresAt });
});

// GET /api/invites — Eigene aktive Einladungen auflisten
router.get('/', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const invites = getMasterDb().prepare(
    `SELECT token, created_at, expires_at, used_at, used_by_tenant
     FROM registration_invites
     WHERE created_by_tenant = ?
     ORDER BY created_at DESC LIMIT 50`
  ).all(req.tenantId);
  res.json(invites);
});

// DELETE /api/invites/:token — Einladung widerrufen
router.delete('/:token', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const invite = getMasterDb().prepare(
    'SELECT * FROM registration_invites WHERE token=? AND created_by_tenant=?'
  ).get(req.params.token, req.tenantId);
  if (!invite) return res.status(404).json({ error: 'Einladung nicht gefunden' });
  getMasterDb().prepare('DELETE FROM registration_invites WHERE token=?').run(req.params.token);
  res.json({ ok: true });
});

// GET /api/invites/validate/:token — Token prüfen (öffentlich, gemountet unter /api/invites/validate)
router.get('/:token', (req, res) => {
  ensureInviteTable();
  const invite = getMasterDb().prepare(
    'SELECT * FROM registration_invites WHERE token=?'
  ).get(req.params.token);
  if (!invite)              return res.json({ valid: false, reason: 'Einladungslink ungültig' });
  if (invite.used_at)       return res.json({ valid: false, reason: 'Einladungslink wurde bereits verwendet' });
  if (invite.expires_at < Math.floor(Date.now() / 1000))
                            return res.json({ valid: false, reason: 'Einladungslink ist abgelaufen' });
  res.json({ valid: true });
});

export default router;

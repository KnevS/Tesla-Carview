// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { getMasterDb } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const INVITE_TTL = 7 * 24 * 60 * 60; // 7 Tage

/** Erstellt die Tabelle falls neu, und ergaenzt die spaeter
 *  hinzugefuegten Spalten `note` und `revoked_at` per Idempotent-
 *  Migration. PRAGMA table_info ist hier ausreichend — wir reden ueber
 *  eine kleine Master-DB, nicht ueber per-Tenant-Tabellen. */
function ensureInviteTable() {
  const db = getMasterDb();
  db.exec(`
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
  const cols = db.prepare('PRAGMA table_info(registration_invites)').all().map(c => c.name);
  if (!cols.includes('note')) {
    db.exec('ALTER TABLE registration_invites ADD COLUMN note TEXT');
  }
  if (!cols.includes('revoked_at')) {
    db.exec('ALTER TABLE registration_invites ADD COLUMN revoked_at INTEGER');
  }
}

const noteSchema = z.string().max(200).nullish();

// POST /api/invites — Einladungslink generieren (nur Admins)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const parse = z.object({ note: noteSchema }).safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ error: 'note zu lang (max. 200 Zeichen)' });
  const note = parse.data.note?.trim() || null;

  const token     = randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + INVITE_TTL;
  getMasterDb().prepare(
    `INSERT INTO registration_invites
       (token, created_by_tenant, created_by_user, expires_at, note)
     VALUES (?, ?, ?, ?, ?)`
  ).run(token, req.tenantId, req.user.sub, expiresAt, note);

  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.json({ token, url: `${base}/register?invite=${token}`, expiresAt, note });
});

// GET /api/invites — Eigene Einladungen auflisten (auch verwendet/gesperrt,
// damit der Admin Hinweise zur Wiederverwendung hat).
router.get('/', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const invites = getMasterDb().prepare(
    `SELECT token, created_at, expires_at, used_at, used_by_tenant, note, revoked_at
     FROM registration_invites
     WHERE created_by_tenant = ?
     ORDER BY created_at DESC LIMIT 100`
  ).all(req.tenantId);
  res.json(invites);
});

/** PATCH /api/invites/:token — Hinweis nachtraeglich aendern. Andere
 *  Felder (Token, Ablauf, Nutzungsstatus) bleiben unveraendert. */
router.patch('/:token', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const parse = z.object({ note: noteSchema }).safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ error: 'note zu lang (max. 200 Zeichen)' });
  const note = parse.data.note?.trim() || null;

  const r = getMasterDb().prepare(
    'UPDATE registration_invites SET note = ? WHERE token = ? AND created_by_tenant = ?'
  ).run(note, req.params.token, req.tenantId);
  if (!r.changes) return res.status(404).json({ error: 'Einladung nicht gefunden' });
  res.json({ ok: true, note });
});

/** POST /api/invites/:token/revoke — Soft-Revoke. Anders als DELETE bleibt
 *  der Eintrag in der Liste sichtbar (mit Status „gesperrt") — so kann
 *  der Admin nachvollziehen, an wen er den Link mal vergeben hat. */
router.post('/:token/revoke', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const r = getMasterDb().prepare(
    `UPDATE registration_invites
        SET revoked_at = unixepoch()
      WHERE token = ? AND created_by_tenant = ? AND revoked_at IS NULL`
  ).run(req.params.token, req.tenantId);
  if (!r.changes) return res.status(404).json({ error: 'Einladung nicht gefunden oder bereits gesperrt' });
  res.json({ ok: true });
});

// DELETE /api/invites/:token — Einladung endgueltig entfernen
router.delete('/:token', requireAuth, requireAdmin, (req, res) => {
  ensureInviteTable();
  const r = getMasterDb().prepare(
    'DELETE FROM registration_invites WHERE token = ? AND created_by_tenant = ?'
  ).run(req.params.token, req.tenantId);
  if (!r.changes) return res.status(404).json({ error: 'Einladung nicht gefunden' });
  res.json({ ok: true });
});

// GET /api/invites/:token — Token pruefen (oeffentlich)
router.get('/:token', (req, res) => {
  ensureInviteTable();
  const invite = getMasterDb().prepare(
    'SELECT * FROM registration_invites WHERE token=?'
  ).get(req.params.token);
  if (!invite)              return res.json({ valid: false, reason: 'Einladungslink ungültig' });
  if (invite.revoked_at)    return res.json({ valid: false, reason: 'Einladungslink wurde gesperrt' });
  if (invite.used_at)       return res.json({ valid: false, reason: 'Einladungslink wurde bereits verwendet' });
  if (invite.expires_at < Math.floor(Date.now() / 1000))
                            return res.json({ valid: false, reason: 'Einladungslink ist abgelaufen' });
  res.json({ valid: true });
});

export default router;

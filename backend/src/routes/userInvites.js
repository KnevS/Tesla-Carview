/**
 * Public-Routen fuer User-Einladungen innerhalb eines existierenden
 * Mandanten. Werden in index.js VOR requireAuth gemountet, damit der
 * Eingeladene auch ohne Login auf /api/user-invites/* zugreifen kann.
 *
 * Admin-Endpunkte (Token erstellen / auflisten / loeschen) leben
 * dagegen in routes/users.js — hinter requireAuth + requireAdmin.
 *
 * Tabelle: user_invites in der Tenant-DB (siehe database.js).
 */
import { Router } from 'express';
import { z } from 'zod';
import { getMasterDb, getDb } from '../db/database.js';
import { createUser } from '../services/userService.js';
import { sensitiveTokenRateLimit } from '../middleware/security.js';
import { LEGAL_ACCEPT_REQUIRED } from '../db/legalDefaults.js';

const router = Router();

// Rate-Limit beide oeffentlichen Routen — der Token hat 256-bit-Entropie
// (siehe routes/users.js), aber Defense-in-Depth gegen Spam und
// Token-Enumeration. 5 Treffer pro IP / 5 min ist eng genug, dass
// Brute-Force ausser Reichweite bleibt, aber legitime Klicks
// (Mehrfach-Tab, Refresh) noch durchgehen (Audit M6).
router.use(sensitiveTokenRateLimit);

/** Sucht ein User-Invite quer ueber alle Tenant-DBs. Liefert
 *  {tenant, db, invite} oder null, wenn der Token nirgends existiert. */
function findInvite(token) {
  const master = getMasterDb();
  const tenants = master.prepare(
    "SELECT * FROM tenants WHERE status='active'"
  ).all();
  for (const t of tenants) {
    let db;
    try { db = getDb(t.id); } catch { continue; }
    const invite = db.prepare(
      'SELECT * FROM user_invites WHERE token = ?'
    ).get(token);
    if (invite) return { tenant: t, db, invite };
  }
  return null;
}

/** GET /api/user-invites/:token/validate
 *  Liefert ob der Token gueltig ist, plus minimale Anzeigedaten fuer
 *  die Selbstregistrierungs-Form (Mandantenname, Rolle, Ablaufzeit). */
router.get('/:token/validate', (req, res) => {
  const found = findInvite(req.params.token);
  if (!found) return res.status(404).json({ valid: false, reason: 'unknown' });
  const { tenant, invite } = found;
  if (invite.used_at) {
    return res.status(410).json({ valid: false, reason: 'already_used' });
  }
  if (invite.expires_at < Math.floor(Date.now() / 1000)) {
    return res.status(410).json({ valid: false, reason: 'expired' });
  }
  res.json({
    valid: true,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    role:       invite.role,
    expiresAt:  invite.expires_at,
    note:       invite.note,
  });
});

const acceptSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12).max(256),
  // Akzept-Versionen analog zu Setup/Register: { privacy: 1, terms: 1 }
  accepts:  z.record(z.string(), z.number().int().positive()).optional(),
});

/** POST /api/user-invites/:token/accept
 *  Body: { username, password, accepts? }
 *  Erstellt den User in der zum Token gehoerenden Tenant-DB, markiert
 *  den Invite als verbraucht, schreibt legal_acceptance fuer privacy
 *  und terms (DSGVO-Nachweis). */
router.post('/:token/accept', async (req, res) => {
  const parse = acceptSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Ungueltige Eingabe' });
  }
  const { username, password, accepts } = parse.data;

  const found = findInvite(req.params.token);
  if (!found) return res.status(404).json({ error: 'Einladung ungueltig' });
  const { tenant, db, invite } = found;
  if (invite.used_at) return res.status(410).json({ error: 'Einladung bereits verwendet' });
  if (invite.expires_at < Math.floor(Date.now() / 1000)) {
    return res.status(410).json({ error: 'Einladung abgelaufen' });
  }

  // Username-Konflikte innerhalb des Mandanten abfangen — sonst koennte
  // der Invite den Token verbrennen, ohne dass ein User entsteht.
  const taken = db.prepare(
    'SELECT 1 FROM users WHERE username = ?'
  ).get(username.toLowerCase().trim());
  if (taken) return res.status(409).json({ error: 'Benutzername ist bereits vergeben' });

  try {
    // createUser ist async (bcrypt) und kann daher nicht in einer
    // better-sqlite3-Transaktion stehen. In dem schmalen Zeitfenster
    // zwischen createUser und dem update auf user_invites kann ein
    // zweiter Klick auf denselben Link zwar nochmal anlaufen — die
    // username-Eindeutigkeit + UNIQUE(token) im ON CONFLICT kuerzen
    // das aber sauber ab.
    const role   = invite.role || 'user';
    const userId = await createUser(db, username, password, role);

    // Invite verbrannt + Akzeptanzen + audit
    // req.ip statt manueller XFF-Parse (trust proxy ist gesetzt) —
    // verhindert XFF-Spoofing in Audit-Logs (Audit M8).
    const ip = req.ip;
    const ua = (req.headers['user-agent'] || '').slice(0, 512);

    db.prepare(
      'UPDATE user_invites SET used_at = unixepoch(), used_by_user_id = ? WHERE token = ?'
    ).run(userId, req.params.token);

    if (accepts) {
      const stmt = db.prepare(
        'INSERT OR IGNORE INTO legal_acceptance (user_id, scope, version, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
      );
      const masterChk = getMasterDb().prepare(
        'SELECT 1 FROM legal_content WHERE scope=? AND version=? LIMIT 1'
      );
      for (const [scope, version] of Object.entries(accepts)) {
        if (!Number.isInteger(version) || version < 1) continue;
        if (!LEGAL_ACCEPT_REQUIRED.includes(scope)) continue;
        if (!masterChk.get(scope, version)) continue;
        stmt.run(userId, scope, version, ip, ua);
      }
    }

    console.log(`[Invite] User '${username}' (role=${role}) registriert in Mandant '${tenant.slug}' via Invite`);
    res.json({ ok: true, tenantSlug: tenant.slug, username, role });
  } catch (err) {
    console.error('[Invite] accept failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

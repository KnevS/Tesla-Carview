import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { createTenant, getTenantBySlug, getAllTenants, getMasterDb } from '../db/database.js';
import { createUser } from '../services/userService.js';
import { LEGAL_ACCEPT_REQUIRED } from '../db/legalDefaults.js';

const router = Router();

/** Schreibt legal_acceptance für den frisch erstellten Admin (siehe setup.js). */
function recordRegistrationAcceptance(db, userId, accepts, ip, ua) {
  if (!accepts || typeof accepts !== 'object') return;
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO legal_acceptance (user_id, scope, version, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
  );
  const master = getMasterDb();
  for (const [scope, version] of Object.entries(accepts)) {
    if (!Number.isInteger(version) || version < 1) continue;
    if (!LEGAL_ACCEPT_REQUIRED.includes(scope)) continue;
    const exists = master.prepare(
      'SELECT 1 FROM legal_content WHERE scope=? AND version=? LIMIT 1'
    ).get(scope, version);
    if (!exists) continue;
    stmt.run(userId, scope, version, ip, ua);
  }
}

function consumeInvite(token) {
  const masterDb = getMasterDb();
  try {
    masterDb.exec(`
      CREATE TABLE IF NOT EXISTS registration_invites (
        token TEXT PRIMARY KEY, created_by_tenant TEXT NOT NULL,
        created_by_user INTEGER NOT NULL, created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER NOT NULL, used_at INTEGER, used_by_tenant TEXT
      )
    `);
  } catch { /* table already exists */ }
  const invite = masterDb.prepare('SELECT * FROM registration_invites WHERE token=?').get(token);
  if (!invite)        return { ok: false, reason: 'Einladungslink ungültig' };
  if (invite.used_at) return { ok: false, reason: 'Einladungslink wurde bereits verwendet' };
  if (invite.expires_at < Math.floor(Date.now() / 1000))
                      return { ok: false, reason: 'Einladungslink ist abgelaufen' };
  return { ok: true, invite };
}

const registerSchema = z.object({
  tenantName:    z.string().min(2).max(100),
  tenantSlug:    z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und - erlaubt'),
  adminUsername: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  adminPassword: z.string().min(12).max(256),
  inviteToken:   z.string().optional(),
  // Akzept-Versionen (z. B. {privacy: 1, terms: 1}). Optional, weil ältere
  // Clients das Feld noch nicht senden — die UI zwingt aber dazu.
  accepts:       z.record(z.string(), z.number().int().positive()).optional(),
});

// POST /api/register — Neuen Mandanten + ersten Admin anlegen
router.post('/', validate(registerSchema), async (req, res) => {
  const { tenantName, tenantSlug, adminUsername, adminPassword, inviteToken, accepts } = req.body;

  // Einladungstoken Pflicht — außer beim allerersten Mandanten (Erstkonfiguration)
  const isFirstTenant = getAllTenants().length === 0;
  if (!isFirstTenant) {
    if (!inviteToken) {
      return res.status(403).json({ error: 'Registrierung nur mit gültigem Einladungslink möglich' });
    }
    const check = consumeInvite(inviteToken);
    if (!check.ok) {
      return res.status(403).json({ error: check.reason });
    }
  }

  if (getTenantBySlug(tenantSlug)) {
    return res.status(409).json({ error: 'Mandanten-Slug bereits vergeben' });
  }

  try {
    const tenantId = createTenant(tenantSlug, tenantName);
    const { getDb } = await import('../db/database.js');
    const db = getDb(tenantId);
    const newUserId = await createUser(db, adminUsername, adminPassword, 'admin');
    // req.ip statt XFF-Parse (trust proxy=1) — XFF-Spoofing fix (Audit M8).
    const ip = req.ip;
    const ua = (req.headers['user-agent'] || '').slice(0, 512);
    recordRegistrationAcceptance(db, newUserId, accepts, ip, ua);

    // Einladung als verwendet markieren
    if (!isFirstTenant && inviteToken) {
      getMasterDb().prepare(
        'UPDATE registration_invites SET used_at=unixepoch(), used_by_tenant=? WHERE token=?'
      ).run(tenantId, inviteToken);
    }

    console.log(`[Register] Mandant "${tenantName}" (${tenantSlug}) mit Admin "${adminUsername}" erstellt`);
    res.status(201).json({ tenantId, tenantSlug, tenantName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/register/check/:slug — Slug-Verfügbarkeit prüfen
router.get('/check/:slug', (req, res) => {
  const taken = !!getTenantBySlug(req.params.slug);
  res.json({ available: !taken });
});

export default router;

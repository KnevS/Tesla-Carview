import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { createTenant, getTenantBySlug, getAllTenants, getMasterDb } from '../db/database.js';
import { createUser } from '../services/userService.js';

const router = Router();

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
});

// POST /api/register — Neuen Mandanten + ersten Admin anlegen
router.post('/', validate(registerSchema), async (req, res) => {
  const { tenantName, tenantSlug, adminUsername, adminPassword, inviteToken } = req.body;

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
    await createUser(db, adminUsername, adminPassword, 'admin');

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

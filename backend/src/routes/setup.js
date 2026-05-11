import { Router } from 'express';
import { z } from 'zod';
import { getAllTenants, createTenant, getDb, getMasterDb } from '../db/database.js';
import { createUser } from '../services/userService.js';
import { LEGAL_ACCEPT_REQUIRED } from '../db/legalDefaults.js';

const router = Router();

/**
 * Schreibt eine `legal_acceptance` für den frisch erstellten Admin.
 * Weil der noch nicht eingeloggt ist (kein req.user, kein req.db, kein
 * `requireAuth`), passiert das hier direkt — anhand der frisch erzeugten
 * userId und der eben geöffneten Tenant-DB.
 */
function recordSetupAcceptance(db, userId, accepts, ip, ua) {
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

// Prüft ob Setup noch erforderlich ist
router.get('/status', (_req, res) => {
  const tenants = getAllTenants();
  if (tenants.length === 0) return res.json({ needsSetup: true });

  // Erster Mandant — hat er einen Admin?
  const db         = getDb(tenants[0].id);
  const adminExists = db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get();
  res.json({ needsSetup: !adminExists, tenantSlug: tenants[0].slug });
});

const initSchema = z.object({
  username:   z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password:   z.string().min(12),
  tenantName: z.string().min(2).max(100).optional(),
  tenantSlug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/).optional(),
  // Akzept-Versionen, die der Wizard im Browser geladen und angezeigt hat.
  // Beispiel: { privacy: 1, terms: 1 }. Optional, weil ältere Clients das
  // Feld noch nicht senden — das Backend zwingt im Setup-UI aber dazu.
  accepts:    z.record(z.string(), z.number().int().positive()).optional(),
});

// Erstellt ersten Admin (und ggf. ersten Mandanten)
router.post('/init', async (req, res) => {
  const parse = initSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Ungueltige Eingabe' });
  }
  const { username, password, tenantName, tenantSlug, accepts } = parse.data;

  try {
    let tenants = getAllTenants();

    if (tenants.length === 0) {
      const slug = tenantSlug || 'default';
      const name = tenantName || 'Default';
      const tenantId = createTenant(slug, name);
      tenants = getAllTenants();
    }

    const db         = getDb(tenants[0].id);
    const adminExists = db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get();
    if (adminExists) return res.status(409).json({ error: 'Setup bereits abgeschlossen' });

    const newUserId = await createUser(db, username, password, 'admin');
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0]?.trim();
    const ua = (req.headers['user-agent'] || '').slice(0, 512);
    recordSetupAcceptance(db, newUserId, accepts, ip, ua);
    // tenants[0] frisch laden — Pseudonym wurde gerade beim
    // createTenant() vergeben und muss in die Response, damit das
    // Frontend dem User „dein Login-Identifier heisst jetzt X" zeigen
    // kann inklusive Hinweis ihn zu merken / Backup zu machen.
    const tenant = getAllTenants()[0];
    console.log(`[Setup] Admin "${username}" erstellt (Mandant: ${tenant.slug}, Pseudonym: ${tenant.pseudonym})`);
    res.json({
      ok:                true,
      tenantSlug:        tenant.slug,
      tenant_pseudonym:  tenant.pseudonym,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

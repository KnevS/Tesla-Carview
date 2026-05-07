import { Router } from 'express';
import { z } from 'zod';
import { getAllTenants, createTenant, getDb } from '../db/database.js';
import { createUser } from '../services/userService.js';

const router = Router();

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
});

// Erstellt ersten Admin (und ggf. ersten Mandanten)
router.post('/init', async (req, res) => {
  const parse = initSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Ungueltige Eingabe' });
  }
  const { username, password, tenantName, tenantSlug } = parse.data;

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

    await createUser(db, username, password, 'admin');
    console.log(`[Setup] Admin "${username}" erstellt (Mandant: ${tenants[0].slug})`);
    res.json({ ok: true, tenantSlug: tenants[0].slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

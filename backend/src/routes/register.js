import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { createTenant, getTenantBySlug, getAllTenants } from '../db/database.js';
import { createUser } from '../services/userService.js';

const router = Router();

const registerSchema = z.object({
  tenantName:    z.string().min(2).max(100),
  tenantSlug:    z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und - erlaubt'),
  adminUsername: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  adminPassword: z.string().min(12).max(256),
});

// POST /api/register — Neuen Mandanten + ersten Admin anlegen
router.post('/', validate(registerSchema), async (req, res) => {
  const { tenantName, tenantSlug, adminUsername, adminPassword } = req.body;

  if (getTenantBySlug(tenantSlug)) {
    return res.status(409).json({ error: 'Mandanten-Slug bereits vergeben' });
  }

  try {
    const tenantId = createTenant(tenantSlug, tenantName);
    const { getDb } = await import('../db/database.js');
    const db = getDb(tenantId);
    await createUser(db, adminUsername, adminPassword, 'admin');

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

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  LAUNCHER_CATALOG, LAUNCHER_CATEGORIES,
  getDisabledSlugs, setDisabledSlugs, getEnabledCatalog,
} from '../services/launcherCatalog.js';
import { auditLog } from '../services/auditService.js';

const router = Router();

// Liste der für diesen Tenant freigeschalteten Apps (User-facing).
router.get('/apps', (req, res) => {
  try {
    const apps = getEnabledCatalog(req.db);
    res.json({ apps, categories: LAUNCHER_CATEGORIES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-Ansicht: alle Apps mit enabled-Flag + Whitelist verwalten.
router.get('/admin', requireAdmin, (req, res) => {
  try {
    const disabled = new Set(getDisabledSlugs(req.db));
    const apps = LAUNCHER_CATALOG.map(a => ({ ...a, enabled: !disabled.has(a.slug) }));
    res.json({ apps, categories: LAUNCHER_CATEGORIES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/disable/:slug', requireAdmin, (req, res) => {
  try {
    const slug = String(req.params.slug || '').slice(0, 64);
    if (!LAUNCHER_CATALOG.some(a => a.slug === slug)) {
      return res.status(404).json({ error: 'unknown slug' });
    }
    const cur = getDisabledSlugs(req.db);
    if (!cur.includes(slug)) {
      setDisabledSlugs(req.db, [...cur, slug]);
      auditLog(req.db, req.user.sub, 'launcher_app_disabled', null, { slug });
    }
    res.json({ disabled: getDisabledSlugs(req.db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/enable/:slug', requireAdmin, (req, res) => {
  try {
    const slug = String(req.params.slug || '').slice(0, 64);
    const cur = getDisabledSlugs(req.db);
    const next = cur.filter(s => s !== slug);
    if (next.length !== cur.length) {
      setDisabledSlugs(req.db, next);
      auditLog(req.db, req.user.sub, 'launcher_app_enabled', null, { slug });
    }
    res.json({ disabled: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

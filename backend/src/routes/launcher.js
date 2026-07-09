// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  LAUNCHER_CATALOG, LAUNCHER_CATEGORIES,
  getDisabledSlugs, setDisabledSlugs, getEnabledCatalog, getCustomApps,
} from '../services/launcherCatalog.js';
import { auditLog } from '../services/auditService.js';

const router = Router();

// Liste der für diesen Tenant freigeschalteten Apps (User-facing):
// kuratierter Katalog (abzüglich deaktivierter) + eigene Admin-Apps.
router.get('/apps', (req, res) => {
  try {
    const apps = [...getEnabledCatalog(req.db), ...getCustomApps(req.db)];
    res.json({ apps, categories: LAUNCHER_CATEGORIES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-Ansicht: alle Katalog-Apps mit enabled-Flag + eigene Apps (CRUD).
router.get('/admin', requireAdmin, (req, res) => {
  try {
    const disabled = new Set(getDisabledSlugs(req.db));
    const apps = LAUNCHER_CATALOG.map(a => ({ ...a, enabled: !disabled.has(a.slug) }));
    res.json({ apps, custom: getCustomApps(req.db), categories: LAUNCHER_CATEGORIES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Validiert Name/URL/Icon/Notiz einer eigenen App; nur http(s)-URLs. */
function validateCustomApp(body) {
  const name = String(body?.name ?? '').trim().slice(0, 60);
  const url  = String(body?.url  ?? '').trim().slice(0, 300);
  const icon = String(body?.icon ?? '').trim().slice(0, 8) || '🌐';
  const note = String(body?.note ?? '').trim().slice(0, 140) || null;
  if (!name) return { error: 'name required' };
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
  } catch { return { error: 'invalid url' }; }
  return { name, url, icon, note };
}

// Eigene App anlegen.
router.post('/admin/apps', requireAdmin, (req, res) => {
  try {
    const v = validateCustomApp(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    const r = req.db.prepare(
      "INSERT INTO launcher_custom_apps (name, url, icon, note, category) VALUES (?, ?, ?, ?, 'custom')"
    ).run(v.name, v.url, v.icon, v.note);
    auditLog(req.db, req.user.sub, 'launcher_app_created', null, { id: r.lastInsertRowid, name: v.name, url: v.url });
    res.json({ custom: getCustomApps(req.db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eigene App ändern.
router.put('/admin/apps/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const exists = req.db.prepare('SELECT id FROM launcher_custom_apps WHERE id=?').get(id);
    if (!exists) return res.status(404).json({ error: 'not found' });
    const v = validateCustomApp(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    req.db.prepare(
      'UPDATE launcher_custom_apps SET name=?, url=?, icon=?, note=? WHERE id=?'
    ).run(v.name, v.url, v.icon, v.note, id);
    auditLog(req.db, req.user.sub, 'launcher_app_updated', null, { id, name: v.name, url: v.url });
    res.json({ custom: getCustomApps(req.db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eigene App löschen.
router.delete('/admin/apps/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = req.db.prepare('SELECT name FROM launcher_custom_apps WHERE id=?').get(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    req.db.prepare('DELETE FROM launcher_custom_apps WHERE id=?').run(id);
    auditLog(req.db, req.user.sub, 'launcher_app_deleted', null, { id, name: row.name });
    res.json({ custom: getCustomApps(req.db) });
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

/**
 * Routes fuer Outbound-Webhooks (Admin-only).
 *
 *   GET    /api/webhooks            Liste pro Mandant
 *   POST   /api/webhooks            Anlegen (secret wird generiert)
 *   PATCH  /api/webhooks/:id        URL/Events/is_active aktualisieren
 *   DELETE /api/webhooks/:id        Loeschen
 *   POST   /api/webhooks/:id/test   Test-Ping ans Ziel
 *
 * Alle Endpunkte verlangen Admin-Rolle. Die Mandanten-Trennung wird
 * implizit ueber req.db (= Tenant-DB) gewahrt — fremde Webhooks sind
 * physisch in einer anderen SQLite-Datei.
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { auditLog } from '../services/auditService.js';
import {
  generateSecret, testDispatch,
} from '../services/webhookDispatcher.js';

const router = Router();

// Whitelist der unterstuetzten Events. Halten wir bewusst klein —
// neue Events kommen zusammen mit ihrem Dispatch-Aufrufer in einer
// gemeinsamen Aenderung.
const SUPPORTED_EVENTS = ['trip.completed', 'charging.completed', 'service.due'];

const createSchema = z.object({
  name:   z.string().trim().min(1).max(100),
  url:    z.string().url().max(2000),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1),
});

const patchSchema = z.object({
  name:      z.string().trim().min(1).max(100).optional(),
  url:       z.string().url().max(2000).optional(),
  events:    z.array(z.enum(SUPPORTED_EVENTS)).min(1).optional(),
  is_active: z.boolean().optional(),
});

// Schickt den Secret-Wert in der API-Response nur einmal mit (beim
// Anlegen). Bei spaeteren GETs gibt es nur einen has_secret-Flag —
// der Klartext liegt zwar in der Tenant-DB, sollte aber nicht ueber
// die API zurueckfliessen, damit Browser-DevTools / Audit-Logs ihn
// nicht passiv mitschneiden.
function publicView(row) {
  let events = [];
  try { events = JSON.parse(row.events || '[]'); } catch { /* leave empty */ }
  return {
    id:            row.id,
    name:          row.name,
    url:           row.url,
    events,
    is_active:     row.is_active === 1,
    created_at:    row.created_at,
    last_fired_at: row.last_fired_at,
    last_status:   row.last_status,
    last_error:    row.last_error,
    has_secret:    !!row.secret,
  };
}

router.get('/', requireAdmin, (req, res) => {
  try {
    const rows = req.db.prepare(
      'SELECT * FROM webhooks ORDER BY created_at DESC'
    ).all();
    res.json({
      supported_events: SUPPORTED_EVENTS,
      webhooks:         rows.map(publicView),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, validate(createSchema), (req, res) => {
  const { name, url, events } = req.body;
  const secret = generateSecret();
  try {
    const r = req.db.prepare(
      `INSERT INTO webhooks (name, url, secret, events)
       VALUES (?, ?, ?, ?)`
    ).run(name, url, secret, JSON.stringify(events));
    const row = req.db.prepare('SELECT * FROM webhooks WHERE id=?').get(r.lastInsertRowid);
    auditLog(req.db, req.user.sub, 'webhook_created', req,
      { id: r.lastInsertRowid, url, events });
    // Secret EINMAL im Klartext zurueckliefern, danach niemals wieder —
    // analog zu klassischen API-Token-Flows (z.B. GitHub PATs).
    res.status(201).json({ ...publicView(row), secret });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', requireAdmin, validate(patchSchema), (req, res) => {
  const existing = req.db.prepare('SELECT * FROM webhooks WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Webhook nicht gefunden' });
  const b = req.body;
  req.db.prepare(
    `UPDATE webhooks SET
       name      = COALESCE(?, name),
       url       = COALESCE(?, url),
       events    = COALESCE(?, events),
       is_active = COALESCE(?, is_active)
     WHERE id = ?`
  ).run(
    b.name ?? null,
    b.url  ?? null,
    b.events ? JSON.stringify(b.events) : null,
    b.is_active === undefined ? null : (b.is_active ? 1 : 0),
    req.params.id,
  );
  const row = req.db.prepare('SELECT * FROM webhooks WHERE id=?').get(req.params.id);
  auditLog(req.db, req.user.sub, 'webhook_updated', req, { id: row.id, patch: b });
  res.json(publicView(row));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const existing = req.db.prepare('SELECT id, url FROM webhooks WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Webhook nicht gefunden' });
  req.db.prepare('DELETE FROM webhooks WHERE id=?').run(req.params.id);
  auditLog(req.db, req.user.sub, 'webhook_deleted', req, { id: existing.id, url: existing.url });
  res.json({ ok: true });
});

router.post('/:id/test', requireAdmin, async (req, res) => {
  try {
    const result = await testDispatch(req.db, +req.params.id);
    auditLog(req.db, req.user.sub, 'webhook_tested', req,
      { id: +req.params.id, ok: result.ok, status: result.status });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

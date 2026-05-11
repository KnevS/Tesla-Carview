import { Router } from 'express';
import {
  getSummary,
  getEndpointDetails,
  getHistory,
  getRecentEvents,
  getConfig,
  setConfig,
  resetCurrentMonth,
  recordWebhookEvent,
} from '../services/teslaUsage.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sensitiveTokenRateLimit } from '../middleware/security.js';
import { getAllTenants, getDb } from '../db/database.js';

const router = Router();

/* -------- Webhook (öffentlich, mit Header-Secret) -------- */
/* Wird in index.js VOR requireAuth gemountet als /api/tesla-usage/webhook/email */

export const webhookRouter = Router();

// Rate-Limit auch wenn das Webhook-Secret die Haupt-Absicherung ist —
// schuetzt bei geleaktem Secret vor DoS-Floods, indem die zu
// verarbeitenden Events pro IP eingeschraenkt werden (Audit M6).
webhookRouter.post('/webhook/email', sensitiveTokenRateLimit, (req, res) => {
  const expected = process.env.TESLA_USAGE_WEBHOOK_SECRET;
  if (!expected) return res.status(503).json({ error: 'Webhook secret not configured' });
  const got = req.get('X-Webhook-Secret');
  if (!got || got !== expected) return res.status(401).json({ error: 'invalid webhook secret' });

  const { subject, body, tenantSlug, spend_usd, threshold, period } = req.body || {};

  // Welche Mandanten betroffen sind: bei Angabe eines Slugs nur dieser, sonst alle.
  const tenants = getAllTenants();
  const targets = tenantSlug
    ? tenants.filter(t => t.slug === tenantSlug)
    : tenants;

  let stored = 0;
  for (const t of targets) {
    try {
      recordWebhookEvent(getDb(t.id), { subject, body, spend_usd, threshold, period });
      stored++;
    } catch (err) {
      console.error('[teslaUsage] webhook store failed:', t.slug, err.message);
    }
  }
  res.json({ stored });
});

/* -------- Auth-pflichtige Routes -------- */

router.use(requireAuth);

router.get('/current', (req, res) => {
  const summary = getSummary(req.db);
  const events  = getRecentEvents(req.db, 3);
  res.json({ ...summary, recentEvents: events });
});

router.get('/details', (req, res) => {
  res.json({ items: getEndpointDetails(req.db) });
});

router.get('/history', (req, res) => {
  const months = Math.min(36, Math.max(1, Number(req.query.months) || 12));
  res.json({ items: getHistory(req.db, months) });
});

router.get('/events', (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  res.json({ items: getRecentEvents(req.db, limit) });
});

router.get('/config', requireAdmin, (req, res) => {
  res.json(getConfig(req.db));
});

router.put('/config', requireAdmin, (req, res) => {
  res.json(setConfig(req.db, req.body || {}));
});

router.post('/reset', requireAdmin, (req, res) => {
  res.json(resetCurrentMonth(req.db));
});

export default router;

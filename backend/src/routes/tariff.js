/**
 * Dynamischer-Tarif-API.
 *
 * Liest und schreibt die Provider-Konfiguration aus tenant_settings,
 * holt Preise via tariffService und liefert sie dem Frontend in einem
 * stabilen Format. Tibber-Token wird in der GET-Antwort redacted —
 * der Wert verlaesst die DB nur, wenn der Admin ihn neu setzt.
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { getPrices, currentPrice, bestWindow, invalidateCache } from '../services/tariffService.js';

const router = Router();

const SETTING_KEYS = {
  provider:     'tariff.provider',     // 'none' | 'awattar' | 'tibber'
  country:      'tariff.country',      // 'de' | 'at' (nur fuer aWattar)
  token:        'tariff.token',        // Tibber API-Token
  surcharge_ct: 'tariff.surcharge_ct', // optionaler Aufschlag auf den Spotpreis
};

function readConfig(db) {
  const map = Object.fromEntries(
    db.prepare('SELECT key, value FROM tenant_settings WHERE key LIKE ?').all('tariff.%')
      .map(r => [r.key, r.value])
  );
  return {
    provider:     map[SETTING_KEYS.provider] || 'none',
    country:      map[SETTING_KEYS.country] || 'de',
    token:        map[SETTING_KEYS.token] || null,
    surcharge_ct: parseFloat(map[SETTING_KEYS.surcharge_ct] ?? '0'),
  };
}

function writeSetting(db, key, value) {
  if (value === null || value === undefined) {
    db.prepare('DELETE FROM tenant_settings WHERE key = ?').run(key);
  } else {
    db.prepare(
      `INSERT INTO tenant_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, String(value));
  }
}

// GET /api/tariff/config — Token in der Antwort redacted.
router.get('/config', requireAdmin, (req, res) => {
  const c = readConfig(req.db);
  res.json({
    provider:        c.provider,
    country:         c.country,
    surcharge_ct:    c.surcharge_ct,
    token_configured: !!c.token,
  });
});

// PUT /api/tariff/config — Provider/Country/Token/Aufschlag setzen.
router.put('/config', requireAdmin, validate(z.object({
  provider:     z.enum(['none', 'awattar', 'tibber']),
  country:      z.enum(['de', 'at']).optional(),
  token:        z.string().min(0).max(500).optional(),
  surcharge_ct: z.number().min(-50).max(50).optional(),
})), (req, res) => {
  const { provider, country, token, surcharge_ct } = req.body;
  writeSetting(req.db, SETTING_KEYS.provider, provider);
  if (country !== undefined)      writeSetting(req.db, SETTING_KEYS.country, country);
  if (surcharge_ct !== undefined) writeSetting(req.db, SETTING_KEYS.surcharge_ct, surcharge_ct);
  // Token: leerer String bedeutet „loeschen", undefined bedeutet „unveraendert".
  if (token !== undefined) {
    writeSetting(req.db, SETTING_KEYS.token, token.length ? token : null);
  }
  invalidateCache(req.tenantId);
  res.json({ ok: true });
});

/** GET /api/tariff/prices — gibt Preise + abgeleitete Werte zuruck.
 *  Bei provider='none' liefern wir leere Daten und 'configured: false',
 *  damit der Frontend-Widget einen sinnvollen Hinweis anzeigen kann. */
router.get('/prices', async (req, res) => {
  const config = readConfig(req.db);
  if (config.provider === 'none') {
    return res.json({ configured: false, provider: 'none', prices: [] });
  }
  try {
    const prices = await getPrices(req.tenantId, config);
    const current = currentPrice(prices);
    res.json({
      configured: true,
      provider:    config.provider,
      country:     config.country,
      prices,
      current,
      best_4h:     bestWindow(prices, 4),
      best_8h:     bestWindow(prices, 8),
    });
  } catch (e) {
    res.status(502).json({ error: e.message, configured: true, provider: config.provider });
  }
});

/** GET /api/tariff/best-window?hours=N — gezielt das billigste N-Std-
 *  Fenster zurueckgeben. Default 4h, hilfreich z.B. fuer den Auto-Set-
 *  Knopf im Frontend. */
router.get('/best-window', async (req, res) => {
  const hours = Math.max(1, Math.min(12, parseInt(req.query.hours, 10) || 4));
  const config = readConfig(req.db);
  if (config.provider === 'none') return res.json({ configured: false });
  try {
    const prices = await getPrices(req.tenantId, config);
    res.json({ configured: true, ...(bestWindow(prices, hours) || {}) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;

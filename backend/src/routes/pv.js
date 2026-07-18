// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * PV-Überschussladen (S08).
 *
 * Liest den Solar-Überschuss aus Home Assistant und leitet daraus eine
 * empfohlene Ladestromstärke ab. „Anwenden" setzt den Ladestrom und
 * startet/stoppt das Laden am Fahrzeug (Fleet-API + Virtual Key nötig) —
 * ohne Fleet-API bleibt es bei der Anzeige/Empfehlung.
 *
 * Konfiguration liegt in tenant_settings (DB-vor-env-Pattern). Der HA-Token
 * wird in GET-Antworten redacted; er verlässt die DB nur beim Neusetzen.
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { assertVehicleAccess } from '../middleware/vehicleAccess.js';
import { getTenantSetting, setTenantSetting } from '../services/configService.js';
import { readEntityState, surplusToAmps } from '../services/homeAssistantService.js';
import { apiProxyPost } from '../services/teslaApi.js';

const router = Router();

const KEYS = {
  url:        'pv.ha_url',
  token:      'pv.ha_token',
  entity:     'pv.surplus_entity',
  minSurplus: 'pv.min_surplus_w',
  voltage:    'pv.voltage',
  phases:     'pv.phases',
  maxAmps:    'pv.max_amps',
  enabled:    'pv.enabled',
};

function readConfig(db) {
  const g = k => getTenantSetting(db, k);
  return {
    url:        g(KEYS.url) || '',
    token:      g(KEYS.token) || '',
    entity:     g(KEYS.entity) || '',
    minSurplus: parseInt(g(KEYS.minSurplus) ?? '1400', 10),
    voltage:    parseInt(g(KEYS.voltage) ?? '230', 10),
    phases:     parseInt(g(KEYS.phases) ?? '1', 10),
    maxAmps:    parseInt(g(KEYS.maxAmps) ?? '16', 10),
    enabled:    g(KEYS.enabled) === '1',
  };
}

const isConfigured = c => !!(c.url && c.token && c.entity);

// GET /api/pv/config — Token redacted.
router.get('/config', requireAdmin, (req, res) => {
  const c = readConfig(req.db);
  res.json({
    ha_url:          c.url,
    surplus_entity:  c.entity,
    min_surplus_w:   c.minSurplus,
    voltage:         c.voltage,
    phases:          c.phases,
    max_amps:        c.maxAmps,
    enabled:         c.enabled,
    token_configured: !!c.token,
  });
});

// PUT /api/pv/config — Verbindung + Parameter setzen.
router.put('/config', requireAdmin, validate(z.object({
  ha_url:         z.string().max(300).optional(),
  ha_token:       z.string().max(500).optional(),
  surplus_entity: z.string().max(200).optional(),
  min_surplus_w:  z.number().int().min(0).max(50000).optional(),
  voltage:        z.number().int().min(100).max(500).optional(),
  phases:         z.number().int().min(1).max(3).optional(),
  max_amps:       z.number().int().min(5).max(80).optional(),
  enabled:        z.boolean().optional(),
})), (req, res) => {
  const b = req.body;
  const set = (k, v) => setTenantSetting(req.db, k, v);
  if (b.ha_url         !== undefined) set(KEYS.url, b.ha_url);
  if (b.surplus_entity !== undefined) set(KEYS.entity, b.surplus_entity);
  if (b.min_surplus_w  !== undefined) set(KEYS.minSurplus, b.min_surplus_w);
  if (b.voltage        !== undefined) set(KEYS.voltage, b.voltage);
  if (b.phases         !== undefined) set(KEYS.phases, b.phases);
  if (b.max_amps       !== undefined) set(KEYS.maxAmps, b.max_amps);
  if (b.enabled        !== undefined) set(KEYS.enabled, b.enabled ? '1' : '0');
  // Token: leerer String löscht, undefined lässt unverändert.
  if (b.ha_token !== undefined) set(KEYS.token, b.ha_token.length ? b.ha_token : '');
  res.json({ ok: true });
});

/** Liest den Überschuss aus HA und leitet die Empfehlung ab. */
async function computeStatus(db) {
  const c = readConfig(db);
  if (!isConfigured(c)) return { configured: false };
  const state = await readEntityState(c.url, c.token, c.entity);
  const surplus = state.value ?? 0;
  const amps = surplusToAmps(surplus, { voltage: c.voltage, phases: c.phases, maxAmps: c.maxAmps });
  return {
    configured:      true,
    enabled:         c.enabled,
    surplus_w:       Math.round(surplus),
    unit:            state.unit,
    last_changed:    state.last_changed,
    recommended_amps: amps,
    min_surplus_w:   c.minSurplus,
    above_threshold: surplus >= c.minSurplus && amps >= 5,
    voltage:         c.voltage,
    phases:          c.phases,
    max_amps:        c.maxAmps,
  };
}

// GET /api/pv/status — aktueller Überschuss + Empfehlung.
router.get('/status', async (req, res) => {
  try {
    res.json(await computeStatus(req.db));
  } catch (e) {
    res.status(502).json({ configured: true, error: e.response?.data?.message || e.message });
  }
});

// POST /api/pv/:vehicleId/apply — Empfehlung ans Fahrzeug senden.
// Über Schwelle → Ladestrom setzen + Laden starten; darunter → stoppen.
router.post('/:vehicleId/apply', async (req, res) => {
  // Zugriffsschutz: nur Admins oder zugeordnete Fahrer dürfen Ladebefehle
  // an DIESES Fahrzeug senden (sonst IDOR — jeder Tenant-User könnte an
  // jedem Fahrzeug laden/stoppen).
  try {
    assertVehicleAccess(req.db, req.params.vehicleId, req.user);
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
  const vehicle = req.db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  if (!vehicle.vin) return res.status(400).json({ error: 'Fahrzeug hat keine VIN hinterlegt' });

  let status;
  try {
    status = await computeStatus(req.db);
  } catch (e) {
    return res.status(502).json({ error: e.response?.data?.message || e.message });
  }
  if (!status.configured) return res.status(400).json({ error: 'PV-Überschussladen nicht konfiguriert' });

  const cmd = (name, body) =>
    apiProxyPost(req.db, `/api/1/vehicles/${vehicle.vin}/command/${name}`, body);

  try {
    let action;
    if (status.above_threshold) {
      await cmd('set_charging_amps', { charging_amps: status.recommended_amps });
      await cmd('charge_start', {});
      action = 'start';
    } else {
      await cmd('charge_stop', {});
      action = 'stop';
    }
    res.json({ ok: true, action, recommended_amps: status.recommended_amps, surplus_w: status.surplus_w });
  } catch (e) {
    const st = e.response?.status;
    const err = e.response?.data;
    if (st === 408 || err?.error?.includes('offline') || err?.error?.includes('asleep')) {
      return res.status(503).json({ error: 'Fahrzeug schläft oder ist offline', code: 'ASLEEP' });
    }
    res.status(st || 502).json({ error: err?.error || err || e.message });
  }
});

export default router;

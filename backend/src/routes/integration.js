// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * /api/integration — Anbindung von Hausautomationen (ioBroker, Home Assistant, …).
 *
 * Zweck: PV-Überschussladen und Laden nach Strompreis, gesteuert von der
 * Hausautomation, die den Überschuss kennt. TeslaView liefert dafür den
 * Ladezustand und führt drei Ladebefehle aus — mehr nicht.
 *
 * Sicherheit:
 *   • Ein Token gilt für genau ein Fahrzeug eines Mandanten und nur, solange
 *     sein Ersteller aktiver Admin ist.
 *   • Gespeichert wird nur der SHA-256; Klartext gibt es einmal beim Anlegen.
 *   • scope 'read' = Ladezustand lesen; 'charge' zusätzlich Ladebefehle.
 *   • Keine VIN, kein Standort, keine Fahrten in den Antworten.
 *   • Lesen kommt aus vehicle_state_cache (kein Wecken, keine Tesla-Kosten).
 *   • Befehle höchstens alle COMMAND_GAP_S Sekunden je Token (Tesla berechnet
 *     Fleet-API-Befehle), jeder Befehl landet im Audit-Log.
 *
 * Verwaltung (JWT, Admin):
 *   GET    /api/integration/tokens
 *   POST   /api/integration/tokens        { label, vehicle_id, scopes: ['read'|'charge'] }
 *   DELETE /api/integration/tokens/:id
 * Maschinen-Endpunkte (Authorization: Bearer tvi_…):
 *   GET    /api/integration/v1/charging
 *   POST   /api/integration/v1/charging   { action: 'start'|'stop'|'amps', amps? }
 */
import { Router } from 'express';
import { randomBytes, createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getMasterDb, getDb, getTenantById } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { apiProxyPost } from '../services/teslaApi.js';
import { auditLog } from '../services/auditService.js';

const router = Router();
const PREFIX = 'tvi_';
const COMMAND_GAP_S = 60;
const hash = t => createHash('sha256').update(t).digest('hex');

// ── Verwaltung ─────────────────────────────────────────────────────────────────

router.get('/tokens', requireAuth, requireAdmin, (req, res) => {
  const rows = getMasterDb().prepare(
    `SELECT id, vehicle_id, label, token_hint, scopes, is_active, last_used_at, last_command_at, created_at
     FROM integration_tokens WHERE tenant_id=? ORDER BY id DESC`
  ).all(req.tenantId);
  const names = Object.fromEntries(req.db.prepare('SELECT id, display_name FROM vehicles').all().map(v => [v.id, v.display_name]));
  res.json(rows.map(r => ({ ...r, scopes: r.scopes.split(','), vehicle_name: names[r.vehicle_id] ?? null })));
});

router.post('/tokens', requireAuth, requireAdmin, validate(z.object({
  label:      z.string().trim().min(1).max(80),
  vehicle_id: z.number().int().positive(),
  scopes:     z.array(z.enum(['read', 'charge'])).min(1).max(2),
})), (req, res) => {
  const { label, vehicle_id, scopes } = req.body;
  if (!req.db.prepare('SELECT 1 FROM vehicles WHERE id=?').get(vehicle_id)) {
    return res.status(400).json({ error: 'Fahrzeug nicht gefunden' });
  }
  const token = PREFIX + randomBytes(32).toString('base64url');
  const sc = [...new Set(['read', ...scopes])].join(',');
  const info = getMasterDb().prepare(
    `INSERT INTO integration_tokens (tenant_id, vehicle_id, created_by, label, token_hash, token_hint, scopes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.tenantId, vehicle_id, req.user.sub, label, hash(token), token.slice(-4), sc);
  auditLog(req.db, req.user.sub, 'integration_token_create', req, { id: info.lastInsertRowid, vehicle_id, scopes: sc });
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ id: info.lastInsertRowid, token, endpoint: `${base}/api/integration/v1/charging` });
});

router.delete('/tokens/:id', requireAuth, requireAdmin, (req, res) => {
  const r = getMasterDb().prepare('DELETE FROM integration_tokens WHERE id=? AND tenant_id=?').run(Number(req.params.id), req.tenantId);
  if (!r.changes) return res.status(404).json({ error: 'Token nicht gefunden' });
  auditLog(req.db, req.user.sub, 'integration_token_delete', req, { id: Number(req.params.id) });
  res.json({ ok: true });
});

// ── Maschinen-Endpunkte ──────────────────────────────────────────────────────────

// Eigenes, enges Limit: eine Hausautomation fragt höchstens jede Minute ab.
const integrationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen' },
});

function requireIntegrationToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token.startsWith(PREFIX) || token.length < 40) return res.status(401).json({ error: 'Nicht authentifiziert' });
  const master = getMasterDb();
  const row = master.prepare('SELECT * FROM integration_tokens WHERE token_hash=? AND is_active=1').get(hash(token));
  if (!row) return res.status(401).json({ error: 'Nicht authentifiziert' });
  const tenant = getTenantById(row.tenant_id);
  if (!tenant || tenant.status === 'suspended') return res.status(403).json({ error: 'Mandant pausiert' });
  try { req.db = getDb(row.tenant_id); } catch { return res.status(401).json({ error: 'Nicht authentifiziert' }); }
  // Der Token lebt nur so lange wie die Admin-Rechte dessen, der ihn angelegt hat:
  // gelöschte, deaktivierte oder herabgestufte Admins nehmen ihre Tokens mit.
  const owner = req.db.prepare('SELECT role, is_active FROM users WHERE id=?').get(row.created_by);
  if (!owner || owner.role !== 'admin' || !owner.is_active) return res.status(401).json({ error: 'Nicht authentifiziert' });
  master.prepare('UPDATE integration_tokens SET last_used_at=unixepoch() WHERE id=?').run(row.id);
  req.integration = { ...row, scopes: row.scopes.split(',') };
  next();
}

router.get('/v1/charging', integrationRateLimit, requireIntegrationToken, (req, res) => {
  const v = req.db.prepare(
    `SELECT v.display_name, c.battery_level, c.charging_state, c.charge_limit_soc, c.charge_current_request,
            c.charge_current_max, c.charger_power_kw, c.charger_actual_current, c.charger_voltage, c.charger_phases,
            c.charge_energy_added_kwh, c.charge_updated_at, c.updated_at
     FROM vehicles v LEFT JOIN vehicle_state_cache c ON c.vehicle_id = v.id WHERE v.id=?`
  ).get(req.integration.vehicle_id);
  if (!v) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  const now = Math.floor(Date.now() / 1000);
  // Der Poller liefert charge_state bei aktiver Fleet-Telemetry nur selten (stündlich).
  // Frischer sind die Telemetrie-Punkte: Akkuleistung (Spannung × Strom) und SoC,
  // solange das Auto wach ist – beim Laden ist es das.
  const tp = req.db.prepare(
    `SELECT timestamp, power_kw FROM telemetry_points
     WHERE vehicle_id=? AND power_kw IS NOT NULL AND timestamp > ? ORDER BY timestamp DESC LIMIT 1`
  ).get(req.integration.vehicle_id, now - 3600);
  const ts = req.db.prepare(
    `SELECT timestamp, soc, gear FROM telemetry_points
     WHERE vehicle_id=? AND soc IS NOT NULL AND timestamp > ? ORDER BY timestamp DESC LIMIT 1`
  ).get(req.integration.vehicle_id, now - 3600);
  res.json({
    vehicle:           v.display_name,
    battery_level:     v.battery_level,
    charging_state:    v.charging_state,          // Disconnected | Stopped | Starting | Charging | Complete | NoPower
    plugged_in:        v.charging_state ? v.charging_state !== 'Disconnected' : null,
    charging:          v.charging_state === 'Charging',
    charge_limit_soc:  v.charge_limit_soc,
    amps_requested:    v.charge_current_request,
    amps_max:          v.charge_current_max,
    amps_actual:       v.charger_actual_current,
    power_kw:          v.charger_power_kw,
    voltage:           v.charger_voltage,
    phases:            v.charger_phases,
    energy_added_kwh:  v.charge_energy_added_kwh,
    updated_at:        v.charge_updated_at ?? v.updated_at,
    age_s:             (v.charge_updated_at ?? v.updated_at) ? now - (v.charge_updated_at ?? v.updated_at) : null,
    // Live aus der Fleet-Telemetry (null, wenn das Auto die letzte Stunde nicht gestreamt hat).
    // Vorzeichen wie von Tesla geliefert (PackVoltage × PackCurrent).
    telemetry: {
      soc:            ts?.soc ?? null,
      soc_age_s:      ts ? now - ts.timestamp : null,
      pack_power_kw:  tp?.power_kw != null ? Math.round(tp.power_kw * 100) / 100 : null,
      power_age_s:    tp ? now - tp.timestamp : null,
    },
    can_command:       req.integration.scopes.includes('charge'),
  });
});

router.post('/v1/charging', integrationRateLimit, requireIntegrationToken, validate(z.object({
  action: z.enum(['start', 'stop', 'amps']),
  amps:   z.number().int().min(5).max(48).optional(),
})), async (req, res) => {
  const t = req.integration;
  if (!t.scopes.includes('charge')) return res.status(403).json({ error: 'Token darf keine Ladebefehle senden' });
  const now = Math.floor(Date.now() / 1000);
  if (t.last_command_at && now - t.last_command_at < COMMAND_GAP_S) {
    res.set('Retry-After', String(COMMAND_GAP_S - (now - t.last_command_at)));
    return res.status(429).json({ error: `Höchstens ein Befehl je ${COMMAND_GAP_S} s` });
  }
  const { action, amps } = req.body;
  if (action === 'amps' && amps === undefined) return res.status(400).json({ error: 'amps fehlt' });
  const vehicle = req.db.prepare('SELECT id, vin FROM vehicles WHERE id=?').get(t.vehicle_id);
  if (!vehicle?.vin) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

  getMasterDb().prepare('UPDATE integration_tokens SET last_command_at=? WHERE id=?').run(now, t.id);
  const cmd = (name, body = {}) => apiProxyPost(req.db, `/api/1/vehicles/${vehicle.vin}/command/${name}`, body);
  try {
    if (amps !== undefined) await cmd('set_charging_amps', { charging_amps: amps });
    if (action === 'start') await cmd('charge_start');
    if (action === 'stop') await cmd('charge_stop');
    auditLog(req.db, null, 'integration_charge_command', req, { token_id: t.id, action, amps: amps ?? null });
    res.json({ ok: true, action, amps: amps ?? null });
  } catch (e) {
    const st = e.response?.status, err = e.response?.data;
    auditLog(req.db, null, 'integration_charge_command_failed', req, { token_id: t.id, action, status: st ?? null });
    if (st === 408 || String(err?.error || '').match(/offline|asleep/)) {
      return res.status(503).json({ error: 'Fahrzeug schläft oder ist offline', code: 'ASLEEP' });
    }
    // Tesla meldet z. B. „not_charging“ oder „is_charging“ als Ergebnis — durchreichen, ohne Interna
    res.status(st && st < 500 ? st : 502).json({ error: typeof err?.error === 'string' ? err.error : 'Befehl fehlgeschlagen' });
  }
});

export default router;

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * /api/mesh — TeslaView Mesh (föderiertes Schwarm-Netzwerk)
 *
 * Phase 1: Foundation (Schema + Opt-in, KEINE aktive Daten-Übertragung)
 *
 * Architektur — drei Rollen pro Instanz:
 *   • Contributor: aggregiert eigene DB-Daten lokal → POST an Hub
 *   • Hub:         empfängt Contributions, speichert in master.db.mesh_contributions
 *   • Client:      liest Aggregates vom Hub für Schwarm-Vergleich-UI
 *
 * Phase 1 implementiert nur: Opt-in-State und Read-Status. Contributor-
 * und Hub-Routen kommen in Phase 2 mit dem ersten konkreten Topic
 * (range_curve).
 *
 * Datenschutz:
 *   • instance_uuid wird zufällig pro Instanz erzeugt — keine Verbindung
 *     zu VIN, Mandanten, Person
 *   • Default opt-in: false für ALLES — User muss aktiv zustimmen
 *   • Hub-URL ist konfigurierbar — Default leer, kein impliziter Upload
 *
 * Endpoints (alle admin-only):
 *   GET   /api/mesh/status     — instance_uuid, aktive Opt-ins, hub_url
 *   PATCH /api/mesh/optin      — Opt-ins setzen (per Topic granular)
 *   PATCH /api/mesh/hub-url    — Hub-URL setzen (oder "" = nichts senden)
 *   DELETE /api/mesh/contributions  — alle bisherigen Beiträge löschen
 *
 * Hub-Routen (Phase 2):  POST /api/mesh/contributions, GET /api/mesh/aggregates/*
 */

import { Router }       from 'express';
import { randomUUID }   from 'crypto';
import { getTenantSetting, setTenantSetting } from '../services/configService.js';
import { requireAuth }  from '../middleware/auth.js';

const router = Router();

// Welche Topics existieren — granulares Opt-in pro Datentyp.
const TOPICS = ['range_curve', 'charging_speed', 'tco_eur_per_km'];

function getOrCreateInstanceUuid(db) {
  let uuid = getTenantSetting(db, 'mesh.instance_uuid', null);
  if (!uuid) {
    uuid = randomUUID();
    setTenantSetting(db, 'mesh.instance_uuid', uuid);
  }
  return uuid;
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  next();
}

router.get('/status', requireAuth, requireAdmin, (req, res) => {
  const optin = {};
  for (const t of TOPICS) {
    optin[t] = getTenantSetting(req.db, `mesh.optin.${t}`, null) === 'true';
  }
  const anyOptin = Object.values(optin).some(Boolean);
  res.json({
    enabled:        getTenantSetting(req.db, 'mesh.enabled', null) === 'true',
    instance_uuid:  anyOptin ? getOrCreateInstanceUuid(req.db) : null,  // erst bei erstem opt-in
    hub_url:        getTenantSetting(req.db, 'mesh.hub_url', null) || '',
    optin,
    topics:         TOPICS,
    last_contribution_at: Number(getTenantSetting(req.db, 'mesh.last_contribution_at', null)) || null,
  });
});

router.patch('/optin', requireAuth, requireAdmin, (req, res) => {
  const body = req.body || {};
  if (typeof body.enabled === 'boolean') {
    setTenantSetting(req.db, 'mesh.enabled', body.enabled ? 'true' : 'false');
  }
  const optin = body.optin || {};
  for (const t of TOPICS) {
    if (typeof optin[t] === 'boolean') {
      setTenantSetting(req.db, `mesh.optin.${t}`, optin[t] ? 'true' : 'false');
    }
  }
  // Auto-Erzeuge UUID sobald ein opt-in aktiv ist (sonst bleibt sie ungesetzt).
  const anyOptin = TOPICS.some(t => getTenantSetting(req.db, `mesh.optin.${t}`, null) === 'true');
  if (anyOptin) getOrCreateInstanceUuid(req.db);
  res.json({ ok: true });
});

router.patch('/hub-url', requireAuth, requireAdmin, (req, res) => {
  const url = String(req.body?.hub_url || '').trim();
  if (url && !/^https:\/\//.test(url)) {
    return res.status(400).json({ error: 'Hub-URL muss mit https:// beginnen' });
  }
  setTenantSetting(req.db, 'mesh.hub_url', url);
  res.json({ ok: true, hub_url: url });
});

// "Vergiss mich" — löscht alle Beiträge dieser Instanz aus dem konfigurierten
// Hub. In Phase 1 ein Stub (kein Hub-Call); ab Phase 2 echte HTTP-DELETE-Anfrage.
router.delete('/contributions', requireAuth, requireAdmin, async (_req, res) => {
  res.json({ ok: true, note: 'Phase 1 Stub — Hub-Side-Delete folgt in Phase 2' });
});

export default router;

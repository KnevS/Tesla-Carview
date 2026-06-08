// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Heimlade-Sessions für Abrechnung (nur Ladeort-Typ 'home')
router.get('/:vehicleId/sessions', (req, res) => {
  const db = req.db;
  const { from, to, status, sort } = req.query;
  const conds = ['cs.vehicle_id = ?'];
  const params = [req.params.vehicleId];

  // Heimladen: explizites is_home_charged-Flag (von Monta-Sync gesetzt)
  // hat Vorrang; sonst location_id verknüpft mit home-Ort; sonst Heuristik
  // ueber den Charger-Typ.
  conds.push(`(
    cs.is_home_charged = 1
    OR cs.location_id IN (SELECT id FROM charging_locations WHERE vehicle_id=? AND type='home')
    OR (cs.location_id IS NULL AND cs.charger_type NOT IN ('Supercharger','DC'))
  )`);
  params.push(req.params.vehicleId);
  conds.push('cs.is_free = 0');

  if (from) { conds.push('cs.start_time >= ?'); params.push(+from); }
  if (to)   { conds.push('cs.start_time <= ?'); params.push(+to); }
  if (status) { conds.push('cs.billing_status = ?'); params.push(status); }

  // Sortierreihenfolge: desc (Default, neueste zuerst) oder asc.
  const orderDir = sort === 'asc' ? 'ASC' : 'DESC';
  const sessions = db.prepare(
    `SELECT cs.*, cl.name as location_name_resolved, cl.rate_kwh as location_rate
     FROM charging_sessions cs
     LEFT JOIN charging_locations cl ON cl.id = cs.location_id
     WHERE ${conds.join(' AND ')}
     ORDER BY cs.start_time ${orderDir}`
  ).all(...params);

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId);
  res.json({ sessions, vehicle });
});

// Monatsauswertung für Abrechnung
router.get('/:vehicleId/summary', (req, res) => {
  const db = req.db;
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', datetime(cs.start_time,'unixepoch')) as month,
      COUNT(*) as sessions,
      COALESCE(SUM(COALESCE(cs.energy_kwh_mid, cs.energy_added_kwh)), 0) as total_kwh,
      COALESCE(SUM(
        COALESCE(cs.energy_kwh_mid, cs.energy_added_kwh) *
        COALESCE(cs.billing_rate_kwh, cl.rate_kwh, ?, 0.30)
      ), 0) as total_amount,
      COALESCE(AVG(COALESCE(cs.billing_rate_kwh, cl.rate_kwh, ?)), 0.30) as avg_rate
    FROM charging_sessions cs
    LEFT JOIN charging_locations cl ON cl.id = cs.location_id
    WHERE cs.vehicle_id = ?
      AND cs.is_free = 0
      AND (cs.is_home_charged = 1
           OR cs.location_id IN (SELECT id FROM charging_locations WHERE vehicle_id=? AND type='home')
           OR cs.location_id IS NULL)
    GROUP BY month ORDER BY month DESC
  `).all(vehicle.electricity_rate_kwh ?? 0.30, vehicle.electricity_rate_kwh ?? 0.30,
         vehicle.id, vehicle.id);

  res.json({ months: rows, vehicle });
});

// Einzel-Session: Ladeort zuweisen + Tarif setzen
router.patch('/sessions/:sessionId', (req, res) => {
  const db = req.db;
  const { location_id, billing_rate_kwh, energy_kwh_mid, billing_status } = req.body;
  db.prepare(`
    UPDATE charging_sessions SET
      location_id      = COALESCE(?, location_id),
      billing_rate_kwh = COALESCE(?, billing_rate_kwh),
      energy_kwh_mid   = COALESCE(?, energy_kwh_mid),
      billing_status   = COALESCE(?, billing_status)
    WHERE id = ?
  `).run(location_id ?? null, billing_rate_kwh ?? null, energy_kwh_mid ?? null,
         billing_status ?? null, req.params.sessionId);
  res.json({ ok: true });
});

async function getMontaToken(clientId, clientSecret) {
  const resp = await axios.post('https://partner-api.monta.com/api/v1/auth/token', {
    grantType: 'client_credentials',
    clientId,
    clientSecret,
  });
  return resp.data?.accessToken ?? resp.data?.access_token;
}

// Monta-Sync: Ladesessions von Monta API holen und mit lokalen Sessions abgleichen
router.post('/:vehicleId/monta-sync', async (req, res) => {
  const db = req.db;
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId);
  if (!vehicle?.monta_api_key) {
    return res.status(400).json({ error: 'Kein Monta Client Secret konfiguriert' });
  }

  try {
    const { from, to } = req.body;
    const params = { page: 0, perPage: 100 };
    if (from) params.fromDate = new Date(from * 1000).toISOString();
    if (to)   params.toDate   = new Date(to   * 1000).toISOString();
    if (vehicle.monta_charge_point_id) params.chargePointId = vehicle.monta_charge_point_id;

    // Auth: Partner API OAuth2-Token-Exchange, Fallback auf direkten Bearer Token
    let bearerToken;
    if (vehicle.monta_client_id) {
      console.log('[Monta] Token-Exchange für Client ID:', vehicle.monta_client_id);
      bearerToken = await getMontaToken(vehicle.monta_client_id, vehicle.monta_api_key);
      if (!bearerToken) throw new Error('Kein Access Token von Monta erhalten');
    } else {
      bearerToken = vehicle.monta_api_key;
    }

    const montaUrl = 'https://partner-api.monta.com/api/v1/charges';
    console.log('[Monta] Request:', montaUrl, JSON.stringify(params));
    const resp = await axios.get(montaUrl, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      params,
    });

    const montaSessions = resp.data?.data ?? resp.data?.sessions ?? resp.data ?? [];
    let matched = 0;

    // Wenn der Operator einen monta_charge_point_id konfiguriert hat,
    // sind ALLE Monta-Sessions per Definition an der Heim-Wallbox
    // (wir filtern via chargePointId in der Request). Dann markieren
    // wir die gematchten lokalen Sessions explizit als heim-geladen.
    // Zusaetzlich setzen wir die location_id auf den vorhandenen
    // home-Eintrag, damit GPS-naive Reports denselben Datensatz zeigen.
    const isHomeSync = !!vehicle.monta_charge_point_id;
    const homeLocationId = isHomeSync
      ? (db.prepare(
          "SELECT id FROM charging_locations WHERE vehicle_id=? AND type='home' ORDER BY is_default DESC, id ASC LIMIT 1"
        ).get(vehicle.id)?.id ?? null)
      : null;

    for (const ms of montaSessions) {
      const startTs = Math.floor(new Date(ms.startedAt ?? ms.start_at ?? ms.created_at).getTime() / 1000);
      const kwh     = ms.kwh ?? ms.energy ?? ms.energyKwh ?? ms.energy_kwh ?? 0;
      const msId    = String(ms.id ?? ms.sessionId ?? ms.session_id);

      // Passende lokale Session suchen (±10 Minuten)
      const local = db.prepare(
        'SELECT * FROM charging_sessions WHERE vehicle_id=? AND ABS(start_time - ?) < 600 LIMIT 1'
      ).get(vehicle.id, startTs);

      if (local) {
        db.prepare(
          `UPDATE charging_sessions SET
             monta_session_id = ?, energy_kwh_mid = ?,
             billing_rate_kwh = COALESCE(billing_rate_kwh, ?),
             is_home_charged  = CASE WHEN ? = 1 THEN 1 ELSE is_home_charged END,
             location_id      = COALESCE(location_id, ?)
           WHERE id = ?`
        ).run(msId, kwh, vehicle.electricity_rate_kwh ?? 0.30,
              isHomeSync ? 1 : 0, homeLocationId, local.id);
        matched++;
      }
    }

    res.json({
      synced: montaSessions.length,
      matched,
      home_marked: isHomeSync ? matched : 0,
      message: isHomeSync
        ? `${matched} Sessions als Heim-Ladung markiert`
        : `${matched} Sessions aktualisiert`,
    });
  } catch (e) {
    const status = e.response?.status;
    const err    = e.response?.data;
    console.error('[Monta] Sync-Fehler Status:', status);
    console.error('[Monta] Sync-Fehler Body:', JSON.stringify(err));
    const msg = typeof err === 'string' ? err : (err?.message || err?.error || JSON.stringify(err) || e.message);
    res.status(status || 502).json({ error: `Monta API ${status ?? ''}: ${msg}` });
  }
});

export default router;

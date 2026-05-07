import { Router } from 'express';
import { getDb } from '../db/database.js';
import axios from 'axios';

const router = Router();

// Heimlade-Sessions für Abrechnung (nur Ladeort-Typ 'home')
router.get('/:vehicleId/sessions', (req, res) => {
  const db = getDb();
  const { from, to, status } = req.query;
  const conds = ['cs.vehicle_id = ?'];
  const params = [req.params.vehicleId];

  // Heimladen: entweder location_id verknüpft mit home-Ort, oder location_name enthält Heimort-Namen
  conds.push(`(
    cs.location_id IN (SELECT id FROM charging_locations WHERE vehicle_id=? AND type='home')
    OR (cs.location_id IS NULL AND cs.charger_type NOT IN ('Supercharger','DC'))
  )`);
  params.push(req.params.vehicleId);

  if (from) { conds.push('cs.start_time >= ?'); params.push(+from); }
  if (to)   { conds.push('cs.start_time <= ?'); params.push(+to); }
  if (status) { conds.push('cs.billing_status = ?'); params.push(status); }

  const sessions = db.prepare(
    `SELECT cs.*, cl.name as location_name_resolved, cl.rate_kwh as location_rate
     FROM charging_sessions cs
     LEFT JOIN charging_locations cl ON cl.id = cs.location_id
     WHERE ${conds.join(' AND ')}
     ORDER BY cs.start_time DESC`
  ).all(...params);

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId);
  res.json({ sessions, vehicle });
});

// Monatsauswertung für Abrechnung
router.get('/:vehicleId/summary', (req, res) => {
  const db = getDb();
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
      AND (cs.location_id IN (SELECT id FROM charging_locations WHERE vehicle_id=? AND type='home')
           OR cs.location_id IS NULL)
    GROUP BY month ORDER BY month DESC
  `).all(vehicle.electricity_rate_kwh ?? 0.30, vehicle.electricity_rate_kwh ?? 0.30,
         vehicle.id, vehicle.id);

  res.json({ months: rows, vehicle });
});

// Einzel-Session: Ladeort zuweisen + Tarif setzen
router.patch('/sessions/:sessionId', (req, res) => {
  const db = getDb();
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

// Monta-Sync: Ladesessions von Monta API holen und mit lokalen Sessions abgleichen
router.post('/:vehicleId/monta-sync', async (req, res) => {
  const db = getDb();
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.vehicleId);
  if (!vehicle?.monta_api_key) {
    return res.status(400).json({ error: 'Kein Monta API-Key konfiguriert' });
  }

  try {
    const { from, to } = req.body;
    const params = { page: 1, perPage: 100 };
    if (from) params.from = new Date(from * 1000).toISOString();
    if (to)   params.to   = new Date(to   * 1000).toISOString();
    if (vehicle.monta_charge_point_id) params.chargePointId = vehicle.monta_charge_point_id;

    const resp = await axios.get('https://api.monta.app/v2/charge-sessions', {
      headers: { Authorization: `Bearer ${vehicle.monta_api_key}` },
      params,
    });

    const montaSessions = resp.data?.data ?? resp.data?.sessions ?? resp.data ?? [];
    let matched = 0;

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
             billing_rate_kwh = COALESCE(billing_rate_kwh, ?)
           WHERE id = ?`
        ).run(msId, kwh, vehicle.electricity_rate_kwh ?? 0.30, local.id);
        matched++;
      }
    }

    res.json({ synced: montaSessions.length, matched, message: `${matched} Sessions aktualisiert` });
  } catch (e) {
    const status = e.response?.status;
    const err    = e.response?.data;
    console.error('[Monta] Sync-Fehler:', err || e.message);
    res.status(status || 502).json({ error: err?.message || err || e.message });
  }
});

export default router;

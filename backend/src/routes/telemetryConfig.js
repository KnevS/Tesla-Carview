import { Router } from 'express';
import axios from 'axios';
import { getPublicKeyPem } from '../services/virtualKey.js';
import { apiProxyPost } from '../services/teslaApi.js';
import { getAllTenants, getDb } from '../db/database.js';
import { getTenantSetting } from '../services/configService.js';

const router = Router();

// Tesla-Pflicht: Public-Key des ersten Mandanten (gemeinsame Domain → ein Key)
router.get('/com.tesla.3p.public-key.pem', (_req, res) => {
  try {
    const tenants = getAllTenants();
    if (!tenants.length) return res.status(503).send('Kein Mandant konfiguriert');
    const db  = getDb(tenants[0].id);
    const pem = getPublicKeyPem(db);
    res.type('text/plain').send(pem);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Status (nur für eingeloggte Nutzer, req.db verfügbar).
// Pro Fahrzeug:
//   - configured_at:    POST .../fleet_telemetry_config war einmal erfolgreich
//   - last_signal_at:   wann kam zuletzt ein Streaming-Paket vom Auto rein
//   - last_error:       Fehlertext vom letzten configure-Versuch, falls nicht ok
//   - status:           derived — green=live, yellow=registered-idle,
//                       red=not-registered, gray=approval-missing
// Frontend rendert den Status-Indikator pro VIN daraus.
router.get('/telemetry/status', async (req, res) => {
  const db       = req.db;
  const key      = db.prepare('SELECT created_at FROM virtual_key ORDER BY id DESC LIMIT 1').get();
  const vehicles = db.prepare(
    `SELECT id, vin, display_name,
            telemetry_configured_at AS configured_at,
            telemetry_last_signal_at AS last_signal_at,
            telemetry_last_error    AS last_error
       FROM vehicles
       ORDER BY display_name`
  ).all();
  const now = Math.floor(Date.now() / 1000);
  const SIGNAL_FRESH_S = 15 * 60; // 15 min ohne Signal => idle, sonst aktiv

  for (const v of vehicles) {
    if (v.last_error && /(404|approval|not approved|not enrolled|fleet_telemetry)/i.test(v.last_error)) {
      v.status = 'approval_missing';
    } else if (v.last_signal_at && (now - v.last_signal_at) <= SIGNAL_FRESH_S) {
      v.status = 'streaming';
    } else if (v.configured_at) {
      v.status = 'registered_idle';
    } else if (v.last_error) {
      v.status = 'error';
    } else {
      v.status = 'not_registered';
    }
  }

  res.json({
    virtual_key_exists:      !!key,
    virtual_key_created_at:  key?.created_at,
    registration_url: `https://tesla.com/_ak/${process.env.FRONTEND_URL?.replace(/^https?:\/\//, '')}`,
    vehicles,
  });
});

// Einmalige Partner-Registrierung bei Tesla (benötigt für fleet_telemetry_config)
router.post('/partner/register', async (req, res) => {
  const clientId     = getTenantSetting(req.db, 'tesla.client_id', 'TESLA_CLIENT_ID');
  const clientSecret = getTenantSetting(req.db, 'tesla.client_secret', 'TESLA_CLIENT_SECRET');
  const audience     = getTenantSetting(req.db, 'tesla.audience', 'TESLA_AUDIENCE') || 'https://fleet-api.prd.eu.vn.cloud.tesla.com';
  const authBase     = getTenantSetting(req.db, 'tesla.auth_base', 'TESLA_AUTH_BASE') || 'https://auth.tesla.com/oauth2/v3';
  const domain       = process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || '';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'TESLA_CLIENT_ID / TESLA_CLIENT_SECRET nicht konfiguriert' });
  }

  try {
    // 1. Partner-Token holen (client_credentials)
    const tokenRes = await axios.post(`${authBase}/token`, new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         'openid vehicle_device_data vehicle_cmds vehicle_charging_cmds',
      audience,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const partnerToken = tokenRes.data.access_token;

    // 2. App bei Tesla registrieren
    const regRes = await axios.post(`${audience}/api/1/partner_accounts`, {
      domain,
    }, {
      headers: { Authorization: `Bearer ${partnerToken}`, 'Content-Type': 'application/json' },
    });

    res.json({ ok: true, response: regRes.data });
  } catch (err) {
    const status  = err.response?.status;
    const errData = err.response?.data;
    const msg = typeof errData === 'object' && errData !== null
      ? (errData.error || errData.message || JSON.stringify(errData))
      : status ? `HTTP ${status}` : err.message;
    res.status(500).json({ ok: false, error: msg });
  }
});

/** Konfiguriert das Streaming pro VIN bei Tesla. Wenn `req.params.vin`
 *  gesetzt ist, nur diese eine VIN; sonst alle Fahrzeuge des Mandanten.
 *  Ergebnis pro Fahrzeug landet im DB-Schema, damit das Frontend den
 *  Status-Indikator daraus speist. */
async function configureOne(db, v, domain) {
  const payload = {
    config: {
      hostname: domain, port: 443, ca: '',
      fields: {
        Location:     { interval_seconds: 10 },
        VehicleSpeed: { interval_seconds: 5  },
        Gear:         { interval_seconds: 5  },
        Odometer:     { interval_seconds: 30 },
        Soc:          { interval_seconds: 10 },
        PackVoltage:  { interval_seconds: 10 },
        PackCurrent:  { interval_seconds: 10 },
      },
      alert_types: ['service', 'autopilot', 'charging'],
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    },
  };
  try {
    const data = await apiProxyPost(db, `/api/1/vehicles/${v.vin}/fleet_telemetry_config`, payload, 90000);
    db.prepare(
      'UPDATE vehicles SET telemetry_configured_at = ?, telemetry_last_error = NULL WHERE id = ?'
    ).run(Math.floor(Date.now() / 1000), v.id);
    return { vin: v.vin, ok: true, response: data };
  } catch (err) {
    const status  = err.response?.status;
    const errData = err.response?.data;
    const msg = typeof errData === 'object' && errData !== null
      ? (errData.error || errData.message || JSON.stringify(errData))
      : status === 404
        ? `HTTP 404 – Fleet Telemetry nicht freigeschaltet (Partner-Zugang bei Tesla beantragen)`
        : status
          ? `HTTP ${status}`
          : err.message;
    db.prepare(
      'UPDATE vehicles SET telemetry_last_error = ? WHERE id = ?'
    ).run(msg.slice(0, 500), v.id);
    return { vin: v.vin, ok: false, error: msg };
  }
}

router.post('/telemetry/configure', async (req, res) => {
  const db       = req.db;
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  const domain   = process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || '';
  const results  = [];
  for (const v of vehicles) results.push(await configureOne(db, v, domain));
  res.json({ results });
});

/** Single-VIN-Variante. Wird vom Settings-UI pro Fahrzeug aufgerufen,
 *  damit der Admin pro Auto ein- und ausschalten kann. */
router.post('/telemetry/configure/:vin', async (req, res) => {
  const db = req.db;
  const v  = db.prepare('SELECT * FROM vehicles WHERE vin = ?').get(req.params.vin);
  if (!v) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  const domain = process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || '';
  const result = await configureOne(db, v, domain);
  res.status(result.ok ? 200 : 502).json(result);
});

export default router;

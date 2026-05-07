import { Router } from 'express';
import axios from 'axios';
import { getPublicKeyPem } from '../services/virtualKey.js';
import { apiProxyPost } from '../services/teslaApi.js';
import { getAllTenants, getDb } from '../db/database.js';

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

// Status (nur für eingeloggte Nutzer, req.db verfügbar)
router.get('/telemetry/status', async (req, res) => {
  const db       = req.db;
  const key      = db.prepare('SELECT created_at FROM virtual_key ORDER BY id DESC LIMIT 1').get();
  const vehicles = db.prepare('SELECT vin, display_name FROM vehicles').all();
  res.json({
    virtual_key_exists:      !!key,
    virtual_key_created_at:  key?.created_at,
    registration_url: `https://tesla.com/_ak/${process.env.FRONTEND_URL?.replace(/^https?:\/\//, '')}`,
    vehicles,
  });
});

// Einmalige Partner-Registrierung bei Tesla (benötigt für fleet_telemetry_config)
router.post('/partner/register', async (req, res) => {
  const clientId     = process.env.TESLA_CLIENT_ID;
  const clientSecret = process.env.TESLA_CLIENT_SECRET;
  const audience     = process.env.TESLA_AUDIENCE;
  const authBase     = process.env.TESLA_AUTH_BASE;
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

router.post('/telemetry/configure', async (req, res) => {
  const db       = req.db;
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  const domain   = process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || '';
  const results  = [];

  for (const v of vehicles) {
    try {
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
      const data = await apiProxyPost(db, `/api/1/vehicles/${v.vin}/fleet_telemetry_config`, payload, 90000);
      results.push({ vin: v.vin, ok: true, response: data });
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
      results.push({ vin: v.vin, ok: false, error: msg });
    }
  }
  res.json({ results });
});

export default router;

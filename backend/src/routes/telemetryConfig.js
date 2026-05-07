import { Router } from 'express';
import { getPublicKeyPem } from '../services/virtualKey.js';
import { apiPost } from '../services/teslaApi.js';
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
      const data = await apiPost(db, `/api/1/vehicles/${v.vin}/fleet_telemetry_config`, payload);
      results.push({ vin: v.vin, ok: true, response: data });
    } catch (err) {
      const errData = err.response?.data;
      results.push({ vin: v.vin, ok: false, error: errData || err.message });
    }
  }
  res.json({ results });
});

export default router;

import { Router } from 'express';
import { getPublicKeyPem } from '../services/virtualKey.js';
import { apiPost } from '../services/teslaApi.js';
import { getDb } from '../db/database.js';

const router = Router();

// Tesla-Pflicht: Public-Key muss hier abrufbar sein
// GET /.well-known/appspecific/com.tesla.3p.public-key.pem
router.get('/com.tesla.3p.public-key.pem', (_req, res) => {
  const pem = getPublicKeyPem();
  res.type('text/plain').send(pem);
});

// Status der Fleet-Telemetry-Konfiguration
router.get('/telemetry/status', async (_req, res) => {
  const db = getDb();
  const key = db.prepare('SELECT created_at FROM virtual_key ORDER BY id DESC LIMIT 1').get();
  const vehicles = db.prepare('SELECT vin, display_name FROM vehicles').all();
  res.json({
    virtual_key_exists: !!key,
    virtual_key_created_at: key?.created_at,
    registration_url: `https://tesla.com/_ak/${process.env.FRONTEND_URL?.replace(/^https?:\/\//, '')}`,
    vehicles,
  });
});

// Telemetry-Config an Tesla-API senden (nach Virtual-Key-Registrierung)
router.post('/telemetry/configure', async (req, res) => {
  const db = getDb();
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  const domain = process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || '';
  const results = [];

  for (const v of vehicles) {
    try {
      const payload = {
        config: {
          hostname: domain,
          port: 443,
          ca:   '',
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
      const data = await apiPost(`/api/1/vehicles/${v.vin}/fleet_telemetry_config`, payload);
      results.push({ vin: v.vin, ok: true, response: data });
      console.log(`[TelemetryConfig] Konfiguriert: ${v.vin}`);
    } catch (err) {
      const errData = err.response?.data;
      results.push({ vin: v.vin, ok: false, error: errData || err.message });
      console.error(`[TelemetryConfig] Fehler ${v.vin}:`, errData || err.message);
    }
  }
  res.json({ results });
});

export default router;

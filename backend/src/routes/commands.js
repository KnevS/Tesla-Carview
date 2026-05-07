import { Router } from 'express';
import { apiPost, apiGet, apiProxyPost } from '../services/teslaApi.js';

const router = Router();

const ALLOWED_COMMANDS = new Set([
  'auto_conditioning_start', 'auto_conditioning_stop', 'set_temps',
  'set_preconditioning_max', 'door_lock', 'door_unlock',
  'charge_start', 'charge_stop', 'set_charge_limit',
  'set_sentry_mode', 'flash_lights', 'honk_horn',
  'navigation_request',
]);

function getVehicle(db, vehicleId) {
  return db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicleId);
}

router.post('/:vehicleId/wake_up', async (req, res) => {
  const vehicle = getVehicle(req.db, req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  try {
    await apiPost(req.db, `/api/1/vehicles/${vehicle.tesla_id}/wake_up`, {});
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const state = await apiGet(req.db, `/api/1/vehicles/${vehicle.tesla_id}`);
      if (state?.response?.state === 'online') return res.json({ ok: true, state: 'online' });
    }
    res.json({ ok: false, state: 'timeout' });
  } catch (e) {
    res.status(502).json({ error: e.response?.data || e.message });
  }
});

router.get('/:vehicleId/state', async (req, res) => {
  const vehicle = getVehicle(req.db, req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  try {
    const data = await apiGet(req.db, `/api/1/vehicles/${vehicle.tesla_id}`);
    res.json({ state: data?.response?.state ?? 'unknown' });
  } catch (e) {
    res.status(502).json({ error: e.response?.data || e.message });
  }
});

router.post('/:vehicleId/:command', async (req, res) => {
  const { vehicleId, command } = req.params;
  if (!ALLOWED_COMMANDS.has(command)) {
    return res.status(400).json({ error: `Unbekannter Befehl: ${command}` });
  }
  const vehicle = getVehicle(req.db, vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  if (!vehicle.vin) return res.status(400).json({ error: 'Fahrzeug hat keine VIN hinterlegt' });
  try {
    const data = await apiProxyPost(req.db, `/api/1/vehicles/${vehicle.vin}/command/${command}`, req.body ?? {});
    res.json(data?.response ?? data);
  } catch (e) {
    const status = e.response?.status;
    const err    = e.response?.data;
    if (status === 408 || err?.error?.includes('offline') || err?.error?.includes('asleep')) {
      return res.status(503).json({ error: 'Fahrzeug schläft oder ist offline', code: 'ASLEEP' });
    }
    res.status(status || 502).json({ error: err?.error || err || e.message });
  }
});

export default router;

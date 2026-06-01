import { Router } from 'express';
import { apiPost, apiGet, apiProxyPost } from '../services/teslaApi.js';
import { forcePollVehicle } from '../services/poller.js';

const router = Router();

// Liste deckt sich mit den Tesla Fleet-API Signed-Commands. Erweitert
// in Mai 2026: Trunk/Frunk, Sitz-/Lenkrad-Heizung, Climate Keeper,
// Boombox, Ladeklappe, Fenster, Software-Update.
//
// Alles laeuft ueber den tesla-http-proxy auf 4443. Unbekannte
// Befehl-Namen liefert der Proxy mit 412 zurueck — das wird unten
// generisch zum 502 mit Fehlertext, sodass das Frontend eine konkrete
// Meldung anzeigen kann.
const ALLOWED_COMMANDS = new Set([
  // Klima
  'auto_conditioning_start', 'auto_conditioning_stop', 'set_temps',
  'set_preconditioning_max', 'set_climate_keeper_mode',
  // Sitz-/Lenkradheizung
  'remote_seat_heater_request',
  'remote_steering_wheel_heater_request',
  'remote_steering_wheel_heat_climate_request',
  // Tueren / Karosserie
  'door_lock', 'door_unlock',
  'actuate_trunk', 'window_control',
  'charge_port_door_open', 'charge_port_door_close',
  // Laden
  'charge_start', 'charge_stop', 'set_charge_limit', 'set_charging_amps',
  // Sicherheit / Signal
  'set_sentry_mode', 'flash_lights', 'honk_horn',
  // Navigation + Boombox
  'navigation_request', 'remote_boombox',
  // Software
  'schedule_software_update', 'cancel_software_update',
  // Zeitplan: Vorklimatisierung + planbare Ladung mit Off-Peak-Fenster
  'set_scheduled_departure', 'set_scheduled_charging',
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

/** POST /api/commands/:vehicleId/refresh — Notbremse fuer die OFFLINE-Anzeige.
 *  Macht einen einmaligen vehicle_data-Call, sodass state_updated_at sofort
 *  frisch wird und das Frontend wieder ONLINE zeigt. Respektiert Tages-/Monats-Cap.
 *  Nuetzlich nach Backend-Restart (Auto-Deploy), wenn FleetTelemetry-Stream
 *  noch nicht re-established ist und Polling-Heartbeat noch nicht greift. */
router.post('/:vehicleId/refresh', async (req, res) => {
  const vehicle = getVehicle(req.db, req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

  const result = await forcePollVehicle(req.db, vehicle, req.tenantId);

  if (!result.ok && result.error === 'cap_reached') {
    return res.status(429).json({
      error: 'Tages-Cap erreicht — Polling pausiert bis morgen.',
      cap: result.cap,
    });
  }
  if (!result.ok) {
    return res.status(result.status || 502).json({
      error: result.error,
      cap: result.cap,
    });
  }
  res.json(result);
});

/** GET /api/commands/:vehicleId/software-update — Status der Tesla-OTA.
 *  Liefert ob ein Update verfuegbar ist, inklusive Versionsnummer und
 *  optional dem geplanten Installationszeitpunkt. Daten kommen aus dem
 *  vehicle_state.software_update-Block der vehicle_data-API. */
router.get('/:vehicleId/software-update', async (req, res) => {
  const vehicle = getVehicle(req.db, req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  try {
    // vehicle_data ohne expliziten endpoints-Param liefert in einem
    // Aufruf alle relevanten Bloecke (vehicle_state inkl. software_update).
    const data = await apiGet(req.db, `/api/1/vehicles/${vehicle.tesla_id}/vehicle_data`);
    const su = data?.response?.vehicle_state?.software_update ?? null;
    res.json({
      // Mappe die wichtigsten Felder fuer das Frontend.
      status:                su?.status        ?? 'unknown',
      version:               su?.version       ?? null,        // z.B. "2026.4.5"
      installPercentage:     su?.install_perc  ?? null,
      downloadPercentage:    su?.download_perc ?? null,
      expectedDurationSec:   su?.expected_duration_sec ?? null,
      scheduledTimeMs:       su?.scheduled_time_ms ?? null,    // gesetzt wenn schedule_software_update lief
    });
  } catch (e) {
    res.status(e.response?.status || 502).json({ error: e.response?.data || e.message });
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
    let data;
    if (command === 'navigation_request') {
      // navigation_request wird vom tesla-http-proxy mit
      // "command requires using the REST API" abgelehnt.
      // Es muss direkt ueber die Fleet-REST-API gesendet werden.
      if (!vehicle.tesla_id) return res.status(400).json({ error: 'Fahrzeug hat keine Tesla-ID' });
      data = await apiPost(req.db, `/api/1/vehicles/${vehicle.tesla_id}/command/${command}`, req.body ?? {});
    } else {
      data = await apiProxyPost(req.db, `/api/1/vehicles/${vehicle.vin}/command/${command}`, req.body ?? {});
    }
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

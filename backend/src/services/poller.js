import { getVehicles, getVehicleData } from './teslaApi.js';
import { getDb } from '../db/database.js';
import { syncVehicleState } from './dataSync.js';

const POLL_INTERVAL_ACTIVE = 30_000;   // 30s wenn Fahrzeug aktiv
const POLL_INTERVAL_IDLE   = 300_000;  // 5min wenn Fahrzeug schläft

const vehicleStates = new Map();

export async function startPoller() {
  console.log('[Poller] Starte Tesla Polling-Service...');
  poll();
}

async function poll() {
  try {
    const db = getDb();
    const vehicles = db.prepare('SELECT * FROM vehicles').all();

    if (vehicles.length === 0) {
      setTimeout(poll, POLL_INTERVAL_IDLE);
      return;
    }

    let anyActive = false;

    for (const vehicle of vehicles) {
      try {
        const data = await getVehicleData(vehicle.tesla_id);
        const state = data?.response;
        if (!state) continue;

        const isAwake = state.state === 'online';
        if (isAwake) anyActive = true;

        await syncVehicleState(vehicle, state);
      } catch (err) {
        if (err.response?.status === 408) {
          // Fahrzeug schläft – kein Fehler
        } else {
          console.error(`[Poller] Fehler bei Fahrzeug ${vehicle.display_name}:`, err.message);
        }
      }
    }

    const interval = anyActive ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
    setTimeout(poll, interval);
  } catch (err) {
    console.error('[Poller] Allgemeiner Fehler:', err.message);
    setTimeout(poll, POLL_INTERVAL_IDLE);
  }
}

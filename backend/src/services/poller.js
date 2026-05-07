import { getVehicleData } from './teslaApi.js';
import { getAllTenants, getDb } from '../db/database.js';
import { syncVehicleState } from './dataSync.js';

const POLL_INTERVAL_ACTIVE = 30_000;
const POLL_INTERVAL_IDLE   = 300_000;

export async function startPoller() {
  console.log('[Poller] Starte Tesla Polling-Service...');
  poll();
}

async function poll() {
  let anyActive = false;

  try {
    const tenants = getAllTenants();
    for (const tenant of tenants) {
      try {
        const db       = getDb(tenant.id);
        const vehicles = db.prepare('SELECT * FROM vehicles').all();
        for (const vehicle of vehicles) {
          try {
            const data = await getVehicleData(db, vehicle.tesla_id);
            const state = data?.response;
            if (!state) continue;
            if (state.state === 'online') anyActive = true;
            await syncVehicleState(db, vehicle, state);
          } catch (err) {
            if (err.response?.status !== 408) {
              console.error(`[Poller] Fahrzeug ${vehicle.display_name} (${tenant.slug}):`, err.message);
            }
          }
        }
      } catch (err) {
        console.error(`[Poller] Mandant ${tenant.slug}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Poller] Allgemeiner Fehler:', err.message);
  }

  setTimeout(poll, anyActive ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE);
}

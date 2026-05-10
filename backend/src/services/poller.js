import { getVehicleData, getVehicles } from './teslaApi.js';
import { getAllTenants, getDb, registerVin } from '../db/database.js';
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
      if (tenant.status === 'suspended') continue;
      try {
        const db       = getDb(tenant.id);
        // Beim ersten Lauf (noch keine Fahrzeuge) automatisch vom Tesla-Account synchronisieren
        if (!db.prepare('SELECT 1 FROM vehicles LIMIT 1').get()) {
          try {
            const data = await getVehicles(db);
            const list = data.response || [];
            const insert = db.prepare('INSERT OR REPLACE INTO vehicles (tesla_id, vin, display_name, model) VALUES (?,?,?,?)');
            for (const v of list) {
              insert.run(String(v.id), v.vin, v.display_name, v.model_name);
              if (v.vin) registerVin(v.vin, tenant.id);
            }
            if (list.length) console.log(`[Poller] ${list.length} Fahrzeug(e) für Mandant "${tenant.slug}" synchronisiert`);
          } catch { /* kein Token oder API nicht erreichbar */ }
        }
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

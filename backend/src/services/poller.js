import { getVehicleData, getVehicles } from './teslaApi.js';
import { getAllTenants, getDb, registerVin } from '../db/database.js';
import { syncVehicleState } from './dataSync.js';

/**
 * Hybrid-Polling-Strategie.
 *
 * Wir gewichten Fleet Telemetry (push) als PRIMAERE Datenquelle —
 * dort wo das Auto live streamt, brauchen wir keinen Polling-Call mehr
 * fuer Position/SOC/Speed. Wenn Telemetry fuer eine VIN aktiv ist
 * (letztes Signal < TELEMETRY_FRESH_S), fallen wir auf den Heartbeat-
 * Intervall zurueck — nur noch ein vehicle_data-Call pro Stunde, um
 * vehicle_config + option_codes + Stammdaten aktuell zu halten.
 *
 * Wenn Telemetry NICHT aktiv ist (kein Approval / nicht konfiguriert /
 * Auto schweigt): kompletter Polling-Pfad wie frueher — alle 30s wenn
 * online, alle 5min im Idle.
 *
 * Das spart bei Telemetry-aktiven Mandanten >95% des API-Budgets und
 * entlastet Tesla's Fleet API — was wiederum die Kalibrierung des
 * Daily-Limits angenehm macht.
 */
const POLL_INTERVAL_ACTIVE     = 30_000;     // 30s — Auto online + kein Streaming
const POLL_INTERVAL_IDLE       = 300_000;    // 5min — Auto offline + kein Streaming
const POLL_INTERVAL_HEARTBEAT  = 3_600_000;  // 1h — Auto streamt via Telemetry
const TELEMETRY_FRESH_S        = 15 * 60;    // 15min: Stream gilt als "aktiv"

export async function startPoller() {
  console.log('[Poller] Starte Tesla Hybrid-Service (Telemetry-first, Polling als Fallback)...');
  poll();
}

/** Ein Vehicle gilt als "via Telemetry abgedeckt", wenn das letzte
 *  Streaming-Signal innerhalb der Frische-Schwelle eingetroffen ist. */
function isCoveredByTelemetry(vehicle, nowS) {
  return vehicle.telemetry_last_signal_at != null
    && (nowS - vehicle.telemetry_last_signal_at) <= TELEMETRY_FRESH_S;
}

async function poll() {
  let anyActivePolling = false;
  const nowS = Math.floor(Date.now() / 1000);

  try {
    const tenants = getAllTenants();
    for (const tenant of tenants) {
      if (tenant.status === 'suspended') continue;
      // Demo-Mandanten haben keine Tesla-Verbindung.
      if (tenant.is_demo) continue;
      try {
        const db = getDb(tenant.id);
        // Erstlauf: Fahrzeugliste vom Tesla-Account ziehen.
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
          // Hybrid-Entscheidung pro Fahrzeug:
          // - via Telemetry abgedeckt UND letzter Polling-Call < 1h:
          //   ueberspringen. Streaming liefert die Live-Daten frisch.
          // - via Telemetry abgedeckt UND >= 1h kein Poll:
          //   einen Heartbeat-Poll machen (vehicle_config-Refresh).
          // - nicht via Telemetry abgedeckt:
          //   normal pollen wie frueher.
          const covered = isCoveredByTelemetry(vehicle, nowS);
          const lastPoll = vehicle.state_updated_at ?? 0;
          if (covered && (nowS - lastPoll) < POLL_INTERVAL_HEARTBEAT / 1000) {
            continue; // Streaming reicht — kein API-Call.
          }

          try {
            const data  = await getVehicleData(db, vehicle.tesla_id);
            const state = data?.response;
            if (!state) continue;
            if (state.state === 'online' && !covered) anyActivePolling = true;
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

  // Loop-Intervall: aktiv-pollende Mandanten brauchen 30s-Cycle,
  // sonst reicht 5min — auch wenn einzelne Autos im Heartbeat-Modus
  // sind, kostet das ja nichts.
  setTimeout(poll, anyActivePolling ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE);
}

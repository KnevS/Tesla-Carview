import { getVehicleData, getVehicles } from './teslaApi.js';
import { getAllTenants, getDb, registerVin } from '../db/database.js';
import { syncVehicleState } from './dataSync.js';
import {
  isOpen as isCircuitOpen,
  record403,
  recordSuccess,
  recordOtherFailure,
} from './teslaCircuitBreaker.js';

/**
 * Hybrid-Polling-Strategie mit Quota-Schonung.
 *
 * Drei Betriebsmodi (ohne Telemetry):
 *   DRIVING  — shift_state D/R/N → 30s  (Auto faehrt aktiv)
 *   PARKED   — online aber steht → 5min (laedt, wartet, klimatisiert)
 *   IDLE     — offline           → 15min
 *
 * Mit Fleet Telemetry:
 *   HEARTBEAT — 1 Call/Stunde zur Stammdaten-Aktualisierung
 *
 * Tages-Cap: max. DAILY_CAP Calls pro Fahrzeug. Bei Erreichen 30min
 * Zwangspause — schützt gegen unerwartete Endlos-Online-Phasen.
 */
const POLL_INTERVAL_DRIVING   = 30_000;       // 30s  — faehrt (shift D/R/N)
const POLL_INTERVAL_PARKED    = 600_000;      // 10min — online, steht (war 5min)
const POLL_INTERVAL_IDLE      = 2_700_000;    // 45min — offline (war 15min)
const POLL_INTERVAL_HEARTBEAT = 3_600_000;    // 1h   — Telemetry aktiv
const TELEMETRY_FRESH_S       = 15 * 60;      // 15min: Telemetry-Signal gilt als frisch

const DAILY_CAP = 80; // max. vehicle_data-Calls pro Fahrzeug & Tag

// In-memory Tageszaehler — Key: vehicle.id (DB-ID, nicht tesla_id).
// Resets beim Container-Neustart; das ist vertretbar, weil wir beim
// naechsten Start eines neuen Tages sowieso frisch beginnen wollen.
// Wichtiger als persistence ist das harte Tages-Ende: nach DAILY_CAP
// Calls wird erst am naechsten UTC-Tag weiter gepollt (keine 30min-
// Schleife mehr, die nach Restarts wieder neu beginnt).
const dailyCalls = new Map();

function todayKey() { return new Date().toISOString().slice(0, 10); }

function endOfTodayMs() {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d.getTime();
}

function getCapRecord(vehicleId) {
  const today = todayKey();
  let r = dailyCalls.get(vehicleId);
  if (!r || r.date !== today) {
    r = { date: today, count: 0, pausedUntilMs: 0 };
    dailyCalls.set(vehicleId, r);
  }
  return r;
}

function isCapPaused(vehicleId) {
  const r = dailyCalls.get(vehicleId);
  if (!r) return false;
  if (r.pausedUntilMs && r.pausedUntilMs > Date.now()) return true;
  if (r.pausedUntilMs && r.pausedUntilMs <= Date.now()) r.pausedUntilMs = 0;
  return false;
}

function incrementCap(vehicleId, displayName) {
  const r = getCapRecord(vehicleId);
  r.count++;
  if (r.count >= DAILY_CAP && !r.pausedUntilMs) {
    r.pausedUntilMs = endOfTodayMs();
    console.warn(
      `[Poller] ${displayName}: Tages-Cap (${DAILY_CAP} Calls) erreicht` +
      ` → Pause bis Tagesende (${new Date(r.pausedUntilMs).toISOString()})`
    );
  }
}

/** Auto faehrt aktiv wenn shift_state D, R oder N gesetzt ist. */
function isDriving(state) {
  const s = state?.drive_state?.shift_state;
  return s === 'D' || s === 'R' || s === 'N';
}

function isCoveredByTelemetry(vehicle, nowS) {
  return vehicle.telemetry_last_signal_at != null
    && (nowS - vehicle.telemetry_last_signal_at) <= TELEMETRY_FRESH_S;
}

export async function startPoller() {
  console.log('[Poller] Starte Tesla Hybrid-Service (Telemetry-first, Polling als Fallback)...');
  poll();
}

async function poll() {
  let anyDriving     = false; // → POLL_INTERVAL_DRIVING (30s)
  let anyParked      = false; // → POLL_INTERVAL_PARKED  (5min)
  const nowS = Math.floor(Date.now() / 1000);

  try {
    const tenants = getAllTenants();
    for (const tenant of tenants) {
      if (tenant.status === 'suspended') continue;
      if (tenant.is_demo) continue;
      if (isCircuitOpen(tenant.id)) continue;

      try {
        const db = getDb(tenant.id);

        // Erstlauf: Fahrzeugliste holen
        if (!db.prepare('SELECT 1 FROM vehicles LIMIT 1').get()) {
          try {
            const data = await getVehicles(db);
            const list = data.response || [];
            const insert = db.prepare('INSERT OR REPLACE INTO vehicles (tesla_id, vin, display_name, model) VALUES (?,?,?,?)');
            for (const v of list) {
              insert.run(String(v.id), v.vin, v.display_name, v.model_name);
              if (v.vin) registerVin(v.vin, tenant.id);
            }
            if (list.length) console.log(`[Poller] ${list.length} Fahrzeug(e) fuer Mandant "${tenant.slug}" synchronisiert`);
            recordSuccess(tenant.id, tenant.slug);
          } catch (err) {
            if (err.response?.status === 403) { record403(tenant.id, tenant.slug); continue; }
            if (err.message && err.response?.status !== 401) recordOtherFailure(tenant.id);
          }
        }

        const vehicles = db.prepare('SELECT * FROM vehicles').all();
        let tenant403 = false;

        for (const vehicle of vehicles) {
          if (tenant403) break;

          // Telemetry-Heartbeat-Logik (unveraendert)
          const covered  = isCoveredByTelemetry(vehicle, nowS);
          const lastPoll = vehicle.state_updated_at ?? 0;
          if (covered && (nowS - lastPoll) < POLL_INTERVAL_HEARTBEAT / 1000) continue;

          // Tages-Cap: Pause wenn Limit erreicht
          if (isCapPaused(vehicle.id)) continue;

          try {
            const data  = await getVehicleData(db, vehicle.tesla_id);
            const state = data?.response;
            if (!state) continue;

            incrementCap(vehicle.id, vehicle.display_name);

            if (!covered) {
              if (isDriving(state))          anyDriving = true;
              else if (state.state === 'online') anyParked = true;
            }

            await syncVehicleState(db, vehicle, state);
            recordSuccess(tenant.id, tenant.slug);
          } catch (err) {
            if (err.response?.status === 403) {
              record403(tenant.id, tenant.slug);
              tenant403 = true;
              break;
            }
            if (err.response?.status !== 408) {
              console.error(`[Poller] Fahrzeug ${vehicle.display_name} (${tenant.slug}):`, err.message);
            }
            recordOtherFailure(tenant.id);
          }
        }
      } catch (err) {
        console.error(`[Poller] Mandant ${tenant.slug}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Poller] Allgemeiner Fehler:', err.message);
  }

  // Naechster Lauf: schnellster Modus der gerade aktiv ist gewinnt
  const next = anyDriving  ? POLL_INTERVAL_DRIVING
             : anyParked   ? POLL_INTERVAL_PARKED
             :               POLL_INTERVAL_IDLE;
  setTimeout(poll, next);
}

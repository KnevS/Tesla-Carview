// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { getVehicleData, getVehicles } from './teslaApi.js';
import { getAllTenants, getDb, registerVin } from '../db/database.js';
import { syncVehicleState, trackSleepEvents } from './dataSync.js';
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
 *   DRIVING  — shift_state D/R/N → 30s   (Auto faehrt aktiv)
 *   PARKED   — online aber steht → 20min  (laedt, wartet, klimatisiert)
 *   IDLE     — offline           → 90min  (schlaeft)
 *
 * Mit Fleet Telemetry:
 *   HEARTBEAT — 1 Call/Stunde zur Stammdaten-Aktualisierung
 *
 * Kosten-Budget:
 *   Tages-Cap:   DAILY_CAP    Calls pro Fahrzeug, DB-persistent (ueberlebt Neustarts).
 *   Monats-Cap:  MONTHLY_CAP  Calls pro Fahrzeug, ebenfalls DB-persistent.
 *   Beide werden in tesla_api_usage aggregiert — kein Verlust bei Restart.
 *
 * 404-Circuit-Breaker: nach CONSECUTIVE_404_THRESHOLD aufeinanderfolgenden
 * 404-Antworten wird der Tenant fuer 6h pausiert (Auto evtl. abgemeldet
 * oder API-Endpunkt geaendert).
 */
const POLL_INTERVAL_DRIVING   =    30_000; // 30s   — faehrt aktiv
const POLL_INTERVAL_PARKED    = 1_200_000; // 20min — online, steht
const POLL_INTERVAL_IDLE      = 5_400_000; // 90min — offline
const POLL_INTERVAL_HEARTBEAT = 3_600_000; // 1h    — Telemetry aktiv
const TELEMETRY_FRESH_S       = 15 * 60;  // 15min: Telemetry-Signal gilt als frisch

// Schlaf-Monitor: eigener, vom vehicle_data-Loop entkoppelter Takt.
// Bewusst NICHT an POLL_INTERVAL_* gekoppelt — der Loop oben darf nicht
// haeufiger ticken, sonst reisst der vehicle_data-Cap (DAILY_CAP).
// Unbrauchbare Werte fallen auf den Default zurueck: ein NaN wuerde bis in
// setTimeout durchschlagen und den Takt auf „sofort" setzen — also eine
// Dauerschleife gegen die Tesla-API.
const SLEEP_POLL_MINUTES_RAW = parseInt(process.env.TESLA_SLEEP_POLL_MINUTES ?? '', 10);
const SLEEP_POLL_INTERVAL_MS = (
  Number.isFinite(SLEEP_POLL_MINUTES_RAW) ? Math.max(5, SLEEP_POLL_MINUTES_RAW) : 15
) * 60_000;

// Kosten-Limits (konfigurierbar via .env)
const DAILY_CAP   = parseInt(process.env.TESLA_DAILY_CAP   ?? '30',  10); // max. Calls/Tag/Fahrzeug
const MONTHLY_CAP = parseInt(process.env.TESLA_MONTHLY_CAP ?? '400', 10); // max. Calls/Monat/Fahrzeug

// 404-Breaker: nach N aufeinanderfolgenden 404ern → 6h Pause
const CONSECUTIVE_404_THRESHOLD = 5;
const PAUSE_404_MS = 6 * 60 * 60 * 1000; // 6 Stunden

// Per-Fahrzeug 404-Zaehler (in-memory — resets bei Restart, das ist OK)
const consecutive404 = new Map();

function todayKey()   { return new Date().toISOString().slice(0, 10); }
function thisMonth()  { return new Date().toISOString().slice(0, 7);  }

// ---------------------------------------------------------------------------
// DB-persistenter Tages-/Monats-Cap
// Nutzt die tesla_api_usage-Tabelle (die ohnehin jeden Call trackt) als
// Quelle der Wahrheit — ueberlebt Container-Neustarts sicher.
// ---------------------------------------------------------------------------

/** Gibt die Anzahl vehicle_data-Calls fuer heute (UTC-Datum) zurueck. */
function getTodayCallCount(db) {
  const row = db.prepare(
    `SELECT COALESCE(SUM(count), 0) AS n
     FROM tesla_api_usage
     WHERE period = ?
       AND endpoint LIKE '%/vehicle_data'`
  ).get(todayKey());
  return row?.n ?? 0;
}

/** Gibt die Anzahl vehicle_data-Calls fuer den aktuellen Monat zurueck. */
function getMonthCallCount(db) {
  const row = db.prepare(
    `SELECT COALESCE(SUM(count), 0) AS n
     FROM tesla_api_usage
     WHERE period = ?
       AND endpoint LIKE '%/vehicle_data'`
  ).get(thisMonth());
  return row?.n ?? 0;
}

/**
 * Gibt true zurueck wenn der Tages- oder Monats-Cap erreicht ist.
 * Loggt einmalig wenn ein Limit getroffen wird.
 */
function isOverBudget(db, vehicleName) {
  // Monats-Cap hat Vorrang
  const monthCount = getMonthCallCount(db);
  if (monthCount >= MONTHLY_CAP) {
    // Nur einmal pro Stunde loggen, nicht bei jedem Poll-Tick
    const key = 'monthly_' + thisMonth();
    if (!consecutive404.has(key)) {
      consecutive404.set(key, true);
      console.warn(
        `[Poller] ${vehicleName}: Monats-Cap (${MONTHLY_CAP} Calls) erreicht.` +
        ` Kosten bisher: ~$${(monthCount * 0.005).toFixed(2)}` +
        ` — Polling bis naechsten Monat gestoppt.` +
        ` Limit via TESLA_MONTHLY_CAP anpassbar.`
      );
    }
    return true;
  }

  // Tages-Cap
  const dayCount = getTodayCallCount(db);
  if (dayCount >= DAILY_CAP) {
    const key = 'daily_' + todayKey();
    if (!consecutive404.has(key)) {
      consecutive404.set(key, true);
      console.warn(
        `[Poller] ${vehicleName}: Tages-Cap (${DAILY_CAP} Calls) erreicht` +
        ` (heute: ${dayCount}/${DAILY_CAP})` +
        ` — Pause bis Tagesende. Limit via TESLA_DAILY_CAP anpassbar.`
      );
    }
    return true;
  }
  return false;
}

/** 404-Zaehler hochsetzen; gibt true zurueck wenn Breaker oeffnet. */
function record404(tenantId, tenantLabel) {
  const now = Date.now();
  let s = consecutive404.get(tenantId) ?? { count: 0, pausedUntilMs: 0 };

  // Pause noch aktiv?
  if (s.pausedUntilMs > now) return true;

  s.count++;
  if (s.count >= CONSECUTIVE_404_THRESHOLD) {
    s.pausedUntilMs = now + PAUSE_404_MS;
    s.count = 0;
    console.warn(
      `[Poller] 404-Breaker OPEN fuer "${tenantLabel}" —` +
      ` ${CONSECUTIVE_404_THRESHOLD} aufeinanderfolgende 404er.` +
      ` Pause 6h bis ${new Date(s.pausedUntilMs).toISOString()}.` +
      ` Moegliche Ursachen: Tesla-Konto ohne Fleet-API-Zugang, VIN-Wechsel oder API-Aenderung.`
    );
  }
  consecutive404.set(tenantId, s);
  return s.pausedUntilMs > now;
}

function reset404(tenantId) {
  const s = consecutive404.get(tenantId);
  if (s) { s.count = 0; consecutive404.set(tenantId, s); }
}

function is404Paused(tenantId) {
  const s = consecutive404.get(tenantId);
  if (!s) return false;
  if (s.pausedUntilMs > Date.now()) return true;
  if (s.pausedUntilMs) { s.pausedUntilMs = 0; consecutive404.set(tenantId, s); }
  return false;
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

// ---------------------------------------------------------------------------
// Schlaf-Monitor
//
// Ein schlafendes Fahrzeug beantwortet `vehicle_data` nicht (HTTP 408) — der
// Uebergang „wach → schlafend" ist ueber den Haupt-Poll-Loop also gar nicht
// beobachtbar. Der Fahrzeug-LIST-Endpoint liefert `state`
// (online/asleep/offline), ohne das Auto zu wecken, und funktioniert auch fuer
// Fahrzeuge, die wegen aktiver Fleet-Telemetry im Haupt-Loop uebersprungen
// werden.
//
// Kosten: ein Listen-Call pro Mandant und Takt — unabhaengig von der Anzahl
// Fahrzeuge und ohne Anrechnung auf den vehicle_data-Cap (der zaehlt nur
// `%/vehicle_data`). Takt via TESLA_SLEEP_POLL_MINUTES einstellbar.
//
// Tesla berechnet vier Kategorien: Streaming Data, Vehicle Commands, Vehicle
// Data und Wake Up. Der Listen-Endpoint faellt in keine davon — er liest nur
// kontoseitige Metadaten und stellt keine Verbindung zum Auto her. Er wird
// trotzdem regulaer in `tesla_api_usage` mitgezaehlt und ist damit in der
// Nutzungsstatistik sichtbar. (Stand 2026-07; falls Tesla das aendert, ist
// TESLA_SLEEP_POLL_MINUTES der Hebel.)
// ---------------------------------------------------------------------------

/** Holt die Fahrzeugliste eines Mandanten und schreibt Schlaf-Uebergaenge fort. */
async function pollTenantSleepStates(tenant) {
  const db   = getDb(tenant.id);
  const rows = db.prepare('SELECT id, tesla_id FROM vehicles').all();
  if (!rows.length) return; // Erstimport laeuft im Haupt-Loop

  const data = await getVehicles(db);
  const byTeslaId = new Map(
    (data?.response || []).map(v => [String(v.id), v.state]),
  );

  for (const vehicle of rows) {
    const remoteState = byTeslaId.get(String(vehicle.tesla_id));
    // Fehlt das Fahrzeug in der Antwort, ist der Status unbekannt — dann
    // lieber nichts schreiben als einen Schlaf-Event erfinden.
    if (remoteState) trackSleepEvents(db, vehicle.id, remoteState);
  }
}

async function pollSleep() {
  try {
    for (const tenant of getAllTenants()) {
      if (tenant.status === 'suspended') continue;
      if (tenant.is_demo) continue;
      if (isCircuitOpen(tenant.id)) continue;
      if (is404Paused(tenant.id)) continue;

      try {
        await pollTenantSleepStates(tenant);
      } catch (err) {
        // Nur loggen: die Breaker-Signale liefert der Haupt-Loop, ein
        // zweiter Fehlerpfad wuerde dessen Zaehler verfaelschen.
        console.error(`[SleepMonitor] Mandant ${tenant.slug}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[SleepMonitor] Allgemeiner Fehler:', err.message);
  }

  setTimeout(pollSleep, SLEEP_POLL_INTERVAL_MS);
}

export async function startSleepMonitor() {
  console.log(
    `[SleepMonitor] Starte Schlaf-Erkennung (Fahrzeug-Liste)` +
    ` | Takt: ${SLEEP_POLL_INTERVAL_MS / 60000}min`
  );
  pollSleep();
}

export async function startPoller() {
  console.log(
    `[Poller] Starte Tesla Hybrid-Service (Telemetry-first, Polling als Fallback)...` +
    ` | Tages-Cap: ${DAILY_CAP} | Monats-Cap: ${MONTHLY_CAP}` +
    ` | Parked-Interval: ${POLL_INTERVAL_PARKED / 60000}min` +
    ` | Idle-Interval: ${POLL_INTERVAL_IDLE / 60000}min`
  );
  poll();
}

async function poll() {
  let anyDriving = false;
  let anyParked  = false;
  const nowS = Math.floor(Date.now() / 1000);

  try {
    const tenants = getAllTenants();
    for (const tenant of tenants) {
      if (tenant.status === 'suspended') continue;
      if (tenant.is_demo) continue;
      if (isCircuitOpen(tenant.id)) continue;
      if (is404Paused(tenant.id)) continue;

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
            if (err.response?.status === 403)  { record403(tenant.id, tenant.slug); continue; }
            if (err.response?.status === 404)  { record404(tenant.id, tenant.slug); continue; }
            if (err.message && err.response?.status !== 401) recordOtherFailure(tenant.id);
          }
        }

        const vehicles = db.prepare('SELECT * FROM vehicles').all();
        let tenantBlocked = false;

        for (const vehicle of vehicles) {
          if (tenantBlocked) break;

          // Telemetry-Heartbeat-Logik
          const covered  = isCoveredByTelemetry(vehicle, nowS);
          const lastPoll = vehicle.state_updated_at ?? 0;
          if (covered && (nowS - lastPoll) < POLL_INTERVAL_HEARTBEAT / 1000) continue;

          // Kosten-Cap pruefen (DB-persistent, ueberlebt Neustarts)
          if (isOverBudget(db, vehicle.display_name)) continue;

          try {
            const data  = await getVehicleData(db, vehicle.tesla_id);
            const state = data?.response;
            if (!state) continue;

            reset404(tenant.id); // Erfolg → 404-Zaehler zuruecksetzen

            if (!covered) {
              if (isDriving(state))              anyDriving = true;
              else if (state.state === 'online') anyParked  = true;
            }

            await syncVehicleState(db, vehicle, state, tenant.id);
            recordSuccess(tenant.id, tenant.slug);
          } catch (err) {
            if (err.response?.status === 403) {
              record403(tenant.id, tenant.slug);
              tenantBlocked = true;
              break;
            }
            if (err.response?.status === 404) {
              const paused = record404(tenant.id, tenant.slug);
              if (paused) { tenantBlocked = true; break; }
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

  // Naechster Lauf: schnellster aktiver Modus gewinnt
  const next = anyDriving ? POLL_INTERVAL_DRIVING
             : anyParked  ? POLL_INTERVAL_PARKED
             :              POLL_INTERVAL_IDLE;
  setTimeout(poll, next);
}

/**
 * Beim Backend-Restart bricht die persistente FleetTelemetry-WebSocket
 * vom Tesla ab. Der Tesla baut sie erst neu auf, wenn ein State-Event
 * passiert (Fahrt, Ladung, Wake). Bis dahin ist `telemetry_last_signal_at`
 * der DB-Wert von VOR dem Restart — der Poller würde fälschlich denken,
 * Telemetry sei aktiv (`isCoveredByTelemetry`) und Polling skippen.
 * Reset auf NULL erzwingt den Polling-Fallback ab dem ersten Tick.
 */
export function resetTelemetryHeartbeat() {
  let resetCount = 0;
  for (const tenant of getAllTenants()) {
    if (tenant.is_demo) continue;
    try {
      const db = getDb(tenant.id);
      const res = db.prepare(
        'UPDATE vehicles SET telemetry_last_signal_at = NULL WHERE telemetry_last_signal_at IS NOT NULL'
      ).run();
      resetCount += res.changes;
    } catch (err) {
      console.error(`[Poller] resetTelemetryHeartbeat ${tenant.slug}:`, err.message);
    }
  }
  if (resetCount) {
    console.log(
      `[Poller] Telemetry-Heartbeat zurueckgesetzt fuer ${resetCount} Fahrzeug(e) — ` +
      `Polling uebernimmt bis FleetTelemetry-Stream re-established.`
    );
  }
}

/**
 * Einmaliger Force-Poll fuer ein einzelnes Fahrzeug — nutzt der Refresh-Button
 * im Frontend, um nach dem Restart oder bei OFFLINE-Anzeige sofort frische
 * Daten zu holen. Respektiert den Tages-/Monats-Cap.
 * Returns: { ok, state?, error?, cap: { day, dayMax, month, monthMax } }
 */
export async function forcePollVehicle(db, vehicle, tenantId) {
  const cap = {
    day:      getTodayCallCount(db),
    dayMax:   DAILY_CAP,
    month:    getMonthCallCount(db),
    monthMax: MONTHLY_CAP,
  };

  if (isOverBudget(db, vehicle.display_name)) {
    return { ok: false, error: 'cap_reached', cap };
  }

  try {
    const data  = await getVehicleData(db, vehicle.tesla_id);
    const state = data?.response;
    if (!state) return { ok: false, error: 'no_state', cap };

    reset404(tenantId);
    await syncVehicleState(db, vehicle, state, tenantId);
    recordSuccess(tenantId);

    // Cap nach dem Call neu lesen — der Counter wurde gerade um 1 erhoeht
    const newCap = {
      day:      getTodayCallCount(db),
      dayMax:   DAILY_CAP,
      month:    getMonthCallCount(db),
      monthMax: MONTHLY_CAP,
    };
    return { ok: true, state: state.state ?? 'unknown', cap: newCap };
  } catch (err) {
    if (err.response?.status === 403) record403(tenantId);
    else if (err.response?.status === 404) record404(tenantId);
    else recordOtherFailure(tenantId);
    return {
      ok: false,
      error: err.message,
      status: err.response?.status,
      cap,
    };
  }
}

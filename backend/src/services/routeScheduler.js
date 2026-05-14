/**
 * Routenplan-Scheduler: sendet geplante Routen 15 min vor Abfahrt an Tesla.
 * Läuft alle 60 Sekunden. Geht alle Tenants durch und prüft saved_routes
 * mit auto_send=1, scheduled_date=heute und departure_time innerhalb des
 * nächsten 15-Minuten-Fensters.
 */

import { getAllTenants, getDb } from '../db/database.js';
import { apiProxyPost } from './teslaApi.js';

const ADVANCE_MIN = 15;   // Vorlaufzeit in Minuten
const CHECK_MS    = 60_000;

function padded(n) { return String(n).padStart(2, '0'); }

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${padded(d.getMonth()+1)}-${padded(d.getDate())}`;
}

/** Prüft ob departure_time (HH:MM) in [now+1min, now+15min] liegt */
function isDepartureSoon(departureTimeStr) {
  if (!departureTimeStr) return false;
  const [hh, mm] = departureTimeStr.split(':').map(Number);
  const now    = new Date();
  const depMs  = new Date(now);
  depMs.setHours(hh, mm, 0, 0);
  const diffMin = (depMs - now) / 60_000;
  return diffMin > 0 && diffMin <= ADVANCE_MIN;
}

async function sendRouteToTesla(db, route, vehicle) {
  if (!vehicle?.vin) return;
  try {
    await apiProxyPost(db, `/api/1/vehicles/${vehicle.vin}/command/navigation_request`, {
      type:         'share_ext_content_raw',
      locale:       'de-DE',
      timestamp_ms: Date.now(),
      value: { 'android.intent.extra.TEXT': route.destination_name },
    });
    // Markiere Route als gesendet (auto_send=0) um Doppelsenden zu verhindern
    db.prepare('UPDATE saved_routes SET auto_send=0 WHERE id=?').run(route.id);
    console.log(`[RouteScheduler] Route "${route.name}" an Tesla gesendet (Tenant ${route.vehicle_id})`);
  } catch (e) {
    console.warn(`[RouteScheduler] Fehler beim Senden von Route ${route.id}:`, e.message);
  }
}

async function checkRoutes() {
  const today = todayIso();
  for (const tenant of getAllTenants()) {
    try {
      const db = getDb(tenant.id);
      const routes = db.prepare(
        `SELECT sr.*, v.vin, v.tesla_id
         FROM saved_routes sr
         JOIN vehicles v ON v.id = sr.vehicle_id
         WHERE sr.auto_send=1 AND sr.scheduled_date=?`
      ).all(today);

      for (const route of routes) {
        if (isDepartureSoon(route.departure_time)) {
          await sendRouteToTesla(db, route, { vin: route.vin, tesla_id: route.tesla_id });
        }
      }
    } catch { /* Tenant-DB Fehler ignorieren */ }
  }
}

export function startRouteScheduler() {
  // Leicht verzögerter Start damit DB vollständig initialisiert ist
  setTimeout(() => {
    checkRoutes().catch(() => {});
    setInterval(() => checkRoutes().catch(() => {}), CHECK_MS);
    console.log('[RouteScheduler] gestartet – prüft alle 60 s auf geplante Routen');
  }, 30_000);
}

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Location-Aktionen (v3.12.0).
 *
 * Wird beim Trip-Close aufgerufen mit der End-Position. Findet die nächste
 * charging_location innerhalb deren Radius, und wendet konfigurierte
 * Aktionen an. Heute: Charge-Limit setzen via Tesla-Befehl.
 *
 * Fail-soft: wenn die Tesla-API nicht verfügbar ist, schickt der Service
 * eine Push-Notification mit dem Vorschlag, das Limit manuell zu setzen.
 */

import { notify } from './notifyService.js';

// Haversine-Distanz in Metern.
function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
          * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function applyLocationActionsOnArrival(db, tenantId, vehicleId, lat, lon) {
  if (lat == null || lon == null) return;

  const locs = db.prepare(
    `SELECT id, name, lat, lon, radius_m, default_charge_limit
     FROM charging_locations
     WHERE vehicle_id=? AND lat IS NOT NULL AND lon IS NOT NULL`
  ).all(vehicleId);

  // Beste Match-Location finden (innerhalb des Radius, geringste Distanz)
  let match = null;
  let bestDist = Infinity;
  for (const l of locs) {
    const d = distanceM(lat, lon, l.lat, l.lon);
    if (d <= (l.radius_m || 200) && d < bestDist) {
      match = l;
      bestDist = d;
    }
  }
  if (!match) return;
  if (match.default_charge_limit == null) return; // kein Limit konfiguriert

  // Vehicle + Tenant info für Notify
  const v = db.prepare('SELECT id, display_name, vin FROM vehicles WHERE id=?').get(vehicleId);
  const users = db.prepare(
    'SELECT user_id FROM vehicle_users WHERE vehicle_id=?'
  ).all(vehicleId);

  // Versuch: Tesla-Befehl absetzen (Fleet-API). Wenn das funktioniert,
  // Push als Bestätigung. Wenn nicht, Push als Vorschlag.
  let applied = false;
  let errMsg = null;
  try {
    const { apiProxyPost } = await import('./teslaApi.js');
    await apiProxyPost(db, v, 'set_charge_limit', { percent: match.default_charge_limit });
    applied = true;
  } catch (e) {
    errMsg = e.message;
  }

  if (!tenantId) return;

  const carLabel = v?.display_name || (v?.vin ? v.vin.slice(-6) : `#${vehicleId}`);
  const title = applied
    ? `Ladelimit gesetzt: ${match.default_charge_limit} %`
    : `Ladelimit-Vorschlag: ${match.default_charge_limit} %`;
  const body = applied
    ? `${carLabel} angekommen an „${match.name}" — Ladelimit auf ${match.default_charge_limit} % gestellt.`
    : `${carLabel} angekommen an „${match.name}" — Limit ${match.default_charge_limit} % manuell setzen (Fleet-API nicht aktiv).`;

  for (const u of users) {
    await notify({
      tenantId,
      userId: u.user_id,
      db,
      title, body,
      url: '/charging',
      emoji: applied ? '🔋' : '💡',
      type: 'generic',
      vehicleId,
    }).catch(() => {});
  }
}

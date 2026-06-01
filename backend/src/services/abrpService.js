import { getTenantSetting } from './configService.js';

/**
 * A Better Route Planner (ABRP) Telemetry Integration.
 *
 * Sends live vehicle data to ABRP so it can optimize routes in real time.
 * Requires:
 *   - ABRP_API_KEY in .env        (app key — request at api.iternio.com)
 *   - abrp_token on the vehicle   (user token from ABRP → Profile → Live Data)
 *
 * Two call paths:
 *   buildTlmFromState(state, ts)  — called by dataSync (Tesla API polling)
 *   buildTlmFromPoint(point, ts)  — called by fleetTelemetry (WebSocket streaming)
 */

const ABRP_ENDPOINT = 'https://api.iternio.com/1/tlm/send';

const MILES_TO_KM = 1.60934;

/** Build ABRP telemetry object from a Tesla Fleet-API vehicle_data state. */
export function buildTlmFromState(state, ts) {
  const drive   = state?.drive_state   ?? {};
  const charge  = state?.charge_state  ?? {};
  const climate = state?.climate_state ?? {};
  const vs      = state?.vehicle_state ?? {};

  const isCharging = ['Charging', 'Complete'].includes(charge.charging_state);
  const tlm = {
    utc:        ts ?? Math.floor(Date.now() / 1000),
    is_charging: isCharging,
    is_dcfc:    charge.fast_charger_present ?? false,
  };

  if (charge.battery_level    != null) tlm.soc      = charge.battery_level;
  if (drive.speed             != null) tlm.speed     = Math.round(drive.speed * MILES_TO_KM);
  if (drive.latitude          != null) tlm.lat       = drive.latitude;
  if (drive.longitude         != null) tlm.lon       = drive.longitude;
  if (drive.heading           != null) tlm.heading   = drive.heading;
  if (drive.power             != null) tlm.power     = drive.power;   // already kW
  if (climate.outside_temp    != null) tlm.ext_temp  = climate.outside_temp;
  if (vs.odometer             != null) tlm.odometer  = Math.round(vs.odometer * MILES_TO_KM);

  return tlm;
}

/** Build ABRP telemetry object from a Fleet-Telemetry streaming point. */
export function buildTlmFromPoint(point, ts) {
  const tlm = {
    utc:        Math.round(ts),
    is_charging: !point.speed_kmh && point.gear == null,
    is_dcfc:    false,
  };

  if (point.soc         != null) tlm.soc      = Math.round(point.soc);
  if (point.speed_kmh   != null) tlm.speed    = Math.round(point.speed_kmh);
  if (point.lat         != null) tlm.lat      = point.lat;
  if (point.lon         != null) tlm.lon      = point.lon;
  if (point.odometer_km != null) tlm.odometer = Math.round(point.odometer_km);
  if (point.voltage && point.current) {
    tlm.power = parseFloat(((point.voltage * point.current) / 1000).toFixed(2));
  }

  return tlm;
}

/**
 * Send a telemetry object to ABRP.
 * Silently skips when ABRP_API_KEY or vehicle.abrp_token is missing.
 */
export async function sendToAbrp(db, vehicle, tlm) {
  const apiKey    = getTenantSetting(db, 'abrp.api_key', 'ABRP_API_KEY');
  const userToken = vehicle?.abrp_token;
  if (!apiKey || !userToken) return;

  const url = `${ABRP_ENDPOINT}?api_key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(userToken)}&tlm=${encodeURIComponent(JSON.stringify(tlm))}`;

  try {
    const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (!resp.ok) {
      console.warn(`[ABRP] HTTP ${resp.status} für ${vehicle.display_name || vehicle.vin}`);
    }
  } catch (err) {
    // Netzwerkfehler nie nach oben werfen — ABRP-Ausfall darf App nicht blockieren
    console.warn(`[ABRP] Netzwerkfehler: ${err.message}`);
  }
}

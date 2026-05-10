import { WebSocketServer } from 'ws';
import protobuf from 'protobufjs';
import { getDb, getTenantByVin } from '../db/database.js';
import { recordCall } from './teslaUsage.js';

const PROTO = `
syntax = "proto3";
package telemetry.vehicle_data;

message LocationValue {
  double latitude = 1;
  double longitude = 2;
}

enum ShiftState {
  ShiftStateUnknown = 0;
  ShiftStateInvalid = 1;
  ShiftStateP = 2;
  ShiftStateR = 3;
  ShiftStateN = 4;
  ShiftStateD = 5;
  ShiftStateSNA = 6;
}

message Value {
  oneof value {
    string  string_value   = 1;
    int32   int_value      = 2;
    int64   long_value     = 3;
    float   float_value    = 4;
    double  double_value   = 5;
    bool    boolean_value  = 6;
    LocationValue location_value = 7;
    int32   charging_value = 8;
    ShiftState shift_state_value = 9;
    bool    invalid        = 10;
  }
}

message Datum {
  int32 key   = 1;
  Value value = 2;
}

message Payload {
  repeated Datum data       = 1;
  int64          created_at = 2;
  string         vin        = 3;
  bool           is_resend  = 4;
  string         txid       = 5;
}
`;

const FIELD = {
  VehicleSpeed: 4,
  Odometer:     5,
  PackVoltage:  6,
  PackCurrent:  7,
  Gear:         10,
  Soc:          12,
  Location:     21,
};

const GEAR_MAP = { 0: null, 1: null, 2: 'P', 3: 'R', 4: 'N', 5: 'D', 6: null };

let PayloadType = null;

async function loadProto() {
  if (PayloadType) return PayloadType;
  const root = await protobuf.parse(PROTO, { keepCase: true }).root;
  PayloadType = root.lookupType('telemetry.vehicle_data.Payload');
  return PayloadType;
}

export async function startFleetTelemetryServer(server) {
  let Payload;
  try {
    Payload = await loadProto();
  } catch (err) {
    console.error('[FleetTelemetry] Protobuf-Fehler:', err.message);
    return;
  }

  const wss = new WebSocketServer({ server, path: '/fleet_telemetry' });
  console.log('[FleetTelemetry] WebSocket-Server gestartet auf /fleet_telemetry');

  wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[FleetTelemetry] Verbindung: ${ip}`);

    ws.on('message', async (raw) => {
      try {
        const payload = Payload.decode(raw);
        const vin = payload.vin;
        const ts  = payload.created_at
          ? Number(payload.created_at) / 1000
          : Math.floor(Date.now() / 1000);

        const point = extractPoint(payload.data);
        if (point && vin) storePoint(vin, ts, point);

        // Streaming-Signale zählen (1 Datum = 1 abrechenbarer Wert).
        if (vin && payload.data?.length) {
          const tenant = getTenantByVin(vin);
          if (tenant) {
            try {
              recordCall(getDb(tenant.id), 'streaming_signal', 'fleet_telemetry', payload.data.length);
            } catch { /* Counter-Fehler dürfen den Stream nicht abreißen */ }
          }
        }

        if (payload.txid) ws.send(JSON.stringify({ txid: payload.txid, status: 200 }));
      } catch (err) {
        console.error('[FleetTelemetry] Parse-Fehler:', err.message);
      }
    });

    ws.on('error', (err) => console.error('[FleetTelemetry] WS-Fehler:', err.message));
    ws.on('close', () => console.log(`[FleetTelemetry] Verbindung getrennt: ${ip}`));
  });
}

function extractPoint(data) {
  if (!data?.length) return null;
  const point = {};
  for (const datum of data) {
    const v = datum.value;
    switch (datum.key) {
      case FIELD.Location:
        if (v?.location_value) { point.lat = v.location_value.latitude; point.lon = v.location_value.longitude; }
        break;
      case FIELD.VehicleSpeed: point.speed_kmh   = v?.float_value ?? v?.double_value ?? null; break;
      case FIELD.Gear:         point.gear         = GEAR_MAP[v?.shift_state_value] ?? null;   break;
      case FIELD.PackVoltage:  point.voltage      = v?.float_value ?? v?.double_value ?? null; break;
      case FIELD.PackCurrent:  point.current      = v?.float_value ?? v?.double_value ?? null; break;
      case FIELD.Soc:          point.soc          = v?.float_value ?? v?.double_value ?? null; break;
      case FIELD.Odometer:
        point.odometer_km = v?.float_value != null ? v.float_value * 1.60934 : null; break;
    }
  }
  return Object.keys(point).length > 0 ? point : null;
}

function storePoint(vin, ts, point) {
  const tenant = getTenantByVin(vin);
  if (!tenant) return;

  const db      = getDb(tenant.id);
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE vin=?').get(vin);
  if (!vehicle) return;

  const activeTrip = db.prepare(
    'SELECT id FROM trips WHERE vehicle_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1'
  ).get(vehicle.id);

  let tripId = activeTrip?.id ?? null;

  if (point.gear && point.gear !== 'P' && !activeTrip) {
    const soc           = point.soc ? Math.round(point.soc) : null;
    const defaultDriver = db.prepare('SELECT id FROM drivers WHERE is_default=1 LIMIT 1').get();
    const result = db.prepare(
      `INSERT INTO trips (vehicle_id, start_time, start_lat, start_lon, start_soc, start_odometer_km, source, driver_id)
       VALUES (?, ?, ?, ?, ?, ?, 'telemetry', ?)`
    ).run(vehicle.id, ts, point.lat ?? null, point.lon ?? null, soc, point.odometer_km ?? null, defaultDriver?.id ?? null);
    tripId = result.lastInsertRowid;
    console.log(`[FleetTelemetry] Fahrt gestartet: ${vin}`);
  }

  if (activeTrip && (point.gear === 'P' || point.gear === null)) {
    const soc = point.soc ? Math.round(point.soc) : null;
    db.prepare(
      `UPDATE trips SET end_time=?, end_lat=?, end_lon=?, end_soc=?, end_odometer_km=? WHERE id=?`
    ).run(ts, point.lat ?? null, point.lon ?? null, soc, point.odometer_km ?? null, activeTrip.id);

    const pts = db.prepare(
      'SELECT lat, lon FROM telemetry_points WHERE trip_id=? AND lat IS NOT NULL ORDER BY timestamp'
    ).all(activeTrip.id);
    if (pts.length > 1) {
      let dist = 0;
      for (let i = 1; i < pts.length; i++) dist += haversine(pts[i-1].lat, pts[i-1].lon, pts[i].lat, pts[i].lon);
      db.prepare('UPDATE trips SET distance_km=? WHERE id=?').run(dist, activeTrip.id);
    }
    console.log(`[FleetTelemetry] Fahrt beendet: ${vin}`);
    tripId = null;
  }

  const powerKw = point.voltage && point.current ? (point.voltage * point.current) / 1000 : null;

  db.prepare(
    `INSERT INTO telemetry_points
     (vehicle_id, trip_id, timestamp, lat, lon, speed_kmh, gear, power_kw, soc, odometer_km)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    vehicle.id, tripId, ts,
    point.lat ?? null, point.lon ?? null,
    point.speed_kmh ?? null, point.gear ?? null, powerKw,
    point.soc ? Math.round(point.soc) : null, point.odometer_km ?? null,
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

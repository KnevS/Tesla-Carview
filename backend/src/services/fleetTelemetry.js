// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { WebSocketServer } from 'ws';
import protobuf from 'protobufjs';
import { getDb, getTenantByVin } from '../db/database.js';
import { recordCall } from './teslaUsage.js';
import { buildTlmFromPoint, sendToAbrp } from './abrpService.js';

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

// Innerer Protobuf-Payload aus dem FlatBuffers-Envelope: nur die Messwerte.
// VIN + created_at kommen aus dem Envelope (FlatbuffersStream), deshalb hier
// bewusst nur das data-Feld. Unbekannte Felder ueberspringt protobufjs.
message Payload {
  repeated Datum data = 1;
}
`;

const FIELD = {
  VehicleSpeed: 4,
  Odometer:     5,
  PackVoltage:  6,
  PackCurrent:  7,
  Soc:          8,   // Tesla-Field-Enum: Soc = 8 (früher fälschlich 12)
  Gear:         10,
  Location:     21,
};

const GEAR_MAP = { 0: null, 1: null, 2: 'P', 3: 'R', 4: 'N', 5: 'D', 6: null };

// ── Minimaler FlatBuffers-Leser (Little-Endian) ──────────────────────────────
// Tesla-Fahrzeuge senden die Telemetrie als FlatBuffers-Envelope; die
// eigentlichen Messwerte stecken als Protobuf darin. Wir brauchen nur wenige
// Felder, daher dieser schlanke Reader statt einer zusätzlichen Dependency.
// Envelope-Slots:  Txid(4) Topic(6) MessageType(8) Message(10) MessageId(12)
// FlatbuffersStream: CreatedAt(4,uint32) SenderId(6) Payload(8,[ubyte])
//                    DeviceType(10) DeviceId(12)=VIN
function fbFieldOffset(buf, tablePos, vtableSlot) {
  const vtablePos  = tablePos - buf.readInt32LE(tablePos);
  const vtableSize = buf.readUInt16LE(vtablePos);
  if (vtableSlot >= vtableSize) return 0;
  return buf.readUInt16LE(vtablePos + vtableSlot);   // 0 = Feld nicht gesetzt
}
function fbSubTable(buf, tablePos, vtableSlot) {
  const o = fbFieldOffset(buf, tablePos, vtableSlot);
  if (!o) return 0;
  const p = tablePos + o;
  return p + buf.readUInt32LE(p);                     // uoffset zur Sub-Tabelle
}
function fbByteVector(buf, tablePos, vtableSlot) {
  const o = fbFieldOffset(buf, tablePos, vtableSlot);
  if (!o) return null;
  const p       = tablePos + o;
  const dataPos = p + buf.readUInt32LE(p);            // uoffset zum Vektor-Header
  const len     = buf.readUInt32LE(dataPos);
  return buf.subarray(dataPos + 4, dataPos + 4 + len);
}
function fbUint32(buf, tablePos, vtableSlot) {
  const o = fbFieldOffset(buf, tablePos, vtableSlot);
  return o ? buf.readUInt32LE(tablePos + o) : 0;
}

// Entpackt den FlatBuffers-Envelope → { payload (Protobuf-Bytes), vin, createdAt }.
// Liefert null für Nicht-Telemetrie (Acks/Steuernachrichten ohne Payload).
function decodeEnvelope(buf) {
  if (buf.length < 12) return null;
  const envPos    = buf.readUInt32LE(0);               // Root-Tabelle
  const streamPos = fbSubTable(buf, envPos, 10);        // Message → FlatbuffersStream
  if (!streamPos) return null;
  const payload = fbByteVector(buf, streamPos, 8);
  if (!payload || !payload.length) return null;
  const vinBytes = fbByteVector(buf, streamPos, 12);
  return {
    payload,
    vin:       vinBytes ? Buffer.from(vinBytes).toString('utf8') : null,
    createdAt: fbUint32(buf, streamPos, 4) || null,
  };
}

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
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

        // Tesla verpackt die Telemetrie in einen FlatBuffers-Envelope; die
        // Messwerte liegen als Protobuf-`Payload` im FlatbuffersStream.
        const env = decodeEnvelope(buf);
        if (!env) return;                          // Ack/Steuernachricht → ignorieren

        const decoded = Payload.decode(env.payload);
        if (!decoded.data?.length) return;

        const vin = env.vin;
        const ts  = env.createdAt || Math.floor(Date.now() / 1000);

        const point = extractPoint(decoded.data);
        if (point && vin) storePoint(vin, ts, point);

        // Streaming-Signale zählen (1 Datum = 1 abrechenbarer Wert).
        // Plus: pro VIN den Zeitpunkt des letzten Signals merken — das
        // Settings-UI rendert daraus den live/idle-Status-Indikator.
        if (vin) {
          const tenant = getTenantByVin(vin);
          if (tenant) {
            try {
              const tdb = getDb(tenant.id);
              recordCall(tdb, 'streaming_signal', 'fleet_telemetry', decoded.data.length);
              tdb.prepare(
                'UPDATE vehicles SET telemetry_last_signal_at = ? WHERE vin = ?'
              ).run(Math.floor(Date.now() / 1000), vin);
            } catch { /* Counter-Fehler dürfen den Stream nicht abreißen */ }
          }
        }
      } catch (err) {
        console.error('[FleetTelemetry] Decode-Fehler:', err.message);
      }
    });

    ws.on('error', (err) => console.error('[FleetTelemetry] WS-Fehler:', err.message));
    ws.on('close', () => console.log(`[FleetTelemetry] Verbindung getrennt: ${ip}`));
  });
}

// Tesla streamt Zahlenwerte NICHT einheitlich als float — SoC/PackVoltage/
// PackCurrent kommen oft als int_value oder string_value ("82.3"). Der bisherige
// Reader las nur float/double, daher wurden SoC & Leistung NIE gespeichert
// (0 von 15k Punkten). numVal liest alle Zahlen-Value-Typen robust.
function numVal(v) {
  if (v == null) return null;
  if (v.double_value != null) return v.double_value;
  if (v.float_value  != null) return v.float_value;
  if (v.int_value    != null) return v.int_value;
  if (v.long_value   != null) return Number(v.long_value);
  if (v.string_value != null) {
    const n = parseFloat(v.string_value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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
      // Tesla streamt VehicleSpeed in mph → auf km/h umrechnen (konsistent mit
      // Odometer unten, dem Live-Endpoint telemetry.js und dataSync.milesToKm).
      case FIELD.VehicleSpeed: { const s = numVal(v); point.speed_kmh = s != null ? s * 1.60934 : null; break; }
      case FIELD.Gear:         point.gear      = GEAR_MAP[v?.shift_state_value] ?? null; break;
      case FIELD.PackVoltage:  point.voltage   = numVal(v); break;
      case FIELD.PackCurrent:  point.current   = numVal(v); break;
      case FIELD.Soc:          point.soc       = numVal(v); break;
      case FIELD.Odometer: {
        const km = numVal(v);
        point.odometer_km = km != null ? km * 1.60934 : null;
        break;
      }
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

  // ABRP Live-Telemetrie (best-effort)
  if (vehicle.abrp_token) {
    const enrichedPoint = { ...point, voltage: point.voltage, current: point.current };
    sendToAbrp(db, vehicle, buildTlmFromPoint(enrichedPoint, ts)).catch(() => {});
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

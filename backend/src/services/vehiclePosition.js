// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Letzte bekannte Position eines Fahrzeugs.
 *
 * `vehicles` hat KEINE Positionsspalten — die Position steckt in den
 * Trackpunkten (Fleet Telemetry, Polling/OwnTracks) bzw. im Fahrtziel.
 * Reihenfolge: juengster Telemetrie-Punkt, juengster Polling-/OwnTracks-
 * Punkt, Ziel der letzten Fahrt.
 *
 * @returns {{lat:number, lon:number}|null}
 */
export function lastKnownPosition(db, vehicleId) {
  const tlm = db.prepare(
    'SELECT lat, lon, timestamp AS ts FROM telemetry_points WHERE vehicle_id=? AND lat IS NOT NULL ORDER BY timestamp DESC LIMIT 1'
  ).get(vehicleId);
  const pts = db.prepare(
    `SELECT tp.lat, tp.lon, tp.timestamp AS ts FROM trip_points tp
     JOIN trips t ON t.id = tp.trip_id
     WHERE t.vehicle_id=? AND tp.lat IS NOT NULL ORDER BY tp.timestamp DESC LIMIT 1`
  ).get(vehicleId);
  const best = [tlm, pts].filter(Boolean).sort((a, b) => b.ts - a.ts)[0];
  if (best) return { lat: best.lat, lon: best.lon };
  const trip = db.prepare(
    'SELECT end_lat AS lat, end_lon AS lon FROM trips WHERE vehicle_id=? AND end_lat IS NOT NULL ORDER BY start_time DESC LIMIT 1'
  ).get(vehicleId);
  return trip ? { lat: trip.lat, lon: trip.lon } : null;
}

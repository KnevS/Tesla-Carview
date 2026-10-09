// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Aussentemperatur fuer Fahrten nachtragen, die keine haben.
 *
 * Nur der Polling-Pfad (dataSync) schreibt `outside_temp_avg_c` — Fleet
 * Telemetry streamt keine Aussentemperatur, OwnTracks ohnehin nicht. Ohne
 * Nachtrag fehlt damit gerade bei Telemetrie-Nutzern die Grundlage fuer
 * jede Auswertung „Verbrauch nach Temperatur".
 *
 * Quelle ist Open-Meteo (kostenlos, ohne API-Key; auch fuer den
 * Routenplaner schon im Einsatz). Datenschutz: Es verlassen nur auf 0,1°
 * gerundete Koordinaten (Raster von rund 11 km) und das Datum den Server —
 * fuer eine Lufttemperatur reicht das, ein Fahrtziel laesst sich daraus
 * nicht ablesen. Fahrten im selben Rasterfeld teilen sich einen Abruf.
 *
 * Juengere Fahrten (bis ~85 Tage) kommen aus der Forecast-API, aeltere aus
 * dem Archiv (ERA5, einige Tage Verzug).
 */

const CELL_DEG        = 0.1;
const RECENT_DAYS     = 85;     // Forecast-API reicht ~92 Tage zurueck
const ARCHIVE_LAG_D   = 6;      // ERA5-Daten erscheinen mit Verzug
const MATCH_MARGIN_S  = 1800;   // Stundenwerte bis 30 min vor/nach der Fahrt zaehlen
const NEAREST_MAX_S   = 2 * 3600;
const FETCH_TIMEOUT_MS = 10000;
const DAY = 86400;

const roundCell = v => Math.round(v / CELL_DEG) * CELL_DEG;
const isoDate   = t => new Date(t * 1000).toISOString().slice(0, 10);

/**
 * Temperatur einer Fahrt aus Stundenwerten: Mittel aller Stunden im
 * Fahrtfenster (± 30 min), sonst der naechstgelegene Wert bis 2 h Abstand.
 * @param {Array<{t:number, temp:number}>} hourly aufsteigend
 */
export function tripTempFromHourly(hourly, start, end) {
  const inWin = hourly.filter(h => h.temp != null && h.t >= start - MATCH_MARGIN_S && h.t <= end + MATCH_MARGIN_S);
  if (inWin.length) return Math.round(inWin.reduce((s, h) => s + h.temp, 0) / inWin.length * 10) / 10;
  const mid = (start + end) / 2;
  let best = null;
  for (const h of hourly) {
    if (h.temp == null) continue;
    if (!best || Math.abs(h.t - mid) < Math.abs(best.t - mid)) best = h;
  }
  return best && Math.abs(best.t - mid) <= NEAREST_MAX_S ? best.temp : null;
}

function buildUrl(lat, lon, from, to, archive) {
  const host = archive ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
  return `${host}?latitude=${lat.toFixed(1)}&longitude=${lon.toFixed(1)}`
    + `&hourly=temperature_2m&start_date=${from}&end_date=${to}&timezone=GMT&timeformat=unixtime`;
}

async function fetchHourly(url, fetchImpl) {
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
  const j = await r.json();
  const t = j?.hourly?.time ?? [];
  const v = j?.hourly?.temperature_2m ?? [];
  return t.map((ts, i) => ({ t: ts, temp: v[i] ?? null }));
}

/**
 * @param {object} db Mandanten-DB
 * @param {object} [opts]
 * @param {number} [opts.maxCalls=20]  Obergrenze an Open-Meteo-Abrufen pro Lauf
 * @param {Function} [opts.fetchImpl]  fuer Tests
 * @param {number} [opts.now]          Unix-Zeit, fuer Tests
 */
export async function backfillTripTemperatures(db, { maxCalls = 20, fetchImpl = fetch, now = Math.floor(Date.now() / 1000) } = {}) {
  const trips = db.prepare(`
    SELECT id, start_time, end_time,
           COALESCE(start_lat, end_lat) AS lat, COALESCE(start_lon, end_lon) AS lon
    FROM trips
    WHERE outside_temp_avg_c IS NULL AND outside_temp_source IS NULL
      AND end_time IS NOT NULL AND end_time < ?
      AND COALESCE(start_lat, end_lat) IS NOT NULL
    ORDER BY start_time DESC
    LIMIT 3000
  `).all(now - 3600);
  if (!trips.length) return { candidates: 0, calls: 0, updated: 0, unavailable: 0 };

  // Gruppieren nach Rasterfeld und Abrufart (Forecast vs. Archiv).
  const recentFrom = now - RECENT_DAYS * DAY;
  const archiveTo  = now - ARCHIVE_LAG_D * DAY;
  const groups = new Map();
  for (const t of trips) {
    const archive = t.start_time < recentFrom;
    if (archive && t.end_time > archiveTo) continue; // faellt in die ERA5-Luecke, spaeter erneut
    const lat = roundCell(t.lat), lon = roundCell(t.lon);
    const key = `${lat.toFixed(1)}|${lon.toFixed(1)}|${archive ? 'a' : 'f'}`;
    if (!groups.has(key)) groups.set(key, { lat, lon, archive, trips: [] });
    groups.get(key).trips.push(t);
  }

  const setTemp = db.prepare(
    "UPDATE trips SET outside_temp_avg_c=?, outside_temp_source='weather' WHERE id=? AND outside_temp_avg_c IS NULL"
  );
  const setNone = db.prepare("UPDATE trips SET outside_temp_source='none' WHERE id=? AND outside_temp_avg_c IS NULL");

  let calls = 0, updated = 0, unavailable = 0;
  // Groesste Gruppen zuerst: ein Abruf deckt dort die meisten Fahrten.
  for (const g of [...groups.values()].sort((a, b) => b.trips.length - a.trips.length)) {
    if (calls >= maxCalls) break;
    const from = isoDate(Math.min(...g.trips.map(t => t.start_time)) - DAY);
    const to   = isoDate(Math.max(...g.trips.map(t => t.end_time)) + DAY);
    let hourly;
    try {
      calls++;
      hourly = await fetchHourly(buildUrl(g.lat, g.lon, from, g.archive ? to : (to > isoDate(now) ? isoDate(now) : to), g.archive), fetchImpl);
    } catch (err) {
      console.warn('[WeatherBackfill]', err.message);
      continue; // Netzfehler: beim naechsten Lauf erneut
    }
    for (const t of g.trips) {
      const temp = tripTempFromHourly(hourly, t.start_time, t.end_time);
      if (temp != null) { updated += setTemp.run(temp, t.id).changes; }
      else { unavailable += setNone.run(t.id).changes; }
    }
  }
  return { candidates: trips.length, calls, updated, unavailable, cells: groups.size };
}

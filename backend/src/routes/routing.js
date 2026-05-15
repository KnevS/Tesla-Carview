import { Router } from 'express';
import { assertVehicleAccess, guardAccess } from '../middleware/vehicleAccess.js';

const router = Router();

// ── Hilfs-Mathematik ─────────────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Kumulierte Streckendistanzen [km] für jede Koordinate der OSRM-Geometrie */
function cumulativeDistances(geom) {
  const d = [0];
  for (let i = 1; i < geom.length; i++) {
    const [lo0, la0] = geom[i - 1];
    const [lo1, la1] = geom[i];
    d.push(d[i - 1] + haversineKm(la0, lo0, la1, lo1));
  }
  return d;
}

/** Projiziert eine Ladestation auf die Route und gibt Distanz (km ab Start) zurück.
 *  Gibt null zurück, wenn der kürzeste Abstand > corridorKm. */
function projectOnRoute(charLat, charLon, geom, cumDists, corridorKm) {
  let minDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < geom.length; i++) {
    const d = haversineKm(charLat, charLon, geom[i][1], geom[i][0]);
    if (d < minDist) { minDist = d; bestIdx = i; }
  }
  return minDist <= corridorKm ? { routeKm: cumDists[bestIdx], corridorDist: minDist } : null;
}

/** Greedy-Ladeplan: wählt minimale Anzahl Stopps für die Route.
 *  Returns { stops, arrival_soc, feasible } */
function planChargingStops({ chargers, totalKm, initSoc, kwhPerKm, batteryKwh, minArrivalSoc, chargeToSoc }) {
  const BUFFER = 5; // extra %-Puffer über minArrivalSoc
  const stops  = [];

  // chargers bereits nach routeKm sortiert; füge Destination als Sentinel hinzu
  const queue = [...chargers.filter(c => c.routeKm > 0 && c.routeKm < totalKm)];
  queue.push({ isDestination: true, routeKm: totalKm });

  let posKm = 0;
  let soc   = initSoc;

  for (let iter = 0; iter < 20; iter++) { // max 20 Stopps
    // Destination erreichbar?
    const energy2dest = (totalKm - posKm) * kwhPerKm;
    const socAtDest   = soc - (energy2dest / batteryKwh * 100);
    if (socAtDest >= minArrivalSoc) {
      return { stops, arrival_soc: Math.round(socAtDest), feasible: true };
    }

    // Wie weit reicht der Akku mit Sicherheitspuffer?
    const safeEnergy = ((soc - minArrivalSoc - BUFFER) / 100) * batteryKwh;
    const maxReachKm = posKm + Math.max(0, safeEnergy / kwhPerKm);

    // Weitere Ladestationen die erreichbar sind (Greedy: nimm die letzte = weiteste)
    const reachable = queue.filter(c => !c.isDestination && c.routeKm > posKm && c.routeKm <= maxReachKm);

    if (reachable.length === 0) {
      // Notfall: auch weiter entfernte nehmen (bis Akku leer)
      const maxEnergy = (soc / 100) * batteryKwh;
      const hardMax   = posKm + maxEnergy / kwhPerKm;
      const emergency = queue.filter(c => !c.isDestination && c.routeKm > posKm && c.routeKm <= hardMax);
      if (emergency.length === 0) {
        return { stops, arrival_soc: Math.round(socAtDest), feasible: false };
      }
      reachable.push(emergency[emergency.length - 1]);
    }

    const best    = reachable[reachable.length - 1];
    const distKm  = best.routeKm - posKm;
    const energy  = distKm * kwhPerKm;
    const arrSoc  = soc - (energy / batteryKwh * 100);
    const depSoc  = Math.min(chargeToSoc, 95);
    const kwh2add = (depSoc - arrSoc) / 100 * batteryKwh;
    const maxKw   = best.max_kw || 50;
    // Vereinfachte Ladekurve: erste 80 % bei voller Leistung, darüber ~50 %
    const effectiveKw = arrSoc < 80 ? maxKw : maxKw * 0.55;
    const chargeMin   = Math.max(5, Math.round(kwh2add / effectiveKw * 60));

    stops.push({
      name: best.name, lat: best.lat, lon: best.lon,
      max_kw: maxKw, operator: best.operator ?? null,
      arrive_soc: Math.round(arrSoc), depart_soc: depSoc,
      charge_minutes: chargeMin, route_km: best.routeKm,
    });

    posKm = best.routeKm;
    soc   = depSoc;

    // Besuchte Stationen aus Queue entfernen
    const idx = queue.indexOf(best);
    if (idx >= 0) queue.splice(0, idx + 1);
    // Sentinel wieder anhängen
    if (!queue.find(c => c.isDestination)) queue.push({ isDestination: true, routeKm: totalKm });
  }

  return { stops, arrival_soc: null, feasible: false };
}

// ── Valhalla-Routing (Umgehungsoptionen) ─────────────────────────────────────

async function fetchValhalla(coordinates, { avoidMotorways, avoidTolls, avoidFerry } = {}) {
  const costingOpts = {};
  if (avoidMotorways) costingOpts.use_highways = 0;
  if (avoidTolls)     costingOpts.use_tolls    = 0;
  if (avoidFerry)     costingOpts.use_ferry     = 0;

  const body = {
    locations:       coordinates.map(([lon, lat]) => ({ lon, lat })),
    costing:         'auto',
    costing_options: { auto: costingOpts },
    shape_format:    'geojson',
  };

  const r = await fetch('https://valhalla1.openstreetmap.de/route', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'TeslaCarview/2.2' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`Valhalla ${r.status}`);
  const data = await r.json();

  // Legs zu einer Geometrie zusammenfügen
  const allCoords = [];
  for (const leg of (data.trip?.legs ?? [])) {
    allCoords.push(...(leg.shape?.coordinates ?? []));
  }

  return {
    routes: [{
      distance: (data.trip?.summary?.length ?? 0) * 1000,  // km → m
      duration: data.trip?.summary?.time ?? 0,             // Sekunden
      geometry: { type: 'LineString', coordinates: allCoords },
    }],
  };
}

// ── Öffentlicher Tile-Proxy ───────────────────────────────────────────────────
// Wird in index.js VOR requireAuth registriert: app.use('/api/tiles', tileRouter)

export const tileRouter = Router();

tileRouter.get('/:z/:x/:y', async (req, res) => {
  const { z, x, y } = req.params;
  const zn = parseInt(z); const xn = parseInt(x); const yn = parseInt(y);
  if (isNaN(zn) || isNaN(xn) || isNaN(yn) || zn < 0 || zn > 19 || xn < 0 || yn < 0) {
    return res.status(400).end();
  }
  try {
    const sub = ['a', 'b', 'c'][xn % 3];
    const r   = await fetch(`https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: {
        'User-Agent': 'TeslaCarview/2.2 (personal-server)',
        'Referer':    'https://github.com/KnevS/Tesla-Carview',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(r.status).end();
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.status(502).end();
  }
});

// ── Authenticated Routing-Endpunkte ──────────────────────────────────────────

// GET /api/routing/stats?vehicleId=
router.get('/stats', (req, res) => {
  const vehicleId = Number(req.query.vehicleId);
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId erforderlich' });
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

  const battery = req.db.prepare(
    'SELECT soc, rated_range_km FROM battery_history WHERE vehicle_id=? ORDER BY timestamp DESC LIMIT 1'
  ).get(vehicleId);

  const consumption = req.db.prepare(`
    SELECT AVG(energy_used_kwh / distance_km * 100.0) AS avg_kwh_per_100km, COUNT(*) AS trip_count
    FROM (
      SELECT energy_used_kwh, distance_km FROM trips
      WHERE vehicle_id=? AND distance_km > 2 AND energy_used_kwh > 0
        AND start_time > unixepoch() - 90*24*3600
      ORDER BY start_time DESC LIMIT 100
    )
  `).get(vehicleId);

  res.json({
    soc:               battery?.soc            ?? null,
    rated_range_km:    battery?.rated_range_km ?? null,
    avg_kwh_per_100km: consumption?.avg_kwh_per_100km ?? null,
    trip_count:        consumption?.trip_count  ?? 0,
  });
});

// ── OCM-Key: DB hat Vorrang vor .env ─────────────────────────────────────────
function getOcmKey(db) {
  try {
    const row = db?.prepare("SELECT value FROM tenant_settings WHERE key='ocm_api_key'").get();
    if (row?.value) return row.value;
  } catch { /* ignore */ }
  return process.env.OPENCHARGEMAP_API_KEY || null;
}

// GET /api/routing/ocm-config — OCM API-Key Status (maskiert)
router.get('/ocm-config', (req, res) => {
  const key = getOcmKey(req.db);
  if (!key) return res.json({ configured: false });
  res.json({ configured: true, masked: key.slice(0, 8) + '…' + key.slice(-4) });
});

// PUT /api/routing/ocm-config — OCM API-Key speichern (Admin)
router.put('/ocm-config', (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Nur Admins können den OCM-Key konfigurieren' });
  }
  const { ocm_api_key } = req.body;
  if (ocm_api_key === '' || ocm_api_key == null) {
    req.db.prepare("DELETE FROM tenant_settings WHERE key='ocm_api_key'").run();
    return res.json({ configured: false });
  }
  if (typeof ocm_api_key !== 'string' || ocm_api_key.length < 8) {
    return res.status(400).json({ error: 'Ungültiger API-Key' });
  }
  req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES ('ocm_api_key',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(ocm_api_key);
  res.json({ configured: true, masked: ocm_api_key.slice(0, 8) + '…' + ocm_api_key.slice(-4) });
});

// GET /api/routing/chargers?lat=&lon=&radius_km=
router.get('/chargers', async (req, res) => {
  const lat    = parseFloat(req.query.lat);
  const lon    = parseFloat(req.query.lon);
  const radius = Math.min(parseFloat(req.query.radius_km) || 30, 150);
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat und lon erforderlich' });

  const params = new URLSearchParams({
    maxresults: 50, compact: true, verbose: false,
    latitude: lat, longitude: lon, distance: radius, distanceunit: 'KM',
    levelid: '3',   // DC Fast only (>40 kW)
  });
  const ocmKey = getOcmKey(req.db);
  if (ocmKey) params.set('key', ocmKey);

  try {
    const r = await fetch(`https://api.openchargemap.io/v3/poi/?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 403) return res.status(403).json({ error: 'OpenChargeMap API-Key fehlt', code: 'NO_API_KEY' });
    if (!r.ok) return res.status(502).json({ error: 'OpenChargeMap nicht erreichbar' });
    const data = await r.json();
    const stations = (Array.isArray(data) ? data : []).map(s => ({
      id:       s.ID,
      name:     s.AddressInfo?.Title ?? 'Ladestation',
      lat:      s.AddressInfo?.Latitude,
      lon:      s.AddressInfo?.Longitude,
      address:  s.AddressInfo?.AddressLine1 ?? null,
      max_kw:   s.Connections?.reduce((m, c) => Math.max(m, c.PowerKW ?? 0), 0) || null,
      operator: s.OperatorInfo?.Title ?? null,
      is_tesla: (s.OperatorInfo?.Title ?? '').toLowerCase().includes('tesla'),
    })).filter(s => s.lat && s.lon);
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routing/route — OSRM-Proxy (oder Valhalla bei Umgehungsoptionen)
router.post('/route', async (req, res) => {
  const { coordinates, avoid_motorways, avoid_tolls, avoid_ferry } = req.body;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return res.status(400).json({ error: 'coordinates erforderlich ([lon,lat]-Paare, mind. 2)' });
  }

  const useValhalla = avoid_motorways || avoid_tolls || avoid_ferry;

  try {
    if (useValhalla) {
      const data = await fetchValhalla(coordinates, {
        avoidMotorways: avoid_motorways,
        avoidTolls:     avoid_tolls,
        avoidFerry:     avoid_ferry,
      });
      return res.json(data);
    }

    const coordStr = coordinates.map(([lon, lat]) => `${lon},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    const r   = await fetch(url, {
      headers: { 'User-Agent': 'TeslaCarview/2.2 (https://github.com/KnevS/Tesla-Carview)' },
      signal:  AbortSignal.timeout(12000),
    });
    if (!r.ok) return res.status(502).json({ error: `OSRM ${r.status}` });
    res.json(await r.json());
  } catch (err) {
    res.status(504).json({ error: 'Routing nicht erreichbar: ' + err.message });
  }
});

// POST /api/routing/plan — Energieplanung mit Ladestopps (ABRP-Stil)
router.post('/plan', async (req, res) => {
  const {
    vehicleId, coordinates,
    current_soc, avg_kwh_per_100km, battery_kwh,
    min_arrival_soc = 15, charge_to_soc = 80,
    avoid_motorways, avoid_tolls, avoid_ferry,
  } = req.body;

  if (!vehicleId || !Array.isArray(coordinates) || coordinates.length < 2) {
    return res.status(400).json({ error: 'vehicleId und coordinates erforderlich' });
  }
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

  // 1. Route holen (Valhalla bei Umgehungsoptionen, sonst OSRM)
  let routeResult;
  try {
    if (avoid_motorways || avoid_tolls || avoid_ferry) {
      routeResult = await fetchValhalla(coordinates, {
        avoidMotorways: avoid_motorways,
        avoidTolls:     avoid_tolls,
        avoidFerry:     avoid_ferry,
      });
    } else {
      const coordStr = coordinates.map(([lon, lat]) => `${lon},${lat}`).join(';');
      const r = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
        { headers: { 'User-Agent': 'TeslaCarview/2.2' }, signal: AbortSignal.timeout(12000) }
      );
      routeResult = await r.json();
    }
  } catch {
    return res.status(504).json({ error: 'Routing nicht erreichbar' });
  }

  const route = routeResult.routes?.[0];
  if (!route) return res.status(502).json({ error: 'Keine Route gefunden' });

  const geom     = route.geometry.coordinates; // [[lon,lat],...]
  const cumDists = cumulativeDistances(geom);
  const totalKm  = cumDists[cumDists.length - 1];

  // Fallback-Verbrauchswerte aus der Tenant-DB wenn nicht übergeben
  let soc     = typeof current_soc === 'number' ? current_soc : null;
  let kwh100  = typeof avg_kwh_per_100km === 'number' ? avg_kwh_per_100km : null;
  let batKwh  = typeof battery_kwh === 'number' ? battery_kwh : null;

  if (soc == null || kwh100 == null) {
    try {
      const bat = req.db.prepare(
        'SELECT soc, rated_range_km FROM battery_snapshots WHERE vehicle_id=? ORDER BY timestamp DESC LIMIT 1'
      ).get(vehicleId);
      const cons = req.db.prepare(`
        SELECT AVG(energy_used_kwh / distance_km * 100.0) AS avg
        FROM (SELECT energy_used_kwh, distance_km FROM trips
              WHERE vehicle_id=? AND distance_km>2 AND energy_used_kwh>0 LIMIT 100)
      `).get(vehicleId);
      soc    ??= bat?.soc ?? 80;
      kwh100 ??= cons?.avg ?? 18;
      if (batKwh == null && bat?.rated_range_km && soc > 0) {
        const range100 = bat.rated_range_km / (soc / 100);
        batKwh = range100 * (kwh100 / 100);
      }
    } catch {
      soc    ??= 80;
      kwh100 ??= 18;
    }
  }
  batKwh ??= 75; // Fallback 75 kWh

  const kwhPerKm = kwh100 / 100;

  // 2. Abtastpunkte alle ~60 km
  const stepCount = Math.max(2, Math.ceil(totalKm / 60));
  const samplePts = [];
  for (let i = 0; i <= stepCount; i++) {
    const targetKm = (i / stepCount) * totalKm;
    // Nächsten Geometriepunkt zu dieser Distanz finden
    const idx = cumDists.findIndex(d => d >= targetKm);
    samplePts.push(geom[idx >= 0 ? idx : geom.length - 1]);
  }

  // 3. Ladestationen parallel abfragen
  const seen       = new Set();
  const allChargers = [];

  await Promise.all(samplePts.map(async ([lon, lat]) => {
    const params = new URLSearchParams({
      maxresults: 30, compact: true, verbose: false,
      latitude: lat, longitude: lon, distance: 20, distanceunit: 'KM',
      levelid: '3',
    });
    const ocmKeyPlan = getOcmKey(req.db);
    if (ocmKeyPlan) params.set('key', ocmKeyPlan);
    try {
      const r   = await fetch(`https://api.openchargemap.io/v3/poi/?${params}`, {
        signal: AbortSignal.timeout(6000),
      });
      const data = await r.json();
      for (const s of (Array.isArray(data) ? data : [])) {
        if (seen.has(s.ID)) continue;
        if (!s.AddressInfo?.Latitude || !s.AddressInfo?.Longitude) continue;
        const proj = projectOnRoute(
          s.AddressInfo.Latitude, s.AddressInfo.Longitude,
          geom, cumDists, 12  // max 12 km Korridor
        );
        if (!proj) continue;
        seen.add(s.ID);
        allChargers.push({
          id:       s.ID,
          name:     s.AddressInfo.Title ?? 'Ladestation',
          lat:      s.AddressInfo.Latitude,
          lon:      s.AddressInfo.Longitude,
          max_kw:   s.Connections?.reduce((m, c) => Math.max(m, c.PowerKW ?? 0), 0) || 50,
          operator: s.OperatorInfo?.Title ?? null,
          is_tesla: (s.OperatorInfo?.Title ?? '').toLowerCase().includes('tesla'),
          routeKm:  proj.routeKm,
          corridorDist: proj.corridorDist,
        });
      }
    } catch { /* Fehler bei einzelnem Punkt ignorieren */ }
  }));

  // Nach Routenposition sortieren
  allChargers.sort((a, b) => a.routeKm - b.routeKm);

  // 4. Ladeplan berechnen
  const plan = planChargingStops({
    chargers: allChargers,
    totalKm,
    initSoc:       soc,
    kwhPerKm,
    batteryKwh:    batKwh,
    minArrivalSoc: min_arrival_soc,
    chargeToSoc:   charge_to_soc,
  });

  res.json({
    ...plan,
    total_km:              totalKm,
    total_charge_time_min: plan.stops.reduce((s, st) => s + st.charge_minutes, 0),
    chargers_found:        allChargers.length,
  });
});

// GET /api/routing/geocode?q=&lang=
router.get('/geocode', async (req, res) => {
  const q    = (req.query.q ?? '').trim();
  const lang = (req.query.lang ?? 'de').slice(0, 10);
  if (!q || q.length < 2) return res.json([]);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0`;
    const r   = await fetch(url, {
      headers: { 'Accept-Language': lang, 'User-Agent': 'TeslaCarview/2.2' },
      signal:  AbortSignal.timeout(6000),
    });
    if (!r.ok) return res.json([]);
    res.json(await r.json());
  } catch {
    res.json([]);
  }
});

// GET /api/routing/reverse?lat=&lon=&lang=
router.get('/reverse', async (req, res) => {
  const lat  = parseFloat(req.query.lat);
  const lon  = parseFloat(req.query.lon);
  const lang = (req.query.lang ?? 'de').slice(0, 10);
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat und lon erforderlich' });
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const r   = await fetch(url, {
      headers: { 'Accept-Language': lang, 'User-Agent': 'TeslaCarview/2.2' },
      signal:  AbortSignal.timeout(6000),
    });
    if (!r.ok) return res.json({ display_name: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
    res.json(await r.json());
  } catch {
    res.json({ display_name: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
  }
});

// GET /api/routing/weather?lat=&lon=&time= (ISO datetime)
// Proxy zu Open-Meteo (kostenlos, kein API-Key)
router.get('/weather', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat/lon erforderlich' });
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,wind_speed_10m,weather_code,precipitation,apparent_temperature`
      + `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m`
      + `&forecast_days=3&timezone=auto&wind_speed_unit=kmh`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(r.status).json({ error: 'OpenMeteo-Fehler' });
    const data = await r.json();

    // Wenn time angegeben: nächste Stunde im hourly-Array finden
    const targetTime = req.query.time ? new Date(req.query.time) : null;
    let hourly = null;
    if (targetTime && data.hourly?.time) {
      const idx = data.hourly.time.findIndex(t => new Date(t) >= targetTime);
      const i = idx >= 0 ? idx : 0;
      hourly = {
        time:                     data.hourly.time[i],
        temperature_2m:           data.hourly.temperature_2m?.[i],
        precipitation_probability: data.hourly.precipitation_probability?.[i],
        weather_code:             data.hourly.weather_code?.[i],
        wind_speed_10m:           data.hourly.wind_speed_10m?.[i],
      };
    }
    res.json({ current: data.current, hourly });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/routing/cameras?south=&west=&north=&east=
// Blitzerdaten aus OpenStreetMap Overpass API
router.get('/cameras', async (req, res) => {
  const { south, west, north, east } = req.query;
  if (!south || !west || !north || !east) {
    return res.status(400).json({ error: 'Bounding-Box (south,west,north,east) erforderlich' });
  }
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:15];(node["highway"="speed_camera"](${bbox});node["enforcement"="maxspeed"](${bbox}););out body;`;
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    query,
      signal:  AbortSignal.timeout(18000),
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Overpass-Fehler' });
    const data = await r.json();
    const cameras = (data.elements ?? []).map(el => ({
      id:  el.id,
      lat: el.lat,
      lon: el.lon,
      maxspeed: el.tags?.maxspeed,
      direction: el.tags?.direction,
    }));
    res.json({ cameras });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/routing/traffic?origin_lat=&origin_lon=&dest_lat=&dest_lon=
// HERE Maps Routing v8 (benötigt HERE_API_KEY in Tenant-Einstellungen)
router.get('/traffic', async (req, res) => {
  const hereKey = req.db.prepare(
    "SELECT value FROM tenant_settings WHERE key='here_api_key'"
  ).get()?.value;

  if (!hereKey) {
    return res.json({ available: false, reason: 'no_key' });
  }

  const { origin_lat, origin_lon, dest_lat, dest_lon } = req.query;
  if (!origin_lat || !origin_lon || !dest_lat || !dest_lon) {
    return res.status(400).json({ error: 'Koordinaten erforderlich' });
  }
  try {
    const url = `https://router.hereapi.com/v8/routes`
      + `?transportMode=car&origin=${origin_lat},${origin_lon}&destination=${dest_lat},${dest_lon}`
      + `&return=summary,travelSummary&departure=now&apiKey=${hereKey}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ available: false, reason: body.slice(0, 200) });
    }
    const data = await r.json();
    const route = data.routes?.[0]?.sections?.[0]?.travelSummary;
    res.json({
      available:        true,
      duration_min:     route ? Math.round(route.duration / 60) : null,
      duration_traffic: route ? Math.round((route.duration + (route.typicalDuration ? 0 : 0)) / 60) : null,
      base_duration_min: route ? Math.round(route.baseDuration / 60) : null,
      delay_min:        route ? Math.max(0, Math.round((route.duration - (route.baseDuration ?? route.duration)) / 60)) : 0,
    });
  } catch (err) {
    res.status(502).json({ available: false, reason: err.message });
  }
});

// GET /api/routing/traffic-config — HERE API Key Status (maskiert)
router.get('/traffic-config', (req, res) => {
  const row = req.db.prepare("SELECT value FROM tenant_settings WHERE key='here_api_key'").get();
  if (!row?.value) return res.json({ configured: false });
  // Nur die ersten 8 und letzten 4 Zeichen zurückgeben
  const k = row.value;
  res.json({ configured: true, masked: k.slice(0, 8) + '…' + k.slice(-4) });
});

// PUT /api/routing/traffic-config — HERE API Key speichern (Admin)
router.put('/traffic-config', (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Nur Admins können den HERE-Key konfigurieren' });
  }
  const { here_api_key } = req.body;
  if (here_api_key === '' || here_api_key == null) {
    req.db.prepare("DELETE FROM tenant_settings WHERE key='here_api_key'").run();
    return res.json({ configured: false });
  }
  if (typeof here_api_key !== 'string' || here_api_key.length < 10) {
    return res.status(400).json({ error: 'Ungültiger API-Key' });
  }
  req.db.prepare(
    "INSERT INTO tenant_settings (key,value) VALUES ('here_api_key',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(here_api_key);
  const k = here_api_key;
  res.json({ configured: true, masked: k.slice(0, 8) + '…' + k.slice(-4) });
});

export default router;

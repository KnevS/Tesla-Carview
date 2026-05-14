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
  if (process.env.OPENCHARGEMAP_API_KEY) params.set('key', process.env.OPENCHARGEMAP_API_KEY);

  try {
    const r = await fetch(`https://api.openchargemap.io/v3/poi/?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
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

// POST /api/routing/route — OSRM-Proxy
router.post('/route', async (req, res) => {
  const { coordinates } = req.body;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return res.status(400).json({ error: 'coordinates erforderlich ([lon,lat]-Paare, mind. 2)' });
  }
  const coordStr = coordinates.map(([lon, lat]) => `${lon},${lat}`).join(';');
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    const r   = await fetch(url, {
      headers: { 'User-Agent': 'TeslaCarview/2.2 (https://github.com/KnevS/Tesla-Carview)' },
      signal:  AbortSignal.timeout(12000),
    });
    if (!r.ok) return res.status(502).json({ error: `OSRM ${r.status}` });
    res.json(await r.json());
  } catch (err) {
    res.status(504).json({ error: 'OSRM nicht erreichbar: ' + err.message });
  }
});

// POST /api/routing/plan — Energieplanung mit Ladestopps (ABRP-Stil)
router.post('/plan', async (req, res) => {
  const {
    vehicleId, coordinates,
    current_soc, avg_kwh_per_100km, battery_kwh,
    min_arrival_soc = 15, charge_to_soc = 80,
  } = req.body;

  if (!vehicleId || !Array.isArray(coordinates) || coordinates.length < 2) {
    return res.status(400).json({ error: 'vehicleId und coordinates erforderlich' });
  }
  if (guardAccess(res, () => assertVehicleAccess(req.db, vehicleId, req.user))) return;

  // 1. OSRM-Route holen
  const coordStr = coordinates.map(([lon, lat]) => `${lon},${lat}`).join(';');
  let osrmData;
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
      {
        headers: { 'User-Agent': 'TeslaCarview/2.2' },
        signal:  AbortSignal.timeout(12000),
      }
    );
    osrmData = await r.json();
  } catch {
    return res.status(504).json({ error: 'OSRM nicht erreichbar' });
  }

  const route = osrmData.routes?.[0];
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
    if (process.env.OPENCHARGEMAP_API_KEY) params.set('key', process.env.OPENCHARGEMAP_API_KEY);
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

export default router;

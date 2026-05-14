import { Router } from 'express';

const router = Router();

function checkVehicleAccess(db, vehicleId, userId) {
  return db.prepare(
    'SELECT v.id FROM vehicles v JOIN vehicle_users vu ON vu.vehicle_id=v.id WHERE v.id=? AND vu.user_id=?'
  ).get(vehicleId, userId);
}

// GET /api/routing/stats?vehicleId=
// Liefert aktuellen SoC + Restreichweite + Durchschnittsverbrauch aus Fahrthistorie
router.get('/stats', (req, res) => {
  const vehicleId = Number(req.query.vehicleId);
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId erforderlich' });
  if (!checkVehicleAccess(req.db, vehicleId, req.user.id)) return res.status(403).json({ error: 'Kein Zugriff' });

  const battery = req.db.prepare(
    'SELECT soc, rated_range_km FROM battery_history WHERE vehicle_id=? ORDER BY timestamp DESC LIMIT 1'
  ).get(vehicleId);

  const consumption = req.db.prepare(`
    SELECT AVG(energy_used_kwh / distance_km * 100.0) AS avg_kwh_per_100km, COUNT(*) AS trip_count
    FROM (
      SELECT energy_used_kwh, distance_km
      FROM trips
      WHERE vehicle_id=? AND distance_km > 2 AND energy_used_kwh > 0
        AND start_time > unixepoch() - 90*24*3600
      ORDER BY start_time DESC
      LIMIT 100
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
// Proxy zu OpenChargeMap — gibt Schnellladestationen zurück (DC, CCS, CHAdeMO, Tesla)
router.get('/chargers', async (req, res) => {
  const lat      = parseFloat(req.query.lat);
  const lon      = parseFloat(req.query.lon);
  const radius   = Math.min(parseFloat(req.query.radius_km) || 30, 150);

  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat und lon erforderlich' });

  const params = new URLSearchParams({
    maxresults:     40,
    compact:        true,
    verbose:        false,
    latitude:       lat,
    longitude:      lon,
    distance:       radius,
    distanceunit:   'KM',
    levelid:        '3',          // DC fast only
    connectiontypeid: '33,32,25,27', // CCS (Type 2), CHAdeMO, Tesla, Tesla CCS
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
    })).filter(s => s.lat && s.lon);
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/routing/geocode?q=&lang=
// Proxy zu Nominatim — umgeht Browser-CSP-Einschränkungen
router.get('/geocode', async (req, res) => {
  const q    = (req.query.q ?? '').trim();
  const lang = (req.query.lang ?? 'de').slice(0, 10);
  if (!q || q.length < 2) return res.json([]);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0`;
    const r   = await fetch(url, {
      headers: {
        'Accept-Language': lang,
        'User-Agent': 'TeslaCarview/2.2 (https://github.com/KnevS/Tesla-Carview)',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return res.json([]);
    res.json(await r.json());
  } catch {
    res.json([]);
  }
});

// GET /api/routing/reverse?lat=&lon=&lang=
// Proxy für Reverse-Geocoding (Koordinaten → Adresse)
router.get('/reverse', async (req, res) => {
  const lat  = parseFloat(req.query.lat);
  const lon  = parseFloat(req.query.lon);
  const lang = (req.query.lang ?? 'de').slice(0, 10);
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat und lon erforderlich' });

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const r   = await fetch(url, {
      headers: {
        'Accept-Language': lang,
        'User-Agent': 'TeslaCarview/2.2 (https://github.com/KnevS/Tesla-Carview)',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return res.json({ display_name: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
    res.json(await r.json());
  } catch {
    res.json({ display_name: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
  }
});

export default router;

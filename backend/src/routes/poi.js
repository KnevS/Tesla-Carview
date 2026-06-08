// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { getNearbyPOIs, POI_TYPES } from '../services/poiService.js';

const router = Router();

router.get('/types', (req, res) => {
  res.json({ types: POI_TYPES });
});

router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat/lon required' });
    }
    const radius = Math.min(5000, Math.max(100, parseInt(req.query.radius || '1500', 10)));
    const types = req.query.types
      ? String(req.query.types).split(',').map(s => s.trim()).filter(Boolean)
      : null;
    const pois = await getNearbyPOIs(req.db, { lat, lon, radius, types });
    res.json({ lat, lon, radius, count: pois.length, pois });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Praktisch: POIs nahe einer aktiven Lade-Session
router.get('/nearby/charging/:sessionId', async (req, res) => {
  try {
    const session = req.db.prepare(
      'SELECT lat, lon FROM charging_sessions WHERE id=?'
    ).get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (session.lat == null || session.lon == null) return res.json({ pois: [], note: 'no_gps' });
    const radius = Math.min(5000, Math.max(100, parseInt(req.query.radius || '1500', 10)));
    const types = req.query.types
      ? String(req.query.types).split(',').map(s => s.trim()).filter(Boolean)
      : null;
    const pois = await getNearbyPOIs(req.db, { lat: session.lat, lon: session.lon, radius, types });
    res.json({ lat: session.lat, lon: session.lon, radius, count: pois.length, pois });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

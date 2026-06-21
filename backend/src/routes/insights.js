// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { buildWeeklyInsights } from '../services/insightEngine.js';

const router = Router();

// GET /api/insights/weekly — proaktive Wochen-Insights (regelbasiert, keine KI).
// User-gescoped über req.user.sub (alle Fahrzeuge des Nutzers).
router.get('/weekly', (req, res) => {
  try {
    res.json(buildWeeklyInsights(req.db, req.user.sub));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

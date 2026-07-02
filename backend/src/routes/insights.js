// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { buildWeeklyInsights, buildEcoScore } from '../services/insightEngine.js';

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

// GET /api/insights/eco-score — Fahrstil-/Effizienz-Score (relativ zum eigenen
// Langzeit-Schnitt), rein statistisch, user-gescoped.
router.get('/eco-score', (req, res) => {
  try {
    res.json(buildEcoScore(req.db, req.user.sub));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
const router = Router();
// Demo feature not available in this build.
router.get('/status', (_req, res) => res.json({ enabled: false }));
router.post('/signup', (_req, res) => res.status(503).json({ error: 'Demo not available' }));
export default router;

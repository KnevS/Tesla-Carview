import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

router.post('/subscribe', (req, res) => {
  const db = getDb();
  const { vehicle_id, subscription } = req.body;
  if (!vehicle_id || !subscription) {
    return res.status(400).json({ error: 'vehicle_id und subscription erforderlich' });
  }
  try {
    db.prepare(
      'INSERT OR REPLACE INTO push_subscriptions (vehicle_id, subscription_json) VALUES (?, ?)'
    ).run(vehicle_id, JSON.stringify(subscription));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/unsubscribe', (req, res) => {
  const db = getDb();
  const { vehicle_id } = req.body;
  db.prepare('DELETE FROM push_subscriptions WHERE vehicle_id=?').run(vehicle_id);
  res.json({ success: true });
});

router.get('/vapid-public-key', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
});

export default router;

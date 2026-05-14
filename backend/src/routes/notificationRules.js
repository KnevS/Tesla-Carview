import { Router } from 'express';

const router = Router();

const VALID_RULE_TYPES   = ['soc_above', 'soc_below', 'geofence_enter', 'geofence_exit', 'charging_complete'];
const VALID_ACTION_TYPES = ['push_notify', 'climate_on', 'climate_off', 'climate_set_temp'];

// GET /api/notification-rules
router.get('/', (req, res) => {
  try {
    const rules = req.db.prepare(`
      SELECT r.*, g.name AS geofence_name
      FROM notification_rules r
      LEFT JOIN geofences g ON g.id = r.geofence_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.sub);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notification-rules
router.post('/', (req, res) => {
  try {
    const { vehicle_id, rule_type, geofence_id, threshold, action_type, action_param, cooldown_minutes = 30 } = req.body;
    if (!vehicle_id || !rule_type || !action_type) return res.status(400).json({ error: 'vehicle_id, rule_type und action_type sind erforderlich' });
    if (!VALID_RULE_TYPES.includes(rule_type))   return res.status(400).json({ error: 'Ungültiger rule_type' });
    if (!VALID_ACTION_TYPES.includes(action_type)) return res.status(400).json({ error: 'Ungültiger action_type' });

    const { lastInsertRowid } = req.db.prepare(`
      INSERT INTO notification_rules (user_id, vehicle_id, rule_type, geofence_id, threshold, action_type, action_param, cooldown_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.sub, vehicle_id, rule_type, geofence_id ?? null, threshold ?? null, action_type, action_param ? JSON.stringify(action_param) : null, cooldown_minutes);
    res.status(201).json(req.db.prepare('SELECT * FROM notification_rules WHERE id=?').get(lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notification-rules/:id
router.patch('/:id', (req, res) => {
  try {
    const rule = req.db.prepare('SELECT * FROM notification_rules WHERE id=? AND user_id=?').get(req.params.id, req.user.sub);
    if (!rule) return res.status(404).json({ error: 'Regel nicht gefunden' });

    const { enabled, threshold, action_param, cooldown_minutes } = req.body;
    const updates = [];
    const vals    = [];
    if (enabled !== undefined)          { updates.push('enabled=?');          vals.push(enabled ? 1 : 0); }
    if (threshold !== undefined)        { updates.push('threshold=?');        vals.push(threshold); }
    if (action_param !== undefined)     { updates.push('action_param=?');     vals.push(JSON.stringify(action_param)); }
    if (cooldown_minutes !== undefined) { updates.push('cooldown_minutes=?'); vals.push(cooldown_minutes); }
    if (!updates.length) return res.json(rule);

    vals.push(req.params.id);
    req.db.prepare(`UPDATE notification_rules SET ${updates.join(',')} WHERE id=?`).run(...vals);
    res.json(req.db.prepare('SELECT * FROM notification_rules WHERE id=?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notification-rules/:id
router.delete('/:id', (req, res) => {
  try {
    const rule = req.db.prepare('SELECT id FROM notification_rules WHERE id=? AND user_id=?').get(req.params.id, req.user.sub);
    if (!rule) return res.status(404).json({ error: 'Regel nicht gefunden' });
    req.db.prepare('DELETE FROM notification_rules WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

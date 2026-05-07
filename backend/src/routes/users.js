import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUser, findUserById, changePassword, verifyPassword } from '../services/userService.js';
import { auditLog } from '../services/auditService.js';

const router = Router();
router.use(requireAuth);

// GET /api/users
router.get('/', requireAdmin, (req, res) => {
  const users = req.db.prepare(
    'SELECT id, username, email, role, is_active, mfa_enabled, last_login, created_at FROM users ORDER BY id'
  ).all();
  res.json(users);
});

// POST /api/users
router.post('/', requireAdmin, validate(z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12).max(256),
  email:    z.string().email().max(255).optional(),
  role:     z.enum(['admin', 'user']).default('user'),
})), async (req, res) => {
  try {
    const id = await createUser(req.db, req.body.username, req.body.password, req.body.role, req.body.email ?? null);
    auditLog(req.db, req.user.sub, 'user_created', req, { username: req.body.username });
    res.status(201).json({ id });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAdmin, (req, res) => {
  if (+req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'Eigenes Konto kann nicht geloescht werden' });
  }
  req.db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  auditLog(req.db, req.user.sub, 'user_deleted', req, { targetId: req.params.id });
  res.json({ success: true });
});

// PUT /api/users/:id/toggle
router.put('/:id/toggle', requireAdmin, (req, res) => {
  if (+req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'Eigenes Konto kann nicht deaktiviert werden' });
  }
  req.db.prepare('UPDATE users SET is_active = NOT is_active WHERE id=?').run(req.params.id);
  auditLog(req.db, req.user.sub, 'user_toggled', req, { targetId: req.params.id });
  res.json({ success: true });
});

// PUT /api/users/me/password
router.put('/me/password', validate(z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(12).max(256),
})), async (req, res) => {
  const user = findUserById(req.db, req.user.sub);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (!(await verifyPassword(user, req.body.currentPassword))) {
    return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
  }
  if (req.body.currentPassword === req.body.newPassword) {
    return res.status(400).json({ error: 'Neues Passwort muss sich vom alten unterscheiden' });
  }
  await changePassword(req.db, user.id, req.body.newPassword);
  auditLog(req.db, user.id, 'password_changed', req);
  res.json({ success: true });
});

// GET /api/users/me/audit
router.get('/me/audit', (req, res) => {
  const entries = req.db.prepare(
    'SELECT action, ip_address, created_at FROM audit_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.sub);
  res.json(entries);
});

// --- Fahrzeug-Benutzerzuordnung ---

// GET /api/users/:id/vehicles
router.get('/:id/vehicles', requireAdmin, (req, res) => {
  const vehicles = req.db.prepare(
    `SELECT v.* FROM vehicles v
     JOIN vehicle_users vu ON vu.vehicle_id=v.id
     WHERE vu.user_id=?`
  ).all(req.params.id);
  res.json(vehicles);
});

// POST /api/users/:id/vehicles/:vehicleId
router.post('/:id/vehicles/:vehicleId', requireAdmin, (req, res) => {
  try {
    req.db.prepare(
      'INSERT OR IGNORE INTO vehicle_users (vehicle_id, user_id) VALUES (?, ?)'
    ).run(req.params.vehicleId, req.params.id);
    auditLog(req.db, req.user.sub, 'vehicle_assigned', req, { userId: req.params.id, vehicleId: req.params.vehicleId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id/vehicles/:vehicleId
router.delete('/:id/vehicles/:vehicleId', requireAdmin, (req, res) => {
  req.db.prepare(
    'DELETE FROM vehicle_users WHERE vehicle_id=? AND user_id=?'
  ).run(req.params.vehicleId, req.params.id);
  auditLog(req.db, req.user.sub, 'vehicle_unassigned', req, { userId: req.params.id, vehicleId: req.params.vehicleId });
  res.json({ success: true });
});

export default router;

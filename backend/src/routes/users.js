import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUser, findUserById, changePassword, verifyPassword } from '../services/userService.js';
import { auditLog } from '../services/auditService.js';
import { getDb } from '../db/database.js';

const router = Router();
router.use(requireAuth);

// GET /api/users – Alle Benutzer (nur Admin; ohne Passwort-Hashes)
router.get('/', requireAdmin, (_req, res) => {
  const users = getDb().prepare(
    'SELECT id, username, role, is_active, mfa_enabled, last_login, created_at FROM users ORDER BY id'
  ).all();
  res.json(users);
});

// POST /api/users – Neuen Benutzer anlegen (nur Admin)
router.post('/', requireAdmin, validate(z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/, 'Nur Buchstaben, Zahlen, _ und - erlaubt'),
  password: z.string().min(12).max(256),
  role: z.enum(['admin', 'user']).default('user'),
})), async (req, res) => {
  try {
    const id = await createUser(req.body.username, req.body.password, req.body.role);
    auditLog(req.user.sub, 'user_created', req, { username: req.body.username });
    res.status(201).json({ id });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    }
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/users/:id – Benutzer loeschen (nur Admin, nicht sich selbst)
router.delete('/:id', requireAdmin, (req, res) => {
  if (+req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'Eigenes Konto kann nicht geloescht werden' });
  }
  getDb().prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  auditLog(req.user.sub, 'user_deleted', req, { targetId: req.params.id });
  res.json({ success: true });
});

// PUT /api/users/:id/toggle – Benutzer aktivieren/deaktivieren
router.put('/:id/toggle', requireAdmin, (req, res) => {
  if (+req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'Eigenes Konto kann nicht deaktiviert werden' });
  }
  getDb().prepare('UPDATE users SET is_active = NOT is_active WHERE id=?').run(req.params.id);
  auditLog(req.user.sub, 'user_toggled', req, { targetId: req.params.id });
  res.json({ success: true });
});

// PUT /api/users/me/password – Eigenes Passwort aendern
router.put('/me/password', validate(z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(256),
})), async (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (!(await verifyPassword(user, req.body.currentPassword))) {
    return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
  }
  if (req.body.currentPassword === req.body.newPassword) {
    return res.status(400).json({ error: 'Neues Passwort muss sich vom alten unterscheiden' });
  }
  await changePassword(user.id, req.body.newPassword);
  auditLog(user.id, 'password_changed', req);
  res.json({ success: true });
});

// GET /api/users/me/audit – Eigene Audit-Eintraege
router.get('/me/audit', (req, res) => {
  const entries = getDb().prepare(
    'SELECT action, ip_address, created_at FROM audit_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.sub);
  res.json(entries);
});

export default router;

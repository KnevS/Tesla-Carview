import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUser, findUserById, changePassword, verifyPassword } from '../services/userService.js';
import { auditLog } from '../services/auditService.js';
import { getMasterDb } from '../db/database.js';

const router = Router();
router.use(requireAuth);

// User-Invites: Token-basierte Selbstregistrierung im eigenen Mandanten.
// Public-Routen (validate / accept) leben in routes/userInvites.js und
// werden vor requireAuth gemountet. Hier nur die Admin-Endpunkte.
const INVITE_TTL_DAYS = 14;
const INVITE_TTL_SECONDS = INVITE_TTL_DAYS * 24 * 60 * 60;

router.post('/invite', requireAdmin, validate(z.object({
  role: z.enum(['admin', 'user']).optional().default('user'),
  note: z.string().max(120).optional(),
})), (req, res) => {
  const token     = randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + INVITE_TTL_SECONDS;
  req.db.prepare(
    `INSERT INTO user_invites (token, role, created_by_user_id, expires_at, note)
     VALUES (?, ?, ?, ?, ?)`
  ).run(token, req.body.role, req.user.sub, expiresAt, req.body.note || null);

  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  auditLog(req.db, req.user.sub, 'user_invite_created', req, { role: req.body.role });
  res.status(201).json({
    token,
    url: `${base}/invite/${token}`,
    role: req.body.role,
    expiresAt,
    expiresInDays: INVITE_TTL_DAYS,
  });
});

router.get('/invite', requireAdmin, (req, res) => {
  const rows = req.db.prepare(
    `SELECT i.id, i.token, i.role, i.expires_at, i.used_at, i.note, i.created_at,
            (SELECT username FROM users WHERE id = i.created_by_user_id) AS created_by_username,
            (SELECT username FROM users WHERE id = i.used_by_user_id)    AS used_by_username
       FROM user_invites i
      ORDER BY i.created_at DESC`
  ).all();
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.json(rows.map(r => ({ ...r, url: `${base}/invite/${r.token}` })));
});

router.delete('/invite/:token', requireAdmin, (req, res) => {
  const r = req.db.prepare(
    'DELETE FROM user_invites WHERE token = ? AND used_at IS NULL'
  ).run(req.params.token);
  auditLog(req.db, req.user.sub, 'user_invite_revoked', req, { token_preview: req.params.token.slice(0, 8) });
  res.json({ ok: true, deleted: r.changes });
});

// GET /api/users
router.get('/', requireAdmin, (req, res) => {
  const users = req.db.prepare(
    `SELECT id, username, email, role, is_active, mfa_enabled, mfa_required,
            can_edit_vehicles, can_add_vehicles, last_login, created_at
       FROM users ORDER BY id`
  ).all();
  res.json(users);
});

// GET /api/users/admin-tasks
// Admin-Cockpit-Aufgaben — derzeit: User ohne zugewiesenes Fahrzeug.
// Der Admin sieht so auf einen Blick, wem er ein Auto zuweisen oder
// das Recht „selbst Fahrzeuge anlegen" geben muss.
router.get('/admin-tasks', requireAdmin, (req, res) => {
  const usersWithoutVehicle = req.db.prepare(`
    SELECT u.id, u.username, u.role, u.can_add_vehicles, u.created_at
      FROM users u
      LEFT JOIN vehicle_users vu ON vu.user_id = u.id
     WHERE u.is_active = 1
       AND u.role != 'admin'
       AND vu.vehicle_id IS NULL
     ORDER BY u.created_at DESC
  `).all();
  res.json({
    usersWithoutVehicle,
    // Spaeter weitere Aufgaben-Typen: pendingPasswordResets, expiringInvites, …
  });
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

// PATCH /api/users/:id — Admin schaltet Berechtigungs-Flags um.
// Erlaubt: can_edit_vehicles, can_add_vehicles, mfa_required.
// Andere User-Felder werden NICHT ueber diesen Endpoint geaendert
// (Username/Passwort haben dedizierte Routen, role-Wechsel ist
// bewusst nicht erlaubt um Privilege-Escalation zu vermeiden).
router.patch('/:id', requireAdmin, validate(z.object({
  can_edit_vehicles: z.boolean().optional(),
  can_add_vehicles:  z.boolean().optional(),
  mfa_required:      z.boolean().optional(),
})), (req, res) => {
  const id      = +req.params.id;
  const target  = req.db.prepare('SELECT id, role FROM users WHERE id=?').get(id);
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  // Admin-Rollen haben Flags implizit als 1 — Aenderungen am Admin sind
  // unnoetig, aber wir erlauben sie aus Konsistenz (DB-Wert wird gesetzt,
  // requireAdmin-Bypass macht sie effektiv weiter zu allem berechtigt).

  const fields = [];
  const params = [];
  for (const key of ['can_edit_vehicles', 'can_add_vehicles', 'mfa_required']) {
    if (key in req.body) {
      fields.push(`${key} = ?`);
      params.push(req.body[key] ? 1 : 0);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'Keine Aenderung mitgegeben' });
  params.push(id);
  req.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id=?`).run(...params);
  auditLog(req.db, req.user.sub, 'user_perms_changed', req, {
    targetId: id, changes: req.body,
  });
  const updated = req.db.prepare(
    `SELECT id, username, role, mfa_required, mfa_enabled,
            can_edit_vehicles, can_add_vehicles
       FROM users WHERE id=?`
  ).get(id);
  res.json(updated);
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
  // Alle aktiven Refresh-Tokens dieses Users invalidieren — ein kompromittiertes
  // Token aus einer fremden Session soll nach Passwort-Aenderung wertlos sein.
  getMasterDb().prepare('DELETE FROM refresh_tokens WHERE user_id=? AND tenant_id=?')
    .run(user.id, req.tenantId);
  res.clearCookie('refresh_token', { path: '/api/auth' });
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

router.patch('/me/lang', (req, res) => {
  const allowed = ['de', 'en', 'fr', 'es', 'tr', 'el'];
  const { lang } = req.body;
  if (!allowed.includes(lang)) return res.status(400).json({ error: 'Invalid language' });
  req.db.prepare('UPDATE users SET lang=? WHERE id=?').run(lang, req.user.sub);
  res.json({ ok: true });
});

// GET /api/users/me/preferences
router.get('/me/preferences', (req, res) => {
  const row = req.db.prepare('SELECT preferences FROM users WHERE id=?').get(req.user.sub);
  let prefs = {};
  if (row?.preferences) {
    try { prefs = JSON.parse(row.preferences); } catch { /* corrupt → reset */ }
  }
  res.json(prefs);
});

// PATCH /api/users/me/preferences — partial merge
router.patch('/me/preferences', (req, res) => {
  if (typeof req.body !== 'object' || req.body === null) {
    return res.status(400).json({ error: 'JSON-Objekt erwartet' });
  }
  const row = req.db.prepare('SELECT preferences FROM users WHERE id=?').get(req.user.sub);
  let current = {};
  if (row?.preferences) {
    try { current = JSON.parse(row.preferences); } catch { /* reset */ }
  }
  const merged = { ...current, ...req.body };
  req.db.prepare('UPDATE users SET preferences=? WHERE id=?').run(JSON.stringify(merged), req.user.sub);
  res.json(merged);
});

export default router;

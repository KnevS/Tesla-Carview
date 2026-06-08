// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import bcrypt from 'bcryptjs';

// Argon2id ist das bevorzugte Verfahren (OWASP 2024). Falls das Paket noch
// nicht im laufenden Image vorhanden ist (Cache-Race beim CI-Build), wird
// transparent auf bcrypt 12 Runden zurueckgefallen. Sobald das naechste
// Image mit korrektem npm ci deployed ist, greift Argon2id automatisch.
let argon2 = null;
try {
  argon2 = (await import('argon2')).default;
} catch {
  console.warn('[userService] argon2 nicht verfuegbar — verwende bcrypt als Fallback.');
}

const SALT_ROUNDS         = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS     = 15 * 60;

const ARGON2_OPTIONS = { type: 2 /* argon2id */, memoryCost: 65536, timeCost: 3, parallelism: 4 };

const isArgon2Hash = h => typeof h === 'string' && h.startsWith('$argon2');
const isBcryptHash = h => typeof h === 'string' && (h.startsWith('$2b$') || h.startsWith('$2a$'));

async function hashPassword(password) {
  if (argon2) return argon2.hash(password, ARGON2_OPTIONS);
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Defaults pro Rolle:
 *   admin: mfa_required=0 (Admin bestimmt selbst), can_edit_vehicles=1, can_add_vehicles=1
 *   user:  mfa_required=1 (Pflicht-Setup nach 1. Login), can_edit_vehicles=0, can_add_vehicles=0
 *
 * Der Admin kann die can_*-Flags spaeter pro User ueber das Admin-Panel
 * lockern. mfa_required wird automatisch geloescht, sobald der User MFA
 * tatsaechlich aktiviert (siehe routes/mfa.js).
 */
export async function createUser(db, username, password, role = 'user', email = null) {
  const hash = await hashPassword(password);
  const isAdmin = role === 'admin';
  const result = db.prepare(
    `INSERT INTO users
       (username, password_hash, role, email,
        mfa_required, can_edit_vehicles, can_add_vehicles)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    username.toLowerCase().trim(),
    hash,
    role,
    email?.toLowerCase().trim() ?? null,
    isAdmin ? 0 : 1,
    isAdmin ? 1 : 0,
    isAdmin ? 1 : 0,
  );
  return result.lastInsertRowid;
}

export function findUserByUsername(db, username) {
  return db.prepare('SELECT * FROM users WHERE username=?').get(username.toLowerCase().trim());
}

export function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id=?').get(id);
}

export async function verifyPassword(user, password) {
  const hash = user.password_hash;
  if (argon2 && isArgon2Hash(hash)) return argon2.verify(hash, password);
  if (isBcryptHash(hash)) return bcrypt.compare(password, hash);
  // Argon2-Hash ohne argon2-Paket — sollte nicht passieren
  if (isArgon2Hash(hash)) throw new Error('[userService] Argon2-Hash gefunden, aber argon2-Paket fehlt.');
  return false;
}

// Transparentes Upgrade bcrypt -> Argon2id beim ersten Login nach Update.
// Nur aktiv wenn argon2 verfuegbar ist.
export async function rehashIfLegacy(db, user, password) {
  if (!argon2) return;
  if (!isBcryptHash(user.password_hash)) return;
  const newHash = await argon2.hash(password, ARGON2_OPTIONS);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(newHash, user.id);
}

export async function changePassword(db, userId, newPassword) {
  const hash = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, userId);
}

export function recordFailedLogin(db, userId) {
  const row      = db.prepare('SELECT failed_login_attempts FROM users WHERE id=?').get(userId);
  const attempts = (row?.failed_login_attempts ?? 0) + 1;
  const locked   = attempts >= MAX_FAILED_ATTEMPTS
    ? Math.floor(Date.now() / 1000) + LOCKOUT_SECONDS
    : null;
  db.prepare('UPDATE users SET failed_login_attempts=?, locked_until=? WHERE id=?')
    .run(attempts, locked, userId);
}

export function resetFailedLogins(db, userId) {
  db.prepare(
    'UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login=unixepoch() WHERE id=?'
  ).run(userId);
}

export function isLockedOut(user) {
  if (!user.locked_until) return false;
  return user.locked_until > Math.floor(Date.now() / 1000);
}

import bcrypt from 'bcryptjs';
import argon2 from 'argon2';

const SALT_ROUNDS         = 12; // behalten fuer Altdaten-Verifikation
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS     = 15 * 60;

// Argon2id-Optionen gemaess OWASP-Empfehlung 2024:
// t=3 Iterationen, 64 MB Memory, p=4 Parallelitaet.
const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 };

const isArgon2Hash = h => typeof h === 'string' && h.startsWith('$argon2');
const isBcryptHash = h => typeof h === 'string' && (h.startsWith('$2b$') || h.startsWith('$2a$'));

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
  const hash = await argon2.hash(password, ARGON2_OPTIONS);
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
  if (isArgon2Hash(hash)) return argon2.verify(hash, password);
  if (isBcryptHash(hash)) return bcrypt.compare(password, hash);
  return false;
}

// Wird vom Login-Flow aufgerufen wenn der gespeicherte Hash noch bcrypt ist.
// Ersetzt ihn transparent durch Argon2id — der User merkt nichts.
export async function rehashIfLegacy(db, user, password) {
  if (!isBcryptHash(user.password_hash)) return;
  const newHash = await argon2.hash(password, ARGON2_OPTIONS);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(newHash, user.id);
}

export async function changePassword(db, userId, newPassword) {
  const hash = await argon2.hash(newPassword, ARGON2_OPTIONS);
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

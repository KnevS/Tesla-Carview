import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;

export async function createUser(username, password, role = 'user') {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = getDb().prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(username.toLowerCase().trim(), hash, role);
  return result.lastInsertRowid;
}

export function findUserByUsername(username) {
  return getDb()
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username.toLowerCase().trim());
}

export function findUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

export async function changePassword(userId, newPassword) {
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
}

export function recordFailedLogin(userId) {
  const db = getDb();
  const row = db.prepare('SELECT failed_login_attempts FROM users WHERE id = ?').get(userId);
  const attempts = (row?.failed_login_attempts ?? 0) + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
    ? Math.floor(Date.now() / 1000) + LOCKOUT_SECONDS
    : null;
  db.prepare('UPDATE users SET failed_login_attempts=?, locked_until=? WHERE id=?')
    .run(attempts, lockedUntil, userId);
}

export function resetFailedLogins(userId) {
  getDb().prepare(
    'UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login=unixepoch() WHERE id=?'
  ).run(userId);
}

export function isLockedOut(user) {
  if (!user.locked_until) return false;
  return user.locked_until > Math.floor(Date.now() / 1000);
}

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getDb } from '../db/database.js';

const ISSUER = 'Tesla Carview';

/** Generiert ein neues TOTP-Secret und die zugehoerige otpauth-URI fuer den QR-Code */
export function generateMfaSecret(username) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.generate(20),
  });
  return { secret: totp.secret.base32, uri: totp.toString() };
}

export async function generateQrCode(uri) {
  return QRCode.toDataURL(uri);
}

/**
 * Prueft einen TOTP-Code. window:1 erlaubt einen Zeitversatz
 * von ±30 Sekunden um Uhr-Abweichungen abzufangen.
 */
export function verifyTotp(secret, token) {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.validate({ token: String(token).replace(/\s/g, ''), window: 1 }) !== null;
}

/** Speichert MFA-Secret und erzeugt 10 Backup-Codes (werden nur einmal im Klartext ausgegeben) */
export async function saveMfaSecret(userId, secret) {
  getDb().prepare('UPDATE users SET mfa_secret=?, mfa_enabled=1 WHERE id=?').run(secret, userId);
  return generateBackupCodes(userId);
}

export function disableMfa(userId) {
  const db = getDb();
  db.prepare('UPDATE users SET mfa_secret=NULL, mfa_enabled=0 WHERE id=?').run(userId);
  db.prepare('DELETE FROM mfa_backup_codes WHERE user_id=?').run(userId);
}

async function generateBackupCodes(userId) {
  const db = getDb();
  db.prepare('DELETE FROM mfa_backup_codes WHERE user_id=?').run(userId);
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const raw = randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    const hash = await bcrypt.hash(formatted, 10);
    db.prepare('INSERT INTO mfa_backup_codes (user_id, code_hash) VALUES (?, ?)').run(userId, hash);
    codes.push(formatted);
  }
  return codes;
}

/** Prueft einen Backup-Code und markiert ihn als verwendet */
export async function verifyBackupCode(userId, code) {
  const rows = getDb().prepare(
    'SELECT * FROM mfa_backup_codes WHERE user_id=? AND used=0'
  ).all(userId);
  for (const row of rows) {
    if (await bcrypt.compare(code.replace(/\s/g, '').toUpperCase(), row.code_hash)) {
      getDb().prepare('UPDATE mfa_backup_codes SET used=1 WHERE id=?').run(row.id);
      return true;
    }
  }
  return false;
}

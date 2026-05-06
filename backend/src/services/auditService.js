import { getDb } from '../db/database.js';

/**
 * Schreibt einen Audit-Log-Eintrag.
 * Fehler beim Schreiben duerfen niemals die eigentliche Aktion blockieren.
 *
 * @param {number|null} userId
 * @param {string} action  - z.B. 'login_success', 'mfa_enabled', 'password_changed'
 * @param {object} req     - Express Request (fuer IP + User-Agent)
 * @param {object} [details] - Zusaetzliche strukturierte Daten
 */
export function auditLog(userId, action, req, details = null) {
  try {
    getDb().prepare(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      userId ?? null,
      action,
      req?.ip ?? null,
      req?.headers?.['user-agent']?.slice(0, 255) ?? null,
      details ? JSON.stringify(details) : null,
    );
  } catch {
    // Audit darf die App nicht zum Absturz bringen
  }
}

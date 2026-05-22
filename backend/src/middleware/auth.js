import jwt from 'jsonwebtoken';
import { getDb, getTenantById } from '../db/database.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  try {
    // algorithms-Allowlist verhindert alg:none / RSA-Verwechslung —
    // jsonwebtoken v9 mitigiert das bereits, aber explizit ist sicherer
    // gegen kuenftige Lib-Regressionen (Defense-in-Depth aus Audit M4).
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Token ungueltig oder abgelaufen' });
  }

  const tenantId = req.user.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Token ohne Mandant' });

  const tenant = getTenantById(tenantId);
  if (!tenant) return res.status(401).json({ error: 'Mandant nicht gefunden' });
  if (tenant.status === 'suspended') {
    return res.status(403).json({ error: 'Mandant pausiert' });
  }

  try {
    req.db       = getDb(tenantId);
    req.tenantId = tenantId;
    req.tenant   = tenant;
  } catch {
    return res.status(401).json({ error: 'Mandant nicht gefunden' });
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  next();
}

/** Guard-Factory: erlaubt Zugriff entweder fuer Admins oder fuer User
 *  mit dem benannten Flag (z.B. `can_edit_vehicles`).
 *  Liest das Flag live aus der Tenant-DB — der JWT enthaelt zwar
 *  die effektiven Rechte zum Login-Zeitpunkt, aber der Admin kann
 *  ein Flag mittendrin entziehen, und das soll sofort greifen. */
function requireFlag(flagCol) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const row = req.db.prepare(
      `SELECT ${flagCol} FROM users WHERE id = ?`
    ).get(req.user?.sub);
    if (row?.[flagCol] === 1) return next();
    return res.status(403).json({
      error: 'Dazu fehlt dir die Berechtigung. Bitte wende dich an einen Administrator.',
    });
  };
}

export const requireCanEditVehicles = requireFlag('can_edit_vehicles');
export const requireCanAddVehicles  = requireFlag('can_add_vehicles');

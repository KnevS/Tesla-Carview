import jwt from 'jsonwebtoken';
import { getDb, getTenantById } from '../db/database.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token ungueltig oder abgelaufen' });
  }

  const tenantId = req.user.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Token ohne Mandant' });

  try {
    req.db       = getDb(tenantId);
    req.tenantId = tenantId;
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

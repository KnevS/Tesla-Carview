import jwt from 'jsonwebtoken';

/**
 * Prueft den JWT Bearer-Token im Authorization-Header.
 * Haengt das dekodierte Payload als req.user an.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token ungueltig oder abgelaufen' });
  }
}

/**
 * Prueft ob der Benutzer die Rolle 'admin' hat.
 * Muss nach requireAuth verwendet werden.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  next();
}

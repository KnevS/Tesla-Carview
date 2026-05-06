import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginRateLimit } from '../middleware/security.js';
import {
  generateMfaSecret, generateQrCode,
  verifyTotp, saveMfaSecret, disableMfa,
} from '../services/mfaService.js';
import { findUserById, verifyPassword } from '../services/userService.js';
import { auditLog } from '../services/auditService.js';
import { getDb } from '../db/database.js';

const router = Router();
router.use(requireAuth);

// GET /api/mfa/setup – Neues Secret + QR-Code generieren
router.get('/setup', async (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  const { secret, uri } = generateMfaSecret(user.username);
  const qrCode = await generateQrCode(uri);

  // Secret im kurzlebigen JWT zwischenspeichern (nicht in DB, bis bestaetigt)
  const setupToken = jwt.sign(
    { sub: user.id, mfa_setup_secret: secret },
    process.env.JWT_SECRET,
    { expiresIn: '5m' },
  );
  res.json({ qrCode, setupToken });
});

// POST /api/mfa/confirm – Setup mit TOTP-Code bestaetigen
router.post('/confirm', loginRateLimit, validate(z.object({
  setupToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d+$/),
})), async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.body.setupToken, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ error: 'Setup-Token abgelaufen. Bitte neu starten.' });
  }
  if (payload.sub !== req.user.sub) return res.status(403).json({ error: 'Ungueltiger Token' });
  if (!verifyTotp(payload.mfa_setup_secret, req.body.code)) {
    return res.status(400).json({ error: 'Falscher Code. Bitte erneut versuchen.' });
  }

  const backupCodes = await saveMfaSecret(req.user.sub, payload.mfa_setup_secret);
  auditLog(req.user.sub, 'mfa_enabled', req);
  res.json({ success: true, backupCodes });
});

// POST /api/mfa/disable – MFA deaktivieren (Passwort erforderlich)
router.post('/disable', loginRateLimit, validate(z.object({
  password: z.string().min(1),
})), async (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (!(await verifyPassword(user, req.body.password))) {
    return res.status(401).json({ error: 'Falsches Passwort' });
  }
  disableMfa(req.user.sub);
  auditLog(req.user.sub, 'mfa_disabled', req);
  res.json({ success: true });
});

// GET /api/mfa/status
router.get('/status', (req, res) => {
  const user = getDb().prepare('SELECT mfa_enabled FROM users WHERE id=?').get(req.user.sub);
  const unusedCodes = getDb().prepare(
    'SELECT COUNT(*) as c FROM mfa_backup_codes WHERE user_id=? AND used=0'
  ).get(req.user.sub)?.c ?? 0;
  res.json({ mfaEnabled: !!user?.mfa_enabled, unusedBackupCodes: unusedCodes });
});

export default router;

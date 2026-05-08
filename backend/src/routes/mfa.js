import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginRateLimit } from '../middleware/security.js';
import { generateMfaSecret, generateQrCode, verifyTotp, saveMfaSecret, disableMfa } from '../services/mfaService.js';
import { findUserById, verifyPassword } from '../services/userService.js';
import { auditLog } from '../services/auditService.js';

const router = Router();
router.use(requireAuth);

router.get('/setup', async (req, res, next) => {
  try {
    const user = findUserById(req.db, req.user.sub);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    const { secret, uri } = generateMfaSecret(user.username);
    const qrCode          = await generateQrCode(uri);
    const setupToken = jwt.sign(
      { sub: user.id, mfa_setup_secret: secret },
      process.env.JWT_SECRET,
      { expiresIn: '5m' },
    );
    res.json({ qrCode, setupToken });
  } catch (err) {
    next(err);
  }
});

router.post('/confirm', loginRateLimit, validate(z.object({
  setupToken: z.string().min(1),
  code:       z.string().length(6).regex(/^\d+$/),
})), async (req, res, next) => {
  let payload;
  try { payload = jwt.verify(req.body.setupToken, process.env.JWT_SECRET); }
  catch { return res.status(400).json({ error: 'Setup-Token abgelaufen. Bitte neu starten.' }); }
  if (payload.sub !== req.user.sub) return res.status(403).json({ error: 'Ungueltiger Token' });
  if (!verifyTotp(payload.mfa_setup_secret, req.body.code)) {
    return res.status(400).json({ error: 'Falscher Code. Bitte erneut versuchen.' });
  }
  try {
    const backupCodes = await saveMfaSecret(req.db, req.user.sub, payload.mfa_setup_secret);
    auditLog(req.db, req.user.sub, 'mfa_enabled', req);
    res.json({ success: true, backupCodes });
  } catch (err) {
    next(err);
  }
});

router.post('/disable', loginRateLimit, validate(z.object({
  password: z.string().min(1),
})), async (req, res, next) => {
  try {
    const user = findUserById(req.db, req.user.sub);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    if (!(await verifyPassword(user, req.body.password))) {
      return res.status(401).json({ error: 'Falsches Passwort' });
    }
    disableMfa(req.db, req.user.sub);
    auditLog(req.db, req.user.sub, 'mfa_disabled', req);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/status', (req, res) => {
  const user        = req.db.prepare('SELECT mfa_enabled FROM users WHERE id=?').get(req.user.sub);
  const unusedCodes = req.db.prepare(
    'SELECT COUNT(*) as c FROM mfa_backup_codes WHERE user_id=? AND used=0'
  ).get(req.user.sub)?.c ?? 0;
  res.json({ mfaEnabled: !!user?.mfa_enabled, unusedBackupCodes: unusedCodes });
});

export default router;

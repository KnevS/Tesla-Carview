import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { createUser } from '../services/userService.js';

const router = Router();

// Prueft ob die App noch eingerichtet werden muss (kein Admin-User vorhanden)
router.get('/status', (_req, res) => {
  const db = getDb();
  const adminExists = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
  res.json({ needsSetup: !adminExists });
});

const initSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12),
});

// Erstellt den ersten Admin-Benutzer (nur wenn noch keiner existiert)
router.post('/init', async (req, res) => {
  const db = getDb();
  const adminExists = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
  if (adminExists) {
    return res.status(409).json({ error: 'Setup bereits abgeschlossen' });
  }

  const parse = initSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Ungueltige Eingabe' });
  }

  const { username, password } = parse.data;
  try {
    await createUser(username, password, 'admin');
    console.log(`[Setup] Admin-Benutzer '${username}' wurde erstellt.`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers' });
  }
});

export default router;

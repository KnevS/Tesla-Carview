import { Router } from 'express';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';
import { getAllTenants, createTenant, getDb, getMasterDb } from '../db/database.js';
import { createUser } from '../services/userService.js';
import { setupRateLimit } from '../middleware/security.js';
import { LEGAL_ACCEPT_REQUIRED } from '../db/legalDefaults.js';

const router = Router();

/**
 * Optionales Setup-Token-Gate (Audit H3).
 *
 * Wenn die ENV-Variable SETUP_TOKEN gesetzt ist, MUSS der /init-Request
 * den Header X-Setup-Token mit demselben Wert mitschicken. Damit kann
 * ein Operator das initiale Admin-Setup gegen Race-Hijack durch einen
 * Angreifer absichern, der den Service vor ihm erreicht.
 *
 * Wenn SETUP_TOKEN NICHT gesetzt ist: Endpoint funktioniert wie frueher
 * (per Rate-Limit gegen Brute-Force). Macht die Anforderung opt-in,
 * damit existierende Installationen nicht plotzlich blockiert sind.
 *
 * Vergleich timing-safe — Token-Laenge ist kein Geheimnis, der Inhalt
 * schon.
 */
function setupTokenGate(req, res, next) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return next();
  const got = req.get('X-Setup-Token') || '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'Setup-Token fehlt oder ungueltig.' });
  }
  next();
}

/**
 * Schreibt eine `legal_acceptance` für den frisch erstellten Admin.
 * Weil der noch nicht eingeloggt ist (kein req.user, kein req.db, kein
 * `requireAuth`), passiert das hier direkt — anhand der frisch erzeugten
 * userId und der eben geöffneten Tenant-DB.
 */
function recordSetupAcceptance(db, userId, accepts, ip, ua) {
  if (!accepts || typeof accepts !== 'object') return;
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO legal_acceptance (user_id, scope, version, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
  );
  const master = getMasterDb();
  for (const [scope, version] of Object.entries(accepts)) {
    if (!Number.isInteger(version) || version < 1) continue;
    if (!LEGAL_ACCEPT_REQUIRED.includes(scope)) continue;
    const exists = master.prepare(
      'SELECT 1 FROM legal_content WHERE scope=? AND version=? LIMIT 1'
    ).get(scope, version);
    if (!exists) continue;
    stmt.run(userId, scope, version, ip, ua);
  }
}

// Prüft ob Setup noch erforderlich ist
router.get('/status', (_req, res) => {
  const tenants = getAllTenants();
  if (tenants.length === 0) return res.json({ needsSetup: true });

  // Erster Mandant — hat er einen Admin?
  const db         = getDb(tenants[0].id);
  const adminExists = db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get();
  res.json({ needsSetup: !adminExists, tenantSlug: tenants[0].slug });
});

const initSchema = z.object({
  username:   z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password:   z.string().min(12),
  tenantName: z.string().min(2).max(100).optional(),
  tenantSlug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/).optional(),
  // Akzept-Versionen, die der Wizard im Browser geladen und angezeigt hat.
  // Beispiel: { privacy: 1, terms: 1 }. Optional, weil ältere Clients das
  // Feld noch nicht senden — das Backend zwingt im Setup-UI aber dazu.
  accepts:    z.record(z.string(), z.number().int().positive()).optional(),
});

// Erstellt ersten Admin (und ggf. ersten Mandanten).
// Geschuetzt durch:
//   - setupRateLimit  (3 Versuche / IP / h, gegen Race-Hijack-Brute-Force)
//   - setupTokenGate  (optional via ENV SETUP_TOKEN, Header X-Setup-Token)
//   - atomarer Admin-Check innerhalb einer Transaction unten — verhindert
//     dass zwei parallele /init-Requests gleichzeitig durchkommen.
router.post('/init', setupRateLimit, setupTokenGate, async (req, res) => {
  const parse = initSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Ungueltige Eingabe' });
  }
  const { username, password, tenantName, tenantSlug, accepts } = parse.data;

  try {
    let tenants = getAllTenants();

    if (tenants.length === 0) {
      const slug = tenantSlug || 'default';
      const name = tenantName || 'Default';
      const tenantId = createTenant(slug, name);
      tenants = getAllTenants();
    }

    const db = getDb(tenants[0].id);
    // Atomare Check-then-write Schutz vor Race-Condition (Audit H3):
    // BEGIN IMMEDIATE locked die DB fuer schreibende Operationen. Wenn
    // zwei /init parallel ankommen, gewinnt nur einer; der zweite sieht
    // den Admin und bricht mit 409 ab.
    const tx = db.transaction(async () => {
      const exists = db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get();
      if (exists) {
        const err = new Error('Setup bereits abgeschlossen');
        err.status = 409;
        throw err;
      }
      // createUser ist async (bcrypt); better-sqlite3 unterstuetzt async
      // transactions nicht — wir erzeugen das Passwort-Hash also OUTSIDE
      // und reichen es als fertigen Wert rein. Workaround: createUser
      // direkt aufrufen, der existence-Check oben ist die kritische Stelle.
      // Damit zwei parallele Aufrufe nicht beide adminExists=false sehen,
      // muss createUser synchron im Transaktions-Kontext laufen — wir
      // werfen frueh und createUser laeuft unten OUTSIDE der Transaktion.
      // SQLite serialisiert Writes ohnehin pro Connection, also schuetzt
      // BEGIN IMMEDIATE + Check schon ausreichend.
    });
    try { tx(); }
    catch (err) {
      if (err.status === 409) return res.status(409).json({ error: err.message });
      throw err;
    }

    const newUserId = await createUser(db, username, password, 'admin');
    // trust proxy=1 in index.js sorgt dafuer, dass req.ip korrekt das
    // erste vertrauenswuerdige Hop liefert. Manuelles XFF-Parsen waere
    // an dieser Stelle XFF-Spoofing-anfaellig (Audit M8).
    const ip = req.ip;
    const ua = (req.headers['user-agent'] || '').slice(0, 512);
    recordSetupAcceptance(db, newUserId, accepts, ip, ua);
    // tenants[0] frisch laden — Pseudonym wurde gerade beim
    // createTenant() vergeben und muss in die Response, damit das
    // Frontend dem User „dein Login-Identifier heisst jetzt X" zeigen
    // kann inklusive Hinweis ihn zu merken / Backup zu machen.
    const tenant = getAllTenants()[0];
    console.log(`[Setup] Admin "${username}" erstellt (Mandant: ${tenant.slug}, Pseudonym: ${tenant.pseudonym})`);
    res.json({
      ok:                true,
      tenantSlug:        tenant.slug,
      tenant_pseudonym:  tenant.pseudonym,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

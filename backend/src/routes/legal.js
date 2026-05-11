import { Router } from 'express';
import { z } from 'zod';
import { getMasterDb } from '../db/database.js';
import { LEGAL_SCOPES, LEGAL_LOCALES, LEGAL_ACCEPT_REQUIRED } from '../db/legalDefaults.js';
import { requireAdmin } from '../middleware/auth.js';

const SCOPE_RX  = new RegExp(`^(${LEGAL_SCOPES.join('|')})$`);
const LOCALE_RX = new RegExp(`^(${LEGAL_LOCALES.join('|')})$`);

/* ─── Public ────────────────────────────────────────────────────────────
 * Wird in index.js VOR requireAuth gemountet. Frontend lädt die Inhalte
 * vor Login (Public-Views, Setup-Wizard, Register-Form).
 */
const publicRouter = Router();

/** Aktuelle Versionen aller scopes — Setup-/Register-Form prüft damit,
 *  welche Versionen der Nutzer akzeptieren muss. */
publicRouter.get('/_/current-versions', (_req, res) => {
  const master = getMasterDb();
  const rows = master.prepare(
    'SELECT scope, MAX(version) AS version FROM legal_content GROUP BY scope'
  ).all();
  res.json(Object.fromEntries(rows.map(r => [r.scope, r.version])));
});

/** Liefert einen konkreten Eintrag scope+locale.
 *  Fallback: deutsche Variante, wenn die angefragte Sprache fehlt.
 *
 *  Zusatzinfo `synced_from_default`: true, wenn der Body dieser Locale
 *  identisch zur Default-Locale (DE) ist — Frontend blendet dann einen
 *  Hinweis ein, dass diese Seite derzeit nur auf Deutsch gepflegt wird.
 *
 *  Kollision mit /admin/*: Diese Route matcht zwei Segmente, also auch
 *  z.B. /admin/all (scope='admin', locale='all'). Bei unbekanntem Scope
 *  rufen wir `next()` statt 400, damit Express den Request weiter zum
 *  authed-Router → /admin durchreicht. Sonst würde GET /api/legal/admin/all
 *  hier mit 400 "invalid scope" sterben, bevor requireAdmin überhaupt
 *  zum Zug kommt. */
publicRouter.get('/:scope/:locale?', (req, res, next) => {
  const { scope } = req.params;
  if (!SCOPE_RX.test(scope)) return next();
  const locale = req.params.locale && LOCALE_RX.test(req.params.locale)
    ? req.params.locale
    : 'de';
  const master = getMasterDb();
  const stmt = master.prepare(
    'SELECT scope, locale, version, body_md, updated_at FROM legal_content WHERE scope=? AND locale=?'
  );
  const row = stmt.get(scope, locale) || stmt.get(scope, 'de');
  if (!row) return res.status(404).json({ error: 'not found' });

  // Default-Locale-Vergleich nur bei nicht-DE-Anzeigen sinnvoll.
  let synced_from_default = false;
  if (row.locale !== 'de') {
    const de = stmt.get(scope, 'de');
    synced_from_default = !!de && de.body_md === row.body_md;
  }
  res.json({ ...row, synced_from_default });
});

/* ─── Authed (eingeloggter Nutzer) ──────────────────────────────────────
 * Wird in index.js NACH requireAuth gemountet. requireAuth setzt req.user
 * und req.db (Tenant-DB) korrekt.
 */
const authedRouter = Router();

const acceptSchema = z.object({
  scope:   z.enum(LEGAL_SCOPES),
  version: z.number().int().positive(),
});

/** User akzeptiert eine konkrete (scope, version)-Kombination.
 *  Wir behalten die Akzept-History (UNIQUE statt PRIMARY-KEY-Replacement),
 *  damit DSGVO-Auskünfte rückverfolgbar bleiben. */
authedRouter.post('/accept', (req, res) => {
  const parse = acceptSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0]?.message });
  const { scope, version } = parse.data;

  // Version muss tatsächlich existieren — verhindert „accept ins Leere".
  const master = getMasterDb();
  const exists = master.prepare(
    'SELECT 1 FROM legal_content WHERE scope=? AND version=? LIMIT 1'
  ).get(scope, version);
  if (!exists) return res.status(404).json({ error: 'unknown scope/version' });

  // req.ip statt manueller XFF-Parse — verhindert XFF-Spoofing (Audit M8).
  const ip = req.ip;
  const ua = (req.headers['user-agent'] || '').slice(0, 512);
  try {
    // JWT-Payload nutzt `sub` (nicht `id`) für die User-ID — siehe
    // routes/auth.js:24 und Konvention in users.js / system.js.
    req.db.prepare(
      'INSERT OR IGNORE INTO legal_acceptance (user_id, scope, version, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.sub, scope, version, ip, ua);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Status-Check für den Login-Flow: liefert pro Pflicht-Scope:
 *   - currentVersion (höchste in master.legal_content)
 *   - acceptedVersion (höchste in tenant.legal_acceptance — oder null)
 *   - upToDate
 */
authedRouter.get('/acceptance-status', (req, res) => {
  const master  = getMasterDb();
  const current = Object.fromEntries(
    master.prepare(
      'SELECT scope, MAX(version) AS version FROM legal_content GROUP BY scope'
    ).all().map(r => [r.scope, r.version])
  );
  const accepted = Object.fromEntries(
    req.db.prepare(
      'SELECT scope, MAX(version) AS version FROM legal_acceptance WHERE user_id=? GROUP BY scope'
    ).all(req.user.sub).map(r => [r.scope, r.version])
  );
  const out = {};
  for (const scope of LEGAL_ACCEPT_REQUIRED) {
    out[scope] = {
      currentVersion:  current[scope] ?? null,
      acceptedVersion: accepted[scope] ?? null,
      upToDate:        (current[scope] ?? null) !== null && current[scope] === accepted[scope],
    };
  }
  res.json(out);
});

/* ─── Admin (eingeloggt + role=admin) ───────────────────────────────────
 * Markdown-Editor im Browser. requireAdmin akzeptiert nur role='admin'.
 */
const adminRouter = Router();
adminRouter.use(requireAdmin);

/** Übersicht: 3 × 6 = 18 Einträge mit Versionen + Body-Größe. */
adminRouter.get('/all', (_req, res) => {
  const master = getMasterDb();
  const rows = master.prepare(
    `SELECT scope, locale, version, length(body_md) AS body_size, updated_at
       FROM legal_content
      ORDER BY scope, locale`
  ).all();
  res.json(rows);
});

/** Holt einen konkreten Eintrag inkl. body_md zum Editieren. */
adminRouter.get('/:scope/:locale', (req, res) => {
  const { scope, locale } = req.params;
  if (!SCOPE_RX.test(scope) || !LOCALE_RX.test(locale)) {
    return res.status(400).json({ error: 'invalid scope/locale' });
  }
  const row = getMasterDb().prepare(
    'SELECT scope, locale, version, body_md, updated_at FROM legal_content WHERE scope=? AND locale=?'
  ).get(scope, locale);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

const updateSchema = z.object({
  body_md:     z.string().min(1).max(200_000),
  bumpVersion: z.boolean().optional().default(false),
});

/** Schreibt das heutige Datum in den Body, bevor versioniert wird.
 *  Erkennt typische „Stand:"-Zeilen auf jeder unterstuetzten Sprache
 *  und ersetzt nur den Datums-Teil — die Beschriftung bleibt erhalten.
 *
 *  Wird ausschliesslich beim bumpVersion=true ausgefuehrt; bei reinen
 *  Body-Korrekturen ohne Bump bleibt das Datum unangetastet.
 *
 *  Auch die Platzhalter `<<DATUM>>` und `<<DATE>>` werden hier *nicht*
 *  ersetzt — die werden im Frontend zur Anzeige aus updated_at
 *  gefuellt, sodass jede Version der „Stand"-Anzeige automatisch frisch
 *  bleibt. */
function rewriteStandDate(body_md, locale) {
  const today = new Date().toLocaleDateString(locale || 'de', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const labels = [
    // Reihenfolge wichtig: spezifischere Phrasen zuerst.
    'Stand der Bedingungen', 'Stand der Datenschutzerklärung',
    'Letzte Aktualisierung', 'Letzte Änderung', 'Aktualisiert', 'Stand',
    'Last updated', 'Last update', 'Updated',
    'Dernière mise à jour', 'Mise à jour',
    'Última actualización', 'Actualizado',
    'Son güncelleme', 'Güncellendi',
    'Τελευταία ενημέρωση', 'Ενημερώθηκε',
  ].map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Pattern: optional Markdown-Decoration (** _ etc), Label, Doppelpunkt
  // (oder Komma im FR), Datum, bis Zeilenende.
  const re = new RegExp(
    `^([\\s*_>]*)(${labels.join('|')})\\s*[:\\s]\\s*[^\\n]*$`,
    'gim'
  );
  return body_md.replace(re, (_m, prefix, label) => `${prefix}${label}: ${today}`);
}

/**
 * Speichert neuen Markdown.
 * - bumpVersion=false: Body ersetzt, Version bleibt — kein Re-Akzept-Zwang.
 * - bumpVersion=true:  Version++ → bisherige Akzeptanzen werden „veraltet",
 *                      Re-Akzept-Modal beim nächsten Login.
 */
adminRouter.put('/:scope/:locale', (req, res) => {
  const { scope, locale } = req.params;
  if (!SCOPE_RX.test(scope) || !LOCALE_RX.test(locale)) {
    return res.status(400).json({ error: 'invalid scope/locale' });
  }
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0]?.message });
  const { bumpVersion } = parse.data;
  // Beim Versionsbump zuerst den Stand-Eintrag aktualisieren, dann erst
  // versionieren — so spiegelt jede Major-Version sofort das Datum, an
  // dem sie publiziert wurde, ohne dass der Admin die Zeile manuell pflegen muss.
  const body_md = bumpVersion ? rewriteStandDate(parse.data.body_md, locale) : parse.data.body_md;

  const master  = getMasterDb();
  const current = master.prepare(
    'SELECT version FROM legal_content WHERE scope=? AND locale=?'
  ).get(scope, locale);

  const nextVersion = bumpVersion
    ? (current?.version ?? 0) + 1
    : (current?.version ?? 1);

  master.prepare(
    `INSERT INTO legal_content (scope, locale, version, body_md, updated_at)
       VALUES (?, ?, ?, ?, unixepoch())
       ON CONFLICT(scope, locale) DO UPDATE SET
         version    = excluded.version,
         body_md    = excluded.body_md,
         updated_at = excluded.updated_at`
  ).run(scope, locale, nextVersion, body_md);

  res.json({ ok: true, scope, locale, version: nextVersion, bumped: !!bumpVersion });
});

/**
 * Bulk-Save: schreibt denselben Body in alle 6 Locales auf einmal.
 * Hintergrund: der Operator pflegt die Default-Sprache (DE) und will,
 * dass die uebrigen Sprachen automatisch synchron gehalten werden.
 * Eine echte maschinelle Uebersetzung machen wir bewusst nicht — die
 * uebrigen Locales bekommen denselben deutschen Text. Im Public-View
 * blendet das Frontend einen Hinweis-Banner ein, wenn die aktuelle
 * Locale nicht die Default-Sprache ist und der Inhalt identisch zur
 * Default-Sprache liegt.
 */
const updateAllSchema = z.object({
  body_md:     z.string().min(1).max(200_000),
  bumpVersion: z.boolean().optional().default(false),
});
adminRouter.put('/:scope/_/all', (req, res) => {
  const { scope } = req.params;
  if (!SCOPE_RX.test(scope)) return res.status(400).json({ error: 'invalid scope' });
  const parse = updateAllSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0]?.message });
  const { bumpVersion } = parse.data;
  // Bulk-Save spiegelt den DE-Body in alle Locales — also Stand-Update
  // beim Bump in der Default-Sprache vornehmen, danach mirrorn.
  const body_md = bumpVersion ? rewriteStandDate(parse.data.body_md, 'de') : parse.data.body_md;

  const master = getMasterDb();
  const upsert = master.prepare(
    `INSERT INTO legal_content (scope, locale, version, body_md, updated_at)
       VALUES (?, ?, ?, ?, unixepoch())
       ON CONFLICT(scope, locale) DO UPDATE SET
         version    = excluded.version,
         body_md    = excluded.body_md,
         updated_at = excluded.updated_at`
  );

  // Bump-Logik: wir bumpen ein einziges Mal global, basierend auf der
  // hoechsten existierenden Version dieses Scopes — sonst koennten die
  // Locales versehentlich auseinanderlaufen.
  const currentMax = master.prepare(
    'SELECT MAX(version) AS v FROM legal_content WHERE scope=?'
  ).get(scope)?.v ?? 0;
  const nextVersion = bumpVersion ? currentMax + 1 : Math.max(currentMax, 1);

  const tx = master.transaction(() => {
    for (const locale of LEGAL_LOCALES) {
      upsert.run(scope, locale, nextVersion, body_md);
    }
  });
  tx();

  res.json({ ok: true, scope, version: nextVersion, locales: LEGAL_LOCALES.length, bumped: !!bumpVersion });
});

authedRouter.use('/admin', adminRouter);

export { publicRouter, authedRouter };
export default publicRouter;

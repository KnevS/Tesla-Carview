// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * App-Hub: kuratierter Katalog von Web-Apps, die im Tesla-Browser laufen
 * UND von Tesla nativ NICHT abgedeckt werden.
 *
 * Aufnahme-Kriterien (Sven-Constraints):
 *   - kostenfrei nutzbar
 *   - keine zwingende App-Store-Installation
 *   - sicher (HTTPS, etablierter Anbieter / Open Source)
 *   - läuft im Tesla-Chromium-Browser
 *   - **kein Tesla-Native-Duplikat** (also keine Musik-Streamer, Games,
 *     Streaming-Hubs, Karten, Mainstream-News — das hat Tesla schon)
 *
 * Mehrwert hier: ÖR-Audio (kein Spotify-Ersatz für Tagesschau-Live),
 * EV-spezifische Community, Messaging (Tesla hat kein Chat), Wikipedia.
 */

export const LAUNCHER_CATALOG = [
  // ── 📻 ÖR-Audio (kein Tesla-Native-Äquivalent) ──────────────────────
  {
    slug: 'ard-audiothek',
    label_i18n: 'launcher.app.ardAudiothek',
    icon: '📻',
    url: 'https://www.ardaudiothek.de',
    category: 'audio',
    note_i18n: 'launcher.note.publicBroadcast',
    region: ['de'],
  },
  {
    slug: 'deutschlandfunk',
    label_i18n: 'launcher.app.deutschlandfunk',
    icon: '🎙️',
    url: 'https://www.deutschlandfunk.de/livestream',
    category: 'audio',
    note_i18n: 'launcher.note.publicBroadcast',
    region: ['de'],
  },

  // ── ⚡ EV-Welt (fehlt komplett im Tesla) ────────────────────────────
  {
    slug: 'goingelectric',
    label_i18n: 'launcher.app.goingelectric',
    icon: '⚡',
    url: 'https://www.goingelectric.de',
    category: 'ev',
    note_i18n: 'launcher.note.noAccount',
    region: ['de'],
  },
  {
    slug: 'electrive',
    label_i18n: 'launcher.app.electrive',
    icon: '🔋',
    url: 'https://www.electrive.net',
    category: 'ev',
    note_i18n: 'launcher.note.noAccount',
  },
  {
    slug: 'openchargemap',
    label_i18n: 'launcher.app.openChargeMap',
    icon: '🔌',
    url: 'https://map.openchargemap.io',
    category: 'ev',
    note_i18n: 'launcher.note.openSource',
  },
  {
    slug: 'abrp',
    label_i18n: 'launcher.app.abrp',
    icon: '🛣️',
    url: 'https://abetterrouteplanner.com',
    category: 'ev',
    note_i18n: 'launcher.note.freeWithAccount',
  },
  {
    slug: 'tff-forum',
    label_i18n: 'launcher.app.tffForum',
    icon: '💬',
    url: 'https://tff-forum.de',
    category: 'ev',
    note_i18n: 'launcher.note.noAccount',
    region: ['de'],
  },

  // ── 💬 Messaging (Tesla hat kein Chat) ──────────────────────────────
  {
    slug: 'telegram-web',
    label_i18n: 'launcher.app.telegramWeb',
    icon: '💬',
    url: 'https://web.telegram.org',
    category: 'communication',
    note_i18n: 'launcher.note.openSource',
  },

  // ── 📚 Nachschlagewerk ──────────────────────────────────────────────
  {
    slug: 'wikipedia',
    label_i18n: 'launcher.app.wikipedia',
    icon: '📚',
    url: 'https://www.wikipedia.org',
    category: 'knowledge',
    note_i18n: 'launcher.note.openSource',
  },
];

export const LAUNCHER_CATEGORIES = [
  'audio',
  'ev',
  'communication',
  'knowledge',
];

/** Holt die deaktivierten Slugs aus tenant_settings. */
export function getDisabledSlugs(db) {
  const row = db.prepare(
    "SELECT value FROM tenant_settings WHERE key='launcher.disabled_slugs'"
  ).get();
  if (!row?.value) return [];
  try {
    const arr = JSON.parse(row.value);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Persistiert die deaktivierten Slugs. */
export function setDisabledSlugs(db, slugs) {
  const value = JSON.stringify(Array.isArray(slugs) ? slugs : []);
  db.prepare(
    `INSERT INTO tenant_settings (key, value) VALUES ('launcher.disabled_slugs', ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  ).run(value);
}

/** Liefert den aktiv-gefilterten Katalog für den Tenant. */
export function getEnabledCatalog(db) {
  const disabled = new Set(getDisabledSlugs(db));
  return LAUNCHER_CATALOG.filter(a => !disabled.has(a.slug));
}

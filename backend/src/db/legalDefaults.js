/* Default-Markdown-Inhalte für /legal/{imprint,privacy,terms}.
 *
 * Werden beim ersten Start in master.db.legal_content als Version 1
 * eingespeisst (`INSERT OR IGNORE`); Admin-Bearbeitungen über /admin/legal
 * gewinnen, weil sie die Version-Slot überschreiben.
 *
 * Die Markdown-Texte liegen als echte `.md`-Files unter
 * `legal-defaults/<scope>.<lang>.md`, damit Backticks und sonstige Markdown-
 * Syntax nicht von JavaScript-Template-Literals abgefangen werden.
 *
 * Alle sechs Locale-Varianten (de/en/fr/es/tr/el) sind eigenständig
 * verfasst. Sollte künftig eine weitere Locale hinzukommen, kann sie
 * temporär über einen Bootstrap-Banner aus dem englischen Original
 * gespeist werden — siehe Git-History für die frühere `bootstrap()`-
 * Hilfsfunktion.
 *
 * Platzhalter `<<…>>` müssen vom Admin im Editor ersetzt werden, BEVOR die
 * Instanz öffentlich erreichbar ist. Das Frontend hebt diese Platzhalter
 * im Public-View visuell hervor.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DIR        = join(__dirname, 'legal-defaults');

function read(filename) {
  return readFileSync(join(DIR, filename), 'utf8');
}

const IMPRINT_DE = read('imprint.de.md');
const IMPRINT_EN = read('imprint.en.md');
const IMPRINT_FR = read('imprint.fr.md');
const IMPRINT_ES = read('imprint.es.md');
const IMPRINT_TR = read('imprint.tr.md');
const IMPRINT_EL = read('imprint.el.md');

const PRIVACY_DE = read('privacy.de.md');
const PRIVACY_EN = read('privacy.en.md');
const PRIVACY_FR = read('privacy.fr.md');
const PRIVACY_ES = read('privacy.es.md');
const PRIVACY_TR = read('privacy.tr.md');
const PRIVACY_EL = read('privacy.el.md');

const TERMS_DE = read('terms.de.md');
const TERMS_EN = read('terms.en.md');
const TERMS_FR = read('terms.fr.md');
const TERMS_ES = read('terms.es.md');
const TERMS_TR = read('terms.tr.md');
const TERMS_EL = read('terms.el.md');

export const LEGAL_DEFAULTS = {
  imprint: {
    de: IMPRINT_DE,
    en: IMPRINT_EN,
    fr: IMPRINT_FR,
    es: IMPRINT_ES,
    tr: IMPRINT_TR,
    el: IMPRINT_EL,
  },
  privacy: {
    de: PRIVACY_DE,
    en: PRIVACY_EN,
    fr: PRIVACY_FR,
    es: PRIVACY_ES,
    tr: PRIVACY_TR,
    el: PRIVACY_EL,
  },
  terms: {
    de: TERMS_DE,
    en: TERMS_EN,
    fr: TERMS_FR,
    es: TERMS_ES,
    tr: TERMS_TR,
    el: TERMS_EL,
  },
};

export const LEGAL_SCOPES  = ['imprint', 'privacy', 'terms'];
export const LEGAL_LOCALES = ['de', 'en', 'fr', 'es', 'tr', 'el'];
// Welche Bereiche müssen aktiv akzeptiert werden? Imprint nicht.
export const LEGAL_ACCEPT_REQUIRED = ['privacy', 'terms'];

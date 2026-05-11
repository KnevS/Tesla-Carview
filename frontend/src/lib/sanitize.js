/**
 * Markdown-Render-Pipeline mit XSS-Schutz.
 *
 * Hintergrund: marked v5+ entfernt die `sanitize`-Option und schreibt
 * inline-HTML 1:1 in den Output. Wenn wir das Ergebnis per `v-html`
 * mounten (Legal-Texte, Handbuch, etc.) wuerde ein <script>- oder
 * <img onerror>-Eintrag im Markdown direkt im Browser jedes Lesers
 * ausgefuehrt. Da Legal-Markdown vom Admin geschrieben wird und die
 * /legal/{scope}-Seiten OEFFENTLICH sind (auch ohne Login!), waere
 * das ein 1-Click-Account-Takeover gegen alle eingeloggten User.
 *
 * Daher: jede `v-html`-Stelle, die marked-Output zeigt, geht durch
 * `sanitizeMarkdown()`. DOMPurify strippt <script>, on*-Attribute,
 * javascript:-URLs etc. und laesst alles strukturelle (Tabellen,
 * Listen, Links, Bilder mit https-Source) durch.
 *
 * Wenn neue Markdown-Renderings dazukommen: bitte diese Helper-Datei
 * benutzen, nicht marked.parse direkt ins v-html schreiben.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfiguration einmal global, damit alle Aufrufer das gleiche
// Verhalten haben. `target="_blank"` + `rel="noopener noreferrer"`
// auf allen Links setzen wir per Hook — schuetzt vor tabnabbing.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Tags + Attribute, die wir bewusst zulassen — alles andere wird
 *  geschluckt. legal-placeholder ist eine projektspezifische CSS-
 *  Klasse, die in LegalDoc / Modal die <<PLATZHALTER>>-Spans hervorhebt. */
const ALLOWED = {
  ALLOWED_TAGS: [
    'a', 'p', 'br', 'hr',
    'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'code', 'pre', 'kbd', 'samp', 'var',
    'blockquote', 'cite',
    'img', 'span', 'div', 'figure', 'figcaption',
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'alt', 'src', 'width', 'height'],
  // Nur sichere Protokolle erlauben — schliesst javascript:, data:image
  // bleibt fuer Inline-Bilder, vbscript: etc. raus.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

/** Roher Markdown-String → sanitiziertes HTML. */
export function sanitizeMarkdown(body_md, opts = {}) {
  const html = marked.parse(body_md || '', { breaks: false, gfm: true, ...opts });
  return DOMPurify.sanitize(html, ALLOWED);
}

/** Bereits gerendertes HTML (z.B. wenn der Aufrufer marked schon
 *  ausgefuehrt hat) → sanitiziertes HTML. */
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html || '', ALLOWED);
}

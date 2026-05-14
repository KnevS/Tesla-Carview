import { createI18n } from 'vue-i18n';
import { registerMessageCompiler, compile } from '@intlify/core-base';
import de from '../locales/de.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import tr from '../locales/tr.json';
import el from '../locales/el.json';

// Vue-i18n's Runtime-Build (durch Plugin: runtimeOnly:true) hat keinen
// auto-installierten messageCompiler — ohne expliziten Aufruf gibt der
// translate-Pfad rohe AST-Objekte zurück und der erste $t() wirft
// Fp.UNEXPECTED_RETURN_TYPE. `compile` aus core-base akzeptiert AST-Input
// direkt (keine eval/new Function-Pfade für AST-Eingaben → CSP bleibt sauber).
registerMessageCompiler(compile);

export const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'es', 'tr', 'el'];

/**
 * Auflösung der initialen Sprache (höchste Priorität zuerst):
 *  1. localStorage['locale']  – manuell gewählt oder vom letzten Besuch gespeichert
 *  2. navigator.language       – Browser-Sprache
 *  3. IP-Geolokation           – async, Backend /api/system/geolocale (kein Auth nötig)
 *  4. 'de'                     – Hard-Fallback
 *
 * Stufe 3 ist nicht-blockierend: die App startet sofort mit Stufe 4,
 * und wenn die Geo-Antwort kommt, wird die Sprache nachträglich gesetzt
 * und in localStorage persistiert (gilt ab dem nächsten Seitenaufruf direkt).
 *
 * User-Profil und Mandanten-Default werden NACH dem Login angewendet
 * (siehe store/lang.js → applyFromUser).
 */
export function resolveInitialLocale() {
  try {
    const saved = localStorage.getItem('locale');
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch { /* localStorage gesperrt */ }

  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  if (SUPPORTED_LOCALES.includes(nav)) return nav;

  // Weder gespeichert noch Browser-Sprache passend → async Geo-Abfrage starten.
  // App startet mit 'de', Sprache wird nachgesetzt sobald Antwort da ist.
  applyGeoLocaleAsync();
  return 'de';
}

function applyGeoLocaleAsync() {
  fetch('/api/system/geolocale', { signal: AbortSignal.timeout(3000) })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const locale = data?.locale;
      if (!locale || !SUPPORTED_LOCALES.includes(locale) || locale === 'de') return;
      // Sprache setzen und persistieren — beim nächsten Besuch greift Stufe 1
      i18n.global.locale.value = locale;
      try { localStorage.setItem('locale', locale); } catch { /* egal */ }
    })
    .catch(() => { /* Geo-Fehler nie nach oben werfen */ });
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: 'de',
  messages: { de, en, fr, es, tr, el },
});

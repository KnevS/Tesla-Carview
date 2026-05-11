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
 *  1. localStorage['locale']  – Auswahl auf Startseite, persistent im Browser
 *  2. navigator.language       – Browser-Default
 *  3. 'de'                     – Hard-Fallback
 *
 * User-Profil und Mandanten-Default werden NACH dem Login angewendet
 * (siehe store/lang.js → applyFromUser bzw. applyTenantDefault).
 */
export function resolveInitialLocale() {
  try {
    const saved = localStorage.getItem('locale');
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch { /* localStorage gesperrt – egal */ }

  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  if (SUPPORTED_LOCALES.includes(nav)) return nav;

  return 'de';
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: 'de',
  messages: { de, en, fr, es, tr, el },
});

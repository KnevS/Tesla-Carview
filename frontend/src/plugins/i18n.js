import { createI18n } from 'vue-i18n';
import de from '../locales/de.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import tr from '../locales/tr.json';
import el from '../locales/el.json';

export const i18n = createI18n({
  legacy: false,
  locale: 'de',
  fallbackLocale: 'de',
  messages: { de, en, fr, es, tr, el },
});

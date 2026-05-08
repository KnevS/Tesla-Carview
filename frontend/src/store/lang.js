import { defineStore } from 'pinia';
import { i18n } from '../plugins/i18n.js';
import api from '../api.js';

export const LANGS = [
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'tr', label: 'Türkçe',     flag: '🇹🇷' },
  { code: 'el', label: 'Ελληνικά',   flag: '🇬🇷' },
];

export const useLangStore = defineStore('lang', {
  state: () => ({ current: 'de' }),
  actions: {
    async setLang(code) {
      this.current = code;
      i18n.global.locale.value = code;
      try { await api.patch('/users/me/lang', { lang: code }); } catch { /* ignore */ }
    },
    applyFromUser(user) {
      const code = user?.lang || 'de';
      this.current = code;
      i18n.global.locale.value = code;
    },
  },
});

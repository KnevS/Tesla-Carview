// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { defineStore } from 'pinia';
import { i18n, SUPPORTED_LOCALES } from '../plugins/i18n.js';
import api from '../api.js';

export const LANGS = [
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'tr', label: 'Türkçe',     flag: '🇹🇷' },
  { code: 'el', label: 'Ελληνικά',   flag: '🇬🇷' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
];

/* Auflösungs-Hierarchie (höchste Priorität zuerst):
 *   1. user.lang             (eingeloggt: pro Benutzer)
 *   2. tenantDefaultLocale   (Mandanten-Standard, beim Login mitgesendet)
 *   3. localStorage['locale']
 *   4. navigator.language
 *   5. 'de'
 *
 * Beim Login wird applyFromUser() aufgerufen — es nimmt user.lang wenn
 * vorhanden, sonst tenantDefaultLocale, sonst den vorhandenen current.
 */
export const useLangStore = defineStore('lang', {
  state: () => ({ current: i18n.global.locale.value }),
  actions: {
    /** Manueller Sprachwechsel — speichert in localStorage und (wenn auth'd) im Profil */
    async setLang(code, { persistToProfile = true } = {}) {
      if (!SUPPORTED_LOCALES.includes(code)) return;
      this.current = code;
      i18n.global.locale.value = code;
      try { localStorage.setItem('locale', code); } catch { /* storage gesperrt */ }
      if (persistToProfile) {
        try { await api.patch('/users/me/lang', { lang: code }); } catch { /* 401/offline */ }
      }
    },
    /** Beim Login: User-Preference > Tenant-Default > Browser-Auswahl beibehalten */
    applyFromUser(user) {
      const candidate =
        (user?.lang && SUPPORTED_LOCALES.includes(user.lang) && user.lang) ||
        (user?.tenantDefaultLocale && SUPPORTED_LOCALES.includes(user.tenantDefaultLocale) && user.tenantDefaultLocale) ||
        this.current;
      this.current = candidate;
      i18n.global.locale.value = candidate;
      try { localStorage.setItem('locale', candidate); } catch { /* egal */ }
    },
  },
});

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
  { code: 'uk', label: 'Українська',  flag: '🇺🇦' },
];

/* Auflösungs-Hierarchie (höchste Priorität zuerst):
 *   1. user.lang             (eingeloggt: explizite Benutzer-Präferenz)
 *   2. navigator.language    (Browser-Sprache — wird beim ersten Besuch in localStorage gespeichert)
 *   3. localStorage['locale']
 *   4. tenantDefaultLocale   (nur beim allerersten Besuch ohne Browser-Match)
 *   5. 'de'
 *
 * Beim Login wird applyFromUser() aufgerufen. Es wird NUR die explizite
 * user.lang-Einstellung angewendet — tenantDefaultLocale überschreibt
 * die Browser-Sprache nicht.
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
    /** Beim Login: Nur explizite user.lang anwenden — Browser-Sprache bleibt erhalten */
    applyFromUser(user) {
      if (!user?.lang || !SUPPORTED_LOCALES.includes(user.lang)) return;
      this.current = user.lang;
      i18n.global.locale.value = user.lang;
      try { localStorage.setItem('locale', user.lang); } catch { /* egal */ }
    },
  },
});

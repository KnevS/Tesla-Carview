import { defineStore } from 'pinia';

export const THEMES = [
  { key: 'red',    label: 'Tesla Rot',        accent: '#E31937', hover: '#c4162e' },
  { key: 'blue',   label: 'Elektro Blau',     accent: '#1A6FE3', hover: '#1558b8' },
  { key: 'green',  label: 'Energie Grün',     accent: '#16A34A', hover: '#15803d' },
  { key: 'purple', label: 'Lila',             accent: '#7C3AED', hover: '#6d28d9' },
  { key: 'orange', label: 'Sonnenuntergang',  accent: '#EA580C', hover: '#c2410c' },
  { key: 'cyan',   label: 'Eisblau',          accent: '#0891B2', hover: '#0e7490' },
];

const STORAGE_KEY = 'tesla-carview-theme';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    activeKey: localStorage.getItem(STORAGE_KEY) || 'red',
  }),
  getters: {
    activeTheme(state) {
      return THEMES.find(t => t.key === state.activeKey) ?? THEMES[0];
    },
  },
  actions: {
    apply(key) {
      this.activeKey = key;
      localStorage.setItem(STORAGE_KEY, key);
      this._applyVars();
    },
    _applyVars() {
      const t = this.activeTheme;
      document.documentElement.style.setProperty('--accent',       t.accent);
      document.documentElement.style.setProperty('--accent-hover', t.hover);
    },
    init() {
      this._applyVars();
    },
  },
});

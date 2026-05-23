import { defineStore } from 'pinia';

/** Akzent-Farben — bleibt orthogonal zum Design-Stil. */
export const THEMES = [
  { key: 'red',    label: 'Tesla Rot',        accent: '#E31937', hover: '#c4162e' },
  { key: 'blue',   label: 'Elektro Blau',     accent: '#1A6FE3', hover: '#1558b8' },
  { key: 'green',  label: 'Energie Grün',     accent: '#16A34A', hover: '#15803d' },
  { key: 'purple', label: 'Lila',             accent: '#7C3AED', hover: '#6d28d9' },
  { key: 'orange', label: 'Sonnenuntergang',  accent: '#EA580C', hover: '#c2410c' },
  { key: 'cyan',   label: 'Eisblau',          accent: '#0891B2', hover: '#0e7490' },
];

/** Design-Stile — komplettere optische Identitaeten. Jeder Stil hat
 *  eine eigene Card-/Hintergrund-/Typografie-Sprache. Orthogonal zur
 *  Akzentfarbe oben — der User kann z.B. Cyberpunk + Eisblau kombinieren.
 *
 *  - glass:   Premium Glasmorphismus (Default). Weiche Schatten, Backdrop-Blur.
 *  - cyber:   Neon-Glow, scharfe Borders, monospace-lastige Headlines.
 *  - minimal: Viel Schwarzraum, gross gesetzte Zahlen, duenne Trennlinien.
 *  - sport:   Mutig, kantig, Akzent-balken, „Tachometer"-Anmutung.
 */
export const DESIGNS = [
  { key: 'glass',     label: 'Premium Glass',       icon: '✨', tagline: 'Weich, edel, viel Tiefe' },
  { key: 'cyber',     label: 'Cyberpunk-Tesla',     icon: '⚡', tagline: 'Neon-Glow, scharfe Linien' },
  { key: 'minimal',   label: 'Minimal Swiss',       icon: '◻',  tagline: 'Reduziert, Zahlen im Fokus' },
  { key: 'sport',     label: 'Sport / Performance', icon: '▰',  tagline: 'Kantig, mutig, Tacho-Look' },
  { key: 'editorial', label: 'Tech-Editorial',      icon: '◈',  tagline: 'Petrol, Grid-Mesh, Mono-Labels' },
];

const STORAGE_KEY = 'tesla-carview-theme';
const DESIGN_KEY  = 'tesla-carview-design';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    activeKey:  localStorage.getItem(STORAGE_KEY) || 'red',
    designKey:  localStorage.getItem(DESIGN_KEY)  || 'glass',
  }),
  getters: {
    activeTheme(state) {
      return THEMES.find(t => t.key === state.activeKey) ?? THEMES[0];
    },
    activeDesign(state) {
      return DESIGNS.find(d => d.key === state.designKey) ?? DESIGNS[0];
    },
  },
  actions: {
    apply(key) {
      this.activeKey = key;
      localStorage.setItem(STORAGE_KEY, key);
      this._applyVars();
    },
    setDesign(key) {
      if (!DESIGNS.find(d => d.key === key)) return;
      this.designKey = key;
      localStorage.setItem(DESIGN_KEY, key);
      document.documentElement.setAttribute('data-design', key);
    },
    _applyVars() {
      const t = this.activeTheme;
      document.documentElement.style.setProperty('--accent',       t.accent);
      document.documentElement.style.setProperty('--accent-hover', t.hover);
    },
    init() {
      this._applyVars();
      document.documentElement.setAttribute('data-design', this.designKey);
    },
  },
});

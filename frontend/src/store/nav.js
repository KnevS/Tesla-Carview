import { defineStore } from 'pinia';

export const DEFAULT_LINKS = [
  { key: 'dashboard',   to: '/',                 icon: '🏠', label: 'Dashboard',    tooltip: 'Übersicht mit Kennzahlen, letzter Fahrt und Monatsstatistik' },
  { key: 'trips',       to: '/trips',            icon: '🗺️', label: 'Fahrten',      tooltip: 'Liste aller aufgezeichneten Fahrten mit GPS-Track auf einer Karte' },
  { key: 'fahrtenbuch', to: '/fahrtenbuch',      icon: '📋', label: 'Fahrtenbuch',  tooltip: 'Fahrten klassifizieren und Auswertung nach Privat/Dienst/Arbeitsweg' },
  { key: 'abrechnung',  to: '/kostenabrechnung', icon: '💶', label: 'Abrechnung',   tooltip: 'Kostenabrechnung Heimladen für Dienstwagen' },
  { key: 'charging',    to: '/charging',         icon: '🔋', label: 'Laden',        tooltip: 'Alle Ladevorgänge mit Ladekurven, Kosten und Aufschlüsselung nach Ladertyp' },
  { key: 'battery',     to: '/battery',          icon: '📊', label: 'Batterie',     tooltip: 'Reichweiten-Verlauf und Degradations-Analyse über Zeit' },
  { key: 'logbook',     to: '/logbook',          icon: '📓', label: 'Betriebsbuch', tooltip: 'Wartungen, Reparaturen, Reifen, Inspektionen und Notizen zum Fahrzeug' },
  { key: 'telemetry',   to: '/telemetry',        icon: '🏎',  label: 'Technik',      tooltip: 'Live-Fahrzeugdaten: Reifendruck, Klima, Leistung, SOC – wie der Track-Mode' },
  { key: 'control',     to: '/control',          icon: '🎮', label: 'Steuerung',    tooltip: 'Fahrzeug steuern: Klima, Türen, Laden, Navigation' },
  { key: 'export',      to: '/export',           icon: '💾', label: 'Export',       tooltip: 'Daten als CSV/JSON exportieren, Vollbackup erstellen, Push-Benachrichtigungen' },
  { key: 'system',      to: '/system',           icon: '📈', label: 'System',       tooltip: 'Versionsinformationen, CPU-/RAM-Auslastung und Datenbankstatistiken' },
];

const STORAGE_KEY = 'tesla-carview-nav';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useNavStore = defineStore('nav', {
  state: () => {
    const saved = load();
    return {
      order:  saved?.order  ?? DEFAULT_LINKS.map(l => l.key),
      hidden: saved?.hidden ?? [],
    };
  },
  getters: {
    visibleLinks(state) {
      const map = Object.fromEntries(DEFAULT_LINKS.map(l => [l.key, l]));
      return state.order.filter(k => !state.hidden.includes(k)).map(k => map[k]).filter(Boolean);
    },
    allLinks(state) {
      const map = Object.fromEntries(DEFAULT_LINKS.map(l => [l.key, l]));
      return state.order.map(k => ({ ...map[k], visible: !state.hidden.includes(k) }));
    },
  },
  actions: {
    _persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: this.order, hidden: this.hidden }));
    },
    moveUp(key) {
      const i = this.order.indexOf(key);
      if (i > 0) {
        const arr = [...this.order];
        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        this.order = arr;
        this._persist();
      }
    },
    moveDown(key) {
      const i = this.order.indexOf(key);
      if (i < this.order.length - 1) {
        const arr = [...this.order];
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        this.order = arr;
        this._persist();
      }
    },
    toggleVisible(key) {
      this.hidden = this.hidden.includes(key)
        ? this.hidden.filter(k => k !== key)
        : [...this.hidden, key];
      this._persist();
    },
    reset() {
      this.order  = DEFAULT_LINKS.map(l => l.key);
      this.hidden = [];
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

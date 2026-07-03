// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { defineStore } from 'pinia';
import api from '../api.js';
import { useThemeStore } from './theme.js';
import { useLangStore } from './lang.js';
import { useNavStore } from './nav.js';

export const PREF_KEYS = {
  THEME_COLOR:    'theme_color',
  THEME_DESIGN:   'theme_design',
  LANG:           'lang',
  UNIT_DISTANCE:  'unit_distance',
  UNIT_TEMP:      'unit_temp',
  UNIT_EFFICIENCY:'unit_efficiency',
  DASHBOARD_CARDS:'dashboard_cards',
  DASHBOARD_ORDER:'dashboard_card_order',
  NAV_ORDER:      'nav_order',
  NAV_HIDDEN:     'nav_hidden',
  NOTIF_CHARGE:   'notif_charging_complete',
  NOTIF_SERVICE:  'notif_service_due',
  NOTIF_BATTERY:  'notif_low_battery',
  NOTIF_BATTERY_T:'notif_low_battery_threshold',
  WIZARD_DONE:    'wizard_completed',
};

export const DASHBOARD_CARD_DEFS = [
  { key: 'stats',         icon: '📊' },
  { key: 'service',       icon: '🔧' },
  { key: 'last_trip',     icon: '🗺️' },
  { key: 'monthly_chart', icon: '📈' },
  { key: 'tariff',        icon: '⚡' },
  { key: 'tesla_usage',   icon: '🔌' },
];

const DEFAULTS = {
  theme_color:    'red',
  theme_design:   'glass',
  lang:           null,   // null = kein Override; Sprache kommt von users.lang (langStore)
  unit_distance:  'km',
  unit_temp:      'celsius',
  unit_efficiency:'kwh100',
  dashboard_cards: {
    stats: true, service: true, last_trip: true,
    monthly_chart: true, tariff: true, tesla_usage: true,
  },
  dashboard_card_order: ['stats', 'service', 'last_trip', 'monthly_chart', 'tariff', 'tesla_usage'],
  nav_order:   null,
  nav_hidden:  null,
  notif_charging_complete:    true,
  notif_service_due:          true,
  notif_low_battery:          false,
  notif_low_battery_threshold: 20,
  wizard_completed: false,
};

const LS_KEY = 'tcv-prefs';

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') ?? {}; } catch { return {}; }
}
function lsSave(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

let _saveTimer = null;
let _pendingDelta = {};

export const usePrefsStore = defineStore('prefs', {
  state: () => ({
    loaded: false,
    // localStorage als sofortiger Fallback, damit Theme/Sprache schon vor dem
    // API-Aufruf stimmt; Server-Daten überschreiben beim load().
    data: { ...DEFAULTS, ...lsLoad() },
  }),

  getters: {
    get: (state) => (key) => state.data[key] ?? DEFAULTS[key],

    wizardCompleted: (state) => state.data.wizard_completed === true,

    dashboardCards: (state) => {
      const cards  = state.data.dashboard_cards ?? DEFAULTS.dashboard_cards;
      const order  = state.data.dashboard_card_order ?? DEFAULTS.dashboard_card_order;
      return order
        .filter(k => cards[k] !== false)
        .concat(DASHBOARD_CARD_DEFS.map(d => d.key).filter(k => !order.includes(k) && cards[k] !== false));
    },

    isDashboardCardVisible: (state) => (key) => {
      const cards = state.data.dashboard_cards ?? DEFAULTS.dashboard_cards;
      return cards[key] !== false;
    },
  },

  actions: {
    async load() {
      try {
        const { data } = await api.get('/users/me/preferences');
        this.data = { ...DEFAULTS, ...data };
        lsSave(this.data);
        this.loaded = true;
        this._applyToStores();
      } catch {
        // Server nicht erreichbar — localStorage-Fallback bereits im State
        this.loaded = true;
        this._applyToStores();
      }
    },

    /** Sofort im Store + debounced zur API */
    set(keyOrDelta, value) {
      if (typeof keyOrDelta === 'string') {
        this.data[keyOrDelta] = value;
        _pendingDelta[keyOrDelta] = value;
      } else {
        Object.assign(this.data, keyOrDelta);
        Object.assign(_pendingDelta, keyOrDelta);
      }
      lsSave(this.data);
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => this._flush(), 800);
    },

    /** Batch-Save (z.B. nach Wizard-Confirm) */
    async save(delta) {
      Object.assign(this.data, delta);
      lsSave(this.data);
      try {
        await api.patch('/users/me/preferences', delta);
      } catch { /* offline — localStorage-Kopie reicht */ }
      this._applyToStores();
    },

    async _flush() {
      if (!Object.keys(_pendingDelta).length) return;
      const delta = { ..._pendingDelta };
      _pendingDelta = {};
      try {
        await api.patch('/users/me/preferences', delta);
      } catch {
        // Beim nächsten _flush erneut versuchen
        Object.assign(_pendingDelta, delta);
      }
    },

    _applyToStores() {
      const theme = useThemeStore();
      const lang  = useLangStore();
      const nav   = useNavStore();

      if (this.data.theme_color) theme.apply(this.data.theme_color);
      if (this.data.theme_design) theme.setDesign(this.data.theme_design);
      if (this.data.lang) lang.setLang(this.data.lang, { persistToProfile: false });

      if (this.data.nav_order && this.data.nav_order.length) {
        nav.order  = this.data.nav_order;
        nav.hidden = this.data.nav_hidden ?? [];
        nav._persist();
      }
      // Sicherstellen, dass neue Routen (nach einem App-Update) auch dann
      // sichtbar sind, wenn der User alte Prefs gespeichert hat — sync()
      // haengt fehlende Keys ans Ende und bereinigt veraltete.
      nav.sync();
    },
  },
});

/** Composable für Einheiten-Umrechnung */
export function useUnits() {
  const prefs = usePrefsStore();

  function fmtDistance(km, decimals = 1) {
    if (prefs.data.unit_distance === 'mi') {
      return `${(km * 0.621371).toFixed(decimals)} mi`;
    }
    return decimals === 0 ? `${Math.round(km)} km` : `${km.toFixed(decimals)} km`;
  }

  function fmtTemp(celsius) {
    if (prefs.data.unit_temp === 'fahrenheit') {
      return `${Math.round(celsius * 9 / 5 + 32)} °F`;
    }
    return `${Math.round(celsius)} °C`;
  }

  function fmtEfficiency(kwhPer100km) {
    switch (prefs.data.unit_efficiency) {
      case 'whkm':  return `${Math.round(kwhPer100km * 10)} Wh/km`;
      case 'mpkwh': return `${(62.137 / kwhPer100km).toFixed(1)} mi/kWh`;
      default:      return `${kwhPer100km.toFixed(1)} kWh/100km`;
    }
  }

  // Geschwindigkeit folgt der Distanz-Einheit: km → km/h, mi → mph.
  // Eingabe immer in km/h (interne Basiseinheit). Null → '–'.
  function fmtSpeed(kmh, decimals = 0) {
    if (kmh == null) return '–';
    if (prefs.data.unit_distance === 'mi') {
      return `${(kmh * 0.621371).toFixed(decimals)} mph`;
    }
    return `${kmh.toFixed(decimals)} km/h`;
  }

  return { fmtDistance, fmtTemp, fmtEfficiency, fmtSpeed };
}

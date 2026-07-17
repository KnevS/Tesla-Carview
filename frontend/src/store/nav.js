// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { defineStore } from 'pinia';
import { useAuthStore } from './auth.js';

/**
 * Single Source of Truth fuer die Navigation.
 *
 * Gruppen-Struktur:
 *   vehicle   — Fahrzeug-Status & Echtzeit (Dashboard, Technik, Steuerung, Batterie)
 *   analytics — Historische Auswertungen (Fahrten, Laden, Berichte, Export)
 *   plan      — Planung & aktive Tools (Route, Ladestationen, Automationen, Grok)
 *   admin     — Verwaltung (nur Admins)
 */

export const NAV_GROUPS = [
  // ── Fahrzeug ──────────────────────────────────────────────────────────────
  {
    id: 'vehicle', adminOnly: false,
    items: [
      { key: 'dashboard', to: '/',          icon: 'home',        emojiFallback: '🏠', label: 'Dashboard',    tooltip: 'Übersicht mit Kennzahlen, letzter Fahrt und Monatsstatistik' },
      { key: 'telemetry', to: '/telemetry', icon: 'gauge',       emojiFallback: '🏎',  label: 'Technik',      tooltip: 'Live-Fahrzeugdaten: Reifendruck, Klima, Leistung, SOC – wie der Track-Mode' },
      { key: 'control',   to: '/control',   icon: 'steering',    emojiFallback: '🎮', label: 'Steuerung',    tooltip: 'Fahrzeug steuern: Klima, Türen, Laden, Navigation' },
      { key: 'battery',   to: '/battery',   icon: 'battery',     emojiFallback: '📊', label: 'Batterie',     tooltip: 'Reichweiten-Verlauf und Degradations-Analyse über Zeit' },
    ],
  },

  // ── Auswertungen ──────────────────────────────────────────────────────────
  {
    id: 'analytics', adminOnly: false,
    items: [
      { key: 'trips',       to: '/trips',            icon: 'map',         emojiFallback: '🗺️', label: 'Fahrten',          tooltip: 'Liste aller aufgezeichneten Fahrten mit GPS-Track auf einer Karte' },
      { key: 'fahrtwerte',  to: '/fahrtwerte',       icon: 'pulse',       emojiFallback: '📈', label: 'Fahrtwerte',       tooltip: 'Tabellarische Kennzahlen pro Fahrt: Dauer, Strecke, Geschwindigkeit und Leistung (min/max/Ø), Verbrauch — sortier- und CSV-exportierbar' },
      { key: 'heatmap',     to: '/heatmap',          icon: 'map',         emojiFallback: '🔥', label: 'Heatmap',          tooltip: 'Geografische Heatmap auf der Karte: Dichte der Fahrten, Ladevorgänge und definierte Ladeorte — Layer einzeln ein-/ausblendbar' },
      { key: 'fahrtenbuch', to: '/fahrtenbuch',      icon: 'logbook',     emojiFallback: '📋', label: 'Fahrtenbuch',      tooltip: 'Fahrten klassifizieren und Auswertung nach Privat/Dienst/Arbeitsweg' },
      { key: 'charging',    to: '/charging',         icon: 'bolt',        emojiFallback: '🔋', label: 'Laden',            tooltip: 'Alle Ladevorgänge mit Ladekurven, Kosten und Aufschlüsselung nach Ladertyp' },
      { key: 'energy',      to: '/energy',           icon: 'sparkles',    emojiFallback: '🌿', label: 'Energiebericht',   tooltip: 'Wöchentliche Effizienztrends, kWh/100 km und Eco-Score' },
      { key: 'co2',         to: '/co2',              icon: 'leaf',        emojiFallback: '🌱', label: 'CO₂-Bilanz',       tooltip: 'Eingespartes CO₂ im Vergleich zu einem fiktiven Verbrenner' },
      { key: 'sleep',       to: '/sleep',            icon: 'moon',        emojiFallback: '😴', label: 'Schlaf-Monitor',   tooltip: 'Wann schläft das Auto – und wie viel Energie verliert es im Stand?' },
      { key: 'climate',     to: '/climate',          icon: 'thermometer', emojiFallback: '❄️', label: 'Klimastatistiken', tooltip: 'Klimaanlagen- und Sitzheizungsnutzung nach Tag – inkl. Vorklimatisierungen' },
      { key: 'logbook',     to: '/logbook',          icon: 'tool',        emojiFallback: '📓', label: 'Betriebsbuch',     tooltip: 'Wartungen, Reparaturen, Reifen, Inspektionen und Notizen zum Fahrzeug' },
      { key: 'abrechnung',  to: '/kostenabrechnung', icon: 'cash',        emojiFallback: '💶', label: 'Abrechnung',       tooltip: 'Heimlade-Sessions & Monta-Integration – Kostenabrechnung für Dienstwagen' },
      { key: 'tco',         to: '/tco',              icon: 'wallet',      emojiFallback: '📊', label: 'TCO-Cockpit',      tooltip: 'Total Cost of Ownership – Wertverlust, Versicherung, Steuer, Strom, Wartung, €/km' },
      { key: 'export',      to: '/export',           icon: 'export',      emojiFallback: '💾', label: 'Export',           tooltip: 'Daten als CSV/JSON exportieren, Vollbackup erstellen, Push-Benachrichtigungen' },
    ],
  },

  // ── Planung ───────────────────────────────────────────────────────────────
  // Vorausschauende und aktive Tools: Route, Ladeinfrastruktur, Automationen, KI.
  {
    id: 'plan', adminOnly: false,
    items: [
      { key: 'routes',      to: '/routes',      icon: 'map',      emojiFallback: '🗺️', label: 'Routenplaner', tooltip: 'Routen planen, an Tesla senden, in ABRP öffnen und Lieblingsrouten speichern' },
      { key: 'chargers',    to: '/chargers',    icon: 'bolt',     emojiFallback: '🗺', label: 'Ladestationen', tooltip: 'Schnellladestationen in deiner Nähe suchen – OpenChargeMap-Daten' },
      { key: 'chargingLocations', to: '/charging-locations', icon: 'bolt', emojiFallback: '🏠', label: 'Ladeorte', tooltip: 'Eigene Ladeorte verwalten — Tarif, Radius, automatisches Ladelimit bei Ankunft' },
      { key: 'chargePlanner', to: '/ladeplan', icon: 'bolt', emojiFallback: '📅', label: 'Ladeplaner', tooltip: 'Günstigste Ladeslots bis zur Abfahrt aus dem dynamischen Tarif berechnen — mit Kosten und Ersparnis gegenüber sofortigem Laden' },
      { key: 'mytracking',  to: '/my-tracking',      icon: 'smartphone',  emojiFallback: '📱', label: 'Mein GPS',         tooltip: 'Eigene Smartphone-GPS-Geräte (OwnTracks) einrichten + Bluetooth-Validierung + QR-Code' },
      { key: 'automations', to: '/automations', icon: 'bolt',     emojiFallback: '⚡', label: 'Automationen',  tooltip: 'Push-Alarme und automatische Aktionen bei Ladestufe, Geofence u. m.' },
      { key: 'grok',        to: '/grok',        icon: 'sparkles', emojiFallback: '💬', label: 'Grok',          tooltip: 'Chat mit Grok KI — stelle Fragen zu deinen Fahrten, Ladedaten und deinem Tesla' },
      { key: 'launcher',    to: '/launcher',    icon: 'apps',     emojiFallback: '🚀', label: 'App-Hub',       tooltip: 'Kuratierte Web-Apps, die im Tesla-Browser laufen und Tesla nicht nativ bietet' },
      { key: 'nearby',      to: '/nearby',      icon: 'map',      emojiFallback: '📍', label: 'In der Nähe',   tooltip: 'POIs (Café, WC, Spielplatz, Geocaches) im Umfeld deiner aktuellen Position oder Ladestation' },
    ],
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    id: 'admin', adminOnly: true,
    items: [
      { key: 'users',  to: '/admin/users', icon: 'users',    emojiFallback: '👥', label: 'Benutzer',    tooltip: 'Benutzerverwaltung – Konten anlegen, Fahrzeuge zuweisen, Reset-Links generieren' },
      { key: 'data',   to: '/admin/data',  icon: 'database', emojiFallback: '🗑️', label: 'Daten',       tooltip: 'Datenverwaltung – Daten löschen und Datenbestand einsehen' },
      { key: 'legal',  to: '/admin/legal', icon: 'legal',    emojiFallback: '⚖️',  label: 'Rechtliches', tooltip: 'Impressum, Datenschutz und Nutzungsbedingungen pro Sprache pflegen' },
      { key: 'audit',  to: '/admin/audit', icon: 'audit',    emojiFallback: '📋', label: 'Audit-Log',   tooltip: 'Sicherheitsrelevante Ereignisse einsehen — Logins, Berechtigungs-Änderungen, Tesla-Befehle, Akzeptanzen' },
      { key: 'system', to: '/system',      icon: 'system',   emojiFallback: '📈', label: 'System',      tooltip: 'Versionsinformationen, CPU-/RAM-Auslastung und Datenbankstatistiken' },
    ],
  },
];

// Default-Reihenfolge innerhalb der Gruppen: thematisch (Sven, 2026-07-09) —
// Zusammengehöriges steht beieinander statt alphabetisch: Fahren → Energie/
// Laden → Kosten → Pflege/Daten. Neue Einträge hier einsortieren; Unbekanntes
// landet ans Gruppenende. User passen die Reihenfolge weiterhin im Profil an.
const GROUP_ORDER = {
  vehicle:   ['dashboard', 'telemetry', 'control', 'battery'],
  analytics: ['trips', 'fahrtwerte', 'fahrtenbuch', 'heatmap',
              'charging', 'energy', 'co2', 'climate', 'sleep',
              'abrechnung', 'tco', 'logbook', 'export'],
  plan:      ['routes', 'chargers', 'chargingLocations', 'chargePlanner', 'nearby',
              'mytracking', 'automations', 'grok', 'launcher'],
  admin:     ['users', 'data', 'audit', 'legal', 'system'],
};
for (const g of NAV_GROUPS) {
  const order = GROUP_ORDER[g.id] ?? [];
  g.items.sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

/** Flache Liste aller Items mit Gruppen-ID. Wird vom Store fuer
 *  Reihenfolge / Hidden-Tracking benutzt. */
export const ALL_LINKS = NAV_GROUPS.flatMap(g =>
  g.items.map(i => ({ ...i, group: g.id, adminOnly: g.adminOnly }))
);

const STORAGE_KEY = 'tesla-carview-nav';
// v3 (2026-07-09): thematische Default-Reihenfolge (ersetzt das kurzlebige
// alphabetische v2). Ältere gespeicherte Reihenfolgen werden einmalig
// zurückgesetzt (hidden bleibt erhalten).
const NAV_DEFAULTS_VERSION = 3;

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!saved) return null;
    if ((saved.v ?? 1) < NAV_DEFAULTS_VERSION) return { hidden: saved.hidden ?? [] };
    return saved;
  } catch { return null; }
}

export const useNavStore = defineStore('nav', {
  state: () => {
    const saved = loadStored();
    return {
      order:  saved?.order  ?? ALL_LINKS.map(l => l.key),
      hidden: saved?.hidden ?? [],
    };
  },
  getters: {
    visibleLinks() {
      const auth = useAuthStore();
      const map = Object.fromEntries(ALL_LINKS.map(l => [l.key, l]));
      return this.order
        .map(k => map[k])
        .filter(Boolean)
        .filter(l => !this.hidden.includes(l.key) || (l.adminOnly && auth.isAdmin))
        .filter(l => !l.adminOnly || auth.isAdmin);
    },
    visibleGroups() {
      const auth = useAuthStore();
      const visibleByKey = new Set(this.visibleLinks.map(l => l.key));
      return NAV_GROUPS
        .filter(g => !g.adminOnly || auth.isAdmin)
        .map(g => {
          if (g.adminOnly && auth.isAdmin) {
            return {
              ...g,
              items: g.items
                .slice()
                .sort((a, b) => this.order.indexOf(a.key) - this.order.indexOf(b.key)),
            };
          }
          return {
            ...g,
            items: g.items
              .slice()
              .sort((a, b) => this.order.indexOf(a.key) - this.order.indexOf(b.key))
              .filter(i => visibleByKey.has(i.key)),
          };
        })
        .filter(g => g.items.length > 0);
    },
    allLinks() {
      const auth = useAuthStore();
      const map = Object.fromEntries(ALL_LINKS.map(l => [l.key, l]));
      return this.order
        .map(k => map[k])
        .filter(Boolean)
        .filter(l => !l.adminOnly || auth.isAdmin)
        .map(l => ({ ...l, visible: !this.hidden.includes(l.key) }));
    },
  },
  actions: {
    _persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: NAV_DEFAULTS_VERSION, order: this.order, hidden: this.hidden,
      }));
    },
    sync() {
      const known = new Set(ALL_LINKS.map(l => l.key));
      const existingInOrder = new Set(this.order);
      this.order = this.order.filter(k => known.has(k));
      for (const l of ALL_LINKS) {
        if (!existingInOrder.has(l.key)) this.order.push(l.key);
      }
      const adminKeys = new Set(ALL_LINKS.filter(l => l.adminOnly).map(l => l.key));
      this.hidden = this.hidden.filter(k => known.has(k) && !adminKeys.has(k));
      this._persist();
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
      this.order  = ALL_LINKS.map(l => l.key);
      this.hidden = [];
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

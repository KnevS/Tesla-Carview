import { defineStore } from 'pinia';
import { useAuthStore } from './auth.js';

/**
 * Single Source of Truth fuer die Navigation.
 *
 * Frueher gab es hier eine flache DEFAULT_LINKS-Liste UND zusaetzlich
 * eine separate Gruppen-Struktur in NavBar.vue (NAV_GROUPS). Die zwei
 * liefen auseinander — die Settings-„Navigationsleiste anpassen"-Karte
 * zeigte Items, die in der echten Leiste anders gruppiert oder gar nicht
 * sichtbar waren (z.B. „system" als normaler Punkt im Store, aber
 * admin-only in der NavBar). Plus: die Customization-Aktionen im Store
 * (Reihenfolge / Ein-Ausblenden) waren wirkungslos, weil NavBar.vue
 * sie nie las.
 *
 * Jetzt: Gruppen + Items hier zentral. NavBar importiert sie und
 * filtert pro User (admin-only) + respektiert user-customization
 * (Reihenfolge + hidden). Settings zeigt genau dieselben Items wie
 * die Bar.
 */

/** Statische Gruppen-Definition. Items unverhandelbar — Routen muessen
 *  in router/index.js existieren; admin-Items werden zusaetzlich vom
 *  Router-Guard auf authStore.isAdmin geprueft.
 *
 *  `icon` ist ein AppIcon-Name (siehe components/AppIcon.vue), das
 *  alte Emoji bleibt als `emojiFallback` erhalten — wird angezeigt,
 *  falls AppIcon den Namen nicht kennt. */
export const NAV_GROUPS = [
  {
    id: 'overview', adminOnly: false,
    items: [
      { key: 'dashboard', to: '/',          icon: 'home',     emojiFallback: '🏠', label: 'Dashboard',    tooltip: 'Übersicht mit Kennzahlen, letzter Fahrt und Monatsstatistik' },
      { key: 'telemetry', to: '/telemetry', icon: 'gauge',    emojiFallback: '🏎',  label: 'Technik',      tooltip: 'Live-Fahrzeugdaten: Reifendruck, Klima, Leistung, SOC – wie der Track-Mode' },
      { key: 'control',   to: '/control',   icon: 'steering', emojiFallback: '🎮', label: 'Steuerung',    tooltip: 'Fahrzeug steuern: Klima, Türen, Laden, Navigation' },
      { key: 'routes',    to: '/routes',    icon: 'map',      emojiFallback: '🗺️', label: 'Routenplaner', tooltip: 'Routen planen, an Tesla senden, in ABRP öffnen und Lieblingsrouten speichern' },
      { key: 'battery',   to: '/battery',   icon: 'battery',  emojiFallback: '📊', label: 'Batterie',     tooltip: 'Reichweiten-Verlauf und Degradations-Analyse über Zeit' },
    ],
  },
  {
    id: 'analytics', adminOnly: false,
    items: [
      { key: 'trips',        to: '/trips',            icon: 'map',        emojiFallback: '🗺️', label: 'Fahrten',        tooltip: 'Liste aller aufgezeichneten Fahrten mit GPS-Track auf einer Karte' },
      { key: 'fahrtenbuch',  to: '/fahrtenbuch',      icon: 'logbook',    emojiFallback: '📋', label: 'Fahrtenbuch',    tooltip: 'Fahrten klassifizieren und Auswertung nach Privat/Dienst/Arbeitsweg' },
      { key: 'charging',     to: '/charging',         icon: 'bolt',       emojiFallback: '🔋', label: 'Laden',          tooltip: 'Alle Ladevorgänge mit Ladekurven, Kosten und Aufschlüsselung nach Ladertyp' },
      { key: 'energy',       to: '/energy',           icon: 'sparkles',   emojiFallback: '🌿', label: 'Energiebericht', tooltip: 'Wöchentliche Effizienztrends, kWh/100 km und Eco-Score' },
      { key: 'sleep',        to: '/sleep',            icon: 'moon',       emojiFallback: '😴', label: 'Schlaf-Monitor', tooltip: 'Wann schläft das Auto – und wie viel Energie verliert es im Stand?' },
      { key: 'automations',  to: '/automations',      icon: 'bolt',       emojiFallback: '⚡', label: 'Automationen',   tooltip: 'Push-Alarme und automatische Aktionen bei Ladestufe, Geofence u. m.' },
      { key: 'chargers',     to: '/chargers',         icon: 'bolt',       emojiFallback: '🗺', label: 'Ladestationen',  tooltip: 'Schnellladestationen in deiner Nähe suchen – OpenChargeMap-Daten' },
      { key: 'logbook',      to: '/logbook',          icon: 'tool',       emojiFallback: '📓', label: 'Betriebsbuch',   tooltip: 'Wartungen, Reparaturen, Reifen, Inspektionen und Notizen zum Fahrzeug' },
      { key: 'abrechnung',   to: '/kostenabrechnung', icon: 'cash',       emojiFallback: '💶', label: 'Abrechnung',     tooltip: 'Kostenabrechnung Heimladen für Dienstwagen' },
      { key: 'export',       to: '/export',           icon: 'export',     emojiFallback: '💾', label: 'Export',         tooltip: 'Daten als CSV/JSON exportieren, Vollbackup erstellen, Push-Benachrichtigungen' },
    ],
  },
  {
    id: 'ai', adminOnly: false,
    items: [
      { key: 'grok', to: '/grok', icon: 'sparkles', emojiFallback: '💬', label: 'Grok', tooltip: 'Chat mit Grok KI — stelle Fragen zu deinen Fahrten, Ladedaten und deinem Tesla' },
    ],
  },
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

/** Flache Liste aller Items mit Gruppen-ID. Wird vom Store fuer
 *  Reihenfolge / Hidden-Tracking benutzt. */
export const ALL_LINKS = NAV_GROUPS.flatMap(g =>
  g.items.map(i => ({ ...i, group: g.id, adminOnly: g.adminOnly }))
);

const STORAGE_KEY = 'tesla-carview-nav';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useNavStore = defineStore('nav', {
  state: () => {
    const saved = loadStored();
    return {
      // Reihenfolge bezieht sich auf alle Items global; admin-Items
      // stehen ans Ende, werden aber pro User durch die Getter
      // gefiltert.
      order:  saved?.order  ?? ALL_LINKS.map(l => l.key),
      hidden: saved?.hidden ?? [],
    };
  },
  getters: {
    /** Items, die der aktuelle User sehen darf, in seiner gewuenschten
     *  Reihenfolge, ohne ausgeblendete. NavBar's Mobile-Strip nutzt das. */
    visibleLinks() {
      const auth = useAuthStore();
      const map = Object.fromEntries(ALL_LINKS.map(l => [l.key, l]));
      return this.order
        .map(k => map[k])
        .filter(Boolean)
        // Admin-only Items koennen von Admins nie versteckt werden — das
        // verhindert, dass System/Benutzer/etc. durch einen falschen
        // localStorage-Eintrag dauerhaft verschwindet.
        .filter(l => !this.hidden.includes(l.key) || (l.adminOnly && auth.isAdmin))
        .filter(l => !l.adminOnly || auth.isAdmin);
    },
    /** Gruppen-Struktur fuer die Desktop-Dropdowns. Pro Gruppe nur die
     *  user-sichtbaren Items, in der eigenen Reihenfolge. */
    visibleGroups() {
      const auth = useAuthStore();
      const visibleByKey = new Set(this.visibleLinks.map(l => l.key));
      return NAV_GROUPS
        .filter(g => !g.adminOnly || auth.isAdmin)
        .map(g => ({
          ...g,
          items: g.items
            // user-Reihenfolge auch innerhalb der Gruppe respektieren
            .slice()
            .sort((a, b) => this.order.indexOf(a.key) - this.order.indexOf(b.key))
            .filter(i => visibleByKey.has(i.key)),
        }))
        .filter(g => g.items.length > 0);
    },
    /** Alle Items, die fuer den aktuellen User relevant sind — egal ob
     *  versteckt oder nicht. Settings-Customization-UI rendert das. */
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: this.order, hidden: this.hidden }));
    },
    /** Stellt sicher, dass `order` alle aktuell bekannten Item-Keys
     *  enthaelt — wichtig nach App-Updates, die neue Routen einfuehren. */
    sync() {
      const known = new Set(ALL_LINKS.map(l => l.key));
      const existingInOrder = new Set(this.order);
      // 1) unbekannte Keys raus (z.B. entfernte Routen)
      this.order = this.order.filter(k => known.has(k));
      // 2) neue Keys hinten anhaengen
      for (const l of ALL_LINKS) {
        if (!existingInOrder.has(l.key)) this.order.push(l.key);
      }
      // 3) hidden um abgelaufene Keys und admin-only Items bereinigen
      // (Admin-Items duerfen nie dauerhaft versteckt sein)
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

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';

// ─── Eager (immer geladen — kritischer Pfad, kein Map/Chart/PDF) ──────────────
// Login + Setup sind Einstiegspunkte ohne Auth, müssen sofort ready sein.
// Dashboard ist die erste Seite nach Login.
import Login        from '../views/Login.vue';
import Setup        from '../views/Setup.vue';
import Register     from '../views/Register.vue';
import Dashboard    from '../views/Dashboard.vue';
import InviteAccept from '../views/InviteAccept.vue';

// ─── Lazy (beim ersten Navigieren geladen, danach gecacht) ───────────────────
// Jede View hat ihren eigenen Chunk → Browser lädt nur was gebraucht wird.
// Chart.js / Leaflet / jsPDF landen automatisch in eigenen Vendor-Chunks
// (manualChunks in vite.config.js).
const Trips          = () => import('../views/Trips.vue');
const TripDetail     = () => import('../views/TripDetail.vue');
const Charging       = () => import('../views/Charging.vue');
const Battery        = () => import('../views/Battery.vue');
const Logbook        = () => import('../views/Logbook.vue');
const Export         = () => import('../views/Export.vue');
const MfaVerify      = () => import('../views/MfaVerify.vue');
const MfaSetup       = () => import('../views/MfaSetup.vue');
const Settings       = () => import('../views/Settings.vue');
const Profile        = () => import('../views/Profile.vue');
const AdminHub       = () => import('../views/admin/AdminHub.vue');
const AdminSettings  = () => import('../views/AdminSettings.vue');
const Telemetry      = () => import('../views/Telemetry.vue');
const Control        = () => import('../views/Control.vue');
const RoutePlanner   = () => import('../views/RoutePlanner.vue');
const Fahrtenbuch    = () => import('../views/Fahrtenbuch.vue');
const Kostenabrechnung = () => import('../views/Kostenabrechnung.vue');
const System         = () => import('../views/System.vue');
const PasswordReset  = () => import('../views/PasswordReset.vue');
const Handbook       = () => import('../views/Handbook.vue');
const UserManagement = () => import('../views/UserManagement.vue');
const DataManagement = () => import('../views/DataManagement.vue');
const Support        = () => import('../views/Support.vue');
const Imprint        = () => import('../views/legal/Imprint.vue');
const Privacy        = () => import('../views/legal/Privacy.vue');
const Terms          = () => import('../views/legal/Terms.vue');
const LegalAdmin     = () => import('../views/admin/LegalAdmin.vue');
const AuditLog       = () => import('../views/admin/AuditLog.vue');
const PairLogin      = () => import('../views/PairLogin.vue');

const routes = [
  // Setup-Wizard (erster Start)
  { path: '/setup',         component: Setup,         meta: { public: true,  title: 'Erstkonfiguration' } },
  // Oeffentlich
  { path: '/login',         component: Login,         meta: { public: true,  title: 'Anmelden' } },
  { path: '/login/mfa',     component: MfaVerify,     meta: { public: true,  title: 'MFA-Verifikation' } },
  { path: '/register',      component: Register,      meta: { public: true,  title: 'Registrieren' } },
  { path: '/reset-password',component: PasswordReset, meta: { public: true,  title: 'Passwort zurücksetzen' } },
  { path: '/handbook',      component: Handbook,      meta: { public: true,  title: 'Benutzerhandbuch' } },
  { path: '/support',       component: Support,       meta: { public: true,  title: 'Unterstützen' } },
  { path: '/demo',          component: () => import('../views/Demo.vue'),
                                                      meta: { public: true,  title: 'Demo starten' } },
  // Rechtliche Inhalte — public (auch ohne Login lesbar)
  { path: '/legal/imprint', component: Imprint,       meta: { public: true,  title: 'Impressum' } },
  { path: '/legal/privacy', component: Privacy,       meta: { public: true,  title: 'Datenschutz' } },
  { path: '/legal/terms',   component: Terms,         meta: { public: true,  title: 'Nutzungsbedingungen' } },
  // Selbst-Registrierung per Einladungslink
  { path: '/invite/:token', component: InviteAccept,  meta: { public: true,  title: 'Einladung annehmen' } },
  // QR-Pair-Login: Smartphone-Bestätigungsseite
  { path: '/pair/:token',   component: PairLogin,     meta: { public: true,  title: 'QR-Anmeldung' } },
  // Geschuetzt
  { path: '/',              component: Dashboard,     meta: { title: 'Dashboard' } },
  { path: '/trips',         component: Trips,         meta: { title: 'Fahrten' } },
  { path: '/trips/:id',     component: TripDetail,    meta: { title: 'Fahrtdetail' } },
  { path: '/fahrtenbuch',      component: Fahrtenbuch,      meta: { title: 'Fahrtenbuch' } },
  { path: '/kostenabrechnung', component: Kostenabrechnung, meta: { title: 'Kostenabrechnung' } },
  { path: '/charging',      component: Charging,      meta: { title: 'Laden' } },
  { path: '/battery',       component: Battery,       meta: { title: 'Batterie' } },
  { path: '/logbook',       component: Logbook,       meta: { title: 'Betriebsbuch' } },
  { path: '/export',        component: Export,        meta: { title: 'Export' } },
  { path: '/mfa/setup',     component: MfaSetup,      meta: { title: 'MFA einrichten' } },
  { path: '/profile',       component: Profile,        meta: { title: 'Mein Profil' } },
  { path: '/settings',      redirect: '/profile' },
  { path: '/telemetry',     component: Telemetry,     meta: { title: 'Fahrzeugtechnik' } },
  { path: '/control',       component: Control,       meta: { title: 'Steuerung' } },
  { path: '/routes',        component: RoutePlanner,  meta: { title: 'Routenplaner' } },
  { path: '/system',        component: System,        meta: { title: 'System' } },
  { path: '/grok',          component: () => import('../views/GrokChat.vue'),    meta: { title: 'Grok Chat' } },
  { path: '/sleep',         component: () => import('../views/SleepMonitor.vue'), meta: { title: 'Schlaf-Monitor' } },
  { path: '/climate',       component: () => import('../views/ClimateStats.vue'),  meta: { title: 'Klimastatistiken' } },
  { path: '/energy',        component: () => import('../views/EnergyReport.vue'), meta: { title: 'Energiebericht' } },
  { path: '/automations',   component: () => import('../views/Automations.vue'),  meta: { title: 'Automatisierungen' } },
  { path: '/chargers',      component: () => import('../views/ChargerFinder.vue'),meta: { title: 'Ladestationen' } },
  // Admin
  { path: '/admin',         component: AdminHub,       meta: { title: 'Administration', admin: true } },
  { path: '/admin/settings',component: AdminSettings,  meta: { title: 'Admin-Einstellungen', admin: true } },
  { path: '/admin/users',   component: UserManagement, meta: { title: 'Benutzerverwaltung', admin: true } },
  { path: '/admin/data',    component: DataManagement, meta: { title: 'Datenverwaltung',    admin: true } },
  { path: '/admin/legal',   component: LegalAdmin,     meta: { title: 'Rechtliche Inhalte', admin: true } },
  { path: '/admin/audit',   component: AuditLog,       meta: { title: 'Audit-Log',          admin: true } },
];

const router = createRouter({ history: createWebHistory(), routes });

let setupChecked = false;
let needsSetup = false;

router.beforeEach(async to => {
  // Setup-Status einmalig pruefen
  if (!setupChecked) {
    try {
      const { data } = await api.get('/setup/status');
      needsSetup = data.needsSetup;
    } catch { /* ignorieren */ }
    setupChecked = true;
  }

  // Zur Setup-Seite weiterleiten wenn noch kein Admin existiert.
  // /legal/* bleibt vor dem Setup erreichbar, damit der Wizard auf
  // Privacy/Terms/Impressum verlinken kann (Akzeptanz-Pflicht).
  if (needsSetup
      && to.path !== '/setup'
      && to.path !== '/register'
      && !to.path.startsWith('/legal/')) {
    return '/setup';
  }
  // Setup-Seite sperren wenn schon eingerichtet
  if (!needsSetup && to.path === '/setup') {
    return '/login';
  }

  const auth = useAuthStore();
  if (to.meta.public) {
    if (auth.isAuthenticated && to.path === '/login') return '/';
    return true;
  }
  if (!auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.meta.admin && !auth.isAdmin) {
    return '/';
  }
  // MFA-Pflicht: User mit mfa_required=1 und mfa_enabled=0 (typisch
  // direkt nach Selbst-Registrierung oder Admin-Anlage) MUSS zuerst
  // die TOTP-Einrichtung durchlaufen. Erlaubt sind nur die Setup-Seite
  // selbst sowie ein paar nicht-ablenkende Hilfsseiten — alles andere
  // wird hierhin umgeleitet, bis MFA aktiv ist.
  const MFA_ALLOW = new Set(['/mfa/setup', '/handbook', '/support']);
  if (auth.mustEnableMfa
      && !MFA_ALLOW.has(to.path)
      && !to.path.startsWith('/legal/')) {
    return { path: '/mfa/setup', query: { forced: '1' } };
  }
  return true;
});

router.afterEach(to => {
  document.title = `${to.meta.title || 'Tesla Carview'} – Tesla Carview`;
});

export default router;

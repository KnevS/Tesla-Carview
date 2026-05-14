import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';
import Dashboard   from '../views/Dashboard.vue';
import Trips       from '../views/Trips.vue';
import TripDetail  from '../views/TripDetail.vue';
import Charging    from '../views/Charging.vue';
import Battery     from '../views/Battery.vue';
import Logbook     from '../views/Logbook.vue';
import Export      from '../views/Export.vue';
import Login       from '../views/Login.vue';
import MfaVerify   from '../views/MfaVerify.vue';
import MfaSetup    from '../views/MfaSetup.vue';
import Settings    from '../views/Settings.vue';
import Telemetry    from '../views/Telemetry.vue';
import Control      from '../views/Control.vue';
import Fahrtenbuch      from '../views/Fahrtenbuch.vue';
import Kostenabrechnung from '../views/Kostenabrechnung.vue';
import System      from '../views/System.vue';
import Setup       from '../views/Setup.vue';
import Register      from '../views/Register.vue';
import PasswordReset from '../views/PasswordReset.vue';
import Handbook      from '../views/Handbook.vue';
import UserManagement from '../views/UserManagement.vue';
import DataManagement from '../views/DataManagement.vue';
import Support        from '../views/Support.vue';
import Imprint        from '../views/legal/Imprint.vue';
import Privacy        from '../views/legal/Privacy.vue';
import Terms          from '../views/legal/Terms.vue';
import InviteAccept   from '../views/InviteAccept.vue';
const LegalAdmin     = () => import('../views/admin/LegalAdmin.vue');
const AuditLog       = () => import('../views/admin/AuditLog.vue');

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
  { path: '/settings',      component: Settings,      meta: { title: 'Einstellungen' } },
  { path: '/telemetry',     component: Telemetry,     meta: { title: 'Fahrzeugtechnik' } },
  { path: '/control',       component: Control,       meta: { title: 'Steuerung' } },
  { path: '/system',        component: System,        meta: { title: 'System' } },
  { path: '/grok',          component: () => import('../views/GrokChat.vue'), meta: { title: 'Grok Chat' } },
  // Admin
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

  // Demo-Subdomain: unauthenticated → /demo; kein Login-Redirect
  const isDemo = typeof window !== 'undefined'
    && window.location.hostname.startsWith('demo.');
  if (isDemo) {
    if (auth.isAuthenticated && to.path === '/demo') return '/';
    if (!auth.isAuthenticated && to.path !== '/demo' && !to.meta.public) {
      return '/demo';
    }
    if (!auth.isAuthenticated && to.path === '/login') return '/demo';
  }

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

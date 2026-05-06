import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
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
import Telemetry  from '../views/Telemetry.vue';
import System     from '../views/System.vue';

const routes = [
  // Oeffentlich
  { path: '/login',      component: Login,     meta: { public: true, title: 'Anmelden' } },
  { path: '/login/mfa',  component: MfaVerify, meta: { public: true, title: 'MFA-Verifikation' } },
  // Geschuetzt
  { path: '/',           component: Dashboard,  meta: { title: 'Dashboard' } },
  { path: '/trips',      component: Trips,      meta: { title: 'Fahrten' } },
  { path: '/trips/:id',  component: TripDetail, meta: { title: 'Fahrtdetail' } },
  { path: '/charging',   component: Charging,   meta: { title: 'Laden' } },
  { path: '/battery',    component: Battery,    meta: { title: 'Batterie' } },
  { path: '/logbook',    component: Logbook,    meta: { title: 'Betriebsbuch' } },
  { path: '/export',     component: Export,     meta: { title: 'Export' } },
  { path: '/mfa/setup',  component: MfaSetup,   meta: { title: 'MFA einrichten' } },
  { path: '/settings',   component: Settings,   meta: { title: 'Einstellungen' } },
  { path: '/telemetry',  component: Telemetry,  meta: { title: 'Fahrzeugtechnik' } },
  { path: '/system',     component: System,     meta: { title: 'System' } },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async to => {
  const auth = useAuthStore();

  // Oeffentliche Seiten (Login etc.) direkt durchlassen
  if (to.meta.public) {
    if (auth.isAuthenticated && to.path === '/login') return '/';
    return true;
  }

  // Authentifizierung pruefen
  if (!auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  return true;
});

router.afterEach(to => {
  document.title = `${to.meta.title || 'Tesla Carview'} – Tesla Carview`;
});

export default router;

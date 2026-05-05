import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Trips from '../views/Trips.vue';
import TripDetail from '../views/TripDetail.vue';
import Charging from '../views/Charging.vue';
import Battery from '../views/Battery.vue';
import Logbook from '../views/Logbook.vue';
import Export from '../views/Export.vue';

const routes = [
  { path: '/', component: Dashboard, meta: { title: 'Dashboard' } },
  { path: '/trips', component: Trips, meta: { title: 'Fahrten' } },
  { path: '/trips/:id', component: TripDetail, meta: { title: 'Fahrtdetail' } },
  { path: '/charging', component: Charging, meta: { title: 'Laden' } },
  { path: '/battery', component: Battery, meta: { title: 'Batterie' } },
  { path: '/logbook', component: Logbook, meta: { title: 'Betriebsbuch' } },
  { path: '/export', component: Export, meta: { title: 'Export' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach(to => {
  document.title = `${to.meta.title || 'Tesla Carview'} – Tesla Carview`;
});

export default router;

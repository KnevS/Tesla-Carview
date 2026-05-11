import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { tooltipDirective } from './directives/tooltip.js';
import { revealDirective }  from './directives/reveal.js';
import { i18n } from './plugins/i18n.js';
import './style.css';
import { useAuthStore }  from './store/auth.js';
import { useAppStore }   from './store/index.js';
import { useThemeStore } from './store/theme.js';
import { useLangStore }  from './store/lang.js';

const pinia = createPinia();
const app   = createApp(App);
app.use(pinia);
app.use(i18n);
app.use(router);
app.directive('tooltip', tooltipDirective);
app.directive('reveal',  revealDirective);

const authStore  = useAuthStore();
const appStore   = useAppStore();
const themeStore = useThemeStore();
const langStore  = useLangStore();
themeStore.init();

// Session VOR dem ersten Router-Guard wiederherstellen,
// damit der Guard den korrekten Auth-Zustand sieht.
// Service-Worker fuer PWA + Push registrieren. Idempotent — wenn schon
// registriert, gibt der Browser die existierende Registration zurueck.
// Errors bewusst stillschalten: kein SW = kein Drama (vor allem im
// Dev-Modus ohne https).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

authStore.tryRestoreSession()
  .then(async restored => {
    if (restored && authStore.user) langStore.applyFromUser(authStore.user);
    if (restored) {
      await appStore.loadVehicles().catch(() => {});
      // Nach Tesla-OAuth-Redirect Fahrzeugliste nochmal laden
      if (window.location.search.includes('tesla_connected=1')) {
        await appStore.loadVehicles().catch(() => {});
        // URL-Parameter entfernen ohne Reload
        history.replaceState({}, '', window.location.pathname);
      }
    }
  })
  .finally(() => app.mount('#app'));

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { tooltipDirective } from './directives/tooltip.js';
import { revealDirective }  from './directives/reveal.js';
import InfoTip from './components/InfoTip.vue';
import { i18n } from './plugins/i18n.js';
import './style.css';
import { useAuthStore }  from './store/auth.js';
import { useAppStore }   from './store/index.js';
import { useThemeStore } from './store/theme.js';
import { useLangStore }  from './store/lang.js';
import { registerSW, chunkLoadErrorGuard } from './lib/swUpdate.js';

const pinia = createPinia();
const app   = createApp(App);
app.use(pinia);
app.use(i18n);
app.use(router);
app.directive('tooltip', tooltipDirective);
app.directive('reveal',  revealDirective);
app.component('InfoTip', InfoTip);

const authStore  = useAuthStore();
const appStore   = useAppStore();
const themeStore = useThemeStore();
const langStore  = useLangStore();
themeStore.init();

// Service-Worker registrieren + automatische Update-Logik. Sorgt dafuer,
// dass die App nach jedem Deploy ohne Strg+Shift+R aktuell wird —
// inkl. iOS-PWA. Details: src/lib/swUpdate.js
registerSW();

// Letzte Reissleine: wenn ein Route-Wechsel mit „chunk not found" stirbt
// (alte index.html-Cache zeigt auf nicht mehr existierende Chunk-Hashes),
// einmalig reloaden statt stillem Routing-Fehler.
chunkLoadErrorGuard(router);

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

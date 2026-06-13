<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="min-h-screen bg-tesla-dark flex flex-col">
    <div class="spotlight" aria-hidden="true"></div>
    <DemoBanner />
    <!-- System-Notices: One-Shot-Banner fuer wichtige Aenderungen seit dem
         letzten Update (z.B. Tesla-API-Status 2026). Liest /api/notices,
         zeigt pro nicht-dismissed Notice einen ein-/ausklappbaren Banner.
         Admin kann dismissen, danach fuer den Tenant weg. -->
    <NoticesBanner v-if="authStore.isAuthenticated" />
    <!-- Nevs-Edition: technischer Status-Streifen ueber der NavBar.
         Nur sichtbar wenn data-design="editorial" und eingeloggt. -->
    <EditorialStatusBar v-if="authStore.isAuthenticated" />
    <!-- NavBar: Desktop/Tablet. Auf Mobile (< md) übernimmt MobileTabBar.
         NavBar ist auf Mobile ausgeblendet — spart ~64px Content-Höhe.
         Safe-Area-Top wird in style.css per CSS-Variable abgedeckt. -->
    <div class="hidden md:block">
      <NavBar v-if="authStore.isAuthenticated" />
    </div>
    <main :class="['flex-1', authStore.isAuthenticated ? 'max-w-7xl w-full mx-auto px-4 md:py-6' : '']">
      <!-- sanfter Routenwechsel; respektiert prefers-reduced-motion (siehe style) -->
      <RouterView v-slot="{ Component }">
        <transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
    <!-- Globaler Footer — single source of truth. Erscheint auf jeder
         Route, inklusive Login/Register/Reset/Demo. Die Versions-Zeile
         (v2.0.0 · git-hash) blendet sich nur ein, wenn versionInfo
         gesetzt ist, was erst nach erfolgreichem Login passiert.
         Vorher (v-if="authStore.isAuthenticated"): Login.vue und
         Register.vue trugen einen eigenen <AppFooter />. Sobald ein
         eingeloggter User wieder auf /login navigierte (z.B. ueber
         Browser-Back), wurden BEIDE Footer gerendert — sichtbar
         duplizierte Legal-/Kontakt-Zeile. -->
    <AppFooter
      :show-version="!!versionInfo"
      :version="versionInfo?.version || ''"
      :build-hash="versionInfo?.git?.hash || ''"
    />
    <!-- Re-Akzept-Modal: zeigt sich, wenn der Admin Privacy/Terms-Version bumpt -->
    <LegalAcceptanceModal v-if="authStore.isAuthenticated" />
    <!-- PWA-Install-Banner: nur sichtbar wenn der Browser PWA-Install anbietet
         (Chrome/Edge/Tesla) oder iOS Safari ohne Standalone-Modus. -->
    <InstallPrompt />
    <!-- Globales Maintenance-Overlay: erscheint, wenn das Backend gerade
         nicht erreichbar ist (Deploy laeuft). Schliesst sich von alleine,
         sobald /api/health wieder antwortet. -->
    <MaintenanceOverlay />
    <!-- Einstellungs-Wizard: erscheint beim ersten Login oder wenn manuell
         aus den Einstellungen gestartet. -->
    <SettingsWizard v-if="showWizard" @close="showWizard = false" @done="showWizard = false" />
    <!-- iOS-style Bottom Tab Bar — nur Mobile, ersetzt den horizontalen
         Scroll-Streifen in der NavBar. Respektiert Dynamic Island / Home
         Indicator via env(safe-area-inset-bottom). -->
    <MobileTabBar />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import NavBar    from './components/NavBar.vue';
import AppFooter from './components/AppFooter.vue';
import LegalAcceptanceModal  from './components/LegalAcceptanceModal.vue';
import InstallPrompt         from './components/InstallPrompt.vue';
import MaintenanceOverlay    from './components/MaintenanceOverlay.vue';
import DemoBanner            from './components/DemoBanner.vue';
import NoticesBanner         from './components/NoticesBanner.vue';
import SettingsWizard        from './components/SettingsWizard.vue';
import EditorialStatusBar    from './components/EditorialStatusBar.vue';
import MobileTabBar          from './components/MobileTabBar.vue';
import { useAuthStore } from './store/auth.js';
import { usePrefsStore } from './store/prefs.js';
import api from './api.js';

const authStore   = useAuthStore();
const prefsStore  = usePrefsStore();
const versionInfo = ref(null);
const showWizard  = ref(false);

// Globale Event-Bus-Funktion zum Starten des Wizards (z.B. aus Settings.vue)
window.__launchWizard = () => { showWizard.value = true; };

// Spotlight: Mausbewegung → CSS-Variablen --mx / --my → radial-gradient folgt Cursor
let _raf = null;
function _onPointerMove(e) {
  if (_raf) return;
  _raf = requestAnimationFrame(() => {
    document.body.style.setProperty('--mx', e.clientX + 'px');
    document.body.style.setProperty('--my', e.clientY + 'px');
    _raf = null;
  });
}
onMounted(() => document.addEventListener('pointermove', _onPointerMove));
onUnmounted(() => document.removeEventListener('pointermove', _onPointerMove));

watch(() => authStore.isAuthenticated, async (authenticated) => {
  if (!authenticated) { versionInfo.value = null; showWizard.value = false; return; }
  try {
    const { data } = await api.get('/system/version');
    versionInfo.value = data;
  } catch { /* kein Versionsdaten, aber egal */ }

  // Präferenzen laden — danach ggf. Wizard für Erstbenutzer
  await prefsStore.load();
  if (!prefsStore.wizardCompleted) {
    setTimeout(() => { showWizard.value = true; }, 500);
  }
}, { immediate: true });
</script>

<style>
.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.route-fade-enter-from { opacity: 0; transform: translateY(4px); }
.route-fade-leave-to   { opacity: 0; transform: translateY(-2px); }
@media (prefers-reduced-motion: reduce) {
  .route-fade-enter-active, .route-fade-leave-active { transition: none; }
}
</style>

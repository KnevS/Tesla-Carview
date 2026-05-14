<template>
  <div class="min-h-screen bg-tesla-dark flex flex-col">
    <DemoBanner />
    <NavBar v-if="authStore.isAuthenticated" />
    <main :class="['flex-1', authStore.isAuthenticated ? 'max-w-7xl w-full mx-auto px-4 py-6' : '']">
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import NavBar    from './components/NavBar.vue';
import AppFooter from './components/AppFooter.vue';
import LegalAcceptanceModal from './components/LegalAcceptanceModal.vue';
import InstallPrompt        from './components/InstallPrompt.vue';
import MaintenanceOverlay   from './components/MaintenanceOverlay.vue';
import DemoBanner           from './components/DemoBanner.vue';
import SettingsWizard       from './components/SettingsWizard.vue';
import { useAuthStore } from './store/auth.js';
import { usePrefsStore } from './store/prefs.js';
import api from './api.js';

const authStore   = useAuthStore();
const prefsStore  = usePrefsStore();
const versionInfo = ref(null);
const showWizard  = ref(false);

// Globale Event-Bus-Funktion zum Starten des Wizards (z.B. aus Settings.vue)
window.__launchWizard = () => { showWizard.value = true; };

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

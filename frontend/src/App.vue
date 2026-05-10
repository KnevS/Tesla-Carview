<template>
  <div class="min-h-screen bg-tesla-dark flex flex-col">
    <NavBar v-if="authStore.isAuthenticated" />
    <main :class="['flex-1', authStore.isAuthenticated ? 'max-w-7xl w-full mx-auto px-4 py-6' : '']">
      <!-- sanfter Routenwechsel; respektiert prefers-reduced-motion (siehe style) -->
      <RouterView v-slot="{ Component }">
        <transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
    <!-- Globaler Footer mit Kontakt-Hinweis (nur für eingeloggte Pages — Login/Register tragen ihn selbst) -->
    <AppFooter
      v-if="authStore.isAuthenticated"
      :show-version="!!versionInfo"
      :version="versionInfo?.version || ''"
      :build-hash="versionInfo?.git?.hash || ''"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import NavBar    from './components/NavBar.vue';
import AppFooter from './components/AppFooter.vue';
import { useAuthStore } from './store/auth.js';
import api from './api.js';

const authStore   = useAuthStore();
const versionInfo = ref(null);

watch(() => authStore.isAuthenticated, async (authenticated) => {
  if (!authenticated) { versionInfo.value = null; return; }
  try {
    const { data } = await api.get('/system/version');
    versionInfo.value = data;
  } catch { /* Footer bleibt ohne Version, der Kontakt-Hinweis bleibt sichtbar */ }
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

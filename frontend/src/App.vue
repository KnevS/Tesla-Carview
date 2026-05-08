<template>
  <div class="min-h-screen bg-tesla-dark flex flex-col">
    <NavBar v-if="authStore.isAuthenticated" />
    <main :class="['flex-1', authStore.isAuthenticated ? 'max-w-7xl w-full mx-auto px-4 py-6' : '']">
      <RouterView />
    </main>
    <footer v-if="authStore.isAuthenticated && versionInfo" class="text-center py-2">
      <a
        :href="`https://github.com/KnevS/Tesla-Carview/commit/${versionInfo.git.hash}`"
        target="_blank" rel="noopener"
        class="text-xs text-gray-600 hover:text-gray-400 transition font-mono"
        :title="`Build: ${versionInfo.git.branch} · ${versionInfo.git.date ?? ''}`"
      >v{{ versionInfo.version }} · {{ versionInfo.git.hash }}</a>
    </footer>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import NavBar from './components/NavBar.vue';
import { useAuthStore } from './store/auth.js';
import api from './api.js';

const authStore  = useAuthStore();
const versionInfo = ref(null);

watch(() => authStore.isAuthenticated, async (authenticated) => {
  if (!authenticated) { versionInfo.value = null; return; }
  try {
    const { data } = await api.get('/system/version');
    versionInfo.value = data;
  } catch { /* footer bleibt unsichtbar */ }
}, { immediate: true });
</script>

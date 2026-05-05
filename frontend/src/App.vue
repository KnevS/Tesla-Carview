<template>
  <div class="min-h-screen bg-tesla-dark">
    <template v-if="ready">
      <NavBar v-if="authStore.isAuthenticated" />
      <main :class="authStore.isAuthenticated ? 'max-w-7xl mx-auto px-4 py-6' : ''">
        <RouterView />
      </main>
    </template>
    <div v-else class="flex items-center justify-center min-h-screen">
      <div class="text-gray-400 animate-pulse">Lade...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from './components/NavBar.vue';
import { useAuthStore } from './store/auth.js';
import { useAppStore }  from './store/index.js';

const authStore = useAuthStore();
const appStore  = useAppStore();
const router    = useRouter();
const ready     = ref(false);

onMounted(async () => {
  // Session aus Refresh-Cookie wiederherstellen
  const restored = await authStore.tryRestoreSession();
  if (restored) {
    await appStore.loadVehicles().catch(() => {});
  }
  ready.value = true;
});
</script>

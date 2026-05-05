<template>
  <div class="min-h-screen bg-tesla-dark">
    <NavBar />
    <main class="max-w-7xl mx-auto px-4 py-6">
      <div v-if="!appStore.authStatus" class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div class="text-6xl">⚡</div>
        <h1 class="text-3xl font-bold">Tesla Carview</h1>
        <p class="text-gray-400 text-center max-w-md">
          Verbinde dein Tesla-Fahrzeug, um Fahrten, Ladevorgänge und Batterie-Statistiken zu verfolgen.
        </p>
        <button @click="appStore.login()" class="btn-primary text-lg px-8 py-3">
          Mit Tesla verbinden
        </button>
      </div>
      <RouterView v-else />
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import NavBar from './components/NavBar.vue';
import { useAppStore } from './store/index.js';

const appStore = useAppStore();

onMounted(async () => {
  await appStore.checkAuth();
  if (appStore.authStatus) await appStore.loadVehicles();
});
</script>

<template>
  <div class="min-h-screen bg-tesla-dark">
    <NavBar v-if="authStore.isAuthenticated" />
    <main :class="authStore.isAuthenticated ? 'max-w-7xl mx-auto px-4 py-6' : ''">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import NavBar from './components/NavBar.vue';
import { useAuthStore } from './store/auth.js';

const authStore = useAuthStore();
</script>

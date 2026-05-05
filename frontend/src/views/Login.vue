<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="text-center">
        <div class="text-5xl mb-3">⚡</div>
        <h1 class="text-2xl font-bold">Tesla Carview</h1>
        <p class="text-gray-400 text-sm mt-1">Bitte anmelden</p>
      </div>

      <form @submit.prevent="submit" class="card space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Benutzername</label>
          <input
            v-model="form.username"
            type="text"
            autocomplete="username"
            required
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-tesla-red"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Passwort</label>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-tesla-red"
          />
        </div>

        <div v-if="error" class="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-2.5">
          {{ loading ? 'Anmelden...' : 'Anmelden' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';

const auth   = useAuthStore();
const app    = useAppStore();
const router = useRouter();
const route  = useRoute();

const form    = ref({ username: '', password: '' });
const loading = ref(false);
const error   = ref('');

async function submit() {
  error.value   = '';
  loading.value = true;
  try {
    const result = await auth.login(form.value.username, form.value.password);
    if (result.requiresMfa) {
      router.push('/login/mfa');
    } else {
      await app.loadVehicles().catch(() => {});
      router.push(route.query.redirect || '/');
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Anmeldung fehlgeschlagen';
  } finally {
    loading.value = false;
  }
}
</script>

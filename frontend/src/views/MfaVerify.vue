<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="text-center">
        <div class="text-5xl mb-3">🔐</div>
        <h1 class="text-xl font-bold">Zwei-Faktor-Authentifizierung</h1>
        <p class="text-gray-400 text-sm mt-1">
          {{ useBackup ? 'Backup-Code eingeben' : 'Code aus der Authenticator-App eingeben' }}
        </p>
      </div>

      <form @submit.prevent="submit" class="card space-y-4">
        <div>
          <input
            v-model="code"
            :type="useBackup ? 'text' : 'text'"
            :placeholder="useBackup ? 'XXXX-XXXX' : '000000'"
            :maxlength="useBackup ? 9 : 6"
            inputmode="numeric"
            autocomplete="one-time-code"
            required
            class="w-full bg-gray-700 rounded-lg px-3 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-tesla-red"
          />
        </div>

        <div v-if="error" class="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-2.5">
          {{ loading ? 'Pruefen...' : 'Bestaetigen' }}
        </button>

        <button type="button" @click="useBackup = !useBackup"
          class="w-full text-sm text-gray-400 hover:text-white transition"
        >
          {{ useBackup ? 'Authenticator-App nutzen' : 'Backup-Code nutzen' }}
        </button>

        <RouterLink to="/login" class="block text-center text-sm text-gray-500 hover:text-gray-300">
          Zurueck zum Login
        </RouterLink>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';

const auth      = useAuthStore();
const app       = useAppStore();
const router    = useRouter();
const code      = ref('');
const loading   = ref(false);
const error     = ref('');
const useBackup = ref(false);

async function submit() {
  error.value   = '';
  loading.value = true;
  try {
    await auth.verifyMfa(code.value);
    await app.loadVehicles().catch(() => {});
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.error || 'Code ungueltig';
    code.value  = '';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto space-y-6">
    <h1 class="text-2xl font-bold">🔐 Zwei-Faktor-Authentifizierung einrichten</h1>

    <!-- Schritt 1: QR-Code scannen -->
    <div v-if="step === 1" class="card space-y-4">
      <h2 class="font-semibold">Schritt 1: App verbinden</h2>
      <p class="text-gray-400 text-sm">
        Oeffne deine Authenticator-App (z.B. Google Authenticator, Authy oder
        den integrierten Passwort-Manager) und scanne diesen QR-Code:
      </p>
      <div class="flex justify-center">
        <img v-if="qrCode" :src="qrCode" alt="MFA QR-Code" class="rounded-xl w-48 h-48 bg-white p-2" />
        <div v-else class="w-48 h-48 bg-gray-700 rounded-xl animate-pulse" />
      </div>
      <button @click="step = 2" class="btn-primary w-full">Weiter</button>
    </div>

    <!-- Schritt 2: Code bestaetigen -->
    <div v-if="step === 2" class="card space-y-4">
      <h2 class="font-semibold">Schritt 2: Code bestaetigen</h2>
      <p class="text-gray-400 text-sm">Gib den 6-stelligen Code aus deiner App ein:</p>
      <input
        v-model="confirmCode"
        type="text" inputmode="numeric" maxlength="6" placeholder="000000"
        class="w-full bg-gray-700 rounded-lg px-3 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-tesla-red"
      />
      <div v-if="error" class="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
        {{ error }}
      </div>
      <div class="flex gap-3">
        <button @click="step = 1" class="btn-secondary flex-1">Zurueck</button>
        <button @click="confirm" :disabled="loading" class="btn-primary flex-1">
          {{ loading ? 'Pruefen...' : 'Aktivieren' }}
        </button>
      </div>
    </div>

    <!-- Schritt 3: Backup-Codes speichern -->
    <div v-if="step === 3" class="card space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-green-400 text-xl">✓</span>
        <h2 class="font-semibold">MFA aktiviert!</h2>
      </div>
      <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
        <p class="text-yellow-300 text-sm font-semibold mb-2">⚠️ Backup-Codes – jetzt sichern!</p>
        <p class="text-gray-300 text-sm mb-3">
          Diese Codes werden <strong>nur einmal</strong> angezeigt. Speichere sie sicher
          (z.B. Passwort-Manager). Jeder Code ist einmalig verwendbar.
        </p>
        <div class="grid grid-cols-2 gap-2">
          <code v-for="c in backupCodes" :key="c"
            class="bg-gray-800 rounded px-2 py-1 text-center text-sm font-mono">{{ c }}</code>
        </div>
      </div>
      <button @click="router.push('/settings')" class="btn-primary w-full">Fertig</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';

const router      = useRouter();
const step        = ref(1);
const qrCode      = ref(null);
const setupToken  = ref(null);
const confirmCode = ref('');
const backupCodes = ref([]);
const loading     = ref(false);
const error       = ref('');

onMounted(async () => {
  const { data } = await api.get('/mfa/setup');
  qrCode.value     = data.qrCode;
  setupToken.value = data.setupToken;
});

async function confirm() {
  error.value   = '';
  loading.value = true;
  try {
    const { data } = await api.post('/mfa/confirm', {
      setupToken: setupToken.value,
      code: confirmCode.value,
    });
    backupCodes.value = data.backupCodes;
    step.value = 3;
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Aktivieren';
  } finally {
    loading.value = false;
  }
}
</script>

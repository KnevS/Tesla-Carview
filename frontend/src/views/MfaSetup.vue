<template>
  <div class="max-w-lg mx-auto space-y-6">
    <h1 class="text-2xl font-bold">🔐 Zwei-Faktor-Authentifizierung einrichten</h1>

    <div v-if="step === 1" class="card space-y-4">
      <h2 class="font-semibold">Schritt 1: App verbinden</h2>
      <p class="text-gray-400 text-sm">
        Öffne deine Authenticator-App (z.B. Google Authenticator, Authy oder
        den integrierten Passwort-Manager) und scanne diesen QR-Code:
      </p>
      <div class="flex justify-center">
        <img v-if="qrCode" :src="qrCode" alt="MFA QR-Code" class="rounded-xl w-64 h-64 bg-white p-3 cursor-help"
          v-tooltip="'Scanne diesen QR-Code einmalig mit deiner Authenticator-App. Die App speichert daraufhin ein Geheimnis und generiert daraus alle 30 Sekunden einen neuen 6-stelligen Code.'" />
        <div v-else class="w-64 h-64 bg-gray-700 rounded-xl animate-pulse" />
      </div>
      <button @click="step = 2" class="btn-primary w-full"
        v-tooltip="'Erst weiterklicken nachdem du den QR-Code in deiner App gespeichert hast'">Weiter</button>
    </div>

    <div v-if="step === 2" class="card space-y-4">
      <h2 class="font-semibold">Schritt 2: Code bestätigen</h2>
      <p class="text-gray-400 text-sm">Gib den 6-stelligen Code aus deiner App ein:</p>
      <input
        v-model="confirmCode"
        type="text" inputmode="numeric" maxlength="6" placeholder="000000"
        v-tooltip="'Der aktuelle 6-stellige Code aus deiner Authenticator-App. Bestätigt dass die Verbindung korrekt funktioniert.'"
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

    <div v-if="step === 3" class="card space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-green-400 text-xl">✓</span>
        <h2 class="font-semibold">MFA aktiviert!</h2>
      </div>
      <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
        <p class="text-yellow-300 text-sm font-semibold mb-2"
          v-tooltip="'Diese Codes sind die letzte Rettung wenn du keinen Zugriff auf deine Authenticator-App hast. Verliere sie nicht!'">
          ⚠️ Backup-Codes – jetzt sichern!
        </p>
        <p class="text-gray-300 text-sm mb-3">
          Diese Codes werden <strong>nur einmal</strong> angezeigt. Speichere sie sicher
          (z.B. Passwort-Manager). Jeder Code ist einmalig verwendbar.
        </p>
        <div class="grid grid-cols-2 gap-2">
          <code v-for="c in backupCodes" :key="c"
            v-tooltip="'Einmal-Code – nach Verwendung wird dieser Code ungültig'"
            class="bg-gray-800 rounded px-2 py-1 text-center text-sm font-mono cursor-help">{{ c }}</code>
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

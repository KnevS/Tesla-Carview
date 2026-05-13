<template>
  <div class="auth-shell">
    <main class="auth-main">
      <div class="w-full max-w-sm space-y-6 text-center">

        <div>
          <AppIcon name="bolt" :size="56" class="text-tesla-red mx-auto mb-3" />
          <h1 class="text-2xl font-bold">Tesla Carview</h1>
        </div>

        <div class="card space-y-3">
          <h2 class="font-semibold">{{ $t('auth.pairTitle') }}</h2>

          <div v-if="state === 'pending'" class="text-sm text-gray-400">
            {{ $t('auth.pairWaiting') }}
          </div>

          <div v-else-if="state === 'success'" class="text-sm text-green-400">
            {{ $t('auth.pairSuccess') }}
          </div>

          <div v-else class="space-y-3">
            <p class="text-sm text-red-400">{{ error || $t('auth.pairError') }}</p>
            <RouterLink to="/login" class="btn-primary block">
              {{ $t('auth.loginBtn') }}
            </RouterLink>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import AppIcon          from '../components/AppIcon.vue';

const route  = useRoute();
const router = useRouter();
const auth   = useAuthStore();
const app    = useAppStore();

const state = ref('pending');   // pending | success | error
const error = ref('');

onMounted(async () => {
  const token = route.params.token;
  if (typeof token !== 'string' || token.length !== 64) {
    state.value = 'error';
    return;
  }
  try {
    // Pair-Consume liefert AccessToken + setzt refresh-Cookie. Der
    // Auth-Store uebernimmt das gleiche State-Handling wie ein normaler
    // Passwort-/Passkey-Login.
    await auth.loginWithPairToken(token);
    // Token sofort aus der Browser-URL/History raeumen — er ist zwar
    // single-use und vom Server geloescht, aber wir vermeiden, dass er
    // in Browser-Sync (Chrome Sync, iCloud) oder Verlauf bestehen
    // bleibt und beim naechsten /pair/<alt-token>-Aufruf einen Fehler
    // statt einer leeren Adressleiste zeigt.
    history.replaceState({}, '', '/');
    state.value = 'success';
    // Kurz die Erfolgsmeldung sichtbar lassen, dann weiterleiten.
    await app.loadVehicles().catch(() => {});
    setTimeout(() => router.replace('/'), 600);
  } catch (err) {
    state.value = 'error';
    error.value = err.response?.data?.error || err.message || '';
  }
});
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}
</style>

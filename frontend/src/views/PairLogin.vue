<template>
  <div class="auth-shell">
    <div class="auth-glow" aria-hidden="true"></div>

    <div class="auth-lang">
      <LangSwitcher compact />
    </div>

    <main class="auth-main">
      <div class="w-full max-w-sm space-y-6">

        <div class="text-center">
          <AppIcon name="bolt" :size="56" class="text-tesla-red mx-auto mb-3" />
          <h1 class="text-2xl font-bold">Tesla Carview</h1>
          <p class="text-gray-400 text-sm mt-1">{{ $t('pair.title') }}</p>
        </div>

        <!-- Lade-Zustand -->
        <div v-if="state === 'loading'" class="card text-center py-8 space-y-3">
          <div class="animate-spin w-10 h-10 border-4 border-tesla-red border-t-transparent rounded-full mx-auto"></div>
          <p class="text-gray-400 text-sm">{{ $t('pair.loading') }}</p>
        </div>

        <!-- Session ungültig / abgelaufen -->
        <div v-else-if="state === 'invalid'" class="card text-center py-8 space-y-4">
          <AppIcon name="warning" :size="48" class="text-red-400 mx-auto" />
          <p class="text-red-300 font-medium">{{ $t('pair.invalid') }}</p>
          <p class="text-gray-500 text-sm">{{ $t('pair.invalidHint') }}</p>
        </div>

        <!-- Bereits bestätigt -->
        <div v-else-if="state === 'already_confirmed'" class="card text-center py-8 space-y-4">
          <AppIcon name="check" :size="48" class="text-green-400 mx-auto" />
          <p class="text-green-300 font-medium">{{ $t('pair.alreadyConfirmed') }}</p>
        </div>

        <!-- Kein Passkey auf diesem Gerät -->
        <div v-else-if="state === 'no_passkey'" class="card text-center py-8 space-y-4">
          <AppIcon name="lock" :size="48" class="text-yellow-400 mx-auto" />
          <p class="text-yellow-200 font-medium">{{ $t('pair.noPasskey') }}</p>
          <p class="text-gray-400 text-sm">{{ $t('pair.noPasskeyHint') }}</p>
        </div>

        <!-- Bereit — Passkey-Prompt starten -->
        <div v-else-if="state === 'ready'" class="card space-y-5">
          <div class="text-center space-y-2">
            <AppIcon name="smartphone" :size="48" class="text-tesla-red mx-auto" />
            <p class="text-gray-200 font-medium">{{ $t('pair.readyTitle') }}</p>
            <p class="text-gray-400 text-sm">{{ $t('pair.readyHint') }}</p>
          </div>

          <!-- Weiterleitung nach Login anzeigen -->
          <div v-if="redirectPath" class="bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-300 text-center">
            → {{ redirectPath }}
          </div>

          <div v-if="error" class="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
            {{ error }}
          </div>

          <div class="text-center text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
            {{ $t('pair.expires') }}: {{ expiresIn }}
          </div>

          <button @click="doAuth" :disabled="authenticating"
            class="btn-primary w-full py-3 text-base flex items-center justify-center gap-2">
            <AppIcon name="fingerprint" :size="20" />
            {{ authenticating ? $t('pair.authenticating') : $t('pair.authBtn') }}
          </button>
        </div>

        <!-- Erfolg -->
        <div v-else-if="state === 'success'" class="card text-center py-8 space-y-4">
          <div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <AppIcon name="check" :size="36" class="text-green-400" />
          </div>
          <p class="text-green-300 text-lg font-semibold">{{ $t('pair.success') }}</p>
          <p class="text-gray-400 text-sm">{{ $t('pair.successHint', { username }) }}</p>
          <p v-if="redirectPath" class="text-gray-500 text-xs animate-pulse">
            {{ $t('pair.redirecting') }}
          </p>
        </div>

        <!-- Fehler beim Bestätigen -->
        <div v-else-if="state === 'error'" class="card text-center py-8 space-y-4">
          <AppIcon name="warning" :size="48" class="text-red-400 mx-auto" />
          <p class="text-red-300 font-medium">{{ $t('pair.failed') }}</p>
          <p class="text-gray-400 text-sm">{{ error }}</p>
          <button @click="retry" class="btn-secondary text-sm px-4 py-2">
            {{ $t('pair.retry') }}
          </button>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import LangSwitcher from '../components/LangSwitcher.vue';
import AppIcon from '../components/AppIcon.vue';

const route    = useRoute();
const router   = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const token       = route.params.token;
const state       = ref('loading'); // loading | invalid | already_confirmed | no_passkey | ready | authenticating | success | error
const error       = ref('');
const authenticating = ref(false);
const username    = ref('');
const tenantId    = ref('');
const expiresAt   = ref(0);
const redirectPath = ref(null); // Weiterleitung nach Login
let expiryTimer   = null;

const expiresIn = computed(() => {
  const diff = expiresAt.value - Math.floor(Date.now() / 1000);
  if (diff <= 0) return t('pair.expired');
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

onMounted(async () => {
  try {
    const { data } = await api.get(`/pair/info/${token}`);
    if (data.status === 'already_confirmed') {
      state.value = 'already_confirmed';
      return;
    }
    tenantId.value   = data.tenantId;
    expiresAt.value  = data.expiresAt;
    redirectPath.value = data.redirectPath || null;

    // Passkey-Unterstützung prüfen
    const hasAuthenticator = window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable
      ? await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false)
      : false;

    if (!hasAuthenticator) {
      state.value = 'no_passkey';
      return;
    }

    state.value = 'ready';
    expiryTimer = setInterval(() => {
      if (expiresAt.value - Math.floor(Date.now() / 1000) <= 0) {
        state.value = 'invalid';
        clearInterval(expiryTimer);
      }
    }, 1000);
  } catch (err) {
    state.value = 'invalid';
  }
});

onUnmounted(() => clearInterval(expiryTimer));

async function doAuth() {
  error.value = '';
  authenticating.value = true;
  try {
    // 1. Auth-Optionen vom Server holen (nutzt bestehenden passkey-Endpoint)
    const { data: opts } = await api.post('/passkey/login-options', { tenantId: tenantId.value });

    // 2. Browser WebAuthn
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const response = await startAuthentication({ optionsJSON: opts });

    // 3. Pair-Session bestätigen
    const { data: confirmData } = await api.post(`/pair/confirm/${token}`, {
      challengeId: opts.challengeId,
      tenantId:    tenantId.value,
      response,
    });

    username.value = confirmData.username ?? response.userHandle ?? '';

    // 4. Self-Auth nur wenn dieser Browser noch KEINEN Login hat.
    //    Sonst (typischer Cross-Device-Flow: bereits eingeloggtes Phone
    //    bestätigt für ein neues Gerät wie ein Tesla-Display) würde der
    //    Poll hier den JWT vom Display klauen und das Display gerät in
    //    eine "Code abgelaufen"-Schleife, weil der Server `used_at` setzt.
    //    Self-Auth-Fall (Same-Device): authStore.accessToken ist leer
    //    → dieser Browser holt den JWT selbst.
    if (!authStore.accessToken) {
      try {
        const { data: pollData } = await api.get(`/pair/poll/${token}`);
        if (pollData.status === 'confirmed' && pollData.accessToken) {
          authStore.accessToken = pollData.accessToken;
          authStore.user = { ...pollData.user, tenantSlug: authStore.tenantSlug };
          username.value = pollData.user?.username ?? username.value;
          state.value    = 'success';
          clearInterval(expiryTimer);

          const dest = pollData.redirectPath || redirectPath.value;
          if (dest) {
            setTimeout(() => router.push(dest), 1800);
          }
          return;
        }
      } catch {
        // JWT-Holen fehlgeschlagen — Session ist trotzdem bestätigt.
      }
    }

    state.value = 'success';
    clearInterval(expiryTimer);
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      error.value = t('pair.cancelled');
      state.value = 'ready';
    } else {
      error.value = err.response?.data?.error || err.message || t('pair.failedGeneric');
      state.value = 'error';
    }
  } finally {
    authenticating.value = false;
  }
}

function retry() {
  error.value = '';
  state.value = 'ready';
}
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  position: relative;
  z-index: 1;
}
.auth-lang {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 30;
}
.auth-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(720px 420px at 18% 12%, rgba(99,102,241,0.18), transparent 60%),
    radial-gradient(620px 360px at 82% 88%, rgba(236,72,153,0.10), transparent 60%);
}
</style>

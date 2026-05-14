<template>
  <div class="auth-shell">
    <!-- weicher Glow-Hintergrund (Visual Polish, prefers-reduced-motion-safe) -->
    <div class="auth-glow" aria-hidden="true"></div>

    <!-- Sprach-Selector oben rechts, fixed -->
    <div class="auth-lang">
      <LangSwitcher compact />
    </div>

    <main class="auth-main">
      <div class="w-full max-w-sm space-y-6">

        <div class="text-center">
          <AppIcon name="bolt" :size="56" class="text-tesla-red mx-auto mb-3" />
          <h1 class="text-2xl font-bold">Tesla Carview</h1>
          <p class="text-gray-400 text-sm mt-1">{{ $t('auth.loginTitle') }}</p>
        </div>

        <form @submit.prevent="submit" class="card space-y-4">

          <!-- Mandant (nur anzeigen wenn mehrere vorhanden). Im Drop-
               down erscheinen ausschliesslich PSEUDONYME (z.B.
               „brave-eagle"), nicht der Klarname. Datenschutz:
               sonst wuerde die oeffentliche Login-Seite verraten,
               welche Firmen / Personen den Self-Hoster nutzen. -->
          <div v-if="showTenantField">
            <label class="block text-sm text-gray-400 mb-1">{{ $t('auth.tenant') }}</label>
            <select v-if="realTenants.length > 0" v-model="form.tenantSlug" class="input">
              <option value="">{{ $t('auth.tenantPlaceholder') }}</option>
              <option v-for="t in realTenants" :key="t.slug" :value="t.slug">{{ t.pseudonym || t.slug }}</option>
            </select>
            <input v-else v-model="form.tenantSlug" type="text" class="input" placeholder="brave-eagle"
              autocomplete="organization" />
            <p class="text-xs text-gray-500 mt-1">{{ $t('auth.tenantHint') }}</p>
          </div>

          <div>
            <label class="block text-sm text-gray-400 mb-1">{{ $t('auth.username') }}</label>
            <input v-model="form.username" type="text" autocomplete="username" required
              class="w-full bg-gray-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-tesla-red" />
          </div>

          <div>
            <label class="block text-sm text-gray-400 mb-1">{{ $t('auth.password') }}</label>
            <input v-model="form.password" type="password" autocomplete="current-password" required
              class="w-full bg-gray-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-tesla-red" />
          </div>

          <!-- Eingeloggt bleiben: setzt 90-Tage statt 7-Tage Session -->
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input v-model="form.rememberMe" type="checkbox"
              class="w-5 h-5 rounded accent-tesla-red cursor-pointer" />
            <span class="text-sm text-gray-300">{{ $t('auth.rememberMe') }}</span>
          </label>

          <div v-if="error" class="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full py-3 text-base">
            {{ loading ? $t('auth.loggingIn') : $t('auth.loginBtn') }}
          </button>

          <!-- Passkey-Login: nur anzeigen wenn Platform-Authenticator vorhanden -->
          <button v-if="hasPasskey" type="button" @click="loginPasskey" :disabled="passkeyLoading"
            class="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 flex items-center justify-center gap-2 transition">
            <AppIcon name="lock" :size="16" />
            {{ passkeyLoading ? $t('auth.passkeyAuthenticating') : $t('auth.passkeyBtn') }}
          </button>

          <!-- QR-Pair-Login: immer anzeigen — funktioniert auch im Tesla-Browser -->
          <button type="button" @click="openQrModal"
            class="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-sm text-gray-300 flex items-center justify-center gap-2 transition">
            <AppIcon name="qr-code" :size="16" />
            {{ $t('auth.qrLoginBtn') }}
          </button>
        </form>

        <!-- QR-Modal -->
        <Teleport to="body">
          <div v-if="showQr" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            @click.self="closeQrModal">
            <div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xs mx-4 space-y-4 text-center">
              <h2 class="text-lg font-semibold">{{ $t('auth.qrModalTitle') }}</h2>

              <div v-if="qrLoading" class="flex justify-center py-4">
                <div class="animate-spin w-10 h-10 border-4 border-tesla-red border-t-transparent rounded-full"></div>
              </div>

              <div v-else-if="qrExpired" class="space-y-3 py-2">
                <AppIcon name="warning" :size="40" class="text-yellow-400 mx-auto" />
                <p class="text-yellow-300 text-sm">{{ $t('auth.qrExpired') }}</p>
                <button @click="refreshQr" class="btn-primary text-sm px-4 py-2">{{ $t('auth.qrRefresh') }}</button>
              </div>

              <template v-else>
                <p class="text-gray-400 text-sm">{{ $t('auth.qrHint') }}</p>
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code"
                  class="mx-auto rounded-xl w-52 h-52 object-contain" />
                <p class="text-xs text-gray-500">{{ $t('auth.qrExpires') }}: {{ qrExpiresIn }}</p>
                <p class="text-xs text-gray-600">{{ $t('auth.qrWaiting') }}</p>
              </template>

              <button @click="closeQrModal" class="w-full py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition">
                {{ $t('common.cancel') }}
              </button>
            </div>
          </div>
        </Teleport>

        <div class="text-center space-y-2">
          <RouterLink to="/register" class="text-sm text-tesla-red hover:underline block">
            {{ $t('auth.registerLink') }}
          </RouterLink>
          <RouterLink to="/reset-password" class="text-sm text-gray-500 hover:text-gray-300 block">
            {{ $t('auth.forgotPw') }}
          </RouterLink>
          <RouterLink to="/handbook" class="text-sm text-gray-600 hover:text-gray-400 block">
            {{ $t('auth.handbook') }}
          </RouterLink>
        </div>

        <!-- Demo-Sandbox: nur ein dezenter Link, sichtbar wenn der
             Operator DEMO_ENABLED=true gesetzt hat. Volle Erklärung +
             „Demo starten"-Button leben unter /demo, damit die Login-
             Seite aufgeräumt bleibt. -->
        <p v-if="demoStatus.enabled" class="text-center text-sm">
          <RouterLink to="/demo" class="inline-flex items-center gap-1.5 text-blue-300 hover:text-blue-200 hover:underline">
            🧪 Tesla Carview ausprobieren — ohne Tesla →
          </RouterLink>
        </p>

        <!-- Self-Host-Hinweis: Open-Source-Projekt, jeder darf eine eigene
             Instanz fuer private Nutzung aufsetzen. Dezent, ohne Druck;
             Footer hat schon die Copyright-Zeile, hier nur die
             zusaetzliche Self-Hosting-Einladung. -->
        <p class="text-center text-xs text-gray-500 pt-1">
          <i18n-t keypath="auth.selfHostHint" tag="span">
            <template #link>
              <a href="https://github.com/KnevS/Tesla-Carview"
                 target="_blank" rel="noopener noreferrer"
                 class="text-blue-400 hover:text-blue-300 hover:underline">
                {{ $t('auth.selfHostLink') }} ↗
              </a>
            </template>
          </i18n-t>
        </p>

      </div>
    </main>
    <!-- Footer kommt global aus App.vue — nicht hier nochmal einbinden,
         sonst doppelt sobald ein eingeloggter User auf /login zurueck-
         navigiert. -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import api              from '../api.js';
import LangSwitcher     from '../components/LangSwitcher.vue';
import AppIcon          from '../components/AppIcon.vue';

const auth   = useAuthStore();
const app    = useAppStore();
const router = useRouter();
const route  = useRoute();
const { t }  = useI18n();

const form           = ref({ username: '', password: '', tenantSlug: auth.tenantSlug || '', rememberMe: false });
const loading        = ref(false);
const passkeyLoading = ref(false);
const error          = ref('');
const tenants        = ref([]);
const hasPasskey     = ref(false);

// QR-Pair-Login
const showQr      = ref(false);
const qrLoading   = ref(false);
const qrDataUrl   = ref('');
const qrToken     = ref('');
const qrExpiresAt = ref(0);
const qrExpired   = ref(false);
let qrPollTimer   = null;
let qrExpiryTimer = null;

const qrExpiresIn = computed(() => {
  const diff = qrExpiresAt.value - Math.floor(Date.now() / 1000);
  if (diff <= 0) return t('auth.qrExpiredLabel');
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

// Demo-Sandbox: nur noch der Schalter „aktiviert ja/nein" wird hier
// gebraucht, damit ggf. ein Link auf /demo eingeblendet wird. Die
// eigentliche Demo-Seite (Erklärung + Start-Button + Slot-Status)
// lebt jetzt unter /demo.
const demoStatus = ref({ enabled: false });

const realTenants = computed(() => tenants.value.filter(t => !t.is_demo));
const showTenantField = computed(() => realTenants.value.length > 1);

onMounted(async () => {
  await auth.loadTenants();
  tenants.value = auth.availableTenants;
  if (auth.tenantSlug) form.value.tenantSlug = auth.tenantSlug;
  try {
    const { data } = await (await import('../api.js')).default.get('/demo/status');
    demoStatus.value = data;
  } catch { /* Demo nicht aktiv — kein Drama */ }
  // Passkey-Button nur zeigen wenn Platform-Authenticator verfuegbar
  // (Fingerabdruck/Face-ID). Im Tesla-Browser nicht vorhanden → verstecken.
  if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
    hasPasskey.value = await window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
  }
});

async function submit() {
  error.value   = '';
  loading.value = true;
  try {
    const result = await auth.login(form.value.username, form.value.password, form.value.tenantSlug || undefined, form.value.rememberMe);
    if (result.requiresMfa) {
      router.push('/login/mfa');
    } else {
      await app.loadVehicles().catch(() => {});
      router.push(route.query.redirect || '/');
    }
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.loginError');
  } finally {
    loading.value = false;
  }
}

async function loginPasskey() {
  error.value          = '';
  passkeyLoading.value = true;
  try {
    await auth.loginWithPasskey(form.value.tenantSlug || undefined);
    await app.loadVehicles().catch(() => {});
    router.push(route.query.redirect || '/');
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      error.value = t('auth.passkeyCancelled');
    } else {
      error.value = err.response?.data?.error || err.message || t('auth.passkeyFailed');
    }
  } finally {
    passkeyLoading.value = false;
  }
}

async function openQrModal() {
  showQr.value   = true;
  qrExpired.value = false;
  await fetchQr();
}

async function fetchQr() {
  qrLoading.value = true;
  qrDataUrl.value = '';
  qrToken.value   = '';
  qrExpired.value  = false;
  clearInterval(qrPollTimer);
  clearInterval(qrExpiryTimer);
  try {
    const slug = form.value.tenantSlug || undefined;
    const params = slug ? `?tenantSlug=${encodeURIComponent(slug)}` : '';
    const { data } = await api.get(`/pair/init${params}`);
    qrDataUrl.value   = data.qrDataUrl;
    qrToken.value     = data.token;
    qrExpiresAt.value = data.expiresAt;

    // Alle 2s auf Bestätigung prüfen
    qrPollTimer = setInterval(async () => {
      try {
        const { data: poll } = await api.get(`/pair/poll/${qrToken.value}`);
        if (poll.status === 'confirmed') {
          clearInterval(qrPollTimer);
          clearInterval(qrExpiryTimer);
          auth.accessToken = poll.accessToken;
          auth.user        = poll.user;
          showQr.value = false;
          await app.loadVehicles().catch(() => {});
          router.push(route.query.redirect || '/');
        } else if (poll.status === 'expired') {
          clearInterval(qrPollTimer);
          qrExpired.value = true;
        }
      } catch { /* weiter versuchen */ }
    }, 2000);

    // Nach Ablauf QR als abgelaufen markieren
    qrExpiryTimer = setTimeout(() => {
      qrExpired.value = true;
      clearInterval(qrPollTimer);
    }, (data.expiresAt - Math.floor(Date.now() / 1000)) * 1000);
  } catch (err) {
    qrExpired.value = true;
  } finally {
    qrLoading.value = false;
  }
}

function refreshQr() {
  fetchQr();
}

function closeQrModal() {
  showQr.value = false;
  clearInterval(qrPollTimer);
  clearInterval(qrExpiryTimer);
}

onUnmounted(() => {
  clearInterval(qrPollTimer);
  clearInterval(qrExpiryTimer);
});
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
@media (prefers-reduced-motion: reduce) {
  .auth-glow { filter: none; }
}
</style>

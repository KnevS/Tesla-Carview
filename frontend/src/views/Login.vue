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
            <select v-if="tenants.length > 0" v-model="form.tenantSlug" class="input">
              <option value="">{{ $t('auth.tenantPlaceholder') }}</option>
              <option v-for="t in tenants" :key="t.slug" :value="t.slug">{{ t.pseudonym || t.slug }}</option>
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
        </form>

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
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
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

// Demo-Sandbox: nur noch der Schalter „aktiviert ja/nein" wird hier
// gebraucht, damit ggf. ein Link auf /demo eingeblendet wird. Die
// eigentliche Demo-Seite (Erklärung + Start-Button + Slot-Status)
// lebt jetzt unter /demo.
const demoStatus = ref({ enabled: false });

const showTenantField = computed(() => tenants.value.length > 1);

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

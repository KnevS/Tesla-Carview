<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="max-w-lg mx-auto space-y-6 relative">
    <!-- Inline-Sprachschalter: MfaSetup ist Pflicht-Flow für neue User, daher
         direkt im Schritt umschaltbar (oben rechts), ohne Profil-Umweg. -->
    <div class="absolute top-0 right-0">
      <LangSwitcher compact v-tooltip="$t('lang.switcherHint')" />
    </div>

    <h1 class="text-2xl font-bold flex items-center gap-2 pr-16">
      <AppIcon name="lock" :size="24" class="text-tesla-red" />
      {{ $t('mfa.setupTitle') }}
    </h1>

    <!-- Banner: User wurde vom Router-Guard hierhin gezwungen, weil sein
         Profil mfa_required=1 hat (Pflicht-MFA für neue Benutzer). -->
    <div v-if="forced" class="card border border-yellow-700/60 bg-yellow-900/20">
      <p class="text-sm text-yellow-200">
        {{ $t('mfa.requiredBanner') }}
      </p>
    </div>

    <div v-if="step === 1" class="card space-y-4">
      <h2 class="font-semibold">{{ $t('mfa.step1Title') }}</h2>
      <p class="text-gray-400 text-sm">
        {{ $t('mfa.step1Body') }}
      </p>
      <div class="flex justify-center">
        <div v-if="qrCode"
             class="rounded-xl bg-white p-4 cursor-help qr-container"
             v-html="qrCode"
             v-tooltip="$t('mfa.qrTooltip')" />
        <div v-else-if="qrError" class="w-64 h-64 bg-gray-700 rounded-xl flex items-center justify-center text-red-400 text-sm text-center px-4">
          {{ $t('mfa.qrLoadError') }}
        </div>
        <div v-else class="w-64 h-64 bg-gray-700 rounded-xl animate-pulse" />
      </div>
      <button @click="step = 2" class="btn-primary w-full"
        v-tooltip="$t('mfa.nextStepTooltip')">{{ $t('mfa.nextStep') }}</button>
    </div>

    <div v-if="step === 2" class="card space-y-4">
      <h2 class="font-semibold">{{ $t('mfa.step2Title') }}</h2>
      <p class="text-gray-400 text-sm">{{ $t('mfa.step2Body') }}</p>
      <input
        v-model="confirmCode"
        type="text" inputmode="numeric" maxlength="6" placeholder="000000"
        v-tooltip="$t('mfa.codeTooltip')"
        class="w-full bg-gray-700 rounded-lg px-3 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-tesla-red"
      />
      <div v-if="error" class="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
        {{ error }}
      </div>
      <div class="flex gap-3">
        <button @click="step = 1" class="btn-secondary flex-1">{{ $t('mfa.backStep') }}</button>
        <button @click="confirm" :disabled="loading" class="btn-primary flex-1">
          {{ loading ? $t('mfa.checking') : $t('mfa.activate') }}
        </button>
      </div>
    </div>

    <div v-if="step === 3" class="card space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-green-400 text-xl">✓</span>
        <h2 class="font-semibold">{{ $t('mfa.step3Title') }}</h2>
      </div>
      <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
        <p class="text-yellow-300 text-sm font-semibold mb-2 flex items-center gap-1.5"
          v-tooltip="$t('mfa.backupTooltip')">
          <AppIcon name="alert" :size="16" />
          {{ $t('mfa.backupWarning') }}
        </p>
        <p class="text-gray-300 text-sm mb-3">
          {{ $t('mfa.backupBody') }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <code v-for="c in backupCodes" :key="c"
            v-tooltip="$t('mfa.backupCodeTooltip')"
            class="bg-gray-800 rounded px-2 py-1 text-center text-sm font-mono cursor-help">{{ c }}</code>
        </div>
      </div>
      <button @click="router.push('/settings')" class="btn-primary w-full">{{ $t('mfa.done') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';
import AppIcon from '../components/AppIcon.vue';
import LangSwitcher from '../components/LangSwitcher.vue';

const router      = useRouter();
const route       = useRoute();
const auth        = useAuthStore();
const { t }       = useI18n();
const step        = ref(1);
const qrCode      = ref(null);
const setupToken  = ref(null);
const confirmCode = ref('');
const backupCodes = ref([]);
const loading     = ref(false);
const error       = ref('');
const qrError     = ref(false);
const forced      = computed(() => route.query.forced === '1' || auth.mustEnableMfa);

onMounted(async () => {
  try {
    const { data } = await api.get('/mfa/setup');
    qrCode.value     = data.qrCode;
    setupToken.value = data.setupToken;
  } catch {
    qrError.value = true;
  }
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
    // Lokale Auth-State updaten — sonst sperrt der Router-Guard den User
    // weiter ein, weil mfaEnabled noch false steht. Zwei mögliche Felder
    // pflegen, weil /me snake_case und /login camelCase liefert.
    if (auth.user) {
      auth.user.mfaEnabled  = true;
      auth.user.mfa_enabled = true;
    }
    step.value = 3;
  } catch (err) {
    error.value = err.response?.data?.error || t('mfa.errorActivate');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.qr-container { width: 264px; height: 264px; }
.qr-container :deep(svg) { width: 100%; height: 100%; display: block; }
</style>

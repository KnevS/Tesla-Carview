<template>
  <div class="auth-shell">
    <div class="auth-glow" aria-hidden="true"></div>

    <div class="auth-lang">
      <LangSwitcher compact />
    </div>

    <main class="auth-main">
      <div class="w-full max-w-md space-y-6">

        <div class="text-center">
          <div class="text-5xl mb-3">⚡</div>
          <h1 class="text-2xl font-bold">Tesla Carview</h1>
          <p class="text-gray-400 text-sm mt-1">{{ $t('register.title') }}</p>
        </div>

        <!-- Invite-Prüfung -->
        <div v-if="inviteChecking" class="card text-center text-gray-400 text-sm py-6">
          {{ $t('register.checkingInvite') }}
        </div>
        <div v-else-if="inviteError" class="card space-y-3 text-center">
          <p class="text-4xl">🔒</p>
          <p class="text-red-400 font-semibold">{{ inviteError }}</p>
          <p class="text-sm text-gray-400">{{ $t('register.noInvite') }}</p>
          <RouterLink to="/login" class="btn-secondary inline-block text-sm">
            {{ $t('register.backToLogin') }}
          </RouterLink>
        </div>

        <template v-if="inviteValid">
        <div class="flex items-center justify-center gap-2">
          <div v-for="i in 3" :key="i"
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
            :class="step >= i ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-500'">
            {{ i }}
          </div>
        </div>

        <!-- Schritt 1: Mandanteninfo -->
        <div v-if="step === 1" class="card space-y-4">
          <h2 class="font-semibold text-lg">{{ $t('register.tenantName') }}</h2>
          <p class="text-sm text-gray-400">{{ $t('register.subtitle') }}</p>
          <div>
            <label class="label">{{ $t('register.tenantNameLabel') }}</label>
            <input v-model="form.tenantName" type="text" class="input" :placeholder="$t('register.tenantNamePlaceholder')" />
            <p class="text-xs text-gray-500 mt-1">{{ $t('register.tenantNameHint') }}</p>
          </div>
          <div>
            <label class="label">{{ $t('register.tenantSlug') }}</label>
            <div class="flex gap-2 items-center">
              <input v-model="form.tenantSlug" type="text" class="input" :placeholder="$t('register.tenantSlugPlaceholder')"
                @input="slugChecked = false" @blur="checkSlug" />
              <span v-if="slugChecked && slugAvailable" class="text-green-400 text-lg">✓</span>
              <span v-if="slugChecked && !slugAvailable" class="text-red-400 text-lg">✗</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ $t('register.tenantSlugHint') }}</p>
            <p v-if="slugChecked && !slugAvailable" class="text-xs text-red-400 mt-1">{{ $t('register.slugTaken') }}</p>
          </div>
          <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
          <button @click="nextStep1" class="btn-primary w-full">{{ $t('common.next') }}</button>
          <RouterLink to="/login" class="block text-center text-sm text-gray-500 hover:text-gray-300">
            {{ $t('register.backToLogin') }}
          </RouterLink>
        </div>

        <!-- Schritt 2: Admin-Account -->
        <div v-if="step === 2" class="card space-y-4">
          <h2 class="font-semibold text-lg">{{ $t('register.adminAccount') }}</h2>
          <div>
            <label class="label">{{ $t('auth.username') }}</label>
            <input v-model="form.adminUsername" type="text" class="input" placeholder="admin"
              autocomplete="username" />
            <p class="text-xs text-gray-500 mt-1">{{ $t('register.usernameHint') }}</p>
          </div>
          <div>
            <label class="label">{{ $t('auth.password') }}</label>
            <input v-model="form.adminPassword" type="password" class="input"
              :placeholder="$t('register.passwordMinHint')" autocomplete="new-password" />
            <div v-if="form.adminPassword" class="mt-2 space-y-1">
              <div class="flex gap-1">
                <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded"
                  :class="passwordStrength >= i ? strengthColor : 'bg-gray-700'"></div>
              </div>
              <p class="text-xs" :class="strengthTextColor">{{ strengthLabel }}</p>
            </div>
          </div>
          <div>
            <label class="label">{{ $t('register.passwordConfirm') }}</label>
            <input v-model="form.adminConfirm" type="password" class="input" autocomplete="new-password" />
          </div>

          <!-- Pflicht-Akzeptanz Privacy + Terms — DSGVO-Nachweis -->
          <div class="space-y-2 pt-1 border-t border-gray-700/40">
            <label class="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" v-model="acceptPrivacy" class="mt-1 h-4 w-4 accent-tesla-red" />
              <span>
                <i18n-t keypath="legal.acceptCheckboxPrivacy" tag="span">
                  <template #link>
                    <RouterLink to="/legal/privacy" target="_blank" rel="noopener"
                                class="underline text-blue-400 hover:text-blue-300">
                      {{ $t('legal.privacy') }}
                    </RouterLink>
                  </template>
                </i18n-t>
              </span>
            </label>
            <label class="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" v-model="acceptTerms" class="mt-1 h-4 w-4 accent-tesla-red" />
              <span>
                <i18n-t keypath="legal.acceptCheckboxTerms" tag="span">
                  <template #link>
                    <RouterLink to="/legal/terms" target="_blank" rel="noopener"
                                class="underline text-blue-400 hover:text-blue-300">
                      {{ $t('legal.terms') }}
                    </RouterLink>
                  </template>
                </i18n-t>
              </span>
            </label>
          </div>

          <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
          <div class="flex gap-2">
            <button @click="step = 1" class="btn-secondary flex-1">{{ $t('common.prev') }}</button>
            <button @click="submit"
                    :disabled="loading || !acceptPrivacy || !acceptTerms"
                    class="btn-primary flex-1">
              {{ loading ? $t('register.creating') : $t('register.submitBtn') }}
            </button>
          </div>
        </div>

        <!-- Schritt 3: Fertig -->
        <div v-if="step === 3" class="card space-y-4 text-center">
          <div class="text-5xl">🎉</div>
          <h2 class="font-semibold text-lg">{{ $t('register.created') }}</h2>
          <div class="bg-gray-800 rounded-lg p-4 text-left text-sm space-y-2">
            <p class="text-gray-400">{{ $t('register.credentials') }}</p>
            <p>{{ $t('register.slugLabel') }} <strong class="text-white font-mono">{{ form.tenantSlug }}</strong></p>
            <p>{{ $t('auth.username') }}: <strong class="text-white">{{ form.adminUsername }}</strong></p>
            <p class="text-yellow-400 text-xs mt-2">{{ $t('register.slugWarning') }}</p>
          </div>
          <div class="bg-gray-800 rounded-lg p-3 text-left text-sm space-y-1">
            <p class="text-gray-400">{{ $t('register.nextSteps') }}</p>
            <p class="text-gray-300">{{ $t('register.step1') }}</p>
            <p class="text-gray-300">{{ $t('register.step2') }}</p>
            <p class="text-gray-300">{{ $t('register.step3') }}</p>
          </div>
          <RouterLink to="/login" class="btn-primary inline-block w-full text-center">
            {{ $t('register.toLogin') }}
          </RouterLink>
        </div>

        </template>
      </div>
    </main>
    <!-- Footer kommt global aus App.vue — siehe Begruendung in Login.vue. -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../api.js';
import LangSwitcher from '../components/LangSwitcher.vue';

const route   = useRoute();
const { t }   = useI18n();
const step    = ref(1);
const loading = ref(false);
const error   = ref('');
const slugChecked   = ref(false);
const slugAvailable = ref(false);

const inviteToken    = ref('');
const inviteValid    = ref(false);
const inviteChecking = ref(true);
const inviteError    = ref('');

onMounted(async () => {
  const token = route.query.invite;
  if (!token) {
    inviteChecking.value = false;
    inviteError.value = t('register.inviteRequired');
    return;
  }
  try {
    const { data } = await api.get(`/invites/validate/${token}`);
    if (data.valid) {
      inviteToken.value = token;
      inviteValid.value = true;
    } else {
      inviteError.value = data.reason;
    }
  } catch {
    inviteError.value = t('register.inviteCheckFailed');
  } finally {
    inviteChecking.value = false;
  }
});

const form = ref({
  tenantName:    '',
  tenantSlug:    '',
  adminUsername: 'admin',
  adminPassword: '',
  adminConfirm:  '',
});

// Akzept-Versionen — analog zu Setup.vue: aus Backend laden, an POST mitsenden
const acceptPrivacy = ref(false);
const acceptTerms   = ref(false);
const legalVersions = ref({});

onMounted(async () => {
  try {
    const { data } = await api.get('/legal/_/current-versions');
    legalVersions.value = data || {};
  } catch { /* ignorieren */ }
});

const passwordStrength = computed(() => {
  const p = form.value.adminPassword;
  if (!p) return 0;
  let s = 0;
  if (p.length >= 12) s++;
  if (p.length >= 16) s++;
  if (/[A-Z]/.test(p) || /[0-9]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p) || p.split(' ').length >= 3) s++;
  return Math.min(4, s);
});
const strengthColor     = computed(() => ['','bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500'][passwordStrength.value] || 'bg-gray-700');
const strengthTextColor = computed(() => ['','text-red-400','text-orange-400','text-yellow-400','text-green-400'][passwordStrength.value] || '');
const strengthLabel     = computed(() => {
  const labels = ['', ...t('register.passwordStrengths')];
  return labels[passwordStrength.value] || '';
});

async function checkSlug() {
  if (!form.value.tenantSlug) return;
  try {
    const { data } = await api.get(`/register/check/${form.value.tenantSlug}`);
    slugAvailable.value = data.available;
    slugChecked.value   = true;
  } catch { slugChecked.value = false; }
}

async function nextStep1() {
  error.value = '';
  if (!form.value.tenantName) { error.value = t('register.errNameRequired'); return; }
  if (!form.value.tenantSlug) { error.value = t('register.errSlugRequired'); return; }
  if (!/^[a-z0-9-]+$/.test(form.value.tenantSlug)) { error.value = t('register.errSlugFormat'); return; }
  await checkSlug();
  if (!slugAvailable.value) { error.value = t('register.slugTaken'); return; }
  step.value = 2;
}

async function submit() {
  error.value = '';
  if (!form.value.adminUsername || !form.value.adminPassword) { error.value = t('register.errAllFields'); return; }
  if (form.value.adminPassword !== form.value.adminConfirm) { error.value = t('register.errPwMismatch'); return; }
  if (form.value.adminPassword.length < 12) { error.value = t('register.errPwTooShort'); return; }
  if (!acceptPrivacy.value || !acceptTerms.value) {
    error.value = t('register.errAllFields'); return;
  }
  loading.value = true;
  try {
    const accepts = {};
    if (legalVersions.value.privacy) accepts.privacy = legalVersions.value.privacy;
    if (legalVersions.value.terms)   accepts.terms   = legalVersions.value.terms;
    await api.post('/register', {
      tenantName:    form.value.tenantName,
      tenantSlug:    form.value.tenantSlug,
      adminUsername: form.value.adminUsername,
      adminPassword: form.value.adminPassword,
      inviteToken:   inviteToken.value || undefined,
      accepts:       Object.keys(accepts).length ? accepts : undefined,
    });
    step.value = 3;
  } catch (err) {
    error.value = err.response?.data?.error ?? t('register.errFailed');
  } finally {
    loading.value = false;
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
</style>

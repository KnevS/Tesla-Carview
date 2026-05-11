<template>
  <div class="min-h-screen bg-tesla-dark flex items-center justify-center px-4">
    <div class="w-full max-w-md space-y-6">

      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="text-6xl">⚡</div>
        <h1 class="text-2xl font-bold text-white">{{ $t('invite.title') }}</h1>
        <p v-if="invite" class="text-gray-400 text-sm">
          {{ $t('invite.subtitle', { tenant: invite.tenantName, role: roleLabel }) }}
        </p>
      </div>

      <!-- Loading-Spinner -->
      <div v-if="checking" class="card text-center text-gray-400 text-sm">
        {{ $t('common.loading') }}
      </div>

      <!-- Ungültiger Token -->
      <div v-else-if="!invite" class="card border border-red-700/40 bg-red-900/20 space-y-3">
        <p class="text-red-300 font-medium">{{ $t('invite.invalidTitle') }}</p>
        <p class="text-sm text-red-400">{{ invalidReasonText }}</p>
        <RouterLink to="/login" class="btn-secondary inline-block w-full text-center">
          {{ $t('invite.toLogin') }}
        </RouterLink>
      </div>

      <!-- Step: Konto anlegen -->
      <div v-else-if="step === 'form'" class="card space-y-4">
        <div>
          <label class="label">{{ $t('auth.username') }}</label>
          <input v-model="form.username" type="text" class="input"
                 :placeholder="$t('invite.usernamePlaceholder')"
                 autocomplete="username" />
          <p class="text-xs text-gray-500 mt-1">{{ $t('invite.usernameHint') }}</p>
        </div>
        <div>
          <label class="label">{{ $t('auth.password') }}</label>
          <input v-model="form.password" type="password" class="input"
                 :placeholder="$t('invite.passwordPlaceholder')"
                 autocomplete="new-password" />
          <p class="text-xs text-gray-500 mt-1">{{ $t('invite.passwordHint') }}</p>
        </div>
        <div>
          <label class="label">{{ $t('register.passwordConfirm') }}</label>
          <input v-model="form.confirm" type="password" class="input"
                 autocomplete="new-password" />
        </div>

        <!-- Akzeptanz Privacy + Terms -->
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

        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

        <button @click="submit"
                :disabled="submitting || !canSubmit"
                class="btn-primary w-full">
          {{ submitting ? '…' : $t('invite.submitBtn') }}
        </button>
      </div>

      <!-- Step: Fertig -->
      <div v-else-if="step === 'done'" class="card text-center space-y-4">
        <div class="text-5xl">🎉</div>
        <p class="text-gray-300 text-sm">
          {{ $t('invite.doneText', { username: form.username, tenant: invite.tenantName }) }}
        </p>
        <RouterLink to="/login" class="btn-primary inline-block w-full text-center">
          {{ $t('invite.toLogin') }}
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../api.js';

const route   = useRoute();
const { t }   = useI18n();

const checking = ref(true);
const invite   = ref(null);          // { tenantSlug, tenantName, role, expiresAt }
const invalidReason = ref('');
const step = ref('form');            // 'form' | 'done'
const submitting = ref(false);
const error = ref('');

const form = ref({ username: '', password: '', confirm: '' });
const acceptPrivacy = ref(false);
const acceptTerms   = ref(false);
const legalVersions = ref({});

const roleLabel = computed(() =>
  invite.value?.role === 'admin' ? t('invite.roleAdmin') : t('invite.roleUser')
);

const invalidReasonText = computed(() => {
  switch (invalidReason.value) {
    case 'unknown':      return t('invite.errUnknown');
    case 'already_used': return t('invite.errAlreadyUsed');
    case 'expired':      return t('invite.errExpired');
    default:             return t('invite.errGeneric');
  }
});

const canSubmit = computed(() =>
  form.value.username && form.value.password &&
  form.value.password === form.value.confirm &&
  form.value.password.length >= 12 &&
  acceptPrivacy.value && acceptTerms.value
);

onMounted(async () => {
  const token = route.params.token;
  try {
    const [{ data: inv }, { data: vers }] = await Promise.all([
      api.get(`/user-invites/${token}/validate`),
      api.get('/legal/_/current-versions').catch(() => ({ data: {} })),
    ]);
    invite.value = inv;
    legalVersions.value = vers || {};
  } catch (err) {
    invalidReason.value = err.response?.data?.reason || 'unknown';
  } finally {
    checking.value = false;
  }
});

async function submit() {
  error.value = '';
  if (!canSubmit.value) {
    error.value = t('invite.errFormIncomplete');
    return;
  }
  submitting.value = true;
  try {
    const accepts = {};
    if (legalVersions.value.privacy) accepts.privacy = legalVersions.value.privacy;
    if (legalVersions.value.terms)   accepts.terms   = legalVersions.value.terms;
    await api.post(`/user-invites/${route.params.token}/accept`, {
      username: form.value.username,
      password: form.value.password,
      accepts:  Object.keys(accepts).length ? accepts : undefined,
    });
    step.value = 'done';
  } catch (err) {
    error.value = err.response?.data?.error ?? t('invite.errFailed');
  } finally {
    submitting.value = false;
  }
}
</script>

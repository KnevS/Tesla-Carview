<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="text-center">
        <AppIcon name="lock" :size="56" class="text-tesla-red mx-auto mb-3" />
        <h1 class="text-xl font-bold">Passwort zurücksetzen</h1>
      </div>

      <!-- Token aus URL vorhanden → neues Passwort setzen -->
      <div v-if="hasToken" class="card space-y-4">
        <p class="text-sm text-gray-400">Lege ein neues Passwort fest.</p>
        <div>
          <label class="label">Neues Passwort</label>
          <input v-model="form.newPassword" type="password" class="input"
            placeholder="Mindestens 12 Zeichen" autocomplete="new-password" />
        </div>
        <div>
          <label class="label">Bestätigen</label>
          <input v-model="form.confirm" type="password" class="input" autocomplete="new-password" />
        </div>
        <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
        <div v-if="success" class="text-green-400 text-sm">{{ success }}</div>
        <button @click="applyReset" :disabled="loading" class="btn-primary w-full">
          {{ loading ? 'Wird gespeichert…' : 'Passwort speichern' }}
        </button>
      </div>

      <!-- Kein Token → Info-Seite -->
      <div v-else class="card space-y-4">
        <p class="text-sm text-gray-300 leading-relaxed">
          Das Zurücksetzen des Passworts erfolgt über einen Administrator.
        </p>
        <div class="bg-gray-800 rounded-lg p-3 text-sm text-gray-400 space-y-2">
          <p class="font-semibold text-white">So geht's:</p>
          <p>① Wende dich an deinen Administrator</p>
          <p>② Admin erstellt einen Reset-Link unter <span class="font-mono text-gray-300">Admin → Benutzer → Reset-Link</span></p>
          <p>③ Öffne den Link und lege ein neues Passwort fest</p>
        </div>
        <RouterLink to="/login" class="btn-secondary block text-center">← Zurück zum Login</RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api.js';
import AppIcon from '../components/AppIcon.vue';

const route  = useRoute();
const router = useRouter();

const form    = ref({ newPassword: '', confirm: '' });
const loading = ref(false);
const error   = ref('');
const success = ref('');

const userId     = computed(() => route.query.userId ? +route.query.userId : null);
const token      = computed(() => route.query.token || null);
const tenantSlug = computed(() => route.query.tenant || null);
const hasToken   = computed(() => !!userId.value && !!token.value);

async function applyReset() {
  error.value   = '';
  success.value = '';
  if (form.value.newPassword.length < 12) { error.value = 'Passwort muss mindestens 12 Zeichen lang sein'; return; }
  if (form.value.newPassword !== form.value.confirm) { error.value = 'Passwörter stimmen nicht überein'; return; }
  loading.value = true;
  try {
    await api.post('/password-reset/apply', {
      userId:      userId.value,
      token:       token.value,
      newPassword: form.value.newPassword,
      tenantSlug:  tenantSlug.value || undefined,
    });
    success.value = 'Passwort erfolgreich geändert. Du wirst zum Login weitergeleitet…';
    setTimeout(() => router.push('/login'), 2000);
  } catch (err) {
    error.value = err.response?.data?.error ?? 'Fehler beim Zurücksetzen';
  } finally {
    loading.value = false;
  }
}
</script>

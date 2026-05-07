<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-6">

      <div class="text-center">
        <div class="text-5xl mb-3">⚡</div>
        <h1 class="text-2xl font-bold">Tesla Carview</h1>
        <p class="text-gray-400 text-sm mt-1">Bitte anmelden</p>
      </div>

      <form @submit.prevent="submit" class="card space-y-4">

        <!-- Mandant (nur anzeigen wenn mehrere vorhanden) -->
        <div v-if="showTenantField">
          <label class="block text-sm text-gray-400 mb-1">Mandant</label>
          <select v-if="tenants.length > 0" v-model="form.tenantSlug" class="input">
            <option value="">— Bitte wählen —</option>
            <option v-for="t in tenants" :key="t.slug" :value="t.slug">{{ t.name }} ({{ t.slug }})</option>
          </select>
          <input v-else v-model="form.tenantSlug" type="text" class="input" placeholder="mandant-slug"
            autocomplete="organization" />
          <p class="text-xs text-gray-500 mt-1">Dein Mandantenname (nach Registrierung vergeben)</p>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">Benutzername</label>
          <input v-model="form.username" type="text" autocomplete="username" required
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-tesla-red" />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">Passwort</label>
          <input v-model="form.password" type="password" autocomplete="current-password" required
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-tesla-red" />
        </div>

        <div v-if="error" class="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-2.5">
          {{ loading ? 'Anmelden...' : 'Anmelden' }}
        </button>

        <!-- Passkey-Login -->
        <button type="button" @click="loginPasskey" :disabled="passkeyLoading"
          class="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 flex items-center justify-center gap-2 transition">
          <span>🔑</span>
          {{ passkeyLoading ? 'Passkey-Authentifizierung...' : 'Mit Passkey anmelden' }}
        </button>
      </form>

      <div class="text-center space-y-2">
        <RouterLink to="/register" class="text-sm text-tesla-red hover:underline block">
          Neuen Mandanten registrieren
        </RouterLink>
        <RouterLink to="/reset-password" class="text-sm text-gray-500 hover:text-gray-300 block">
          Passwort vergessen?
        </RouterLink>
        <RouterLink to="/handbook" class="text-sm text-gray-600 hover:text-gray-400 block">
          Handbuch & Hilfe
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';

const auth   = useAuthStore();
const app    = useAppStore();
const router = useRouter();
const route  = useRoute();

const form           = ref({ username: '', password: '', tenantSlug: auth.tenantSlug || '' });
const loading        = ref(false);
const passkeyLoading = ref(false);
const error          = ref('');
const tenants        = ref([]);

const showTenantField = computed(() => tenants.value.length > 1);

onMounted(async () => {
  await auth.loadTenants();
  tenants.value = auth.availableTenants;
  if (auth.tenantSlug) form.value.tenantSlug = auth.tenantSlug;
});

async function submit() {
  error.value   = '';
  loading.value = true;
  try {
    const result = await auth.login(form.value.username, form.value.password, form.value.tenantSlug || undefined);
    if (result.requiresMfa) {
      router.push('/login/mfa');
    } else {
      await app.loadVehicles().catch(() => {});
      router.push(route.query.redirect || '/');
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Anmeldung fehlgeschlagen';
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
      error.value = 'Passkey-Authentifizierung abgebrochen.';
    } else {
      error.value = err.response?.data?.error || err.message || 'Passkey-Anmeldung fehlgeschlagen';
    }
  } finally {
    passkeyLoading.value = false;
  }
}
</script>

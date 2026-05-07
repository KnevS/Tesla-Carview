<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md space-y-6">

      <div class="text-center">
        <div class="text-5xl mb-3">⚡</div>
        <h1 class="text-2xl font-bold">Tesla Carview</h1>
        <p class="text-gray-400 text-sm mt-1">Neuen Mandanten registrieren</p>
      </div>

      <!-- Schritt-Indikator -->
      <!-- Invite-Prüfung -->
      <div v-if="inviteChecking" class="card text-center text-gray-400 text-sm py-6">
        Einladungslink wird geprüft…
      </div>
      <div v-else-if="inviteError" class="card space-y-3 text-center">
        <p class="text-4xl">🔒</p>
        <p class="text-red-400 font-semibold">{{ inviteError }}</p>
        <p class="text-sm text-gray-400">Bitte wende dich an einen Administrator um einen Einladungslink zu erhalten.</p>
        <RouterLink to="/login" class="btn-secondary inline-block text-sm">← Zum Login</RouterLink>
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
        <h2 class="font-semibold text-lg">Mandantenname</h2>
        <p class="text-sm text-gray-400">Jeder Mandant hat eine vollständig isolierte Datenbank.</p>
        <div>
          <label class="label">Name des Mandanten</label>
          <input v-model="form.tenantName" type="text" class="input" placeholder="z.B. Familie Muster" />
          <p class="text-xs text-gray-500 mt-1">Wird in der App angezeigt</p>
        </div>
        <div>
          <label class="label">Mandanten-Kürzel (Slug)</label>
          <div class="flex gap-2 items-center">
            <input v-model="form.tenantSlug" type="text" class="input" placeholder="z.B. muster"
              @input="slugChecked = false" @blur="checkSlug" />
            <span v-if="slugChecked && slugAvailable" class="text-green-400 text-lg">✓</span>
            <span v-if="slugChecked && !slugAvailable" class="text-red-400 text-lg">✗</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">Nur Kleinbuchstaben, Zahlen und -. Wird zum Einloggen benötigt.</p>
          <p v-if="slugChecked && !slugAvailable" class="text-xs text-red-400 mt-1">Dieses Kürzel ist bereits vergeben.</p>
        </div>
        <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
        <button @click="nextStep1" class="btn-primary w-full">Weiter →</button>
        <RouterLink to="/login" class="block text-center text-sm text-gray-500 hover:text-gray-300">
          ← Zurück zum Login
        </RouterLink>
      </div>

      <!-- Schritt 2: Admin-Account -->
      <div v-if="step === 2" class="card space-y-4">
        <h2 class="font-semibold text-lg">Administrator-Konto</h2>
        <div>
          <label class="label">Benutzername</label>
          <input v-model="form.adminUsername" type="text" class="input" placeholder="admin"
            autocomplete="username" />
          <p class="text-xs text-gray-500 mt-1">3–32 Zeichen, Buchstaben/Zahlen/-/_</p>
        </div>
        <div>
          <label class="label">Passwort</label>
          <input v-model="form.adminPassword" type="password" class="input"
            placeholder="Mindestens 12 Zeichen" autocomplete="new-password" />
          <div v-if="form.adminPassword" class="mt-2 space-y-1">
            <div class="flex gap-1">
              <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded"
                :class="passwordStrength >= i ? strengthColor : 'bg-gray-700'"></div>
            </div>
            <p class="text-xs" :class="strengthTextColor">{{ strengthLabel }}</p>
          </div>
        </div>
        <div>
          <label class="label">Passwort bestätigen</label>
          <input v-model="form.adminConfirm" type="password" class="input" autocomplete="new-password" />
        </div>
        <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
        <div class="flex gap-2">
          <button @click="step = 1" class="btn-secondary flex-1">← Zurück</button>
          <button @click="submit" :disabled="loading" class="btn-primary flex-1">
            {{ loading ? 'Wird erstellt…' : 'Registrieren →' }}
          </button>
        </div>
      </div>

      <!-- Schritt 3: Fertig -->
      <div v-if="step === 3" class="card space-y-4 text-center">
        <div class="text-5xl">🎉</div>
        <h2 class="font-semibold text-lg">Mandant erstellt!</h2>
        <div class="bg-gray-800 rounded-lg p-4 text-left text-sm space-y-2">
          <p class="text-gray-400">Deine Zugangsdaten:</p>
          <p>Mandant-Kürzel: <strong class="text-white font-mono">{{ form.tenantSlug }}</strong></p>
          <p>Benutzername: <strong class="text-white">{{ form.adminUsername }}</strong></p>
          <p class="text-yellow-400 text-xs mt-2">⚠ Notiere dir das Mandanten-Kürzel – es wird beim Login benötigt.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3 text-left text-sm space-y-1">
          <p class="text-gray-400">Empfohlene nächste Schritte:</p>
          <p class="text-gray-300">① Tesla-Fahrzeug verbinden (Einstellungen → Tesla)</p>
          <p class="text-gray-300">② MFA einrichten (Einstellungen → Sicherheit)</p>
          <p class="text-gray-300">③ Ladeorte konfigurieren</p>
        </div>
        <RouterLink to="/login" class="btn-primary inline-block w-full text-center">Zum Login →</RouterLink>
      </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api.js';

const route = useRoute();
const step    = ref(1);
const loading = ref(false);
const error   = ref('');
const slugChecked   = ref(false);
const slugAvailable = ref(false);

const inviteToken   = ref('');
const inviteValid   = ref(false);
const inviteChecking = ref(true);
const inviteError   = ref('');

onMounted(async () => {
  const token = route.query.invite;
  if (!token) {
    inviteChecking.value = false;
    inviteError.value = 'Registrierung nur mit einem gültigen Einladungslink möglich.';
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
    inviteError.value = 'Einladungslink konnte nicht geprüft werden.';
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
const strengthLabel     = computed(() => ['','Schwach','Mittel','Gut','Stark'][passwordStrength.value] || '');

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
  if (!form.value.tenantName) { error.value = 'Name ist erforderlich'; return; }
  if (!form.value.tenantSlug) { error.value = 'Kürzel ist erforderlich'; return; }
  if (!/^[a-z0-9-]+$/.test(form.value.tenantSlug)) { error.value = 'Kürzel: nur Kleinbuchstaben, Zahlen und -'; return; }
  await checkSlug();
  if (!slugAvailable.value) { error.value = 'Dieses Kürzel ist bereits vergeben.'; return; }
  step.value = 2;
}

async function submit() {
  error.value = '';
  if (!form.value.adminUsername || !form.value.adminPassword) { error.value = 'Alle Felder ausfüllen'; return; }
  if (form.value.adminPassword !== form.value.adminConfirm) { error.value = 'Passwörter stimmen nicht überein'; return; }
  if (form.value.adminPassword.length < 12) { error.value = 'Passwort muss mindestens 12 Zeichen lang sein'; return; }
  loading.value = true;
  try {
    await api.post('/register', {
      tenantName:    form.value.tenantName,
      tenantSlug:    form.value.tenantSlug,
      adminUsername: form.value.adminUsername,
      adminPassword: form.value.adminPassword,
      inviteToken:   inviteToken.value || undefined,
    });
    step.value = 3;
  } catch (err) {
    error.value = err.response?.data?.error ?? 'Registrierung fehlgeschlagen';
  } finally {
    loading.value = false;
  }
}
</script>

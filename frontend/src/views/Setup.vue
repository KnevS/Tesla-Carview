<template>
  <div class="min-h-screen bg-tesla-dark flex items-center justify-center px-4">
    <div class="w-full max-w-md space-y-6">

      <!-- Logo / Header -->
      <div class="text-center space-y-2">
        <div class="text-6xl">⚡</div>
        <h1 class="text-3xl font-bold text-white">Tesla Carview</h1>
        <p class="text-gray-400 text-sm">Erstkonfiguration – Admin-Konto anlegen</p>
      </div>

      <!-- Schritt-Anzeige -->
      <div class="flex items-center gap-2 justify-center">
        <div v-for="i in 3" :key="i"
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
          :class="step >= i ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-500'">
          {{ i }}
        </div>
      </div>

      <!-- Step 1: Willkommen -->
      <div v-if="step === 1" class="card space-y-4">
        <h2 class="font-semibold text-lg">Willkommen</h2>
        <p class="text-gray-300 text-sm leading-relaxed">
          Tesla Carview wurde noch nicht eingerichtet.
          Dieser Assistent legt deinen ersten Administrator-Account an.
        </p>
        <ul class="text-sm text-gray-400 space-y-1">
          <li>✓ Alle Fahrzeugdaten bleiben lokal auf deinem Server</li>
          <li>✓ Keine Cloud, keine Datenweitergabe</li>
          <li>✓ Vollständige Kontrolle über deine Daten</li>
        </ul>
        <button @click="step = 2" class="btn-primary w-full">
          Einrichten starten →
        </button>
      </div>

      <!-- Step 2: Admin-Konto -->
      <div v-if="step === 2" class="card space-y-4">
        <h2 class="font-semibold text-lg">Administrator-Konto</h2>
        <p class="text-sm text-gray-400">
          Dieses Konto hat vollen Zugriff auf die Anwendung.
        </p>

        <!-- Mandant (optional, für Mehr-Mandanten-Betrieb) -->
        <details class="bg-gray-800 rounded-lg p-3 text-sm">
          <summary class="cursor-pointer text-gray-300 font-medium select-none">
            ▸ Mandantenname (optional)
          </summary>
          <div class="mt-3 space-y-3">
            <p class="text-xs text-gray-400">
              Nur relevant wenn du mehrere Mandanten betreiben möchtest. Standard: „Default".
            </p>
            <div>
              <label class="label">Mandantenname</label>
              <input v-model="form.tenantName" type="text" class="input" placeholder="z.B. Familie Muster" />
            </div>
            <div>
              <label class="label">Mandanten-Kürzel (Slug)</label>
              <input v-model="form.tenantSlug" type="text" class="input" placeholder="z.B. muster"
                @input="form.tenantSlug = form.tenantSlug.toLowerCase().replace(/[^a-z0-9-]/g,'')" />
              <p class="text-xs text-gray-500 mt-1">Nur Kleinbuchstaben, Zahlen und -</p>
            </div>
          </div>
        </details>

        <div>
          <label class="label">Benutzername</label>
          <input v-model="form.username" type="text" class="input" placeholder="admin"
            autocomplete="username" />
          <p class="text-xs text-gray-500 mt-1">3–32 Zeichen, nur Buchstaben/Zahlen/-/_</p>
        </div>
        <div>
          <label class="label">Passwort</label>
          <input v-model="form.password" type="password" class="input"
            placeholder="Mindestens 12 Zeichen"
            autocomplete="new-password" />
          <p class="text-xs text-gray-500 mt-1">
            Empfehlung: Passphrase aus 4+ Wörtern (z.B. „Sonne-Berg-Auto-Kaffee")
          </p>
        </div>
        <div>
          <label class="label">Passwort bestätigen</label>
          <input v-model="form.confirm" type="password" class="input"
            placeholder="Passwort wiederholen"
            autocomplete="new-password" />
        </div>

        <!-- Stärke-Indikator -->
        <div v-if="form.password" class="space-y-1">
          <div class="flex gap-1">
            <div v-for="i in 4" :key="i"
              class="h-1 flex-1 rounded"
              :class="passwordStrength >= i ? strengthColor : 'bg-gray-700'"></div>
          </div>
          <p class="text-xs" :class="strengthTextColor">{{ strengthLabel }}</p>
        </div>

        <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>

        <div class="flex gap-2">
          <button @click="step = 1" class="btn-secondary flex-1">← Zurück</button>
          <button @click="submit" :disabled="loading" class="btn-primary flex-1">
            {{ loading ? 'Wird erstellt…' : 'Konto erstellen →' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Fertig -->
      <div v-if="step === 3" class="card space-y-4 text-center">
        <div class="text-5xl">🎉</div>
        <h2 class="font-semibold text-lg">Setup abgeschlossen!</h2>
        <p class="text-gray-300 text-sm">
          Dein Administrator-Konto <strong class="text-white">{{ form.username }}</strong>
          wurde erfolgreich angelegt.
        </p>
        <div class="bg-gray-800 rounded-lg p-3 text-left text-sm space-y-1">
          <p class="text-gray-400">Empfohlene nächste Schritte:</p>
          <p class="text-gray-300">① MFA in den Einstellungen aktivieren</p>
          <p class="text-gray-300">② Tesla-Fahrzeug verbinden</p>
          <p class="text-gray-300">③ Passwort nach dem ersten Login ändern</p>
        </div>
        <RouterLink to="/login" class="btn-primary inline-block w-full text-center">
          Zum Login →
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import api from '../api.js';

const step = ref(1);
const loading = ref(false);
const error = ref('');
const form = ref({ username: 'admin', password: '', confirm: '', tenantName: '', tenantSlug: '' });

const passwordStrength = computed(() => {
  const p = form.value.password;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 12) score++;
  if (p.length >= 16) score++;
  if (/[A-Z]/.test(p) || /[0-9]/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p) || p.split(' ').length >= 3) score++;
  return Math.min(4, score);
});

const strengthColor = computed(() => {
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  return colors[passwordStrength.value] || 'bg-gray-700';
});
const strengthTextColor = computed(() => {
  const colors = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400'];
  return colors[passwordStrength.value] || 'text-gray-500';
});
const strengthLabel = computed(() => {
  const labels = ['', 'Schwach', 'Mittel', 'Gut', 'Stark'];
  return labels[passwordStrength.value] || '';
});

async function submit() {
  error.value = '';
  if (!form.value.username || !form.value.password) {
    error.value = 'Benutzername und Passwort sind erforderlich';
    return;
  }
  if (form.value.password !== form.value.confirm) {
    error.value = 'Passwörter stimmen nicht überein';
    return;
  }
  if (form.value.password.length < 12) {
    error.value = 'Passwort muss mindestens 12 Zeichen lang sein';
    return;
  }
  loading.value = true;
  try {
    await api.post('/setup/init', {
      username:   form.value.username,
      password:   form.value.password,
      tenantName: form.value.tenantName || undefined,
      tenantSlug: form.value.tenantSlug || undefined,
    });
    step.value = 3;
  } catch (err) {
    error.value = err.response?.data?.error ?? 'Fehler beim Erstellen des Kontos';
  } finally {
    loading.value = false;
  }
}
</script>

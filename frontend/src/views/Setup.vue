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
          <button @click="step = 1" class="btn-secondary flex-1">← Zurück</button>
          <button @click="submit"
                  :disabled="loading || !acceptPrivacy || !acceptTerms"
                  class="btn-primary flex-1">
            {{ loading ? 'Wird erstellt…' : 'Konto erstellen →' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Fertig + Pseudonym-Anzeige.
           Der Pseudonym ist auf der Login-Seite das einzige sichtbare
           Merkmal des Mandanten (Datenschutz — kein Klarname mehr).
           Daher gross hervorgehoben + harte Merk-/Backup-Warnung. -->
      <div v-if="step === 3" class="card space-y-4 text-center">
        <div class="text-5xl">🎉</div>
        <h2 class="font-semibold text-lg">Setup abgeschlossen!</h2>
        <p class="text-gray-300 text-sm">
          Dein Administrator-Konto <strong class="text-white">{{ form.username }}</strong>
          wurde erfolgreich angelegt.
        </p>

        <div v-if="assignedPseudonym"
             class="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 text-left space-y-3">
          <p class="text-sm text-blue-200">
            🔐 <strong>Dein Login-Identifier (Mandant-Pseudonym)</strong>
          </p>
          <p class="text-2xl font-mono font-bold text-white tracking-wider text-center py-2 bg-black/30 rounded">
            {{ assignedPseudonym }}
          </p>
          <p class="text-xs text-gray-300 leading-relaxed">
            Aus Datenschutzgründen erscheint dein Mandant auf der Login-Seite
            nicht mit Klarnamen, sondern mit diesem Pseudonym. So sieht niemand
            von außen, welche Firma oder Person diesen Self-Hoster nutzt.
          </p>
          <div class="border-t border-blue-700/40 pt-3 space-y-2 text-xs">
            <p class="text-yellow-300">
              ⚠ <strong>Bitte sorgfältig merken oder sicher notieren.</strong>
              Bei mehreren Mandanten ist das Pseudonym dein einziges
              Auswahlkriterium beim Login.
            </p>
            <p class="text-gray-300">
              💾 <strong>Lege jetzt ein Backup an</strong>
              (Einstellungen → Daten → Backup herunterladen).
              Bei Verlust des Pseudonyms ohne Backup ist eine Wiederherstellung
              nur durch Neu-Aufsetzen einer leeren Mandantenumgebung möglich
              — alle Daten wären dann verloren.
            </p>
            <p class="text-gray-400">
              Der Pseudonym lässt sich später vom Admin neu generieren
              (Einstellungen → Mandanten-Pseudonym ändern).
            </p>
          </div>
        </div>

        <div class="bg-gray-800 rounded-lg p-3 text-left text-sm space-y-1">
          <p class="text-gray-400">Empfohlene nächste Schritte:</p>
          <p class="text-gray-300">① Pseudonym sicher notieren + Backup ziehen</p>
          <p class="text-gray-300">② MFA in den Einstellungen aktivieren</p>
          <p class="text-gray-300">③ Tesla-Fahrzeug verbinden</p>
        </div>
        <RouterLink to="/login" class="btn-primary inline-block w-full text-center">
          Zum Login →
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api.js';

const step = ref(1);
const loading = ref(false);
const error = ref('');
const form = ref({ username: 'admin', password: '', confirm: '', tenantName: '', tenantSlug: '' });

// Akzept-Versionen — werden beim Mount aus /api/legal/_/current-versions
// geladen und zusammen mit dem POST /setup/init mitgesendet, damit das
// Backend einen legal_acceptance-Eintrag schreiben kann (DSGVO-Nachweis).
const acceptPrivacy = ref(false);
const acceptTerms   = ref(false);
const legalVersions = ref({});

onMounted(async () => {
  try {
    const { data } = await api.get('/legal/_/current-versions');
    legalVersions.value = data || {};
  } catch { /* fallback: ohne Versionen — Backend ignoriert das Feld dann */ }
});

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

const assignedPseudonym = ref('');

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
  if (!acceptPrivacy.value || !acceptTerms.value) {
    error.value = 'Bitte Datenschutz und Nutzungsbedingungen bestätigen';
    return;
  }
  loading.value = true;
  try {
    const accepts = {};
    if (legalVersions.value.privacy) accepts.privacy = legalVersions.value.privacy;
    if (legalVersions.value.terms)   accepts.terms   = legalVersions.value.terms;
    const { data } = await api.post('/setup/init', {
      username:   form.value.username,
      password:   form.value.password,
      tenantName: form.value.tenantName || undefined,
      tenantSlug: form.value.tenantSlug || undefined,
      accepts:    Object.keys(accepts).length ? accepts : undefined,
    });
    // Pseudonym wird automatisch vom Backend vergeben — auf Step 3
    // groß anzeigen, damit der Admin ihn sich merkt.
    assignedPseudonym.value = data.tenant_pseudonym || '';
    step.value = 3;
  } catch (err) {
    error.value = err.response?.data?.error ?? 'Fehler beim Erstellen des Kontos';
  } finally {
    loading.value = false;
  }
}
</script>

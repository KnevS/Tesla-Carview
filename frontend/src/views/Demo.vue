<template>
  <div class="demo-shell">
    <div class="demo-glow" aria-hidden="true"></div>

    <!-- Sprach-Selector oben rechts, wie auf der Login-Seite. -->
    <div class="auth-lang">
      <LangSwitcher compact />
    </div>

    <main class="demo-main">
      <div class="w-full max-w-md space-y-6">

        <div class="text-center">
          <div class="text-5xl mb-3">🧪</div>
          <h1 class="text-2xl font-bold">Tesla Carview testen</h1>
          <p class="text-gray-400 text-sm mt-1">Ohne eigenen Tesla. Mit Fake-Daten.</p>
        </div>

        <!-- Demo nicht aktiviert -->
        <div v-if="loaded && !demoStatus.enabled" class="card space-y-3 text-center">
          <p class="text-sm text-gray-300">
            Der Demo-Modus ist auf dieser Instanz nicht aktiviert.
          </p>
          <RouterLink to="/login" class="btn-secondary text-sm inline-flex">← Zur Anmeldung</RouterLink>
        </div>

        <!-- Demo verfügbar -->
        <template v-if="loaded && demoStatus.enabled">
          <!-- Erklärung — was bekommt der Tester -->
          <div class="card space-y-3">
            <h2 class="font-semibold flex items-center gap-2">✨ Was du bekommst</h2>
            <ul class="text-sm text-gray-300 space-y-2">
              <li class="flex gap-2">
                <span class="text-tesla-red flex-shrink-0">●</span>
                <span><strong>Eigener Test-Account</strong>, automatisch generiert. Keine E-Mail nötig.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-tesla-red flex-shrink-0">●</span>
                <span><strong>Fake-Fahrzeug</strong> (Model Y) mit 3 Wochen vorbefüllter Fahrt- und Lade-Historie.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-tesla-red flex-shrink-0">●</span>
                <span><strong>Lebendige Daten:</strong> alle 30 min kommt eine neue Fake-Fahrt dazu.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-tesla-red flex-shrink-0">●</span>
                <span><strong>14 Tage gültig</strong> — danach werden Account und Daten rückstandlos gelöscht.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-tesla-red flex-shrink-0">●</span>
                <span><strong>Voller Funktionsumfang:</strong> Dashboard, Fahrtenbuch, Wartung, Kostenabrechnung, Steuerungs-UI — alles ausprobierbar.</span>
              </li>
            </ul>
          </div>

          <!-- Aktion: Demo starten oder „voll"-Hinweis -->
          <div class="card border border-blue-700/50 bg-blue-900/15 space-y-3 text-center">
            <template v-if="demoStatus.slots_free > 0">
              <button @click="startDemo" :disabled="demoBusy"
                class="btn-primary text-base w-full disabled:opacity-40 min-h-[48px]">
                {{ demoBusy ? 'Lege Test-Account an…' : '🚀 Demo starten' }}
              </button>
              <p class="text-xs text-gray-400">
                {{ demoStatus.slots_free }}/{{ demoStatus.max_active }} freie Test-Plätze
              </p>
              <p class="text-[11px] text-gray-500 leading-relaxed">
                Mit dem Klick gelten Nutzungsbedingungen und Datenschutz inkl. Tester-Zusatz (siehe Footer).
              </p>
            </template>
            <template v-else>
              <p class="text-sm text-gray-200 leading-relaxed">
                Aktuell sind <strong>alle {{ demoStatus.max_active }} genehmigten Test-Plätze in Benutzung</strong>.
                Damit das System für den Echtbetrieb stabil bleibt, vergeben wir nicht mehr.
              </p>
              <p v-if="demoStatus.next_slot_free_at_de"
                 class="text-sm text-blue-200 bg-blue-900/30 rounded-lg px-3 py-2">
                Voraussichtlich nächster freier Platz:<br>
                <strong>{{ demoStatus.next_slot_free_at_de }} Uhr</strong>
              </p>
              <button @click="loadDemoStatus" class="btn-secondary text-sm min-h-[40px]"
                v-tooltip="'Status neu abfragen.'">
                🔄 Aktualisieren
              </button>
            </template>
            <p v-if="demoError" class="text-xs text-red-400 mt-2">{{ demoError }}</p>
          </div>

          <!-- Was den Tester rechtlich erwartet — Legal-Links nicht
               hier, sondern im AppFooter unten. Sonst Doppelung. -->
          <div class="card space-y-1 text-xs text-gray-400">
            <p>
              <strong class="text-gray-300">Wichtig:</strong> Demo-Daten sind frei erfunden — keine Verwendung
              für Buchhaltung, Steuer (Fahrtenbuch), Versicherung. Keine Garantie auf Verfügbarkeit.
            </p>
            <p>
              Es gelten Nutzungsbedingungen und Datenschutz inklusive Tester-Zusatz (siehe Footer).
            </p>
          </div>

          <div class="text-center">
            <RouterLink to="/login" class="text-sm text-gray-500 hover:text-gray-300">
              ← Zurück zur normalen Anmeldung
            </RouterLink>
          </div>
        </template>

        <!-- Initial Lade-Zustand -->
        <div v-if="!loaded" class="card">
          <p class="text-sm text-gray-400">Lade…</p>
        </div>

      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import LangSwitcher     from '../components/LangSwitcher.vue';
import AppFooter        from '../components/AppFooter.vue';

const router = useRouter();
const auth   = useAuthStore();
const app    = useAppStore();

const demoStatus = ref({ enabled: false, slots_free: 0 });
const loaded     = ref(false);
const demoBusy   = ref(false);
const demoError  = ref('');

async function loadDemoStatus() {
  demoError.value = '';
  try {
    const apiMod = await import('../api.js');
    const { data } = await apiMod.default.get('/demo/status');
    demoStatus.value = data;
  } catch {
    demoStatus.value = { enabled: false };
  } finally {
    loaded.value = true;
  }
}

async function startDemo() {
  demoBusy.value  = true;
  demoError.value = '';
  try {
    const apiMod = await import('../api.js');
    let data;
    try {
      ({ data } = await apiMod.default.post('/demo/signup'));
    } catch (err) {
      if (err.response?.status === 503) {
        // Slot ist eben besetzt worden — Status neu laden, Karte
        // wechselt automatisch in den „voll"-Hinweis.
        await loadDemoStatus();
      }
      throw err;
    }
    auth.accessToken = data.accessToken;
    auth.user        = data.user;
    auth.tenantSlug  = data.user.tenantSlug;
    localStorage.setItem('tc_tenant_slug', data.user.tenantSlug);
    await app.loadVehicles().catch(() => {});
    router.push('/');
  } catch (err) {
    demoError.value = err.response?.data?.error || err.message;
  } finally {
    demoBusy.value = false;
  }
}

onMounted(loadDemoStatus);
</script>

<style scoped>
.demo-shell {
  min-height: 100vh;
  display: flex; flex-direction: column;
  position: relative; isolation: isolate;
}
.demo-glow {
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(720px 420px at 18% 12%, rgba(59,130,246,0.16), transparent 60%),
    radial-gradient(620px 360px at 82% 88%, rgba(99,102,241,0.10), transparent 60%);
}
.demo-main {
  flex: 1;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 2rem 1rem 1rem;
}
.auth-lang { position: fixed; top: 1rem; right: 1rem; z-index: 30; }
@media (max-width: 640px) {
  .demo-main { padding-top: 4rem; }
}
</style>

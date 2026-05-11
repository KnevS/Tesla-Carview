<template>
  <transition name="fade">
    <div v-if="visible" class="maint-overlay">
      <div class="maint-card">
        <!-- Animiertes Tesla-Logo / Blitz: dezent, kein Spam. -->
        <div class="maint-bolt" aria-hidden="true">⚡</div>

        <h1 class="maint-title">Carview wird gerade aktualisiert</h1>
        <p class="maint-sub">
          Kein Fehler — wir laden gerade neue Funktionen oder Bugfixes.
          Die App ist gleich wieder da.
        </p>

        <!-- Geschaetzte Restzeit. Wenn Backend antwortet bevor 0 erreicht ist,
             blendet das Overlay aus; wenn 0 erreicht und immer noch down,
             wechselt der Text auf „dauert ein bisschen laenger". -->
        <p class="maint-eta">
          <span v-if="secondsLeft > 0">
            Voraussichtlich noch <strong>{{ fmtEta(secondsLeft) }}</strong>
          </span>
          <span v-else>
            Dauert heute ein bisschen länger — aber bleib dran, gleich geht's weiter.
          </span>
        </p>

        <!-- Live-Status: kleiner Pulser zeigt, dass wir aktiv nachfragen. -->
        <div class="maint-status">
          <span class="maint-dot" :class="probing ? 'maint-dot--probing' : ''"></span>
          <span>{{ probing ? 'verbinde…' : `letzter Versuch: ${attempts} ×` }}</span>
        </div>

        <!-- Wechselnder Spruch. transition gibt einen sanften Fade. -->
        <transition name="quip" mode="out-in">
          <p class="maint-quip" :key="currentQuip">{{ currentQuip }}</p>
        </transition>

        <button @click="retry" class="maint-retry">Jetzt nochmal versuchen</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { i18n } from '../plugins/i18n.js';

// Geschaetzte Recovery-Zeit nach Deploy-Start: typisch 180 s (Backend
// rebuild + Healthcheck). Wir starten mit dem vollen Wert und zaehlen
// runter; sobald das Backend antwortet, ist's vorbei.
const ESTIMATED_RECOVERY_S = 180;
const PROBE_INTERVAL_MS    = 3_000;

const visible       = ref(false);
const probing       = ref(false);
const attempts      = ref(0);
const downSinceMs   = ref(0);
const currentQuip   = ref('');
let probeTimer  = null;
let quipTimer   = null;

// Tesla-Sprueche-Pool. Wir mischen die Liste einmal pro Maintenance-
// Sitzung, damit nicht jedes Mal in derselben Reihenfolge gezeigt wird.
const QUIPS_DE = [
  'Otto putzt sich gerade die Solarpanels.',
  'Selbst Tesla braucht manchmal ein Software-Update.',
  'Frunk öffnet, Update lädt — Geduld zahlt sich aus.',
  'Sentry-Mode beobachtet … wartend.',
  'Ein Tesla geht von 0 auf 100 in 3,1 s. Dieses Update braucht ein bisschen länger.',
  'Vorklimatisieren des Servers läuft.',
  'Wir laden gerade — bitte am Stecker bleiben.',
  'Supercharger initialisiert.',
  'Plaid-Mode geladen — gleich geht\'s wieder los.',
  'Autopilot übernimmt kurz.',
  'Boombox spielt Wartemusik 🎵',
  'Yoke wird umgebogen.',
  'Cybertruck-Glas wird poliert.',
  'Falcon-Wing-Doors öffnen sich kurz.',
  'Vegan Leather wird gereinigt.',
  'FSD trainiert noch ein paar Iterationen.',
  'Tesla Bot bringt die neuen Bits.',
  'Bremspedal? Brauchen wir hier nicht.',
  'Range Anxiety? Bei uns nicht.',
  'Akku wird ausgewuchtet.',
  'Camp-Mode aktiviert — wir machen es uns gemütlich.',
  'Hund-Modus läuft im Hintergrund. 🐶',
  'Boombox-Sound 7 wird gewartet.',
  'Hupe wird gestimmt. 📯',
  'Ladeklappe wird geölt.',
];
const QUIPS_EN = [
  'Even Tesla needs a software update sometimes.',
  'Frunk opening, update loading — patience pays off.',
  'Sentry mode is watching… waiting.',
  'A Tesla goes 0–60 in 1.9 s. This update takes a bit longer.',
  'Pre-conditioning the server.',
  'Charging — please stay plugged in.',
  'Supercharger initialising.',
  'Plaid mode loaded — almost there.',
  'Autopilot is taking over briefly.',
  'Boombox playing hold music 🎵',
  'Yoke being bent into shape.',
  'Cybertruck glass being polished.',
  'Falcon-wing doors fluttering.',
  'FSD doing a couple more iterations.',
  'Tesla Bot delivering the new bits.',
  'Brake pedal? Don\'t need it here.',
  'Range anxiety? Not on our watch.',
  'Re-balancing the battery cells.',
  'Camp mode on — making ourselves comfy.',
  'Dog mode running in the background. 🐶',
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const secondsLeft = computed(() => {
  if (!downSinceMs.value) return ESTIMATED_RECOVERY_S;
  const elapsed = Math.floor((Date.now() - downSinceMs.value) / 1000);
  return Math.max(0, ESTIMATED_RECOVERY_S - elapsed);
});

function fmtEta(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m && r) return `${m} Min ${r} Sek`;
  if (m)      return `${m} Min`;
  return `${r} Sek`;
}

let quipQueue = [];
function nextQuip() {
  if (!quipQueue.length) {
    const pool = (i18n.global.locale.value === 'en' ? QUIPS_EN : QUIPS_DE);
    quipQueue = shuffle(pool);
  }
  currentQuip.value = quipQueue.shift();
}

async function probe() {
  probing.value = true;
  attempts.value++;
  try {
    // /api/health ist offen + leichtgewichtig; perfekter Recovery-Sensor.
    const res = await fetch('/api/health', { cache: 'no-store' });
    if (res.ok) {
      visible.value = false;
      stopTimers();
      // Aufruf eines App-Up-Events, damit Views bei Bedarf neu laden.
      window.dispatchEvent(new CustomEvent('app-up'));
      return;
    }
  } catch { /* still down */ }
  probing.value = false;
}

function show() {
  if (visible.value) return;
  visible.value    = true;
  downSinceMs.value = Date.now();
  attempts.value   = 0;
  nextQuip();
  // Pollen alle 3 s + jeden 6 s neuer Spruch
  probeTimer = setInterval(probe, PROBE_INTERVAL_MS);
  quipTimer  = setInterval(nextQuip, 6_000);
  probe(); // sofortiger erster Versuch
}

function stopTimers() {
  if (probeTimer) clearInterval(probeTimer);
  if (quipTimer)  clearInterval(quipTimer);
  probeTimer = quipTimer = null;
}

function retry() { probe(); }

// Trigger: Fenster-Event aus dem axios-Interceptor.
function onDown() { show(); }

onMounted(() => {
  window.addEventListener('app-down', onDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('app-down', onDown);
  stopTimers();
});
</script>

<style scoped>
.maint-overlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  padding: 1.5rem;
}
.maint-card {
  background: linear-gradient(180deg, #1f1f1f 0%, #161616 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.25rem;
  padding: 2rem 1.5rem;
  max-width: 28rem;
  width: 100%;
  color: #e5e7eb;
  text-align: center;
  box-shadow: 0 25px 80px rgba(0,0,0,0.6);
}
.maint-bolt {
  font-size: 3.5rem;
  margin-bottom: 0.25rem;
  animation: pulse 2.2s ease-in-out infinite;
}
.maint-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0.25rem 0 0.5rem;
}
.maint-sub  { color: rgba(229,231,235,0.8); margin: 0 0 1.1rem; line-height: 1.45; font-size: 0.95rem; }
.maint-eta  { color: #fbbf24; margin: 0 0 0.8rem; font-size: 0.95rem; }
.maint-eta strong { color: #fde68a; }
.maint-status {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.78rem;
  color: rgba(229,231,235,0.55);
  margin-bottom: 0.9rem;
}
.maint-dot {
  width: 0.55rem; height: 0.55rem; border-radius: 50%;
  background: #6b7280;
}
.maint-dot--probing {
  background: #34d399;
  animation: blink 1.2s ease-in-out infinite;
}
.maint-quip {
  font-size: 0.92rem;
  color: rgba(229,231,235,0.7);
  font-style: italic;
  min-height: 2.6rem;
  margin: 0.4rem 0 1.1rem;
  line-height: 1.4;
}
.maint-retry {
  background: var(--accent, #E31937);
  color: white; font-weight: 600;
  padding: 0.65rem 1.4rem; border-radius: 0.65rem;
  border: 0; cursor: pointer; font-size: 0.92rem;
  min-height: 44px;
  transition: background 0.15s ease;
}
.maint-retry:hover { background: var(--accent-hover, #c4162e); }

@keyframes pulse { 50% { transform: scale(1.08); opacity: 0.85; } }
@keyframes blink { 50% { opacity: 0.3; } }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
.quip-enter-active, .quip-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.quip-enter-from { opacity: 0; transform: translateY(4px); }
.quip-leave-to   { opacity: 0; transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) {
  .maint-bolt, .maint-dot--probing { animation: none; }
  .fade-enter-active, .fade-leave-active,
  .quip-enter-active, .quip-leave-active { transition: opacity 0.1s ease; }
}
</style>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">🎮 Fahrzeugsteuerung</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm" :class="stateColor">{{ stateLabel }}</span>
        <button @click="wakeUp" :disabled="busy || vehicleState === 'online'"
          class="btn-secondary text-sm" v-tooltip="'Fahrzeug aufwecken (benötigt ~30s)'">
          ☀️ Aufwecken
        </button>
      </div>
    </div>

    <!-- Hinweis wenn schläft -->
    <div v-if="vehicleState === 'asleep' || vehicleState === 'offline'" class="card bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-sm space-y-1">
      <p class="font-semibold">Fahrzeug schläft oder ist offline</p>
      <p>Befehle werden automatisch versucht. Falls nötig zuerst "Aufwecken" drücken (~30s).</p>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
        :class="toast.ok ? 'bg-green-800 text-green-100' : 'bg-red-900 text-red-200'">
        {{ toast.msg }}
      </div>
    </transition>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Klimaanlage -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">🌡 Klimaanlage</h2>

        <div class="flex items-center justify-between">
          <span class="text-gray-300">Klimaanlage</span>
          <div class="flex gap-2">
            <button @click="cmd('auto_conditioning_start')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition disabled:opacity-40">
              Ein
            </button>
            <button @click="cmd('auto_conditioning_stop')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40">
              Aus
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-300">Temperatur</span>
            <div class="flex items-center gap-3">
              <button @click="temp = Math.max(15, temp - 0.5)" class="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold transition">−</button>
              <span class="text-white font-bold text-xl w-14 text-center">{{ temp.toFixed(1) }}°C</span>
              <button @click="temp = Math.min(28, temp + 0.5)" class="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold transition">+</button>
            </div>
          </div>
          <button @click="cmd('set_temps', { driver_temp: temp, passenger_temp: temp })" :disabled="busy"
            class="w-full py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40">
            Temperatur setzen
          </button>
        </div>

        <div class="border-t border-gray-700 pt-3">
          <button @click="cmd('set_preconditioning_max', { on: true })" :disabled="busy"
            class="w-full py-2 rounded-lg bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="'Maximale Heizleistung für schnelles Vorklimatisieren (Batterie + Scheiben)'">
            ❄️ Vorklimatisierung / Max-Defrost
          </button>
        </div>
      </div>

      <!-- Fahrzeug -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">🚗 Fahrzeug</h2>

        <div class="flex items-center justify-between">
          <span class="text-gray-300">Türen</span>
          <div class="flex gap-2">
            <button @click="cmd('door_unlock')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium transition disabled:opacity-40"
              v-tooltip="'Alle Türen entriegeln'">
              🔓 Öffnen
            </button>
            <button @click="cmd('door_lock')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
              v-tooltip="'Alle Türen verriegeln'">
              🔒 Sperren
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-gray-700 pt-3">
          <span class="text-gray-300">Sentry-Mode</span>
          <div class="flex gap-2">
            <button @click="cmd('set_sentry_mode', { on: true })" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-purple-800 hover:bg-purple-700 text-white text-sm font-medium transition disabled:opacity-40">
              Ein
            </button>
            <button @click="cmd('set_sentry_mode', { on: false })" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40">
              Aus
            </button>
          </div>
        </div>

        <div class="flex gap-2 border-t border-gray-700 pt-3">
          <button @click="cmd('flash_lights')" :disabled="busy"
            class="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="'Lichter kurz blinken lassen'">
            💡 Lichter
          </button>
          <button @click="cmd('honk_horn')" :disabled="busy"
            class="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="'Kurz hupen'">
            📯 Hupen
          </button>
        </div>
      </div>

      <!-- Laden -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">⚡ Laden</h2>

        <div class="flex items-center justify-between">
          <span class="text-gray-300">Laden</span>
          <div class="flex gap-2">
            <button @click="cmd('charge_start')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition disabled:opacity-40">
              Start
            </button>
            <button @click="cmd('charge_stop')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40">
              Stop
            </button>
          </div>
        </div>

        <div class="space-y-2 border-t border-gray-700 pt-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-300">Ladelimit</span>
            <span class="text-white font-bold">{{ chargeLimit }}%</span>
          </div>
          <input type="range" min="50" max="100" step="5" v-model.number="chargeLimit"
            class="w-full accent-tesla-red" />
          <div class="flex justify-between text-xs text-gray-500">
            <span>50% (Alltag)</span><span>80% (Standard)</span><span>100% (Reise)</span>
          </div>
          <button @click="cmd('set_charge_limit', { percent: chargeLimit })" :disabled="busy"
            class="w-full py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40">
            Ladelimit setzen
          </button>
        </div>
      </div>

      <!-- Navigation -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">🗺️ Navigation</h2>
        <p class="text-sm text-gray-400">Ziel direkt ans Fahrzeug senden — öffnet Navigation im Auto.</p>

        <div class="space-y-2">
          <input v-model="navAddress" type="text" placeholder="Adresse oder Ort eingeben…"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-tesla-red"
            @keyup.enter="sendNav" />
          <button @click="sendNav" :disabled="busy || !navAddress.trim()"
            class="w-full py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40">
            Ziel senden
          </button>
        </div>

        <div v-if="recentDests.length" class="border-t border-gray-700 pt-3 space-y-1">
          <p class="text-xs text-gray-500 mb-2">Zuletzt verwendet</p>
          <button v-for="d in recentDests" :key="d" @click="navAddress = d"
            class="w-full text-left px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition truncate">
            📍 {{ d }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

const appStore = useAppStore();
const vehicle  = computed(() => appStore.selectedVehicle);

const busy         = ref(false);
const toast        = ref(null);
const vehicleState = ref('unknown');
const temp         = ref(21.0);
const chargeLimit  = ref(80);
const navAddress   = ref('');
const recentDests  = ref(JSON.parse(localStorage.getItem('recentDests') || '[]'));

const stateColor = computed(() => ({
  online:  'text-green-400',
  asleep:  'text-yellow-400',
  offline: 'text-red-400',
  unknown: 'text-gray-400',
}[vehicleState.value] ?? 'text-gray-400'));

const stateLabel = computed(() => ({
  online:  'Online',
  asleep:  'Schläft',
  offline: 'Offline',
  unknown: '—',
}[vehicleState.value] ?? '—'));

function showToast(msg, ok = true) {
  toast.value = { msg, ok };
  setTimeout(() => { toast.value = null; }, 3500);
}

async function fetchState() {
  if (!vehicle.value) return;
  try {
    const { data } = await api.get(`/commands/${vehicle.value.id}/state`);
    vehicleState.value = data.state;
  } catch { vehicleState.value = 'unknown'; }
}

async function wakeUp() {
  if (!vehicle.value) return;
  busy.value = true;
  showToast('Fahrzeug wird aufgeweckt…', true);
  try {
    const { data } = await api.post(`/commands/${vehicle.value.id}/wake_up`, {});
    vehicleState.value = data.state === 'online' ? 'online' : 'asleep';
    showToast(data.state === 'online' ? 'Fahrzeug ist online!' : 'Timeout – Fahrzeug antwortet nicht', data.state === 'online');
  } catch (e) {
    showToast('Fehler beim Aufwecken', false);
  } finally { busy.value = false; }
}

async function cmd(command, body = {}) {
  if (!vehicle.value) return;
  busy.value = true;
  try {
    const { data } = await api.post(`/commands/${vehicle.value.id}/${command}`, body);
    if (data?.result === false) {
      showToast(data.reason || 'Befehl abgelehnt', false);
    } else {
      showToast('Befehl gesendet', true);
      vehicleState.value = 'online';
    }
  } catch (e) {
    if (e.response?.data?.code === 'ASLEEP') {
      showToast('Fahrzeug schläft – zuerst aufwecken', false);
      vehicleState.value = 'asleep';
    } else {
      showToast(e.response?.data?.error || 'Fehler beim Senden', false);
    }
  } finally { busy.value = false; }
}

async function sendNav() {
  const address = navAddress.value.trim();
  if (!address) return;
  await cmd('navigation_request', {
    type: 'share_ext_content_raw',
    locale: 'de-DE',
    timestamp_ms: Date.now(),
    value: { 'android.intent.extra.TEXT': address },
  });
  const updated = [address, ...recentDests.value.filter(d => d !== address)].slice(0, 5);
  recentDests.value = updated;
  localStorage.setItem('recentDests', JSON.stringify(updated));
  navAddress.value = '';
}

onMounted(fetchState);
watch(() => vehicle.value?.id, fetchState);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  GpsSetupWizard — 5-Schritt-Wizard fuer Endnutzer zum Einrichten von
  OwnTracks (Smartphone-GPS) + optional Bluetooth-Validation.
  Bewusst eigenstaendig vom AdminSetupWizard, weil normale User keinen
  Zugriff auf Tesla-Credentials/Fleet-API/VAPID brauchen.
-->
<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col"
           style="max-height: 90vh">

        <!-- Header -->
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-800 shrink-0">
          <div class="min-w-0">
            <h2 class="font-bold text-lg">{{ $t('gpsSetup.title') }}</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ $t('gpsSetup.step', { n: step + 1, total: STEPS.length }) }}
            </p>
          </div>
          <button @click="$emit('close')"
                  class="text-gray-500 hover:text-white text-2xl leading-none transition">×</button>
        </div>

        <!-- Fortschritt -->
        <div class="h-1 bg-gray-800 shrink-0">
          <div class="h-full bg-tesla-red transition-all duration-300"
               :style="{ width: ((step + 1) / STEPS.length * 100) + '%' }"></div>
        </div>

        <!-- Inhalt -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- STEP 1: Welcome -->
          <template v-if="currentId === 'welcome'">
            <div class="text-center space-y-4 py-4">
              <div class="text-5xl">📍</div>
              <h3 class="text-xl font-bold">{{ $t('gpsSetup.welcome.title') }}</h3>
              <p class="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {{ $t('gpsSetup.welcome.body') }}
              </p>
              <div class="bg-gray-800 rounded-xl p-4 text-left text-sm space-y-2">
                <p class="font-semibold text-emerald-300">{{ $t('gpsSetup.welcome.youGet') }}</p>
                <ul class="text-gray-300 space-y-1 pl-4 list-disc">
                  <li>{{ $t('gpsSetup.welcome.point1') }}</li>
                  <li>{{ $t('gpsSetup.welcome.point2') }}</li>
                  <li>{{ $t('gpsSetup.welcome.point3') }}</li>
                  <li>{{ $t('gpsSetup.welcome.point4') }}</li>
                </ul>
              </div>
              <p class="text-xs text-gray-500">{{ $t('gpsSetup.welcome.privacyNote') }}</p>
            </div>
          </template>

          <!-- STEP 2: Install -->
          <template v-else-if="currentId === 'install'">
            <div class="space-y-4">
              <h3 class="text-lg font-bold flex items-center gap-2">📲 {{ $t('gpsSetup.install.title') }}</h3>
              <p class="text-gray-300 text-sm">{{ $t('gpsSetup.install.body') }}</p>

              <!-- Plattform-Toggle (initial via UA, manuell umschaltbar) -->
              <div class="flex gap-2">
                <button @click="platform = 'ios'"
                        :class="['flex-1 px-3 py-2 rounded border text-sm',
                                 platform === 'ios' ? 'bg-blue-500/20 border-blue-500/60 text-blue-200' : 'border-gray-700 text-gray-400']">
                  🍎 iOS / iPhone
                </button>
                <button @click="platform = 'android'"
                        :class="['flex-1 px-3 py-2 rounded border text-sm',
                                 platform === 'android' ? 'bg-blue-500/20 border-blue-500/60 text-blue-200' : 'border-gray-700 text-gray-400']">
                  🤖 Android
                </button>
              </div>

              <div v-if="platform === 'ios'" class="space-y-2">
                <a href="https://apps.apple.com/app/owntracks/id692424691" target="_blank" rel="noopener"
                   class="block bg-gray-800 hover:bg-gray-700 rounded-lg p-3 text-sm transition">
                  📥 {{ $t('gpsSetup.install.iosLink') }}
                </a>
                <p class="text-xs text-gray-500">{{ $t('gpsSetup.install.iosHint') }}</p>
              </div>

              <div v-else class="space-y-2">
                <a href="https://play.google.com/store/apps/details?id=org.owntracks.android" target="_blank" rel="noopener"
                   class="block bg-gray-800 hover:bg-gray-700 rounded-lg p-3 text-sm transition">
                  📥 {{ $t('gpsSetup.install.playLink') }}
                </a>
                <a href="https://f-droid.org/packages/org.owntracks.android/" target="_blank" rel="noopener"
                   class="block bg-gray-800 hover:bg-gray-700 rounded-lg p-3 text-sm transition">
                  📥 {{ $t('gpsSetup.install.fdroidLink') }}
                </a>
                <p class="text-xs text-gray-500">{{ $t('gpsSetup.install.androidHint') }}</p>
              </div>

              <p class="text-xs text-gray-400">✅ {{ $t('gpsSetup.install.cost') }}</p>
            </div>
          </template>

          <!-- STEP 3: Device anlegen + QR -->
          <template v-else-if="currentId === 'device'">
            <div class="space-y-4">
              <h3 class="text-lg font-bold flex items-center gap-2">🆕 {{ $t('gpsSetup.device.title') }}</h3>

              <div v-if="vehicles.length === 0" class="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-200">
                ⚠ {{ $t('gpsSetup.device.noVehicles') }}
              </div>

              <template v-else-if="!createdDevice">
                <label class="block text-sm">
                  <span class="text-gray-400">{{ $t('gpsSetup.device.labelField') }}</span>
                  <input v-model="form.label" type="text"
                         :placeholder="$t('gpsSetup.device.labelPlaceholder')"
                         class="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label class="block text-sm">
                  <span class="text-gray-400">{{ $t('gpsSetup.device.vehicleField') }}</span>
                  <select v-model="form.vehicle_id"
                          class="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.display_name || v.vin }}</option>
                  </select>
                </label>
                <label class="block text-sm">
                  <span class="text-gray-400">{{ $t('gpsSetup.device.tripTypeField') }}</span>
                  <select v-model="form.default_trip_type"
                          class="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="business">{{ $t('myTracking.tripTypes.business') }}</option>
                    <option value="private">{{ $t('myTracking.tripTypes.private') }}</option>
                    <option value="commute">{{ $t('myTracking.tripTypes.commute') }}</option>
                  </select>
                  <span class="text-[11px] text-gray-500">{{ $t('gpsSetup.device.tripTypeHint') }}</span>
                </label>

                <button @click="createDevice" :disabled="!canCreate || creating"
                        class="w-full btn-primary text-sm">
                  {{ creating ? '…' : $t('gpsSetup.device.createBtn') }}
                </button>
                <p v-if="error" class="text-sm text-red-400">✗ {{ error }}</p>
              </template>

              <!-- QR-Code zeigen -->
              <template v-else>
                <div class="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 text-sm text-emerald-200">
                  ✓ {{ $t('gpsSetup.device.created', { label: createdDevice.label }) }}
                </div>
                <p class="text-sm text-gray-300">{{ $t('gpsSetup.device.scanHint') }}</p>
                <div class="bg-white rounded-lg p-4 flex items-center justify-center">
                  <img :src="qrUrl" alt="OwnTracks QR" class="max-w-[260px] w-full" />
                </div>
                <div class="text-xs text-gray-400 space-y-1">
                  <p>{{ $t('gpsSetup.device.alt') }}</p>
                  <a :href="otrcUrl" target="_blank" rel="noopener" download
                     class="block bg-gray-800 hover:bg-gray-700 rounded p-2 text-blue-300 underline">
                    ⬇ {{ $t('gpsSetup.device.downloadOtrc') }}
                  </a>
                </div>
              </template>
            </div>
          </template>

          <!-- STEP 4: Live-Test -->
          <template v-else-if="currentId === 'test'">
            <div class="space-y-4">
              <h3 class="text-lg font-bold flex items-center gap-2">🔄 {{ $t('gpsSetup.test.title') }}</h3>
              <p class="text-gray-300 text-sm whitespace-pre-line">{{ $t('gpsSetup.test.body') }}</p>

              <div class="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{{ lastPing ? '✓' : '⏳' }}</span>
                  <span :class="lastPing ? 'text-emerald-300' : 'text-gray-400'">
                    {{ lastPing ? $t('gpsSetup.test.received', { time: relativeTime(lastPing) }) : $t('gpsSetup.test.waiting') }}
                  </span>
                </div>
                <button @click="checkPing" :disabled="checking" class="btn-secondary text-xs px-3 py-1">
                  🔄 {{ checking ? '…' : $t('gpsSetup.test.checkNow') }}
                </button>
              </div>

              <details class="text-xs text-gray-400">
                <summary class="cursor-pointer">{{ $t('gpsSetup.test.troubleshootTitle') }}</summary>
                <ul class="mt-2 space-y-1 pl-4 list-disc">
                  <li>{{ $t('gpsSetup.test.tip1') }}</li>
                  <li>{{ $t('gpsSetup.test.tip2') }}</li>
                  <li>{{ $t('gpsSetup.test.tip3') }}</li>
                </ul>
              </details>
            </div>
          </template>

          <!-- STEP 5: Bluetooth (optional) -->
          <template v-else-if="currentId === 'bluetooth'">
            <div class="space-y-4">
              <h3 class="text-lg font-bold flex items-center gap-2">🔵 {{ $t('gpsSetup.bluetooth.title') }}</h3>
              <p class="text-gray-300 text-sm whitespace-pre-line">{{ $t('gpsSetup.bluetooth.body') }}</p>

              <div v-if="platform === 'ios'" class="bg-gray-800 rounded-lg p-3 text-sm space-y-2">
                <p class="text-emerald-300 font-semibold">🍎 {{ $t('gpsSetup.bluetooth.iosTitle') }}</p>
                <p class="text-gray-300 text-xs">{{ $t('gpsSetup.bluetooth.iosBody') }}</p>
                <p class="text-[11px] text-gray-500">{{ $t('gpsSetup.bluetooth.iosHint') }}</p>
              </div>

              <div v-else class="bg-gray-800 rounded-lg p-3 text-sm space-y-2">
                <p class="text-emerald-300 font-semibold">🤖 {{ $t('gpsSetup.bluetooth.androidTitle') }}</p>
                <p class="text-gray-300 text-xs">{{ $t('gpsSetup.bluetooth.androidBody') }}</p>
              </div>

              <p class="text-xs text-gray-500">{{ $t('gpsSetup.bluetooth.skipNote') }}</p>
            </div>
          </template>
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-between gap-2 px-6 py-3 border-t border-gray-800 shrink-0">
          <button @click="back" :disabled="step === 0"
                  class="text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            ← {{ $t('common.back') }}
          </button>
          <div class="flex gap-2">
            <button v-if="step < STEPS.length - 1"
                    @click="next"
                    :disabled="currentId === 'device' && !createdDevice && vehicles.length > 0"
                    class="btn-primary text-sm px-5">
              {{ $t('common.next') }} →
            </button>
            <button v-else @click="finish"
                    class="btn-primary text-sm px-5">
              ✓ {{ $t('gpsSetup.finish') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../api.js';

const { t, locale } = useI18n();
const emit = defineEmits(['close', 'finished']);

const STEPS = ['welcome', 'install', 'device', 'test', 'bluetooth'];
const step      = ref(0);
const currentId = computed(() => STEPS[step.value]);

// Plattform-Auswahl initial via UA-Sniffing — manuell umschaltbar
const platform = ref(/Android/i.test(navigator.userAgent) ? 'android' : 'ios');

// Step 3: Device anlegen
const vehicles      = ref([]);
const form          = reactive({ label: '', vehicle_id: null, default_trip_type: 'business' });
const creating      = ref(false);
const error         = ref('');
const createdDevice = ref(null);

const canCreate = computed(() => !!(form.label?.trim() && form.vehicle_id));

const qrUrl   = computed(() => createdDevice.value
  ? `/api/owntracks/qr.png?token=${encodeURIComponent(createdDevice.value.token)}` : '');
const otrcUrl = computed(() => createdDevice.value
  ? `/api/owntracks/config.otrc?token=${encodeURIComponent(createdDevice.value.token)}` : '');

async function loadVehicles() {
  try {
    const { data } = await api.get('/vehicles');
    vehicles.value = data || [];
    if (!form.vehicle_id && vehicles.value[0]) form.vehicle_id = vehicles.value[0].id;
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  }
}

async function createDevice() {
  creating.value = true; error.value = '';
  try {
    const { data } = await api.post('/owntracks/devices', {
      label:             form.label.trim(),
      vehicle_id:        form.vehicle_id,
      default_trip_type: form.default_trip_type,
    });
    createdDevice.value = data;
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  } finally {
    creating.value = false;
  }
}

// Step 4: Live-Ping-Check
const lastPing = ref(null);
const checking = ref(false);

async function checkPing() {
  if (!createdDevice.value) return;
  checking.value = true;
  try {
    const { data } = await api.get('/owntracks/devices');
    const dev = (data || []).find(d => d.id === createdDevice.value.id);
    lastPing.value = dev?.last_ping_at || null;
  } catch { /* still waiting */ }
  finally { checking.value = false; }
}

function relativeTime(unix) {
  if (!unix) return '';
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return t('gpsSetup.test.justNow');
  if (diff < 3600) return t('gpsSetup.test.minsAgo', { n: Math.floor(diff / 60) });
  return new Date(unix * 1000).toLocaleString(locale.value);
}

function back()   { if (step.value > 0) step.value--; }
function next()   {
  if (step.value === 3) checkPing();        // Live-Check beim Verlassen
  if (step.value < STEPS.length - 1) step.value++;
}
function finish() { emit('finished'); emit('close'); }

// Vehicles direkt am Wizard-Start laden — der User soll auf Step 3 nicht warten
onMounted(loadVehicles);
</script>

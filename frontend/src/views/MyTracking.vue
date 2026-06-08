<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('myTracking.title') }}</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('myTracking.subtitle') }}</p>
      </div>
    </div>

    <!-- Erklärung: was bringt das -->
    <div class="bg-blue-900/20 border border-blue-700/40 rounded-xl px-4 py-3 text-sm text-blue-100 whitespace-pre-line">
      {{ $t('myTracking.intro') }}
    </div>

    <!-- Liste der eigenen Geräte -->
    <div v-if="devices.length > 0" class="space-y-3">
      <div v-for="d in devices" :key="d.id"
           class="card p-4 space-y-3">
        <div class="flex items-start gap-3 flex-wrap">
          <span class="text-2xl shrink-0">{{ deviceIcon(d) }}</span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-white">{{ d.label }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              🚗 {{ vehicleLabel(d.vehicle_id) }} ·
              📁 {{ $t('myTracking.tripTypes.' + d.default_trip_type) }}
            </p>
            <p class="text-[11px] mt-0.5" :class="statusColor(d)">
              {{ statusLabel(d) }}
            </p>
            <p class="text-[11px] text-gray-500 mt-0.5">
              {{ d.last_ping_at ? $t('myTracking.lastPing', { time: relativeTime(d.last_ping_at) }) : $t('myTracking.neverPinged') }}
            </p>
          </div>
          <div class="flex flex-col gap-1 shrink-0">
            <button @click="toggleQr(d)"
                    class="text-xs btn-secondary px-3 py-1">
              {{ qrVisible.has(d.id) ? $t('myTracking.hideQr') : '📷 ' + $t('myTracking.showQr') }}
            </button>
            <button @click="togglePause(d)"
                    v-tooltip="$t('myTracking.pauseTooltip')"
                    class="text-xs btn-secondary px-3 py-1">
              {{ d.active_paused ? '▶ ' + $t('myTracking.resume') : '⏸ ' + $t('myTracking.pause') }}
            </button>
            <button @click="toggleDevice(d)"
                    class="text-xs btn-secondary px-3 py-1">
              {{ d.is_active ? '⏸ ' + $t('common.deactivate') : '▶ ' + $t('common.activate') }}
            </button>
            <button @click="deleteDevice(d)"
                    class="text-xs text-red-400 hover:bg-red-900/40 rounded px-3 py-1">
              ✕ {{ $t('common.delete') }}
            </button>
          </div>
        </div>

        <!-- Bluetooth-Validation-Setup -->
        <details class="text-xs">
          <summary class="cursor-pointer text-amber-300/90 hover:text-amber-200">
            🔵 {{ $t('myTracking.bluetoothSetup.title') }}
            <span v-if="d.bluetooth_pairing_name" class="text-emerald-400 ml-1">✓</span>
          </summary>
          <div class="mt-3 space-y-3 bg-gray-900/40 rounded-lg p-3">
            <p class="text-gray-300 whitespace-pre-line">{{ $t('myTracking.bluetoothSetup.intro') }}</p>
            <label class="block text-xs">
              <span class="text-gray-400">{{ $t('myTracking.bluetoothSetup.nameLabel') }}</span>
              <input v-model="btForms[d.id]" type="text" :placeholder="$t('myTracking.bluetoothSetup.namePlaceholder')"
                     class="mt-1 w-full bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500" />
            </label>
            <button @click="saveBluetooth(d)"
                    class="text-xs btn-secondary px-3 py-1">
              {{ $t('myTracking.bluetoothSetup.save') }}
            </button>
            <div v-if="deviceTokens[d.id]" class="mt-3 space-y-2 text-gray-300">
              <p class="font-semibold">{{ $t('myTracking.bluetoothSetup.shortcutTitle') }}</p>
              <ol class="list-decimal list-inside space-y-1">
                <li>{{ $t('myTracking.bluetoothSetup.step1') }}</li>
                <li>{{ $t('myTracking.bluetoothSetup.step2') }}</li>
                <li>{{ $t('myTracking.bluetoothSetup.step3') }}</li>
              </ol>
              <p class="font-semibold mt-2">{{ $t('myTracking.bluetoothSetup.urlConnect') }}</p>
              <code class="block bg-gray-950 rounded px-2 py-1.5 font-mono text-[10px] select-all break-all">{{ inVehicleStartUrl(deviceTokens[d.id]) }}</code>
              <p class="font-semibold mt-2">{{ $t('myTracking.bluetoothSetup.urlDisconnect') }}</p>
              <code class="block bg-gray-950 rounded px-2 py-1.5 font-mono text-[10px] select-all break-all">{{ inVehicleEndUrl(deviceTokens[d.id]) }}</code>
            </div>
            <p v-else class="text-gray-500 italic">{{ $t('myTracking.bluetoothSetup.needToken') }}</p>
          </div>
        </details>

        <!-- QR-Code, ein-/ausklappbar -->
        <div v-if="qrVisible.has(d.id) && deviceTokens[d.id]"
             class="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-4 space-y-3">
          <p class="text-xs text-emerald-100 whitespace-pre-line">
            {{ $t('myTracking.qrInstructions') }}
          </p>
          <div class="bg-white rounded-lg p-3 inline-block">
            <img :src="qrUrl(deviceTokens[d.id])" alt="OwnTracks QR" class="w-56 h-56 block" />
          </div>
          <details class="text-xs">
            <summary class="cursor-pointer text-emerald-300/80 hover:text-emerald-200">
              {{ $t('myTracking.manualSetup') }}
            </summary>
            <div class="mt-2 space-y-2">
              <div class="flex gap-2 items-center">
                <code class="flex-1 bg-gray-950 rounded px-2 py-1.5 font-mono text-[10px] select-all break-all">
                  {{ webhookUrl(deviceTokens[d.id]) }}
                </code>
                <button @click="copyUrl(d.id)"
                        class="text-xs btn-secondary px-3 py-1 shrink-0">
                  {{ copiedId === d.id ? '✓' : $t('common.copy') }}
                </button>
              </div>
              <a :href="otrcUrl(deviceTokens[d.id])" :download="`teslaview-${d.label}.otrc`"
                 class="inline-block text-emerald-300 hover:underline">
                ⬇ {{ $t('myTracking.downloadOtrc') }}
              </a>
            </div>
          </details>
        </div>
      </div>
    </div>
    <p v-else-if="!showForm && !loading" class="text-sm text-gray-500 py-2">
      {{ $t('myTracking.noDevices') }}
    </p>

    <!-- Formular: neues Gerät -->
    <div v-if="showForm" class="card p-5 space-y-3">
      <h3 class="text-base font-semibold">{{ $t('myTracking.addTitle') }}</h3>
      <label class="block text-xs">
        <span class="text-gray-400">{{ $t('myTracking.form.label') }}</span>
        <input v-model="form.label" required
               :placeholder="$t('myTracking.form.labelPlaceholder')"
               class="mt-1 w-full bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500" />
      </label>
      <label class="block text-xs">
        <span class="text-gray-400">{{ $t('myTracking.form.vehicle') }}</span>
        <select v-model="form.vehicle_id" class="mt-1 w-full bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
          <option v-for="v in vehicles" :key="v.id" :value="v.id">
            {{ v.display_name || v.vin }}
          </option>
        </select>
        <p v-if="vehicles.length === 0" class="text-[11px] text-amber-400 mt-1">
          {{ $t('myTracking.form.noVehicles') }}
        </p>
      </label>
      <label class="block text-xs">
        <span class="text-gray-400">{{ $t('myTracking.form.tripType') }}</span>
        <select v-model="form.default_trip_type"
                class="mt-1 w-full bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="business">{{ $t('myTracking.tripTypes.business') }}</option>
          <option value="private">{{ $t('myTracking.tripTypes.private') }}</option>
          <option value="commute">{{ $t('myTracking.tripTypes.commute') }}</option>
        </select>
        <p class="text-[11px] text-gray-500 mt-1">{{ $t('myTracking.form.tripTypeHint') }}</p>
      </label>
      <div class="flex gap-2">
        <button @click="createDevice" :disabled="!canCreate || creating"
                class="flex-1 btn-primary text-sm">
          {{ creating ? '…' : $t('myTracking.createBtn') }}
        </button>
        <button @click="showForm = false" class="btn-secondary text-sm px-4">
          {{ $t('common.cancel') }}
        </button>
      </div>
    </div>
    <button v-else-if="vehicles.length > 0" @click="openForm"
            class="btn-primary text-sm">
      + {{ $t('myTracking.addBtn') }}
    </button>

    <p v-if="error" class="text-sm text-red-400">✗ {{ error }}</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../api.js';

const { t } = useI18n();

const devices       = ref([]);
const vehicles      = ref([]);
const deviceTokens  = reactive({});   // { [deviceId]: device_token }  — lazy-geladen wenn QR aufgeklappt
const qrVisible     = ref(new Set());
const showForm      = ref(false);
const form          = reactive({ label: '', vehicle_id: null, default_trip_type: 'business' });
const creating      = ref(false);
const loading       = ref(false);
const error         = ref('');
const copiedId      = ref(null);
const btForms       = reactive({});   // { [deviceId]: bluetooth_pairing_name draft }

const canCreate = computed(() =>
  !!(form.label?.trim() && form.vehicle_id)
);

async function load() {
  loading.value = true; error.value = '';
  try {
    const [devs, vehs] = await Promise.all([
      api.get('/owntracks/devices').then(r => r.data),
      api.get('/vehicles').then(r => r.data),
    ]);
    devices.value  = devs || [];
    vehicles.value = vehs || [];
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  } finally {
    loading.value = false;
  }
}

function openForm() {
  showForm.value = true;
  error.value    = '';
  if (!form.vehicle_id && vehicles.value[0]) form.vehicle_id = vehicles.value[0].id;
}

async function createDevice() {
  creating.value = true; error.value = '';
  try {
    const { data } = await api.post('/owntracks/devices', {
      label:             form.label.trim(),
      vehicle_id:        form.vehicle_id,
      default_trip_type: form.default_trip_type,
    });
    showForm.value = false;
    form.label = '';
    await load();
    // direkt nach Create: QR auch direkt anzeigen
    const newest = devices.value[0];
    if (newest) {
      deviceTokens[newest.id] = data.token;
      qrVisible.value.add(newest.id);
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  } finally {
    creating.value = false;
  }
}

async function toggleQr(d) {
  if (qrVisible.value.has(d.id)) {
    qrVisible.value.delete(d.id);
    qrVisible.value = new Set(qrVisible.value);
    return;
  }
  // Lazy-load Token vom Backend
  if (!deviceTokens[d.id]) {
    try {
      const { data } = await api.get(`/owntracks/devices/${d.id}/token`);
      deviceTokens[d.id] = data.token;
    } catch (e) {
      error.value = e.response?.data?.error || e.message;
      return;
    }
  }
  qrVisible.value.add(d.id);
  qrVisible.value = new Set(qrVisible.value);
}

async function toggleDevice(d) {
  try {
    await api.patch(`/owntracks/devices/${d.id}`, { is_active: !d.is_active });
    await load();
  } catch (e) { error.value = e.response?.data?.error || e.message; }
}

async function deleteDevice(d) {
  if (!confirm(t('myTracking.confirmDelete', { label: d.label }))) return;
  try {
    await api.delete(`/owntracks/devices/${d.id}`);
    delete deviceTokens[d.id];
    qrVisible.value.delete(d.id);
    await load();
  } catch (e) { error.value = e.response?.data?.error || e.message; }
}

async function copyUrl(deviceId) {
  await navigator.clipboard.writeText(webhookUrl(deviceTokens[deviceId]));
  copiedId.value = deviceId;
  setTimeout(() => { if (copiedId.value === deviceId) copiedId.value = null; }, 2000);
}

function vehicleLabel(id) {
  const v = vehicles.value.find(x => x.id === id);
  return v?.display_name || v?.vin || `#${id}`;
}

function relativeTime(unixSec) {
  const mins = Math.round((Date.now() / 1000 - unixSec) / 60);
  if (mins < 1)    return t('myTracking.justNow');
  if (mins < 60)   return t('myTracking.minsAgo',  { mins });
  if (mins < 1440) return t('myTracking.hoursAgo', { hours: Math.round(mins / 60) });
  return t('myTracking.daysAgo', { days: Math.round(mins / 1440) });
}

function qrUrl(token)      { return `/api/owntracks/qr.png?token=${encodeURIComponent(token)}`; }
function otrcUrl(token)    { return `/api/owntracks/config.otrc?token=${encodeURIComponent(token)}`; }
function webhookUrl(token) { return `${location.origin}/api/owntracks/webhook?token=${token}`; }
function inVehicleStartUrl(token) { return `${location.origin}/api/owntracks/in-vehicle/start/${token}`; }
function inVehicleEndUrl(token)   { return `${location.origin}/api/owntracks/in-vehicle/end/${token}`; }

function deviceIcon(d) {
  if (!d.is_active) return '⏸';
  if (d.active_paused) return '⏸';
  if (d.bluetooth_pairing_name && !d.in_vehicle) return '🅿️'; // hat BT-Config, gerade nicht im Auto
  if (d.in_vehicle) return '🚗';
  return '📱';
}
function statusLabel(d) {
  if (!d.is_active) return t('myTracking.statusInactive');
  if (d.active_paused) return t('myTracking.statusPaused');
  if (d.bluetooth_pairing_name && !d.in_vehicle) return t('myTracking.statusNotInVehicle');
  if (d.in_vehicle) return t('myTracking.statusInVehicle');
  if (d.bluetooth_pairing_name) return t('myTracking.statusInVehicleUnknown');
  return t('myTracking.statusLegacy');
}
function statusColor(d) {
  if (!d.is_active || d.active_paused) return 'text-gray-500';
  if (d.in_vehicle) return 'text-emerald-400';
  if (d.bluetooth_pairing_name && !d.in_vehicle) return 'text-yellow-400';
  return 'text-blue-400';
}

async function togglePause(d) {
  try {
    const action = d.active_paused ? 'resume' : 'pause';
    await api.post(`/owntracks/devices/${d.id}/${action}`);
    await load();
  } catch (e) { error.value = e.response?.data?.error || e.message; }
}

async function saveBluetooth(d) {
  try {
    await api.patch(`/owntracks/devices/${d.id}/bluetooth`, {
      bluetooth_pairing_name: btForms[d.id] ?? null,
    });
    // Token nachladen für Shortcut-URLs
    if (!deviceTokens[d.id]) {
      try {
        const { data } = await api.get(`/owntracks/devices/${d.id}/token`);
        deviceTokens[d.id] = data.token;
      } catch { /* ignore */ }
    }
    await load();
  } catch (e) { error.value = e.response?.data?.error || e.message; }
}

onMounted(async () => {
  await load();
  // BT-Form-Drafts mit aktuellen Werten initialisieren
  for (const d of devices.value) btForms[d.id] = d.bluetooth_pairing_name || '';
});
</script>

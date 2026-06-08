<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-3">
    <div class="space-y-1">
      <p class="text-xs text-gray-500">
        {{ $t('settings.geofenceHint') }}
      </p>
    </div>

    <!-- Liste vorhandener Geofences -->
    <div v-if="geofences.length" class="space-y-1.5">
      <div v-for="g in geofences" :key="g.id"
           class="flex items-center gap-2 text-sm bg-gray-800/60 rounded-lg px-3 py-1.5">
        <span class="text-lg">{{ kindEmoji(g.kind) }}</span>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-white truncate">{{ g.name }}</p>
          <p class="text-xs text-gray-400 font-mono">
            {{ g.lat.toFixed(5) }}, {{ g.lon.toFixed(5) }} · ±{{ g.radius_m }}m
          </p>
        </div>
        <button @click="remove(g)" class="text-xs text-red-400 hover:text-red-200">
          ✕
        </button>
      </div>
    </div>
    <p v-else class="text-xs text-gray-500 italic">{{ $t('settings.geofenceEmpty') }}</p>

    <!-- Anlegen-Form -->
    <div class="bg-gray-800/40 rounded-lg p-3 space-y-2">
      <p class="text-xs text-gray-300 font-medium">{{ $t('settings.geofenceAdd') }}</p>
      <div class="grid grid-cols-2 gap-2">
        <select v-model="form.kind" class="input text-sm">
          <option value="home">🏠 {{ $t('settings.geofenceKindHome') }}</option>
          <option value="work">💼 {{ $t('settings.geofenceKindWork') }}</option>
          <option value="other">📍 {{ $t('settings.geofenceKindOther') }}</option>
        </select>
        <input v-model="form.name" type="text" class="input text-sm"
               :placeholder="$t('settings.geofenceNamePlaceholder')" />
        <input v-model.number="form.lat" type="number" step="0.00001" class="input text-sm font-mono"
               placeholder="Lat (z.B. 48.7758)" />
        <input v-model.number="form.lon" type="number" step="0.00001" class="input text-sm font-mono"
               placeholder="Lon (z.B. 9.1829)" />
        <input v-model.number="form.radius_m" type="number" min="50" max="5000" step="50" class="input text-sm"
               :placeholder="$t('settings.geofenceRadius') + ' (m)'" />
        <button @click="useCurrentLocation" type="button" class="btn-secondary text-xs">
          📍 {{ $t('settings.geofenceUseGPS') }}
        </button>
      </div>
      <button @click="save" :disabled="!canSave"
              class="btn-primary text-sm w-full">
        {{ $t('settings.geofenceSave') }}
      </button>
      <p v-if="msg" class="text-xs" :class="msgOk ? 'text-green-400' : 'text-red-400'">{{ msg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

const appStore  = useAppStore();
const geofences = ref([]);
const form      = ref({ kind: 'home', name: '', lat: null, lon: null, radius_m: 200 });
const msg       = ref('');
const msgOk     = ref(false);

const canSave = computed(() =>
  form.value.name.trim() &&
  Number.isFinite(form.value.lat) &&
  Number.isFinite(form.value.lon)
);

const kindEmoji = k => ({ home: '🏠', work: '💼', other: '📍' }[k] || '📍');

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) { geofences.value = []; return; }
  try {
    const { data } = await api.get('/geofences', { params: { vehicle_id: vid } });
    geofences.value = data;
  } catch { geofences.value = []; }
}

async function save() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  msg.value = '';
  try {
    await api.post('/geofences', {
      vehicle_id: vid,
      kind:       form.value.kind,
      name:       form.value.name.trim(),
      lat:        form.value.lat,
      lon:        form.value.lon,
      radius_m:   form.value.radius_m || 200,
    });
    msgOk.value = true;
    msg.value = '✓';
    form.value = { kind: 'home', name: '', lat: null, lon: null, radius_m: 200 };
    await load();
    setTimeout(() => { msg.value = ''; }, 1500);
  } catch (err) {
    msgOk.value = false;
    msg.value = err.response?.data?.error || err.message;
  }
}

async function remove(g) {
  await api.delete(`/geofences/${g.id}`);
  await load();
}

function useCurrentLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    form.value.lat = Math.round(pos.coords.latitude  * 100000) / 100000;
    form.value.lon = Math.round(pos.coords.longitude * 100000) / 100000;
  });
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('chargingLocations.title') }}</h1>
        <p class="text-gray-400 text-sm mt-1">{{ $t('chargingLocations.subtitle') }}</p>
      </div>
      <button @click="startNew" class="btn-primary text-sm px-4 py-2">
        + {{ $t('chargingLocations.add') }}
      </button>
    </div>

    <div v-if="locations.length" class="space-y-2">
      <div v-for="l in locations" :key="l.id"
        class="bg-gray-800 rounded-lg p-4">
        <div v-if="editingId !== l.id" class="flex items-start gap-3">
          <span class="text-3xl">{{ typeIcon(l.type) }}</span>
          <div class="flex-1">
            <div class="flex items-baseline gap-2 flex-wrap">
              <p class="font-semibold text-base">{{ l.name }}</p>
              <span v-if="l.is_default" class="text-xs bg-tesla-red/20 text-tesla-red px-1.5 py-0.5 rounded">
                {{ $t('chargingLocations.default') }}
              </span>
            </div>
            <p v-if="l.address" class="text-xs text-gray-400 truncate">{{ l.address }}</p>
            <div class="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
              <span v-if="l.lat != null">📍 {{ fmtCoords(l.lat, l.lon) }} (R {{ l.radius_m }} m)</span>
              <span v-if="l.rate_kwh != null">💶 {{ l.rate_kwh.toFixed(3) }} €/kWh</span>
              <span v-if="l.default_charge_limit != null"
                class="text-emerald-400 font-medium">
                🔋 {{ l.default_charge_limit }} % {{ $t('chargingLocations.limitAutoApplied') }}
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <button v-if="l.default_charge_limit != null" @click="applyLimit(l)"
              v-tooltip="$t('chargingLocations.applyNowTooltip')"
              class="text-xs btn-secondary px-3 py-1">🔋 {{ $t('chargingLocations.applyNow') }}</button>
            <button @click="startEdit(l)" class="text-xs btn-secondary px-3 py-1">
              ✎ {{ $t('common.edit') }}
            </button>
            <button @click="del(l)" class="text-xs text-red-400 hover:bg-red-900/40 rounded px-3 py-1">
              ✕ {{ $t('common.delete') }}
            </button>
          </div>
        </div>

        <form v-else @submit.prevent="save(l.id, form)" class="space-y-3">
          <input v-model="form.name" required :placeholder="$t('chargingLocations.form.name')"
            class="w-full bg-gray-700 rounded px-3 py-1.5 text-sm" />
          <input v-model="form.address" :placeholder="$t('chargingLocations.form.address')"
            class="w-full bg-gray-700 rounded px-3 py-1.5 text-sm" />
          <div class="grid grid-cols-2 gap-2">
            <input v-model.number="form.lat" type="number" step="0.0001" :placeholder="$t('chargingLocations.form.lat')"
              class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
            <input v-model.number="form.lon" type="number" step="0.0001" :placeholder="$t('chargingLocations.form.lon')"
              class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <input v-model.number="form.radius_m" type="number" min="50" max="2000"
              :placeholder="$t('chargingLocations.form.radius')"
              class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
            <input v-model.number="form.rate_kwh" type="number" step="0.01"
              :placeholder="$t('chargingLocations.form.rate')"
              class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
            <select v-model="form.type" class="bg-gray-700 rounded px-3 py-1.5 text-sm">
              <option value="home">{{ $t('chargingLocations.type.home') }}</option>
              <option value="work">{{ $t('chargingLocations.type.work') }}</option>
              <option value="public">{{ $t('chargingLocations.type.public') }}</option>
            </select>
          </div>
          <label class="block text-xs">
            <span class="text-gray-400">🔋 {{ $t('chargingLocations.form.limitLabel') }}</span>
            <input v-model.number="form.default_charge_limit" type="number" min="0" max="100"
              :placeholder="$t('chargingLocations.form.limitPlaceholder')"
              class="mt-1 w-full bg-gray-700 rounded px-3 py-1.5 text-sm" />
            <span class="text-gray-500 text-[10px]">{{ $t('chargingLocations.form.limitHint') }}</span>
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="form.is_default" type="checkbox" class="rounded" />
            <span>{{ $t('chargingLocations.form.isDefault') }}</span>
          </label>
          <div class="flex gap-2">
            <button type="submit" class="btn-primary text-sm px-4 py-1.5">{{ $t('common.save') }}</button>
            <button type="button" @click="cancel" class="btn-secondary text-sm px-4 py-1.5">{{ $t('common.cancel') }}</button>
          </div>
        </form>
      </div>
    </div>
    <p v-else-if="loaded && !creating" class="text-gray-400 text-sm">{{ $t('chargingLocations.empty') }}</p>

    <!-- Neu-Anlage Formular -->
    <div v-if="creating" class="bg-gray-800 rounded-lg p-4">
      <h3 class="font-semibold mb-3">{{ $t('chargingLocations.addTitle') }}</h3>
      <form @submit.prevent="create" class="space-y-3">
        <input v-model="newForm.name" required :placeholder="$t('chargingLocations.form.name')"
          class="w-full bg-gray-700 rounded px-3 py-1.5 text-sm" />
        <input v-model="newForm.address" :placeholder="$t('chargingLocations.form.address')"
          class="w-full bg-gray-700 rounded px-3 py-1.5 text-sm" />
        <div class="grid grid-cols-2 gap-2">
          <input v-model.number="newForm.lat" type="number" step="0.0001" :placeholder="$t('chargingLocations.form.lat')"
            class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
          <input v-model.number="newForm.lon" type="number" step="0.0001" :placeholder="$t('chargingLocations.form.lon')"
            class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
        </div>
        <div class="grid grid-cols-3 gap-2">
          <input v-model.number="newForm.radius_m" type="number" min="50" max="2000" value="200"
            :placeholder="$t('chargingLocations.form.radius')"
            class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
          <input v-model.number="newForm.rate_kwh" type="number" step="0.01"
            :placeholder="$t('chargingLocations.form.rate')"
            class="bg-gray-700 rounded px-3 py-1.5 text-sm" />
          <select v-model="newForm.type" class="bg-gray-700 rounded px-3 py-1.5 text-sm">
            <option value="home">{{ $t('chargingLocations.type.home') }}</option>
            <option value="work">{{ $t('chargingLocations.type.work') }}</option>
            <option value="public">{{ $t('chargingLocations.type.public') }}</option>
          </select>
        </div>
        <label class="block text-xs">
          <span class="text-gray-400">🔋 {{ $t('chargingLocations.form.limitLabel') }}</span>
          <input v-model.number="newForm.default_charge_limit" type="number" min="0" max="100"
            :placeholder="$t('chargingLocations.form.limitPlaceholder')"
            class="mt-1 w-full bg-gray-700 rounded px-3 py-1.5 text-sm" />
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="newForm.is_default" type="checkbox" class="rounded" />
          <span>{{ $t('chargingLocations.form.isDefault') }}</span>
        </label>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary text-sm px-4 py-1.5">{{ $t('common.save') }}</button>
          <button type="button" @click="creating = false" class="btn-secondary text-sm px-4 py-1.5">{{ $t('common.cancel') }}</button>
        </div>
      </form>
    </div>

    <div class="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 text-sm text-blue-100">
      {{ $t('chargingLocations.hint') }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
import { formatCoords } from '../lib/location.js';

const appStore = useAppStore();
const locations = ref([]);
const loaded = ref(false);
const editingId = ref(null);
const creating = ref(false);
const form = reactive({});
const newForm = reactive({
  name: '', address: '', lat: null, lon: null, radius_m: 200,
  rate_kwh: null, type: 'home', is_default: false, default_charge_limit: null,
});

const typeIcon = (t) => ({ home: '🏠', work: '💼', public: '⚡' }[t] || '📍');
const fmtCoords = formatCoords;

async function load() {
  try {
    const vid = appStore.selectedVehicle?.id;
    const { data } = await api.get('/charging-locations', { params: vid ? { vehicle_id: vid } : {} });
    locations.value = data;
  } catch {
    locations.value = [];
  } finally {
    loaded.value = true;
  }
}

function startEdit(l) {
  editingId.value = l.id;
  Object.assign(form, {
    name: l.name, address: l.address, lat: l.lat, lon: l.lon,
    radius_m: l.radius_m, rate_kwh: l.rate_kwh, type: l.type,
    is_default: !!l.is_default, default_charge_limit: l.default_charge_limit,
  });
}

function startNew() {
  Object.assign(newForm, {
    name: '', address: '', lat: null, lon: null, radius_m: 200,
    rate_kwh: null, type: 'home', is_default: false, default_charge_limit: null,
  });
  creating.value = true;
}

function cancel() {
  editingId.value = null;
}

async function save(id, data) {
  try {
    await api.put(`/charging-locations/${id}`, data);
    editingId.value = null;
    await load();
  } catch (e) { alert(e.response?.data?.error || e.message); }
}

async function create() {
  try {
    const vid = appStore.selectedVehicle?.id;
    if (!vid) { alert('Kein Fahrzeug ausgewählt'); return; }
    await api.post('/charging-locations', { ...newForm, vehicle_id: vid });
    creating.value = false;
    await load();
  } catch (e) { alert(e.response?.data?.error || e.message); }
}

async function del(l) {
  if (!confirm(`„${l.name}" wirklich löschen?`)) return;
  try {
    await api.delete(`/charging-locations/${l.id}`);
    await load();
  } catch (e) { alert(e.response?.data?.error || e.message); }
}

async function applyLimit(l) {
  try {
    await api.post(`/charging-locations/${l.id}/apply-charge-limit`);
    alert(`Ladelimit ${l.default_charge_limit}% wurde gesetzt.`);
  } catch (e) {
    alert(e.response?.data?.error || 'Tesla-API nicht erreichbar — bitte manuell setzen.');
  }
}

onMounted(load);
</script>

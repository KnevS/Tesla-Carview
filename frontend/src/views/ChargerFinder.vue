<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('chargers.title') }}</h1>
      <p class="text-gray-400 text-sm mt-0.5">{{ $t('chargers.subtitle') }}</p>
    </div>

    <!-- Search bar -->
    <div class="flex flex-wrap gap-2 items-end">
      <div class="flex-1 min-w-48">
        <input v-model="searchQuery" @keydown.enter="searchAddress"
          :placeholder="$t('chargers.searchPlaceholder')"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-tesla-red focus:outline-none" />
      </div>
      <button @click="searchAddress"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">
        {{ $t('chargers.searchBtn') }}
      </button>
      <button @click="useMyLocation"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">
        📍 {{ $t('chargers.myLocation') }}
      </button>

      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-400" v-tooltip="$t('chargers.tooltipRadius')">{{ $t('chargers.radius') }}</label>
        <select v-model="radius" @change="search" class="bg-gray-800 text-white rounded-lg px-2 py-2 text-sm border border-gray-700">
          <option value="5000">{{ $t('chargers.km5') }}</option>
          <option value="10000">{{ $t('chargers.km10') }}</option>
          <option value="25000">{{ $t('chargers.km25') }}</option>
          <option value="50000">{{ $t('chargers.km50') }}</option>
        </select>
      </div>

      <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer" v-tooltip="$t('chargers.tooltipDcOnly')">
        <input type="checkbox" v-model="dcOnly" @change="search" class="accent-tesla-red" />
        {{ $t('chargers.dcOnly') }}
      </label>
    </div>

    <!-- Fehler: Adresse nicht gefunden -->
    <div v-if="errorCode === 'ADDRESS_NOT_FOUND'"
      class="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-700/40 rounded-xl text-sm text-yellow-300">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ $t('chargers.addressNotFound') }}
    </div>

    <!-- Fehler: kein OCM API-Key -->
    <div v-else-if="errorCode === 'NO_API_KEY'"
      class="flex flex-col gap-2 p-4 bg-red-900/25 border border-red-700/40 rounded-xl text-sm">
      <div class="flex items-center gap-2 text-red-300 font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ $t('chargers.apiKeyMissing') }}
      </div>
      <p class="text-gray-400">{{ $t('chargers.apiKeyHint') }}</p>
      <RouterLink to="/system" class="self-start px-3 py-1.5 bg-tesla-red/80 hover:bg-tesla-red text-white rounded-lg text-xs transition">
        {{ $t('chargers.configureNow') }}
      </RouterLink>
    </div>

    <!-- Fehler: allgemeiner Fehler -->
    <div v-else-if="errorCode === 'ERROR'"
      class="flex items-center gap-2 p-3 bg-red-900/25 border border-red-700/40 rounded-xl text-sm text-red-300">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ $t('chargers.errorLoading') }}
    </div>

    <!-- Result count -->
    <p v-if="stations.length" class="text-sm text-gray-400">
      {{ $t('chargers.stationCount', { n: stations.length }) }}
    </p>

    <!-- Loading -->
    <div v-if="loading" class="text-gray-400 text-sm">{{ $t('chargers.loading') }}</div>

    <!-- No results -->
    <div v-else-if="searched && !stations.length && !loading && !errorCode" class="text-gray-400 text-sm">
      {{ $t('chargers.noResults') }}
    </div>

    <!-- Station list -->
    <div v-if="stations.length" class="space-y-3">
      <div v-for="s in stations" :key="s.id"
        class="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-semibold truncate">{{ s.name ?? '—' }}</p>
              <span v-if="s.is_tesla"
                class="shrink-0 px-1.5 py-0.5 bg-tesla-red/20 text-tesla-red rounded text-xs font-medium">Tesla</span>
            </div>
            <p class="text-sm text-gray-400 truncate mt-0.5">{{ s.address ?? '' }}</p>
            <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
              <span v-if="s.operator" class="flex items-center gap-1">🏢 {{ s.operator }}</span>
              <span v-if="s.max_kw" class="flex items-center gap-1 text-green-400 font-medium">⚡ {{ s.max_kw }} kW</span>
              <span v-if="s.num_points" class="flex items-center gap-1">🔌 {{ s.num_points }} {{ $t('chargers.connections') }}</span>
            </div>
            <div v-if="s.connector_types?.length" class="flex flex-wrap gap-1 mt-2">
              <span v-for="conn in s.connector_types" :key="conn"
                class="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300">{{ conn }}</span>
            </div>
          </div>
          <a v-if="s.lat && s.lon"
            :href="`https://maps.google.com/?q=${s.lat},${s.lon}`"
            target="_blank" rel="noopener"
            class="shrink-0 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition">
            {{ $t('chargers.openInMaps') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../api.js';

const searchQuery = ref('');
const radius      = ref('10000');
const dcOnly      = ref(false);
const stations    = ref([]);
const loading     = ref(false);
const searched    = ref(false);
const errorCode   = ref(null); // null | 'ADDRESS_NOT_FOUND' | 'NO_API_KEY' | 'ERROR'
const currentLat  = ref(null);
const currentLon  = ref(null);

async function searchAddress() {
  if (!searchQuery.value.trim()) return;
  errorCode.value = null;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=1`,
      { headers: { 'Accept-Language': navigator.language } }
    );
    const data = await r.json();
    if (data[0]) {
      currentLat.value = parseFloat(data[0].lat);
      currentLon.value = parseFloat(data[0].lon);
      search();
    } else {
      errorCode.value = 'ADDRESS_NOT_FOUND';
    }
  } catch {
    errorCode.value = 'ERROR';
  }
}

async function useMyLocation() {
  if (!navigator.geolocation) return;
  errorCode.value = null;
  navigator.geolocation.getCurrentPosition(
    pos => {
      currentLat.value = pos.coords.latitude;
      currentLon.value = pos.coords.longitude;
      search();
    },
    () => { errorCode.value = 'ERROR'; }
  );
}

async function search() {
  if (currentLat.value == null || currentLon.value == null) return;
  loading.value   = true;
  searched.value  = true;
  errorCode.value = null;
  try {
    const params = new URLSearchParams({
      lat:       currentLat.value,
      lon:       currentLon.value,
      radius_km: Math.round(parseInt(radius.value) / 1000),
      dcOnly:    dcOnly.value ? 'true' : 'false',
    });
    const { data } = await api.get(`/routing/chargers?${params}`);
    stations.value = data ?? [];
  } catch (err) {
    stations.value = [];
    const code = err?.response?.data?.code;
    if (err?.response?.status === 403 || code === 'NO_API_KEY') {
      errorCode.value = 'NO_API_KEY';
    } else {
      errorCode.value = 'ERROR';
    }
  } finally {
    loading.value = false;
  }
}
</script>

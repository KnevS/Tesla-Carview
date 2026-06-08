<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('nearby.title') }}</h1>
      <p class="text-gray-400 text-sm mt-1">{{ $t('nearby.subtitle') }}</p>
    </div>

    <!-- Quelle der Position -->
    <div class="bg-gray-800 rounded-lg p-3 flex flex-wrap gap-2 items-center">
      <span class="text-sm font-medium">{{ $t('nearby.source') }}:</span>
      <button v-for="s in sources" :key="s.id"
        @click="picked = s"
        class="text-xs px-3 py-1.5 rounded transition"
        :class="picked?.id === s.id ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'">
        {{ s.icon }} {{ s.label }}
      </button>
    </div>

    <div v-if="picked" class="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3 text-sm text-blue-100">
      📍 {{ picked.label }} — {{ picked.lat.toFixed(4) }}, {{ picked.lon.toFixed(4) }}
    </div>

    <NearbyPOIs v-if="picked" :lat="picked.lat" :lon="picked.lon" />
    <p v-else class="text-gray-400 text-sm">{{ $t('nearby.noSource') }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import NearbyPOIs from '../components/NearbyPOIs.vue';
import api from '../api.js';

const { t } = useI18n();
const appStore = useAppStore();
const lastTrip = ref(null);
const activeCharge = ref(null);
const picked = ref(null);

const sources = computed(() => {
  const list = [];
  const v = appStore.selectedVehicle;
  if (v?.latitude != null && v?.longitude != null) {
    list.push({ id: 'vehicle', icon: '🚗', label: t('nearby.sources.vehicle'), lat: v.latitude, lon: v.longitude });
  }
  if (activeCharge.value?.lat != null) {
    list.push({
      id: 'charging', icon: '⚡',
      label: t('nearby.sources.charging') + (activeCharge.value.location_name ? ` (${activeCharge.value.location_name})` : ''),
      lat: activeCharge.value.lat, lon: activeCharge.value.lon,
    });
  }
  if (lastTrip.value?.end_lat != null) {
    list.push({
      id: 'lastTrip', icon: '📍',
      label: t('nearby.sources.lastTrip'),
      lat: lastTrip.value.end_lat, lon: lastTrip.value.end_lon,
    });
  }
  return list;
});

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const [trips, charges] = await Promise.all([
      api.get('/trips', { params: { vehicle_id: vid, limit: 1 } }).catch(() => ({ data: [] })),
      api.get('/charging', { params: { vehicle_id: vid, limit: 5 } }).catch(() => ({ data: [] })),
    ]);
    lastTrip.value = (trips.data || [])[0] || null;
    activeCharge.value = (charges.data || []).find(s => !s.end_time) || null;
  } catch { /* silent */ }
}

watch(sources, (list) => {
  if (!picked.value && list.length) picked.value = list[0];
}, { immediate: true });

onMounted(load);
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-sm text-gray-300">{{ $t('poi.heading', { radius: radius / 1000 }) }}</p>
      <div class="flex gap-2 text-xs">
        <button v-for="r in radiusOptions" :key="r" @click="radius = r; load()"
          class="px-2 py-1 rounded transition"
          :class="r === radius ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'">
          {{ r / 1000 }} km
        </button>
      </div>
    </div>

    <!-- Type-Filter -->
    <div class="flex flex-wrap gap-1">
      <button v-for="t in availableTypes" :key="t"
        @click="toggleType(t)"
        class="text-xs px-2 py-1 rounded transition"
        :class="activeTypes.has(t) ? 'bg-tesla-red/30 text-white' : 'bg-gray-700 text-gray-400'">
        {{ typeIcon(t) }} {{ $t('poi.type.' + t) }}
      </button>
    </div>

    <!-- POI-Liste -->
    <div v-if="loading" class="text-sm text-gray-400">{{ $t('poi.loading') }}</div>
    <div v-else-if="filteredPOIs.length" class="space-y-1 max-h-96 overflow-y-auto">
      <a v-for="p in filteredPOIs" :key="p.id"
        :href="mapsLink(p)" target="_blank" rel="noopener noreferrer"
        class="flex items-start gap-3 bg-gray-800 hover:bg-gray-700 rounded-lg p-2.5 transition">
        <span class="text-xl">{{ typeIcon(p.type) }}</span>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">{{ p.name || $t('poi.unnamed') }}</p>
          <p class="text-xs text-gray-400">
            {{ p.distance_m }} m
            <span v-if="p.address"> · {{ p.address }}</span>
            <span v-if="p.opening_hours"> · 🕐 {{ p.opening_hours }}</span>
            <span v-if="p.wheelchair === 'yes'"> · ♿</span>
          </p>
        </div>
        <span class="text-gray-500 text-xs">↗</span>
      </a>
    </div>
    <p v-else-if="loaded" class="text-sm text-gray-500">{{ $t('poi.empty') }}</p>

    <p class="text-[10px] text-gray-500">{{ $t('poi.attribution') }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../api.js';

const props = defineProps({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
});

const radius = ref(1500);
const radiusOptions = [500, 1500, 3000];
const pois = ref([]);
const loading = ref(false);
const loaded = ref(false);
const availableTypes = ref([
  'cafe', 'restaurant', 'fast_food', 'bakery', 'supermarket',
  'toilets', 'drinking_water',
  'playground', 'park', 'picnic', 'viewpoint',
  'atm', 'pharmacy',
  'geocache',
]);
const activeTypes = ref(new Set(availableTypes.value));

const TYPE_ICONS = {
  cafe: '☕', restaurant: '🍽', fast_food: '🍔', bakery: '🥐', supermarket: '🛒',
  toilets: '🚻', drinking_water: '🚰',
  playground: '🛝', park: '🌳', picnic: '🧺', viewpoint: '🔭',
  atm: '🏧', pharmacy: '💊',
  geocache: '🎯',
  other: '📍',
};
const typeIcon = (t) => TYPE_ICONS[t] || '📍';

const filteredPOIs = computed(() => pois.value.filter(p => activeTypes.value.has(p.type)));

function toggleType(t) {
  const s = new Set(activeTypes.value);
  if (s.has(t)) s.delete(t); else s.add(t);
  activeTypes.value = s;
}

function mapsLink(p) {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`;
}

async function load() {
  if (!Number.isFinite(props.lat) || !Number.isFinite(props.lon)) return;
  loading.value = true;
  try {
    const { data } = await api.get('/poi/nearby', {
      params: { lat: props.lat, lon: props.lon, radius: radius.value },
    });
    pois.value = data.pois || [];
  } catch {
    pois.value = [];
  } finally {
    loading.value = false;
    loaded.value = true;
  }
}

watch(() => [props.lat, props.lon], load, { immediate: false });
onMounted(load);
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <p class="text-xs text-gray-400">
        {{ $t('locationHeatmap.intro') }}
      </p>
      <select v-model="rangeDays" @change="load"
              class="bg-gray-700 text-white text-xs rounded-lg px-2 py-1 border border-gray-600">
        <option :value="30">30 {{ $t('locationHeatmap.days') }}</option>
        <option :value="90">90 {{ $t('locationHeatmap.days') }}</option>
        <option :value="365">12 {{ $t('locationHeatmap.months') }}</option>
        <option :value="3650">{{ $t('locationHeatmap.all') }}</option>
      </select>
    </div>
    <div ref="mapEl" class="rounded-lg" style="height: 360px"></div>
    <p class="text-xs text-gray-500 text-right">
      {{ $t('locationHeatmap.summary', { points: points.length }) }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
// Leaflet lazy — wird erst beim Mounten geladen, nicht beim App-Start.
// Verhindert, dass der 150 KB Leaflet-Bundle den Initial-Load verlangsamt.
let L = null;

const appStore  = useAppStore();
const mapEl     = ref(null);
const points    = ref([]);
const rangeDays = ref(365);
let map = null;
let layer = null;

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) { points.value = []; return; }
  try {
    const since = Math.floor(Date.now() / 1000) - rangeDays.value * 86400;
    const { data } = await api.get('/trips/location-heatmap', {
      params: { vehicle_id: vid, since },
    });
    points.value = data.points || [];
    render();
  } catch { points.value = []; }
}

/** Eigenes leichtgewichtiges Heatmap-Rendering: keine externen Plugins
 *  (Leaflet.heat ist MIT-lizenziert, aber wir vermeiden zusaetzliche
 *  Deps). Stattdessen pro Punkt einen kleinen Circle mit gewichts-
 *  abhaengiger Opazitaet rendern. Performance: ~5000 Punkte sind ok. */
function render() {
  if (!map) return;
  if (layer) { map.removeLayer(layer); layer = null; }
  if (!points.value.length) return;

  const maxW = Math.max(1, ...points.value.map(p => p.weight));
  const features = points.value.map(p => {
    const intensity = Math.min(1, p.weight / maxW);
    return L.circle([p.lat, p.lon], {
      radius:    Math.max(40, 60 + intensity * 80),
      color:     `rgba(239, 68, 68, ${0.15 + intensity * 0.45})`,
      fillColor: `rgba(239, 68, 68, ${0.10 + intensity * 0.55})`,
      weight:    0,
      fillOpacity: 0.5 + intensity * 0.4,
    });
  });
  layer = L.layerGroup(features).addTo(map);

  // Auto-fit auf die Punkt-Bounding-Box (max-zoom 13 damit Heim-Cluster
  // nicht zu nah herangezogen wird).
  const bounds = L.latLngBounds(points.value.map(p => [p.lat, p.lon]));
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
}

onMounted(async () => {
  // Leaflet + CSS erst beim ersten Mount laden (lazy)
  if (!L) {
    await import('leaflet/dist/leaflet.css');
    L = (await import('leaflet')).default;
  }
  map = L.map(mapEl.value).setView([51.16, 10.45], 5); // Default: D-Mitte
  L.tileLayer('/api/tiles/{z}/{x}/{y}', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);
  load();
});

onBeforeUnmount(() => { if (map) { map.remove(); map = null; } });

watch(() => appStore.selectedVehicleId, load);
</script>

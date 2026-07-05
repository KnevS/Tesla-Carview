<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          {{ $t('heatmap.title') }}
          <InfoTip :text="$t('heatmap.intro')" />
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('heatmap.subtitle') }}</p>
      </div>
      <select v-model.number="rangeDays" @change="loadAll"
              class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
        <option :value="30">30 {{ $t('heatmap.days') }}</option>
        <option :value="90">90 {{ $t('heatmap.days') }}</option>
        <option :value="365">12 {{ $t('heatmap.months') }}</option>
        <option :value="3650">{{ $t('heatmap.all') }}</option>
      </select>
    </div>

    <!-- Layer-Umschalter -->
    <div class="flex items-center gap-4 flex-wrap text-sm">
      <label class="inline-flex items-center gap-2 cursor-pointer" v-tooltip="$t('heatmap.layerTripsTip')">
        <input type="checkbox" v-model="show.trips" @change="render" class="accent-red-500">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#ef4444"></span>
        {{ $t('heatmap.layerTrips') }} <span class="text-gray-500">({{ trips.length }})</span>
      </label>
      <label class="inline-flex items-center gap-2 cursor-pointer" v-tooltip="$t('heatmap.layerChargingTip')">
        <input type="checkbox" v-model="show.charging" @change="render" class="accent-green-500">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#22c55e"></span>
        {{ $t('heatmap.layerCharging') }} <span class="text-gray-500">({{ charging.length }})</span>
      </label>
      <label class="inline-flex items-center gap-2 cursor-pointer" v-tooltip="$t('heatmap.layerLocationsTip')">
        <input type="checkbox" v-model="show.locations" @change="render" class="accent-blue-500">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#3b82f6"></span>
        {{ $t('heatmap.layerLocations') }} <span class="text-gray-500">({{ locations.length }})</span>
      </label>
    </div>

    <div ref="mapEl" class="rounded-xl border border-gray-700" style="height: 60vh; min-height: 380px"></div>

    <div v-if="!loading && !trips.length && !charging.length && !locations.length"
      class="text-center text-gray-400 text-sm">
      {{ $t('heatmap.empty') }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import InfoTip from '../components/InfoTip.vue';
import api from '../api.js';

// Leaflet lazy — wie in LocationHeatmap.vue, kein Initial-Load-Ballast.
let L = null;
const { t } = useI18n();
const appStore = useAppStore();

const mapEl     = ref(null);
const rangeDays = ref(365);
const loading   = ref(true);
const trips     = ref([]);   // [{lat, lon, weight}]
const charging  = ref([]);   // [{lat, lon, weight, total_kwh, location_name}]
const locations = ref([]);   // [{name, lat, lon, radius_m}]
const show = reactive({ trips: true, charging: true, locations: true });

let map = null;
const layers = { trips: null, charging: null, locations: null };

async function loadAll() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const since = Math.floor(Date.now() / 1000) - rangeDays.value * 86400;
  const vp = vid ? { vehicle_id: vid } : {};
  const [tRes, cRes, lRes] = await Promise.all([
    api.get('/trips/location-heatmap',    { params: { ...vp, since } }).catch(() => ({ data: {} })),
    api.get('/charging/location-heatmap', { params: { ...vp, since } }).catch(() => ({ data: {} })),
    api.get('/charging-locations',        { params: vp }).catch(() => ({ data: [] })),
  ]);
  trips.value    = tRes.data?.points || [];
  charging.value = cRes.data?.points || [];
  locations.value = (Array.isArray(lRes.data) ? lRes.data : [])
    .filter(l => l.lat != null && l.lon != null);
  loading.value = false;
  render();
}

/** Leichtgewichtiges Heat-Rendering ohne Extra-Dep (wie LocationHeatmap.vue):
 *  pro Punkt ein Circle mit gewichtsabhängiger Opazität. */
function heatLayer(points, rgb) {
  const maxW = Math.max(1, ...points.map(p => p.weight || 1));
  return L.layerGroup(points.map(p => {
    const intensity = Math.min(1, (p.weight || 1) / maxW);
    return L.circle([p.lat, p.lon], {
      radius:      Math.max(40, 60 + intensity * 80),
      color:       `rgba(${rgb}, ${0.15 + intensity * 0.45})`,
      fillColor:   `rgba(${rgb}, ${0.10 + intensity * 0.55})`,
      weight:      0,
      fillOpacity: 0.5 + intensity * 0.4,
    });
  }));
}

function render() {
  if (!map || !L) return;
  // Alte Layer abräumen
  for (const k of Object.keys(layers)) {
    if (layers[k]) { map.removeLayer(layers[k]); layers[k] = null; }
  }

  if (show.trips && trips.value.length) {
    layers.trips = heatLayer(trips.value, '239, 68, 68').addTo(map);
  }
  if (show.charging && charging.value.length) {
    layers.charging = heatLayer(charging.value, '34, 197, 94').addTo(map);
  }
  if (show.locations && locations.value.length) {
    layers.locations = L.layerGroup(locations.value.map(loc =>
      L.circleMarker([loc.lat, loc.lon], {
        radius: 7, color: '#3b82f6', fillColor: '#3b82f6', weight: 2, fillOpacity: 0.8,
      }).bindPopup(`<strong>${escapeHtml(loc.name || t('heatmap.layerLocations'))}</strong>`)
    )).addTo(map);
  }

  // Auto-fit auf alle sichtbaren Punkte
  const all = [];
  if (show.trips)     all.push(...trips.value.map(p => [p.lat, p.lon]));
  if (show.charging)  all.push(...charging.value.map(p => [p.lat, p.lon]));
  if (show.locations) all.push(...locations.value.map(p => [p.lat, p.lon]));
  if (all.length) {
    const bounds = L.latLngBounds(all);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

onMounted(async () => {
  if (!L) {
    await import('leaflet/dist/leaflet.css');
    L = (await import('leaflet')).default;
  }
  map = L.map(mapEl.value).setView([51.16, 10.45], 5); // Default: Mitte DE
  L.tileLayer('/api/tiles/{z}/{x}/{y}', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);
  loadAll();
});

onBeforeUnmount(() => { if (map) { map.remove(); map = null; } });

watch(() => appStore.selectedVehicleId, loadAll);
</script>

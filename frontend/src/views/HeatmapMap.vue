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
      <label class="inline-flex items-center gap-2 cursor-pointer" v-tooltip="$t('heatmap.layerRoutesTip')">
        <input type="checkbox" v-model="show.routes" @change="onRoutesToggle" class="accent-purple-400">
        <span class="inline-block w-3 h-3 rounded-full" style="background:#a78bfa"></span>
        {{ $t('heatmap.layerRoutes') }} <span class="text-gray-500">({{ routeLines.length }})</span>
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
const routeLines = ref([]);  // [{trip_id, pts: [[lat,lon],…]}] — lazy geladen
const show = reactive({ trips: true, charging: true, locations: true, routes: false });

let map = null;
let routesLoadedFor = null;  // Cache-Key (vehicle+since) der geladenen Fahrwege
const layers = { trips: null, charging: null, locations: null, routes: null };

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
  // Zeitraum/Fahrzeug geändert → Fahrwege-Cache invalide; bei aktivem
  // Layer direkt nachladen, sonst erst beim nächsten Einschalten.
  routesLoadedFor = null;
  routeLines.value = [];
  if (show.routes) await loadRoutes();
  render();
}

/** Fahrwege lazy laden — nur wenn der Layer wirklich aktiviert wird. */
async function loadRoutes() {
  const vid = appStore.selectedVehicle?.id;
  const since = Math.floor(Date.now() / 1000) - rangeDays.value * 86400;
  const key = `${vid ?? 'all'}:${since}`;
  if (routesLoadedFor === key) return;
  const { data } = await api
    .get('/trips/route-lines', { params: { ...(vid ? { vehicle_id: vid } : {}), since } })
    .catch(() => ({ data: {} }));
  routeLines.value = data?.lines || [];
  routesLoadedFor = key;
}

async function onRoutesToggle() {
  if (show.routes) await loadRoutes();
  render();
}

/** Leichtgewichtiges Heat-Rendering ohne Extra-Dep (wie LocationHeatmap.vue):
 *  pro Punkt ein CircleMarker mit gewichtsabhängiger Größe und Opazität.
 *  Pixel-Radius (zoomunabhängig) statt L.circle mit Meter-Radius — ein
 *  60–140-m-Kreis ist bei rausgefitteter Karte (Zoom ≤ 11) subpixel-klein
 *  und damit unsichtbar. */
function heatLayer(points, rgb) {
  const maxW = Math.max(1, ...points.map(p => p.weight || 1));
  return L.layerGroup(points.map(p => {
    const intensity = Math.min(1, (p.weight || 1) / maxW);
    return L.circleMarker([p.lat, p.lon], {
      radius:      5 + intensity * 9,
      stroke:      false,
      fillColor:   `rgb(${rgb})`,
      fillOpacity: 0.35 + intensity * 0.5,
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
  if (show.routes && routeLines.value.length) {
    // Fahrwege UNTER die Dichte-Punkte legen (zuerst zeichnen reicht nicht,
    // deshalb dünne, halbtransparente Linien).
    layers.routes = L.layerGroup(routeLines.value.map(l =>
      L.polyline(l.pts, { color: '#a78bfa', weight: 2, opacity: 0.55 })
    )).addTo(map);
    layers.routes.eachLayer(pl => pl.bringToBack());
  }

  // Auto-fit auf alle sichtbaren Punkte
  const all = [];
  if (show.trips)     all.push(...trips.value.map(p => [p.lat, p.lon]));
  if (show.charging)  all.push(...charging.value.map(p => [p.lat, p.lon]));
  if (show.locations) all.push(...locations.value.map(p => [p.lat, p.lon]));
  if (show.routes)    all.push(...routeLines.value.flatMap(l => [l.pts[0], l.pts[l.pts.length - 1]]));
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

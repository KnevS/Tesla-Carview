<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <AppIcon name="map" :size="24" class="text-tesla-red" />
        {{ $t('routes.title') }}
      </h1>
    </div>

    <div v-if="!vehicle" class="card text-gray-400 text-sm text-center py-8">
      {{ $t('common.noVehicle') }}
    </div>

    <div v-else class="grid lg:grid-cols-[380px_1fr] gap-4 items-start">

      <!-- ─── Left panel ─── -->
      <div class="space-y-4">

        <!-- Destination search -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <AppIcon name="location" :size="16" class="text-tesla-red" />
            {{ $t('routes.destination') }}
          </h2>

          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('routes.searchPlaceholder')"
              class="input w-full pr-8"
              @input="onSearchInput"
              @keyup.escape="searchResults = []"
            />
            <button v-if="searchQuery" @click="clearSearch"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>

          <!-- Autocomplete -->
          <ul v-if="searchResults.length" class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700">
            <li v-for="r in searchResults" :key="r.place_id"
              @click="pickResult(r)"
              class="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-700 transition">
              <p class="text-white truncate">{{ r.display_name.split(',')[0] }}</p>
              <p class="text-gray-400 text-xs truncate">{{ r.display_name.split(',').slice(1).join(',').trim() }}</p>
            </li>
          </ul>
          <p v-if="searching" class="text-xs text-gray-500">{{ $t('common.loading') }}</p>

          <!-- Chosen destination -->
          <div v-if="destination" class="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span class="text-tesla-red text-lg">📍</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white font-medium truncate">{{ destination.name }}</p>
              <p class="text-xs text-gray-400">{{ destination.lat.toFixed(5) }}, {{ destination.lon.toFixed(5) }}</p>
            </div>
            <button @click="clearDestination" class="text-gray-500 hover:text-white">×</button>
          </div>
          <p v-else class="text-xs text-gray-500">{{ $t('routes.clickMapHint') }}</p>
        </div>

        <!-- Waypoints -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <AppIcon name="location" :size="16" class="text-gray-400" />
            {{ $t('routes.waypoints') }}
            <span class="ml-auto text-xs text-gray-500">{{ waypoints.length }}/5</span>
          </h2>

          <ul v-if="waypoints.length" class="space-y-2">
            <li v-for="(wp, i) in waypoints" :key="i"
              class="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
              <span class="text-gray-400 text-xs font-mono w-4">{{ i+1 }}</span>
              <p class="flex-1 text-sm truncate text-white">{{ wp.name }}</p>
              <button @click="waypoints.splice(i,1)" class="text-gray-500 hover:text-red-400 text-lg leading-none">×</button>
            </li>
          </ul>
          <p v-else class="text-xs text-gray-500">{{ $t('routes.noWaypoints') }}</p>

          <div class="relative">
            <input v-model="wpQuery" type="text" :placeholder="$t('routes.addWaypoint')"
              class="input w-full text-sm"
              :disabled="waypoints.length >= 5"
              @input="onWpInput"
              @keyup.escape="wpResults = []" />
          </div>
          <ul v-if="wpResults.length" class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700">
            <li v-for="r in wpResults" :key="r.place_id"
              @click="addWaypoint(r)"
              class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 transition truncate text-white">
              {{ r.display_name.split(',').slice(0,2).join(', ') }}
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="card space-y-3">
          <button @click="sendToTesla" :disabled="!destination || busy"
            class="w-full py-2.5 rounded-xl bg-tesla-red hover:bg-red-700 text-white font-medium text-sm transition disabled:opacity-40 flex items-center justify-center gap-2"
            v-tooltip="$t('routes.sendTooltip')">
            <AppIcon name="steering" :size="16" />
            {{ $t('routes.sendToTesla') }}
          </button>

          <button @click="openAbrp"
            class="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium text-sm transition flex items-center justify-center gap-2"
            v-tooltip="$t('routes.abrpTooltip')">
            <AppIcon name="map" :size="16" />
            {{ $t('routes.openAbrp') }}
          </button>

          <button @click="showSaveDialog = true" :disabled="!destination"
            class="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium text-sm transition disabled:opacity-40 flex items-center justify-center gap-2">
            <AppIcon name="export" :size="16" />
            {{ $t('routes.saveRoute') }}
          </button>
        </div>

        <!-- Saved routes -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <AppIcon name="logbook" :size="16" class="text-tesla-red" />
            {{ $t('routes.saved') }}
            <span class="ml-auto text-xs text-gray-500">{{ savedRoutes.length }}</span>
          </h2>

          <p v-if="!savedRoutes.length" class="text-xs text-gray-500">{{ $t('routes.noSaved') }}</p>

          <ul class="space-y-2">
            <li v-for="route in savedRoutes" :key="route.id"
              class="bg-gray-800 rounded-xl px-3 py-2.5 space-y-1">
              <div class="flex items-center gap-2">
                <template v-if="editingId === route.id">
                  <input v-model="editName" class="input flex-1 text-sm py-1"
                    @keyup.enter="confirmRename(route)" @keyup.escape="editingId = null" />
                  <button @click="confirmRename(route)" class="text-green-400 text-sm hover:text-green-300">✓</button>
                  <button @click="editingId = null" class="text-gray-500 text-sm hover:text-white">✕</button>
                </template>
                <template v-else>
                  <p class="flex-1 font-medium text-sm text-white truncate">{{ route.name }}</p>
                  <button @click="startEdit(route)" class="text-gray-500 hover:text-white text-xs"
                    v-tooltip="$t('common.edit')">✏️</button>
                  <button @click="deleteRoute(route.id)" class="text-gray-500 hover:text-red-400 text-xs"
                    v-tooltip="$t('common.delete')">🗑</button>
                </template>
              </div>
              <p class="text-xs text-gray-400 truncate">📍 {{ route.destination_name }}</p>
              <p v-if="route.waypoints?.length" class="text-xs text-gray-500">
                + {{ route.waypoints.length }} {{ $t('routes.stops') }}
              </p>
              <div class="flex gap-2 pt-1">
                <button @click="loadRoute(route)"
                  class="flex-1 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition">
                  {{ $t('routes.load') }}
                </button>
                <button @click="loadAndSend(route)" :disabled="busy"
                  class="flex-1 py-1 text-xs rounded-lg bg-tesla-red/80 hover:bg-tesla-red text-white transition disabled:opacity-40">
                  {{ $t('routes.loadAndSend') }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- ─── Map ─── -->
      <div class="card p-0 overflow-hidden rounded-2xl" style="height: 70vh; min-height: 400px;">
        <div id="route-map" class="w-full h-full"></div>
      </div>
    </div>

    <!-- Save dialog -->
    <Teleport to="body">
      <div v-if="showSaveDialog"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
        @click.self="showSaveDialog = false">
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
          <h3 class="font-semibold text-lg">{{ $t('routes.saveRoute') }}</h3>
          <div>
            <label class="label">{{ $t('routes.routeName') }}</label>
            <input v-model="saveName" class="input w-full" :placeholder="destination?.name"
              @keyup.enter="confirmSave" ref="saveInput" />
          </div>
          <div class="flex gap-3">
            <button @click="showSaveDialog = false" class="flex-1 btn-secondary">{{ $t('common.cancel') }}</button>
            <button @click="confirmSave" :disabled="saving" class="flex-1 btn-primary">
              {{ saving ? '…' : $t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="toast" class="fixed top-20 right-4 z-[1000] px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
          :class="toast.ok ? 'bg-green-800 text-green-100' : 'bg-red-900 text-red-200'">
          {{ toast.msg }}
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import AppIcon from '../components/AppIcon.vue';
import api from '../api.js';

const { t, locale } = useI18n();
const appStore = useAppStore();
const vehicle  = computed(() => appStore.selectedVehicle);

// Map
let leafletMap = null;
let destMarker = null;
let wpMarkers  = [];
let L = null;

// Search
const searchQuery  = ref('');
const searchResults = ref([]);
const searching    = ref(false);
let searchTimer    = null;

const wpQuery   = ref('');
const wpResults = ref([]);
let wpTimer     = null;

// Route
const destination = ref(null);
const waypoints   = ref([]);

// Saved routes
const savedRoutes  = ref([]);
const showSaveDialog = ref(false);
const saveName     = ref('');
const saving       = ref(false);
const saveInput    = ref(null);
const editingId    = ref(null);
const editName     = ref('');

// UI
const busy  = ref(false);
const toast = ref(null);

function showToast(msg, ok = true) {
  toast.value = { msg, ok };
  setTimeout(() => { toast.value = null; }, 3500);
}

// ── Geocoding (Nominatim) ──

async function nominatim(q) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=0`,
    { headers: { 'Accept-Language': locale.value } }
  );
  return r.json();
}

async function reverseGeocode(lat, lon) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'Accept-Language': locale.value } }
  );
  const d = await r.json();
  return d.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function onSearchInput() {
  clearTimeout(searchTimer);
  if (searchQuery.value.length < 3) { searchResults.value = []; return; }
  searching.value = true;
  searchTimer = setTimeout(async () => {
    try { searchResults.value = await nominatim(searchQuery.value); }
    finally { searching.value = false; }
  }, 400);
}

function onWpInput() {
  clearTimeout(wpTimer);
  if (wpQuery.value.length < 3) { wpResults.value = []; return; }
  wpTimer = setTimeout(async () => {
    wpResults.value = await nominatim(wpQuery.value);
  }, 400);
}

function pickResult(r) {
  setDestination(r.display_name.split(',')[0], parseFloat(r.lat), parseFloat(r.lon));
  searchResults.value = [];
  searchQuery.value   = '';
}

function addWaypoint(r) {
  if (waypoints.value.length >= 5) return;
  waypoints.value.push({ name: r.display_name.split(',').slice(0,2).join(', '), lat: parseFloat(r.lat), lon: parseFloat(r.lon) });
  wpResults.value = [];
  wpQuery.value   = '';
  updateWpMarkers();
}

function clearSearch() { searchQuery.value = ''; searchResults.value = []; }

function clearDestination() {
  destination.value = null;
  if (destMarker) { destMarker.remove(); destMarker = null; }
}

// ── Map ──

function setDestination(name, lat, lon) {
  destination.value = { name, lat, lon };
  if (!L || !leafletMap) return;
  if (destMarker) destMarker.remove();
  destMarker = L.marker([lat, lon], { icon: redIcon() }).addTo(leafletMap).bindPopup(name).openPopup();
  leafletMap.setView([lat, lon], Math.max(leafletMap.getZoom(), 12));
}

function redIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:#e2231a;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
    iconSize: [24, 24], iconAnchor: [12, 24],
  });
}

function grayIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#6b7280;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });
}

function updateWpMarkers() {
  wpMarkers.forEach(m => m.remove());
  wpMarkers = [];
  if (!L || !leafletMap) return;
  waypoints.value.forEach((wp, i) => {
    wpMarkers.push(
      L.marker([wp.lat, wp.lon], { icon: grayIcon() })
        .addTo(leafletMap)
        .bindPopup(`${i+1}. ${wp.name}`)
    );
  });
}

async function initMap() {
  L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');

  leafletMap = L.map('route-map').setView(
    vehicle.value?.last_lat && vehicle.value?.last_lon
      ? [vehicle.value.last_lat, vehicle.value.last_lon]
      : [51.1657, 10.4515],
    vehicle.value?.last_lat ? 12 : 6
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(leafletMap);

  leafletMap.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    try {
      const name = await reverseGeocode(lat, lng);
      setDestination(name.split(',')[0], lat, lng);
    } catch {
      setDestination(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng);
    }
  });
}

// ── Saved routes ──

async function loadSavedRoutes() {
  if (!vehicle.value) return;
  try {
    const { data } = await api.get('/saved-routes', { params: { vehicleId: vehicle.value.id } });
    savedRoutes.value = data;
  } catch { /* silent */ }
}

function loadRoute(route) {
  destination.value = { name: route.destination_name, lat: route.destination_lat, lon: route.destination_lon };
  waypoints.value   = route.waypoints ?? [];
  if (L && leafletMap) {
    if (destMarker) destMarker.remove();
    destMarker = L.marker([route.destination_lat, route.destination_lon], { icon: redIcon() })
      .addTo(leafletMap).bindPopup(route.destination_name).openPopup();
    leafletMap.setView([route.destination_lat, route.destination_lon], 12);
    updateWpMarkers();
  }
}

async function loadAndSend(route) {
  loadRoute(route);
  await nextTick();
  await sendToTesla();
}

async function confirmSave() {
  if (!destination.value) return;
  saving.value = true;
  try {
    await api.post('/saved-routes', {
      vehicle_id:       vehicle.value.id,
      name:             (saveName.value.trim() || destination.value.name).substring(0, 80),
      destination_name: destination.value.name,
      destination_lat:  destination.value.lat,
      destination_lon:  destination.value.lon,
      waypoints:        waypoints.value,
    });
    showSaveDialog.value = false;
    saveName.value       = '';
    await loadSavedRoutes();
    showToast(t('routes.saved'));
  } catch { showToast(t('routes.saveError'), false); }
  finally { saving.value = false; }
}

function startEdit(route) { editingId.value = route.id; editName.value = route.name; }

async function confirmRename(route) {
  if (!editName.value.trim()) return;
  try {
    await api.put(`/saved-routes/${route.id}`, { name: editName.value.trim() });
    await loadSavedRoutes();
    editingId.value = null;
  } catch { showToast(t('routes.saveError'), false); }
}

async function deleteRoute(id) {
  try {
    await api.delete(`/saved-routes/${id}`);
    await loadSavedRoutes();
  } catch { showToast(t('routes.saveError'), false); }
}

// ── Tesla navigation ──

const LOCALE_TAG = { de:'de-DE', en:'en-US', fr:'fr-FR', es:'es-ES', tr:'tr-TR', el:'el-GR' };

async function sendToTesla() {
  if (!destination.value) return;
  busy.value = true;
  try {
    const navLocale = LOCALE_TAG[locale.value] || 'de-DE';
    await api.post(`/commands/${vehicle.value.id}/navigation_request`, {
      type: 'share_ext_content_raw',
      locale: navLocale,
      timestamp_ms: Date.now(),
      value: { 'android.intent.extra.TEXT': destination.value.name },
    });
    showToast(t('routes.sentToTesla'));
  } catch (e) {
    const code = e.response?.data?.code;
    showToast(code === 'ASLEEP' ? t('routes.asleep') : t('routes.sendError'), false);
  } finally { busy.value = false; }
}

// ── ABRP ──

function openAbrp() {
  const abrpToken = vehicle.value?.abrp_token;
  let url = 'https://abetterrouteplanner.com/';
  const params = new URLSearchParams();
  if (abrpToken) params.set('token', abrpToken);
  if (destination.value) {
    params.set('destination_lat', destination.value.lat.toFixed(6));
    params.set('destination_lng', destination.value.lon.toFixed(6));
    params.set('destination_name', destination.value.name);
  }
  const qs = params.toString();
  if (qs) url += '?' + qs;
  window.open(url, '_blank', 'noopener');
}

// ── Lifecycle ──

watch(showSaveDialog, async (v) => {
  if (v) { await nextTick(); saveInput.value?.focus(); }
});

watch(() => vehicle.value?.id, async () => { await loadSavedRoutes(); });

onMounted(async () => {
  await loadSavedRoutes();
  await nextTick();
  await initMap();
});

onBeforeUnmount(() => {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

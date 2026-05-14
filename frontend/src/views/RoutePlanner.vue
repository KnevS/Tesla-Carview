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

      <!-- ─── Linke Spalte ─── -->
      <div class="space-y-4">

        <!-- Startort -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <AppIcon name="pin" :size="16" class="text-green-400" />
            {{ $t('routes.startTitle') }}
          </h2>

          <!-- Startort-Optionen -->
          <div class="flex gap-2 flex-wrap">
            <button @click="setStartVehicle"
              :class="startMode === 'vehicle' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              v-tooltip="$t('routes.startVehicleTip')">
              🚗 {{ $t('routes.startVehicle') }}
            </button>
            <button @click="setStartBrowser"
              :class="startMode === 'browser' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              v-tooltip="$t('routes.startBrowserTip')">
              📍 {{ $t('routes.startBrowser') }}
            </button>
            <button @click="startMode = 'manual'"
              :class="startMode === 'manual' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition">
              ✏️ {{ $t('routes.startManual') }}
            </button>
          </div>

          <!-- Manuelle Starteingabe -->
          <div v-if="startMode === 'manual'" class="relative">
            <input v-model="startQuery" type="text" :placeholder="$t('routes.startPlaceholder')"
              class="input w-full pr-8 text-sm"
              @input="onStartInput"
              @keyup.escape="startResults = []" />
            <button v-if="startQuery" @click="startQuery = ''; startResults = []"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none">×</button>
            <ul v-if="startResults.length" class="absolute z-10 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700 shadow-xl">
              <li v-for="r in startResults" :key="r.place_id"
                @click="pickStartResult(r)"
                class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 transition">
                <p class="text-white truncate">{{ r.display_name.split(',')[0] }}</p>
                <p class="text-gray-400 text-xs truncate">{{ r.display_name.split(',').slice(1,3).join(',').trim() }}</p>
              </li>
            </ul>
          </div>

          <!-- Aktueller Startort -->
          <div v-if="startLocation" class="bg-gray-800/60 rounded-xl px-3 py-2 flex items-center gap-2">
            <span class="text-green-400 text-base">🟢</span>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-300 truncate font-medium">{{ startLocation.name }}</p>
              <p class="text-xs text-gray-500">{{ startLocation.lat.toFixed(4) }}, {{ startLocation.lon.toFixed(4) }}</p>
            </div>
          </div>
          <p v-else class="text-xs text-gray-500 italic">{{ $t('routes.startNoLocation') }}</p>
        </div>

        <!-- Zielsuche -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <AppIcon name="pin" :size="16" class="text-tesla-red" />
            {{ $t('routes.destination') }}
          </h2>

          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('routes.searchPlaceholder')"
              class="input w-full pr-8"
              @input="onSearchInput"
              @keyup.enter="onSearchEnter"
              @keyup.escape="searchResults = []"
            />
            <button v-if="searchQuery" @click="clearSearch"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>

          <ul v-if="searchResults.length" class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700">
            <li v-for="r in searchResults" :key="r.place_id ?? r.lat"
              @click="pickResult(r)"
              class="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-700 transition">
              <p class="text-white truncate">{{ r.display_name.split(',')[0] }}</p>
              <p class="text-gray-400 text-xs truncate">{{ r.display_name.split(',').slice(1,3).join(',').trim() }}</p>
            </li>
          </ul>
          <p v-if="searching" class="text-xs text-gray-500 animate-pulse">{{ $t('routes.geocoding') }}</p>
          <p v-else-if="searchNoResults" class="text-xs text-yellow-500">{{ $t('routes.noResults') }}</p>

          <div v-if="destination" class="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span class="text-tesla-red text-lg">📍</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white font-medium truncate">{{ destination.name }}</p>
              <p class="text-xs text-gray-400">{{ destination.lat.toFixed(5) }}, {{ destination.lon.toFixed(5) }}</p>
            </div>
            <button @click="clearDestination" class="text-gray-500 hover:text-white text-xl leading-none">×</button>
          </div>
          <p v-else class="text-xs text-gray-500">{{ $t('routes.clickMapHint') }}</p>
        </div>

        <!-- Zwischenstopps -->
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
              <button @click="removeWaypoint(i)" class="text-gray-500 hover:text-red-400 text-lg leading-none">×</button>
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

        <!-- Routeninfo -->
        <div v-if="routeData || routeLoading" class="card space-y-3">
          <h2 class="font-semibold text-base flex items-center gap-2">
            <AppIcon name="speed" :size="16" class="text-blue-400" />
            {{ $t('routes.routeInfo') }}
          </h2>

          <div v-if="routeLoading" class="text-xs text-gray-400">{{ $t('routes.calculating') }}</div>

          <template v-else-if="routeData">
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-gray-800 rounded-xl px-3 py-2.5 text-center">
                <p class="text-xs text-gray-400">{{ $t('routes.distance') }}</p>
                <p class="text-white font-semibold text-sm">{{ formatDistance(routeData.distance_km) }}</p>
              </div>
              <div class="bg-gray-800 rounded-xl px-3 py-2.5 text-center">
                <p class="text-xs text-gray-400">{{ $t('routes.duration') }}</p>
                <p class="text-white font-semibold text-sm">{{ formatDuration(routeData.duration_min) }}</p>
              </div>
            </div>

            <!-- Reichweitencheck -->
            <div v-if="routeStats.soc != null" class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-400">{{ $t('routes.currentSoc') }}</span>
                <span class="text-white font-medium">{{ routeStats.soc }}%</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-400">{{ $t('routes.arrivalSoc') }}</span>
                <span :class="arrivalSocClass" class="font-semibold">{{ arrivalSoc != null ? arrivalSoc + '%' : '—' }}</span>
              </div>

              <!-- SoC-Balken -->
              <div class="h-2 rounded-full bg-gray-700 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                  :class="arrivalSocBarClass"
                  :style="{ width: Math.max(0, arrivalSoc ?? 0) + '%' }">
                </div>
              </div>

              <!-- Warnung wenn Reichweite knapp -->
              <div v-if="arrivalSoc != null && arrivalSoc < 10"
                class="rounded-xl bg-red-900/60 border border-red-700 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
                <span class="mt-0.5">⚠️</span>
                <span>{{ $t('routes.rangeInsufficient') }}</span>
              </div>
              <div v-else-if="arrivalSoc != null && arrivalSoc < 20"
                class="rounded-xl bg-yellow-900/50 border border-yellow-700 px-3 py-2 text-xs text-yellow-200 flex items-start gap-2">
                <span class="mt-0.5">⚡</span>
                <span>{{ $t('routes.rangeLow') }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-500">{{ $t('routes.noSocData') }}</p>
          </template>
        </div>

        <!-- Aktionen -->
        <div class="card space-y-3">
          <button @click="sendToTesla" :disabled="!destination || busy"
            class="w-full py-2.5 rounded-xl bg-tesla-red hover:bg-red-700 text-white font-medium text-sm transition disabled:opacity-40 flex items-center justify-center gap-2"
            v-tooltip="$t('routes.sendTooltip')">
            <AppIcon name="steering" :size="16" />
            {{ $t('routes.sendToTesla') }}
          </button>

          <button @click="toggleChargers" :disabled="!routeData"
            class="w-full py-2.5 rounded-xl text-white font-medium text-sm transition disabled:opacity-40 flex items-center justify-center gap-2"
            :class="showChargers ? 'bg-blue-700 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
            v-tooltip="$t('routes.chargerTooltip')">
            <span>⚡</span>
            {{ showChargers ? $t('routes.hideChargers') : $t('routes.showChargers') }}
          </button>

          <button @click="showSaveDialog = true" :disabled="!destination"
            class="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium text-sm transition disabled:opacity-40 flex items-center justify-center gap-2">
            <AppIcon name="export" :size="16" />
            {{ $t('routes.saveRoute') }}
          </button>

          <!-- ABRP als dezente Rückfalloption -->
          <button @click="openAbrp"
            class="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-1"
            v-tooltip="$t('routes.abrpTooltip')">
            <AppIcon name="map" :size="12" />
            {{ $t('routes.abrpFallback') }}
          </button>
        </div>

        <!-- Gespeicherte Routen -->
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

      <!-- ─── Karte ─── -->
      <div class="card p-0 overflow-hidden rounded-2xl sticky top-4 route-map-card">
        <div id="route-map" class="w-full h-full"></div>
        <!-- Ladestation-Legende -->
        <div v-if="showChargers && chargers.length" class="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur rounded-xl px-3 py-2 text-xs text-gray-300 space-y-1 pointer-events-none">
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> {{ $t('routes.chargerLegend') }}</div>
        </div>
        <div v-if="showChargers && !chargers.length && !chargerLoading" class="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur rounded-xl px-3 py-2 text-xs text-gray-400 pointer-events-none">
          {{ $t('routes.noChargers') }}
        </div>
      </div>
    </div>

    <!-- Speichern-Dialog -->
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

// ── Leaflet ──
let L                 = null;
let leafletMap        = null;
let destMarker        = null;
let wpMarkers         = [];
let routeLayer        = null;
let chargerMarkers    = [];
let mapResizeObserver = null;

// ── Startort ──
const startMode     = ref('vehicle'); // 'vehicle' | 'browser' | 'manual'
const startLocation = ref(null);
const startQuery    = ref('');
const startResults  = ref([]);
let startTimer      = null;

// ── Suche ──
const searchQuery    = ref('');
const searchResults  = ref([]);
const searching      = ref(false);
const searchNoResults = ref(false);
let searchTimer      = null;
const wpQuery        = ref('');
const wpResults      = ref([]);
let wpTimer          = null;

// ── Route ──
const destination = ref(null);
const waypoints   = ref([]);

// ── Routenberechnung ──
const routeData    = ref(null);
const routeLoading = ref(false);
const routeStats   = ref({ soc: null, rated_range_km: null, avg_kwh_per_100km: null });

// ── Ladestationen ──
const chargers      = ref([]);
const chargerLoading = ref(false);
const showChargers   = ref(false);

// ── Gespeicherte Routen ──
const savedRoutes    = ref([]);
const showSaveDialog = ref(false);
const saveName       = ref('');
const saving         = ref(false);
const saveInput      = ref(null);
const editingId      = ref(null);
const editName       = ref('');

// ── UI ──
const busy  = ref(false);
const toast = ref(null);

function showToast(msg, ok = true) {
  toast.value = { msg, ok };
  setTimeout(() => { toast.value = null; }, 3500);
}

// ── Reichweite ──

const arrivalSoc = computed(() => {
  if (!routeData.value || routeStats.value.soc == null || !routeStats.value.rated_range_km) return null;
  const { distance_km } = routeData.value;
  const { soc, rated_range_km } = routeStats.value;
  if (rated_range_km <= 0) return null;
  const val = Math.round((rated_range_km - distance_km) * soc / rated_range_km);
  return Math.max(-99, val);
});

const arrivalSocClass = computed(() => {
  if (arrivalSoc.value == null) return 'text-gray-400';
  if (arrivalSoc.value < 10) return 'text-red-400';
  if (arrivalSoc.value < 20) return 'text-yellow-400';
  return 'text-green-400';
});

const arrivalSocBarClass = computed(() => {
  if (arrivalSoc.value == null || arrivalSoc.value < 0) return 'bg-red-500';
  if (arrivalSoc.value < 10) return 'bg-red-500';
  if (arrivalSoc.value < 20) return 'bg-yellow-500';
  return 'bg-green-500';
});

// ── Formatierung ──

function formatDistance(km) {
  if (km == null) return '—';
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

function formatDuration(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Geocoding — via Backend-Proxy (umgeht CSP/CORS-Probleme) ──

async function geocode(q) {
  const { data } = await api.get('/routing/geocode', { params: { q, lang: locale.value } });
  return Array.isArray(data) ? data : [];
}

async function reverseGeocode(lat, lon) {
  try {
    const { data } = await api.get('/routing/reverse', { params: { lat, lon, lang: locale.value } });
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

function onSearchInput() {
  clearTimeout(searchTimer);
  searchNoResults.value = false;
  if (searchQuery.value.length < 2) { searchResults.value = []; return; }
  searching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await geocode(searchQuery.value);
      searchNoResults.value = searchResults.value.length === 0;
    } catch { searchResults.value = []; }
    finally { searching.value = false; }
  }, 350);
}

async function onSearchEnter() {
  if (searchQuery.value.length < 2) return;
  searching.value = true;
  searchNoResults.value = false;
  try {
    searchResults.value = await geocode(searchQuery.value);
    searchNoResults.value = searchResults.value.length === 0;
    if (searchResults.value.length === 1) pickResult(searchResults.value[0]);
  } finally { searching.value = false; }
}

function onWpInput() {
  clearTimeout(wpTimer);
  if (wpQuery.value.length < 2) { wpResults.value = []; return; }
  wpTimer = setTimeout(async () => {
    wpResults.value = await geocode(wpQuery.value);
  }, 350);
}

// ── Startort-Logik ──

async function setStartVehicle() {
  startMode.value = 'vehicle';
  if (vehicle.value?.last_lat && vehicle.value?.last_lon) {
    const name = await reverseGeocode(vehicle.value.last_lat, vehicle.value.last_lon)
      .catch(() => t('routes.startVehicleLabel'));
    startLocation.value = {
      name: name.split(',')[0] || t('routes.startVehicleLabel'),
      lat: vehicle.value.last_lat,
      lon: vehicle.value.last_lon,
    };
  } else {
    startLocation.value = null;
  }
  if (destination.value) calculateRoute();
}

async function setStartBrowser() {
  startMode.value = 'browser';
  if (!navigator.geolocation) {
    showToast(t('routes.startBrowserUnavailable'), false);
    startMode.value = 'vehicle';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const name = await reverseGeocode(lat, lon).catch(() => t('routes.startBrowserLabel'));
      startLocation.value = { name: name.split(',')[0] || t('routes.startBrowserLabel'), lat, lon };
      if (destination.value) calculateRoute();
    },
    () => {
      showToast(t('routes.startBrowserDenied'), false);
      startMode.value = 'vehicle';
    },
    { timeout: 8000 },
  );
}

function onStartInput() {
  clearTimeout(startTimer);
  if (startQuery.value.length < 2) { startResults.value = []; return; }
  startTimer = setTimeout(async () => {
    startResults.value = await geocode(startQuery.value);
  }, 350);
}

function pickStartResult(r) {
  startLocation.value = {
    name: r.display_name.split(',')[0],
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  };
  startQuery.value   = '';
  startResults.value = [];
  if (leafletMap && L) {
    leafletMap.setView([startLocation.value.lat, startLocation.value.lon], Math.max(leafletMap.getZoom(), 10));
  }
  if (destination.value) calculateRoute();
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
  calculateRoute();
}

function removeWaypoint(i) {
  waypoints.value.splice(i, 1);
  updateWpMarkers();
  calculateRoute();
}

function clearSearch() { searchQuery.value = ''; searchResults.value = []; }

function clearDestination() {
  destination.value = null;
  routeData.value   = null;
  chargers.value    = [];
  if (destMarker) { destMarker.remove(); destMarker = null; }
  clearRouteLayer();
  clearChargerMarkers();
}

// ── Karte ──

function setDestination(name, lat, lon) {
  destination.value = { name, lat, lon };
  if (!L || !leafletMap) return;
  if (destMarker) destMarker.remove();
  destMarker = L.marker([lat, lon], { icon: redIcon() }).addTo(leafletMap).bindPopup(name).openPopup();
  leafletMap.setView([lat, lon], Math.max(leafletMap.getZoom(), 12));
  calculateRoute();
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

function chargerIcon(kw) {
  const color = kw >= 100 ? '#3b82f6' : kw >= 50 ? '#60a5fa' : '#93c5fd';
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5);font-size:10px;color:white;font-weight:bold">⚡</div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
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

function clearRouteLayer() {
  if (routeLayer) { routeLayer.remove(); routeLayer = null; }
}

function clearChargerMarkers() {
  chargerMarkers.forEach(m => m.remove());
  chargerMarkers = [];
}

// ── OSRM-Routing ──

let routeCalcTimer = null;

function calculateRoute() {
  clearTimeout(routeCalcTimer);
  if (!destination.value) return;
  routeCalcTimer = setTimeout(_doCalculateRoute, 300);
}

async function _doCalculateRoute() {
  if (!destination.value || !L || !leafletMap) return;
  routeLoading.value = true;
  clearRouteLayer();

  // Startpunkt: gewählter Startort, Fahrzeug oder Deutschland-Mitte
  const startLat = startLocation.value?.lat ?? vehicle.value?.last_lat ?? 51.1657;
  const startLon = startLocation.value?.lon ?? vehicle.value?.last_lon ?? 10.4515;

  // Koordinaten für OSRM: lon,lat Reihenfolge
  const coords = [
    `${startLon.toFixed(6)},${startLat.toFixed(6)}`,
    ...waypoints.value.map(wp => `${wp.lon.toFixed(6)},${wp.lat.toFixed(6)}`),
    `${destination.value.lon.toFixed(6)},${destination.value.lat.toFixed(6)}`,
  ].join(';');

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const r   = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`OSRM ${r.status}`);
    const data  = await r.json();
    const route = data.routes?.[0];
    if (!route) throw new Error('Keine Route gefunden');

    routeData.value = {
      distance_km:  route.distance / 1000,
      duration_min: route.duration / 60,
      geometry:     route.geometry.coordinates,
    };

    // Route als Polyline auf Karte zeichnen
    const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    routeLayer = L.polyline(latlngs, {
      color: '#e2231a',
      weight: 4,
      opacity: 0.8,
      dashArray: null,
    }).addTo(leafletMap);
    leafletMap.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });

    // Wenn Ladestationen aktiv: neu laden
    if (showChargers.value) await _loadChargers();

  } catch (err) {
    console.warn('[Routing]', err.message);
    showToast(t('routes.routeError'), false);
    routeData.value = null;
  } finally {
    routeLoading.value = false;
  }
}

// ── Ladestationen ──

async function toggleChargers() {
  showChargers.value = !showChargers.value;
  if (showChargers.value && routeData.value) {
    await _loadChargers();
  } else {
    clearChargerMarkers();
    chargers.value = [];
  }
}

async function _loadChargers() {
  if (!routeData.value || !L || !leafletMap) return;
  chargerLoading.value = true;

  // Abfragepunkte: Routenmittelpunkt + ggf. weitere Segmente bei langer Strecke
  const geo = routeData.value.geometry;
  const queryPoints = [geo[Math.floor(geo.length / 2)]];
  if (routeData.value.distance_km > 200) {
    queryPoints.push(geo[Math.floor(geo.length * 0.25)]);
    queryPoints.push(geo[Math.floor(geo.length * 0.75)]);
  }

  clearChargerMarkers();
  chargers.value = [];
  const seen = new Set();

  try {
    await Promise.all(queryPoints.map(async ([lon, lat]) => {
      const radius = Math.min(50, routeData.value.distance_km * 0.3);
      const { data } = await api.get('/routing/chargers', { params: { lat, lon, radius_km: radius } });
      for (const s of data) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          chargers.value.push(s);
        }
      }
    }));

    updateChargerMarkers();
  } catch (err) {
    console.warn('[Chargers]', err.message);
  } finally {
    chargerLoading.value = false;
  }
}

function updateChargerMarkers() {
  clearChargerMarkers();
  if (!L || !leafletMap) return;
  for (const s of chargers.value) {
    const kw     = s.max_kw ?? 0;
    const label  = s.max_kw ? `${s.max_kw} kW` : '';
    const popup  = `<b>${s.name}</b>${label ? `<br>${label}` : ''}${s.operator ? `<br><small>${s.operator}</small>` : ''}`;
    chargerMarkers.push(
      L.marker([s.lat, s.lon], { icon: chargerIcon(kw) })
        .addTo(leafletMap)
        .bindPopup(popup)
    );
  }
}

// ── Fahrzeugstats laden ──

async function loadRoutingStats() {
  if (!vehicle.value) return;
  try {
    const { data } = await api.get('/routing/stats', { params: { vehicleId: vehicle.value.id } });
    routeStats.value = data;
  } catch { /* silent */ }
}

// ── Karte initialisieren ──

async function initMap() {
  L = (await import('leaflet')).default;

  leafletMap = L.map('route-map').setView(
    vehicle.value?.last_lat && vehicle.value?.last_lon
      ? [vehicle.value.last_lat, vehicle.value.last_lon]
      : [51.1657, 10.4515],
    vehicle.value?.last_lat ? 12 : 6
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap);

  // iOS Safari rendert das Layout in mehreren Passes – der Container hat
  // beim ersten onMounted noch nicht seine finale Größe. invalidateSize()
  // zwingt Leaflet, die Kacheln neu zu berechnen.
  setTimeout(() => leafletMap?.invalidateSize(), 250);
  const mapEl = document.getElementById('route-map');
  if (mapEl) {
    mapResizeObserver = new ResizeObserver(() => leafletMap?.invalidateSize());
    mapResizeObserver.observe(mapEl);
  }

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

// ── Gespeicherte Routen ──

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
  calculateRoute();
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

// ── Tesla-Navigation ──

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

// ── ABRP (optionale Rückfalloption) ──

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

watch(() => vehicle.value?.id, async () => {
  await loadSavedRoutes();
  await loadRoutingStats();
});

onMounted(async () => {
  await loadSavedRoutes();
  await loadRoutingStats();
  await nextTick();
  await initMap();
  // Startort initialisieren: Fahrzeugposition bevorzugen
  await setStartVehicle();
});

onBeforeUnmount(() => {
  mapResizeObserver?.disconnect();
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.route-map-card {
  height: 75vh;
  min-height: 420px;
}
/* dvh = Dynamic Viewport Height: passt sich der iOS-Adressleiste an */
@supports (height: 1dvh) {
  .route-map-card { height: 75dvh; }
}
</style>

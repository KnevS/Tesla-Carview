<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/trips" class="text-gray-400 hover:text-white">← Fahrten</RouterLink>
      <h1 class="text-2xl font-bold">Fahrtdetail</h1>
    </div>

    <div v-if="loading" class="text-gray-400">Lade...</div>
    <template v-else-if="trip">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Strecke"    :value="fmtDistance(trip.distance_km)" icon="map"
          tooltip="Gesamtstrecke dieser Fahrt" />
        <StatCard label="Dauer"      :value="duration"                          icon="clock"
          tooltip="Gesamtfahrtdauer von Start bis Ziel" />
        <StatCard label="Ø Geschw."  :value="fmt(trip.avg_speed_kmh, 0) + ' km/h'" icon="gauge"
          tooltip="Durchschnittsgeschwindigkeit — Strecke geteilt durch Fahrzeit (ohne Standzeiten)" />
        <StatCard label="Verbrauch"  :value="consumption"                        icon="bolt"
          tooltip="Energieverbrauch pro 100 km — das wichtigste Effizienzmaß für Elektrofahrzeuge" />
      </div>

      <!-- GPS-Karte + Schieber: isolate verhindert, dass Leaflet-Panes
           mit ihren hohen z-Indizes (200-700) aus dem Stacking Context
           herausfloaten und NavBar-Dropdowns überdecken. -->
      <div class="card space-y-3 isolate">
        <h2 class="text-lg font-semibold">GPS-Track</h2>

        <div v-if="hasPoints">
          <!-- Karte -->
          <div id="trip-map" style="height: clamp(260px, 45vh, 520px); border-radius: 12px;"></div>

          <!-- Datenpanel am Slider-Punkt -->
          <div class="grid grid-cols-4 gap-3 mt-3 text-center text-sm">
            <div class="bg-gray-800 rounded-xl p-3"
              v-tooltip="'Momentane Geschwindigkeit an diesem Punkt der Fahrt'">
              <p class="text-gray-400 text-xs mb-1">Geschwindigkeit</p>
              <p class="text-white font-bold text-lg">{{ sliderPt.speed_kmh ?? '–' }} <span class="text-xs font-normal text-gray-400">km/h</span></p>
            </div>
            <div class="bg-gray-800 rounded-xl p-3"
              v-tooltip="'Motorleistung: positiv = Antrieb, negativ = Rekuperation (Energie zurückgewinnen beim Bremsen)'">
              <p class="text-gray-400 text-xs mb-1">Leistung</p>
              <p class="font-bold text-lg" :class="(sliderPt.power_kw ?? 0) >= 0 ? 'text-red-400' : 'text-green-400'">
                {{ sliderPt.power_kw !== undefined ? (sliderPt.power_kw >= 0 ? '+' : '') + sliderPt.power_kw : '–' }}
                <span class="text-xs font-normal text-gray-400">kW</span>
              </p>
            </div>
            <div class="bg-gray-800 rounded-xl p-3"
              v-tooltip="'Batterieladezustand in Prozent an diesem Punkt'">
              <p class="text-gray-400 text-xs mb-1">Batterie</p>
              <p class="text-white font-bold text-lg">{{ sliderPt.battery_level ?? '–' }} <span class="text-xs font-normal text-gray-400">%</span></p>
            </div>
            <div class="bg-gray-800 rounded-xl p-3"
              v-tooltip="'Zeitstempel dieses Datenpunkts — ziehe den Schieber um die Route zeitlich abzuspielen'">
              <p class="text-gray-400 text-xs mb-1">Uhrzeit</p>
              <p class="text-white font-bold text-lg text-sm">{{ sliderPt.timestamp ? fmtTime(sliderPt.timestamp) : '–' }}</p>
            </div>
          </div>

          <!-- Schieber -->
          <div class="mt-2 space-y-1">
            <input type="range" min="0" :max="trip.points.length - 1" v-model.number="sliderIdx"
              @input="onSlider"
              class="w-full accent-tesla-red cursor-pointer" />
            <div class="flex justify-between text-xs text-gray-500">
              <span>{{ fmtDateTime(trip.start_time) }}</span>
              <span>{{ fmtDateTime(trip.end_time) }}</span>
            </div>
          </div>
        </div>

        <p v-else class="text-gray-400 text-sm">Keine GPS-Daten für diese Fahrt vorhanden.</p>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">Route</h2>
          <button v-if="!editingRoute" @click="startEditRoute" class="text-xs text-gray-400 hover:text-white"
            v-tooltip="'Start- und Ziel-Adresse / GPS-Koordinaten manuell pflegen — sinnvoll bei Fahrzeugen, die keine GPS-Daten an Tesla senden (z.B. XP7-VIN ohne Fleet Telemetry).'">
            ✎ Bearbeiten
          </button>
        </div>
        <div v-if="!editingRoute" class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-400">Start</p>
            <p>{{ trip.start_address || (trip.start_lat ? `${trip.start_lat}, ${trip.start_lon}` : '— keine Daten —') }}</p>
            <p class="text-gray-400 mt-1">{{ fmtDateTime(trip.start_time) }}</p>
          </div>
          <div>
            <p class="text-gray-400">Ziel</p>
            <p>{{ trip.end_address || (trip.end_lat ? `${trip.end_lat}, ${trip.end_lon}` : '— keine Daten —') }}</p>
            <p class="text-gray-400 mt-1">{{ fmtDateTime(trip.end_time) }}</p>
          </div>
        </div>

        <!-- Inline-Editor: Adresse + optional GPS-Koordinaten. Adresse wird
             angezeigt, GPS-Koordinaten dienen der Karten-Darstellung und
             dem optionalen Reverse-Geocoding. -->
        <div v-else class="space-y-4 text-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <p class="text-gray-400 font-medium">Start</p>
              <div>
                <label class="text-xs text-gray-500 block mb-0.5">Adresse</label>
                <input v-model="routeForm.start_address" type="text"
                  class="w-full bg-gray-700 rounded px-2 py-1 text-white text-sm"
                  placeholder="z.B. Mercedesstraße 120, Stuttgart"
                  v-tooltip="'Frei eingegebene Start-Adresse. Wird in Listen und der Routen-Anzeige verwendet, wenn keine GPS-Daten zur automatischen Reverse-Adresse vorliegen.'" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-gray-500 block mb-0.5">Lat</label>
                  <input v-model="routeForm.start_lat" type="number" step="any" min="-90" max="90"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-white text-sm"
                    placeholder="48.7758"
                    v-tooltip="'GPS-Breitengrad fuer den Startpunkt. Optional — nur noetig, wenn der Punkt auf einer Karte angezeigt werden soll oder eine Distanz neu berechnet wird.'" />
                </div>
                <div>
                  <label class="text-xs text-gray-500 block mb-0.5">Lon</label>
                  <input v-model="routeForm.start_lon" type="number" step="any" min="-180" max="180"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-white text-sm"
                    placeholder="9.1829"
                    v-tooltip="'GPS-Laengengrad fuer den Startpunkt. Format: Dezimalgrad mit Punkt (Komma wird umgewandelt).'" />
                </div>
              </div>
            </div>
            <div class="space-y-2">
              <p class="text-gray-400 font-medium">Ziel</p>
              <div>
                <label class="text-xs text-gray-500 block mb-0.5">Adresse</label>
                <input v-model="routeForm.end_address" type="text"
                  class="w-full bg-gray-700 rounded px-2 py-1 text-white text-sm"
                  placeholder="z.B. Hauptstraße 1, Esslingen"
                  v-tooltip="'Frei eingegebene Ziel-Adresse. Sichtbar in Fahrtenbuch und Trip-Liste.'" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-gray-500 block mb-0.5">Lat</label>
                  <input v-model="routeForm.end_lat" type="number" step="any" min="-90" max="90"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-white text-sm"
                    placeholder="48.7404"
                    v-tooltip="'GPS-Breitengrad fuer den Zielpunkt. Optional.'" />
                </div>
                <div>
                  <label class="text-xs text-gray-500 block mb-0.5">Lon</label>
                  <input v-model="routeForm.end_lon" type="number" step="any" min="-180" max="180"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-white text-sm"
                    placeholder="9.3097"
                    v-tooltip="'GPS-Laengengrad fuer den Zielpunkt. Optional.'" />
                </div>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="saveRoute" class="btn-primary text-sm">Speichern</button>
            <button @click="editingRoute = false" class="btn-secondary text-sm">Abbrechen</button>
          </div>
        </div>

        <!-- Fahrer -->
        <div class="mt-4 pt-4 border-t border-gray-700 flex items-center gap-3">
          <p class="text-gray-400 text-sm w-16 flex-shrink-0">Fahrer</p>
          <div class="relative">
            <button @click="showDriverMenu = !showDriverMenu"
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition"
              :style="trip.driver_color
                ? `border-color:${trip.driver_color}55; color:${trip.driver_color}; background:${trip.driver_color}18`
                : 'border-color:#4b5563; color:#9ca3af'"">
              <span v-if="trip.driver_color" class="w-2.5 h-2.5 rounded-full" :style="{ background: trip.driver_color }"></span>
              {{ trip.driver_name || '– kein Fahrer' }}
              <span class="text-xs opacity-60">▾</span>
            </button>
            <!-- z-50 + shadow-2xl wie in Trips.vue — sonst liegt das Menue
                 unter Toasts/Tooltips und Click-Targets sind verdeckt. -->
            <div v-if="showDriverMenu"
              class="absolute left-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl min-w-max py-1">
              <button class="block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700 text-gray-400"
                @click="assignDriver(null)">– Kein Fahrer</button>
              <button v-for="d in drivers" :key="d.id"
                class="flex items-center gap-2 w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700"
                :class="trip.driver_id === d.id ? 'text-white font-semibold' : 'text-gray-300'"
                @click="assignDriver(d)">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ background: d.color }"></span>
                {{ d.name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Geschwindigkeitskurve -->
      <div class="card" v-if="trip.points?.length">
        <h2 class="text-lg font-semibold mb-3">Geschwindigkeit &amp; Leistung</h2>
        <div style="height: 200px">
          <Line :data="speedChart" :options="chartOpts" />
        </div>
      </div>

      <!-- Batterie -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-3">Batterie & Effizienz</h2>
        <div class="flex flex-wrap gap-6 mb-4">
          <div v-tooltip="'Batterieladezustand zu Fahrtbeginn'">
            <p class="text-gray-400 text-sm">Start SoC</p>
            <p class="text-3xl font-bold text-green-400">{{ trip.start_soc }}%</p>
          </div>
          <div class="text-2xl self-center text-gray-500">→</div>
          <div v-tooltip="'Batterieladezustand bei Fahrtende — unter 20% wird rot markiert'">
            <p class="text-gray-400 text-sm">End SoC</p>
            <p class="text-3xl font-bold" :class="trip.end_soc < 20 ? 'text-red-400' : 'text-yellow-400'">{{ trip.end_soc }}%</p>
          </div>
          <div class="ml-auto text-right">
            <p class="text-gray-400 text-sm">Verbrauch gesamt</p>
            <p class="text-xl font-bold">{{ fmt(trip.energy_used_kwh, 2) }} kWh</p>
          </div>
        </div>

        <!-- Rekuperation — wird nur angezeigt wenn Daten vorhanden -->
        <template v-if="trip.regen_kwh > 0">
          <div class="border-t border-gray-700 pt-3 space-y-3">
            <h3 class="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
              ⚡ Rekuperation
              <span class="text-xs text-gray-500 font-normal"
                v-tooltip="'Energie, die durch Bremsen und Verzögern zurück in die Batterie gewonnen wurde'">ℹ️</span>
            </h3>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-gray-800 rounded-xl py-2.5 px-2"
                v-tooltip="'Rekuperierte Energie — gemessen aus negativen Leistungswerten der Fahrtdaten'">
                <p class="text-xs text-gray-400 mb-0.5">Rückgewonnen</p>
                <p class="text-lg font-bold text-emerald-400">{{ fmt(trip.regen_kwh, 2) }} kWh</p>
              </div>
              <div class="bg-gray-800 rounded-xl py-2.5 px-2"
                v-tooltip="'Anteil der rekuperierten Energie am Gesamtverbrauch — je höher, desto effizienter der Fahrstil'">
                <p class="text-xs text-gray-400 mb-0.5">Reku-Quote</p>
                <p class="text-lg font-bold" :class="regenRatioClass">{{ regenRatioPct }}%</p>
              </div>
              <div class="bg-gray-800 rounded-xl py-2.5 px-2"
                v-tooltip="'Nettoeffizienz nach Abzug der Rekuperation — zeigt den echten Energiebedarf der Strecke'">
                <p class="text-xs text-gray-400 mb-0.5">Netto-Verbrauch</p>
                <p class="text-lg font-bold text-blue-300">{{ netConsumption }}</p>
              </div>
            </div>
            <!-- Balken-Visualisierung -->
            <div v-tooltip="'Grün = rekuperierte Energie / Rot = Nettoverbrauch nach Rekuperation'">
              <div class="flex h-3 rounded-full overflow-hidden bg-gray-700">
                <div class="bg-emerald-500 transition-all"
                  :style="{ width: regenBarPct + '%' }"></div>
                <div class="bg-tesla-red transition-all flex-1"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>⚡ Rekuperation</span>
                <span>🔋 Netto</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js';
import StatCard from '../components/StatCard.vue';
import { useUnits } from '../store/prefs.js';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const route   = useRoute();
const trip    = ref(null);
const loading = ref(true);
const sliderIdx = ref(0);
const drivers = ref([]);
const showDriverMenu = ref(false);
let leafletMap  = null;
let sliderMarker = null;

const { fmtDistance, fmtEfficiency } = useUnits();
const fmt         = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDateTime = ts => ts ? new Date(ts * 1000).toLocaleString('de-DE') : '–';
const fmtTime     = ts => new Date(ts * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const hasPoints = computed(() => trip.value?.points?.length >= 2);

const sliderPt = computed(() => {
  const pts = trip.value?.points;
  if (!pts?.length) return {};
  return pts[Math.min(sliderIdx.value, pts.length - 1)];
});

const duration = computed(() => {
  if (!trip.value?.start_time || !trip.value?.end_time) return '–';
  const mins = Math.round((trip.value.end_time - trip.value.start_time) / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins} min`;
});

const consumption = computed(() =>
  trip.value?.distance_km
    ? fmtEfficiency(trip.value.energy_used_kwh / trip.value.distance_km * 100)
    : '–'
);

// ── Rekuperation ──
const regenKwh = computed(() => trip.value?.regen_kwh ?? 0);
const grossKwh = computed(() => trip.value?.energy_used_kwh ?? 0);

const regenRatioPct = computed(() => {
  if (!grossKwh.value || !regenKwh.value) return 0;
  return Math.min(99, Math.round((regenKwh.value / grossKwh.value) * 100));
});

const regenRatioClass = computed(() => {
  const p = regenRatioPct.value;
  if (p >= 25) return 'text-emerald-400';
  if (p >= 12) return 'text-yellow-400';
  return 'text-gray-400';
});

const netConsumption = computed(() => {
  const net = grossKwh.value - regenKwh.value;
  const dist = trip.value?.distance_km;
  if (!dist || net <= 0) return '–';
  return fmtEfficiency(net / dist * 100);
});

// Anteil des grünen Balkens am Gesamt-Bar (0–50 % max, damit rot immer sichtbar bleibt)
const regenBarPct = computed(() =>
  Math.min(50, regenRatioPct.value)
);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#9ca3af' } } },
  scales: {
    x: { ticks: { color: '#9ca3af', maxTicksLimit: 8 }, grid: { color: '#374151' } },
    y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
  },
};

const speedChart = computed(() => {
  if (!trip.value?.points) return null;
  const pts = trip.value.points;
  return {
    labels: pts.map(p => fmtTime(p.timestamp)),
    datasets: [
      { label: 'km/h', data: pts.map(p => p.speed_kmh || 0), borderColor: '#E31937', tension: 0.4, pointRadius: 0, fill: false },
      { label: 'kW',   data: pts.map(p => p.power_kw  || 0), borderColor: '#10b981', tension: 0.4, pointRadius: 0, fill: false },
    ],
  };
});

function onSlider() {
  const pt = sliderPt.value;
  if (!pt?.lat || !sliderMarker) return;
  sliderMarker.setLatLng([pt.lat, pt.lon]);
}

async function initMap(points) {
  await nextTick();
  const L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');

  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  const mapEl = document.getElementById('trip-map');
  if (!mapEl) return;

  leafletMap = L.map('trip-map');
  L.tileLayer('/api/tiles/{z}/{x}/{y}', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(leafletMap);
  new ResizeObserver(() => leafletMap?.invalidateSize()).observe(mapEl);

  const latlngs = points.map(p => [p.lat, p.lon]);

  // Track nach Geschwindigkeit einfärben
  const maxSpeed = Math.max(...points.map(p => p.speed_kmh || 0), 1);
  for (let i = 1; i < points.length; i++) {
    const ratio = (points[i].speed_kmh || 0) / maxSpeed;
    const r = Math.round(227 * ratio);
    const g = Math.round(183 * (1 - ratio));
    L.polyline([[points[i-1].lat, points[i-1].lon], [points[i].lat, points[i].lon]], {
      color: `rgb(${r},${g},50)`, weight: 4, opacity: 0.85,
    }).addTo(leafletMap);
  }

  // Start- und Endmarker
  L.marker([points[0].lat, points[0].lon]).bindPopup('▶ Start').addTo(leafletMap);
  L.marker([points[points.length - 1].lat, points[points.length - 1].lon]).bindPopup('🏁 Ziel').addTo(leafletMap);

  // Schieber-Marker (roter Kreis)
  sliderMarker = L.circleMarker([points[0].lat, points[0].lon], {
    radius: 10, color: '#E31937', fillColor: '#E31937',
    fillOpacity: 0.9, weight: 3,
  }).addTo(leafletMap);

  leafletMap.fitBounds(L.latLngBounds(latlngs), { padding: [20, 20] });
}

async function assignDriver(driver) {
  showDriverMenu.value = false;
  trip.value.driver_id    = driver?.id    ?? null;
  trip.value.driver_name  = driver?.name  ?? null;
  trip.value.driver_color = driver?.color ?? null;
  await api.patch(`/trips/${route.params.id}/driver`, { driver_id: driver?.id ?? null });
}

// Route-Editor: manuelle Pflege von Start/Ziel-Adresse + GPS-Koordinaten.
// Sinnvoll fuer Fahrzeuge, die keine GPS-Daten an Tesla senden.
const editingRoute = ref(false);
const routeForm = ref({
  start_address: '', end_address: '',
  start_lat: '', start_lon: '', end_lat: '', end_lon: '',
});

function startEditRoute() {
  routeForm.value = {
    start_address: trip.value.start_address ?? '',
    end_address:   trip.value.end_address   ?? '',
    start_lat:     trip.value.start_lat ?? '',
    start_lon:     trip.value.start_lon ?? '',
    end_lat:       trip.value.end_lat ?? '',
    end_lon:       trip.value.end_lon ?? '',
  };
  editingRoute.value = true;
}

async function saveRoute() {
  // Strings → null falls leer; Zahlen werden im Backend validiert.
  const norm = v => (typeof v === 'string' && v.trim() === '') ? null : v;
  const num  = v => (v === '' || v == null) ? null : parseFloat(v);
  try {
    const { data } = await api.patch(`/trips/${route.params.id}/location`, {
      start_address: norm(routeForm.value.start_address),
      end_address:   norm(routeForm.value.end_address),
      start_lat:     num(routeForm.value.start_lat),
      start_lon:     num(routeForm.value.start_lon),
      end_lat:       num(routeForm.value.end_lat),
      end_lon:       num(routeForm.value.end_lon),
    });
    Object.assign(trip.value, data);
    editingRoute.value = false;
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
}

onMounted(async () => {
  const [tripRes, driversRes] = await Promise.all([
    api.get(`/trips/${route.params.id}`),
    api.get('/drivers'),
  ]);
  trip.value    = tripRes.data;
  drivers.value = driversRes.data;
  loading.value = false;
  if (tripRes.data.points?.length >= 2) {
    await initMap(tripRes.data.points);
  }
});

onUnmounted(() => {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
});
</script>

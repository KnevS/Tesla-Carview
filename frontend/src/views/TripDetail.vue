<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/trips" class="text-gray-400 hover:text-white">← Fahrten</RouterLink>
      <h1 class="text-2xl font-bold">Fahrtdetail</h1>
    </div>

    <div v-if="loading" class="text-gray-400">Lade...</div>
    <template v-else-if="trip">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Strecke"    :value="fmt(trip.distance_km, 1) + ' km'" icon="🛣️" />
        <StatCard label="Dauer"      :value="duration"                          icon="⏱️" />
        <StatCard label="Ø Geschw."  :value="fmt(trip.avg_speed_kmh, 0) + ' km/h'" icon="🏎️" />
        <StatCard label="Verbrauch"  :value="consumption + ' kWh/100km'"        icon="⚡" />
      </div>

      <!-- GPS-Karte + Schieber -->
      <div class="card space-y-3">
        <h2 class="text-lg font-semibold">GPS-Track</h2>

        <div v-if="hasPoints">
          <!-- Karte -->
          <div id="trip-map" style="height: 380px; border-radius: 12px;"></div>

          <!-- Datenpanel am Slider-Punkt -->
          <div class="grid grid-cols-4 gap-3 mt-3 text-center text-sm">
            <div class="bg-gray-800 rounded-xl p-3">
              <p class="text-gray-400 text-xs mb-1">Geschwindigkeit</p>
              <p class="text-white font-bold text-lg">{{ sliderPt.speed_kmh ?? '–' }} <span class="text-xs font-normal text-gray-400">km/h</span></p>
            </div>
            <div class="bg-gray-800 rounded-xl p-3">
              <p class="text-gray-400 text-xs mb-1">Leistung</p>
              <p class="font-bold text-lg" :class="(sliderPt.power_kw ?? 0) >= 0 ? 'text-red-400' : 'text-green-400'">
                {{ sliderPt.power_kw !== undefined ? (sliderPt.power_kw >= 0 ? '+' : '') + sliderPt.power_kw : '–' }}
                <span class="text-xs font-normal text-gray-400">kW</span>
              </p>
            </div>
            <div class="bg-gray-800 rounded-xl p-3">
              <p class="text-gray-400 text-xs mb-1">Batterie</p>
              <p class="text-white font-bold text-lg">{{ sliderPt.battery_level ?? '–' }} <span class="text-xs font-normal text-gray-400">%</span></p>
            </div>
            <div class="bg-gray-800 rounded-xl p-3">
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
        <h2 class="text-lg font-semibold mb-3">Route</h2>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-400">Start</p>
            <p>{{ trip.start_address || `${trip.start_lat}, ${trip.start_lon}` }}</p>
            <p class="text-gray-400 mt-1">{{ fmtDateTime(trip.start_time) }}</p>
          </div>
          <div>
            <p class="text-gray-400">Ziel</p>
            <p>{{ trip.end_address || `${trip.end_lat}, ${trip.end_lon}` }}</p>
            <p class="text-gray-400 mt-1">{{ fmtDateTime(trip.end_time) }}</p>
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
            <div v-if="showDriverMenu"
              class="absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-600 rounded-xl shadow-xl min-w-max py-1">
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
        <h2 class="text-lg font-semibold mb-3">Batterie</h2>
        <div class="flex gap-8">
          <div>
            <p class="text-gray-400 text-sm">Start SoC</p>
            <p class="text-3xl font-bold text-green-400">{{ trip.start_soc }}%</p>
          </div>
          <div class="text-2xl self-center text-gray-500">→</div>
          <div>
            <p class="text-gray-400 text-sm">End SoC</p>
            <p class="text-3xl font-bold" :class="trip.end_soc < 20 ? 'text-red-400' : 'text-yellow-400'">{{ trip.end_soc }}%</p>
          </div>
          <div class="ml-auto text-right">
            <p class="text-gray-400 text-sm">Verbrauch gesamt</p>
            <p class="text-xl font-bold">{{ fmt(trip.energy_used_kwh, 2) }} kWh</p>
          </div>
        </div>
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
    ? fmt(trip.value.energy_used_kwh / trip.value.distance_km * 100, 1)
    : '–'
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
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(leafletMap);

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

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/trips" class="text-gray-400 hover:text-white">← Fahrten</RouterLink>
      <h1 class="text-2xl font-bold">Fahrtdetail</h1>
    </div>

    <div v-if="loading" class="text-gray-400">Lade...</div>
    <template v-else-if="trip">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Strecke" :value="fmt(trip.distance_km, 1) + ' km'" icon="🛣️" />
        <StatCard label="Dauer" :value="duration" icon="⏱️" />
        <StatCard label="Ø Geschw." :value="fmt(trip.avg_speed_kmh, 0) + ' km/h'" icon="🏎️" />
        <StatCard label="Verbrauch" :value="consumption + ' kWh/100km'" icon="⚡" />
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
      </div>

      <div class="card" v-if="trip.points?.length">
        <h2 class="text-lg font-semibold mb-3">Geschwindigkeit</h2>
        <div style="height: 200px">
          <Line :data="speedChart" :options="chartOpts" />
        </div>
      </div>

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
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js';
import StatCard from '../components/StatCard.vue';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const route = useRoute();
const trip = ref(null);
const loading = ref(true);

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDateTime = ts => ts ? new Date(ts * 1000).toLocaleString('de-DE') : '–';

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
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#9ca3af', maxTicksLimit: 8 }, grid: { color: '#374151' } },
    y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
  },
};

const speedChart = computed(() => {
  if (!trip.value?.points) return null;
  const pts = trip.value.points;
  return {
    labels: pts.map(p => new Date(p.timestamp * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })),
    datasets: [{ data: pts.map(p => p.speed_kmh || 0), borderColor: '#E31937', tension: 0.4, pointRadius: 0, fill: false }],
  };
});

onMounted(async () => {
  const { data } = await api.get(`/trips/${route.params.id}`);
  trip.value = data;
  loading.value = false;
});
</script>

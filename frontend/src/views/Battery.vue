<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Batterie & Degradation</h1>

    <div class="card">
      <h2 class="text-lg font-semibold mb-4">Reichweiten-Verlauf ({{ days }} Tage)</h2>
      <div class="flex gap-2 mb-4">
        <button v-for="d in [30, 90, 180, 365]" :key="d"
          @click="days = d; load()"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="days === d ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'"
        >{{ d }}T</button>
      </div>
      <div style="height: 250px">
        <Line v-if="chartData" :data="chartData" :options="chartOpts" />
      </div>
    </div>

    <div class="card">
      <h2 class="text-lg font-semibold mb-3">Degradations-Übersicht</h2>
      <div v-if="degradation.length > 1" class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-gray-400 text-sm">Erste Messung</p>
          <p class="text-xl font-bold">{{ fmt(degradation[0]?.max_range, 0) }} km</p>
          <p class="text-gray-400 text-xs">{{ degradation[0]?.day }}</p>
        </div>
        <div>
          <p class="text-gray-400 text-sm">Letzte Messung</p>
          <p class="text-xl font-bold">{{ fmt(degradation.at(-1)?.max_range, 0) }} km</p>
          <p class="text-gray-400 text-xs">{{ degradation.at(-1)?.day }}</p>
        </div>
        <div>
          <p class="text-gray-400 text-sm">Degradation</p>
          <p class="text-xl font-bold"
            :class="degradationPct > 10 ? 'text-red-400' : degradationPct > 5 ? 'text-yellow-400' : 'text-green-400'"
          >{{ fmt(degradationPct, 1) }}%</p>
        </div>
      </div>
      <p v-else class="text-gray-400">Noch nicht genug Daten für Degradations-Analyse.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const appStore = useAppStore();
const days = ref(90);
const degradation = ref([]);
const chartData = ref(null);
const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);

const degradationPct = computed(() => {
  if (degradation.value.length < 2) return 0;
  const first = degradation.value[0].max_range;
  const last = degradation.value.at(-1).max_range;
  return ((first - last) / first) * 100;
});

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#9ca3af' } } },
  scales: {
    x: { ticks: { color: '#9ca3af', maxTicksLimit: 10 }, grid: { color: '#374151' } },
    y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
  },
};

async function load() {
  const vid = appStore.selectedVehicle?.id;
  const params = { days: days.value, ...(vid ? { vehicle_id: vid } : {}) };
  const { data } = await api.get('/battery/degradation', { params });
  degradation.value = data;
  chartData.value = {
    labels: data.map(d => d.day),
    datasets: [
      {
        label: 'Max. Reichweite (km)',
        data: data.map(d => d.max_range),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 2,
      },
    ],
  };
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

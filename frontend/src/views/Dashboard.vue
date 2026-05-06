<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Dashboard</h1>

    <div v-if="loading" class="text-gray-400">Lade Daten...</div>

    <!-- Kein Fahrzeug verbunden -->
    <div v-else-if="!appStore.selectedVehicle" class="card text-center space-y-4 py-10">
      <div class="text-6xl">🚗</div>
      <h2 class="text-xl font-semibold">Kein Fahrzeug verbunden</h2>
      <p class="text-gray-400 text-sm">Verbinde deinen Tesla-Account um Fahrtdaten zu sehen.</p>
      <button @click="connectTesla" class="btn-primary"
        v-tooltip="'Leitet zur Tesla-Anmeldeseite weiter. Nach der Genehmigung wird das Fahrzeug automatisch erkannt.'">
        Tesla verbinden →
      </button>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Gesamtstrecke"
          :value="fmt(stats.total_km, 0) + ' km'"
          icon="🛣️"
          tooltip="Summe aller aufgezeichneten Fahrtkilometer für das aktuell gewählte Fahrzeug." />
        <StatCard label="Fahrten"
          :value="stats.total_trips"
          icon="🗺️"
          tooltip="Anzahl der vom System automatisch erkannten Einzelfahrten (jede Fahrt von Park bis Park)." />
        <StatCard label="Geladen"
          :value="fmt(chargingStats.total_energy_kwh, 1) + ' kWh'"
          icon="⚡"
          tooltip="Insgesamt nachgeladene Energie über alle Ladesessions." />
        <StatCard label="Ladekosten"
          :value="fmt(chargingStats.total_cost, 2) + ' €'"
          icon="💶"
          tooltip="Summierte Kosten aller Ladevorgänge mit hinterlegtem Preis. Bei kostenlosen oder unbekannten Ladungen wird 0 € angesetzt." />
      </div>

      <div v-if="lastTrip" class="card">
        <h2 class="text-lg font-semibold mb-3">Letzte Fahrt</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div v-tooltip="'Startadresse oder GPS-Koordinaten der zuletzt aufgezeichneten Fahrt'">
            <p class="text-gray-400">Von</p>
            <p>{{ lastTrip.start_address || 'Unbekannt' }}</p>
          </div>
          <div v-tooltip="'Zieladresse oder GPS-Koordinaten der zuletzt aufgezeichneten Fahrt'">
            <p class="text-gray-400">Nach</p>
            <p>{{ lastTrip.end_address || 'Unbekannt' }}</p>
          </div>
          <div v-tooltip="'Zurückgelegte Strecke der letzten Fahrt in Kilometern'">
            <p class="text-gray-400">Strecke</p>
            <p>{{ fmt(lastTrip.distance_km, 1) }} km</p>
          </div>
          <div v-tooltip="'Energieverbrauch pro 100 km – niedrige Werte bedeuten effizientes Fahren. Tesla-Durchschnitt: 15–20 kWh/100km'">
            <p class="text-gray-400">Verbrauch</p>
            <p>{{ lastTrip.distance_km ? fmt(lastTrip.energy_used_kwh / lastTrip.distance_km * 100, 1) : '–' }} kWh/100km</p>
          </div>
        </div>
        <RouterLink to="/trips" class="text-tesla-red text-sm mt-3 inline-block hover:underline">
          Alle Fahrten anzeigen →
        </RouterLink>
      </div>

      <div class="card">
        <h2 class="text-lg font-semibold mb-4"
          v-tooltip="'Gefahrene Kilometer pro Monat – zeigt deine Mobilitätsmuster und saisonale Unterschiede'">
          Monatsübersicht – Strecke (km)
        </h2>
        <div style="height: 200px">
          <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const appStore = useAppStore();
const loading = ref(true);

async function connectTesla() {
  const { data } = await api.get('/auth/tesla/auth-url');
  window.location.href = data.url;
}
const stats = ref({});
const chargingStats = ref({});
const lastTrip = ref(null);
const chartData = ref(null);

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
    y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
  },
};

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = vid ? { vehicle_id: vid } : {};
  const [tripStats, trips, charging] = await Promise.all([
    api.get('/trips/stats', { params }),
    api.get('/trips', { params: { ...params, limit: 1 } }),
    api.get('/charging/stats', { params }),
  ]);
  stats.value = tripStats.data;
  chargingStats.value = charging.data;
  lastTrip.value = trips.data[0] || null;

  const allTrips = (await api.get('/trips', { params: { ...params, limit: 500 } })).data;
  const monthly = {};
  allTrips.forEach(t => {
    const d = new Date(t.start_time * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + (t.distance_km || 0);
  });
  const sorted = Object.keys(monthly).sort().slice(-6);
  chartData.value = {
    labels: sorted,
    datasets: [{ label: 'km', data: sorted.map(k => monthly[k]), backgroundColor: '#E31937', borderRadius: 6 }],
  };
  loading.value = false;
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Laden</h1>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Ladesessions" :value="stats.total_sessions" icon="🔌" />
      <StatCard label="Geladen gesamt" :value="fmt(stats.total_energy_kwh, 1) + ' kWh'" icon="⚡" />
      <StatCard label="Ladekosten" :value="fmt(stats.total_cost, 2) + ' €'" icon="💶" />
      <StatCard label="Max. Ladeleistung" :value="fmt(stats.peak_power, 0) + ' kW'" icon="🚀" />
    </div>

    <!-- By Type -->
    <div v-if="stats.byType?.length" class="card">
      <h2 class="text-lg font-semibold mb-4">Nach Ladertyp</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div v-for="t in stats.byType" :key="t.charger_type" class="bg-gray-700 rounded-xl p-3 text-center">
          <p class="text-sm text-gray-400">{{ t.charger_type || 'Unbekannt' }}</p>
          <p class="font-bold">{{ t.count }}x</p>
          <p class="text-sm text-gray-400">{{ fmt(t.energy, 1) }} kWh</p>
        </div>
      </div>
    </div>

    <!-- Session List -->
    <div class="space-y-3">
      <div v-if="loading" class="text-gray-400">Lade Sessions...</div>
      <div v-for="s in sessions" :key="s.id" class="card">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold">{{ s.location_name || 'Unbekannter Ort' }}</p>
            <p class="text-sm text-gray-400">{{ fmtDate(s.start_time) }}</p>
            <div class="flex gap-3 mt-2 text-sm">
              <span class="bg-gray-700 rounded-lg px-2 py-0.5">{{ s.charger_type || 'AC' }}</span>
              <span>SoC {{ s.start_soc }}% → {{ s.end_soc }}%</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-green-400">+{{ fmt(s.energy_added_kwh, 1) }} kWh</p>
            <p class="text-sm text-gray-400">{{ fmt(s.max_power_kw, 0) }} kW max</p>
            <p v-if="s.cost" class="text-sm text-gray-400">{{ fmt(s.cost, 2) }} {{ s.currency }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import api from '../api.js';

const appStore = useAppStore();
const sessions = ref([]);
const stats = ref({ byType: [] });
const loading = ref(true);

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDate = ts => new Date(ts * 1000).toLocaleString('de-DE');

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = vid ? { vehicle_id: vid } : {};
  const [s, st] = await Promise.all([api.get('/charging', { params }), api.get('/charging/stats', { params })]);
  sessions.value = s.data;
  stats.value = st.data;
  loading.value = false;
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

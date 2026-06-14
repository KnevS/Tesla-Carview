<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold">🌱 {{ $t('co2.title') }}</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('co2.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button v-for="d in [30, 90, 365]" :key="d"
          @click="days = d; load()"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="days === d ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'">
          {{ d }} {{ $t('co2.days') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="card text-center py-10 text-gray-400">{{ $t('co2.loading') }}</div>

    <template v-else-if="data">
      <div class="card bg-gradient-to-br from-green-900/40 to-emerald-900/30 border border-green-700/30">
        <div class="text-center py-4">
          <div class="text-5xl font-bold text-green-400">{{ data.saved_co2_kg.toFixed(1) }} kg</div>
          <div class="text-gray-300 mt-1">{{ $t('co2.saved') }}</div>
          <div class="text-sm text-gray-500 mt-3">
            {{ data.km.toFixed(0) }} km · {{ data.trips }} {{ $t('co2.trips') }} · {{ data.kwh_used.toFixed(1) }} kWh
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card">
          <div class="text-gray-400 text-sm">{{ $t('co2.teslaEmission') }}</div>
          <div class="text-2xl font-bold mt-1">{{ data.tesla_co2_kg.toFixed(1) }} kg</div>
          <div class="text-xs text-gray-500 mt-1">{{ $t('co2.teslaNote') }}</div>
        </div>
        <div class="card">
          <div class="text-gray-400 text-sm">{{ $t('co2.iceEmission') }}</div>
          <div class="text-2xl font-bold mt-1 text-red-400">{{ data.ice_co2_kg.toFixed(1) }} kg</div>
          <div class="text-xs text-gray-500 mt-1">{{ $t('co2.iceNote') }}</div>
        </div>
      </div>

      <div class="card">
        <h3 class="font-semibold mb-3">{{ $t('co2.equivTitle') }}</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-3xl">🌳</div>
            <div class="text-xl font-bold mt-2">{{ data.equivalent.trees_per_year.toFixed(1) }}</div>
            <div class="text-xs text-gray-400">{{ $t('co2.treesEquiv') }}</div>
          </div>
          <div class="text-center">
            <div class="text-3xl">✈️</div>
            <div class="text-xl font-bold mt-2">{{ data.equivalent.flights_fra_pmi.toFixed(2) }}</div>
            <div class="text-xs text-gray-400">{{ $t('co2.flightsEquiv') }}</div>
          </div>
        </div>
      </div>

      <div class="card bg-gray-800/50">
        <details>
          <summary class="cursor-pointer text-sm text-gray-400">{{ $t('co2.methodology') }}</summary>
          <div class="text-xs text-gray-500 mt-2 space-y-1">
            <p>{{ $t('co2.assumption1') }} {{ data.assumptions.grid_co2_g_per_kwh }} g CO₂/kWh</p>
            <p>{{ $t('co2.assumption2') }} {{ data.assumptions.ice_liters_per_100km }} l/100 km ({{ data.assumptions.ice_co2_g_per_km }} g CO₂/km)</p>
            <p class="text-gray-600">{{ data.assumptions.source }}</p>
          </div>
        </details>
      </div>
    </template>

    <div v-else class="card text-center py-10 text-gray-400">{{ $t('co2.noData') }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../api';
import { useAppStore } from '../store';

const app = useAppStore();
const days = ref(365);
const data = ref(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const params = { days: days.value };
    if (app.selectedVehicle?.id) params.vehicle_id = app.selectedVehicle.id;
    const r = await api.get('/co2/summary', { params });
    data.value = r.data;
  } catch {
    data.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => app.selectedVehicle?.id, load);
</script>

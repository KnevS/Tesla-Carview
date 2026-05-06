<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Fahrten</h1>
      <div class="text-sm text-gray-400">{{ trips.length }} Fahrten geladen</div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Gesamt km" :value="fmt(stats.total_km, 0) + ' km'" icon="🛣️"
        tooltip="Summe aller aufgezeichneten Fahrtkilometer" />
      <StatCard label="Ø Verbrauch" :value="fmt(stats.avg_consumption, 1) + ' kWh/100km'" icon="⚡"
        tooltip="Durchschnittlicher Energieverbrauch pro 100 km über alle Fahrten. Tesla-Schnitt: 15–20 kWh/100km. Höher im Winter, niedriger im Sommer." />
      <StatCard label="Ø Streckenlänge" :value="fmt(stats.avg_km, 1) + ' km'" icon="📍"
        tooltip="Durchschnittliche Länge einer Einzelfahrt" />
      <StatCard label="Gesamt Energie" :value="fmt(stats.total_energy_kwh, 1) + ' kWh'" icon="🔋"
        tooltip="Summe der verbrauchten Energie über alle Fahrten" />
    </div>

    <div class="space-y-3">
      <div v-if="loading" class="text-gray-400">Lade Fahrten...</div>
      <RouterLink v-for="trip in trips" :key="trip.id" :to="'/trips/' + trip.id"
        v-tooltip="'Klicken für Detailansicht: GPS-Karte, Geschwindigkeitskurve, Verbrauch'"
        class="card block hover:bg-gray-600 transition cursor-pointer"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-tesla-red font-semibold text-sm">{{ fmtDate(trip.start_time) }}</span>
              <span class="text-gray-400 text-sm">{{ fmtTime(trip.start_time) }}</span>
            </div>
            <p class="font-medium truncate mt-0.5">
              {{ trip.start_address || 'Start' }} → {{ trip.end_address || 'Ziel' }}
            </p>
          </div>
          <div class="flex gap-6 text-sm text-right ml-4">
            <div>
              <p class="text-gray-400">Strecke</p>
              <p class="font-semibold">{{ fmt(trip.distance_km, 1) }} km</p>
            </div>
            <div class="hidden md:block">
              <p class="text-gray-400">Verbrauch</p>
              <p class="font-semibold">
                {{ trip.distance_km ? fmt(trip.energy_used_kwh / trip.distance_km * 100, 1) : '–' }} kWh/100km
              </p>
            </div>
            <div class="hidden md:block">
              <p class="text-gray-400">SoC</p>
              <p class="font-semibold">{{ trip.start_soc }}% → {{ trip.end_soc }}%</p>
            </div>
          </div>
        </div>
      </RouterLink>
    </div>

    <button v-if="trips.length >= limit" @click="loadMore" class="btn-secondary w-full"
      v-tooltip="'Lädt die nächsten 50 Fahrten nach'">
      Mehr laden
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import api from '../api.js';

const appStore = useAppStore();
const trips = ref([]);
const stats = ref({});
const loading = ref(true);
const limit = ref(50);

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDate = ts => new Date(ts * 1000).toLocaleDateString('de-DE');
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = { limit: limit.value, ...(vid ? { vehicle_id: vid } : {}) };
  const [t, s] = await Promise.all([api.get('/trips', { params }), api.get('/trips/stats', { params })]);
  trips.value = t.data;
  stats.value = s.data;
  loading.value = false;
}

async function loadMore() {
  limit.value += 50;
  await load();
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

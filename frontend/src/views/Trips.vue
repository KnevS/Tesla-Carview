<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Fahrten</h1>
      <div class="flex items-center gap-3">
        <select v-model="filterType" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">Alle Typen</option>
          <option value="private">Privatfahrten</option>
          <option value="business">Dienstfahrten</option>
          <option value="commute">Arbeitswege</option>
        </select>
        <div class="text-sm text-gray-400">{{ trips.length }} Fahrten</div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Gesamt km"      :value="fmt(stats.total_km, 0) + ' km'"          icon="🛣️" tooltip="Summe aller aufgezeichneten Fahrtkilometer" />
      <StatCard label="Ø Verbrauch"    :value="fmt(stats.avg_consumption, 1) + ' kWh/100km'" icon="⚡" tooltip="Durchschnittlicher Energieverbrauch pro 100 km" />
      <StatCard label="Privatfahrten"  :value="fmt(stats.private_km, 0) + ' km'"         icon="🏠" tooltip="Kilometerleistung als Privatfahrten klassifiziert" />
      <StatCard label="Dienstfahrten"  :value="fmt(stats.business_km + stats.commute_km, 0) + ' km'" icon="💼" tooltip="Dienstfahrten + Arbeitswege" />
    </div>

    <div class="space-y-2">
      <div v-if="loading" class="text-gray-400">Lade Fahrten...</div>

      <div v-for="trip in trips" :key="trip.id" class="card hover:bg-gray-600 transition">
        <div class="flex items-center gap-3">
          <!-- Typ-Badge (klickbar zum Wechseln) -->
          <button @click.stop="cycleType(trip)"
            :class="typeBadge(trip.trip_type)"
            class="flex-shrink-0 w-24 text-xs font-semibold px-2 py-1 rounded-full text-center transition"
            v-tooltip="'Klicken um Fahrtentyp zu ändern'">
            {{ typeLabel(trip.trip_type) }}
          </button>

          <!-- Fahrt-Info (klickbar zur Detailansicht) -->
          <RouterLink :to="'/trips/' + trip.id" class="flex-1 min-w-0 flex items-center gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-tesla-red font-semibold text-sm">{{ fmtDate(trip.start_time) }}</span>
                <span class="text-gray-400 text-sm">{{ fmtTime(trip.start_time) }}</span>
              </div>
              <p class="font-medium truncate mt-0.5">
                {{ trip.start_address || 'Start' }} → {{ trip.end_address || 'Ziel' }}
              </p>
              <p v-if="trip.purpose" class="text-xs text-gray-400 truncate mt-0.5 italic">{{ trip.purpose }}</p>
            </div>
            <div class="flex gap-4 text-sm text-right ml-2 flex-shrink-0">
              <div>
                <p class="text-gray-400">Strecke</p>
                <p class="font-semibold">{{ fmt(trip.distance_km, 1) }} km</p>
              </div>
              <div class="hidden md:block">
                <p class="text-gray-400">Verbrauch</p>
                <p class="font-semibold">{{ trip.distance_km ? fmt(trip.energy_used_kwh / trip.distance_km * 100, 1) : '–' }} kWh/100km</p>
              </div>
              <div class="hidden md:block">
                <p class="text-gray-400">SoC</p>
                <p class="font-semibold">{{ trip.start_soc ?? '–' }}% → {{ trip.end_soc ?? '–' }}%</p>
              </div>
            </div>
          </RouterLink>
        </div>

        <!-- Zweck-Eingabe (erscheint bei Nicht-Privat) -->
        <div v-if="trip.trip_type !== 'private'" class="mt-2 ml-28">
          <input
            :value="trip.purpose"
            @change="e => savePurpose(trip, e.target.value)"
            @click.stop
            type="text"
            placeholder="Fahrtzweck eingeben (z.B. Kundenbesuch, Dienstreise)…"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red"
          />
        </div>
      </div>
    </div>

    <button v-if="trips.length >= limit" @click="loadMore" class="btn-secondary w-full">
      Mehr laden
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import api from '../api.js';

const appStore   = useAppStore();
const trips      = ref([]);
const stats      = ref({});
const loading    = ref(true);
const limit      = ref(50);
const filterType = ref('');

const TYPES = ['private', 'business', 'commute'];

const fmt     = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDate = ts => new Date(ts * 1000).toLocaleDateString('de-DE');
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

const typeLabel = t => ({ private: 'Privat', business: 'Dienstfahrt', commute: 'Arbeitsweg' }[t] ?? 'Privat');
const typeBadge = t => ({
  private:  'bg-gray-600 text-gray-200 hover:bg-gray-500',
  business: 'bg-blue-900 text-blue-200 hover:bg-blue-800',
  commute:  'bg-green-900 text-green-200 hover:bg-green-800',
}[t] ?? 'bg-gray-600 text-gray-200');

async function classify(trip, type, purpose) {
  trip.trip_type = type;
  if (purpose !== undefined) trip.purpose = purpose;
  await api.patch(`/trips/${trip.id}/classify`, { trip_type: type, purpose: trip.purpose ?? null });
  await loadStats();
}

async function cycleType(trip) {
  const next = TYPES[(TYPES.indexOf(trip.trip_type) + 1) % TYPES.length];
  await classify(trip, next);
}

async function savePurpose(trip, purpose) {
  await classify(trip, trip.trip_type, purpose);
}

async function loadStats() {
  const vid = appStore.selectedVehicle?.id;
  const params = vid ? { vehicle_id: vid } : {};
  const { data } = await api.get('/trips/stats', { params });
  stats.value = data;
}

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = { limit: limit.value, ...(vid ? { vehicle_id: vid } : {}), ...(filterType.value ? { trip_type: filterType.value } : {}) };
  const [t, s] = await Promise.all([api.get('/trips', { params }), api.get('/trips/stats', { params: vid ? { vehicle_id: vid } : {} })]);
  trips.value = t.data;
  stats.value = s.data;
  loading.value = false;
}

async function loadMore() { limit.value += 50; await load(); }

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

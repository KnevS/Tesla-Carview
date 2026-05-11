<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h1 class="text-2xl font-bold">Fahrten</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <select v-model="filterType" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">Alle Typen</option>
          <option value="private">Privatfahrten</option>
          <option value="business">Dienstfahrten</option>
          <option value="commute">Arbeitswege</option>
        </select>
        <select v-model="filterDriver" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">Alle Fahrer</option>
          <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
          <option value="null">Kein Fahrer</option>
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
        <div class="flex items-start gap-3">
          <!-- Linke Spalte: Typ + Fahrer -->
          <div class="flex flex-col gap-1.5 flex-shrink-0 w-24">
            <button @click.stop="cycleType(trip)"
              :class="typeBadge(trip.trip_type)"
              class="w-full text-xs font-semibold px-2 py-1 rounded-full text-center transition"
              v-tooltip="'Klicken um Fahrtentyp zu ändern'">
              {{ typeLabel(trip.trip_type) }}
            </button>

            <!-- Fahrer-Badge -->
            <div class="relative">
              <button @click.stop="toggleDriverMenu(trip.id)"
                class="w-full text-xs px-2 py-1 rounded-full text-center transition border"
                :style="driverBadgeStyle(trip)"
                v-tooltip="'Fahrer zuweisen'">
                {{ trip.driver_name || '– Fahrer' }}
              </button>
              <!-- Fahrer-Dropdown — z-50 + shadow-2xl, damit es zuverlaessig
                   ueber nachfolgenden Trip-Karten / Tooltips / Toasts
                   liegt und nicht halb verdeckt wirkt. Vorher z-20 lag
                   unter der z-40 von Notifikations-Toasts. -->
              <div v-if="openDriverMenu === trip.id"
                class="absolute left-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl min-w-max py-1"
                @click.stop>
                <button
                  class="block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700 text-gray-400"
                  @click="setDriver(trip, null)">
                  – Kein Fahrer
                </button>
                <button v-for="d in drivers" :key="d.id"
                  class="flex items-center gap-2 w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700"
                  :class="trip.driver_id === d.id ? 'text-white font-semibold' : 'text-gray-300'"
                  @click="setDriver(trip, d)">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: d.color }"></span>
                  {{ d.name }}
                </button>
              </div>
            </div>
          </div>

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

const appStore    = useAppStore();
const trips       = ref([]);
const stats       = ref({});
const drivers     = ref([]);
const loading     = ref(true);
const limit       = ref(50);
const filterType  = ref('');
const filterDriver = ref('');
const openDriverMenu = ref(null);

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

function driverBadgeStyle(trip) {
  if (!trip.driver_id || !trip.driver_color) {
    return 'border-color: #4b5563; color: #9ca3af; background: transparent;';
  }
  return `border-color: ${trip.driver_color}55; color: ${trip.driver_color}; background: ${trip.driver_color}18;`;
}

function toggleDriverMenu(tripId) {
  openDriverMenu.value = openDriverMenu.value === tripId ? null : tripId;
}

function closeMenus() { openDriverMenu.value = null; }

async function setDriver(trip, driver) {
  trip.driver_id    = driver?.id    ?? null;
  trip.driver_name  = driver?.name  ?? null;
  trip.driver_color = driver?.color ?? null;
  openDriverMenu.value = null;
  await api.patch(`/trips/${trip.id}/driver`, { driver_id: driver?.id ?? null });
}

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
  const params = {
    limit: limit.value,
    ...(vid           ? { vehicle_id: vid }          : {}),
    ...(filterType.value   ? { trip_type: filterType.value }   : {}),
    ...(filterDriver.value ? { driver_id: filterDriver.value } : {}),
  };
  const [t, s] = await Promise.all([
    api.get('/trips', { params }),
    api.get('/trips/stats', { params: vid ? { vehicle_id: vid } : {} }),
  ]);
  trips.value   = t.data;
  stats.value   = s.data;
  loading.value = false;
}

async function loadMore() { limit.value += 50; await load(); }

onMounted(async () => {
  const { data } = await api.get('/drivers');
  drivers.value = data;
  await load();
});
watch(() => appStore.selectedVehicleId, load);

// Dropdown schließen bei Klick außerhalb
if (typeof window !== 'undefined') {
  window.addEventListener('click', closeMenus);
}
</script>

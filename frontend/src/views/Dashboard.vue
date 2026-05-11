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
      <!-- Tiles sind klickbar — fuehren in die jeweilige Detail-Ansicht.
           Hover blendet einen kleinen Pfeil ein als Affordanz. -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        <StatCard label="Gesamtstrecke"
          :value="fmt(stats.total_km, 0) + ' km'"
          icon="🛣️"
          to="/trips"
          tooltip="Summe aller aufgezeichneten Fahrtkilometer für das aktuell gewählte Fahrzeug. Klick: alle Fahrten anzeigen." />
        <StatCard label="Fahrten"
          :value="stats.total_trips"
          icon="🗺️"
          to="/trips"
          tooltip="Anzahl der vom System automatisch erkannten Einzelfahrten (jede Fahrt von Park bis Park). Klick: Fahrtenliste." />
        <StatCard label="Geladen"
          :value="fmt(chargingStats.total_energy_kwh, 1) + ' kWh'"
          icon="⚡"
          to="/charging"
          tooltip="Insgesamt nachgeladene Energie über alle Ladesessions. Klick: Ladestatistik." />
        <StatCard label="Ladekosten"
          :value="fmt(chargingStats.total_cost, 2) + ' €'"
          icon="💶"
          to="/charging"
          tooltip="Summierte Kosten aller Ladevorgänge mit hinterlegtem Preis. Bei kostenlosen oder unbekannten Ladungen wird 0 € angesetzt. Klick: Ladestatistik." />
      </div>

      <!-- Wartungs-Vorschau: ueberfaellige + bald faellige Eintraege.
           Quelle: /api/service-intervals. Klick auf einen Eintrag fuehrt
           ins Betriebsbuch, wo der User „erledigt"-stempeln, snoozen
           oder Intervall anpassen kann. -->
      <div v-if="dueServices.length" class="card border border-yellow-700/40 bg-yellow-900/10">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          🔧 Wartungs-Vorschau
          <span class="text-xs text-gray-400 font-normal">({{ dueServices.length }})</span>
        </h2>
        <div class="space-y-2">
          <div v-for="s in dueServices" :key="s.id"
               class="flex items-center justify-between gap-3 text-sm">
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate" :class="s.status === 'overdue' ? 'text-red-300' : 'text-yellow-200'">
                {{ s.label }}
              </p>
              <p class="text-xs text-gray-400">
                <span v-if="s.days_until_due != null">
                  {{ s.days_until_due < 0 ? `${-s.days_until_due} Tage überfällig` : `in ${s.days_until_due} Tagen` }}
                </span>
                <span v-if="s.km_until_due != null" class="ml-2">
                  · {{ s.km_until_due < 0 ? `${-s.km_until_due} km überfällig` : `noch ${s.km_until_due} km` }}
                </span>
                <span v-if="s.days_until_due == null && s.km_until_due == null" class="italic">
                  noch kein „erledigt"-Eintrag
                </span>
              </p>
            </div>
            <RouterLink to="/logbook#service-intervals"
              class="text-xs text-tesla-red hover:underline whitespace-nowrap">
              Pflegen →
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-if="lastTrip" class="card" v-reveal>
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

      <TariffWidget />
      <TeslaUsageWidget />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import TeslaUsageWidget from '../components/TeslaUsageWidget.vue';
import TariffWidget     from '../components/TariffWidget.vue';
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
// Wartungs-Vorschau: nur die ueberfaelligen + bald-faelligen Eintraege.
// computeStatus liefert vom Backend bereits 'overdue' / 'soon' / 'ok'
// / 'pending' / 'snoozed'; wir filtern hier auf das, was Aufmerksamkeit
// braucht — pending zeigen wir bewusst nicht im Dashboard, weil das
// erste Anlegen den User nicht ueberfordern soll.
const dueServices = ref([]);

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

  // Wartungs-Vorschau parallel laden (nicht blockierend).
  api.get('/service-intervals', { params }).then(r => {
    dueServices.value = r.data.filter(s => ['overdue', 'soon'].includes(s.status));
  }).catch(() => { dueServices.value = []; });

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

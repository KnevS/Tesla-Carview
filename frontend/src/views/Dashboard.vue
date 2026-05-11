<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ $t('dashboard.title') }}</h1>

    <div v-if="loading" class="text-gray-400">{{ $t('dashboard.loading') }}</div>

    <!-- Kein Fahrzeug verbunden -->
    <div v-else-if="!appStore.selectedVehicle" class="card text-center space-y-4 py-10">
      <AppIcon name="steering" :size="64" class="text-tesla-red mx-auto" />
      <h2 class="text-xl font-semibold">{{ $t('dashboard.noVehicle') }}</h2>
      <p class="text-gray-400 text-sm">{{ $t('dashboard.connectHintDot') }}</p>
      <button @click="connectTesla" class="btn-primary"
        v-tooltip="$t('dashboard.connectTooltip')">
        {{ $t('dashboard.connectBtn') }}
      </button>
    </div>

    <template v-else>
      <!-- Tiles sind klickbar — fuehren in die jeweilige Detail-Ansicht.
           Hover blendet einen kleinen Pfeil ein als Affordanz. -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        <StatCard :label="$t('dashboard.totalKm')"
          :value="fmt(stats.total_km, 0) + ' km'"
          icon="map"
          to="/trips"
          :tooltip="$t('dashboard.totalKmTooltip')" />
        <StatCard :label="$t('dashboard.trips')"
          :value="stats.total_trips"
          icon="pin"
          to="/trips"
          :tooltip="$t('dashboard.tripsTooltip')" />
        <StatCard :label="$t('dashboard.charged')"
          :value="fmt(chargingStats.total_energy_kwh, 1) + ' kWh'"
          icon="bolt"
          to="/charging"
          :tooltip="$t('dashboard.chargedTooltip')" />
        <StatCard :label="$t('dashboard.chargingCost')"
          :value="fmt(chargingStats.total_cost, 2) + ' €'"
          icon="wallet"
          to="/charging"
          :tooltip="$t('dashboard.chargingCostTooltip')" />
      </div>

      <!-- Wartungs-Vorschau: gesamte Karte fuehrt ins Betriebsbuch zum
           Service-Intervalle-Anker. „Pflegen →" pro Eintrag entfaellt
           damit; redundant, und nested <a> ist invalides HTML. -->
      <RouterLink v-if="dueServices.length"
                  to="/logbook#service-intervals"
                  class="card card-interactive group block no-underline border border-yellow-700/40 bg-yellow-900/10">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          {{ $t('dashboard.serviceTitle') }}
          <span class="text-xs text-gray-400 font-normal">({{ dueServices.length }})</span>
          <span class="ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">{{ $t('dashboard.openLink') }}</span>
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
                  {{ s.days_until_due < 0 ? $t('dashboard.serviceOverdueDays', { n: -s.days_until_due }) : $t('dashboard.serviceInDays', { n: s.days_until_due }) }}
                </span>
                <span v-if="s.km_until_due != null" class="ml-2">
                  · {{ s.km_until_due < 0 ? $t('dashboard.serviceOverdueKm', { n: -s.km_until_due }) : $t('dashboard.serviceKmLeft', { n: s.km_until_due }) }}
                </span>
                <span v-if="s.days_until_due == null && s.km_until_due == null" class="italic">
                  {{ $t('dashboard.serviceNoDone') }}
                </span>
              </p>
            </div>
          </div>
        </div>
      </RouterLink>

      <!-- Letzte Fahrt: gesamte Karte fuehrt zur Detail-Ansicht der
           konkreten Fahrt (nicht nur zur Liste). Tooltip-DIVs bleiben,
           verschachtelte Links wuerden ohnehin nicht funktionieren. -->
      <RouterLink v-if="lastTrip" :to="`/trips/${lastTrip.id}`"
                  class="card card-interactive group block no-underline" v-reveal>
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          {{ $t('dashboard.lastTrip') }}
          <span class="ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">{{ $t('dashboard.openLink') }}</span>
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div v-tooltip="$t('dashboard.fromTooltip')">
            <p class="text-gray-400">{{ $t('dashboard.from') }}</p>
            <p>{{ lastTrip.start_address || $t('dashboard.unknownPlace') }}</p>
          </div>
          <div v-tooltip="$t('dashboard.toTooltip')">
            <p class="text-gray-400">{{ $t('dashboard.toLabel') }}</p>
            <p>{{ lastTrip.end_address || $t('dashboard.unknownPlace') }}</p>
          </div>
          <div v-tooltip="$t('dashboard.distanceTooltip')">
            <p class="text-gray-400">{{ $t('dashboard.distance') }}</p>
            <p>{{ fmt(lastTrip.distance_km, 1) }} km</p>
          </div>
          <div v-tooltip="$t('dashboard.consumptionTooltip')">
            <p class="text-gray-400">{{ $t('dashboard.consumption') }}</p>
            <p>{{ lastTrip.distance_km ? fmt(lastTrip.energy_used_kwh / lastTrip.distance_km * 100, 1) : '–' }} kWh/100km</p>
          </div>
        </div>
      </RouterLink>

      <!-- Monatsuebersicht: Klick fuehrt zur kompletten Fahrtenliste,
           wo der User auch nach Monat filtern und mehr KPIs sehen kann. -->
      <RouterLink to="/trips" class="card card-interactive group block no-underline">
        <h2 class="text-lg font-semibold mb-4 flex items-center gap-2"
          v-tooltip="$t('dashboard.monthlyKmTooltip')">
          {{ $t('dashboard.monthlyKm') }}
          <span class="ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">{{ $t('dashboard.openLink') }}</span>
        </h2>
        <div style="height: 200px">
          <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
        </div>
      </RouterLink>

      <TariffWidget />
      <TeslaUsageWidget />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import TeslaUsageWidget from '../components/TeslaUsageWidget.vue';
import TariffWidget     from '../components/TariffWidget.vue';
import AppIcon          from '../components/AppIcon.vue';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const { t } = useI18n();
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
  allTrips.forEach(tr => {
    const d = new Date(tr.start_time * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + (tr.distance_km || 0);
  });
  const sorted = Object.keys(monthly).sort().slice(-6);
  chartData.value = {
    labels: sorted,
    datasets: [{ label: t('dashboard.monthlyChartLabel'), data: sorted.map(k => monthly[k]), backgroundColor: '#E31937', borderRadius: 6 }],
  };
  loading.value = false;
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

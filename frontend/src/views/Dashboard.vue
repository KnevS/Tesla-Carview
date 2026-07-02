<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
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
      <template v-for="sid in layoutOrder" :key="sid">

        <!-- stats -->
        <SortableSection v-if="sid === 'stats' && show.stats" page-id="dashboard" section-id="stats"
          :title="$t('dashboard.stats')" icon="📊"
          :collapsed="isCollapsed('stats')" @toggle="toggle('stats')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard :label="$t('dashboard.totalKm')"   :value="fmtDistance(stats.total_km || 0, 0)"         icon="map"    to="/trips"    :tooltip="$t('dashboard.totalKmTooltip')" />
            <StatCard :label="$t('dashboard.trips')"      :value="stats.total_trips"                            icon="pin"    to="/trips"    :tooltip="$t('dashboard.tripsTooltip')" />
            <StatCard :label="$t('dashboard.charged')"    :value="fmt(chargingStats.total_energy_kwh, 1) + ' kWh'" icon="bolt" to="/charging" :tooltip="$t('dashboard.chargedTooltip')" />
            <StatCard :label="$t('dashboard.chargingCost')" :value="fmt(chargingStats.total_cost, 2) + ' €'"   icon="wallet" to="/charging" :tooltip="$t('dashboard.chargingCostTooltip')" />
          </div>
        </SortableSection>

        <!-- weekly_insight -->
        <SortableSection v-if="sid === 'weekly_insight' && show.weekly_insight && weeklyInsight && weeklyInsight.insights?.length"
          page-id="dashboard" section-id="weekly_insight"
          :title="$t('dashboard.weeklyInsight')" icon="📋"
          :collapsed="isCollapsed('weekly_insight')" @toggle="toggle('weekly_insight')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="space-y-2">
            <div v-for="ins in weeklyInsight.insights" :key="ins.key"
              class="flex items-start gap-2 text-sm rounded-lg px-3 py-2" :class="insightClass(ins.severity)">
              <span class="mt-0.5">{{ insightIcon(ins.severity) }}</span>
              <span>{{ insightText(ins) }}</span>
            </div>
          </div>
        </SortableSection>

        <!-- eco_score -->
        <SortableSection v-if="sid === 'eco_score' && show.eco_score && ecoScore && ecoScore.enough_data"
          page-id="dashboard" section-id="eco_score"
          :title="$t('dashboard.ecoScore')" icon="🍃"
          :collapsed="isCollapsed('eco_score')" @toggle="toggle('eco_score')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="flex items-center gap-4">
            <div class="relative shrink-0" style="width:72px;height:72px">
              <svg viewBox="0 0 36 36" class="w-full h-full" style="transform:rotate(-90deg)">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#374151" stroke-width="3" />
                <circle cx="18" cy="18" r="15.9155" fill="none" :stroke="ecoRing(ecoScore.band)" stroke-width="3"
                  stroke-linecap="round" :stroke-dasharray="ecoScore.score + ', 100'" />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-lg font-bold" :class="ecoBandCls(ecoScore.band)">{{ ecoScore.score }}</span>
              </div>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold" :class="ecoBandCls(ecoScore.band)">{{ $t('dashboard.ecoBand_' + ecoScore.band) }}</div>
              <div class="text-xs text-gray-400 mt-0.5" :title="$t('dashboard.ecoBasisTooltip')">
                {{ $t('dashboard.ecoBasis', { kwh: ecoScore.stats.kwh_per_100km, base: ecoScore.stats.baseline_kwh_per_100km, n: ecoScore.stats.recent_trips }) }}
              </div>
            </div>
          </div>
          <ul class="mt-3 space-y-1">
            <li v-for="tip in ecoScore.tips" :key="tip.key" class="flex items-start gap-2 text-sm text-gray-300">
              <span class="mt-0.5">💡</span><span>{{ ecoTipText(tip) }}</span>
            </li>
          </ul>
        </SortableSection>

        <!-- service -->
        <SortableSection v-if="sid === 'service' && show.service && dueServices.length" page-id="dashboard" section-id="service"
          :title="$t('dashboard.serviceTitle')" icon="🔧"
          :collapsed="isCollapsed('service')" @toggle="toggle('service')" @move="(f,t,p) => moveSection(f,t,p)">
          <template #badge><span class="text-xs text-yellow-400">({{ dueServices.length }})</span></template>
          <RouterLink to="/logbook#service-intervals" class="block no-underline space-y-2">
            <div v-for="s in dueServices" :key="s.id" class="flex items-center justify-between gap-3 text-sm">
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate" :class="s.status === 'overdue' ? 'text-red-300' : 'text-yellow-200'">{{ s.label }}</p>
                <p class="text-xs text-gray-400">
                  <span v-if="s.days_until_due != null">
                    {{ s.days_until_due < 0 ? $t('dashboard.serviceOverdueDays', { n: -s.days_until_due }) : $t('dashboard.serviceInDays', { n: s.days_until_due }) }}
                  </span>
                  <span v-if="s.km_until_due != null" class="ml-2">
                    · {{ s.km_until_due < 0 ? $t('dashboard.serviceOverdueKm', { n: -s.km_until_due }) : $t('dashboard.serviceKmLeft', { n: s.km_until_due }) }}
                  </span>
                </p>
              </div>
            </div>
          </RouterLink>
        </SortableSection>

        <!-- last_trip -->
        <SortableSection v-if="sid === 'last_trip' && show.last_trip && lastTrip" page-id="dashboard" section-id="last_trip"
          :title="$t('dashboard.lastTrip')" icon="🗺️"
          :collapsed="isCollapsed('last_trip')" @toggle="toggle('last_trip')" @move="(f,t,p) => moveSection(f,t,p)">
          <RouterLink :to="`/trips/${lastTrip.id}`" class="block no-underline">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div v-tooltip="$t('dashboard.fromTooltip')"><p class="text-gray-400">{{ $t('dashboard.from') }}</p><p>{{ lastTrip.start_address || $t('dashboard.unknownPlace') }}</p></div>
              <div v-tooltip="$t('dashboard.toTooltip')"><p class="text-gray-400">{{ $t('dashboard.toLabel') }}</p><p>{{ lastTrip.end_address || $t('dashboard.unknownPlace') }}</p></div>
              <div v-tooltip="$t('dashboard.distanceTooltip')"><p class="text-gray-400">{{ $t('dashboard.distance') }}</p><p>{{ fmtDistance(lastTrip.distance_km) }}</p></div>
              <div v-tooltip="$t('dashboard.consumptionTooltip')"><p class="text-gray-400">{{ $t('dashboard.consumption') }}</p><p>{{ lastTrip.distance_km ? fmtEfficiency(lastTrip.energy_used_kwh / lastTrip.distance_km * 100) : '–' }}</p></div>
            </div>
          </RouterLink>
        </SortableSection>

        <!-- monthly_chart -->
        <SortableSection v-if="sid === 'monthly_chart' && show.monthly_chart" page-id="dashboard" section-id="monthly_chart"
          :title="$t('dashboard.monthlyKm')" icon="📈"
          :collapsed="isCollapsed('monthly_chart')" @toggle="toggle('monthly_chart')" @move="(f,t,p) => moveSection(f,t,p)">
          <div style="height: clamp(160px, 24vh, 280px)">
            <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
          </div>
        </SortableSection>

        <!-- tariff -->
        <SortableSection v-if="sid === 'tariff' && show.tariff" page-id="dashboard" section-id="tariff"
          :title="$t('dashboard.tariff')" icon="⚡"
          :collapsed="isCollapsed('tariff')" @toggle="toggle('tariff')" @move="(f,t,p) => moveSection(f,t,p)">
          <TariffWidget />
        </SortableSection>

        <!-- tesla_usage -->
        <SortableSection v-if="sid === 'tesla_usage' && show.tesla_usage" page-id="dashboard" section-id="tesla_usage"
          :title="$t('dashboard.teslaUsage')" icon="🔌"
          :collapsed="isCollapsed('tesla_usage')" @toggle="toggle('tesla_usage')" @move="(f,t,p) => moveSection(f,t,p)">
          <TeslaUsageWidget />
        </SortableSection>

      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useAppStore } from '../store/index.js';
import { usePrefsStore, useUnits } from '../store/prefs.js';
import StatCard from '../components/StatCard.vue';
import TeslaUsageWidget from '../components/TeslaUsageWidget.vue';
import TariffWidget     from '../components/TariffWidget.vue';
import AppIcon          from '../components/AppIcon.vue';
import SortableSection  from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const { t } = useI18n();
const appStore = useAppStore();
const prefs    = usePrefsStore();
const { fmtDistance, fmtEfficiency } = useUnits();

const DASH_SECTIONS = ['stats', 'weekly_insight', 'eco_score', 'service', 'last_trip', 'monthly_chart', 'tariff', 'tesla_usage'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('dashboard', DASH_SECTIONS);

const show = computed(() => ({
  stats:         prefs.isDashboardCardVisible('stats'),
  weekly_insight: prefs.isDashboardCardVisible('weekly_insight'),
  eco_score:     prefs.isDashboardCardVisible('eco_score'),
  service:       prefs.isDashboardCardVisible('service'),
  last_trip:     prefs.isDashboardCardVisible('last_trip'),
  monthly_chart: prefs.isDashboardCardVisible('monthly_chart'),
  tariff:        prefs.isDashboardCardVisible('tariff'),
  tesla_usage:   prefs.isDashboardCardVisible('tesla_usage'),
}));

const cardOrder = computed(() => prefs.dashboardCards);
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
// Proaktive Wochen-Insights (Drop 04) — regelbasiert, user-gescoped.
const weeklyInsight = ref(null);
const INSIGHT_SEV = {
  good: { cls: 'bg-green-900/30 text-green-200',  icon: '✓'  },
  info: { cls: 'bg-gray-800 text-gray-300',       icon: '•'  },
  warn: { cls: 'bg-yellow-900/30 text-yellow-200', icon: '⚠️' },
};
const insightClass = (s) => (INSIGHT_SEV[s] || INSIGHT_SEV.info).cls;
const insightIcon  = (s) => (INSIGHT_SEV[s] || INSIGHT_SEV.info).icon;
function insightText(ins) {
  let key = 'dashboard.insight_' + ins.key;
  if (ins.key === 'consumptionHigh' && ins.params?.colder) key = 'dashboard.insight_consumptionHighCold';
  return t(key, ins.params || {});
}

// Fahrstil-/Effizienz-Score (S07) — relativ zum eigenen Langzeit-Schnitt.
const ecoScore = ref(null);
const ECO_BAND = {
  excellent: { cls: 'text-green-300',  ring: '#22c55e' },
  good:      { cls: 'text-lime-300',   ring: '#84cc16' },
  ok:        { cls: 'text-yellow-300', ring: '#eab308' },
  poor:      { cls: 'text-orange-300', ring: '#f97316' },
};
const ecoBandCls  = (b) => (ECO_BAND[b] || ECO_BAND.ok).cls;
const ecoRing     = (b) => (ECO_BAND[b] || ECO_BAND.ok).ring;
const ecoTipText  = (tip) => t('dashboard.ecoTip_' + tip.key, tip.params || {});

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

  // Wochen-Insights (user-gescoped, kein vehicle_id nötig) — nicht blockierend.
  api.get('/insights/weekly').then(r => { weeklyInsight.value = r.data; })
    .catch(() => { weeklyInsight.value = null; });

  // Fahrstil-/Effizienz-Score (user-gescoped) — nicht blockierend.
  api.get('/insights/eco-score').then(r => { ecoScore.value = r.data; })
    .catch(() => { ecoScore.value = null; });

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

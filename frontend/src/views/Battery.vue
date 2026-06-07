<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">{{ $t('battery.title') }}</h1>

    <template v-for="sid in layoutOrder" :key="sid">

    <SortableSection v-if="sid === 'range'" page-id="battery" section-id="range"
      :title="$t('battery.rangeHistoryDays', { days })" icon="📈"
      :collapsed="isCollapsed('range')" @toggle="toggle('range')" @move="(f,t,p) => moveSection(f,t,p)">
      <div class="flex gap-2 mb-4">
        <button v-for="d in dayRanges" :key="d.value"
          @click="days = d.value; load()"
          v-tooltip="d.tooltip"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="days === d.value ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'"
        >{{ d.value }}{{ $t('battery.daySuffix') }}</button>
      </div>
      <div style="height: clamp(180px, 28vh, 340px)">
        <Line v-if="chartData" :data="chartData" :options="chartOpts" />
      </div>
    </SortableSection>

    <SortableSection v-if="sid === 'degradation'" page-id="battery" section-id="degradation"
      :title="$t('battery.degradationOverview')" icon="🔋"
      :collapsed="isCollapsed('degradation')" @toggle="toggle('degradation')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="degradation.length > 1" class="grid grid-cols-3 gap-4 text-center">
        <div v-tooltip="$t('battery.tooltipFirst')">
          <p class="text-gray-400 text-sm">{{ $t('battery.firstMeasurement') }}</p>
          <p class="text-xl font-bold">{{ fmtDistance(degradation[0]?.max_range || 0, 0) }}</p>
          <p class="text-gray-400 text-xs">{{ degradation[0]?.day }}</p>
        </div>
        <div v-tooltip="$t('battery.tooltipLast')">
          <p class="text-gray-400 text-sm">{{ $t('battery.lastMeasurement') }}</p>
          <p class="text-xl font-bold">{{ fmtDistance(degradation.at(-1)?.max_range || 0, 0) }}</p>
          <p class="text-gray-400 text-xs">{{ degradation.at(-1)?.day }}</p>
        </div>
        <div v-tooltip="$t('battery.tooltipDegradation')">
          <p class="text-gray-400 text-sm">{{ $t('battery.degradation') }}</p>
          <p class="text-xl font-bold"
            :class="degradationPct > 10 ? 'text-red-400' : degradationPct > 5 ? 'text-yellow-400' : 'text-green-400'"
          >{{ fmt(degradationPct, 1) }}%</p>
        </div>
      </div>
      <p v-else class="text-gray-400">{{ $t('battery.noDataLong') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'chargingCurve'" page-id="battery" section-id="chargingCurve"
      :title="$t('battery.chargingCurve')" icon="⚡"
      :collapsed="isCollapsed('chargingCurve')" @toggle="toggle('chargingCurve')" @move="(f,t,p) => moveSection(f,t,p)">
      <p class="text-gray-400 text-xs mb-3" v-tooltip="$t('battery.chargingCurveTooltip')">
        {{ $t('battery.chargingCurveHint') }}
      </p>
      <div v-if="chargingCurve?.aggregate?.length" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div v-for="band in chargingCurve.aggregate" :key="band.band"
          class="bg-gray-800 rounded-lg p-3 text-center">
          <p class="text-gray-400 text-xs">{{ band.band }}</p>
          <p class="text-xl font-bold">
            {{ band.avg_max_kw != null ? band.avg_max_kw + ' kW' : '–' }}
          </p>
          <p class="text-gray-500 text-xs">{{ band.sessions }} {{ $t('battery.sessionsShort') }}</p>
        </div>
      </div>
      <div v-if="chargingCurve?.sessions?.length" style="height: clamp(180px, 28vh, 340px)">
        <Scatter v-if="curveChart" :data="curveChart" :options="curveOpts" />
      </div>
      <p v-else class="text-gray-400 text-sm">{{ $t('battery.noChargingData') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'efficiencyTemp'" page-id="battery" section-id="efficiencyTemp"
      :title="$t('battery.efficiencyTemp')" icon="🌡️"
      :collapsed="isCollapsed('efficiencyTemp')" @toggle="toggle('efficiencyTemp')" @move="(f,t,p) => moveSection(f,t,p)">
      <p class="text-gray-400 text-xs mb-3" v-tooltip="$t('battery.efficiencyTempTooltip')">
        {{ $t('battery.efficiencyTempHint') }}
      </p>
      <div v-if="efficiencyTemp?.buckets?.length" style="height: clamp(180px, 28vh, 340px)">
        <Bar v-if="effChart" :data="effChart" :options="effOpts" />
      </div>
      <p v-else class="text-gray-400 text-sm">{{ $t('battery.noTempData') }}</p>
      <p v-if="efficiencyTemp?.total_trips" class="text-gray-500 text-xs mt-2">
        {{ $t('battery.basedOnTrips', { n: efficiencyTemp.total_trips }) }}
      </p>
    </SortableSection>

    <SortableSection v-if="sid === 'phantomDrain'" page-id="battery" section-id="phantomDrain"
      :title="$t('battery.phantomDrain')" icon="👻"
      :collapsed="isCollapsed('phantomDrain')" @toggle="toggle('phantomDrain')" @move="(f,t,p) => moveSection(f,t,p)">
      <p class="text-gray-400 text-xs mb-3" v-tooltip="$t('battery.phantomDrainTooltip')">
        {{ $t('battery.phantomDrainHint') }}
      </p>
      <div v-if="phantomDrain?.summary?.count" class="grid grid-cols-3 gap-3 mb-4">
        <div class="bg-gray-800 rounded-lg p-3 text-center">
          <p class="text-gray-400 text-xs">{{ $t('battery.events') }}</p>
          <p class="text-xl font-bold">{{ phantomDrain.summary.count }}</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3 text-center">
          <p class="text-gray-400 text-xs">{{ $t('battery.medianLoss') }}</p>
          <p class="text-xl font-bold">{{ phantomDrain.summary.median_pct_per_h }}%/h</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3 text-center">
          <p class="text-gray-400 text-xs">{{ $t('battery.avgLoss') }}</p>
          <p class="text-xl font-bold">{{ phantomDrain.summary.avg_pct_per_h }}%/h</p>
        </div>
      </div>
      <table v-if="phantomDrain?.events?.length" class="w-full text-sm">
        <thead><tr class="text-gray-400">
          <th class="text-left py-1">{{ $t('battery.when') }}</th>
          <th class="text-right py-1">{{ $t('battery.duration') }}</th>
          <th class="text-right py-1">{{ $t('battery.lossSoc') }}</th>
          <th class="text-right py-1">{{ $t('battery.lossRate') }}</th>
        </tr></thead>
        <tbody>
          <tr v-for="ev in phantomDrain.events.slice(0, 10)" :key="ev.from_ts" class="border-t border-gray-700">
            <td class="py-1">{{ fmtDate(ev.to_ts) }}</td>
            <td class="text-right">{{ ev.hours }} h</td>
            <td class="text-right">{{ ev.soc_loss }}%</td>
            <td class="text-right" :class="ev.pct_per_hour > 1 ? 'text-yellow-400' : ''">
              {{ ev.pct_per_hour }}%/h
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!phantomDrain?.summary?.count" class="text-gray-400 text-sm">
        {{ $t('battery.noPhantomData') }}
      </p>
    </SortableSection>

    <SortableSection v-if="sid === 'anomalies'" page-id="battery" section-id="anomalies"
      :title="$t('battery.anomalies')" icon="🔍"
      :collapsed="isCollapsed('anomalies')" @toggle="toggle('anomalies')" @move="(f,t,p) => moveSection(f,t,p)">
      <p class="text-gray-400 text-xs mb-3" v-tooltip="$t('battery.anomaliesTooltip')">
        {{ $t('battery.anomaliesHint') }}
      </p>
      <p v-if="anomalies?.total" class="text-yellow-400 text-sm mb-2">
        {{ $t('battery.foundAnomalies', { n: anomalies.total }) }}
      </p>
      <table v-if="anomalies?.anomalies?.length" class="w-full text-sm">
        <thead><tr class="text-gray-400">
          <th class="text-left py-1">{{ $t('battery.when') }}</th>
          <th class="text-left py-1">{{ $t('battery.kind') }}</th>
          <th class="text-left py-1">{{ $t('battery.detail') }}</th>
        </tr></thead>
        <tbody>
          <tr v-for="a in anomalies.anomalies.slice(0, 15)" :key="a.timestamp + a.type" class="border-t border-gray-700">
            <td class="py-1">{{ fmtDate(a.timestamp) }}</td>
            <td>{{ $t('battery.anom_' + a.type) }}</td>
            <td class="text-gray-300">
              <span v-if="a.type === 'soc_jump'">{{ a.soc_from }}% → {{ a.soc_to }}% ({{ a.window_min }} min)</span>
              <span v-else-if="a.type === 'range_jump'">{{ a.range_from }} → {{ a.range_to }} km</span>
              <span v-else-if="a.type === 'efficiency_outlier'">{{ a.kwh_per_100km }} kWh/100km, {{ a.distance_km }} km</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!anomalies?.total" class="text-green-400 text-sm">{{ $t('battery.noAnomalies') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'companionAlerts'" page-id="battery" section-id="companionAlerts"
      :title="$t('battery.companionAlerts')" icon="🛎️"
      :collapsed="isCollapsed('companionAlerts')" @toggle="toggle('companionAlerts')" @move="(f,t,p) => moveSection(f,t,p)">
      <p class="text-gray-400 text-xs mb-3" v-tooltip="$t('battery.companionAlertsTooltip')">
        {{ $t('battery.companionAlertsHint') }}
      </p>
      <div v-if="companionAlerts?.length" class="space-y-2">
        <div v-for="a in companionAlerts" :key="a.id"
          class="bg-gray-800 rounded-lg p-3 flex items-start gap-3"
          :class="a.status === 'seen' ? 'opacity-60' : ''">
          <span class="text-2xl">{{ alertIcon(a.type) }}</span>
          <div class="flex-1">
            <p class="font-semibold">{{ $t('battery.anom_' + a.type) }} · {{ a.display_name }}</p>
            <p class="text-gray-400 text-xs">{{ fmtDate(a.occurred_at) }}</p>
            <p class="text-sm text-gray-300">
              <span v-if="a.type === 'soc_jump'">{{ a.details.soc_from }} % → {{ a.details.soc_to }} % ({{ a.details.window_min }} min)</span>
              <span v-else-if="a.type === 'range_jump'">{{ a.details.range_from }} → {{ a.details.range_to }} km</span>
              <span v-else-if="a.type === 'phantom_spike'">{{ a.details.soc_loss }} % in {{ a.details.hours }} h ({{ a.details.pct_per_hour }} %/h)</span>
              <span v-else-if="a.type === 'efficiency_outlier'">{{ a.details.kwh_per_100km }} kWh/100km auf {{ a.details.distance_km }} km</span>
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <button v-if="a.status !== 'seen'" @click="markSeen(a.id)"
              v-tooltip="$t('battery.markSeen')"
              class="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1">✓</button>
            <button @click="dismissAlert(a.id)"
              v-tooltip="$t('battery.dismiss')"
              class="text-xs bg-gray-700 hover:bg-red-700 rounded px-2 py-1">✕</button>
          </div>
        </div>
      </div>
      <p v-else class="text-green-400 text-sm">{{ $t('battery.noCompanionAlerts') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'precondition'" page-id="battery" section-id="precondition"
      :title="$t('battery.precondition')" icon="🌡️"
      :collapsed="isCollapsed('precondition')" @toggle="toggle('precondition')" @move="(f,t,p) => moveSection(f,t,p)">
      <p class="text-gray-400 text-xs mb-3" v-tooltip="$t('battery.preconditionTooltip')">
        {{ $t('battery.preconditionHint') }}
      </p>
      <div v-if="preconditionSuggestions?.length" class="space-y-2">
        <div v-for="s in preconditionSuggestions" :key="s.id"
          class="bg-gray-800 rounded-lg p-3 flex items-start gap-3">
          <span class="text-2xl">{{ s.reason_code === 'cold' ? '❄️' : '☀️' }}</span>
          <div class="flex-1">
            <p class="font-semibold">{{ s.details.vehicle_label }} · {{ s.for_date }}</p>
            <p class="text-sm text-gray-300">
              {{ $t('battery.preconditionAt', {
                temp: s.expected_temp_c.toFixed(1),
                time: s.expected_departure_hhmm,
              }) }}
            </p>
            <p class="text-gray-400 text-xs">
              {{ s.reason_code === 'cold' ? $t('battery.preconditionCold') : $t('battery.preconditionHot') }}
            </p>
          </div>
          <button @click="dismissSuggestion(s.id)"
            v-tooltip="$t('battery.dismiss')"
            class="text-xs bg-gray-700 hover:bg-red-700 rounded px-2 py-1">✕</button>
        </div>
      </div>
      <p v-else class="text-gray-400 text-sm">{{ $t('battery.noPreconditionSuggestions') }}</p>
    </SortableSection>

    </template><!-- end v-for layoutOrder -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Line, Scatter, Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler } from 'chart.js';
import { useAppStore } from '../store/index.js';
import { useUnits } from '../store/prefs.js';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler);

const { t, locale } = useI18n();
const appStore = useAppStore();
const { fmtDistance } = useUnits();

const BATTERY_SECTIONS = ['range', 'degradation', 'chargingCurve', 'efficiencyTemp', 'phantomDrain', 'anomalies', 'companionAlerts', 'precondition'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('battery', BATTERY_SECTIONS);

const days = ref(90);
const degradation = ref([]);
const chartData = ref(null);
const chargingCurve = ref(null);
const efficiencyTemp = ref(null);
const phantomDrain = ref(null);
const anomalies = ref(null);
const companionAlerts = ref([]);
const preconditionSuggestions = ref([]);

const ALERT_ICON = {
  soc_jump: '⚡',
  range_jump: '📏',
  phantom_spike: '👻',
  efficiency_outlier: '📊',
};
const alertIcon = (t) => ALERT_ICON[t] || '🔍';

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDate = (ts) => new Date(ts * 1000).toLocaleString(locale.value, {
  year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
});

const dayRanges = computed(() => [
  { value: 30,  tooltip: t('battery.range30')  },
  { value: 90,  tooltip: t('battery.range90')  },
  { value: 180, tooltip: t('battery.range180') },
  { value: 365, tooltip: t('battery.range365') },
]);

const degradationPct = computed(() => {
  if (degradation.value.length < 2) return 0;
  const first = degradation.value[0].max_range;
  const last  = degradation.value.at(-1).max_range;
  return ((first - last) / first) * 100;
});

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#9ca3af' } } },
  scales: {
    x: { ticks: { color: '#9ca3af', maxTicksLimit: 10 }, grid: { color: '#374151' } },
    y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
  },
};

const curveChart = computed(() => {
  const sessions = chargingCurve.value?.sessions || [];
  if (!sessions.length) return null;
  return {
    datasets: [{
      label: t('battery.maxKwLabel'),
      data: sessions.map(s => ({ x: s.start_soc, y: s.max_power_kw || s.avg_power_kw })),
      backgroundColor: 'rgba(239,68,68,0.6)',
      borderColor: '#ef4444',
    }],
  };
});
const curveOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#9ca3af' } } },
  scales: {
    x: { title: { display: true, text: t('battery.startSoc'), color: '#9ca3af' },
         min: 0, max: 100, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
    y: { title: { display: true, text: 'kW', color: '#9ca3af' },
         beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
  },
}));

const effChart = computed(() => {
  const buckets = efficiencyTemp.value?.buckets || [];
  if (!buckets.length) return null;
  return {
    labels: buckets.map(b => b.temp_label),
    datasets: [{
      label: 'kWh / 100 km',
      data: buckets.map(b => b.kwh_per_100km),
      backgroundColor: buckets.map(b => b.temp_min < 5 ? '#3b82f6'
        : b.temp_min < 20 ? '#10b981' : '#f59e0b'),
    }],
  };
});
const effOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#9ca3af' } } },
  scales: {
    x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
    y: { title: { display: true, text: 'kWh / 100 km', color: '#9ca3af' },
         beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
  },
}));

async function load() {
  const vid = appStore.selectedVehicle?.id;
  const vParam = vid ? { vehicle_id: vid } : {};
  const params = { days: days.value, ...vParam };

  const [deg, curve, eff, phan, anom, persisted, preCond] = await Promise.all([
    api.get('/battery/degradation', { params }).catch(() => ({ data: [] })),
    api.get('/battery/charging-curve', { params: vParam }).catch(() => ({ data: null })),
    api.get('/battery/efficiency-by-temp', { params: vParam }).catch(() => ({ data: null })),
    api.get('/battery/phantom-drain', { params }).catch(() => ({ data: null })),
    api.get('/battery/anomalies', { params }).catch(() => ({ data: null })),
    api.get('/battery/anomalies-persisted', { params: vParam }).catch(() => ({ data: [] })),
    api.get('/battery/precondition-suggestions', { params: vParam }).catch(() => ({ data: [] })),
  ]);

  degradation.value = deg.data || [];
  chartData.value = {
    labels: degradation.value.map(d => d.day),
    datasets: [{
      label: t('battery.maxRangeLabel'),
      data: degradation.value.map(d => d.max_range),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.1)',
      tension: 0.3, fill: true, pointRadius: 2,
    }],
  };
  chargingCurve.value = curve.data;
  efficiencyTemp.value = eff.data;
  phantomDrain.value = phan.data;
  anomalies.value = anom.data;
  companionAlerts.value = (persisted.data || []).filter(a => a.status !== 'dismissed');
  preconditionSuggestions.value = preCond.data || [];
}

async function markSeen(id) {
  try {
    await api.post(`/battery/anomalies-persisted/${id}/seen`);
    const a = companionAlerts.value.find(x => x.id === id);
    if (a) a.status = 'seen';
  } catch { /* silent */ }
}
async function dismissAlert(id) {
  try {
    await api.post(`/battery/anomalies-persisted/${id}/dismiss`);
    companionAlerts.value = companionAlerts.value.filter(x => x.id !== id);
  } catch { /* silent */ }
}
async function dismissSuggestion(id) {
  try {
    await api.post(`/battery/precondition-suggestions/${id}/dismiss`);
    preconditionSuggestions.value = preconditionSuggestions.value.filter(x => x.id !== id);
  } catch { /* silent */ }
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

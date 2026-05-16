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

    </template><!-- end v-for layoutOrder -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { useAppStore } from '../store/index.js';
import { useUnits } from '../store/prefs.js';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const { t } = useI18n();
const appStore = useAppStore();
const { fmtDistance } = useUnits();

const BATTERY_SECTIONS = ['range', 'degradation'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('battery', BATTERY_SECTIONS);

const days = ref(90);
const degradation = ref([]);
const chartData = ref(null);
const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);

// Day-Range-Tooltips kommen über $t — als computed, damit sie bei
// Sprachwechsel automatisch neu generiert werden.
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

async function load() {
  const vid = appStore.selectedVehicle?.id;
  const params = { days: days.value, ...(vid ? { vehicle_id: vid } : {}) };
  const { data } = await api.get('/battery/degradation', { params });
  degradation.value = data;
  chartData.value = {
    labels: data.map(d => d.day),
    datasets: [{
      label: t('battery.maxRangeLabel'),
      data: data.map(d => d.max_range),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.1)',
      tension: 0.3, fill: true, pointRadius: 2,
    }],
  };
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

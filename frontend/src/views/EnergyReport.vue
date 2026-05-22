<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('energy.title') }}</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('energy.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button v-for="w in [4, 8, 12]" :key="w"
          @click="weeks = w; load()"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="weeks === w ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'"
        >{{ $t(`energy.weeks${w}`) }}</button>
      </div>
    </div>

    <template v-for="sid in layoutOrder" :key="sid">

    <SortableSection v-if="sid === 'overall'" page-id="energy" section-id="overall"
      :title="$t('energy.sectionOverall')" icon="📊"
      :collapsed="isCollapsed('overall')" @toggle="toggle('overall')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="overall" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard :label="$t('energy.avgKwh100')"
          :value="overall.avg_consumption != null ? fmtEfficiency(overall.avg_consumption) : '—'"
          icon="pulse" />
        <StatCard :label="$t('energy.totalKwh')"
          :value="overall.total_kwh != null ? overall.total_kwh.toFixed(1) + ' kWh' : '—'"
          icon="bolt" />
        <StatCard :label="$t('energy.totalKm')"
          :value="overall.total_km != null ? fmtDistance(overall.total_km, 0) : '—'"
          icon="map" />
        <StatCard :label="$t('energy.tripsCount')"
          :value="String(overall.trips_count ?? 0)"
          icon="gauge" />
      </div>
      <p v-else class="text-gray-400">{{ $t('energy.noData') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'score'" page-id="energy" section-id="score"
      :title="$t('energy.sectionScore')" icon="🌿"
      :collapsed="isCollapsed('score')" @toggle="toggle('score')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="overall">
        <div class="flex items-center gap-6 mb-4">
          <div class="relative w-28 h-28">
            <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#374151" stroke-width="3"/>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" :stroke="scoreColor(overall.eco_score)" stroke-width="3"
                :stroke-dasharray="`${overall.eco_score ?? 0}, 100`"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-bold" :style="{ color: scoreColor(overall.eco_score) }">
                {{ overall.eco_score ?? '—' }}
              </span>
              <span class="text-xs text-gray-400">{{ $t('energy.ecoScore') }}</span>
            </div>
          </div>
          <div>
            <p class="text-lg font-semibold" :style="{ color: scoreColor(overall.eco_score) }">
              {{ scoreLabel(overall.eco_score) }}
            </p>
            <p class="text-sm text-gray-400 mt-1" v-tooltip="$t('energy.ecoScoreTooltip')">
              {{ $t('energy.wltpRef') }}: {{ wltpKwh ? fmtEfficiency(wltpKwh) : '—' }}
            </p>
            <p class="text-sm mt-2" :class="scoreTrendClass">{{ scoreTrendText }}</p>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-400">{{ $t('energy.noData') }}</p>
    </SortableSection>

    <!-- CO₂-Vergleich -->
    <SortableSection v-if="sid === 'co2'" page-id="energy" section-id="co2"
      :title="$t('energy.sectionCo2')" icon="🌍"
      :collapsed="isCollapsed('co2')" @toggle="toggle('co2')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="overall?.co2 && overall.total_km > 0">
        <!-- Haupt-Kennzahlen -->
        <div class="grid grid-cols-3 gap-4 mb-5">
          <div class="text-center p-3 bg-gray-800 rounded-xl"
            v-tooltip="$t('energy.co2TeslaTooltip')">
            <p class="text-xs text-gray-400 mb-1">{{ $t('energy.co2Tesla') }}</p>
            <p class="text-xl font-bold text-blue-400">{{ fmtCo2(overall.co2.tesla_kg) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ $t('energy.co2KgUnit') }}</p>
          </div>
          <div class="text-center p-3 bg-gray-800 rounded-xl"
            v-tooltip="$t('energy.co2DieselTooltip')">
            <p class="text-xs text-gray-400 mb-1">{{ $t('energy.co2Diesel') }}</p>
            <p class="text-xl font-bold text-orange-400">{{ fmtCo2(overall.co2.diesel_kg) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ $t('energy.co2KgUnit') }}</p>
          </div>
          <div class="text-center p-3 bg-green-900/30 rounded-xl border border-green-700/40"
            v-tooltip="$t('energy.co2SavedTooltip')">
            <p class="text-xs text-gray-400 mb-1">{{ $t('energy.co2Saved') }}</p>
            <p class="text-xl font-bold text-green-400">{{ fmtCo2(overall.co2.saved_kg) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ $t('energy.co2KgUnit') }}</p>
          </div>
        </div>
        <!-- Visueller Vergleichsbalken -->
        <div class="space-y-2">
          <div>
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>Tesla ({{ overall.co2.grid_kg_per_kwh }} kg/kWh {{ $t('energy.co2GridMix') }})</span>
              <span>{{ fmtCo2(overall.co2.tesla_kg) }} kg</span>
            </div>
            <div class="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full transition-all"
                :style="{ width: co2TeslaBarPct + '%' }"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>{{ $t('energy.co2DieselLabel') }} (7L/100km)</span>
              <span>{{ fmtCo2(overall.co2.diesel_kg) }} kg</span>
            </div>
            <div class="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-orange-500 rounded-full transition-all" style="width: 100%"></div>
            </div>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-3 text-center">
          {{ $t('energy.co2Hint') }}
        </p>
      </div>
      <p v-else class="text-gray-400">{{ $t('energy.noData') }}</p>
    </SortableSection>

    <!-- Wetter-Korrelation -->
    <SortableSection v-if="sid === 'weather'" page-id="energy" section-id="weather"
      :title="$t('energy.sectionWeather')" icon="🌡️"
      :collapsed="isCollapsed('weather')" @toggle="toggle('weather')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="tempBuckets.length">
        <p class="text-xs text-gray-400 mb-4" v-tooltip="$t('energy.weatherChartTooltip')">
          {{ $t('energy.weatherSubtitle') }}
        </p>
        <div class="space-y-2">
          <div v-for="b in tempBuckets" :key="b.label"
            class="flex items-center gap-3">
            <div class="w-20 text-xs text-gray-400 shrink-0 text-right">{{ b.label }}</div>
            <div class="flex-1 relative h-7 bg-gray-700 rounded-lg overflow-hidden">
              <div class="h-full rounded-lg transition-all flex items-center pl-2"
                :style="{ width: weatherBarWidth(b.avg_kwh_100km) + '%', backgroundColor: weatherBarColor(b.avg_kwh_100km) }">
              </div>
              <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
                {{ b.avg_kwh_100km != null ? fmtEfficiency(b.avg_kwh_100km) : '—' }}
              </span>
            </div>
            <div class="w-10 text-xs text-gray-500 text-right shrink-0">
              {{ b.count }}×
            </div>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-3 text-center">{{ $t('energy.weatherHint') }}</p>
      </div>
      <p v-else class="text-gray-400">{{ $t('energy.noWeatherData') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'community'" page-id="energy" section-id="community"
      :title="$t('community.title')" icon="🌍"
      :collapsed="isCollapsed('community')" @toggle="toggle('community')" @move="(f,t,p) => moveSection(f,t,p)">
      <CommunityBenchmark />
    </SortableSection>

    <SortableSection v-if="sid === 'trend'" page-id="energy" section-id="trend"
      :title="$t('energy.sectionTrend')" icon="📈"
      :collapsed="isCollapsed('trend')" @toggle="toggle('trend')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="weekData.length" class="space-y-2">
        <div v-for="w in weekData" :key="w.week_start"
          class="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
          <div class="w-20 text-sm text-gray-400 shrink-0">{{ w.week_label }}</div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <div class="h-2 rounded-full transition-all"
                :style="{ width: barWidth(w.eco_score) + '%', backgroundColor: scoreColor(w.eco_score) }"
              ></div>
              <span class="text-sm font-medium" :style="{ color: scoreColor(w.eco_score) }">
                {{ w.eco_score ?? '—' }}
              </span>
            </div>
            <div class="text-xs text-gray-500 flex gap-3">
              <span>{{ w.avg_consumption != null ? fmtEfficiency(w.avg_consumption) : '' }}</span>
              <span v-if="w.trips > 0">{{ w.trips }} {{ $t('energy.tripsCount').toLowerCase() }}</span>
              <span v-if="w.co2_saved_kg > 0" class="text-green-400">
                −{{ fmtCo2(w.co2_saved_kg) }} kg CO₂
              </span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-400">{{ $t('energy.noData') }}</p>
    </SortableSection>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import { useUnits } from '../store/prefs.js';
import SortableSection      from '../components/SortableSection.vue';
import StatCard              from '../components/StatCard.vue';
import CommunityBenchmark   from '../components/CommunityBenchmark.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const { t } = useI18n();
const { fmtDistance, fmtEfficiency } = useUnits();
const ENERGY_SECTIONS = ['overall', 'score', 'co2', 'weather', 'community', 'trend'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('energy', ENERGY_SECTIONS);

const appStore   = useAppStore();
const weeks      = ref(4);
const weekData   = ref([]);
const overall    = ref(null);
const wltpKwh    = ref(null);
const tempBuckets = ref([]);

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const [energyResp, weatherResp] = await Promise.all([
      api.get(`/energy/report?weeks=${weeks.value}&vehicle_id=${vid}`),
      api.get(`/trips/weather-consumption?vehicle_id=${vid}`).catch(() => ({ data: { buckets: [] } })),
    ]);
    weekData.value    = energyResp.data.weeks ?? [];
    overall.value     = energyResp.data.overall ?? null;
    wltpKwh.value     = energyResp.data.wltp_kwh_100km ?? null;
    tempBuckets.value = weatherResp.data.buckets ?? [];
  } catch { /* ignore */ }
}

// CO₂-Balkenprozent relativ zum Diesel-Wert
const co2TeslaBarPct = computed(() => {
  const c = overall.value?.co2;
  if (!c || !c.diesel_kg) return 0;
  return Math.min(100, Math.round(c.tesla_kg / c.diesel_kg * 100));
});

// Wetter-Chart: Balkenbreite relativ zum schlechtesten Wert
const maxWeatherKwh = computed(() =>
  Math.max(...tempBuckets.value.map(b => b.avg_kwh_100km ?? 0), 1)
);
function weatherBarWidth(kwh) {
  if (kwh == null) return 0;
  return Math.round(kwh / maxWeatherKwh.value * 100);
}
function weatherBarColor(kwh) {
  if (kwh == null) return '#6b7280';
  const ratio = kwh / maxWeatherKwh.value;
  if (ratio < 0.6) return '#22c55e';
  if (ratio < 0.8) return '#84cc16';
  if (ratio < 0.9) return '#eab308';
  return '#ef4444';
}

function fmtCo2(kg) {
  if (kg == null) return '—';
  if (kg >= 1000) return (kg / 1000).toFixed(2) + ' t';
  return kg.toFixed(1);
}

function scoreColor(score) {
  if (score == null) return '#6b7280';
  if (score >= 85) return '#22c55e';
  if (score >= 65) return '#84cc16';
  if (score >= 45) return '#eab308';
  return '#ef4444';
}
function scoreLabel(score) {
  if (score == null) return '—';
  if (score >= 85) return t('energy.scoreExcellent');
  if (score >= 65) return t('energy.scoreGood');
  if (score >= 45) return t('energy.scoreAverage');
  return t('energy.scorePoor');
}
function barWidth(score) {
  return Math.min(100, Math.max(0, score ?? 0));
}

const scoreTrendText = computed(() => {
  if (!overall.value?.score_trend) return t('energy.scoreTrendSame');
  if (overall.value.score_trend > 0)  return t('energy.scoreTrendUp');
  if (overall.value.score_trend < 0)  return t('energy.scoreTrendDown');
  return t('energy.scoreTrendSame');
});
const scoreTrendClass = computed(() => {
  const v = overall.value?.score_trend;
  if (!v) return 'text-gray-400';
  return v > 0 ? 'text-green-400' : 'text-red-400';
});

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

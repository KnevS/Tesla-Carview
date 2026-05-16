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
          :value="overall.avg_kwh_100km != null ? fmtEfficiency(overall.avg_kwh_100km) : '—'"
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
              <span class="text-2xl font-bold" :class="`text-[${scoreColor(overall.eco_score)}]`">
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
              {{ $t('energy.wltpRef') }}: {{ overall.wltp_ref ? fmtEfficiency(overall.wltp_ref) : '—' }}
            </p>
            <p class="text-sm mt-2"
              :class="scoreTrendClass">
              {{ scoreTrendText }}
            </p>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-400">{{ $t('energy.noData') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'trend'" page-id="energy" section-id="trend"
      :title="$t('energy.sectionTrend')" icon="📈"
      :collapsed="isCollapsed('trend')" @toggle="toggle('trend')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="weekData.length" class="space-y-2">
        <div v-for="w in weekData" :key="w.week"
          class="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
          <div class="w-20 text-sm text-gray-400 shrink-0">
            {{ $t('energy.weekLabel', { kw: w.week_number }) }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <div class="h-2 rounded-full transition-all"
                :style="{ width: barWidth(w.eco_score) + '%', backgroundColor: scoreColor(w.eco_score) }"
              ></div>
              <span class="text-sm font-medium" :style="{ color: scoreColor(w.eco_score) }">
                {{ w.eco_score ?? '—' }}
              </span>
            </div>
            <div class="text-xs text-gray-500">
              {{ w.avg_kwh_100km != null ? fmtEfficiency(w.avg_kwh_100km) : '' }}
              <span v-if="w.trips_count"> · {{ w.trips_count }} {{ $t('energy.tripsCount').toLowerCase() }}</span>
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
import SortableSection from '../components/SortableSection.vue';
import StatCard        from '../components/StatCard.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const { t } = useI18n();
const { fmtDistance, fmtEfficiency } = useUnits();
const ENERGY_SECTIONS = ['overall', 'score', 'trend'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('energy', ENERGY_SECTIONS);

const appStore = useAppStore();
const weeks    = ref(4);
const weekData = ref([]);
const overall  = ref(null);

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const { data } = await api.get(`/energy/report?weeks=${weeks.value}&vehicle_id=${vid}`);
    weekData.value = data.weeks ?? [];
    overall.value  = data.overall ?? null;
  } catch { /* ignore */ }
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
  const t = overall.value?.score_trend;
  if (!t) return 'text-gray-400';
  return t > 0 ? 'text-green-400' : 'text-red-400';
});

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

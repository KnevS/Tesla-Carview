<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('winter.title') }}</h1>
      <p class="text-gray-400 text-sm mt-0.5">{{ $t('winter.subtitle') }}</p>
    </div>

    <p v-if="!data" class="text-gray-400">{{ $t('common.loading') }}</p>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          :label="$t('winter.tileFrost')"
          :value="data.coldest_bucket?.vs_baseline_pct != null ? signed(data.coldest_bucket.vs_baseline_pct) : '—'"
          :sub="data.coldest_bucket ? $t('winter.tileFrostSub', { from: data.coldest_bucket.from_c, to: data.coldest_bucket.to_c }) : undefined"
          icon="thermometer"
          :tooltip="$t('winter.tipFrost')"
        />
        <StatCard
          :label="$t('winter.tileBaseline')"
          :value="data.baseline ? fmtNum(data.baseline.kwh_100km, 1) : '—'"
          sub="kWh / 100 km"
          icon="gauge"
          :decimals="1"
          :tooltip="$t('winter.tipBaseline')"
        />
        <StatCard
          :label="$t('winter.tileRangeToday')"
          :value="today?.range_full_km != null ? today.range_full_km + ' km' : '—'"
          :sub="today?.range_now_km != null ? $t('winter.tileRangeTodaySub', { now: today.range_now_km }) : undefined"
          icon="battery"
          :tooltip="$t('winter.tipRange')"
        />
      </div>

      <p class="text-xs text-gray-500">
        {{ $t('winter.coverage', { withTemp: data.coverage.trips_with_temp, total: data.coverage.trips_total, weather: data.coverage.from_weather }) }}
        {{ $t('winter.privacy') }}
      </p>

      <template v-for="sid in layoutOrder" :key="sid">

      <SortableSection v-if="sid === 'forecast'" page-id="winter" section-id="forecast"
        :title="$t('winter.sectionForecast')" icon="🥶"
        :collapsed="isCollapsed('forecast')" @toggle="toggle('forecast')" @move="(f,t,p) => moveSection(f,t,p)">
        <div v-if="data.forecast.length" class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div v-for="(d, i) in data.forecast" :key="d.date"
            class="rounded-lg border border-gray-700 bg-gray-800/40 p-3 text-sm">
            <p class="text-gray-400 text-xs">{{ i === 0 ? $t('winter.fcToday') : fmtDay(d.date) }}</p>
            <p class="font-semibold mt-1 tabular-nums" :class="d.tmin < 0 ? 'text-sky-300' : 'text-gray-200'">
              {{ fmtNum(d.tmin, 0) }}° / {{ fmtNum(d.tmax, 0) }}°
            </p>
            <template v-if="d.range_full_km != null">
              <p class="text-lg font-bold mt-1 tabular-nums">{{ d.range_full_km }} km</p>
              <p v-if="d.range_now_km != null" class="text-xs text-gray-400">{{ $t('winter.fcNow', { km: d.range_now_km }) }}</p>
              <p class="text-xs mt-1 tabular-nums whitespace-nowrap text-gray-500">{{ fmtNum(d.kwh_100km, 1) }} kWh/100 km</p>
              <p v-if="d.vs_baseline_pct != null" class="text-xs tabular-nums"
                :class="d.vs_baseline_pct >= 15 ? 'text-amber-400' : 'text-gray-500'">{{ signed(d.vs_baseline_pct) }}</p>
              <p v-if="d.basis === 'overall'" class="text-[11px] text-gray-500 mt-1">{{ $t('winter.fcBasisOverall') }}</p>
            </template>
            <p v-else class="text-gray-500 mt-1">—</p>
          </div>
        </div>
        <p v-else class="text-gray-400 text-sm">{{ $t('winter.fcNoForecast') }}</p>
      </SortableSection>

      <SortableSection v-else-if="sid === 'curve'" page-id="winter" section-id="curve"
        :title="$t('winter.sectionCurve')" icon="📉"
        :collapsed="isCollapsed('curve')" @toggle="toggle('curve')" @move="(f,t,p) => moveSection(f,t,p)">
        <p v-if="!data.coverage.trips_with_temp" class="text-gray-400 text-sm">{{ $t('winter.noData') }}</p>
        <template v-else>
          <p v-if="!data.baseline" class="text-gray-400 text-sm mb-3">{{ $t('winter.noBaseline') }}</p>
          <div class="space-y-1.5">
            <div v-for="b in data.curve" :key="b.from_c" class="flex items-center gap-2 text-sm">
              <span class="w-24 shrink-0 text-gray-400 tabular-nums">{{ b.from_c }} … {{ b.to_c }} °C</span>
              <div class="flex-1 h-4 rounded bg-gray-800 overflow-hidden">
                <div class="h-full rounded"
                  :class="b.from_c < 15 ? (b.from_c < 5 ? 'bg-sky-400' : 'bg-sky-600') : 'bg-green-600'"
                  :style="{ width: barWidth(b.kwh_100km) }"></div>
              </div>
              <span class="w-36 shrink-0 text-right tabular-nums">
                {{ fmtNum(b.kwh_100km, 1) }} kWh
                <span v-if="b.vs_baseline_pct != null" class="text-xs"
                  :class="b.vs_baseline_pct >= 15 ? 'text-amber-400' : 'text-gray-500'">{{ signed(b.vs_baseline_pct) }}</span>
              </span>
              <span class="hidden sm:inline w-20 shrink-0 text-right text-xs text-gray-500">{{ $t('winter.curveTrips', { n: b.trips }) }}</span>
            </div>
          </div>
        </template>
      </SortableSection>

      <SortableSection v-else-if="sid === 'trips'" page-id="winter" section-id="trips"
        :title="$t('winter.sectionTrips')" icon="🧊"
        :collapsed="isCollapsed('trips')" @toggle="toggle('trips')" @move="(f,t,p) => moveSection(f,t,p)">
        <div v-if="data.recent_cold_trips.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-gray-400 text-left border-b border-gray-700">
                <th class="pb-2 pr-4">{{ $t('winter.colDate') }}</th>
                <th class="pb-2 pr-4">{{ $t('winter.colTemp') }}</th>
                <th class="pb-2 pr-4">{{ $t('winter.colDistance') }}</th>
                <th class="pb-2 pr-4">{{ $t('winter.colConsumption') }}</th>
                <th class="pb-2">{{ $t('winter.colSurcharge') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in data.recent_cold_trips" :key="t.id" class="border-b border-gray-800 hover:bg-gray-800/40">
                <td class="py-2 pr-4 whitespace-nowrap">
                  <RouterLink :to="`/trips/${t.id}`" class="hover:underline">{{ fmtTs(t.start_time) }}</RouterLink>
                </td>
                <td class="py-2 pr-4 whitespace-nowrap tabular-nums">{{ fmtNum(t.temp_c, 1) }} °C</td>
                <td class="py-2 pr-4 whitespace-nowrap tabular-nums">{{ fmtNum(t.distance_km, 1) }} km</td>
                <td class="py-2 pr-4 whitespace-nowrap tabular-nums">{{ fmtNum(t.kwh_100km, 1) }} kWh/100 km</td>
                <td class="py-2 whitespace-nowrap tabular-nums"
                  :class="t.pct >= 25 ? 'text-red-400' : t.pct >= 10 ? 'text-amber-400' : 'text-gray-300'">{{ signed(t.pct) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-gray-400 text-sm">{{ data.baseline ? '—' : $t('winter.noBaseline') }}</p>
      </SortableSection>

      <SortableSection v-else-if="sid === 'tips'" page-id="winter" section-id="tips"
        :title="$t('winter.sectionTips')" icon="💡"
        :collapsed="isCollapsed('tips')" @toggle="toggle('tips')" @move="(f,t,p) => moveSection(f,t,p)">
        <ul class="list-disc pl-5 space-y-1.5 text-sm text-gray-300">
          <li v-for="k in TIPS" :key="k">{{ $t(`winter.tip_${k}`) }}</li>
        </ul>
      </SortableSection>

      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import SortableSection from '../components/SortableSection.vue';
import StatCard        from '../components/StatCard.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const SECTIONS = ['forecast', 'curve', 'trips', 'tips'];
const TIPS = ['precondition', 'departure', 'seat', 'supercharger', 'short', 'tires'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('winter', SECTIONS);

const { locale } = useI18n();
const appStore = useAppStore();
const data = ref(null);

const today = computed(() => data.value?.forecast?.[0] ?? null);
const maxKwh = computed(() => Math.max(1, ...(data.value?.curve ?? []).map(b => b.kwh_100km)));

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const { data: d } = await api.get(`/winter/${vid}`);
    data.value = d;
  } catch { /* ignore */ }
}

function barWidth(kwh) {
  return `${Math.max(4, kwh / maxKwh.value * 100)}%`;
}

function signed(pct) {
  return `${pct > 0 ? '+' : ''}${pct} %`;
}

function fmtNum(v, digits) {
  if (v == null) return '—';
  return Number(v).toLocaleString(locale.value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale.value, { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function fmtTs(ts) {
  return new Date(ts * 1000).toLocaleString(locale.value, {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

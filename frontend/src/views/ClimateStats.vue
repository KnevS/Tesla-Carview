<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          ❄️ {{ $t('climate.title') }}
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('climate.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button v-for="d in [30, 90, 365]" :key="d"
          @click="days = d; load()"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="days === d ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'">
          {{ d }}{{ $t('climate.daySuffix') }}
        </button>
      </div>
    </div>

    <!-- Gesamt-Stats -->
    <div v-if="totals" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card text-center"
        v-tooltip="$t('climate.tooltipClimateHours')">
        <p class="text-gray-400 text-xs mb-1">{{ $t('climate.climateHours') }}</p>
        <p class="text-2xl font-bold text-blue-400">{{ totals.climate_on_hours }}</p>
        <p class="text-gray-500 text-xs mt-0.5">h</p>
      </div>
      <div class="card text-center"
        v-tooltip="$t('climate.tooltipSeatHeatLeft')">
        <p class="text-gray-400 text-xs mb-1">{{ $t('climate.seatHeatLeft') }}</p>
        <p class="text-2xl font-bold text-orange-400">{{ totals.seat_heat_left_days }}</p>
        <p class="text-gray-500 text-xs mt-0.5">{{ $t('climate.days') }}</p>
      </div>
      <div class="card text-center"
        v-tooltip="$t('climate.tooltipSeatHeatRight')">
        <p class="text-gray-400 text-xs mb-1">{{ $t('climate.seatHeatRight') }}</p>
        <p class="text-2xl font-bold text-orange-400">{{ totals.seat_heat_right_days }}</p>
        <p class="text-gray-500 text-xs mt-0.5">{{ $t('climate.days') }}</p>
      </div>
      <div class="card text-center"
        v-tooltip="$t('climate.tooltipPrecon')">
        <p class="text-gray-400 text-xs mb-1">{{ $t('climate.preconCount') }}</p>
        <p class="text-2xl font-bold text-purple-400">{{ totals.precondition_total }}</p>
        <p class="text-gray-500 text-xs mt-0.5">×</p>
      </div>
    </div>

    <!-- Kältester / Wärmster Tag -->
    <div v-if="totals" class="grid grid-cols-2 gap-4">
      <div class="card space-y-1"
        v-tooltip="$t('climate.tooltipColdest')">
        <p class="text-gray-400 text-xs">🥶 {{ $t('climate.coldestDay') }}</p>
        <p class="text-lg font-bold text-blue-300">
          {{ totals.coldest_day ? totals.coldest_day.min_outside_temp_c?.toFixed(1) + ' °C' : '—' }}
        </p>
        <p class="text-xs text-gray-500">{{ totals.coldest_day?.day ?? '' }}</p>
      </div>
      <div class="card space-y-1"
        v-tooltip="$t('climate.tooltipHottest')">
        <p class="text-gray-400 text-xs">🥵 {{ $t('climate.hottestDay') }}</p>
        <p class="text-lg font-bold text-orange-300">
          {{ totals.hottest_day ? totals.hottest_day.max_inside_temp_c?.toFixed(1) + ' °C' : '—' }}
        </p>
        <p class="text-xs text-gray-500">{{ $t('climate.insideTemp') }} · {{ totals.hottest_day?.day ?? '' }}</p>
      </div>
    </div>

    <!-- Tages-Verlauf -->
    <div class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        📅 {{ $t('climate.dailyChart') }}
        <InfoTip :text="$t('climate.dailyChartTip')" />
      </h2>
      <div v-if="dayData.length" class="space-y-1.5 max-h-96 overflow-y-auto pr-1">
        <div v-for="d in dayData" :key="d.day"
          class="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
          <div class="w-24 text-xs text-gray-400 shrink-0">{{ d.day }}</div>
          <!-- Klimaanlage-Balken -->
          <div class="flex-1 h-5 bg-gray-700 rounded relative overflow-hidden"
            v-tooltip="`Klimaanlage: ${d.climate_on_minutes} min`">
            <div class="h-full bg-blue-600 rounded transition-all"
              :style="{ width: climateBarWidth(d.climate_on_minutes) + '%' }"></div>
            <span class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-300">
              {{ d.climate_on_minutes > 0 ? d.climate_on_minutes + ' min' : '' }}
            </span>
          </div>
          <!-- Sitzheizungs-Icons -->
          <div class="flex gap-1 shrink-0">
            <span v-if="d.seat_heat_left_on > 0" class="text-orange-400 text-xs" title="Sitzheizung Fahrer">🪑</span>
            <span v-if="d.seat_heat_right_on > 0" class="text-orange-300 text-xs" title="Sitzheizung Beifahrer">🪑</span>
            <span v-if="d.precondition_count > 0" class="text-purple-400 text-xs" title="Vorklimatisierung">🔄</span>
          </div>
          <!-- Außentemperatur -->
          <div class="w-14 text-right text-xs shrink-0"
            :class="(d.min_outside_temp_c ?? 99) < 5 ? 'text-blue-300' : (d.min_outside_temp_c ?? -99) > 25 ? 'text-orange-300' : 'text-gray-400'">
            {{ d.min_outside_temp_c != null ? d.min_outside_temp_c.toFixed(0) + ' °C' : '—' }}
          </div>
        </div>
      </div>
      <p v-else class="text-gray-400">{{ $t('climate.noData') }}</p>
    </div>

    <p v-if="!appStore.selectedVehicle" class="text-gray-400 text-center py-8">
      {{ $t('common.noVehicle') }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import InfoTip from '../components/InfoTip.vue';
import api from '../api.js';

const { t }    = useI18n();
const appStore = useAppStore();
const days     = ref(30);
const dayData  = ref([]);
const totals   = ref(null);

const maxClimateMin = ref(1);

function climateBarWidth(min) {
  return Math.round(Math.min(100, (min ?? 0) / maxClimateMin.value * 100));
}

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const { data } = await api.get(`/hvac/${vid}?days=${days.value}`);
    dayData.value = data.days ?? [];
    totals.value  = data.totals ?? null;
    maxClimateMin.value = Math.max(1, ...dayData.value.map(d => d.climate_on_minutes ?? 0));
  } catch { /* ignore */ }
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

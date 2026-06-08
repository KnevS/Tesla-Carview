<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <p class="text-xs text-gray-400">{{ $t('chargingHeatmap.intro') }}</p>
      <select v-model="mode"
              class="bg-gray-700 text-white text-xs rounded-lg px-2 py-1 border border-gray-600">
        <option value="count">{{ $t('chargingHeatmap.modeCount') }}</option>
        <option value="avg_kw">{{ $t('chargingHeatmap.modeAvgKw') }}</option>
        <option value="total_kwh">{{ $t('chargingHeatmap.modeKwh') }}</option>
      </select>
    </div>

    <div class="overflow-x-auto">
      <table class="text-[10px] border-separate border-spacing-[2px]">
        <thead>
          <tr>
            <th class="w-8"></th>
            <th v-for="h in 24" :key="h - 1" class="font-normal text-gray-500 text-center w-6">
              {{ String(h - 1).padStart(2, '0') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(dayLabel, dayIdx) in DAY_LABELS" :key="dayIdx">
            <td class="text-gray-500 pr-1 text-right">{{ dayLabel }}</td>
            <td v-for="h in 24" :key="h - 1"
                class="w-6 h-6 rounded-sm cursor-pointer transition hover:outline hover:outline-1 hover:outline-white"
                :style="{ background: cellColor(dayIdx, h - 1) }"
                @mouseenter="hover = { d: dayIdx, h: h - 1 }"
                @mouseleave="hover = null"
                v-tooltip="cellTooltip(dayIdx, h - 1)">
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legende -->
    <div class="flex items-center gap-2 text-xs text-gray-500">
      <span>{{ $t('chargingHeatmap.less') }}</span>
      <div v-for="(c, i) in COLORS" :key="i"
           class="w-4 h-4 rounded-sm" :style="{ background: c }"></div>
      <span>{{ $t('chargingHeatmap.more') }}</span>
      <span class="ml-auto">
        {{ $t('chargingHeatmap.summary', { count: totalSessions, peak: avgPeak.toFixed(1) }) }}
      </span>
    </div>

    <!-- Hover-Info -->
    <p v-if="hover && hoverCell" class="text-xs text-gray-300">
      {{ DAY_LABELS_LONG[hover.d] }} {{ String(hover.h).padStart(2, '0') }}:00 →
      {{ $t('chargingHeatmap.hoverDetail', {
          sessions: hoverCell.count,
          avg: hoverCell.avg_kw.toFixed(1),
          kwh: hoverCell.total_kwh.toFixed(1),
          peak: hoverCell.peak_kw.toFixed(0)
      }) }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

const appStore = useAppStore();
const cells    = ref([]);   // [{weekday, hour, count, avg_kw, total_kwh, peak_kw}]
const mode     = ref('count');
const hover    = ref(null);

// Wochentage: strftime('%w') liefert 0=Sonntag..6=Samstag.
// Wir zeigen Mo→So in der UI-Reihenfolge — Index-Mapping unten.
const DAY_LABELS      = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAY_LABELS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
/** Mapping UI-Index (Mo=0..So=6) → SQLite-strftime-Index (So=0..Sa=6). */
const UI_TO_SQL = [1, 2, 3, 4, 5, 6, 0];

const COLORS = ['#1f2937', '#0f3a26', '#16a34a', '#22c55e', '#86efac'];

async function load() {
  const vid = appStore.selectedVehicle?.id;
  try {
    const { data } = await api.get('/charging/heatmap', {
      params: vid ? { vehicle_id: vid } : {},
    });
    cells.value = data.cells || [];
  } catch { cells.value = []; }
}

/** Lookup-Helfer: Zelle (d,h) → row aus cells, oder Default-Null-Row. */
const cellMap = computed(() => {
  const m = new Map();
  for (const c of cells.value) m.set(`${c.weekday}_${c.hour}`, c);
  return m;
});
function getCell(uiDay, hour) {
  const sqlDay = UI_TO_SQL[uiDay];
  return cellMap.value.get(`${sqlDay}_${hour}`)
    ?? { count: 0, avg_kw: 0, total_kwh: 0, peak_kw: 0 };
}

const maxValue = computed(() => {
  let m = 1;
  for (const c of cells.value) {
    const v = c[mode.value];
    if (v != null && v > m) m = v;
  }
  return m;
});

function cellColor(uiDay, hour) {
  const c = getCell(uiDay, hour);
  const v = c[mode.value] || 0;
  if (!v) return COLORS[0];
  const idx = Math.min(4, Math.floor((v / maxValue.value) * 4) + 1);
  return COLORS[idx];
}

function cellTooltip(uiDay, hour) {
  const c = getCell(uiDay, hour);
  if (!c.count) return `${DAY_LABELS_LONG[uiDay]} ${String(hour).padStart(2, '0')}:00 — keine Sessions`;
  return `${DAY_LABELS_LONG[uiDay]} ${String(hour).padStart(2, '0')}:00 · ${c.count} Session(s) · ø ${c.avg_kw.toFixed(1)} kW · Peak ${c.peak_kw.toFixed(0)} kW`;
}

const hoverCell = computed(() => hover.value ? getCell(hover.value.d, hover.value.h) : null);
const totalSessions = computed(() => cells.value.reduce((s, c) => s + c.count, 0));
const avgPeak = computed(() => {
  if (!cells.value.length) return 0;
  return cells.value.reduce((s, c) => s + (c.peak_kw || 0), 0) / cells.value.length;
});

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-3">
    <!-- Filter-Leiste: Granularitaet + Zeitraum. -->
    <div class="flex items-center gap-2 flex-wrap">
      <select v-model="period" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
        <option value="year">{{ $t('trips.heatmapPeriodYear') }}</option>
        <option value="month">{{ $t('trips.heatmapPeriodMonth') }}</option>
        <option value="week">{{ $t('trips.heatmapPeriodWeek') }}</option>
        <option value="all">{{ $t('trips.heatmapPeriodAll') }}</option>
      </select>

      <select v-if="period !== 'all'" v-model.number="year" @change="load"
        class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
        <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
      </select>

      <select v-if="period === 'month'" v-model.number="month" @change="load"
        class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
        <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
      </select>

      <select v-if="period === 'week'" v-model.number="week" @change="load"
        class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
        <option v-for="w in 53" :key="w" :value="w">KW {{ w }}</option>
      </select>

      <div class="text-xs text-gray-400 ml-auto" v-tooltip="$t('trips.heatmapTooltip')">
        {{ $t('trips.heatmapLegendHint') }}
      </div>
    </div>

    <!-- SVG-Grid: Wochen als Spalten (links → rechts in der Zeit),
         Wochentage als Zeilen (Mo oben, So unten). Klassisches
         GitHub-Contributions-Layout. -->
    <div class="relative overflow-x-auto">
      <svg :width="svgWidth" :height="svgHeight" class="block">
        <!-- Wochentag-Labels links -->
        <g>
          <text v-for="(label, i) in DAY_LABELS" :key="label"
            :x="20" :y="i * (CELL + GAP) + CELL_OFFSET + 4"
            class="fill-gray-500 text-[10px]" text-anchor="end">
            {{ label }}
          </text>
        </g>
        <!-- Monats-Labels oben -->
        <g>
          <text v-for="m in monthLabels" :key="m.label + m.x"
            :x="m.x" :y="14" class="fill-gray-400 text-[11px]">
            {{ m.label }}
          </text>
        </g>
        <!-- Zellen -->
        <g>
          <rect v-for="c in cells" :key="c.date"
            :x="c.x" :y="c.y" :width="CELL" :height="CELL"
            :fill="c.color" rx="2" ry="2"
            class="cursor-pointer transition hover:stroke-white hover:stroke-1"
            @mouseenter="hover = c" @mouseleave="hover = null"
            @click="goToTrips(c)" />
        </g>
      </svg>

      <!-- Hover-Tooltip -->
      <div v-if="hover"
        class="absolute pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs shadow-xl z-20"
        :style="{ left: (hover.x + 30) + 'px', top: (hover.y - 30) + 'px' }">
        <p class="font-semibold text-white">{{ fmtDateLong(hover.date) }}</p>
        <p class="text-gray-300">{{ hover.trips }} Fahrt(en) · {{ hover.km.toFixed(1) }} km</p>
      </div>
    </div>

    <!-- Legende -->
    <div class="flex items-center gap-2 text-xs text-gray-500">
      <span>{{ $t('trips.heatmapLess') }}</span>
      <div v-for="(c, i) in COLORS" :key="i"
        class="w-4 h-4 rounded-sm" :style="{ background: c }"></div>
      <span>{{ $t('trips.heatmapMore') }}</span>
      <span class="ml-auto">
        {{ $t('trips.heatmapSummary', { trips: totalTrips, km: totalKm.toFixed(0) }) }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import { useAppStore } from '../store/index.js';

const router   = useRouter();
const appStore = useAppStore();

// Filter-State
const period = ref('year');
const year   = ref(new Date().getFullYear());
const month  = ref(new Date().getMonth() + 1);
const week   = ref(1);
const days   = ref([]);   // [{ day: 'YYYY-MM-DD', trips: N, km: F }]
const hover  = ref(null);

// Visuelles Layout
const CELL = 12;
const GAP  = 3;
const CELL_OFFSET = 22;
const DAY_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', 'So'];
// Tailwind-gruene Skala — von dunkel (kein Trip) bis hell (viel km).
const COLORS = ['#1f2937', '#0f3a26', '#16a34a', '#22c55e', '#86efac'];

const monthName = m => new Date(2026, m - 1, 1).toLocaleDateString('de-DE', { month: 'long' });
const fmtDateLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE',
  { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const availableYears = computed(() => {
  const now = new Date().getFullYear();
  return [now, now - 1, now - 2, now - 3];
});

async function load() {
  const params = { period: period.value, vehicle_id: appStore.selectedVehicle?.id };
  if (period.value !== 'all')   params.year  = year.value;
  if (period.value === 'month') params.month = month.value;
  if (period.value === 'week')  params.week  = week.value;
  try {
    const { data } = await api.get('/trips/heatmap', { params });
    days.value = data.days || [];
  } catch { days.value = []; }
}

/** Bestimmt die Spalten (= Wochen) und Zellen-Position. Bei period=year
 *  zeichnen wir das volle Jahr (53 Spalten). Bei 'month' nur den Monat
 *  (5–6 Wochen). Bei 'week' nur 1 Spalte. Bei 'all' den Zeitraum vom
 *  ersten Trip bis heute. */
const cells = computed(() => {
  if (!days.value.length) return [];
  const lookup = new Map(days.value.map(d => [d.day, d]));
  const max    = Math.max(1, ...days.value.map(d => d.km || 0));

  // Bereich bestimmen
  let start, end;
  if (period.value === 'year') {
    start = new Date(year.value, 0, 1);
    end   = new Date(year.value, 11, 31);
  } else if (period.value === 'month') {
    start = new Date(year.value, month.value - 1, 1);
    end   = new Date(year.value, month.value, 0);
  } else if (period.value === 'week') {
    // Annaeherung: %W-basierte Woche → 7 Tage ab Mo der Woche.
    const jan1 = new Date(year.value, 0, 1);
    // Sun-based: Java/JS getDay() Sonntag=0. SQLite's %W ebenso.
    const dayOffset = (week.value - 1) * 7 - jan1.getDay();
    start = new Date(year.value, 0, 1 + dayOffset);
    end   = new Date(start); end.setDate(end.getDate() + 6);
  } else {
    // 'all': vom frühesten Tag bis heute
    if (!days.value.length) return [];
    start = new Date(days.value[0].day + 'T12:00:00');
    end   = new Date();
  }
  // Start auf Montag der Start-Woche ziehen, damit die Spalte voll wird.
  const dow = (start.getDay() + 6) % 7; // Mo=0..So=6
  start.setDate(start.getDate() - dow);

  const out = [];
  const cur = new Date(start);
  let col = 0;
  while (cur <= end) {
    const iso = cur.toISOString().slice(0, 10);
    const row = (cur.getDay() + 6) % 7;
    const data = lookup.get(iso) ?? { day: iso, trips: 0, km: 0 };
    const intensity = data.km ? Math.min(4, Math.floor((data.km / max) * 4) + 1) : 0;
    out.push({
      date:  iso,
      x:     50 + col * (CELL + GAP),
      y:     row * (CELL + GAP) + CELL_OFFSET,
      color: COLORS[intensity],
      trips: data.trips,
      km:    data.km,
    });
    if (row === 6) col++;
    cur.setDate(cur.getDate() + 1);
  }
  return out;
});

/** Monats-Beschriftung berechnet sich aus den Zellen: erste Zelle eines
 *  Monats markiert dessen Spaltenanfang. */
const monthLabels = computed(() => {
  const seen = new Set();
  const labels = [];
  for (const c of cells.value) {
    const month = c.date.slice(0, 7);
    if (!seen.has(month)) {
      seen.add(month);
      labels.push({ x: c.x, label: new Date(c.date + 'T12:00:00').toLocaleDateString('de-DE', { month: 'short' }) });
    }
  }
  return labels;
});

const svgWidth = computed(() => {
  const lastX = cells.value.length ? cells.value[cells.value.length - 1].x : 50;
  return lastX + CELL + 20;
});
const svgHeight = 7 * (CELL + GAP) + CELL_OFFSET + 10;

const totalTrips = computed(() => days.value.reduce((s, d) => s + d.trips, 0));
const totalKm    = computed(() => days.value.reduce((s, d) => s + (d.km || 0), 0));

/** Klick auf einen Tag → Fahrtenliste fuer diesen Tag. Filter via Query-
 *  String, /trips kann ihn (noch nicht) auswerten — vorerst nur Navigation
 *  zur Liste, der User filtert sichtbar selbst. */
function goToTrips(cell) {
  if (!cell.trips) return; // leerer Tag ist nicht klickbar-sinnvoll
  router.push({ path: '/trips', query: { date: cell.date } });
}

onMounted(load);
</script>

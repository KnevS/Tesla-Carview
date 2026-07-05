<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          {{ $t('tripMetrics.title') }}
          <InfoTip :text="$t('tripMetrics.intro')" />
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('tripMetrics.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <select v-model.number="limit" @change="load"
          class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600"
          v-tooltip="$t('tripMetrics.limitTip')">
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="250">250</option>
          <option :value="500">500</option>
        </select>
        <button @click="exportCsv" :disabled="!rows.length" class="btn-secondary text-sm disabled:opacity-40"
          v-tooltip="$t('tripMetrics.csvTip')">
          {{ $t('tripMetrics.csv') }}
        </button>
      </div>
    </div>

    <!-- Summen-Kacheln -->
    <div v-if="rows.length" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('tripMetrics.sumTripsTip')">
        <p class="text-gray-400 text-xs">{{ $t('tripMetrics.sumTrips') }}</p>
        <p class="text-xl font-bold">{{ rows.length }}</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('tripMetrics.sumDistanceTip')">
        <p class="text-gray-400 text-xs">{{ $t('tripMetrics.sumDistance') }}</p>
        <p class="text-xl font-bold">{{ fmtDist(sumDistance) }}</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('tripMetrics.sumEnergyTip')">
        <p class="text-gray-400 text-xs">{{ $t('tripMetrics.sumEnergy') }}</p>
        <p class="text-xl font-bold">{{ sumEnergy != null ? sumEnergy.toFixed(1) + ' kWh' : '—' }}</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('tripMetrics.sumDurationTip')">
        <p class="text-gray-400 text-xs">{{ $t('tripMetrics.sumDuration') }}</p>
        <p class="text-xl font-bold">{{ fmtDuration(sumDuration) }}</p>
      </div>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm py-8 text-center">{{ $t('common.loading') }}</div>

    <div v-else-if="!rows.length"
      class="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-10 text-center text-gray-400">
      {{ $t('tripMetrics.empty') }}
    </div>

    <!-- Tabelle -->
    <div v-else class="overflow-x-auto rounded-xl border border-gray-700">
      <table class="w-full text-sm whitespace-nowrap">
        <thead class="bg-gray-800 text-gray-300">
          <tr>
            <th v-for="col in columns" :key="col.field"
              class="px-3 py-2 text-left font-medium cursor-pointer select-none hover:text-white"
              :class="col.num ? 'text-right' : 'text-left'"
              @click="sortBy(col.field)"
              v-tooltip="col.tip ? $t(col.tip) : null">
              <span class="inline-flex items-center gap-1" :class="col.num ? 'justify-end w-full' : ''">
                {{ $t(col.label) }}
                <span v-if="sortKey === col.field" class="text-[10px]">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sortedRows" :key="r.id"
            class="border-t border-gray-800 hover:bg-gray-800/50 cursor-pointer"
            @click="$router.push(`/trips/${r.id}`)">
            <td class="px-3 py-2">{{ fmtDate(r.start_time) }}</td>
            <td class="px-3 py-2 text-gray-400">{{ trimAddr(r.start_address) }} → {{ trimAddr(r.end_address) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtDuration(r.duration_s) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtDist(r.distance_km) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtEff(r.consumption_kwh_100km) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtSpeed(r.avg_speed_kmh) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtSpeed(r.max_speed_kmh) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtSpeed(r.min_speed_kmh) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtPower(r.avg_power_kw) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtPower(r.max_power_kw) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtPower(r.min_power_kw) }}</td>
            <td class="px-3 py-2 text-right text-gray-400">
              <span v-if="r.start_soc != null && r.end_soc != null">{{ r.start_soc }}→{{ r.end_soc }} %</span>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import { useUnits } from '../store/prefs.js';
import InfoTip from '../components/InfoTip.vue';
import api from '../api.js';

const { t, locale } = useI18n();
const appStore = useAppStore();
const { fmtDistance, fmtEfficiency, fmtSpeed } = useUnits();

const rows    = ref([]);
const loading = ref(true);
const limit   = ref(100);
const sortKey = ref('start_time');
const sortDir = ref('desc');

// Spalten-Definition — Reihenfolge = Tabellen-Reihenfolge. `num` = rechtsbündig.
const columns = [
  { field: 'start_time',            label: 'tripMetrics.colDate' },
  { field: 'route',                 label: 'tripMetrics.colRoute' },
  { field: 'duration_s',            label: 'tripMetrics.colDuration',   num: true, tip: 'tripMetrics.colDurationTip' },
  { field: 'distance_km',           label: 'tripMetrics.colDistance',   num: true },
  { field: 'consumption_kwh_100km', label: 'tripMetrics.colConsumption',num: true, tip: 'tripMetrics.colConsumptionTip' },
  { field: 'avg_speed_kmh',         label: 'tripMetrics.colAvgSpeed',   num: true },
  { field: 'max_speed_kmh',         label: 'tripMetrics.colMaxSpeed',   num: true },
  { field: 'min_speed_kmh',         label: 'tripMetrics.colMinSpeed',   num: true, tip: 'tripMetrics.colMinSpeedTip' },
  { field: 'avg_power_kw',          label: 'tripMetrics.colAvgPower',   num: true, tip: 'tripMetrics.colPowerTip' },
  { field: 'max_power_kw',          label: 'tripMetrics.colMaxPower',   num: true, tip: 'tripMetrics.colPowerTip' },
  { field: 'min_power_kw',          label: 'tripMetrics.colMinPower',   num: true, tip: 'tripMetrics.colMinPowerTip' },
  { field: 'soc',                   label: 'tripMetrics.colSoc',        num: true, tip: 'tripMetrics.colSocTip' },
];

async function load() {
  loading.value = true;
  try {
    const params = { limit: limit.value };
    const vid = appStore.selectedVehicle?.id;
    if (vid) params.vehicle_id = vid;
    const { data } = await api.get('/trips/metrics', { params });
    rows.value = Array.isArray(data) ? data : [];
  } catch { rows.value = []; }
  finally { loading.value = false; }
}

function sortBy(key) {
  if (key === 'route') return; // Route nicht sinnvoll sortierbar
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'start_time' ? 'desc' : 'asc';
  }
}

const sortedRows = computed(() => {
  const key = sortKey.value;
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...rows.value].sort((a, b) => {
    const av = a[key], bv = b[key];
    // null immer ans Ende, unabhängig von der Richtung.
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av > bv ? dir : av < bv ? -dir : 0;
  });
});

// ── Summen ────────────────────────────────────────────────────────────────
const sumDistance = computed(() => rows.value.reduce((s, r) => s + (r.distance_km || 0), 0));
const sumDuration = computed(() => rows.value.reduce((s, r) => s + (r.duration_s || 0), 0));
const sumEnergy   = computed(() => {
  const vals = rows.value.filter(r => r.energy_used_kwh != null);
  return vals.length ? vals.reduce((s, r) => s + r.energy_used_kwh, 0) : null;
});

// ── Formatter (null-sicher) ─────────────────────────────────────────────────
const DASH = '—';
const fmtDist  = km  => (km == null ? DASH : fmtDistance(km, 1));
const fmtEff   = v   => (v  == null ? DASH : fmtEfficiency(v));
const fmtPower = kw  => (kw == null ? DASH : `${kw.toFixed(1)} kW`);

function fmtDuration(sec) {
  if (sec == null || sec < 0) return DASH;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function fmtDate(ts) {
  if (!ts) return DASH;
  return new Date(ts * 1000).toLocaleString(locale.value, {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function trimAddr(a) {
  if (!a) return DASH;
  return a.length > 22 ? a.slice(0, 21) + '…' : a;
}

// ── CSV-Export (Semikolon + BOM, Excel-freundlich) ──────────────────────────
function exportCsv() {
  const head = [
    t('tripMetrics.colDate'), t('tripMetrics.csvStart'), t('tripMetrics.csvEnd'),
    t('tripMetrics.colDuration') + ' (min)', t('tripMetrics.colDistance') + ' (km)',
    t('tripMetrics.colConsumption') + ' (kWh/100km)',
    t('tripMetrics.colAvgSpeed') + ' (km/h)', t('tripMetrics.colMaxSpeed') + ' (km/h)',
    t('tripMetrics.colMinSpeed') + ' (km/h)',
    t('tripMetrics.colAvgPower') + ' (kW)', t('tripMetrics.colMaxPower') + ' (kW)',
    t('tripMetrics.colMinPower') + ' (kW)',
    'SoC Start (%)', 'SoC ' + t('tripMetrics.csvEnd') + ' (%)',
  ];
  const num = (v, d = 1) => (v == null ? '' : v.toFixed(d).replace('.', ','));
  const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = sortedRows.value.map(r => [
    esc(fmtDate(r.start_time)), esc(r.start_address), esc(r.end_address),
    num(r.duration_s != null ? r.duration_s / 60 : null, 0),
    num(r.distance_km), num(r.consumption_kwh_100km),
    num(r.avg_speed_kmh, 0), num(r.max_speed_kmh, 0), num(r.min_speed_kmh, 0),
    num(r.avg_power_kw), num(r.max_power_kw), num(r.min_power_kw),
    r.start_soc ?? '', r.end_soc ?? '',
  ].join(';'));
  const csv = '﻿' + head.join(';') + '\n' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `teslaview-fahrtwerte-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

<template>
  <div class="card space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold"
        v-tooltip="'Voraussichtliche Tesla-Fleet-API-Kosten im laufenden Monat — basiert auf den von Tesla veröffentlichten Tarifen je Kategorie.'">
        💸 Tesla API-Nutzung
      </h2>
      <span class="text-xs text-gray-500" v-if="data">{{ data.period }}</span>
    </div>

    <p v-if="loading && !data" class="text-sm text-gray-500">Lade…</p>
    <p v-else-if="error" class="text-sm text-red-400">{{ error }}</p>

    <template v-else-if="data">
      <!-- Spend-Übersicht -->
      <div class="flex items-baseline justify-between text-sm">
        <span>
          <span class="text-2xl font-bold text-white">{{ fmt(data.billableUsd) }}</span>
          <span class="text-gray-400 ml-1">{{ data.config.currency }}</span>
          <span class="text-gray-500 ml-2 text-xs">von {{ fmt(data.limitUsd) }}</span>
        </span>
        <span :class="pctColor">{{ data.pct.toFixed(1) }} %</span>
      </div>

      <!-- Balken mit Hard-Stop-Marker -->
      <div class="relative h-3 bg-gray-700 rounded overflow-hidden">
        <div class="h-full transition-all" :class="barColor" :style="{ width: data.pct + '%' }"></div>
        <div v-if="data.hardStopAtUsd !== null && data.limitUsd > 0"
          class="absolute top-0 bottom-0 w-px bg-red-500"
          :style="{ left: hardStopPct + '%' }"
          v-tooltip="`Hard-Stop bei ${fmt(data.hardStopAtUsd)} ${data.config.currency}`"></div>
      </div>

      <!-- Free-Credit -->
      <p v-if="data.freeCreditUsd > 0" class="text-xs text-gray-500">
        Brutto {{ fmt(data.grossCostUsd) }} − {{ fmt(data.freeCreditUsd) }} Free-Credit = abrechenbar.
      </p>

      <!-- Kategorien-Breakdown -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div v-for="(cat, key) in data.categories" :key="key"
          class="bg-gray-800 rounded px-2 py-1.5">
          <div class="text-gray-400">{{ catLabel(key) }}</div>
          <div class="font-mono text-white">{{ cat.calls }}</div>
          <div class="text-gray-500">{{ fmt(cat.cost, 4) }}</div>
        </div>
      </div>

      <!-- Hard-Stop aktiv -->
      <p v-if="data.blocked"
        class="text-xs bg-red-900/40 text-red-300 rounded px-2 py-1.5">
        ⛔ Hard-Stop aktiv — weitere Tesla-API-Calls werden blockiert.
      </p>

      <!-- Letztes Tesla-Validierungs-Event -->
      <p v-if="data.recentEvents?.[0]" class="text-xs text-gray-500">
        Letzte Tesla-Validierung: {{ fmtDate(data.recentEvents[0].received_at) }}
        <span v-if="data.recentEvents[0].threshold">— Schwelle {{ data.recentEvents[0].threshold }}</span>
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import api from '../api.js';

const data    = ref(null);
const loading = ref(false);
const error   = ref('');
let timer     = null;

const CAT_LABELS = {
  vehicle_data:     'Vehicle-Data',
  wake:             'Wake',
  command:          'Commands',
  streaming_signal: 'Streaming',
  other:            'Sonstige',
};
const catLabel = (k) => CAT_LABELS[k] || k;

const pctColor = computed(() => {
  if (!data.value) return 'text-gray-400';
  if (data.value.pct >= 90) return 'text-red-400 font-semibold';
  if (data.value.pct >= 70) return 'text-amber-400';
  return 'text-green-400';
});
const barColor = computed(() => {
  if (!data.value) return 'bg-gray-500';
  if (data.value.pct >= 90) return 'bg-red-500';
  if (data.value.pct >= 70) return 'bg-amber-500';
  return 'bg-green-500';
});
const hardStopPct = computed(() => {
  if (!data.value || data.value.limitUsd <= 0 || data.value.hardStopAtUsd === null) return 100;
  return Math.min(100, (data.value.hardStopAtUsd / data.value.limitUsd) * 100);
});

const fmt = (n, digits = 2) =>
  Number(n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtDate = (ts) => new Date(ts * 1000).toLocaleString('de-DE');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data: d } = await api.get('/tesla-usage/current');
    data.value = d;
  } catch (e) {
    error.value = e.response?.data?.error ?? 'Konnte Nutzungsdaten nicht laden';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  timer = setInterval(load, 30_000);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

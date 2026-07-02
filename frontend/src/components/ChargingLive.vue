<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  Live-Ladevorgang (S07). Zeigt die AKTUELL laufende Ladesession in Echtzeit:
  Leistung (kW) und Ladestand (%) über die Zeit, plus eine Erwartungskurve aus
  einer vergleichbaren, abgeschlossenen Session (soc→kW). So wird eine
  Drosselung (Tapering/Temperatur) sofort gegen den Normalverlauf sichtbar.

  Datenquelle: GET /api/charging/current?vehicle_id= — nutzt die vom Poller
  ohnehin geschriebenen charging_points, KEIN zusätzlicher Tesla-API-Call.
  Poll alle 30 s; blendet sich automatisch aus, wenn keine Session läuft.
-->
<template>
  <div v-if="active" class="bg-gray-800 rounded-2xl p-5 shadow-lg border border-green-700/40">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="live-dot" aria-hidden="true"></span>
        <h3 class="text-base font-bold">{{ $t('charging.liveTitle') }}</h3>
        <span class="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-300">{{ $t('charging.liveBadge') }}</span>
      </div>
      <span class="text-xs text-gray-400">{{ headerLine }}</span>
    </div>

    <!-- Live-Eckdaten -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div class="bg-gray-700/50 rounded-xl p-3">
        <p class="text-xs text-gray-400">{{ $t('charging.liveCurrentPower') }}</p>
        <p class="font-bold text-green-400">{{ fmt(currentPower, 1) }} kW</p>
      </div>
      <div class="bg-gray-700/50 rounded-xl p-3">
        <p class="text-xs text-gray-400">{{ $t('charging.detailSocChange') }}</p>
        <p class="font-bold">{{ session.start_soc }}% → {{ currentSoc }}%</p>
      </div>
      <div class="bg-gray-700/50 rounded-xl p-3">
        <p class="text-xs text-gray-400">{{ $t('charging.detailEnergy') }}</p>
        <p class="font-bold text-green-400">{{ fmt(addedKwh, 1) }} kWh</p>
      </div>
      <div class="bg-gray-700/50 rounded-xl p-3">
        <p class="text-xs text-gray-400">{{ $t('charging.liveElapsed') }}</p>
        <p class="font-bold">{{ elapsedLabel }}</p>
      </div>
    </div>

    <!-- Live-Kurve + Erwartung -->
    <div v-if="hasPoints" class="h-64">
      <Line :data="curveData" :options="curveOpts" />
    </div>
    <p v-else class="text-sm text-gray-500 py-6 text-center">{{ $t('charging.liveWaiting') }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const props = defineProps({
  vehicleId: { type: [Number, String], default: null },
});

const { t, locale } = useI18n();
const data = ref(null);
let timer = null;

const active   = computed(() => !!data.value?.active);
const session  = computed(() => data.value?.session || {});
const points   = computed(() => data.value?.points || []);
const expected = computed(() => data.value?.expected || []);

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR', uk: 'uk-UA' };
const localeTag = () => LOCALE_TAG[locale.value] || 'de-DE';
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' });

const lastPoint    = computed(() => points.value[points.value.length - 1] || null);
const currentPower = computed(() => lastPoint.value?.power_kw ?? session.value.max_power_kw ?? 0);
const currentSoc   = computed(() => lastPoint.value?.soc ?? session.value.start_soc ?? 0);
const addedKwh     = computed(() => lastPoint.value?.energy_added_kwh ?? session.value.energy_added_kwh ?? 0);

const headerLine = computed(() => session.value.start_time ? fmtTime(session.value.start_time) : '');

const elapsedLabel = computed(() => {
  if (!session.value.start_time) return '–';
  const mins = Math.round((Date.now() / 1000 - session.value.start_time) / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
});

const hasPoints = computed(() => points.value.length >= 2);

// Erwartete Leistung beim SoC des jeweiligen Live-Punkts (nächster SoC-Nachbar).
function expectedAtSoc(soc) {
  const arr = expected.value;
  if (!arr.length || soc == null) return null;
  let best = null, bestD = Infinity;
  for (const e of arr) {
    const d = Math.abs(e.soc - soc);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best ? best.power_kw : null;
}

const curveData = computed(() => {
  const pts = points.value;
  const datasets = [
    {
      label: t('charging.detailPowerAxis'),
      data: pts.map(p => p.power_kw ?? 0),
      borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)',
      tension: 0.35, pointRadius: 0, fill: true, yAxisID: 'y',
    },
    {
      label: t('charging.detailSocAxis'),
      data: pts.map(p => p.soc ?? null),
      borderColor: '#E31937', tension: 0.35, pointRadius: 0, fill: false, yAxisID: 'y1',
    },
  ];
  if (expected.value.length) {
    datasets.push({
      label: t('charging.liveExpected'),
      data: pts.map(p => expectedAtSoc(p.soc)),
      borderColor: '#9ca3af', borderDash: [5, 4],
      tension: 0.35, pointRadius: 0, fill: false, yAxisID: 'y',
    });
  }
  return { labels: pts.map(p => fmtTime(p.timestamp)), datasets };
});

const curveOpts = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { labels: { color: '#9ca3af' } } },
  scales: {
    x: { ticks: { color: '#9ca3af', maxTicksLimit: 8 }, grid: { color: '#374151' } },
    y: {
      position: 'left', beginAtZero: true,
      title: { display: true, text: 'kW', color: '#10b981' },
      ticks: { color: '#9ca3af' }, grid: { color: '#374151' },
    },
    y1: {
      position: 'right', min: 0, max: 100,
      title: { display: true, text: '%', color: '#E31937' },
      ticks: { color: '#9ca3af' }, grid: { drawOnChartArea: false },
    },
  },
};

async function refresh() {
  const vid = props.vehicleId;
  if (!vid) { data.value = null; return; }
  try {
    const { data: d } = await api.get('/charging/current', { params: { vehicle_id: vid } });
    data.value = d;
  } catch { data.value = null; }
}

onMounted(() => {
  refresh();
  timer = setInterval(refresh, 30000);
});
onBeforeUnmount(() => { if (timer) clearInterval(timer); });
watch(() => props.vehicleId, refresh);
</script>

<style scoped>
.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  animation: live-pulse 1.6s ease-out infinite;
}
@keyframes live-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
  70%  { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
</style>

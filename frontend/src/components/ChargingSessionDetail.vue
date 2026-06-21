<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  Detailansicht einer einzelnen Ladesession als Modal.

  Anders als die aggregierte „Ladekurve" in Battery.vue (Ø-Spitzenleistung je
  SOC-Band ueber ALLE Sessions) zeigt diese Ansicht den Verlauf EINER Session:
  Leistung (kW) und Ladestand (%) ueber die Zeit, aus charging_points.

  Daten kommen unveraendert aus GET /api/charging/:id ({ ...session, points }).
  Die Netzentnahme/Ladeverlust ist eine bewusst gekennzeichnete Schaetzung —
  Tesla liefert nur die batterieseitig nachgeladene Energie, nicht die aus dem
  Netz gezogene; der Wirkungsgrad wird je Ladetyp angenommen.
-->
<template>
  <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
       @click.self="$emit('close')" role="dialog" aria-modal="true">
    <div class="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <!-- Kopf -->
      <div class="flex items-start justify-between p-5 border-b border-gray-700 sticky top-0 bg-gray-800 rounded-t-2xl">
        <div>
          <h2 class="text-lg font-bold">{{ $t('charging.detailTitle') }}</h2>
          <p class="text-sm text-gray-400 mt-0.5">{{ headerLine }}</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-xl leading-none px-2"
          v-tooltip="$t('charging.detailClose')" aria-label="close">✕</button>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-400">{{ $t('charging.detailLoading') }}</div>

      <div v-else-if="session" class="p-5 space-y-5">
        <!-- Eckdaten -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.detailDurationTooltip')">
            <p class="text-xs text-gray-400">{{ $t('charging.detailDuration') }}</p>
            <p class="font-bold">{{ durationLabel }}</p>
          </div>
          <div class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.socTooltip')">
            <p class="text-xs text-gray-400">{{ $t('charging.detailSocChange') }}</p>
            <p class="font-bold">{{ session.start_soc }}% → {{ session.end_soc }}%
              <span class="text-green-400 text-sm">(+{{ socDelta }})</span></p>
          </div>
          <div class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.energyAddedTooltip')">
            <p class="text-xs text-gray-400">{{ $t('charging.detailEnergy') }}</p>
            <p class="font-bold text-green-400">{{ fmt(session.energy_added_kwh, 1) }} kWh</p>
          </div>
          <div class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.detailAvgPowerTooltip')">
            <p class="text-xs text-gray-400">{{ $t('charging.detailAvgPower') }}</p>
            <p class="font-bold">{{ fmt(avgPowerKw, 1) }} kW</p>
          </div>
          <div class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.maxPowerTooltip')">
            <p class="text-xs text-gray-400">{{ $t('charging.detailPeakPower') }}</p>
            <p class="font-bold">{{ fmt(session.max_power_kw, 0) }} kW</p>
          </div>
          <div v-if="!session.is_free" class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.totalCostTooltip')">
            <p class="text-xs text-gray-400">{{ $t('charging.detailCost') }}</p>
            <p class="font-bold">
              {{ session.cost != null ? fmt(session.cost, 2) + ' ' + (session.currency || 'EUR') : '–' }}
              <span v-if="session.billing_rate_kwh != null" class="text-gray-400 text-sm font-normal">
                · {{ fmt(session.billing_rate_kwh, 3) }} €/kWh</span>
            </p>
          </div>
        </div>

        <!-- Netzentnahme & Verlust (Schaetzung) -->
        <div v-if="session.energy_added_kwh" class="flex items-center justify-between text-sm bg-gray-700/30 rounded-xl px-4 py-3">
          <div v-tooltip="$t('charging.detailGridDrawTooltip', { pct: lossPct })">
            <span class="text-gray-400">{{ $t('charging.detailGridDraw') }}</span>
            <span class="font-semibold ml-2">≈ {{ fmt(gridDrawKwh, 1) }} kWh</span>
          </div>
          <div v-tooltip="$t('charging.detailLossTooltip')">
            <span class="text-gray-400">{{ $t('charging.detailLoss') }}</span>
            <span class="font-semibold ml-2 text-amber-300">≈ {{ fmt(lossKwh, 1) }} kWh</span>
          </div>
        </div>

        <!-- Verlaufskurve -->
        <div>
          <h3 class="text-sm font-semibold text-gray-300 mb-2">{{ $t('charging.detailCurveTitle') }}</h3>
          <div v-if="hasPoints" class="h-64">
            <Line :data="curveData" :options="curveOpts" />
          </div>
          <p v-else class="text-sm text-gray-500 py-6 text-center">{{ $t('charging.detailNoPoints') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { formatLocation } from '../lib/location.js';
import api from '../api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const props = defineProps({ sessionId: { type: [Number, String], required: true } });
defineEmits(['close']);

const { t, locale } = useI18n();
const session = ref(null);
const loading = ref(true);

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR', uk: 'uk-UA' };
const localeTag = () => LOCALE_TAG[locale.value] || 'de-DE';
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' });

const headerLine = computed(() => {
  if (!session.value) return '';
  const where = formatLocation({
    address: session.value.location_name, lat: session.value.lat, lon: session.value.lon,
    fallback: t('charging.unknownLocation'),
  });
  const when = new Date(session.value.start_time * 1000).toLocaleString(localeTag());
  return `${where} · ${when}`;
});

const socDelta = computed(() =>
  Math.max(0, (session.value?.end_soc ?? 0) - (session.value?.start_soc ?? 0)));

const durationLabel = computed(() => {
  const s = session.value;
  if (!s?.start_time || !s?.end_time) return '–';
  const mins = Math.round((s.end_time - s.start_time) / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
});

const avgPowerKw = computed(() => {
  const s = session.value;
  if (!s?.start_time || !s?.end_time || !s?.energy_added_kwh) return 0;
  const hours = (s.end_time - s.start_time) / 3600;
  return hours > 0 ? s.energy_added_kwh / hours : 0;
});

// Wirkungsgrad-Annahme je Ladetyp. AC-Laden hat hoehere Verluste (Onboard-
// Charger + Wallbox) als DC, wo direkt in die Batterie gespeist wird.
const efficiency = computed(() => {
  const tp = session.value?.charger_type;
  if (tp === 'AC') return 0.88;
  if (tp === 'DC' || tp === 'Tesla' || tp === 'Combo') return 0.94;
  return 0.90; // unbekannt: konservativer Mittelwert
});
const gridDrawKwh = computed(() => (session.value?.energy_added_kwh || 0) / efficiency.value);
const lossKwh = computed(() => gridDrawKwh.value - (session.value?.energy_added_kwh || 0));
const lossPct = computed(() => Math.round((1 - efficiency.value) * 100));

const hasPoints = computed(() => (session.value?.points?.length ?? 0) >= 2);

const curveData = computed(() => {
  const pts = session.value?.points || [];
  return {
    labels: pts.map(p => fmtTime(p.timestamp)),
    datasets: [
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
    ],
  };
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

onMounted(async () => {
  try {
    const { data } = await api.get(`/charging/${props.sessionId}`);
    session.value = data;
  } catch { /* Fehler still — Modal zeigt dann leeren Zustand */ }
  loading.value = false;
});
</script>

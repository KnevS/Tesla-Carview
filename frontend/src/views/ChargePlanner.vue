<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  Ladeplaner (S08 „Laden, das sich selbst timt").

  Nimmt aktuellen/gewuenschten Ladestand, Akkukapazitaet, Ladeleistung und
  Abfahrtszeit entgegen und zeigt, in welchen (guenstigsten) Stundenslots
  bis zur Abfahrt geladen werden sollte — inkl. Kosten und Ersparnis
  gegenueber „sofort durchladen". Reine Auswertung der dynamischen
  Tarifkurve, kein Tesla-/Fleet-Call. Eingaben werden lokal gemerkt.

  Datenquellen: GET /api/tariff/prices (Kurve + configured-Flag) und
  GET /api/tariff/charge-plan (gewaehlte Slots + Kosten).
-->
<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        {{ $t('chargePlanner.title') }}
        <InfoTip :text="$t('chargePlanner.intro')" />
      </h1>
      <p class="text-gray-400 text-sm mt-0.5">{{ $t('chargePlanner.subtitle') }}</p>
    </div>

    <!-- Leerzustand: kein dynamischer Tarif konfiguriert -->
    <div v-if="configured === false" class="bg-gray-800 rounded-xl p-6 text-center">
      <p class="text-gray-300">{{ $t('chargePlanner.notConfigured') }}</p>
      <router-link to="/admin/settings" class="btn-secondary text-sm inline-block mt-3">
        {{ $t('chargePlanner.configureTariff') }}
      </router-link>
    </div>

    <template v-else>
      <!-- Eingaben -->
      <div class="bg-gray-800 rounded-xl p-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <label class="block">
            <span class="text-xs text-gray-400 flex items-center gap-1">
              {{ $t('chargePlanner.currentSoc') }}
            </span>
            <input v-model.number="form.currentSoc" type="number" min="0" max="100" step="1"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
          <label class="block">
            <span class="text-xs text-gray-400">{{ $t('chargePlanner.targetSoc') }}</span>
            <input v-model.number="form.targetSoc" type="number" min="0" max="100" step="1"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
          <label class="block">
            <span class="text-xs text-gray-400 flex items-center gap-1">
              {{ $t('chargePlanner.capacity') }}
              <InfoTip :text="$t('chargePlanner.capacityTip')" />
            </span>
            <input v-model.number="form.capacityKwh" type="number" min="1" max="250" step="0.5"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
          <label class="block">
            <span class="text-xs text-gray-400 flex items-center gap-1">
              {{ $t('chargePlanner.power') }}
              <InfoTip :text="$t('chargePlanner.powerTip')" />
            </span>
            <input v-model.number="form.powerKw" type="number" min="0.1" max="400" step="0.1"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
          <label class="block">
            <span class="text-xs text-gray-400">{{ $t('chargePlanner.readyBy') }}</span>
            <input v-model="form.readyBy" type="datetime-local"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <button @click="compute" :disabled="loading" class="btn-primary text-sm disabled:opacity-40">
            {{ loading ? $t('chargePlanner.computing') : $t('chargePlanner.compute') }}
          </button>
          <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
        </div>
      </div>

      <!-- Ergebnis -->
      <template v-if="plan">
        <!-- Nicht-machbar-Hinweis: Zeit reicht nicht bis zur Abfahrt -->
        <div v-if="!plan.feasible" class="bg-amber-900/40 border border-amber-700/50 rounded-xl p-4">
          <p class="text-amber-200 text-sm">
            {{ $t('chargePlanner.infeasible', { soc: plan.achieved_soc, target: form.targetSoc }) }}
          </p>
        </div>

        <!-- Kennzahlen -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('chargePlanner.tileChargeTip')">
            <p class="text-gray-400 text-xs">{{ $t('chargePlanner.tileCharge') }}</p>
            <p class="text-xl font-bold">{{ fmt(deliveredKwh, 1) }} kWh</p>
            <p class="text-xs text-gray-400">{{ form.currentSoc }}% → {{ plan.achieved_soc }}%</p>
          </div>
          <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('chargePlanner.tileDurationTip')">
            <p class="text-gray-400 text-xs">{{ $t('chargePlanner.tileDuration') }}</p>
            <p class="text-xl font-bold">{{ fmtDuration(plan.hours_needed) }}</p>
            <p class="text-xs text-gray-400">{{ form.powerKw }} kW</p>
          </div>
          <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('chargePlanner.tileCostTip')">
            <p class="text-gray-400 text-xs">{{ $t('chargePlanner.tileCost') }}</p>
            <p class="text-xl font-bold text-green-400">{{ eur(plan.optimal_cost_ct) }}</p>
            <p class="text-xs text-gray-400">Ø {{ fmt(plan.optimal_avg_ct_per_kwh, 1) }} ct/kWh</p>
          </div>
          <div class="bg-gray-800 rounded-xl p-3" v-tooltip="$t('chargePlanner.tileSavingsTip')">
            <p class="text-gray-400 text-xs">{{ $t('chargePlanner.tileSavings') }}</p>
            <p class="text-xl font-bold" :class="plan.savings_ct > 0 ? 'text-green-400' : 'text-gray-300'">
              {{ eur(plan.savings_ct) }}
            </p>
            <p class="text-xs text-gray-400">
              {{ $t('chargePlanner.vsImmediate', { value: eur(plan.immediate_cost_ct) }) }} · −{{ plan.savings_pct }}%
            </p>
          </div>
        </div>

        <!-- Slot-Balken: Planungsfenster bis Abfahrt, gewaehlte Slots gruen -->
        <div v-if="windowPrices.length" class="bg-gray-800 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold">{{ $t('chargePlanner.scheduleTitle') }}</p>
            <div class="flex items-center gap-3 text-xs text-gray-400">
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded" style="background:#10b981"></span>{{ $t('chargePlanner.legendCharge') }}</span>
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded bg-gray-600"></span>{{ $t('chargePlanner.legendIdle') }}</span>
            </div>
          </div>
          <div class="flex items-end gap-0.5 h-28">
            <div v-for="p in windowPrices" :key="p.start"
              class="flex-1 flex flex-col items-center justify-end h-full">
              <div class="w-full rounded-t transition-all"
                :style="{ height: barHeight(p.ct_per_kwh) + '%', background: isChosen(p) ? '#10b981' : '#4b5563' }"
                v-tooltip="$t('chargePlanner.barTooltip', { time: fmtHour(p.start), value: fmt(p.ct_per_kwh, 1), kwh: fmt(chosenKwh(p), 1) })">
              </div>
            </div>
          </div>
          <div class="flex gap-0.5 mt-1">
            <div v-for="(p, i) in windowPrices" :key="'l' + p.start" class="flex-1 text-center">
              <span v-if="i % 3 === 0" class="text-[10px] text-gray-500">{{ fmtHourShort(p.start) }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import InfoTip from '../components/InfoTip.vue';
import api from '../api.js';

const { t, locale } = useI18n();

const STORAGE_KEY = 'tesla-carview-chargeplan';
const configured = ref(null);   // null = laden, false = kein Tarif, true = ok
const loading = ref(false);
const error = ref('');
const plan = ref(null);
const allPrices = ref([]);      // volle Kurve fuer die Balken

const form = reactive({
  currentSoc: 20,
  targetSoc: 80,
  capacityKwh: 75,
  powerKw: 11,
  readyBy: defaultReadyBy(),
});

// Standard-Abfahrt: morgen 07:00 Ortszeit als datetime-local-String.
function defaultReadyBy() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const eur = ct => (((ct || 0) / 100)).toLocaleString(tag(), { style: 'currency', currency: 'EUR' });
function fmtDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR', uk: 'uk-UA' };
const tag = () => LOCALE_TAG[locale.value] || 'de-DE';
const fmtHour = ts => new Date(ts * 1000).toLocaleString(tag(), { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const fmtHourShort = ts => new Date(ts * 1000).toLocaleTimeString(tag(), { hour: '2-digit' });

// Balken nur fuer das Planungsfenster [jetzt, Abfahrt].
const windowPrices = computed(() => {
  if (!plan.value) return [];
  const { start, end } = plan.value.window;
  return allPrices.value.filter(p => p.end > start && p.start < end);
});

const chosenMap = computed(() => {
  const m = new Map();
  for (const s of plan.value?.slots ?? []) m.set(s.start, s.kwh);
  return m;
});
const isChosen = p => chosenMap.value.has(p.start);
const chosenKwh = p => chosenMap.value.get(p.start) ?? 0;

// Tatsaechlich im Akku ankommende Energie (Netz minus Ladeverluste). Im
// machbaren Fall == energy_to_battery_kwh; im nicht-machbaren Fall passt sie
// zum erreichten Ladestand statt zum (unerreichbaren) Ziel.
const deliveredKwh = computed(() =>
  (plan.value?.charged_kwh ?? 0) * (plan.value?.efficiency ?? 0.9));

function barHeight(ct) {
  const vals = windowPrices.value.map(p => p.ct_per_kwh);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = Math.max(max - min, 1);
  return Math.max(6, Math.round(((ct - min) / range) * 90 + 6));
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* egal */ }
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) Object.assign(form, saved, { readyBy: form.readyBy });
  } catch { /* egal */ }
}

async function compute() {
  loading.value = true;
  error.value = '';
  persist();
  try {
    const readyTs = Math.floor(new Date(form.readyBy).getTime() / 1000);
    const params = {
      current_soc: form.currentSoc,
      target_soc: form.targetSoc,
      capacity_kwh: form.capacityKwh,
      power_kw: form.powerKw,
    };
    if (Number.isFinite(readyTs) && readyTs > 0) params.ready_by = readyTs;
    const { data } = await api.get('/tariff/charge-plan', { params });
    if (!data.configured) { configured.value = false; return; }
    configured.value = true;
    plan.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  } finally {
    loading.value = false;
  }
}

async function loadCurve() {
  try {
    const { data } = await api.get('/tariff/prices');
    configured.value = !!data.configured;
    allPrices.value = data.prices ?? [];
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  }
}

onMounted(async () => {
  restore();
  await loadCurve();
  if (configured.value) compute();
});
</script>

<template>
  <div class="card space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="font-semibold flex items-center gap-2">
        🌍 {{ $t('community.title') }}
        <InfoTip :text="$t('community.titleTip')" />
      </h2>
      <!-- Opt-in Toggle -->
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <span class="text-xs text-gray-400">{{ $t('community.optIn') }}</span>
        <button
          @click="toggleOptIn"
          class="relative inline-flex h-5 w-9 rounded-full transition-colors duration-200"
          :class="optIn ? 'bg-green-500' : 'bg-gray-600'"
          v-tooltip="optIn ? $t('community.optInActiveTooltip') : $t('community.optInInactiveTooltip')">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
            :class="optIn ? 'translate-x-4' : 'translate-x-0.5'"></span>
        </button>
      </label>
    </div>

    <!-- Opt-out Hinweis -->
    <div v-if="!optIn" class="bg-gray-800 rounded-xl p-4 text-sm text-gray-400 space-y-2">
      <p>{{ $t('community.optOutHint') }}</p>
      <ul class="list-disc list-inside space-y-1 text-xs text-gray-500">
        <li>{{ $t('community.privacyPoint1') }}</li>
        <li>{{ $t('community.privacyPoint2') }}</li>
        <li>{{ $t('community.privacyPoint3') }}</li>
      </ul>
    </div>

    <!-- Opt-in: Beitrag + Vergleich -->
    <template v-else>
      <!-- Eigener Verbrauch -->
      <div v-if="myStats" class="bg-gray-800 rounded-xl p-3 space-y-1">
        <p class="text-xs text-gray-400">{{ $t('community.yourStats') }}</p>
        <div class="flex items-center justify-between">
          <span class="text-lg font-bold text-white">
            {{ myStats.avg_kwh_100km != null ? myStats.avg_kwh_100km.toFixed(1) + ' kWh/100 km' : '—' }}
          </span>
          <span class="text-xs text-gray-500">{{ myStats.trips }} {{ $t('community.trips') }}</span>
        </div>
        <p class="text-xs text-gray-500">{{ modelLabel }}</p>
      </div>

      <!-- Community-Vergleich -->
      <div v-if="benchmark?.available">
        <div class="space-y-3">
          <!-- Dein Verbrauch vs. Community -->
          <div v-if="myStats" class="space-y-1.5">
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>{{ $t('community.you') }}</span>
              <span :class="myVsCommunity <= 0 ? 'text-green-400' : 'text-orange-400'">
                {{ myVsCommunity > 0 ? '+' : '' }}{{ myVsCommunity?.toFixed(1) }}% vs. Ø
              </span>
            </div>
            <div class="h-4 bg-gray-700 rounded-full overflow-hidden relative">
              <div class="h-full rounded-full transition-all"
                :class="myVsCommunity <= 0 ? 'bg-green-500' : 'bg-orange-500'"
                :style="{ width: myBarWidth + '%' }"></div>
              <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-medium">
                {{ myStats.avg_kwh_100km?.toFixed(1) }}
              </span>
            </div>
          </div>

          <!-- Community Ø -->
          <div>
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>Community Ø ({{ benchmark.contributors }} {{ $t('community.contributors') }})</span>
              <span class="text-gray-300">{{ benchmark.avg_kwh_100km }} kWh/100 km</span>
            </div>
            <div class="h-4 bg-gray-700 rounded-full overflow-hidden relative">
              <div class="h-full bg-gray-500 rounded-full" style="width: 100%"></div>
              <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-medium">
                {{ benchmark.avg_kwh_100km }}
              </span>
            </div>
          </div>

          <!-- Bandbreite P25–P75 -->
          <p class="text-xs text-gray-500 mt-1">
            {{ $t('community.range') }}: {{ benchmark.p25_kwh_100km }}–{{ benchmark.p75_kwh_100km }} kWh/100 km
            (P25–P75)
          </p>
        </div>

        <button @click="contribute"
          :disabled="contributing"
          class="mt-3 btn-secondary text-xs px-3 py-1.5 w-full"
          v-tooltip="$t('community.contributeTooltip')">
          {{ contributing ? '…' : $t('community.contribute') }}
        </button>
        <p v-if="contributeMsg" class="text-xs text-center mt-1"
          :class="contributeMsgOk ? 'text-green-400' : 'text-red-400'">
          {{ contributeMsg }}
        </p>
      </div>

      <!-- Noch zu wenige Teilnehmer -->
      <div v-else-if="benchmark?.available === false" class="text-sm text-gray-400 space-y-2">
        <p>{{ $t('community.notEnough', { count: benchmark.contributors, min: benchmark.min_contributors }) }}</p>
        <button @click="contribute" :disabled="contributing" class="btn-secondary text-xs px-3 py-1.5">
          {{ contributing ? '…' : $t('community.contribute') }}
        </button>
        <p v-if="contributeMsg" class="text-xs"
          :class="contributeMsgOk ? 'text-green-400' : 'text-red-400'">{{ contributeMsg }}</p>
      </div>

      <p v-else class="text-sm text-gray-400">{{ $t('community.loading') }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import InfoTip from './InfoTip.vue';
import api from '../api.js';

const { t }    = useI18n();
const appStore = useAppStore();

const optIn       = ref(false);
const benchmark   = ref(null);
const myStats     = ref(null);
const modelLabel  = ref('');
const contributing   = ref(false);
const contributeMsg  = ref('');
const contributeMsgOk = ref(true);

async function loadOptIn() {
  try {
    const { data } = await api.get('/community/opt-in');
    optIn.value = data.opt_in;
  } catch { /* ignore */ }
}

async function loadBenchmark() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid || !optIn.value) return;
  try {
    // Eigene Trips-Stats
    const tripsResp = await api.get(`/trips/weather-consumption?vehicle_id=${vid}`).catch(() => null);
    // Modell aus Fahrzeug
    const veh = appStore.selectedVehicle;
    const mk  = (veh?.model || '').toLowerCase().replace(/\s+/g, ' ').trim() || 'unknown';
    modelLabel.value = veh?.model || mk;

    // Eigener Durchschnitt aus Energy-Report
    try {
      const { data: erData } = await api.get(`/energy/report?weeks=52&vehicle_id=${vid}`);
      if (erData.overall?.avg_consumption != null) {
        myStats.value = {
          avg_kwh_100km: erData.overall.avg_consumption,
          trips: erData.weeks?.reduce((s, w) => s + (w.trips || 0), 0) ?? 0,
        };
      }
    } catch { /* ignore */ }

    // Community-Stats
    const { data: bData } = await api.get(`/community/stats/${encodeURIComponent(mk)}`);
    benchmark.value = bData;
  } catch { /* ignore */ }
}

async function toggleOptIn() {
  const newVal = !optIn.value;
  try {
    await api.put('/community/opt-in', { opt_in: newVal });
    optIn.value = newVal;
    if (newVal) loadBenchmark();
  } catch { /* ignore */ }
}

async function contribute() {
  contributing.value = true;
  contributeMsg.value = '';
  try {
    await api.post('/community/contribute');
    contributeMsgOk.value = true;
    contributeMsg.value = '✓ ' + t('community.contributeSuccess');
    setTimeout(() => { contributeMsg.value = ''; loadBenchmark(); }, 2000);
  } catch (err) {
    contributeMsgOk.value = false;
    contributeMsg.value = err.response?.data?.error || t('community.contributeError');
  } finally {
    contributing.value = false;
  }
}

// Prozentualer Unterschied: mein Wert vs. Community-Ø
const myVsCommunity = computed(() => {
  if (!myStats.value?.avg_kwh_100km || !benchmark.value?.avg_kwh_100km) return null;
  return ((myStats.value.avg_kwh_100km - benchmark.value.avg_kwh_100km) / benchmark.value.avg_kwh_100km * 100);
});

const myBarWidth = computed(() => {
  if (!myStats.value?.avg_kwh_100km || !benchmark.value?.avg_kwh_100km) return 50;
  const ratio = myStats.value.avg_kwh_100km / benchmark.value.avg_kwh_100km;
  return Math.min(100, Math.round(ratio * 100));
});

onMounted(async () => { await loadOptIn(); await loadBenchmark(); });
watch(() => appStore.selectedVehicleId, loadBenchmark);
watch(optIn, v => { if (v) loadBenchmark(); });
</script>

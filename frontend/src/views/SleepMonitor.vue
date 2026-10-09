<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('sleep.title') }}</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('sleep.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button v-for="d in [30, 60, 90]" :key="d"
          @click="days = d; load()"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="days === d ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'"
        >{{ $t(`sleep.days${d}`) }}</button>
      </div>
    </div>

    <template v-for="sid in layoutOrder" :key="sid">

    <SortableSection v-if="sid === 'detective'" page-id="sleep" section-id="detective"
      :title="$t('sleep.detective.section')" icon="🕵️"
      :collapsed="isCollapsed('detective')" @toggle="toggle('detective')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="detective" class="space-y-5">
        <p class="text-gray-400 text-sm">{{ $t('sleep.detective.intro', { days: detective.window_days }) }}</p>

        <template v-if="detective.has_telemetry && detective.summary">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              :label="$t('sleep.detective.awakeParked')"
              :value="detective.summary.awake_share != null ? Math.round(detective.summary.awake_share * 100) + ' %' : '—'"
              :sub="fmtNum(detective.summary.parked_awake_h, 1) + ' / ' + fmtNum(detective.summary.parked_h, 1) + ' ' + $t('sleep.hours')"
              icon="gauge"
              :tooltip="$t('sleep.detective.tipAwake')"
            />
            <StatCard
              :label="$t('sleep.detective.lossParked')"
              :value="detective.summary.loss_pct_per_day != null ? fmtNum(detective.summary.loss_pct_per_day, 1) : '—'"
              :sub="'% ' + $t('sleep.detective.perDay')"
              :decimals="1"
              icon="battery"
              :tooltip="$t('sleep.detective.tipLoss')"
            />
            <StatCard
              :label="$t('sleep.detective.kwhMonth')"
              :value="detective.summary.kwh_per_month != null ? Math.round(detective.summary.kwh_per_month) : '—'"
              icon="bolt"
              :tooltip="$t('sleep.detective.tipKwh')"
            />
            <StatCard
              :label="$t('sleep.detective.costMonth')"
              :value="detective.summary.cost_per_month != null ? Math.round(detective.summary.cost_per_month) + ' €' : '—'"
              :sub="detective.summary.home_price_kwh == null ? $t('sleep.detective.noPrice') : undefined"
              icon="wallet"
              :tooltip="$t('sleep.detective.tipCost')"
            />
          </div>

          <!-- Befunde -->
          <div v-if="detective.hints.length">
            <h3 class="text-sm font-semibold text-gray-300 mb-2">{{ $t('sleep.detective.hintsTitle') }}</h3>
            <ul class="space-y-2">
              <li v-for="h in detective.hints" :key="h.code"
                class="rounded-lg px-3 py-2 text-sm border"
                :class="hintClass(h.severity)">
                {{ $t(`sleep.detective.hint_${h.code}`, hintParams(h.params)) }}
              </li>
            </ul>
          </div>

          <!-- Tagesverlauf -->
          <div>
            <h3 class="text-sm font-semibold text-gray-300 mb-2">{{ $t('sleep.detective.daysTitle') }}</h3>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
              <span v-for="seg in SEGMENTS" :key="seg.key" class="inline-flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 rounded-sm" :class="seg.cls"></span>{{ $t(`sleep.detective.${seg.label}`) }}
              </span>
            </div>
            <div class="space-y-1.5">
              <div v-for="d in detective.days" :key="d.date" class="flex items-center gap-2 text-xs">
                <span class="w-14 shrink-0 text-gray-400 tabular-nums">{{ fmtDay(d.date) }}</span>
                <div class="flex-1 flex h-4 rounded overflow-hidden bg-gray-800"
                  :title="dayTitle(d)">
                  <div v-for="seg in SEGMENTS" :key="seg.key"
                    :class="seg.cls" :style="{ width: segWidth(d, seg.key) }"></div>
                </div>
                <span class="w-12 shrink-0 text-right tabular-nums"
                  :class="d.parked_awake_h >= 6 ? 'text-amber-400' : 'text-gray-500'">{{ fmtNum(d.parked_awake_h, 1) }} h</span>
              </div>
            </div>
          </div>

          <!-- Standphasen -->
          <div v-if="detective.stretches.length">
            <h3 class="text-sm font-semibold text-gray-300 mb-2">{{ $t('sleep.detective.stretchesTitle') }}</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-gray-400 text-left border-b border-gray-700">
                    <th class="pb-2 pr-4">{{ $t('sleep.detective.colStart') }}</th>
                    <th class="pb-2 pr-4">{{ $t('sleep.detective.colDuration') }}</th>
                    <th class="pb-2 pr-4">{{ $t('sleep.detective.colAwake') }}</th>
                    <th class="pb-2 pr-4">{{ $t('sleep.detective.colLoss') }}</th>
                    <th class="pb-2">{{ $t('sleep.detective.colCost') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in detective.stretches" :key="s.start" class="border-b border-gray-800 hover:bg-gray-800/40">
                    <td class="py-2 pr-4 whitespace-nowrap">{{ fmtTs(s.start) }}</td>
                    <td class="py-2 pr-4 whitespace-nowrap">
                      {{ fmtDuration(Math.round(s.hours * 60)) }}
                      <span v-if="s.ongoing" class="text-yellow-400 text-xs ml-1">{{ $t('sleep.detective.ongoing') }}</span>
                    </td>
                    <td class="py-2 pr-4 whitespace-nowrap"
                      :class="s.awake_share >= 0.5 ? 'text-red-400' : s.awake_share >= 0.2 ? 'text-amber-400' : 'text-green-400'">
                      {{ Math.round(s.awake_share * 100) }} %
                    </td>
                    <td class="py-2 pr-4 whitespace-nowrap">
                      <span v-if="s.loss_pct != null">{{ fmtNum(s.loss_pct, 1) }} % · {{ fmtNum(s.loss_kwh, 2) }} kWh</span>
                      <span v-else class="text-gray-500">—</span>
                    </td>
                    <td class="py-2 whitespace-nowrap">{{ s.cost != null ? fmtNum(s.cost, 2) + ' €' : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <details class="text-sm">
            <summary class="cursor-pointer text-gray-300 font-semibold">{{ $t('sleep.detective.causesTitle') }}</summary>
            <ul class="list-disc pl-5 mt-2 space-y-1 text-gray-400">
              <li v-for="c in CAUSES" :key="c">{{ $t(`sleep.detective.cause_${c}`) }}</li>
            </ul>
          </details>
        </template>

        <ul v-else class="space-y-2">
          <li v-for="h in detective.hints" :key="h.code" class="rounded-lg px-3 py-2 text-sm border" :class="hintClass(h.severity)">
            {{ $t(`sleep.detective.hint_${h.code}`, hintParams(h.params)) }}
          </li>
        </ul>
      </div>
      <p v-else class="text-gray-400">{{ $t('common.loading') }}</p>
    </SortableSection>

    <SortableSection v-else-if="sid === 'stats'" page-id="sleep" section-id="stats"
      :title="$t('sleep.sectionStats')" icon="📊"
      :collapsed="isCollapsed('stats')" @toggle="toggle('stats')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          :label="$t('sleep.totalSleepHours')"
          :value="stats.total_sleep_hours + ' ' + $t('sleep.hours')"
          icon="moon"
          :tooltip="$t('sleep.tooltipTotalSleep')"
        />
        <StatCard
          :label="$t('sleep.avgSleepMin')"
          :value="fmtDuration(stats.avg_sleep_min)"
          icon="gauge"
          :tooltip="$t('sleep.tooltipAvgSleep')"
        />
        <StatCard
          :label="$t('sleep.longestSleepMin')"
          :value="fmtDuration(stats.longest_sleep_min)"
          icon="gauge"
          :tooltip="$t('sleep.tooltipLongest')"
        />
        <StatCard
          :label="$t('sleep.avgDrainPerHour')"
          :value="stats.avg_drain_pct_per_hour != null ? stats.avg_drain_pct_per_hour + ' %/h' : '—'"
          icon="battery"
          :tooltip="$t('sleep.tooltipDrain')"
        />
      </div>
      <p v-else class="text-gray-400">{{ $t('sleep.noData') }}</p>
    </SortableSection>

    <SortableSection v-if="sid === 'events'" page-id="sleep" section-id="events"
      :title="$t('sleep.sectionEvents')" icon="😴"
      :collapsed="isCollapsed('events')" @toggle="toggle('events')" @move="(f,t,p) => moveSection(f,t,p)">
      <div v-if="events.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 text-left border-b border-gray-700">
              <th class="pb-2 pr-4">{{ $t('sleep.sleepAt') }}</th>
              <th class="pb-2 pr-4">{{ $t('sleep.wakeAt') }}</th>
              <th class="pb-2 pr-4">{{ $t('sleep.duration') }}</th>
              <th class="pb-2 pr-4">{{ $t('sleep.socAtSleep') }}</th>
              <th class="pb-2 pr-4">{{ $t('sleep.socAtWake') }}</th>
              <th class="pb-2">{{ $t('sleep.drain') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.id" class="border-b border-gray-800 hover:bg-gray-800/40">
              <td class="py-2 pr-4">{{ fmtTs(e.sleep_at) }}</td>
              <td class="py-2 pr-4">
                <span v-if="e.wake_at">{{ fmtTs(e.wake_at) }}</span>
                <span v-else class="text-yellow-400">{{ $t('sleep.stillSleeping') }}</span>
              </td>
              <td class="py-2 pr-4">{{ e.duration_min != null ? fmtDuration(e.duration_min) : '—' }}</td>
              <td class="py-2 pr-4">{{ e.soc_at_sleep != null ? e.soc_at_sleep + ' %' : '—' }}</td>
              <td class="py-2 pr-4">{{ e.soc_at_wake  != null ? e.soc_at_wake  + ' %' : '—' }}</td>
              <td class="py-2">
                <span v-if="e.drain_pct != null"
                  :class="e.drain_pct > 5 ? 'text-red-400' : e.drain_pct > 2 ? 'text-yellow-400' : 'text-green-400'"
                >{{ e.drain_pct }} %</span>
                <span v-else class="text-gray-500">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-gray-400">{{ $t('sleep.noData') }}</p>
    </SortableSection>

    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import SortableSection from '../components/SortableSection.vue';
import StatCard        from '../components/StatCard.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const SLEEP_SECTIONS = ['detective', 'stats', 'events'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('sleep', SLEEP_SECTIONS);

// Reihenfolge der Balken-Segmente im Tagesverlauf.
const SEGMENTS = [
  { key: 'driving_h',      label: 'legendDriving',  cls: 'bg-blue-500' },
  { key: 'charging_h',     label: 'legendCharging', cls: 'bg-green-500' },
  { key: 'parked_awake_h', label: 'legendAwake',    cls: 'bg-amber-400' },
  { key: 'asleep_h',       label: 'legendAsleep',   cls: 'bg-gray-600' },
  { key: 'unknown_h',      label: 'legendUnknown',  cls: 'bg-gray-800' },
];
const CAUSES = ['sentry', 'cabin', 'apps', 'phonekey', 'climate', 'schedule', 'update'];

const { t, locale } = useI18n();
const appStore  = useAppStore();
const days      = ref(30);
const events    = ref([]);
const stats     = ref(null);
const detective = ref(null);

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const { data } = await api.get(`/sleep/${vid}?days=${days.value}`);
    events.value = data.events ?? [];
    stats.value  = data.stats?.events_count ? data.stats : null;
  } catch { /* ignore */ }
}

// Der Detektiv rechnet ueber die Telemetrie-Punkte und haengt deshalb nicht
// am 30/60/90-Tage-Schalter der Ereignisliste (fest 14 Tage).
async function loadDetective() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data } = await api.get(`/sleep/${vid}/detective?days=14&tz=${encodeURIComponent(tz)}`);
    detective.value = data;
  } catch { detective.value = null; }
}

function hintClass(severity) {
  if (severity === 'high')   return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (severity === 'medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  if (severity === 'ok')     return 'border-green-500/40 bg-green-500/10 text-green-200';
  return 'border-gray-600 bg-gray-800/60 text-gray-300';
}

// Zahlen in den Befund-Texten im Format der Oberflaechensprache (6,3 statt 6.3).
function hintParams(params = {}) {
  return Object.fromEntries(Object.entries(params).map(([k, v]) =>
    [k, typeof v === 'number' ? v.toLocaleString(locale.value) : v]));
}

function segWidth(d, key) {
  return d.hours > 0 ? `${(d[key] / d.hours) * 100}%` : '0%';
}

function dayTitle(d) {
  return SEGMENTS
    .filter(s => d[s.key] > 0)
    .map(s => `${t(`sleep.detective.${s.label}`)}: ${fmtNum(d[s.key], 1)} h`)
    .join(' · ');
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
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

onMounted(() => { load(); loadDetective(); });
watch(() => appStore.selectedVehicleId, () => { load(); loadDetective(); });
</script>

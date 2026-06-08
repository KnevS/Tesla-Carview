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

    <SortableSection v-if="sid === 'stats'" page-id="sleep" section-id="stats"
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
import { useAppStore } from '../store/index.js';
import SortableSection from '../components/SortableSection.vue';
import StatCard        from '../components/StatCard.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const SLEEP_SECTIONS = ['stats', 'events'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('sleep', SLEEP_SECTIONS);

const appStore = useAppStore();
const days   = ref(30);
const events = ref([]);
const stats  = ref(null);

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const { data } = await api.get(`/sleep/${vid}?days=${days.value}`);
    events.value = data.events ?? [];
    stats.value  = data.stats?.events_count ? data.stats : null;
  } catch { /* ignore */ }
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

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

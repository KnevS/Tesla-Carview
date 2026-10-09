<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('yearReview.title') }}</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('yearReview.subtitle') }}</p>
      </div>
      <div v-if="data?.years?.length > 1" class="flex gap-2 flex-wrap">
        <button v-for="y in data.years" :key="y" @click="year = y; load()"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="data.year === y ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'">{{ y }}</button>
      </div>
    </div>

    <p v-if="!data" class="text-gray-400">{{ $t('common.loading') }}</p>
    <p v-else-if="!data.driving.trips" class="text-gray-400">{{ $t('yearReview.noData', { year: data.year }) }}</p>

    <template v-else>
      <!-- Teilbare Jahreskarte -->
      <div class="rounded-2xl p-6 md:p-8 bg-gradient-to-br from-rose-700 via-red-900 to-gray-900 shadow-xl">
        <p class="text-sm uppercase tracking-widest text-rose-200/80">TeslaView</p>
        <h2 class="text-2xl md:text-3xl font-bold mt-1">{{ $t('yearReview.cardTitle', { year: data.year }) }}</h2>
        <p class="text-rose-100/70 text-sm">{{ data.complete ? $t('yearReview.fullYear', { year: data.year }) : $t('yearReview.yearToDate', { year: data.year }) }}</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 mt-6">
          <div v-for="h in headline" :key="h.label">
            <p class="text-3xl md:text-4xl font-extrabold tabular-nums leading-none">{{ h.value }}</p>
            <p class="text-rose-100/80 text-sm mt-1">{{ h.label }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3 mt-6">
          <button class="btn-primary text-sm" @click="saveImage">{{ $t('yearReview.saveImage') }}</button>
          <button v-if="canShare" class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20" @click="shareImage">{{ $t('yearReview.share') }}</button>
          <span class="text-xs text-rose-100/70">{{ $t('yearReview.imageNote') }}</span>
        </div>
      </div>

      <template v-for="sid in layoutOrder" :key="sid">

      <SortableSection v-if="sid === 'driving'" page-id="yearReview" section-id="driving"
        :title="$t('yearReview.sectionDriving')" icon="🚗"
        :collapsed="isCollapsed('driving')" @toggle="toggle('driving')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard :label="$t('yearReview.drivingHours')" :value="data.driving.driving_hours" icon="clock" />
          <StatCard :label="$t('yearReview.daysDriven')" :value="data.driving.days_driven" icon="calendar" />
          <StatCard :label="$t('yearReview.kwh100')" :value="data.energy.kwh_100km != null ? fmtNum(data.energy.kwh_100km, 1) : '—'" sub="kWh / 100 km" :decimals="1" icon="gauge" />
          <StatCard :label="$t('yearReview.co2')" :value="data.energy.co2_saved_kg != null ? fmtNum(data.energy.co2_saved_kg, 0) : '—'"
            sub="kg" icon="sparkles"
            :tooltip="data.energy.trees_equivalent ? $t('yearReview.trees', { n: data.energy.trees_equivalent }) : undefined" />
        </div>
        <p v-if="data.energy.coverage < 0.95" class="text-xs text-gray-500 mt-3">
          {{ $t('yearReview.estimated', { pct: Math.round(data.energy.coverage * 100) }) }}
        </p>
      </SortableSection>

      <SortableSection v-else-if="sid === 'months'" page-id="yearReview" section-id="months"
        :title="$t('yearReview.sectionMonths')" icon="📆"
        :collapsed="isCollapsed('months')" @toggle="toggle('months')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="flex items-end gap-1.5 h-40">
          <div v-for="m in data.months" :key="m.month" class="flex-1 flex flex-col items-center justify-end h-full"
            v-tooltip="`${monthName(m.month)}: ${fmtNum(m.km, 0)} km · ${m.trips} ${$t('yearReview.trips')}`">
            <span class="text-[10px] text-gray-400 tabular-nums mb-1">{{ m.km ? fmtNum(m.km, 0) : '' }}</span>
            <div class="w-full rounded-t bg-tesla-red/80" :style="{ height: monthHeight(m.km) }"></div>
            <span class="text-[10px] text-gray-500 mt-1">{{ monthName(m.month, 'narrow') }}</span>
          </div>
        </div>
      </SortableSection>

      <SortableSection v-else-if="sid === 'charging'" page-id="yearReview" section-id="charging"
        :title="$t('yearReview.sectionCharging')" icon="⚡"
        :collapsed="isCollapsed('charging')" @toggle="toggle('charging')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard :label="$t('yearReview.charged')" :value="fmtNum(data.charging.kwh, 0)" :sub="`kWh · ${data.charging.sessions}×`" icon="bolt" />
          <StatCard :label="$t('yearReview.homeShare')" :value="data.charging.home_share_pct != null ? data.charging.home_share_pct + ' %' : '—'" icon="home" />
          <StatCard :label="$t('yearReview.cost')" :value="data.charging.cost != null ? fmtNum(data.charging.cost, 0) + ' €' : '—'"
            :sub="data.charging.cost_coverage != null && data.charging.cost_coverage < 0.95 ? $t('yearReview.costPartial', { pct: Math.round(data.charging.cost_coverage * 100) }) : (data.charging.avg_price_kwh != null ? `${$t('yearReview.avgPrice')} ${fmtNum(data.charging.avg_price_kwh, 2)} €/kWh` : undefined)"
            icon="wallet" />
          <StatCard :label="$t('yearReview.dcSessions')" :value="data.charging.dc_sessions" icon="pulse" />
        </div>
      </SortableSection>

      <SortableSection v-else-if="sid === 'highlights'" page-id="yearReview" section-id="highlights"
        :title="$t('yearReview.sectionHighlights')" icon="🏆"
        :collapsed="isCollapsed('highlights')" @toggle="toggle('highlights')" @move="(f,t,p) => moveSection(f,t,p)">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div v-for="h in highlights" :key="h.label" class="rounded-lg border border-gray-700 bg-gray-800/40 px-4 py-3">
            <dt class="text-gray-400 text-xs uppercase tracking-wide">{{ h.label }}</dt>
            <dd class="text-lg font-semibold mt-0.5">{{ h.value }}</dd>
            <dd v-if="h.sub" class="text-gray-400 text-xs">{{ h.sub }}</dd>
          </div>
        </dl>
      </SortableSection>

      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import SortableSection from '../components/SortableSection.vue';
import StatCard        from '../components/StatCard.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const SECTIONS = ['driving', 'months', 'charging', 'highlights'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('yearReview', SECTIONS);

const { t, locale } = useI18n();
const appStore = useAppStore();
const data = ref(null);
const year = ref(null);
const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;

async function load() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const q = new URLSearchParams({ tz });
  if (year.value) q.set('year', year.value);
  try {
    const { data: d } = await api.get(`/year-review/${vid}?${q}`);
    data.value = d;
  } catch { /* ignore */ }
}

const headline = computed(() => {
  const d = data.value;
  if (!d) return [];
  return [
    { value: fmtNum(d.driving.km, 0), label: t('yearReview.km') },
    { value: fmtNum(d.driving.trips, 0), label: t('yearReview.trips') },
    { value: d.energy.co2_saved_kg != null ? `${fmtNum(d.energy.co2_saved_kg, 0)} kg` : '—', label: t('yearReview.co2') },
    { value: d.driving.earth_laps >= 0.1 ? fmtNum(d.driving.earth_laps, 1) : `${fmtNum(d.driving.moon_share_pct, 1)} %`,
      label: d.driving.earth_laps >= 0.1 ? t('yearReview.earth') : '🌙' },
  ];
});

const highlights = computed(() => {
  const d = data.value;
  if (!d) return [];
  const out = [];
  if (d.driving.longest_trip) out.push({ label: t('yearReview.longest'), value: `${fmtNum(d.driving.longest_trip.distance_km, 1)} km`, sub: fmtDate(d.driving.longest_trip.start_time) });
  if (d.driving.coldest_trip) out.push({ label: t('yearReview.coldest'), value: `${fmtNum(d.driving.coldest_trip.temp_c, 1)} °C`, sub: fmtDate(d.driving.coldest_trip.start_time) });
  if (d.driving.busiest_month) out.push({ label: t('yearReview.busiest'), value: monthName(d.driving.busiest_month.month, 'long'), sub: `${fmtNum(d.driving.busiest_month.km, 0)} km` });
  if (d.driving.best_efficiency_month) out.push({ label: t('yearReview.bestEff'), value: monthName(d.driving.best_efficiency_month.month, 'long'), sub: `${fmtNum(d.driving.best_efficiency_month.kwh_100km, 1)} kWh/100 km` });
  if (d.charging.favorite_location) out.push({ label: t('yearReview.favorite'), value: d.charging.favorite_location.name, sub: t('yearReview.times', { n: d.charging.favorite_location.sessions }) });
  if (d.charging.cheapest) out.push({ label: t('yearReview.cheapest'), value: `${fmtNum(d.charging.cheapest.price_kwh, 2)} €/kWh`, sub: d.charging.cheapest.location_name || undefined });
  return out;
});

const maxMonthKm = computed(() => Math.max(1, ...(data.value?.months ?? []).map(m => m.km)));
function monthHeight(km) { return km ? `${Math.max(3, km / maxMonthKm.value * 100)}%` : '0'; }

function monthName(m, style = 'short') {
  return new Date(2026, m - 1, 1).toLocaleDateString(locale.value, { month: style });
}
function fmtNum(v, digits) {
  if (v == null) return '—';
  return Number(v).toLocaleString(locale.value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(locale.value, { day: '2-digit', month: 'long' });
}

// ── Bild der Jahreskarte (nur Zahlen, keine Orte) ──────────────────────────
function renderCanvas() {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#be123c'); grad.addColorStop(0.5, '#7f1d1d'); grad.addColorStop(1, '#111827');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  // Text auf die verfuegbare Breite verkleinern (lange Uebersetzungen).
  const fit = (text, x, y, weight, size, maxW) => {
    let s = size;
    g.font = font(weight, s);
    while (s > 20 && g.measureText(text).width > maxW) { s -= 2; g.font = font(weight, s); }
    g.fillText(text, x, y);
  };
  g.fillStyle = 'rgba(255,228,230,0.85)'; g.font = font(600, 34); g.fillText('TESLAVIEW', 90, 140);
  g.fillStyle = '#fff'; fit(t('yearReview.cardTitle', { year: data.value.year }), 90, 240, 800, 72, W - 180);
  g.fillStyle = 'rgba(255,228,230,0.75)'; g.font = font(500, 36);
  g.fillText(data.value.complete ? t('yearReview.fullYear', { year: data.value.year }) : t('yearReview.yearToDate', { year: data.value.year }), 90, 300);
  headline.value.forEach((h, i) => {
    const x = 90 + (i % 2) * 470, y = 520 + Math.floor(i / 2) * 330;
    g.fillStyle = '#fff'; fit(h.value, x, y, 800, 110, 430);
    g.fillStyle = 'rgba(255,228,230,0.85)'; fit(h.label, x, y + 64, 500, 40, 430);
  });
  g.fillStyle = 'rgba(255,228,230,0.6)'; g.font = font(500, 30);
  g.fillText('teslaview.krische.com', 90, H - 90);
  return c;
}

function saveImage() {
  const a = document.createElement('a');
  a.href = renderCanvas().toDataURL('image/png');
  a.download = `teslaview-${data.value.year}.png`;
  a.click();
}

async function shareImage() {
  const blob = await new Promise(r => renderCanvas().toBlob(r, 'image/png'));
  const file = new File([blob], `teslaview-${data.value.year}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t('yearReview.cardTitle', { year: data.value.year }) }); } catch { /* abgebrochen */ }
  } else {
    saveImage();
  }
}

onMounted(load);
watch(() => appStore.selectedVehicleId, () => { year.value = null; load(); });
</script>

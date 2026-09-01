<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h1 class="text-2xl font-bold">{{ $t('trips.title') }}</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <select v-model="filterType" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">{{ $t('trips.allTypes') }}</option>
          <option value="private">{{ $t('trips.filterPrivate') }}</option>
          <option value="business">{{ $t('trips.filterBusiness') }}</option>
          <option value="commute">{{ $t('trips.filterCommute') }}</option>
        </select>
        <select v-model="filterDriver" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">{{ $t('trips.allDrivers') }}</option>
          <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
          <option value="null">{{ $t('trips.noDriver') }}</option>
        </select>
        <SortToggle v-model:direction="sortDir" />
        <RouterLink to="/fahrtwerte" class="btn-secondary text-sm"
          v-tooltip="$t('tripMetrics.intro')">
          {{ $t('tripMetrics.title') }}
        </RouterLink>
        <div class="text-sm text-gray-400">{{ $t('trips.countLabel', { count: trips.length }) }}</div>
      </div>
    </div>

    <!-- Zeitraum + Markieren.
         Die Zeitraum-Grenzen gehen an /trips UND /trips/stats — nur so
         beschreiben die Statistik-Karten wirklich die getroffene Auswahl.
         Die Liste selbst ist paginiert (limit=50) und taugt deshalb nie
         als Quelle fuer eine Gesamtsumme. -->
    <div class="card space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-semibold flex-shrink-0">{{ $t('trips.rangeTitle') }}</span>
          <button v-for="p in RANGE_PRESETS" :key="p.id" @click="applyPreset(p.id)"
            class="text-xs px-2.5 py-1 rounded-full border transition"
            :class="activePreset === p.id
              ? 'bg-tesla-red border-tesla-red text-white'
              : 'border-gray-600 text-gray-300 hover:bg-gray-700'">
            {{ $t(p.label) }}
          </button>
        </div>
        <button @click="toggleSelectMode"
          class="text-xs px-2.5 py-1 rounded-full border transition flex-shrink-0"
          :class="selectMode
            ? 'bg-tesla-red border-tesla-red text-white'
            : 'border-gray-600 text-gray-300 hover:bg-gray-700'"
          v-tooltip="$t('trips.selectModeTooltip')">
          {{ selectMode ? $t('trips.selectModeOff') : $t('trips.selectModeOn') }}
        </button>
      </div>

      <div class="flex items-end gap-3 flex-wrap">
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">{{ $t('trips.rangeFrom') }}</label>
          <input v-model="range.from" @change="onRangeEdit" type="date" :max="range.to || undefined"
            class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600" />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">{{ $t('trips.rangeTo') }}</label>
          <input v-model="range.to" @change="onRangeEdit" type="date" :min="range.from || undefined"
            class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600" />
        </div>
        <button v-if="range.from || range.to" @click="applyPreset('all')"
          class="btn-secondary text-xs">{{ $t('trips.rangeReset') }}</button>

        <!-- Summe des Zeitraums — serverseitig gerechnet, unabhaengig
             davon wie viele Fahrten gerade geladen sind. -->
        <div class="sm:ml-auto text-sm">
          <span class="text-gray-400">{{ $t('trips.rangeSumLabel') }}</span>
          <span class="font-semibold ml-1">{{ fmtDistance(stats.total_km || 0, 0) }}</span>
          <span class="text-gray-400 ml-1">· {{ $t('trips.countLabel', { count: stats.total_trips || 0 }) }}</span>
        </div>
      </div>
    </div>

    <template v-for="sid in layoutOrder" :key="sid">

    <SortableSection v-if="sid === 'stats'" page-id="trips" section-id="stats"
      :title="$t('trips.sectionStats')" icon="📊"
      :collapsed="isCollapsed('stats')" @toggle="toggle('stats')" @move="(f,t,p) => moveSection(f,t,p)">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard :label="$t('trips.totalKm')"        :value="fmtDistance(stats.total_km || 0, 0)"                         icon="map"      :tooltip="$t('trips.totalKmTooltip')" />
        <StatCard :label="$t('trips.avgConsumption')" :value="stats.avg_consumption ? fmtEfficiency(stats.avg_consumption) : '–'" icon="pulse"  :tooltip="$t('trips.avgConsumptionTooltip')" />
        <StatCard :label="$t('trips.privateKm')"      :value="fmtDistance(stats.private_km || 0, 0)"                            icon="home"     :tooltip="$t('trips.privateKmTooltip')" />
        <StatCard :label="$t('trips.businessKm')"     :value="fmtDistance((stats.business_km || 0) + (stats.commute_km || 0), 0)" icon="wallet" :tooltip="$t('trips.businessKmTooltip')" />
      </div>
    </SortableSection>

    <SortableSection v-if="sid === 'list'" page-id="trips" section-id="list"
      :title="$t('trips.sectionList')" icon="🗺️"
      :collapsed="isCollapsed('list')" @toggle="toggle('list')" @move="(f,t,p) => moveSection(f,t,p)">
      <template #badge>
        <button v-if="selectMode" @click.stop="toggleSelectAll"
          class="text-xs px-2.5 py-1 rounded-full border border-gray-600 text-gray-300 hover:bg-gray-700 transition">
          {{ allLoadedSelected ? $t('trips.selectNone') : $t('trips.selectAllLoaded') }}
        </button>
      </template>
      <div class="space-y-2">
        <div v-if="loading" class="text-gray-400">{{ $t('trips.loading') }}</div>

        <div v-for="trip in trips" :key="trip.id" class="card hover:bg-gray-600 transition"
          :class="selectMode && selected.has(trip.id) ? 'ring-1 ring-tesla-red' : ''">
        <div class="flex items-start gap-3">
          <!-- Markierung (nur im Markier-Modus). Die Summe darueber
               rechnet ueber genau diese Haken. -->
          <label v-if="selectMode" class="flex items-center pt-1.5 flex-shrink-0 cursor-pointer" @click.stop>
            <input type="checkbox" :checked="selected.has(trip.id)" @change="toggleSelect(trip.id)"
              class="w-4 h-4 accent-red-600 cursor-pointer"
              :aria-label="$t('trips.selectTrip')" />
          </label>

          <!-- Linke Spalte: Typ + Fahrer -->
          <div class="flex flex-col gap-1.5 flex-shrink-0 w-24">
            <button @click.stop="cycleType(trip)"
              :class="typeBadge(trip.trip_type)"
              class="w-full text-xs font-semibold px-2 py-1 rounded-full text-center transition"
              v-tooltip="$t('trips.typeCycleTooltip')">
              {{ typeLabel(trip.trip_type) }}
            </button>

            <!-- Fahrer-Badge — Dropdown wird via Teleport am body
                 gerendert (s. Ende der Komponente), damit kein
                 backdrop-filter/overflow eines Eltern-Containers das
                 Menue clippen oder ueberdecken kann. -->
            <button @click.stop="toggleDriverMenu(trip.id, $event)"
              class="w-full text-xs px-2 py-1 rounded-full text-center transition border"
              :style="driverBadgeStyle(trip)"
              v-tooltip="$t('trips.assignDriver')">
              {{ trip.driver_name || $t('trips.noDriverLabel') }}
            </button>
          </div>

          <!-- Fahrt-Info (klickbar zur Detailansicht) -->
          <RouterLink :to="'/trips/' + trip.id" class="flex-1 min-w-0 flex items-center gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-tesla-red font-semibold text-sm">{{ fmtDate(trip.start_time) }}</span>
                <span class="text-gray-400 text-sm">{{ fmtTime(trip.start_time) }}</span>
              </div>
              <p class="font-medium truncate mt-0.5">
                {{ formatLocation({ address: trip.start_address, lat: trip.start_lat, lon: trip.start_lon, fallback: $t('trips.start') }) }}
                →
                {{ formatLocation({ address: trip.end_address, lat: trip.end_lat, lon: trip.end_lon, fallback: $t('trips.dest') }) }}
              </p>
              <p v-if="trip.purpose" class="text-xs text-gray-400 truncate mt-0.5 italic">{{ trip.purpose }}</p>
            </div>
            <div class="flex gap-4 text-sm text-right ml-2 flex-shrink-0">
              <div>
                <p class="text-gray-400">{{ $t('trips.distance') }}</p>
                <p class="font-semibold">{{ fmtDistance(trip.distance_km) }}</p>
              </div>
              <div class="hidden md:block">
                <p class="text-gray-400">{{ $t('trips.consumption') }}</p>
                <p class="font-semibold">
                  {{ (trip.energy_used_kwh != null && trip.distance_km) ? fmtEfficiency(trip.energy_used_kwh / trip.distance_km * 100) : '–' }}
                  <span v-if="trip.wltp_delta_pct != null"
                        :class="trip.wltp_delta_pct > 0 ? 'text-red-300' : 'text-green-300'"
                        class="text-xs font-normal ml-1"
                        v-tooltip="$t('trips.wltpTooltip')">
                    {{ $t('trips.wltpDelta', { sign: trip.wltp_delta_pct > 0 ? '+' : '', value: trip.wltp_delta_pct }) }}
                  </span>
                </p>
              </div>
              <div class="hidden md:block">
                <p class="text-gray-400">{{ $t('trips.soc') }}</p>
                <p class="font-semibold">{{ trip.start_soc ?? '–' }}% → {{ trip.end_soc ?? '–' }}%</p>
              </div>
            </div>
          </RouterLink>
        </div>

        <!-- Zweck-Eingabe (erscheint bei Nicht-Privat) -->
        <div v-if="trip.trip_type !== 'private'" class="mt-2 ml-28">
          <input
            :value="trip.purpose"
            @change="e => savePurpose(trip, e.target.value)"
            @click.stop
            type="text"
            :placeholder="$t('trips.purpose')"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red"
          />
        </div>
      </div>
    </div>

      <button v-if="trips.length >= limit" @click="loadMore" class="btn-secondary w-full mt-4">
        {{ $t('trips.loadMore') }}
      </button>
    </SortableSection>

    </template><!-- end v-for layoutOrder -->

    <!-- Summenleiste der Markierung. Fixed statt sticky: die Sektion
         hat waehrend der Einklapp-Animation overflow:hidden, sticky
         wuerde darin nicht kleben. Auf Mobile sitzt sie oberhalb der
         Tab-Bar (s. <style> unten). -->
    <Teleport to="body">
      <div v-if="selectMode && selection.count > 0" class="trips-selection-bar">
        <div class="max-w-5xl mx-auto flex items-center gap-x-5 gap-y-1 flex-wrap text-sm">
          <span class="font-semibold">{{ $t('trips.selectionCount', { count: selection.count }) }}</span>
          <span>
            <span class="text-gray-400">{{ $t('trips.distance') }}</span>
            <span class="font-semibold ml-1">{{ fmtDistance(selection.km, 1) }}</span>
          </span>
          <span v-if="selection.kwh > 0">
            <span class="text-gray-400">{{ $t('trips.energy') }}</span>
            <span class="font-semibold ml-1">{{ selection.kwh.toFixed(1) }} kWh</span>
          </span>
          <span v-if="selection.consumption">
            <span class="text-gray-400">{{ $t('trips.consumption') }}</span>
            <span class="font-semibold ml-1">{{ fmtEfficiency(selection.consumption) }}</span>
          </span>
          <span v-if="selection.durationS > 0">
            <span class="text-gray-400">{{ $t('trips.duration') }}</span>
            <span class="font-semibold ml-1">{{ fmtDuration(selection.durationS) }}</span>
          </span>
          <button @click="clearSelection" class="btn-secondary text-xs ml-auto">
            {{ $t('trips.selectNone') }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Fahrer-Auswahl-Menue — global einmalig, an body gerendert.
         Vorteil: keine Eltern-Klasse (backdrop-filter auf .card, overflow,
         Stacking-Context) kann das Menue mehr clippen oder verdecken.
         Position kommt aus dem Badge-Button via getBoundingClientRect()
         und ist fixed im Viewport. -->
    <Teleport to="body">
      <div v-if="openDriverTrip" :style="driverMenuStyle"
        class="fixed z-[1000] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl py-1"
        @click.stop>
        <button
          class="block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700 text-gray-400"
          @click="setDriver(openDriverTrip, null)">
          – {{ $t('trips.noDriver') }}
        </button>
        <button v-for="d in drivers" :key="d.id"
          class="flex items-center gap-2 w-full text-left px-4 py-1.5 text-sm hover:bg-gray-700"
          :class="openDriverTrip.driver_id === d.id ? 'text-white font-semibold' : 'text-gray-300'"
          @click="setDriver(openDriverTrip, d)">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: d.color }"></span>
          {{ d.name }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAppStore } from '../store/index.js';
import { useUnits } from '../store/prefs.js';
import StatCard from '../components/StatCard.vue';
import SortToggle from '../components/SortToggle.vue';
import SortableSection from '../components/SortableSection.vue';
import { formatLocation } from '../lib/location.js';
import { useSortDirection } from '../composables/useSortDirection.js';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const { t, locale } = useI18n();
const route       = useRoute();
const appStore    = useAppStore();
const { fmtDistance, fmtEfficiency } = useUnits();

const TRIPS_SECTIONS = ['stats', 'list'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('trips', TRIPS_SECTIONS);
const trips       = ref([]);
const stats       = ref({});
const drivers     = ref([]);
const loading     = ref(true);
const limit       = ref(50);
const filterType  = ref('');
const filterDriver = ref('');
const openDriverMenu = ref(null);
// Zeitraum als lokale Datumsstrings (YYYY-MM-DD, wie <input type="date">).
// Umgerechnet wird erst beim Absenden — s. rangeParams().
const range        = ref({ from: '', to: '' });
const activePreset = ref('all');
// Markier-Modus: Haken je Fahrt, Summe darueber in der fixen Leiste.
const selectMode   = ref(false);
const selected     = ref(new Set());
// Sortierreihenfolge pro View in localStorage. Default desc (Neueste oben).
const { direction: sortDir } = useSortDirection('trips');
// Position des Fahrer-Menue (per Teleport) — wird beim Klick auf den
// Badge per getBoundingClientRect() befuellt und als 'position: fixed'
// Style ans Menue gehaengt. Beim Scrollen schliessen wir das Menue
// (statt mitfuehren), das ist Standard-Verhalten nativer Dropdowns.
const driverMenuStyle = ref(null);
const MENU_OFFSET = 4;
const openDriverTrip = computed(() =>
  openDriverMenu.value == null ? null : trips.value.find(t => t.id === openDriverMenu.value)
);

const TYPES = ['private', 'business', 'commute'];

const fmt     = (v, d = 0) => (+(v || 0)).toFixed(d);
// Datumsformat folgt der aktiven App-Sprache.
const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR' };
const fmtDate = ts => new Date(ts * 1000).toLocaleDateString(LOCALE_TAG[locale.value] || 'de-DE');
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString(LOCALE_TAG[locale.value] || 'de-DE', { hour: '2-digit', minute: '2-digit' });

const typeLabel = tt => ({
  private:  t('trips.typePrivate'),
  business: t('trips.typeBusiness'),
  commute:  t('trips.typeCommute'),
}[tt] ?? t('trips.typePrivate'));
const typeBadge = tt => ({
  private:  'bg-gray-600 text-gray-200 hover:bg-gray-500',
  business: 'bg-blue-900 text-blue-200 hover:bg-blue-800',
  commute:  'bg-green-900 text-green-200 hover:bg-green-800',
}[tt] ?? 'bg-gray-600 text-gray-200');

function driverBadgeStyle(trip) {
  if (!trip.driver_id || !trip.driver_color) {
    return 'border-color: #4b5563; color: #9ca3af; background: transparent;';
  }
  return `border-color: ${trip.driver_color}55; color: ${trip.driver_color}; background: ${trip.driver_color}18;`;
}

/** Oeffnet/schliesst das Fahrer-Menue an der Position des angeklickten
 *  Badge-Buttons. Position wird ueber getBoundingClientRect berechnet
 *  und als fixed-Style ans (Teleported-)Menue gehaengt. */
function toggleDriverMenu(tripId, ev) {
  if (openDriverMenu.value === tripId) { closeMenus(); return; }
  openDriverMenu.value = tripId;
  if (ev?.currentTarget) {
    const r = ev.currentTarget.getBoundingClientRect();
    // Im Viewport ausrichten: 4px unter dem Button, links bündig,
    // mindestens so breit wie der Trigger. clamp gegen rechten Rand,
    // damit lange Fahrer-Namen nicht aus dem Viewport rauslaufen.
    const left = Math.min(r.left, window.innerWidth - 220);
    driverMenuStyle.value = {
      top:      `${r.bottom + MENU_OFFSET}px`,
      left:     `${Math.max(8, left)}px`,
      minWidth: `${Math.max(160, r.width)}px`,
    };
  }
}

function closeMenus() {
  openDriverMenu.value = null;
  driverMenuStyle.value = null;
}

async function setDriver(trip, driver) {
  trip.driver_id    = driver?.id    ?? null;
  trip.driver_name  = driver?.name  ?? null;
  trip.driver_color = driver?.color ?? null;
  openDriverMenu.value = null;
  await api.patch(`/trips/${trip.id}/driver`, { driver_id: driver?.id ?? null });
}

async function classify(trip, type, purpose) {
  trip.trip_type = type;
  if (purpose !== undefined) trip.purpose = purpose;
  await api.patch(`/trips/${trip.id}/classify`, { trip_type: type, purpose: trip.purpose ?? null });
  await loadStats();
}

async function cycleType(trip) {
  const next = TYPES[(TYPES.indexOf(trip.trip_type) + 1) % TYPES.length];
  await classify(trip, next);
}

async function savePurpose(trip, purpose) {
  await classify(trip, trip.trip_type, purpose);
}

// Schnellwahl. `all` = keine Grenzen. Die Berechnung passiert in lokaler
// Zeit, damit „dieser Monat" auch wirklich am 1. um 00:00 Ortszeit beginnt.
const RANGE_PRESETS = [
  { id: 'all',       label: 'trips.rangeAll' },
  { id: '7d',        label: 'trips.range7d' },
  { id: '30d',       label: 'trips.range30d' },
  { id: 'month',     label: 'trips.rangeThisMonth' },
  { id: 'lastMonth', label: 'trips.rangeLastMonth' },
  { id: 'year',      label: 'trips.rangeThisYear' },
];

const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function presetRange(id) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (id) {
    case '7d':  { const f = new Date(today); f.setDate(f.getDate() - 6);  return { from: isoDay(f), to: isoDay(today) }; }
    case '30d': { const f = new Date(today); f.setDate(f.getDate() - 29); return { from: isoDay(f), to: isoDay(today) }; }
    case 'month':     return { from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDay(today) };
    case 'lastMonth': return {
      from: isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to:   isoDay(new Date(now.getFullYear(), now.getMonth(), 0)),   // Tag 0 = letzter Tag des Vormonats
    };
    case 'year':      return { from: isoDay(new Date(now.getFullYear(), 0, 1)), to: isoDay(today) };
    default:          return { from: '', to: '' };
  }
}

async function applyPreset(id) {
  activePreset.value = id;
  range.value = presetRange(id);
  await load();
}

/** Freie Datumseingabe: Preset-Markierung faellt weg, ausser die Werte
 *  entsprechen zufaellig wieder „alle". */
async function onRangeEdit() {
  if (range.value.from && range.value.to && range.value.from > range.value.to) {
    range.value.to = range.value.from;
  }
  activePreset.value = (!range.value.from && !range.value.to) ? 'all' : null;
  await load();
}

/** Zeitraum als Unix-Sekunden. from = lokale Mitternacht, to = lokales
 *  Tagesende — damit landet ein am 1. gewaehltes Datum nicht wegen UTC-
 *  Versatz im Vortag. */
function rangeParams() {
  const p = {};
  if (range.value.from) p.from = Math.floor(new Date(`${range.value.from}T00:00:00`).getTime() / 1000);
  if (range.value.to)   p.to   = Math.floor(new Date(`${range.value.to}T23:59:59`).getTime() / 1000);
  return p;
}

/** Filter, die Liste UND Statistik gemeinsam benutzen. */
function filterParams() {
  const vid = appStore.selectedVehicle?.id;
  return {
    ...(vid                ? { vehicle_id: vid }                : {}),
    ...(filterType.value   ? { trip_type: filterType.value }    : {}),
    ...(filterDriver.value ? { driver_id: filterDriver.value }  : {}),
    ...rangeParams(),
  };
}

async function loadStats() {
  const { data } = await api.get('/trips/stats', { params: filterParams() });
  stats.value = data;
}

async function load() {
  loading.value = true;
  const params = filterParams();
  const [tr, s] = await Promise.all([
    api.get('/trips', { params: { ...params, limit: limit.value, sort: sortDir.value } }),
    api.get('/trips/stats', { params }),
  ]);
  trips.value   = tr.data;
  stats.value   = s.data;
  // Haken von Fahrten entfernen, die nach dem Filterwechsel gar nicht
  // mehr in der Liste stehen — sonst zaehlt die Leiste Unsichtbares mit.
  const visible = new Set(trips.value.map(t => t.id));
  selected.value = new Set([...selected.value].filter(id => visible.has(id)));
  loading.value = false;
}

// ─── Markierung ─────────────────────────────────────────────────────────
function toggleSelect(id) {
  if (selected.value.has(id)) selected.value.delete(id);
  else selected.value.add(id);
}
function clearSelection() { selected.value = new Set(); }
function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) clearSelection();
}
const allLoadedSelected = computed(() =>
  trips.value.length > 0 && trips.value.every(t => selected.value.has(t.id))
);
function toggleSelectAll() {
  if (allLoadedSelected.value) clearSelection();
  else selected.value = new Set(trips.value.map(t => t.id));
}

/** Summe der markierten Fahrten. Bezieht sich bewusst nur auf geladene
 *  Fahrten — die Zeitraum-Summe oben kommt dagegen vom Server. */
const selection = computed(() => {
  const list = trips.value.filter(t => selected.value.has(t.id));
  const km  = list.reduce((a, t) => a + (t.distance_km || 0), 0);
  const kwh = list.reduce((a, t) => a + (t.energy_used_kwh || 0), 0);
  const durationS = list.reduce(
    (a, t) => a + (t.end_time && t.start_time && t.end_time > t.start_time ? t.end_time - t.start_time : 0), 0);
  return { count: list.length, km, kwh, durationS, consumption: km > 0 && kwh > 0 ? kwh / km * 100 : null };
});

const fmtDuration = secs => {
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
};

async function loadMore() { limit.value += 50; await load(); }

/** Tages-Filter aus der Query uebernehmen. Die Aktivitaets-Heatmap
 *  verlinkt seit jeher auf /trips?date=YYYY-MM-DD — bis jetzt lief das
 *  ins Leere, weil die Fahrtenliste die Query nie ausgewertet hat. */
function applyQueryDate() {
  const d = route.query.date;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    range.value = { from: d, to: d };
    activePreset.value = null;
    return true;
  }
  return false;
}

onMounted(async () => {
  applyQueryDate();
  const { data } = await api.get('/drivers');
  drivers.value = data;
  await load();
});
// Erneute Navigation von der Heatmap auf einen anderen Tag trifft die
// bereits gemountete View — deshalb zusaetzlich auf die Query hoeren.
watch(() => route.query.date, () => { if (applyQueryDate()) load(); });
watch(() => appStore.selectedVehicleId, load);
// Sortierwechsel triggert Reload, damit Backend mit korrektem ORDER BY liefert.
watch(sortDir, load);

// Dropdown schliessen bei Klick ausserhalb + bei Scroll/Resize
// (Position passt sonst nicht mehr — native UX: Menue zu, neu oeffnen).
// onMounted + onBeforeUnmount, damit der Listener bei wiederholtem
// Navigieren nicht mehrfach gestapelt wird.
function onScrollOrResize() { closeMenus(); }
onMounted(() => {
  window.addEventListener('click',  closeMenus);
  window.addEventListener('scroll', onScrollOrResize, true);  // capture: faengt Scrolls auf nested containers ab
  window.addEventListener('resize', onScrollOrResize);
});
onBeforeUnmount(() => {
  window.removeEventListener('click',  closeMenus);
  window.removeEventListener('scroll', onScrollOrResize, true);
  window.removeEventListener('resize', onScrollOrResize);
});
</script>

<style scoped>
/* Summenleiste der Markierung. Auf Mobile ueber der Tab-Bar parken,
   sonst verdeckt diese die Werte (Tab-Bar: fixed, z-index 200). */
.trips-selection-bar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 210;
  padding: 0.75rem 1rem;
  background: rgba(14, 14, 16, 0.95);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  backdrop-filter: saturate(180%) blur(18px);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
@media (max-width: 767px) {
  .trips-selection-bar { bottom: calc(var(--tab-bar-h) + var(--safe-bottom)); }
}
</style>

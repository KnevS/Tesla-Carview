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
        <div class="text-sm text-gray-400">{{ $t('trips.countLabel', { count: trips.length }) }}</div>
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
      <div class="space-y-2">
        <div v-if="loading" class="text-gray-400">{{ $t('trips.loading') }}</div>

        <div v-for="trip in trips" :key="trip.id" class="card hover:bg-gray-600 transition">
        <div class="flex items-start gap-3">
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
                  {{ trip.distance_km ? fmtEfficiency(trip.energy_used_kwh / trip.distance_km * 100) : '–' }}
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

async function loadStats() {
  const vid = appStore.selectedVehicle?.id;
  const params = vid ? { vehicle_id: vid } : {};
  const { data } = await api.get('/trips/stats', { params });
  stats.value = data;
}

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = {
    limit: limit.value,
    sort: sortDir.value,
    ...(vid           ? { vehicle_id: vid }          : {}),
    ...(filterType.value   ? { trip_type: filterType.value }   : {}),
    ...(filterDriver.value ? { driver_id: filterDriver.value } : {}),
  };
  const [tr, s] = await Promise.all([
    api.get('/trips', { params }),
    api.get('/trips/stats', { params: vid ? { vehicle_id: vid } : {} }),
  ]);
  trips.value   = tr.data;
  stats.value   = s.data;
  loading.value = false;
}

async function loadMore() { limit.value += 50; await load(); }

onMounted(async () => {
  const { data } = await api.get('/drivers');
  drivers.value = data;
  await load();
});
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

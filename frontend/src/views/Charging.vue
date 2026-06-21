<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold">{{ $t('charging.title') }}</h1>
      <SortToggle v-model:direction="sortDir" />
    </div>

    <template v-for="sid in layoutOrder" :key="sid">

    <SortableSection v-if="sid === 'stats'" page-id="charging" section-id="stats"
      :title="$t('charging.sectionStats')" icon="📊"
      :collapsed="isCollapsed('stats')" @toggle="toggle('stats')" @move="(f,t,p) => moveSection(f,t,p)">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard :label="$t('charging.sessions')" :value="stats.total_sessions" icon="plus"
          :tooltip="$t('charging.sessionsTooltip')" />
        <StatCard :label="$t('charging.totalCharged')" :value="fmt(stats.total_energy_kwh, 1) + ' kWh'" icon="bolt"
          :tooltip="$t('charging.totalChargedTooltip')" />
        <StatCard :label="$t('charging.totalCost')" :value="fmt(stats.total_cost, 2) + ' €'" icon="wallet"
          :tooltip="$t('charging.totalCostTooltip')" />
        <StatCard :label="$t('charging.maxPower')" :value="fmt(stats.peak_power, 0) + ' kW'" icon="pulse"
          :tooltip="$t('charging.maxPowerTooltip')" />
      </div>
    </SortableSection>

    <SortableSection v-if="sid === 'bytype' && stats.byType?.length" page-id="charging" section-id="bytype"
      :title="$t('charging.byType')" icon="⚡"
      :collapsed="isCollapsed('bytype')" @toggle="toggle('bytype')" @move="(f,t,p) => moveSection(f,t,p)">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div v-for="t in stats.byType" :key="t.charger_type"
          v-tooltip="chargerTypeTooltip(t.charger_type)"
          class="bg-gray-700 rounded-xl p-3 text-center cursor-help">
          <p class="text-sm text-gray-400">{{ chargerTypeLabel(t.charger_type) }}</p>
          <p class="font-bold">{{ t.count }}x</p>
          <p class="text-sm text-gray-400">{{ fmt(t.energy, 1) }} kWh</p>
        </div>
      </div>
    </SortableSection>

    <SortableSection v-if="sid === 'heatmap'" page-id="charging" section-id="heatmap"
      :title="$t('charging.heatmapTitle')" icon="📅"
      :collapsed="isCollapsed('heatmap')" @toggle="toggle('heatmap')" @move="(f,t,p) => moveSection(f,t,p)">
      <ChargingHeatmap />
    </SortableSection>

    <SortableSection v-if="sid === 'sessions'" page-id="charging" section-id="sessions"
      :title="$t('charging.sectionSessions')" icon="🔌"
      :collapsed="isCollapsed('sessions')" @toggle="toggle('sessions')" @move="(f,t,p) => moveSection(f,t,p)">
      <div class="space-y-3">
      <div v-if="loading" class="text-gray-400">{{ $t('charging.loading') }}</div>
      <div v-for="s in sessions" :key="s.id"
        class="card"
        :class="s.is_free ? 'opacity-60 border border-gray-600' : ''">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Klick auf den Ort öffnet den Inline-Editor. Sinnvoll, wenn
                   das Fahrzeug keine GPS-Daten liefert und man den Ort
                   manuell eintragen oder einem definierten Ladeort zuordnen
                   muss. -->
              <button v-if="editingLocationId !== s.id"
                @click="startEditLocation(s)"
                class="font-semibold text-left hover:text-tesla-red transition"
                v-tooltip="$t('charging.locationEditTooltip')">
                {{ formatLocation({ address: s.location_name, lat: s.lat, lon: s.lon, fallback: $t('charging.unknownLocation') }) }}
              </button>
              <!-- Heim-Wallbox: erkannt via Monta-Sync (chargePointId-Match) oder
                   ueber location_id auf einen home-Ort. Hilft beim raschen
                   Visuellen Erfassen, was zu Hause geladen wurde. -->
              <span v-if="s.is_home_charged"
                class="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full"
                v-tooltip="$t('charging.homeBadgeTooltip')">
                {{ $t('charging.homeBadge') }}
              </span>
              <span v-if="s.is_free"
                class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full"
                v-tooltip="$t('charging.freeTooltip')">
                {{ $t('charging.free') }}
              </span>
            </div>

            <!-- Inline-Location-Editor: wird beim Klick auf Ort geoeffnet.
                 Drei Wege, einen Ladeort anzugeben:
                  1. Aus definierten Ladeorten waehlen (uebernimmt Tarif).
                  2. Freier Text-Name (z.B. „Aldi Schlossplatz").
                  3. GPS-Koordinaten manuell — auto-Match gegen Ladeorte. -->
            <div v-if="editingLocationId === s.id"
                 class="mt-2 bg-gray-800 rounded-lg p-3 space-y-2 max-w-md">
              <p class="text-xs text-gray-400">
                {{ $t('charging.locationEditHint') }}
              </p>
              <div>
                <label class="text-xs text-gray-400 block mb-0.5">{{ $t('charging.locationDefinedLabel') }}</label>
                <select v-model="locationPickId"
                  class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                  v-tooltip="$t('charging.locationDefinedTooltip')">
                  <option :value="''">{{ $t('charging.locationFreeEntry') }}</option>
                  <option v-for="loc in chargingLocations" :key="loc.id" :value="loc.id">
                    {{ loc.name }} ({{ loc.type === 'home' ? $t('charging.locationTypeHome') : $t('charging.locationTypeAway') }}{{ loc.rate_kwh != null ? `, ${loc.rate_kwh.toFixed(3)} €/kWh` : '' }})
                  </option>
                </select>
              </div>
              <div v-if="!locationPickId">
                <label class="text-xs text-gray-400 block mb-0.5">{{ $t('charging.locationNameLabel') }}</label>
                <input v-model="locationName" type="text"
                  class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                  :placeholder="$t('charging.locationNamePlaceholder')"
                  v-tooltip="$t('charging.locationNameTooltip')" />
              </div>
              <div v-if="!locationPickId" class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-gray-400 block mb-0.5">{{ $t('charging.locationLatLabel') }}</label>
                  <input v-model="locationLat" type="number" step="any" min="-90" max="90"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                    placeholder="48.7758"
                    v-tooltip="$t('charging.locationLatTooltip')" />
                </div>
                <div>
                  <label class="text-xs text-gray-400 block mb-0.5">{{ $t('charging.locationLonLabel') }}</label>
                  <input v-model="locationLon" type="number" step="any" min="-180" max="180"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                    placeholder="9.1829"
                    v-tooltip="$t('charging.locationLonTooltip')" />
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="saveLocation(s)"
                  class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded">
                  {{ $t('charging.save') }}
                </button>
                <button @click="editingLocationId = null"
                  class="text-xs text-gray-400 hover:text-white px-2">{{ $t('charging.cancel') }}</button>
              </div>
            </div>
            <p class="text-sm text-gray-400">{{ fmtDate(s.start_time) }}</p>
            <div class="flex gap-3 mt-2 text-sm">
              <span class="bg-gray-700 rounded-lg px-2 py-0.5"
                v-tooltip="chargerTypeTooltip(s.charger_type)">{{ chargerTypeLabel(s.charger_type) }}</span>
              <span v-tooltip="$t('charging.socTooltip')">SoC {{ s.start_soc }}% → {{ s.end_soc }}%</span>
            </div>
            <button @click="detailSessionId = s.id"
              class="text-xs text-gray-400 hover:text-tesla-red transition mt-2 inline-flex items-center gap-1"
              v-tooltip="$t('charging.detailOpenTooltip')">
              📈 {{ $t('charging.detailOpen') }}
            </button>
          </div>
          <div class="text-right space-y-1">
            <p class="text-2xl font-bold text-green-400"
              v-tooltip="$t('charging.energyAddedTooltip')">
              {{ $t('charging.kwhAdded', { value: fmt(s.energy_added_kwh, 1) }) }}
            </p>
            <p class="text-sm text-gray-400">{{ $t('charging.kwMax', { value: fmt(s.max_power_kw, 0) }) }}</p>
            <!-- Kosten & Tarif -->
            <div v-if="!s.is_free">
              <p v-if="s.cost != null" class="text-sm text-gray-300 font-medium">{{ fmt(s.cost, 2) }} {{ s.currency || 'EUR' }}</p>
              <!-- Inline-Tarifeditor -->
              <div v-if="editingRateId === s.id" class="flex items-center gap-1 mt-1 justify-end">
                <input v-model="rateInput" type="number" step="0.01" min="0"
                  class="w-20 text-xs bg-gray-700 border border-gray-500 rounded px-1 py-0.5 text-right"
                  :placeholder="$t('charging.rateInputPlaceholder')"
                  @keyup.enter="saveRate(s)"
                  @keyup.escape="editingRateId = null" />
                <button @click="saveRate(s)" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded">✓</button>
                <button @click="editingRateId = null" class="text-xs text-gray-400 hover:text-white px-1">✕</button>
              </div>
              <button v-else @click="startEditRate(s)"
                class="text-xs text-gray-500 hover:text-gray-300 transition mt-0.5"
                v-tooltip="$t('charging.rateTooltip')">
                {{ s.billing_rate_kwh != null ? $t('charging.ratePerKwh', { value: fmt(s.billing_rate_kwh, 3) }) : $t('charging.editRate') }}
              </button>
            </div>
            <button @click="toggleFree(s)"
              class="text-xs px-2 py-0.5 rounded transition"
              :class="s.is_free
                ? 'bg-gray-700 text-gray-300 hover:bg-green-900 hover:text-green-300'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'"
              v-tooltip="s.is_free ? $t('charging.unmarkFreeTooltip') : $t('charging.markFreeTooltip')">
              {{ s.is_free ? $t('charging.unmarkFree') : $t('charging.markFree') }}
            </button>
          </div>
        </div>
      </div>
      </div>
    </SortableSection>

    </template><!-- end v-for layoutOrder -->

    <ChargingSessionDetail v-if="detailSessionId" :session-id="detailSessionId"
      @close="detailSessionId = null" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import AppIcon from '../components/AppIcon.vue';
import ChargingHeatmap from '../components/ChargingHeatmap.vue';
import ChargingSessionDetail from '../components/ChargingSessionDetail.vue';
import SortToggle from '../components/SortToggle.vue';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import { useSortDirection } from '../composables/useSortDirection.js';
import { formatLocation } from '../lib/location.js';
import api from '../api.js';

const { t, locale } = useI18n();
const appStore = useAppStore();

const CHARGING_SECTIONS = ['stats', 'bytype', 'heatmap', 'sessions'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('charging', CHARGING_SECTIONS);

const sessions = ref([]);
const stats = ref({ byType: [] });
const loading = ref(true);
// Sortierreihenfolge pro View in localStorage. Default desc (Neueste oben).
const { direction: sortDir } = useSortDirection('charging');
const editingRateId = ref(null);
const rateInput = ref('');
// Geöffnete Session-Detailansicht (Ladeverlauf-Modal); null = geschlossen.
const detailSessionId = ref(null);

// Location-Editor State (Inline pro Session). chargingLocations einmal
// beim Mount geladen, damit das Dropdown sofort gefuellt ist.
const chargingLocations = ref([]);
const editingLocationId = ref(null);
const locationPickId = ref('');
const locationName   = ref('');
const locationLat    = ref('');
const locationLon    = ref('');

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
// Datumsformat folgt der aktiven App-Sprache.
const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR' };
const fmtDate = ts => new Date(ts * 1000).toLocaleString(LOCALE_TAG[locale.value] || 'de-DE');

function chargerTypeTooltip(type) {
  const map = {
    'AC':    t('charging.chargerTypeAC'),
    'DC':    t('charging.chargerTypeDC'),
    'Tesla': t('charging.chargerTypeTesla'),
    'Combo': t('charging.chargerTypeCombo'),
  };
  return map[type] || t('charging.chargerTypeUnknown');
}

// Anzeige-Label fuer den Lade-Technologie-Typ. Tesla liefert manchmal
// 'Invalid' wenn die Wallbox/Säule die Technologie nicht uebermittelt
// (typisch: aeltere AC-Wallboxen, einige unbranded DC-Schnelllader).
// 'Invalid' sieht in der UI nach Fehler aus — wir ersetzen es durch
// eine erklaerende Formulierung statt nur 'unbekannt', damit der User
// versteht, dass es kein Bug ist, sondern eine Limitierung der
// Ladestation.
function chargerTypeLabel(type) {
  if (!type || type === 'Invalid') return t('charging.chargerTypeNotReported');
  return type;
}

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const baseParams = vid ? { vehicle_id: vid } : {};
  // Sortier-Param nur an /charging — /charging/stats nutzt aggregierte
  // Daten unabhaengig von Reihenfolge.
  const [s, st] = await Promise.all([
    api.get('/charging', { params: { ...baseParams, sort: sortDir.value } }),
    api.get('/charging/stats', { params: baseParams }),
  ]);
  sessions.value = s.data;
  stats.value = st.data;
  loading.value = false;
}

async function toggleFree(session) {
  const newVal = !session.is_free;
  await api.patch(`/charging/${session.id}`, { is_free: newVal });
  session.is_free = newVal;
}

function startEditRate(session) {
  editingRateId.value = session.id;
  rateInput.value = session.billing_rate_kwh != null ? String(session.billing_rate_kwh) : '';
}

async function saveRate(session) {
  const rate = parseFloat(rateInput.value);
  if (isNaN(rate) || rate < 0) { editingRateId.value = null; return; }
  const { data } = await api.patch(`/charging/${session.id}`, { billing_rate_kwh: rate });
  Object.assign(session, data);
  editingRateId.value = null;
}

function startEditLocation(session) {
  editingLocationId.value = session.id;
  locationPickId.value = session.location_id || '';
  locationName.value   = session.location_name || '';
  locationLat.value    = session.lat ?? '';
  locationLon.value    = session.lon ?? '';
}

/** Speichern: zwei Pfade.
 *  a) Ein definierter Ladeort wurde gewaehlt → /assign-location (uebernimmt
 *     Tarif & Position vom Ladeort).
 *  b) Freie Eingabe → PATCH mit location_name + optional lat/lon. Wenn
 *     lat/lon gesetzt sind, ruft die UI im Anschluss /assign-location auf,
 *     damit auto-matching greift. */
async function saveLocation(session) {
  try {
    if (locationPickId.value) {
      const { data } = await api.post(`/charging/${session.id}/assign-location`,
        { location_id: locationPickId.value });
      Object.assign(session, data);
    } else {
      const lat = locationLat.value === '' ? null : parseFloat(locationLat.value);
      const lon = locationLon.value === '' ? null : parseFloat(locationLon.value);
      const { data } = await api.patch(`/charging/${session.id}`, {
        location_name: locationName.value.trim() || null,
        lat, lon,
      });
      Object.assign(session, data);
      // Auto-Match anstossen, falls Koordinaten gesetzt — falls kein
      // Ladeort matched, liefert /assign-location 404, das ignorieren wir
      // bewusst (kein Treffer ist OK; der freie Name reicht).
      if (lat != null && lon != null) {
        try {
          const { data: matched } = await api.post(`/charging/${session.id}/assign-location`, {});
          Object.assign(session, matched);
        } catch { /* kein Match — bleibt beim freien Namen */ }
      }
    }
    editingLocationId.value = null;
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
}

async function loadLocations() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return;
  try {
    const { data } = await api.get('/charging-locations', { params: { vehicle_id: vid } });
    chargingLocations.value = data;
  } catch { chargingLocations.value = []; }
}

onMounted(async () => { await load(); loadLocations(); });
watch(() => appStore.selectedVehicleId, async () => { await load(); loadLocations(); });
// Sortierwechsel triggert Reload, damit Backend mit korrektem ORDER BY liefert.
watch(sortDir, load);
</script>

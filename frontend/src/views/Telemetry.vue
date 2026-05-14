<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <AppIcon name="gauge" :size="24" class="text-tesla-red" />
        Fahrzeugtechnik
      </h1>
      <div class="flex items-center gap-3">
        <span :class="online ? 'text-green-400' : 'text-gray-400'" class="text-sm flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span v-if="online" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span :class="online ? 'bg-green-400' : 'bg-gray-600'" class="relative inline-flex rounded-full h-2 w-2"></span>
          </span>
          {{ online ? 'Live' : 'Offline' }}
        </span>
        <button @click="refresh" :disabled="loading" class="btn-secondary text-sm"
          v-tooltip="'Fahrzeugdaten jetzt aktualisieren (automatisch alle 30 Sekunden)'">
          <span :class="{'animate-spin inline-block': loading}">⟳</span> Aktualisieren
        </button>
      </div>
    </div>

    <div v-if="offline" class="card text-center py-16 space-y-3">
      <div class="text-5xl">😴</div>
      <p class="text-gray-300 font-medium">Fahrzeug schläft oder ist offline</p>
      <p class="text-sm text-gray-500">Daten werden automatisch geladen, sobald das Fahrzeug aufwacht.</p>
    </div>

    <template v-else-if="data">
      <template v-for="sid in layoutOrder" :key="sid">

      <!-- Hero stats -->
      <SortableSection v-if="sid === 'hero'" page-id="telemetry" section-id="hero"
        title="Live-Daten" icon="⚡"
        :collapsed="isCollapsed('hero')" @toggle="toggle('hero')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="relative overflow-hidden">
          <div class="absolute inset-0 opacity-5 bg-gradient-to-br from-tesla-red to-transparent"></div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
            <div class="space-y-1" v-tooltip="'Ladezustand der Hochvoltbatterie in Prozent'">
              <div class="text-xs text-gray-400 uppercase tracking-wide">SOC</div>
              <div class="text-4xl font-bold" :class="socColor">{{ data.charge.level_pct ?? '—' }}%</div>
              <div class="text-sm text-gray-400">{{ data.charge.range_km ?? '—' }} km Reichweite</div>
            </div>
            <div class="space-y-1" v-tooltip="'Aktuelle Geschwindigkeit in km/h'">
              <div class="text-xs text-gray-400 uppercase tracking-wide">Geschwindigkeit</div>
              <div class="text-4xl font-bold text-white">{{ data.drive.speed_kph ?? 0 }}</div>
              <div class="text-sm text-gray-400">km/h · Gang: {{ data.drive.gear ?? 'P' }}</div>
            </div>
            <div class="space-y-1" v-tooltip="'Momentane Motorleistung. Positiv = Antrieb, Negativ = Rekuperation (Energie zurückgewinnen beim Bremsen)'">
              <div class="text-xs text-gray-400 uppercase tracking-wide">Leistung</div>
              <div class="text-4xl font-bold" :class="data.drive.power_kw < 0 ? 'text-green-400' : 'text-white'">
                {{ data.drive.power_kw ?? '—' }}
              </div>
              <div class="text-sm text-gray-400">kW</div>
            </div>
            <div class="space-y-1" v-tooltip="'Gesamtkilometerstand des Fahrzeugs'">
              <div class="text-xs text-gray-400 uppercase tracking-wide">Kilometerstand</div>
              <div class="text-4xl font-bold text-white">{{ fmt(data.vehicle.odometer_km) }}</div>
              <div class="text-sm text-gray-400">km</div>
            </div>
          </div>
        </div>
      </SortableSection>

      <!-- Live GPS Position -->
      <SortableSection v-if="sid === 'map' && data.drive?.lat && data.drive?.lon"
        page-id="telemetry" section-id="map"
        title="Live-Position" icon="📍"
        :collapsed="isCollapsed('map')" @toggle="toggle('map')" @move="(f,t,p) => moveSection(f,t,p)">
        <div id="live-map" style="height: 280px; border-radius: 10px;"></div>
      </SortableSection>

      <!-- Power flow + TPMS + Climate -->
      <SortableSection v-if="sid === 'power'" page-id="telemetry" section-id="power"
        title="Leistungsfluss" icon="⚡"
        :collapsed="isCollapsed('power')" @toggle="toggle('power')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="space-y-2">
          <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span v-tooltip="'Energie wird durch Bremsen zurückgewonnen (Rekuperation)'">← Rekuperation</span>
            <span class="font-medium text-white">{{ data.drive.power_kw != null ? data.drive.power_kw + ' kW' : '—' }}</span>
            <span v-tooltip="'Energie wird für den Antrieb verbraucht'">Antrieb →</span>
          </div>
          <div class="relative h-5 bg-gray-800 rounded-full overflow-hidden flex">
            <div class="w-1/2 flex justify-end overflow-hidden">
              <div class="bg-green-500 h-full transition-all duration-300 rounded-l"
                :style="{ width: regenPct + '%' }"></div>
            </div>
            <div class="w-px bg-gray-600"></div>
            <div class="w-1/2 overflow-hidden">
              <div class="bg-tesla-red h-full transition-all duration-300 rounded-r"
                :style="{ width: drivePct + '%' }"></div>
            </div>
          </div>
        </div>
      </SortableSection>

      <!-- TPMS -->
      <SortableSection v-if="sid === 'tpms'" page-id="telemetry" section-id="tpms"
        title="Reifendruck (TPMS)" icon="🛞"
        :collapsed="isCollapsed('tpms')" @toggle="toggle('tpms')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="relative mx-auto w-52 h-36">
          <svg viewBox="0 0 208 144" class="absolute inset-0 w-full h-full">
            <rect x="44" y="32" width="120" height="80" rx="16" fill="none" stroke="#374151" stroke-width="2"/>
            <rect x="64" y="16" width="80" height="40" rx="10" fill="none" stroke="#374151" stroke-width="2"/>
          </svg>
          <div class="absolute top-0 left-0" v-tooltip="'Vorderreifen links – optimaler Druck: 2.4–2.9 bar'">
            <TireBadge :value="data.vehicle.tpms.fl" label="VL" />
          </div>
          <div class="absolute top-0 right-0" v-tooltip="'Vorderreifen rechts – optimaler Druck: 2.4–2.9 bar'">
            <TireBadge :value="data.vehicle.tpms.fr" label="VR" />
          </div>
          <div class="absolute bottom-0 left-0" v-tooltip="'Hinterreifen links – optimaler Druck: 2.4–2.9 bar'">
            <TireBadge :value="data.vehicle.tpms.rl" label="HL" />
          </div>
          <div class="absolute bottom-0 right-0" v-tooltip="'Hinterreifen rechts – optimaler Druck: 2.4–2.9 bar'">
            <TireBadge :value="data.vehicle.tpms.rr" label="HR" />
          </div>
        </div>
      </SortableSection>

      <!-- Climate -->
      <SortableSection v-if="sid === 'climate'" page-id="telemetry" section-id="climate"
        title="Klima" icon="🌡️"
        :collapsed="isCollapsed('climate')" @toggle="toggle('climate')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="space-y-2">
          <DataRow label="Innentemperatur"     :value="fmtT(data.climate.inside_temp_c)"        tooltip="Aktuelle Temperatur im Fahrzeuginnenraum" />
          <DataRow label="Außentemperatur"     :value="fmtT(data.climate.outside_temp_c)"       tooltip="Außentemperatur am Fahrzeugstandort" />
          <DataRow label="Solltemperatur"      :value="fmtT(data.climate.driver_temp_setting)"  tooltip="Eingestellte Wunschtemperatur des Fahrers" />
          <DataRow label="Klimaanlage"         :value="data.climate.is_climate_on ? '✅ Ein' : '⭕ Aus'" tooltip="Ob die Klimaanlage gerade aktiv ist" />
          <DataRow label="Frontscheibenheiz."  :value="data.climate.is_front_defroster_on ? '✅ Ein' : '⭕ Aus'" tooltip="Frontscheibenheizung aktiv?" />
          <DataRow label="Heckscheibenheiz."   :value="data.climate.is_rear_defroster_on  ? '✅ Ein' : '⭕ Aus'" tooltip="Heckscheibenheizung aktiv?" />
        </div>
      </SortableSection>

      <!-- Charging -->
      <SortableSection v-if="sid === 'charging'" page-id="telemetry" section-id="charging"
        title="Laden" icon="🔌"
        :collapsed="isCollapsed('charging')" @toggle="toggle('charging')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="space-y-2">
          <DataRow label="Status"          :value="data.charge.charging_state ?? '—'"                              tooltip="Charging = aktiv, Disconnected = nicht angesteckt, Complete = voll" />
          <DataRow label="Ladeleistung"    :value="data.charge.charger_power_kw ? data.charge.charger_power_kw + ' kW' : '—'" tooltip="Aktuelle Ladeleistung in kW" />
          <DataRow label="Ladegeschwind."  :value="data.charge.charge_rate_kph ? data.charge.charge_rate_kph + ' km/h' : '—'" tooltip="Mit welcher Reichweite pro Stunde wird geladen" />
          <DataRow label="Ladelimit"       :value="data.charge.charge_limit_pct ? data.charge.charge_limit_pct + '%' : '—'"   tooltip="Maximaler SOC den das Fahrzeug laden wird" />
          <DataRow label="Zeit bis voll"   :value="fmtH(data.charge.time_to_full_charge_h)"                        tooltip="Voraussichtliche Restzeit bis zum Ladelimit" />
        </div>
      </SortableSection>

      <!-- Vehicle -->
      <SortableSection v-if="sid === 'vehicle'" page-id="telemetry" section-id="vehicle"
        title="Fahrzeug" icon="🚗"
        :collapsed="isCollapsed('vehicle')" @toggle="toggle('vehicle')" @move="(f,t,p) => moveSection(f,t,p)">
        <div class="space-y-2">
          <DataRow label="Zustand"     :value="data.state"                                            tooltip="Online, Asleep, Driving, Charging" />
          <DataRow label="Verriegelt"  :value="data.vehicle.locked ? '🔒 Ja' : '🔓 Nein'"           tooltip="Ob das Fahrzeug gerade verriegelt ist" />
          <DataRow label="Sentry"      :value="data.vehicle.sentry_mode ? '👁 Aktiv' : 'Inaktiv'"   tooltip="Sentry-Mode überwacht das Fahrzeug mit Kameras bei Einbruchversuchen" />
          <DataRow label="Software"    :value="data.vehicle.software_version ?? '—'"                  tooltip="Aktuelle Fahrzeugsoftwareversion" />
          <DataRow label="Richtung"    :value="data.drive.heading != null ? data.drive.heading + '°' : '—'" tooltip="Kompasskurs in Grad (0° = Norden, 90° = Osten)" />
        </div>
      </SortableSection>

      </template><!-- end v-for layoutOrder -->
    </template>

    <!-- Kein Fahrzeug ausgewählt -->
    <div v-else-if="!vehicle" class="card text-center py-12 text-gray-400">
      Kein Fahrzeug ausgewählt — bitte oben rechts ein Fahrzeug wählen.
    </div>

    <!-- Tesla-OAuth ist abgelaufen / vom User widerrufen → die einzige
         sinnvolle Aktion ist „Tesla neu verbinden", deshalb prominent. -->
    <div v-else-if="authError" class="card text-center py-8 space-y-3 border border-yellow-700/40 bg-yellow-900/10">
      <p class="text-yellow-200 font-semibold flex items-center justify-center gap-2">
        <AppIcon name="alert" :size="20" />
        Keine Verbindung zum Tesla-Konto
      </p>
      <p class="text-sm text-gray-300 max-w-md mx-auto">
        Der OAuth-Token ist abgelaufen oder die Berechtigung wurde widerrufen.
        Bitte einmal neu verbinden, dann kommen die Live-Daten wieder.
      </p>
      <RouterLink to="/settings" class="btn-primary inline-block text-sm">
        Einstellungen → Tesla neu verbinden
      </RouterLink>
    </div>

    <!-- Fahrzeug schläft / offline → keine Live-Daten verfuegbar -->
    <div v-else-if="!loading && offline" class="card text-center py-12 space-y-2">
      <p class="text-gray-300">💤 Fahrzeug schläft oder ist offline.</p>
      <p class="text-xs text-gray-500">
        Live-Daten kommen, sobald das Fahrzeug aufwacht — oder du forderst sie unter
        <RouterLink to="/control" class="text-tesla-red underline">Steuerung</RouterLink> aktiv an.
      </p>
    </div>

    <!-- Default: Fahrzeug vorhanden, online erwartet, aber noch nichts geladen -->
    <div v-else-if="!loading && !offline" class="card text-center py-12 text-gray-400">
      Noch keine Daten — Telemetry läuft erst, wenn der Poller das erste Mal vom Tesla antwortet bekommt.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, h, resolveDirective, withDirectives } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
import AppIcon from '../components/AppIcon.vue';

const appStore = useAppStore();
const vehicle  = computed(() => appStore.selectedVehicle);

// Inline sub-components
const TireBadge = {
  props: ['value', 'label'],
  setup(props) {
    const cls = computed(() => {
      if (props.value == null) return 'border-gray-600 text-gray-500';
      if (props.value < 2.0 || props.value > 3.2) return 'border-red-500 text-red-400 bg-red-900/20';
      if (props.value < 2.3 || props.value > 2.9) return 'border-yellow-500 text-yellow-400 bg-yellow-900/20';
      return 'border-green-500 text-green-400 bg-green-900/20';
    });
    return () => h('div', { class: 'flex flex-col items-center gap-0.5' }, [
      h('div', { class: `w-14 h-9 rounded border-2 flex items-center justify-center text-xs font-bold ${cls.value}` },
        props.value != null ? props.value + ' b' : '—'),
      h('div', { class: 'text-xs text-gray-500' }, props.label),
    ]);
  },
};

const DataRow = {
  props: ['label', 'value', 'tooltip'],
  setup(props) {
    const tooltip = resolveDirective('tooltip');
    return () => withDirectives(
      h('div', { class: 'flex justify-between items-center text-sm border-b border-gray-800 pb-1.5' }, [
        h('span', { class: 'text-gray-400' }, props.label),
        h('span', { class: 'font-medium text-white' }, props.value ?? '—'),
      ]),
      [[tooltip, props.tooltip]]
    );
  },
};

const data       = ref(null);
const loading    = ref(false);
const offline    = ref(false);
// authError = true wenn das Backend 401/403 vom Tesla-Endpoint zurueck-
// gibt — passiert wenn Tesla unseren OAuth-Token widerrufen oder
// abgelaufen ist. Spezifischer als 'offline', damit der User weiss
// dass er handeln muss (neu verbinden) und nicht nur warten.
const authError  = ref(false);
let   timer      = null;
let   leafletMap = null;
let   posMarker  = null;

const online   = computed(() => !!data.value && !offline.value);
const MAX_P    = 300;
const regenPct = computed(() => { const p = data.value?.drive?.power_kw ?? 0; return p < 0 ? Math.min(100, (Math.abs(p) / MAX_P) * 100) : 0; });
const drivePct = computed(() => { const p = data.value?.drive?.power_kw ?? 0; return p > 0 ? Math.min(100, (p / MAX_P) * 100) : 0; });
const socColor = computed(() => {
  const s = data.value?.charge?.level_pct;
  if (s == null) return 'text-gray-400';
  return s <= 15 ? 'text-red-400' : s <= 25 ? 'text-yellow-400' : 'text-green-400';
});

function fmt(n)  { return n != null ? Number(n).toLocaleString('de-DE', { maximumFractionDigits: 0 }) : '—'; }
function fmtT(t) { return t != null ? t.toFixed(1) + ' °C' : '—'; }
function fmtH(h) {
  if (h == null) return '—';
  const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60);
  return hrs ? `${hrs}h ${mins}min` : `${mins}min`;
}

async function updateMap(lat, lon) {
  await nextTick();
  const mapEl = document.getElementById('live-map');
  if (!mapEl) return;
  const L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');
  if (!leafletMap) {
    leafletMap = L.map('live-map').setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(leafletMap);
    posMarker = L.circleMarker([lat, lon], {
      radius: 10, color: '#E31937', fillColor: '#E31937', fillOpacity: 0.9, weight: 3,
    }).bindPopup('Fahrzeugposition').addTo(leafletMap);
  } else {
    posMarker.setLatLng([lat, lon]);
    leafletMap.panTo([lat, lon]);
  }
}

async function refresh() {
  if (!vehicle.value) return;
  loading.value = true;
  offline.value = false;
  authError.value = false;
  try {
    const { data: d } = await api.get(`/telemetry/${vehicle.value.id}/live`);
    data.value = d;
    if (d.drive?.lat && d.drive?.lon) {
      await updateMap(d.drive.lat, d.drive.lon);
    }
  } catch (e) {
    const status = e.response?.status;
    if (status === 503) offline.value = true;
    else if (status === 401 || status === 403) authError.value = true;
    // 502/504 deckt das globale Maintenance-Overlay ab.
  } finally { loading.value = false; }
}

onMounted(() => { refresh(); timer = setInterval(refresh, 30000); });
onUnmounted(() => { clearInterval(timer); if (leafletMap) { leafletMap.remove(); leafletMap = null; } });
watch(() => vehicle.value?.id, () => { if (leafletMap) { leafletMap.remove(); leafletMap = null; posMarker = null; } refresh(); });
</script>

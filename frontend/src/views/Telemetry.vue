<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">🏎 Fahrzeugtechnik</h1>
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
      <!-- Hero stats -->
      <div class="card relative overflow-hidden">
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

      <!-- Live GPS Position -->
      <div class="card space-y-3" v-if="data.drive?.lat && data.drive?.lon">
        <h2 class="font-semibold">📍 Live-Position</h2>
        <div id="live-map" style="height: 280px; border-radius: 10px;"></div>
      </div>

      <!-- Power flow bar -->
      <div class="card space-y-2">
        <div class="flex justify-between text-xs text-gray-400 mb-1">
          <span v-tooltip="'Energie wird durch Bremsen zurückgewonnen (Rekuperation)'">← Rekuperation</span>
          <span class="font-medium text-white">{{ data.drive.power_kw != null ? data.drive.power_kw + ' kW' : '—' }}</span>
          <span v-tooltip="'Energie wird für den Antrieb verbraucht'">Antrieb →</span>
        </div>
        <div class="relative h-5 bg-gray-800 rounded-full overflow-hidden flex">
          <!-- Regen: right half growing left -->
          <div class="w-1/2 flex justify-end overflow-hidden">
            <div class="bg-green-500 h-full transition-all duration-300 rounded-l"
              :style="{ width: regenPct + '%' }"></div>
          </div>
          <div class="w-px bg-gray-600"></div>
          <!-- Drive: left half growing right -->
          <div class="w-1/2 overflow-hidden">
            <div class="bg-tesla-red h-full transition-all duration-300 rounded-r"
              :style="{ width: drivePct + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- TPMS + Climate grid -->
      <div class="grid md:grid-cols-2 gap-4">
        <!-- Tire pressure Track-Mode style -->
        <div class="card space-y-4">
          <h2 class="font-semibold" v-tooltip="'Reifenluftdruck aller vier Räder in bar. Grün = ok, Gelb = grenzwertig, Rot = zu niedrig/hoch'">
            🏎 Reifendruck (TPMS)
          </h2>
          <div class="relative mx-auto w-52 h-36">
            <!-- Car silhouette -->
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
        </div>

        <!-- Climate -->
        <div class="card space-y-3">
          <h2 class="font-semibold" v-tooltip="'Klimaanlage und Temperaturen'">🌡 Klima</h2>
          <DataRow label="Innentemperatur"     :value="fmtT(data.climate.inside_temp_c)"        tooltip="Aktuelle Temperatur im Fahrzeuginnenraum" />
          <DataRow label="Außentemperatur"     :value="fmtT(data.climate.outside_temp_c)"       tooltip="Außentemperatur am Fahrzeugstandort" />
          <DataRow label="Solltemperatur"      :value="fmtT(data.climate.driver_temp_setting)"  tooltip="Eingestellte Wunschtemperatur des Fahrers" />
          <DataRow label="Klimaanlage"         :value="data.climate.is_climate_on ? '✅ Ein' : '⭕ Aus'" tooltip="Ob die Klimaanlage gerade aktiv ist" />
          <DataRow label="Frontscheibenheiz."  :value="data.climate.is_front_defroster_on ? '✅ Ein' : '⭕ Aus'" tooltip="Frontscheibenheizung aktiv?" />
          <DataRow label="Heckscheibenheiz."   :value="data.climate.is_rear_defroster_on  ? '✅ Ein' : '⭕ Aus'" tooltip="Heckscheibenheizung aktiv?" />
        </div>
      </div>

      <!-- Charging + Vehicle -->
      <div class="grid md:grid-cols-2 gap-4">
        <div class="card space-y-3">
          <h2 class="font-semibold" v-tooltip="'Aktueller Ladestatus und Ladedetails'">⚡ Laden</h2>
          <DataRow label="Status"          :value="data.charge.charging_state ?? '—'"                              tooltip="Charging = aktiv, Disconnected = nicht angesteckt, Complete = voll" />
          <DataRow label="Ladeleistung"    :value="data.charge.charger_power_kw ? data.charge.charger_power_kw + ' kW' : '—'" tooltip="Aktuelle Ladeleistung in kW" />
          <DataRow label="Ladegeschwind."  :value="data.charge.charge_rate_kph ? data.charge.charge_rate_kph + ' km/h' : '—'" tooltip="Mit welcher Reichweite pro Stunde wird geladen" />
          <DataRow label="Ladelimit"       :value="data.charge.charge_limit_pct ? data.charge.charge_limit_pct + '%' : '—'"   tooltip="Maximaler SOC den das Fahrzeug laden wird" />
          <DataRow label="Zeit bis voll"   :value="fmtH(data.charge.time_to_full_charge_h)"                        tooltip="Voraussichtliche Restzeit bis zum Ladelimit" />
        </div>

        <div class="card space-y-3">
          <h2 class="font-semibold" v-tooltip="'Allgemeiner Fahrzeugzustand'">🚗 Fahrzeug</h2>
          <DataRow label="Zustand"     :value="data.state"                                            tooltip="Online, Asleep, Driving, Charging" />
          <DataRow label="Verriegelt"  :value="data.vehicle.locked ? '🔒 Ja' : '🔓 Nein'"           tooltip="Ob das Fahrzeug gerade verriegelt ist" />
          <DataRow label="Sentry"      :value="data.vehicle.sentry_mode ? '👁 Aktiv' : 'Inaktiv'"   tooltip="Sentry-Mode überwacht das Fahrzeug mit Kameras bei Einbruchversuchen" />
          <DataRow label="Software"    :value="data.vehicle.software_version ?? '—'"                  tooltip="Aktuelle Fahrzeugsoftwareversion" />
          <DataRow label="Richtung"    :value="data.drive.heading != null ? data.drive.heading + '°' : '—'" tooltip="Kompasskurs in Grad (0° = Norden, 90° = Osten)" />
        </div>
      </div>
    </template>

    <div v-else-if="!loading && !offline" class="card text-center py-12 text-gray-400">
      Kein Fahrzeug ausgewählt oder noch keine Daten.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, h, resolveDirective, withDirectives } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

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

const data    = ref(null);
const loading = ref(false);
const offline = ref(false);
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
  loading.value = true; offline.value = false;
  try {
    const { data: d } = await api.get(`/telemetry/${vehicle.value.id}/live`);
    data.value = d;
    if (d.drive?.lat && d.drive?.lon) {
      await updateMap(d.drive.lat, d.drive.lon);
    }
  } catch (e) {
    if (e.response?.status === 503) offline.value = true;
  } finally { loading.value = false; }
}

onMounted(() => { refresh(); timer = setInterval(refresh, 30000); });
onUnmounted(() => { clearInterval(timer); if (leafletMap) { leafletMap.remove(); leafletMap = null; } });
watch(() => vehicle.value?.id, () => { if (leafletMap) { leafletMap.remove(); leafletMap = null; posMarker = null; } refresh(); });
</script>

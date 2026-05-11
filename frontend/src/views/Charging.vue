<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Laden</h1>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Ladesessions" :value="stats.total_sessions" icon="🔌"
        tooltip="Anzahl aller automatisch erkannten Ladevorgänge – von Stecker rein bis Stecker raus." />
      <StatCard label="Geladen gesamt" :value="fmt(stats.total_energy_kwh, 1) + ' kWh'" icon="⚡"
        tooltip="Summe der nachgeladenen Energie in Kilowattstunden über alle Ladesessions." />
      <StatCard label="Ladekosten" :value="fmt(stats.total_cost, 2) + ' €'" icon="💶"
        tooltip="Summierte Kosten aller Ladesessions mit hinterlegtem Preis. Kostenlose Ladungen zählen mit 0 €." />
      <StatCard label="Max. Ladeleistung" :value="fmt(stats.peak_power, 0) + ' kW'" icon="🚀"
        tooltip="Höchste je gemessene Ladeleistung. Tesla Model 3/Y: bis 250 kW am V3 Supercharger; AC zu Hause typisch 11 kW." />
    </div>

    <div v-if="stats.byType?.length" class="card">
      <h2 class="text-lg font-semibold mb-4"
        v-tooltip="'Aufschlüsselung der Ladesessions nach Lade-Technologie.\n\nAC: Wechselstrom (zu Hause, Wallbox, langsam)\nDC: Gleichstrom (Schnelllader, Supercharger)'">
        Nach Ladertyp
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div v-for="t in stats.byType" :key="t.charger_type"
          v-tooltip="chargerTypeTooltip(t.charger_type)"
          class="bg-gray-700 rounded-xl p-3 text-center cursor-help">
          <p class="text-sm text-gray-400">{{ chargerTypeLabel(t.charger_type) }}</p>
          <p class="font-bold">{{ t.count }}x</p>
          <p class="text-sm text-gray-400">{{ fmt(t.energy, 1) }} kWh</p>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div v-if="loading" class="text-gray-400">Lade Sessions...</div>
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
                v-tooltip="'Klicken zum Bearbeiten — Ort manuell eintragen oder einem definierten Ladeort zuordnen, falls das Fahrzeug keine GPS-Daten geliefert hat.'">
                {{ s.location_name || 'Unbekannter Ort' }}
              </button>
              <!-- Heim-Wallbox: erkannt via Monta-Sync (chargePointId-Match) oder
                   ueber location_id auf einen home-Ort. Hilft beim raschen
                   Visuellen Erfassen, was zu Hause geladen wurde. -->
              <span v-if="s.is_home_charged"
                class="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full"
                v-tooltip="'Geladen an der Heim-Wallbox (per Monta erkannt)'">
                🏠 Zuhause
              </span>
              <span v-if="s.is_free"
                class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full"
                v-tooltip="'Diese Ladung ist als kostenlos markiert und wird nicht in der Abrechnung berücksichtigt'">
                kostenlos
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
                Ort manuell eintragen oder zuweisen — Hinweise siehe Tooltip pro Feld.
              </p>
              <div>
                <label class="text-xs text-gray-400 block mb-0.5">Definierter Ladeort</label>
                <select v-model="locationPickId"
                  class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                  v-tooltip="'Direkte Zuordnung zu einem unter „Ladeorte“ definierten Ort. Tarif (€/kWh) und Position werden vom Ladeort uebernommen — Kosten neu berechnet.'">
                  <option :value="''">— freier Eintrag unten —</option>
                  <option v-for="loc in chargingLocations" :key="loc.id" :value="loc.id">
                    {{ loc.name }} ({{ loc.type === 'home' ? 'zuhause' : 'auswaerts' }}{{ loc.rate_kwh != null ? `, ${loc.rate_kwh.toFixed(3)} €/kWh` : '' }})
                  </option>
                </select>
              </div>
              <div v-if="!locationPickId">
                <label class="text-xs text-gray-400 block mb-0.5">Name / Adresse</label>
                <input v-model="locationName" type="text"
                  class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                  placeholder="z.B. Aldi Schlossplatz, Stuttgart"
                  v-tooltip="'Frei waehlbarer Anzeigename — erscheint in der Ladeliste und in CSV-Exporten. Wird genommen, wenn kein definierter Ladeort gewaehlt ist.'" />
              </div>
              <div v-if="!locationPickId" class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-gray-400 block mb-0.5">Latitude (optional)</label>
                  <input v-model="locationLat" type="number" step="any" min="-90" max="90"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                    placeholder="48.7758"
                    v-tooltip="'GPS-Breitengrad. Sobald lat und lon gesetzt sind, gleicht die App automatisch mit definierten Ladeorten ab — Treffer im Umkreis (Standard 200m) wird zugeordnet und der Tarif uebernommen.'" />
                </div>
                <div>
                  <label class="text-xs text-gray-400 block mb-0.5">Longitude (optional)</label>
                  <input v-model="locationLon" type="number" step="any" min="-180" max="180"
                    class="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white"
                    placeholder="9.1829"
                    v-tooltip="'GPS-Laengengrad. Komma in der Eingabe wird als Punkt interpretiert. Hilfreich z.B. wenn das Fahrzeug XP7 keine GPS-Position liefert und der Tarif auf einen Ladeort gemappt werden soll.'" />
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="saveLocation(s)"
                  class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded">
                  Speichern
                </button>
                <button @click="editingLocationId = null"
                  class="text-xs text-gray-400 hover:text-white px-2">Abbrechen</button>
              </div>
            </div>
            <p class="text-sm text-gray-400">{{ fmtDate(s.start_time) }}</p>
            <div class="flex gap-3 mt-2 text-sm">
              <span class="bg-gray-700 rounded-lg px-2 py-0.5"
                v-tooltip="chargerTypeTooltip(s.charger_type)">{{ chargerTypeLabel(s.charger_type) }}</span>
              <span v-tooltip="'Batterie-Stand vor und nach dem Laden'">SoC {{ s.start_soc }}% → {{ s.end_soc }}%</span>
            </div>
          </div>
          <div class="text-right space-y-1">
            <p class="text-2xl font-bold text-green-400"
              v-tooltip="'Tatsächlich nachgeladene Energie. Kann durch Ladeverluste etwas niedriger sein als die vom Lader abgegebene Energie.'">
              +{{ fmt(s.energy_added_kwh, 1) }} kWh
            </p>
            <p class="text-sm text-gray-400">{{ fmt(s.max_power_kw, 0) }} kW max</p>
            <!-- Kosten & Tarif -->
            <div v-if="!s.is_free">
              <p v-if="s.cost != null" class="text-sm text-gray-300 font-medium">{{ fmt(s.cost, 2) }} {{ s.currency || 'EUR' }}</p>
              <!-- Inline-Tarifeditor -->
              <div v-if="editingRateId === s.id" class="flex items-center gap-1 mt-1 justify-end">
                <input v-model="rateInput" type="number" step="0.01" min="0"
                  class="w-20 text-xs bg-gray-700 border border-gray-500 rounded px-1 py-0.5 text-right"
                  placeholder="€/kWh"
                  @keyup.enter="saveRate(s)"
                  @keyup.escape="editingRateId = null" />
                <button @click="saveRate(s)" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded">✓</button>
                <button @click="editingRateId = null" class="text-xs text-gray-400 hover:text-white px-1">✕</button>
              </div>
              <button v-else @click="startEditRate(s)"
                class="text-xs text-gray-500 hover:text-gray-300 transition mt-0.5"
                v-tooltip="'Ladepreis für diese Session individuell anpassen (überschreibt den Standardtarif)'">
                {{ s.billing_rate_kwh != null ? fmt(s.billing_rate_kwh, 3) + ' €/kWh' : '✎ Tarif' }}
              </button>
            </div>
            <button @click="toggleFree(s)"
              class="text-xs px-2 py-0.5 rounded transition"
              :class="s.is_free
                ? 'bg-gray-700 text-gray-300 hover:bg-green-900 hover:text-green-300'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'"
              v-tooltip="s.is_free ? 'Als kostenpflichtig markieren' : 'Als kostenlos markieren (wird aus Abrechnung ausgeschlossen)'">
              {{ s.is_free ? '↩ kostenpflichtig' : '✕ kostenlos' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import StatCard from '../components/StatCard.vue';
import api from '../api.js';

const appStore = useAppStore();
const sessions = ref([]);
const stats = ref({ byType: [] });
const loading = ref(true);
const editingRateId = ref(null);
const rateInput = ref('');

// Location-Editor State (Inline pro Session). chargingLocations einmal
// beim Mount geladen, damit das Dropdown sofort gefuellt ist.
const chargingLocations = ref([]);
const editingLocationId = ref(null);
const locationPickId = ref('');
const locationName   = ref('');
const locationLat    = ref('');
const locationLon    = ref('');

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDate = ts => new Date(ts * 1000).toLocaleString('de-DE');

function chargerTypeTooltip(type) {
  const map = {
    'AC':  'Wechselstrom-Laden – zu Hause oder öffentliche Wallbox. Typisch 3,7–22 kW. Schonend für die Batterie.',
    'DC':  'Gleichstrom-Schnellladen – Autobahn-Schnelllader. Typisch 50–350 kW. Kann Batterie etwas mehr fordern.',
    'Tesla': 'Tesla Supercharger – V2 bis 150 kW, V3 bis 250 kW. Kosten meist günstiger als andere DC-Schnelllader.',
    'Combo': 'CCS Combo – europäischer DC-Schnellladestandard. Bis 350 kW möglich.',
  };
  return map[type] || 'Lade-Technologie wurde nicht eindeutig erkannt';
}

// Anzeige-Label fuer den Lade-Technologie-Typ. Tesla liefert manchmal
// 'Invalid' wenn die Hardware nicht erkannt wurde — in der UI sieht das
// nach einem technischen Fehler aus, also ersetzen wir es durch ein
// freundliches Wort. Leere Werte zeigen wir ebenfalls weich.
function chargerTypeLabel(type) {
  if (!type || type === 'Invalid') return 'unbekannt';
  return type;
}

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = vid ? { vehicle_id: vid } : {};
  const [s, st] = await Promise.all([api.get('/charging', { params }), api.get('/charging/stats', { params })]);
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
</script>

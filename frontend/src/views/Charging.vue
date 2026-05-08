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
          <p class="text-sm text-gray-400">{{ t.charger_type || 'Unbekannt' }}</p>
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
            <div class="flex items-center gap-2">
              <p class="font-semibold">{{ s.location_name || 'Unbekannter Ort' }}</p>
              <span v-if="s.is_free"
                class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full"
                v-tooltip="'Diese Ladung ist als kostenlos markiert und wird nicht in der Abrechnung berücksichtigt'">
                kostenlos
              </span>
            </div>
            <p class="text-sm text-gray-400">{{ fmtDate(s.start_time) }}</p>
            <div class="flex gap-3 mt-2 text-sm">
              <span class="bg-gray-700 rounded-lg px-2 py-0.5"
                v-tooltip="chargerTypeTooltip(s.charger_type)">{{ s.charger_type || 'AC' }}</span>
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

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

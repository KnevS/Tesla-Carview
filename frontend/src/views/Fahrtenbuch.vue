<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Fahrtenbuch</h1>
      <div class="flex items-center gap-2">
        <select v-model="selYear" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model="selMonth" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">Alle Monate</option>
          <option v-for="m in 12" :key="m" :value="String(m).padStart(2,'0')">{{ monthName(m) }}</option>
        </select>
        <select v-model="selType" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">Alle Typen</option>
          <option value="private">Privatfahrten</option>
          <option value="business">Dienstfahrten</option>
          <option value="commute">Arbeitswege</option>
        </select>
        <button @click="exportCsv" class="btn-secondary text-sm" v-tooltip="'Aktuelle Ansicht als CSV exportieren'">
          CSV Export
        </button>
      </div>
    </div>

    <!-- Jahresübersicht -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card text-center space-y-1">
        <p class="text-xs text-gray-400 uppercase tracking-wide">Gesamt km</p>
        <p class="text-3xl font-bold text-white">{{ fmt(yearStats.total_km) }}</p>
        <p class="text-xs text-gray-500">{{ yearStats.trips }} Fahrten</p>
      </div>
      <div class="card text-center space-y-1">
        <p class="text-xs text-gray-400 uppercase tracking-wide">Privatfahrten</p>
        <p class="text-3xl font-bold text-gray-300">{{ fmt(yearStats.private_km) }}</p>
        <p class="text-xs text-gray-500">{{ pct(yearStats.private_km, yearStats.total_km) }}%</p>
      </div>
      <div class="card text-center space-y-1">
        <p class="text-xs text-gray-400 uppercase tracking-wide">Dienstfahrten</p>
        <p class="text-3xl font-bold text-blue-300">{{ fmt(yearStats.business_km) }}</p>
        <p class="text-xs text-gray-500">{{ pct(yearStats.business_km, yearStats.total_km) }}%</p>
      </div>
      <div class="card text-center space-y-1">
        <p class="text-xs text-gray-400 uppercase tracking-wide">Arbeitswege</p>
        <p class="text-3xl font-bold text-green-300">{{ fmt(yearStats.commute_km) }}</p>
        <p class="text-xs text-gray-500">{{ pct(yearStats.commute_km, yearStats.total_km) }}%</p>
      </div>
    </div>

    <!-- Balken-Aufteilung -->
    <div class="card space-y-2" v-if="yearStats.total_km > 0">
      <p class="text-sm text-gray-400">Kilometeraufteilung</p>
      <div class="flex h-4 rounded-full overflow-hidden gap-0.5">
        <div class="bg-gray-500 transition-all" :style="{ width: pct(yearStats.private_km, yearStats.total_km) + '%' }"
          v-tooltip="'Privat: ' + fmt(yearStats.private_km) + ' km'"></div>
        <div class="bg-blue-600 transition-all" :style="{ width: pct(yearStats.business_km, yearStats.total_km) + '%' }"
          v-tooltip="'Dienst: ' + fmt(yearStats.business_km) + ' km'"></div>
        <div class="bg-green-600 transition-all" :style="{ width: pct(yearStats.commute_km, yearStats.total_km) + '%' }"
          v-tooltip="'Arbeitsweg: ' + fmt(yearStats.commute_km) + ' km'"></div>
      </div>
      <div class="flex gap-4 text-xs text-gray-400">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-gray-500 inline-block"></span> Privat</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-600 inline-block"></span> Dienstfahrt</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-600 inline-block"></span> Arbeitsweg</span>
      </div>
    </div>

    <!-- Monatsübersicht (nur wenn kein einzelner Monat gewählt) -->
    <div v-if="!selMonth && months.length" class="card space-y-3">
      <h2 class="font-semibold">Monatsübersicht {{ selYear }}</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700">
              <th class="text-left py-2">Monat</th>
              <th class="text-right py-2">Fahrten</th>
              <th class="text-right py-2">Gesamt km</th>
              <th class="text-right py-2">Privat km</th>
              <th class="text-right py-2">Dienst km</th>
              <th class="text-right py-2">Arbeitsweg km</th>
              <th class="text-right py-2">Privat %</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in months" :key="m.month"
              @click="selMonth = m.month.split('-')[1]; load()"
              class="border-b border-gray-800 hover:bg-gray-700 cursor-pointer transition">
              <td class="py-2 font-medium">{{ fmtMonth(m.month) }}</td>
              <td class="text-right text-gray-300">{{ m.trips }}</td>
              <td class="text-right font-semibold">{{ fmt(m.total_km) }}</td>
              <td class="text-right text-gray-300">{{ fmt(m.private_km) }}</td>
              <td class="text-right text-blue-300">{{ fmt(m.business_km) }}</td>
              <td class="text-right text-green-300">{{ fmt(m.commute_km) }}</td>
              <td class="text-right" :class="pctColor(m.private_km, m.total_km)">
                {{ pct(m.private_km, m.total_km) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Fahrten-Tabelle -->
    <div class="card space-y-3">
      <h2 class="font-semibold">
        Fahrten{{ selMonth ? ' – ' + monthName(+selMonth) + ' ' + selYear : ' ' + selYear }}
        <span class="text-gray-400 font-normal text-sm ml-2">({{ trips.length }})</span>
      </h2>

      <div v-if="!trips.length" class="text-gray-400 text-sm text-center py-8">
        Keine Fahrten für diesen Zeitraum.
      </div>

      <div class="overflow-x-auto" v-else>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700">
              <th class="text-left py-2">Datum</th>
              <th class="text-left py-2">Von → Nach</th>
              <th class="text-right py-2">km</th>
              <th class="text-left py-2 pl-4">Typ</th>
              <th class="text-left py-2">Zweck</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trip in trips" :key="trip.id" class="border-b border-gray-800 hover:bg-gray-700 transition">
              <td class="py-2 whitespace-nowrap text-gray-300">
                {{ fmtDate(trip.start_time) }}<br>
                <span class="text-xs text-gray-500">{{ fmtTime(trip.start_time) }}</span>
              </td>
              <td class="py-2 max-w-xs">
                <RouterLink :to="'/trips/' + trip.id" class="hover:text-tesla-red transition">
                  <span class="truncate block">{{ trip.start_address || coordStr(trip.start_lat, trip.start_lon) }}</span>
                  <span class="truncate block text-gray-400">{{ trip.end_address   || coordStr(trip.end_lat,   trip.end_lon)   }}</span>
                </RouterLink>
              </td>
              <td class="py-2 text-right font-semibold whitespace-nowrap">{{ fmt(trip.distance_km, 1) }}</td>
              <td class="py-2 pl-4">
                <button @click="cycleType(trip)"
                  :class="typeBadge(trip.trip_type)"
                  class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap transition">
                  {{ typeLabel(trip.trip_type) }}
                </button>
              </td>
              <td class="py-2">
                <input :value="trip.purpose"
                  @change="e => savePurpose(trip, e.target.value)"
                  type="text"
                  placeholder="Zweck…"
                  class="bg-transparent border-b border-gray-600 focus:border-tesla-red text-sm text-white placeholder-gray-600 focus:outline-none w-full min-w-32"
                />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-gray-600 font-semibold">
              <td colspan="2" class="py-2 text-gray-400">Summe</td>
              <td class="py-2 text-right">{{ fmt(trips.reduce((s,t) => s + (t.distance_km||0), 0), 1) }}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

const appStore  = useAppStore();
const trips     = ref([]);
const months    = ref([]);
const loading   = ref(false);
const selYear   = ref(String(new Date().getFullYear()));
const selMonth  = ref('');
const selType   = ref('');

const years = computed(() => {
  const cur = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(cur - i));
});

const yearStats = computed(() => {
  const all = months.value;
  if (!all.length) return { total_km: 0, private_km: 0, business_km: 0, commute_km: 0, trips: 0 };
  return {
    total_km:    all.reduce((s, m) => s + m.total_km,    0),
    private_km:  all.reduce((s, m) => s + m.private_km,  0),
    business_km: all.reduce((s, m) => s + m.business_km, 0),
    commute_km:  all.reduce((s, m) => s + m.commute_km,  0),
    trips:       all.reduce((s, m) => s + m.trips,        0),
  };
});

const TYPES = ['private', 'business', 'commute'];
const fmt      = (v, d = 0) => Number(+(v || 0)).toLocaleString('de-DE', { maximumFractionDigits: d });
const pct      = (part, total) => total > 0 ? Math.round(part / total * 100) : 0;
const pctColor = (part, total) => { const p = pct(part, total); return p > 70 ? 'text-gray-300' : p > 40 ? 'text-yellow-300' : 'text-blue-300'; };
const fmtDate  = ts => new Date(ts * 1000).toLocaleDateString('de-DE');
const fmtTime  = ts => new Date(ts * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const fmtMonth = ym => { const [y, m] = ym.split('-'); return monthName(+m) + ' ' + y; };
const monthName = m => ['', 'Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][+m];
const coordStr  = (lat, lon) => lat && lon ? `${(+lat).toFixed(4)}, ${(+lon).toFixed(4)}` : '–';
const typeLabel = t => ({ private: 'Privat', business: 'Dienstfahrt', commute: 'Arbeitsweg' }[t] ?? 'Privat');
const typeBadge = t => ({
  private:  'bg-gray-600 text-gray-200 hover:bg-gray-500',
  business: 'bg-blue-900 text-blue-200 hover:bg-blue-800',
  commute:  'bg-green-900 text-green-200 hover:bg-green-800',
}[t] ?? 'bg-gray-600 text-gray-200');

async function classify(trip, type, purpose) {
  trip.trip_type = type;
  if (purpose !== undefined) trip.purpose = purpose;
  await api.patch(`/trips/${trip.id}/classify`, { trip_type: type, purpose: trip.purpose ?? null });
}

async function cycleType(trip) {
  await classify(trip, TYPES[(TYPES.indexOf(trip.trip_type) + 1) % TYPES.length]);
}

async function savePurpose(trip, purpose) {
  await classify(trip, trip.trip_type, purpose);
}

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const base = vid ? { vehicle_id: vid } : {};

  const [tripsRes, monthsRes] = await Promise.all([
    api.get('/trips/logbook', { params: { ...base, year: selYear.value, month: selMonth.value || undefined, trip_type: selType.value || undefined } }),
    api.get('/trips/logbook/months', { params: { ...base } }),
  ]);

  trips.value  = tripsRes.data;
  months.value = monthsRes.data.filter(m => m.month.startsWith(selYear.value));
  loading.value = false;
}

function exportCsv() {
  const rows = [
    ['Datum', 'Uhrzeit', 'Von', 'Nach', 'km', 'Typ', 'Zweck'],
    ...trips.value.map(t => [
      fmtDate(t.start_time),
      fmtTime(t.start_time),
      t.start_address || coordStr(t.start_lat, t.start_lon),
      t.end_address   || coordStr(t.end_lat,   t.end_lon),
      (+(t.distance_km || 0)).toFixed(1).replace('.', ','),
      typeLabel(t.trip_type),
      t.purpose || '',
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `fahrtenbuch-${selYear.value}${selMonth.value ? '-' + selMonth.value : ''}.csv` });
  a.click();
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Kostenabrechnung Heimladen</h1>
        <p v-if="vehicle?.company_name" class="text-gray-400 text-sm mt-0.5">
          Dienstwagen · {{ vehicle.company_name }}
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <select v-model="selYear"  @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model="selMonth" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option value="">Alle Monate</option>
          <option v-for="m in 12" :key="m" :value="String(m).padStart(2,'0')">{{ monthName(m) }}</option>
        </select>
        <button @click="montaSync" :disabled="syncing || !vehicle?.monta_api_key"
          class="btn-secondary text-sm flex items-center gap-2"
          v-tooltip="vehicle?.monta_api_key ? 'MID-Zählerstand von Monta synchronisieren' : 'Monta API-Key in Einstellungen hinterlegen'">
          <span :class="{'animate-spin inline-block': syncing}">⟳</span> Monta Sync
        </button>
        <button @click="exportCsv" class="btn-secondary text-sm">CSV Export</button>
      </div>
    </div>

    <!-- Kein Dienstwagen -->
    <div v-if="vehicle && vehicle.category !== 'company'" class="card text-center py-12 space-y-3">
      <p class="text-4xl">💼</p>
      <p class="text-gray-300 font-medium">Dieses Fahrzeug ist als Privatfahrzeug konfiguriert</p>
      <p class="text-sm text-gray-500">Unter Einstellungen → Fahrzeugkategorie auf "Dienstwagen" ändern.</p>
      <RouterLink to="/settings" class="btn-primary inline-block text-sm">Zu den Einstellungen</RouterLink>
    </div>

    <template v-else-if="vehicle">
      <!-- Toast -->
      <transition name="fade">
        <div v-if="toast" class="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
          :class="toast.ok ? 'bg-green-800 text-green-100' : 'bg-red-900 text-red-200'">
          {{ toast.msg }}
        </div>
      </transition>

      <!-- Jahresübersicht -->
      <div class="grid grid-cols-3 gap-4">
        <div class="card text-center space-y-1">
          <p class="text-xs text-gray-400 uppercase tracking-wide">Geladene kWh</p>
          <p class="text-3xl font-bold text-white">{{ fmtN(yearTotal.kwh, 1) }}</p>
          <p class="text-xs text-gray-500">{{ yearTotal.sessions }} Sessions</p>
        </div>
        <div class="card text-center space-y-1">
          <p class="text-xs text-gray-400 uppercase tracking-wide">Ø Strompreis</p>
          <p class="text-3xl font-bold text-white">{{ fmtN(vehicle.electricity_rate_kwh ?? 0.30, 2) }}</p>
          <p class="text-xs text-gray-500">€/kWh</p>
        </div>
        <div class="card text-center space-y-1 bg-green-900/20 border border-green-800">
          <p class="text-xs text-gray-400 uppercase tracking-wide">Erstattungsbetrag</p>
          <p class="text-3xl font-bold text-green-300">{{ fmtN(yearTotal.amount, 2) }} €</p>
          <p class="text-xs text-gray-500">inkl. MwSt.</p>
        </div>
      </div>

      <!-- Monatsübersicht -->
      <div class="card space-y-3" v-if="months.length">
        <h2 class="font-semibold">Monatsübersicht {{ selYear }}</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-gray-400 border-b border-gray-700">
                <th class="text-left py-2">Monat</th>
                <th class="text-right py-2">Sessions</th>
                <th class="text-right py-2">kWh (Tesla)</th>
                <th class="text-right py-2">kWh (MID)</th>
                <th class="text-right py-2">Tarif €/kWh</th>
                <th class="text-right py-2 text-green-300">Betrag €</th>
                <th class="text-center py-2">Abgerechnet</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in months" :key="m.month"
                class="border-b border-gray-800 hover:bg-gray-700 transition cursor-pointer"
                @click="selMonth = m.month.split('-')[1]; load()">
                <td class="py-2 font-medium">{{ fmtMonth(m.month) }}</td>
                <td class="text-right text-gray-300">{{ m.sessions }}</td>
                <td class="text-right text-gray-300">{{ fmtN(m.total_kwh_tesla, 1) }}</td>
                <td class="text-right" :class="m.total_kwh_mid > 0 ? 'text-white font-medium' : 'text-gray-500'">
                  {{ m.total_kwh_mid > 0 ? fmtN(m.total_kwh_mid, 1) : '–' }}
                </td>
                <td class="text-right text-gray-300">{{ fmtN(m.avg_rate, 2) }}</td>
                <td class="text-right font-bold text-green-300">{{ fmtN(m.total_amount, 2) }}</td>
                <td class="text-center">
                  <span class="text-xs px-2 py-0.5 rounded-full"
                    :class="m.submitted ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'">
                    {{ m.submitted ? 'Ja' : 'Ausstehend' }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t border-gray-600 font-bold">
                <td colspan="2" class="py-2 text-gray-400">Summe {{ selYear }}</td>
                <td class="text-right">{{ fmtN(months.reduce((s,m)=>s+m.total_kwh_tesla,0),1) }}</td>
                <td class="text-right">{{ fmtN(months.reduce((s,m)=>s+m.total_kwh_mid,0),1) }}</td>
                <td></td>
                <td class="text-right text-green-300">{{ fmtN(months.reduce((s,m)=>s+m.total_amount,0),2) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Sessions-Detail -->
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">
            Ladesessions{{ selMonth ? ' – ' + monthName(+selMonth) : '' }}
            <span class="text-gray-400 font-normal text-sm ml-2">({{ sessions.length }})</span>
          </h2>
          <div v-if="selMonth" class="flex gap-2">
            <button @click="markMonthBilled" class="btn-primary text-xs"
              v-tooltip="'Alle Sessions dieses Monats als abgerechnet markieren'">
              ✓ Monat abrechnen
            </button>
          </div>
        </div>

        <div v-if="!sessions.length" class="text-center text-gray-400 py-8 text-sm">
          Keine Heimlade-Sessions gefunden.
          <span v-if="!vehicle.monta_api_key"> Monta API-Key in Einstellungen hinterlegen für MID-Daten.</span>
        </div>

        <div class="overflow-x-auto" v-else>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-gray-400 border-b border-gray-700">
                <th class="text-left py-2">Datum</th>
                <th class="text-left py-2">Ort</th>
                <th class="text-right py-2">kWh Tesla</th>
                <th class="text-right py-2">kWh MID</th>
                <th class="text-right py-2">€/kWh</th>
                <th class="text-right py-2 text-green-300">Betrag €</th>
                <th class="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sessions" :key="s.id" class="border-b border-gray-800">
                <td class="py-2 whitespace-nowrap">
                  {{ fmtDate(s.start_time) }}<br>
                  <span class="text-xs text-gray-500">{{ fmtTime(s.start_time) }}</span>
                </td>
                <td class="py-2 text-gray-300 max-w-32 truncate">{{ s.location_name_resolved || s.location_name || 'Heimladen' }}</td>
                <td class="text-right text-gray-400">{{ fmtN(s.energy_added_kwh, 2) }}</td>
                <td class="text-right">
                  <input :value="s.energy_kwh_mid"
                    @change="e => updateSession(s, { energy_kwh_mid: +e.target.value || null })"
                    type="number" step="0.01" min="0"
                    class="w-20 bg-gray-700 rounded px-2 py-0.5 text-right text-white text-xs focus:outline-none focus:ring-1 focus:ring-tesla-red"
                    :placeholder="fmtN(s.energy_added_kwh, 2)" />
                </td>
                <td class="text-right">
                  <input :value="s.billing_rate_kwh ?? vehicle.electricity_rate_kwh ?? 0.30"
                    @change="e => updateSession(s, { billing_rate_kwh: +e.target.value })"
                    type="number" step="0.001" min="0"
                    class="w-16 bg-gray-700 rounded px-2 py-0.5 text-right text-white text-xs focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                </td>
                <td class="text-right font-bold text-green-300">
                  {{ fmtN(calcAmount(s), 2) }}
                </td>
                <td class="text-center">
                  <button @click="toggleStatus(s)"
                    class="text-xs px-2 py-0.5 rounded-full transition"
                    :class="s.billing_status === 'billed' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'">
                    {{ s.billing_status === 'billed' ? 'Abgerechnet' : 'Ausstehend' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Abrechnungsvorlage -->
      <div class="card space-y-3" v-if="selMonth && sessions.length">
        <h2 class="font-semibold">Abrechnungsvorlage</h2>
        <div class="bg-gray-800 rounded-xl p-4 font-mono text-sm space-y-1 text-gray-200">
          <p class="font-bold text-white">Erstattungsantrag Ladekosten Dienstwagen</p>
          <p class="text-gray-400">{{ monthName(+selMonth) }} {{ selYear }}</p>
          <br>
          <p>Fahrzeug: {{ vehicle.display_name }} ({{ vehicle.license_plate || vehicle.vin }})</p>
          <p v-if="vehicle.company_name">Arbeitgeber: {{ vehicle.company_name }}</p>
          <br>
          <p>Geladene Energie (MID-Zähler): {{ fmtN(sessions.reduce((s,x)=>s+(x.energy_kwh_mid||x.energy_added_kwh||0),0),2) }} kWh</p>
          <p>Angewandter Strompreis: {{ fmtN(vehicle.electricity_rate_kwh??0.30,3) }} €/kWh</p>
          <p class="border-t border-gray-600 pt-1 mt-1 font-bold text-green-300">Erstattungsbetrag: {{ fmtN(sessions.reduce((s,x)=>s+calcAmount(x),0),2) }} €</p>
          <br>
          <p class="text-xs text-gray-500">Gemäß BDEW-Empfehlung / Arbeitgebererstattung nach §3 Nr. 46 EStG steuerbefreit bis 0,30 €/kWh</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

const appStore = useAppStore();
const vehicle  = ref(null);
const sessions = ref([]);
const months   = ref([]);
const syncing  = ref(false);
const toast    = ref(null);
const selYear  = ref(String(new Date().getFullYear()));
const selMonth = ref(String(new Date().getMonth() + 1).padStart(2, '0'));

const years = computed(() => Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)));

const yearTotal = computed(() => ({
  kwh:      months.value.reduce((s, m) => s + m.total_kwh_tesla, 0),
  amount:   months.value.reduce((s, m) => s + m.total_amount, 0),
  sessions: months.value.reduce((s, m) => s + m.sessions, 0),
}));

const fmtN    = (v, d = 0) => Number(+(v || 0)).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = ts => new Date(ts * 1000).toLocaleDateString('de-DE');
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const fmtMonth = ym => { const [y, m] = ym.split('-'); return monthName(+m) + ' ' + y; };
const monthName = m => ['','Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][+m];

const calcAmount = s => {
  const kwh  = s.energy_kwh_mid ?? s.energy_added_kwh ?? 0;
  const rate = s.billing_rate_kwh ?? vehicle.value?.electricity_rate_kwh ?? 0.30;
  return kwh * rate;
};

function showToast(msg, ok = true) {
  toast.value = { msg, ok };
  setTimeout(() => { toast.value = null; }, 3000);
}

async function load() {
  const v = appStore.selectedVehicle;
  if (!v) return;

  const [vRes, sRes, mRes] = await Promise.all([
    api.get(`/vehicles/${v.id}`).catch(() => ({ data: v })),
    api.get(`/billing/${v.id}/sessions`, { params: buildParams() }),
    api.get(`/billing/${v.id}/summary`),
  ]);

  vehicle.value  = vRes.data ?? v;
  sessions.value = sRes.data?.sessions ?? [];

  // Monatsstatistik aus Sessions berechnen
  const raw = mRes.data?.months ?? [];
  months.value = raw.filter(m => m.month.startsWith(selYear.value)).map(m => ({
    ...m,
    total_kwh_tesla: m.total_kwh,
    total_kwh_mid:   0,
    submitted: false,
  }));
}

function buildParams() {
  const from = selMonth.value
    ? Math.floor(new Date(`${selYear.value}-${selMonth.value}-01`).getTime() / 1000)
    : Math.floor(new Date(`${selYear.value}-01-01`).getTime() / 1000);
  const to = selMonth.value
    ? Math.floor(new Date(`${selYear.value}-${selMonth.value}-01`).setMonth(+selMonth.value) / 1000)
    : Math.floor(new Date(`${+selYear.value + 1}-01-01`).getTime() / 1000);
  return { from, to };
}

async function updateSession(s, patch) {
  Object.assign(s, patch);
  await api.patch(`/billing/sessions/${s.id}`, patch);
}

async function toggleStatus(s) {
  const next = s.billing_status === 'billed' ? 'pending' : 'billed';
  await updateSession(s, { billing_status: next });
}

async function markMonthBilled() {
  await Promise.all(sessions.value.map(s => updateSession(s, { billing_status: 'billed' })));
  showToast(`${sessions.value.length} Sessions als abgerechnet markiert`);
}

async function montaSync() {
  const v = appStore.selectedVehicle;
  if (!v || !vehicle.value?.monta_api_key) return;
  syncing.value = true;
  try {
    const { data } = await api.post(`/billing/${v.id}/monta-sync`, buildParams());
    showToast(data.message || `${data.matched} Sessions synchronisiert`);
    await load();
  } catch (e) {
    showToast(e.response?.data?.error || 'Monta Sync fehlgeschlagen', false);
  } finally { syncing.value = false; }
}

function exportCsv() {
  const rows = [
    ['Datum', 'Uhrzeit', 'Ort', 'kWh Tesla', 'kWh MID', 'Tarif €/kWh', 'Betrag €', 'Status'],
    ...sessions.value.map(s => [
      fmtDate(s.start_time),
      fmtTime(s.start_time),
      s.location_name_resolved || s.location_name || 'Heimladen',
      fmtN(s.energy_added_kwh, 3).replace('.', ','),
      fmtN(s.energy_kwh_mid, 3).replace('.', ','),
      fmtN(s.billing_rate_kwh ?? vehicle.value?.electricity_rate_kwh ?? 0.30, 3).replace('.', ','),
      fmtN(calcAmount(s), 2).replace('.', ','),
      s.billing_status === 'billed' ? 'Abgerechnet' : 'Ausstehend',
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `heimladen-${selYear.value}${selMonth.value ? '-' + selMonth.value : ''}.csv`,
  });
  a.click();
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

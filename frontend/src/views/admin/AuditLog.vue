<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold">📋 Audit-Log</h1>
      <button @click="exportCsv" class="btn-secondary text-sm"
        v-tooltip="'Aktuell gefiltertes Set als CSV herunterladen — geeignet fuer DSGVO-Auskunftsanfragen oder Forensik.'">
        CSV-Export
      </button>
    </div>

    <p class="text-sm text-gray-400">
      Sicherheitsrelevante Ereignisse — Logins, Berechtigungs-Änderungen, Tesla-Befehle,
      Datenschutz-Akzeptanzen. Werte werden DSGVO-konform pro Mandant getrennt gespeichert.
    </p>

    <!-- Filter -->
    <div class="card grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
      <div>
        <label class="text-xs text-gray-400 block mb-0.5">Aktion</label>
        <select v-model="filter.action" @change="reload"
          class="w-full bg-gray-700 rounded px-2 py-1.5 text-white"
          v-tooltip="'Auf eine konkrete Ereignis-Art filtern. Liste enthaelt nur tatsaechlich vorgekommene Aktionen mit ihrer Anzahl.'">
          <option value="">Alle Aktionen</option>
          <option v-for="a in actions" :key="a.action" :value="a.action">
            {{ a.action }} ({{ a.count }})
          </option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-400 block mb-0.5">User-ID</label>
        <input v-model.number="filter.user_id" @change="reload" type="number" min="0"
          class="w-full bg-gray-700 rounded px-2 py-1.5 text-white"
          placeholder="z.B. 1"
          v-tooltip="'Numerische User-ID — Username im Ergebnis sichtbar. Leer fuer alle User.'" />
      </div>
      <div>
        <label class="text-xs text-gray-400 block mb-0.5">Von</label>
        <input v-model="filter.from_date" @change="reload" type="date"
          class="w-full bg-gray-700 rounded px-2 py-1.5 text-white"
          v-tooltip="'Untere Zeitgrenze (inklusive). Leer = unbeschraenkt.'" />
      </div>
      <div>
        <label class="text-xs text-gray-400 block mb-0.5">Bis</label>
        <input v-model="filter.to_date" @change="reload" type="date"
          class="w-full bg-gray-700 rounded px-2 py-1.5 text-white"
          v-tooltip="'Obere Zeitgrenze (inklusive). Bis Tagesende interpretiert.'" />
      </div>
    </div>

    <!-- Tabelle -->
    <div class="card">
      <div v-if="loading" class="text-gray-400 text-sm">Lade…</div>
      <div v-else-if="!rows.length" class="text-gray-400 text-sm py-6 text-center">
        Keine Ereignisse für die gewählten Filter.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700 text-left">
              <th class="py-2 pr-2">Zeitpunkt</th>
              <th class="py-2 pr-2">Aktion</th>
              <th class="py-2 pr-2">User</th>
              <th class="py-2 pr-2">IP</th>
              <th class="py-2 pr-2">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id"
              class="border-b border-gray-800 hover:bg-gray-700/40 align-top">
              <td class="py-2 pr-2 whitespace-nowrap text-gray-300 font-mono text-xs">
                {{ fmt(r.created_at) }}
              </td>
              <td class="py-2 pr-2">
                <span class="text-xs px-2 py-0.5 rounded-full"
                  :class="actionClass(r.action)">
                  {{ r.action }}
                </span>
              </td>
              <td class="py-2 pr-2 text-gray-300 whitespace-nowrap">
                <span v-if="r.username">{{ r.username }}</span>
                <span v-else class="text-gray-500 italic">user #{{ r.user_id || '?' }}</span>
              </td>
              <td class="py-2 pr-2 text-gray-400 font-mono text-xs whitespace-nowrap">{{ r.ip_address || '–' }}</td>
              <td class="py-2 pr-2 text-gray-400 max-w-md">
                <details v-if="r.details">
                  <summary class="cursor-pointer hover:text-white">Details</summary>
                  <pre class="text-xs mt-1 whitespace-pre-wrap break-all bg-gray-900 rounded p-2">{{ prettyDetails(r.details) }}</pre>
                </details>
                <span v-else class="text-gray-600">–</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="flex items-center justify-between mt-4 text-sm">
        <span class="text-gray-400">
          {{ offset + 1 }}–{{ Math.min(offset + limit, total) }} von {{ total }}
        </span>
        <div class="flex gap-2">
          <button @click="prev" :disabled="offset === 0"
            class="btn-secondary text-xs disabled:opacity-40">← Zurück</button>
          <button @click="next" :disabled="offset + limit >= total"
            class="btn-secondary text-xs disabled:opacity-40">Weiter →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api.js';

const rows    = ref([]);
const total   = ref(0);
const actions = ref([]);
const loading = ref(true);
const limit   = 100;
const offset  = ref(0);

const filter = ref({
  action: '', user_id: null,
  from_date: '', to_date: '',
});

const fmt = ts => new Date(ts * 1000).toLocaleString('de-DE',
  { day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit' });

function prettyDetails(s) {
  // Versuche JSON; wenn nicht parsebar, raw zeigen.
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

// Farb-Mapping fuer haeufige Aktionen — laesst die Tabelle schnell scannen.
function actionClass(a) {
  if (a.startsWith('login_failed') || a.includes('blocked') || a.includes('failed')) {
    return 'bg-red-900/60 text-red-300';
  }
  if (a.startsWith('login') || a.includes('mfa')) return 'bg-blue-900/60 text-blue-300';
  if (a.includes('user_') || a.includes('vehicle_')) return 'bg-purple-900/60 text-purple-300';
  if (a.includes('logout')) return 'bg-gray-700 text-gray-300';
  return 'bg-gray-700/60 text-gray-300';
}

function buildParams() {
  const p = { limit, offset: offset.value };
  if (filter.value.action) p.action = filter.value.action;
  if (filter.value.user_id) p.user_id = filter.value.user_id;
  // Date → unix (lokale Mitternacht resp. Tagesende)
  if (filter.value.from_date) p.from = Math.floor(new Date(filter.value.from_date + 'T00:00:00').getTime() / 1000);
  if (filter.value.to_date)   p.to   = Math.floor(new Date(filter.value.to_date   + 'T23:59:59').getTime() / 1000);
  return p;
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/audit', { params: buildParams() });
    rows.value  = data.rows;
    total.value = data.total;
  } finally { loading.value = false; }
}

async function loadActions() {
  try {
    const { data } = await api.get('/audit/actions');
    actions.value = data;
  } catch { actions.value = []; }
}

function reload() { offset.value = 0; load(); }
function next()   { offset.value += limit; load(); window.scrollTo({ top: 0 }); }
function prev()   { offset.value = Math.max(0, offset.value - limit); load(); window.scrollTo({ top: 0 }); }

async function exportCsv() {
  // Erzeugt einen Download via temporaerem Anker; das CSV-Endpoint
  // liefert das passende Content-Disposition mit Datumssuffix.
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(buildParams())) {
    if (k === 'limit' || k === 'offset') continue;
    if (v != null && v !== '') params.set(k, v);
  }
  // Auth-Token aus der Axios-Instanz uebernehmen — Cookie reicht nicht.
  const token = api.defaults.headers.common.Authorization;
  const r = await fetch(`/api/audit/export.csv?${params}`, {
    headers: token ? { Authorization: token } : {},
    credentials: 'include',
  });
  if (!r.ok) { alert('CSV-Export fehlgeschlagen'); return; }
  const blob = await r.blob();
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'),
    { href: url, download: `audit-${new Date().toISOString().slice(0,10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(async () => { await Promise.all([load(), loadActions()]); });
</script>

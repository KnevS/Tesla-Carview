<template>
  <!-- Wartungsintervalle pro Fahrzeug. Wird im Betriebsbuch eingebunden,
       weil Intervalle thematisch zu den Betriebs-/Wartungs-Eintraegen
       gehoeren. Bezugs-Fahrzeug kommt aus dem App-Store (selectedVehicle). -->
  <div id="service-intervals" class="card space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="font-semibold" v-tooltip="'Definiere wiederkehrende Wartungsarbeiten (TÜV, Bremsflüssigkeit, Reifen, …) mit Zeit- oder km-Intervall. Eine fällige Wartung erscheint im Dashboard und löst eine Push-Benachrichtigung aus.'">
        🔧 Wartungsintervalle
      </h2>
      <div class="flex gap-2">
        <button @click="seedDefaults" :disabled="!canEdit || !vehicle"
          class="btn-secondary text-sm"
          v-tooltip="'Tesla-typische Standard-Intervalle anlegen (TÜV alle 24M, Reifen halbjaehrlich, Bremsfluessigkeit alle 4 Jahre, etc.). Bestehende Eintraege bleiben unangetastet.'">
          Standards anlegen
        </button>
        <button @click="add" :disabled="!canEdit || !vehicle"
          class="btn-primary text-sm">+ Eigenes Intervall</button>
      </div>
    </div>
    <p v-if="!canEdit" class="text-xs text-yellow-300/80">
      🔒 Nur lesbar — du brauchst „Fahrzeuge bearbeiten" um Intervalle anzulegen oder zu aendern.
    </p>
    <!-- Disclaimer: alle Werte sind Naeherungen, keine rechtsverbindliche
         Auskunft. Insbesondere die Erstabnahme der HU/TÜV ist in der EU
         erst nach 3 Jahren faellig. -->
    <p class="text-xs text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2 leading-relaxed">
      ℹ️ <strong>Hinweis:</strong> Alle Intervalle sind <strong>Näherungen und Schätzwerte</strong>
      nach typischer EU-Praxis — <strong>keine verbindliche Auskunft</strong>. Verbindlich sind die
      Angaben deiner Tesla-Bedienungsanleitung, deiner Werkstatt und beim TÜV der jeweilige
      Prüfbescheid.
      <br>
      <strong>HU/TÜV (Deutschland/EU):</strong> Neuwagen haben die <strong>erste HU nach 36 Monaten</strong>,
      danach alle <strong>24 Monate</strong>. Beim Neuwagen das Intervall einmalig auf 36 stellen und
      „Zuletzt erledigt am" auf das Erstzulassungsdatum setzen — nach der ersten HU dann auf 24 zurücksetzen.
    </p>
    <p v-if="!intervals.length" class="text-sm text-gray-400">
      Noch keine Intervalle definiert. „Standards anlegen" füllt typische Tesla-Wartungsarbeiten vor.
    </p>
    <div v-else class="space-y-2">
      <div v-for="s in intervals" :key="s.id"
           class="bg-gray-800 rounded-lg p-3 text-sm space-y-2">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold">{{ s.label }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="statusClass(s.status)">
                {{ statusLabel(s.status) }}
              </span>
              <span v-if="!s.is_active" class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">deaktiviert</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">
              <span v-if="s.interval_months">alle {{ s.interval_months }} Monate</span>
              <span v-if="s.interval_months && s.interval_km"> oder </span>
              <span v-if="s.interval_km">alle {{ s.interval_km.toLocaleString('de-DE') }} km</span>
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              <span v-if="s.last_done_at">zuletzt: {{ fmtDay(s.last_done_at) }}</span>
              <span v-if="s.last_done_at && s.last_done_km != null">, </span>
              <span v-if="s.last_done_km != null">{{ s.last_done_km.toLocaleString('de-DE') }} km</span>
              <span v-if="!s.last_done_at && s.last_done_km == null" class="italic">noch nie als erledigt markiert</span>
            </p>
            <p v-if="s.days_until_due != null || s.km_until_due != null" class="text-xs mt-0.5"
               :class="s.status === 'overdue' ? 'text-red-300' : (s.status === 'soon' ? 'text-yellow-300' : 'text-gray-400')">
              <span v-if="s.days_until_due != null">
                {{ s.days_until_due < 0 ? `${-s.days_until_due} Tage überfällig` : `in ${s.days_until_due} Tagen fällig` }}
              </span>
              <span v-if="s.km_until_due != null" class="ml-2">
                · {{ s.km_until_due < 0 ? `${-s.km_until_due} km überfällig` : `noch ${s.km_until_due} km` }}
              </span>
            </p>
          </div>
          <div class="flex gap-1 flex-wrap items-center">
            <button @click="markDone(s)" :disabled="!canEdit"
              class="text-xs btn-secondary py-1 px-2"
              v-tooltip="'Heute als „erledigt“ stempeln — setzt das Datum auf heute und (falls bekannt) den aktuellen Kilometerstand. Push-Erinnerung wird neu armiert.'">
              ✓ Erledigt
            </button>
            <button v-if="s.status !== 'snoozed'" @click="snooze(s)" :disabled="!canEdit"
              class="text-xs btn-secondary py-1 px-2"
              v-tooltip="'Erinnerung für 30 Tage stillschalten. Status wird nicht zurueckgesetzt.'">
              💤 Aufschieben
            </button>
            <button @click="edit(s)" :disabled="!canEdit"
              class="text-xs btn-secondary py-1 px-2">✎</button>
            <button @click="del(s)" :disabled="!canEdit"
              class="text-xs py-1 px-2 rounded bg-gray-700 hover:bg-red-900 text-gray-300"
              v-tooltip="'Intervall endgueltig entfernen.'">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit / Add Modal — Teleport: kein clipping durch .card-Backdrop. -->
    <Teleport to="body">
    <div v-if="form.show"
         class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
      <div class="card w-full max-w-md space-y-3">
        <h3 class="text-lg font-bold">{{ form.id ? 'Intervall bearbeiten' : 'Neues Intervall' }}</h3>
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">Bezeichnung *</label>
          <input v-model="form.label" type="text" maxlength="120"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm"
            placeholder="z.B. Wischwasser nachfüllen" />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">Kürzel (intern) *</label>
          <input v-model="form.kind" type="text" maxlength="64"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm font-mono"
            placeholder="z.B. wiper_water" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Intervall (Monate)</label>
            <input v-model.number="form.interval_months" type="number" min="0" max="120"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Intervall (km)</label>
            <input v-model.number="form.interval_km" type="number" min="0"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Zuletzt erledigt am</label>
            <input v-model="form.last_done_date" type="date"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Zuletzt bei km</label>
            <input v-model.number="form.last_done_km" type="number" min="0"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" v-model="form.is_active" class="accent-tesla-red" />
          Aktiv (faellige Hinweise + Push)
        </label>
        <div class="flex gap-2 pt-1">
          <button @click="save" class="btn-primary flex-1 text-sm">Speichern</button>
          <button @click="form.show = false" class="btn-secondary flex-1 text-sm">Abbrechen</button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';

const appStore = useAppStore();
const auth     = useAuthStore();

const vehicle  = computed(() => appStore.selectedVehicle);
const canEdit  = computed(() => auth.canEditVehicles);

const intervals = ref([]);
const form = ref({
  show: false, id: null, kind: '', label: '',
  interval_months: null, interval_km: null,
  last_done_date: '', last_done_km: null, is_active: true,
});

const STATUS_LABEL = {
  overdue: 'überfällig', soon: 'bald fällig', ok: 'ok',
  pending: 'noch nie', snoozed: 'aufgeschoben',
};
const STATUS_CLASS = {
  overdue: 'bg-red-900 text-red-300',
  soon:    'bg-yellow-900 text-yellow-300',
  ok:      'bg-green-900 text-green-300',
  pending: 'bg-gray-700 text-gray-300',
  snoozed: 'bg-blue-900 text-blue-300',
};
const statusLabel = s => STATUS_LABEL[s] || s;
const statusClass = s => STATUS_CLASS[s] || 'bg-gray-700 text-gray-300';
const fmtDay = ts => ts ? new Date(ts * 1000).toLocaleDateString('de-DE') : '';

async function load() {
  const vid = vehicle.value?.id;
  if (!vid) { intervals.value = []; return; }
  try {
    const { data } = await api.get('/service-intervals', { params: { vehicle_id: vid } });
    intervals.value = data;
  } catch { intervals.value = []; }
}

async function seedDefaults() {
  const vid = vehicle.value?.id;
  if (!vid) { alert('Kein Fahrzeug ausgewählt — bitte oben rechts ein Fahrzeug wählen.'); return; }
  try {
    const { data } = await api.post('/service-intervals/seed-defaults', { vehicle_id: vid });
    await load();
    if (data?.added === 0) {
      alert('Alle Standard-Intervalle sind für dieses Fahrzeug bereits angelegt — nichts hinzugefügt.');
    }
  } catch (err) {
    alert('Standards anlegen fehlgeschlagen: ' + (err.response?.data?.error || err.message));
  }
}

function add() {
  form.value = {
    show: true, id: null, kind: '', label: '',
    interval_months: 12, interval_km: null,
    last_done_date: '', last_done_km: null, is_active: true,
  };
}

function edit(s) {
  form.value = {
    show: true, id: s.id, kind: s.kind, label: s.label,
    interval_months: s.interval_months, interval_km: s.interval_km,
    last_done_date: s.last_done_at ? new Date(s.last_done_at * 1000).toISOString().slice(0, 10) : '',
    last_done_km: s.last_done_km,
    is_active: !!s.is_active,
  };
}

async function save() {
  const f = form.value;
  if (!f.label.trim() || !f.kind.trim()) {
    alert('Bezeichnung und Kürzel sind Pflicht');
    return;
  }
  const last_done_at = f.last_done_date
    ? Math.floor(new Date(f.last_done_date + 'T12:00:00').getTime() / 1000)
    : null;
  const payload = {
    label: f.label.trim(),
    kind:  f.kind.trim(),
    interval_months: f.interval_months || null,
    interval_km:     f.interval_km     || null,
    last_done_at,
    last_done_km:    f.last_done_km    ?? null,
    is_active:       !!f.is_active,
  };
  try {
    if (f.id) {
      await api.put(`/service-intervals/${f.id}`, payload);
    } else {
      payload.vehicle_id = vehicle.value.id;
      await api.post('/service-intervals', payload);
    }
    form.value.show = false;
    await load();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
}

async function markDone(s) {
  await api.put(`/service-intervals/${s.id}`, {
    last_done_at: Math.floor(Date.now() / 1000),
    last_done_km: vehicle.value?.odometer_km ?? null,
  });
  await load();
}

async function snooze(s) {
  await api.post(`/service-intervals/${s.id}/snooze`, { days: 30 });
  await load();
}

async function del(s) {
  if (!confirm(`Intervall „${s.label}" wirklich löschen?`)) return;
  await api.delete(`/service-intervals/${s.id}`);
  await load();
}

onMounted(load);
watch(() => vehicle.value?.id, load);
</script>

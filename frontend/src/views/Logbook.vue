<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Betriebsbuch</h1>
      <button @click="showForm = true" class="btn-primary"
        v-tooltip="'Neuen Eintrag im Betriebsbuch anlegen – z.B. Wartung, Reparatur oder Notiz'">
        + Eintrag
      </button>
    </div>

    <div class="flex gap-2 flex-wrap">
      <button v-for="cat in allCategories" :key="cat.value"
        @click="filterCat = cat.value; load()"
        v-tooltip="cat.tooltip"
        class="px-3 py-1 rounded-lg text-sm transition"
        :class="filterCat === cat.value ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'"
      >{{ cat.icon }} {{ cat.label }}</button>
    </div>

    <div class="space-y-3">
      <div v-if="loading" class="text-gray-400">Lade Einträge...</div>
      <div v-else-if="entries.length === 0" class="card text-gray-400 text-center py-10">
        Noch keine Einträge. Erstelle deinen ersten Betriebsbuch-Eintrag!
      </div>
      <div v-for="e in entries" :key="e.id" class="card">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span v-tooltip="catTooltip(e.category)">{{ catIcon(e.category) }}</span>
              <span class="font-semibold">{{ e.title }}</span>
              <span class="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300"
                v-tooltip="catTooltip(e.category)">{{ catLabel(e.category) }}</span>
            </div>
            <p v-if="e.description" class="text-gray-400 text-sm mt-1">{{ e.description }}</p>
            <div class="flex gap-4 mt-2 text-sm text-gray-400">
              <span v-tooltip="'Datum des Eintrags'">{{ fmtDate(e.entry_date) }}</span>
              <span v-if="e.mileage_km" v-tooltip="'Kilometerstand zum Zeitpunkt des Eintrags'">{{ fmt(e.mileage_km, 0) }} km</span>
              <span v-if="e.cost" v-tooltip="'Anfallende Kosten für diesen Eintrag'" class="text-yellow-400">{{ fmt(e.cost, 2) }} {{ e.currency }}</span>
            </div>
          </div>
          <button @click="deleteEntry(e.id)" class="text-gray-600 hover:text-red-400 transition ml-3"
            v-tooltip="'Eintrag unwiderruflich löschen'">✕</button>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md space-y-4">
        <h2 class="text-xl font-bold">Neuer Eintrag</h2>
        <div>
          <label class="block text-sm text-gray-400 mb-1"
            v-tooltip="'Kurze, aussagekräftige Bezeichnung des Ereignisses (z.B. „Reifenwechsel Sommer 2026“)'">Titel *</label>
          <input v-model="form.title" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1"
            v-tooltip="'Art des Eintrags – erleichtert das spätere Filtern'">Kategorie</label>
          <select v-model="form.category" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white">
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.icon }} {{ cat.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1"
            v-tooltip="'Optional: detailliertere Notizen, durchgeführte Arbeiten, Werkstatt etc.'">Beschreibung</label>
          <textarea v-model="form.description" rows="3" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1"
              v-tooltip="'Aktueller Tachostand des Fahrzeugs zum Zeitpunkt des Eintrags'">Kilometerstand</label>
            <input v-model.number="form.mileage_km" type="number" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1"
              v-tooltip="'Optional: Kosten für diese Wartung/Reparatur – hilft bei der Gesamtkostenrechnung'">Kosten (€)</label>
            <input v-model.number="form.cost" type="number" step="0.01" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button @click="submitForm" class="btn-primary flex-1">Speichern</button>
          <button @click="showForm = false" class="btn-secondary flex-1">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

const appStore = useAppStore();
const entries = ref([]);
const loading = ref(true);
const showForm = ref(false);
const filterCat = ref('');

const categories = [
  { value: 'note',        label: 'Notiz',      icon: '📝', tooltip: 'Allgemeine Notiz oder Beobachtung zum Fahrzeug' },
  { value: 'maintenance', label: 'Wartung',    icon: '🔧', tooltip: 'Geplante Wartungsarbeiten (Bremsflüssigkeit, Klimafilter, Wischerblätter etc.)' },
  { value: 'repair',      label: 'Reparatur',  icon: '🛠️', tooltip: 'Reparaturen nach Defekten oder Schäden' },
  { value: 'tire',        label: 'Reifen',     icon: '🚗', tooltip: 'Reifenwechsel, Reifenkauf, Druckmessungen, Reifenreparatur' },
  { value: 'inspection',  label: 'Inspektion', icon: '🔍', tooltip: 'Hauptuntersuchung (HU/TÜV) oder Service-Inspektion' },
  { value: 'accident',    label: 'Unfall',     icon: '⚠️', tooltip: 'Unfallschäden und damit verbundene Reparaturen' },
  { value: 'other',       label: 'Sonstiges',  icon: '📌', tooltip: 'Andere Ereignisse, die in keine der Kategorien passen' },
];

const allCategories = [
  { value: '', label: 'Alle', icon: '📋', tooltip: 'Alle Einträge unabhängig von der Kategorie anzeigen' },
  ...categories,
];

const catIcon    = v => categories.find(c => c.value === v)?.icon || '📌';
const catLabel   = v => categories.find(c => c.value === v)?.label || v;
const catTooltip = v => categories.find(c => c.value === v)?.tooltip || '';
const fmt        = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDate    = ts => new Date(ts * 1000).toLocaleDateString('de-DE');

const form = ref({ title: '', category: 'note', description: '', mileage_km: null, cost: null });

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = { ...(vid ? { vehicle_id: vid } : {}), ...(filterCat.value ? { category: filterCat.value } : {}) };
  const { data } = await api.get('/logbook', { params });
  entries.value = data;
  loading.value = false;
}

async function submitForm() {
  if (!form.value.title) return;
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return alert('Kein Fahrzeug ausgewählt');
  await api.post('/logbook', { ...form.value, vehicle_id: vid, entry_date: Math.floor(Date.now() / 1000) });
  form.value = { title: '', category: 'note', description: '', mileage_km: null, cost: null };
  showForm.value = false;
  await load();
}

async function deleteEntry(id) {
  if (!confirm('Eintrag wirklich löschen?')) return;
  await api.delete(`/logbook/${id}`);
  await load();
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

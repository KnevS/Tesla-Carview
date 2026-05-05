<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Betriebsbuch</h1>
      <button @click="showForm = true" class="btn-primary">+ Eintrag</button>
    </div>

    <!-- Filter -->
    <div class="flex gap-2 flex-wrap">
      <button v-for="cat in allCategories" :key="cat.value"
        @click="filterCat = cat.value; load()"
        class="px-3 py-1 rounded-lg text-sm transition"
        :class="filterCat === cat.value ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'"
      >{{ cat.icon }} {{ cat.label }}</button>
    </div>

    <!-- Entries -->
    <div class="space-y-3">
      <div v-if="loading" class="text-gray-400">Lade Einträge...</div>
      <div v-else-if="entries.length === 0" class="card text-gray-400 text-center py-10">
        Noch keine Einträge. Erstelle deinen ersten Betriebsbuch-Eintrag!
      </div>
      <div v-for="e in entries" :key="e.id" class="card">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span>{{ catIcon(e.category) }}</span>
              <span class="font-semibold">{{ e.title }}</span>
              <span class="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{{ catLabel(e.category) }}</span>
            </div>
            <p v-if="e.description" class="text-gray-400 text-sm mt-1">{{ e.description }}</p>
            <div class="flex gap-4 mt-2 text-sm text-gray-400">
              <span>{{ fmtDate(e.entry_date) }}</span>
              <span v-if="e.mileage_km">{{ fmt(e.mileage_km, 0) }} km</span>
              <span v-if="e.cost" class="text-yellow-400">{{ fmt(e.cost, 2) }} {{ e.currency }}</span>
            </div>
          </div>
          <button @click="deleteEntry(e.id)" class="text-gray-600 hover:text-red-400 transition ml-3">✕</button>
        </div>
      </div>
    </div>

    <!-- New Entry Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md space-y-4">
        <h2 class="text-xl font-bold">Neuer Eintrag</h2>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Titel *</label>
          <input v-model="form.title" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Kategorie</label>
          <select v-model="form.category" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white">
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.icon }} {{ cat.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Beschreibung</label>
          <textarea v-model="form.description" rows="3" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Kilometerstand</label>
            <input v-model.number="form.mileage_km" type="number" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Kosten (€)</label>
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
  { value: 'note', label: 'Notiz', icon: '📝' },
  { value: 'maintenance', label: 'Wartung', icon: '🔧' },
  { value: 'repair', label: 'Reparatur', icon: '🛠️' },
  { value: 'tire', label: 'Reifen', icon: '🚗' },
  { value: 'inspection', label: 'Inspektion', icon: '🔍' },
  { value: 'accident', label: 'Unfall', icon: '⚠️' },
  { value: 'other', label: 'Sonstiges', icon: '📌' },
];

const allCategories = [{ value: '', label: 'Alle', icon: '📋' }, ...categories];

const catIcon = v => categories.find(c => c.value === v)?.icon || '📌';
const catLabel = v => categories.find(c => c.value === v)?.label || v;
const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const fmtDate = ts => new Date(ts * 1000).toLocaleDateString('de-DE');

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

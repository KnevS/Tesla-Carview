<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold">{{ $t('maintenanceLog.title') }}</h1>
      <div class="flex items-center gap-2">
        <SortToggle v-model:direction="sortDir" />
        <button @click="openForm" class="btn-primary"
          v-tooltip="$t('maintenanceLog.addTooltip')">
          {{ $t('maintenanceLog.add') }}
        </button>
      </div>
    </div>

    <template v-for="sid in layoutOrder" :key="sid">

    <!-- Wartungsintervalle pro Fahrzeug — gehören thematisch ins
         Betriebsbuch, weil sie eng mit den hier eingetragenen Wartungs-
         /Inspektions-Eintraegen zusammenarbeiten. -->
    <SortableSection v-if="sid === 'intervals'" page-id="logbook" section-id="intervals"
      :title="$t('maintenanceLog.sectionIntervals')" icon="🔧"
      :collapsed="isCollapsed('intervals')" @toggle="toggle('intervals')" @move="(f,t,p) => moveSection(f,t,p)">
      <ServiceIntervalsCard />
    </SortableSection>

    <SortableSection v-if="sid === 'entries'" page-id="logbook" section-id="entries"
      :title="$t('maintenanceLog.sectionEntries')" icon="📋"
      :collapsed="isCollapsed('entries')" @toggle="toggle('entries')" @move="(f,t,p) => moveSection(f,t,p)">
      <div class="flex gap-2 flex-wrap mb-3">
        <button v-for="cat in allCategories" :key="cat.value"
          @click="filterCat = cat.value; load()"
          v-tooltip="cat.tooltip"
          class="px-3 py-1 rounded-lg text-sm transition"
          :class="filterCat === cat.value ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'"
        >{{ cat.icon }} {{ cat.label }}</button>
      </div>

      <div class="space-y-3">
        <div v-if="loading" class="text-gray-400">{{ $t('maintenanceLog.loading') }}</div>
        <div v-else-if="entries.length === 0" class="card text-gray-400 text-center py-10">
          {{ $t('maintenanceLog.empty') }}
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
            <div class="flex gap-4 mt-2 text-sm text-gray-400 flex-wrap">
              <span v-tooltip="$t('maintenanceLog.dateInlineTooltip')">{{ fmtDateTime(e.entry_date) }}</span>
              <span v-if="e.mileage_km" v-tooltip="$t('maintenanceLog.mileageInlineTooltip')">{{ fmt(e.mileage_km, 0) }} {{ $t('common.km') }}</span>
              <span v-if="e.cost" v-tooltip="$t('maintenanceLog.costInlineTooltip')" class="text-yellow-400">{{ fmt(e.cost, 2) }} {{ e.currency }}</span>
              <!-- Ersteller: vom Backend per LEFT JOIN users; bleibt leer fuer
                   historische Eintraege ohne created_by_user_id. -->
              <span v-if="e.created_by_username" class="text-gray-500"
                    v-tooltip="$t('maintenanceLog.creator')">
                👤 {{ e.created_by_username }}
              </span>
              <span v-else class="text-gray-600 italic"
                    v-tooltip="$t('maintenanceLog.creatorUnknown')">
                {{ $t('maintenanceLog.unknown') }}
              </span>
            </div>
          </div>
          <button @click="deleteEntry(e.id)" class="text-gray-600 hover:text-red-400 transition ml-3"
            v-tooltip="$t('maintenanceLog.deleteTooltip')">✕</button>
        </div>
      </div>
      </div><!-- end entries list -->
    </SortableSection>

    </template><!-- end v-for layoutOrder -->

    <Teleport to="body">
    <div v-if="showForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
      <div class="card w-full max-w-md space-y-4">
        <h2 class="text-xl font-bold">{{ $t('maintenanceLog.newEntry') }}</h2>
        <div>
          <label class="block text-sm text-gray-400 mb-1"
            v-tooltip="$t('maintenanceLog.entryTitleTooltip')">{{ $t('maintenanceLog.entryTitle') }}</label>
          <input v-model="form.title" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1"
            v-tooltip="$t('maintenanceLog.dateTooltip')">{{ $t('maintenanceLog.dateLabel') }}</label>
          <div class="flex gap-2">
            <input v-model="form.entry_date_local" type="datetime-local"
              class="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-white" />
            <button type="button" @click="form.entry_date_local = nowLocal()"
              class="px-3 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm text-white"
              v-tooltip="$t('maintenanceLog.nowTooltip')">{{ $t('maintenanceLog.nowBtn') }}</button>
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1"
            v-tooltip="$t('maintenanceLog.categoryTooltip')">{{ $t('maintenanceLog.category') }}</label>
          <select v-model="form.category" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white">
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.icon }} {{ cat.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1"
            v-tooltip="$t('maintenanceLog.descriptionTooltip')">{{ $t('maintenanceLog.description') }}</label>
          <textarea v-model="form.description" rows="3" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1"
              v-tooltip="$t('maintenanceLog.odometerTooltip')">{{ $t('maintenanceLog.odometer') }}</label>
            <input v-model.number="form.mileage_km" type="number" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1"
              v-tooltip="$t('maintenanceLog.costTooltip')">{{ $t('maintenanceLog.cost') }}</label>
            <input v-model.number="form.cost" type="number" step="0.01" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button @click="submitForm" class="btn-primary flex-1">{{ $t('maintenanceLog.save') }}</button>
          <button @click="showForm = false" class="btn-secondary flex-1">{{ $t('maintenanceLog.cancel') }}</button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
import ServiceIntervalsCard from '../components/ServiceIntervalsCard.vue';
import SortableSection from '../components/SortableSection.vue';
import SortToggle from '../components/SortToggle.vue';
import { useSortDirection } from '../composables/useSortDirection.js';
import { usePageLayout } from '../composables/usePageLayout.js';

const { t, locale } = useI18n();
const appStore = useAppStore();

const LOGBOOK_SECTIONS = ['intervals', 'entries'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('logbook', LOGBOOK_SECTIONS);
const entries = ref([]);
const loading = ref(true);
const showForm = ref(false);
const filterCat = ref('');
// Sortierreihenfolge pro View in localStorage. Default desc (Neueste oben).
const { direction: sortDir } = useSortDirection('logbook');

// Kategorien sind in der DB englische Keys (note/maintenance/repair/...).
// Die Anzeige kommt aus den i18n-Keys. Computed, damit der Sprachwechsel
// die Labels aktualisiert, ohne dass die Seite neu geladen werden muss.
const categories = computed(() => [
  { value: 'note',        label: t('maintenanceLog.cat_note'),        icon: '📝', tooltip: t('maintenanceLog.cat_note_tooltip') },
  { value: 'maintenance', label: t('maintenanceLog.cat_maintenance'), icon: '🔧', tooltip: t('maintenanceLog.cat_maintenance_tooltip') },
  { value: 'repair',      label: t('maintenanceLog.cat_repair'),      icon: '🛠️', tooltip: t('maintenanceLog.cat_repair_tooltip') },
  { value: 'tire',        label: t('maintenanceLog.cat_tires'),       icon: '🚗', tooltip: t('maintenanceLog.cat_tires_tooltip') },
  { value: 'inspection',  label: t('maintenanceLog.cat_inspection'),  icon: '🔍', tooltip: t('maintenanceLog.cat_inspection_tooltip') },
  { value: 'accident',    label: t('maintenanceLog.cat_accident'),    icon: '⚠️', tooltip: t('maintenanceLog.cat_accident_tooltip') },
  { value: 'other',       label: t('maintenanceLog.cat_other'),       icon: '📌', tooltip: t('maintenanceLog.cat_other_tooltip') },
]);

const allCategories = computed(() => [
  { value: '', label: t('maintenanceLog.filterAll'), icon: '📋', tooltip: t('maintenanceLog.filterAllTooltip') },
  ...categories.value,
]);

const catIcon    = v => categories.value.find(c => c.value === v)?.icon || '📌';
const catLabel   = v => categories.value.find(c => c.value === v)?.label || v;
const catTooltip = v => categories.value.find(c => c.value === v)?.tooltip || '';
const fmt          = (v, d = 0) => (+(v || 0)).toFixed(d);
// Datums-Formatierung folgt der gewaehlten App-Sprache, nicht dem
// OS-Default — sonst zeigt z.B. ein DE-User auf englischem Browser
// trotzdem '5/10/2026' an.
const fmtDateTime  = ts => new Date(ts * 1000).toLocaleString(locale.value,
  { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Liefert „YYYY-MM-DDTHH:MM“ für <input type="datetime-local"> in lokaler Zeitzone
// (toISOString würde UTC liefern → falscher Versatz im Picker).
function nowLocal() {
  const d   = new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

const form = ref({ title: '', category: 'note', description: '', mileage_km: null, cost: null,
                   entry_date_local: nowLocal() });

// Beim Öffnen des Formulars: entry_date_local frisch auf „jetzt“ setzen,
// damit das Standardverhalten konsistent bleibt, auch wenn der Dialog
// zwischendurch ohne Speichern geschlossen wurde.
function openForm() {
  form.value.entry_date_local = nowLocal();
  showForm.value = true;
}

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const params = {
    ...(vid ? { vehicle_id: vid } : {}),
    ...(filterCat.value ? { category: filterCat.value } : {}),
    sort: sortDir.value,
  };
  const { data } = await api.get('/logbook', { params });
  entries.value = data;
  loading.value = false;
}

async function submitForm() {
  if (!form.value.title) return;
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return alert(t('maintenanceLog.noVehicle'));
  // datetime-local liefert YYYY-MM-DDTHH:MM ohne Zone; new Date(...) interpretiert es lokal.
  const ts = form.value.entry_date_local
    ? Math.floor(new Date(form.value.entry_date_local).getTime() / 1000)
    : Math.floor(Date.now() / 1000);
  const { entry_date_local, ...payload } = form.value;
  await api.post('/logbook', { ...payload, vehicle_id: vid, entry_date: ts });
  form.value = { title: '', category: 'note', description: '', mileage_km: null, cost: null,
                 entry_date_local: nowLocal() };
  showForm.value = false;
  await load();
}

async function deleteEntry(id) {
  if (!confirm(t('maintenanceLog.confirmDelete'))) return;
  await api.delete(`/logbook/${id}`);
  await load();
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
// Sortierwechsel triggert Reload, damit Backend mit korrektem ORDER BY liefert.
watch(sortDir, load);
</script>

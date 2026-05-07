<template>
  <div class="max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold">Datenverwaltung</h1>

    <div class="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-sm text-yellow-300">
      <p class="font-semibold">⚠ Achtung – Datenlöschung ist unwiderruflich</p>
      <p class="mt-1 text-yellow-400/80">
        Ohne vorheriges Backup können gelöschte Daten nicht wiederhergestellt werden.
        Erstelle zuerst einen Export unter <RouterLink to="/export" class="underline">Export</RouterLink>.
      </p>
    </div>

    <!-- Datenübersicht -->
    <div v-if="info" class="card space-y-3">
      <h2 class="font-semibold">Aktueller Datenbestand</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div v-for="(val, key) in info.counts" :key="key" class="bg-gray-800 rounded-lg p-3 text-center">
          <p class="text-2xl font-bold text-white">{{ val }}</p>
          <p class="text-gray-400 text-xs mt-1">{{ labelMap[key] || key }}</p>
        </div>
      </div>
    </div>

    <!-- Alle Daten löschen -->
    <div class="card space-y-4 border border-red-900">
      <h2 class="font-semibold text-red-400">Alle Mandantendaten löschen</h2>
      <p class="text-sm text-gray-400">
        Löscht alle Fahrten, Ladesessions, Telemetrie, Betriebsbuch und Audit-Logs des gesamten Mandanten.
        Benutzerkonten und Einstellungen bleiben erhalten. Vor dem Löschen wird automatisch ein Backup erstellt.
      </p>
      <div v-if="!showDeleteAll">
        <button @click="showDeleteAll = true" class="bg-red-900 hover:bg-red-800 text-red-200 text-sm py-2 px-4 rounded-lg">
          Alle Daten löschen…
        </button>
      </div>
      <div v-else class="space-y-3">
        <p class="text-sm text-red-300 font-semibold">Zur Bestätigung eingeben: <code class="font-mono bg-gray-900 px-1">ALLE DATEN LÖSCHEN</code></p>
        <input v-model="deleteAllConfirm" type="text" class="input font-mono"
          placeholder="ALLE DATEN LÖSCHEN" />
        <div v-if="deleteError" class="text-red-400 text-sm">{{ deleteError }}</div>
        <div v-if="deleteSuccess" class="text-green-400 text-sm">{{ deleteSuccess }}</div>
        <div class="flex gap-2">
          <button @click="showDeleteAll = false; deleteAllConfirm = ''" class="btn-secondary flex-1">Abbrechen</button>
          <button @click="deleteAll" :disabled="deleting || deleteAllConfirm !== 'ALLE DATEN LÖSCHEN'"
            class="flex-1 bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-red-200 py-2 px-4 rounded-lg text-sm">
            {{ deleting ? 'Wird gelöscht…' : 'Endgültig löschen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Fahrzeugdaten löschen -->
    <div class="card space-y-4">
      <h2 class="font-semibold">Fahrzeugdaten löschen</h2>
      <p class="text-sm text-gray-400">Löscht alle Daten eines einzelnen Fahrzeugs (Fahrten, Laden, Telemetrie etc.)</p>
      <div v-for="v in vehicles" :key="v.id" class="flex items-center justify-between bg-gray-800 rounded-lg p-3">
        <div>
          <p class="font-medium text-sm">{{ v.display_name }}</p>
          <p class="text-xs text-gray-500">{{ v.vin }}</p>
        </div>
        <button @click="confirmDeleteVehicle(v)"
          class="text-xs bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-200 py-1 px-3 rounded">
          Daten löschen
        </button>
      </div>
    </div>

    <!-- Fahrzeug-Bestätigungsdialog -->
    <div v-if="deleteVehicleTarget" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h3 class="font-semibold text-red-400">Fahrzeugdaten löschen</h3>
        <p class="text-sm text-gray-300">
          Alle Daten von <strong>{{ deleteVehicleTarget.display_name }}</strong> werden unwiderruflich gelöscht.
        </p>
        <p class="text-sm text-red-300 font-semibold">
          Zur Bestätigung eingeben: <code class="font-mono bg-gray-900 px-1">DATEN LÖSCHEN</code>
        </p>
        <input v-model="vehicleDeleteConfirm" type="text" class="input font-mono" placeholder="DATEN LÖSCHEN" />
        <div v-if="vehicleDeleteError" class="text-red-400 text-sm">{{ vehicleDeleteError }}</div>
        <div class="flex gap-2">
          <button @click="deleteVehicleTarget = null; vehicleDeleteConfirm = ''" class="btn-secondary flex-1">Abbrechen</button>
          <button @click="deleteVehicleData"
            :disabled="deleting || vehicleDeleteConfirm !== 'DATEN LÖSCHEN'"
            class="flex-1 bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-200 py-2 px-4 rounded-lg text-sm">
            Löschen
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api.js';
import { useAppStore } from '../store/index.js';

const app     = useAppStore();
const info    = ref(null);
const vehicles = ref([]);
const loading  = ref(true);
const showDeleteAll      = ref(false);
const deleteAllConfirm   = ref('');
const deleteVehicleTarget = ref(null);
const vehicleDeleteConfirm = ref('');
const vehicleDeleteError = ref('');
const deleteError   = ref('');
const deleteSuccess = ref('');
const deleting      = ref(false);

const labelMap = {
  trips:             'Fahrten',
  charging_sessions: 'Ladesessions',
  battery_snapshots: 'Batterie-Snapshots',
  telemetry_points:  'Telemetrie-Punkte',
  logbook_entries:   'Betriebsbuch',
};

onMounted(async () => {
  const [infoRes] = await Promise.all([
    api.get('/data/info'),
  ]);
  info.value = infoRes.data;
  vehicles.value = app.vehicles.length ? app.vehicles : (await api.get('/vehicles')).data;
  loading.value = false;
});

async function deleteAll() {
  if (deleteAllConfirm.value !== 'ALLE DATEN LÖSCHEN') return;
  deleting.value = true;
  deleteError.value = '';
  try {
    const { data } = await api.delete('/data/tenant/all', {
      data: { confirm: true, confirmationText: 'ALLE DATEN LÖSCHEN' },
    });
    deleteSuccess.value = `Alle Daten gelöscht. Backup wurde erstellt.`;
    showDeleteAll.value = false;
    const infoRes = await api.get('/data/info');
    info.value = infoRes.data;
  } catch (err) {
    deleteError.value = err.response?.data?.error ?? 'Fehler beim Löschen';
  } finally {
    deleting.value = false;
  }
}

function confirmDeleteVehicle(v) {
  deleteVehicleTarget.value = v;
  vehicleDeleteConfirm.value = '';
  vehicleDeleteError.value = '';
}

async function deleteVehicleData() {
  if (vehicleDeleteConfirm.value !== 'DATEN LÖSCHEN') return;
  deleting.value = true;
  vehicleDeleteError.value = '';
  try {
    await api.delete(`/data/vehicle/${deleteVehicleTarget.value.id}/all`, {
      data: { confirm: true, confirmationText: 'DATEN LÖSCHEN' },
    });
    deleteVehicleTarget.value = null;
    vehicleDeleteConfirm.value = '';
    const infoRes = await api.get('/data/info');
    info.value = infoRes.data;
  } catch (err) {
    vehicleDeleteError.value = err.response?.data?.error ?? 'Fehler beim Löschen';
  } finally {
    deleting.value = false;
  }
}
</script>

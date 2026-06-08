<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="max-w-2xl space-y-6">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold">Datenverwaltung</h1>
      <RouterLink to="/admin"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition">
        ← Übersicht
      </RouterLink>
    </div>

    <div class="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-sm text-yellow-300">
      <p class="font-semibold flex items-center gap-2">
        <AppIcon name="alert" :size="18" />
        Achtung – Datenlöschung ist unwiderruflich
      </p>
      <p class="mt-1 text-yellow-400/80">
        Ohne vorheriges Backup können gelöschte Daten nicht wiederhergestellt werden.
        Erstelle unten ein <strong>vollständiges Backup</strong> bevor du etwas löschst.
      </p>
    </div>

    <!-- Backup & Restore -->
    <div class="card space-y-4 border border-blue-700/40">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="database" :size="20" class="text-tesla-red" />
        Vollständiges Backup &amp; Restore
      </h2>
      <p class="text-sm text-gray-400">
        Lädt <em>alle</em> Daten dieses Mandanten als eine einzige JSON-Datei herunter
        (Fahrzeuge, Fahrten, Ladesessions, Telemetrie, Betriebsbuch, Wartungsintervalle,
        Benutzer, Audit-Logs, Einstellungen, Tesla-Verbindung, Virtual Key — alles).
        Mit derselben Datei kannst du nach einer Neuinstallation den vorherigen Stand
        wiederherstellen.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- Backup -->
        <button @click="downloadBackup" :disabled="backupBusy"
          class="btn-primary text-sm min-h-[44px] disabled:opacity-40"
          v-tooltip="'Erzeugt eine komplette JSON-Datei mit allen Daten dieses Mandanten. Datei sicher aufbewahren – sie enthaelt sensible Inhalte wie Tesla-OAuth-Token.'">
          {{ backupBusy ? 'Erstelle Backup…' : '⬇ Backup erstellen' }}
        </button>

        <!-- Restore-Trigger -->
        <button @click="showRestore = true"
          class="btn-secondary text-sm min-h-[44px] border border-orange-700/60 text-orange-300 hover:bg-orange-900/30"
          v-tooltip="'Spielt ein zuvor erstelltes Backup wieder ein — z.B. nach Neuinstallation. Vor dem Restore wird automatisch ein Sicherheits-Backup der aktuellen DB angelegt.'">
          ⬆ Backup wiederherstellen…
        </button>
      </div>

      <!-- Restore-Dialog (inline, kein Modal, damit Mobile entspannt scrollt) -->
      <div v-if="showRestore" class="bg-orange-900/20 border border-orange-700/50 rounded-lg p-3 space-y-3 text-sm">
        <p class="text-orange-300 font-semibold">⚠ Vorsicht — Wiederherstellung überschreibt alle Daten</p>
        <ul class="text-xs text-orange-200/80 list-disc list-inside space-y-1">
          <li>Alle Tabellen werden vor dem Import geleert.</li>
          <li>Vor dem Restore wird automatisch ein Sicherheits-Backup als <code class="bg-gray-900 px-1 rounded">.db</code>-Datei auf dem Server abgelegt.</li>
          <li>Push-Subscriptions werden nicht wiederhergestellt — Benachrichtigungen neu abonnieren.</li>
          <li>Nach dem Restore: einmal abmelden und neu anmelden.</li>
        </ul>
        <div class="space-y-2">
          <label class="text-xs text-gray-300 block">Backup-Datei (JSON)</label>
          <input ref="fileInput" type="file" accept="application/json,.json"
            @change="onRestoreFile"
            class="text-xs text-gray-300 file:bg-gray-700 file:text-white file:rounded-lg file:px-3 file:py-1.5 file:mr-2 file:border-0" />
        </div>
        <div class="space-y-2">
          <label class="text-xs text-gray-300 block">
            Zum Bestätigen <strong>WIEDERHERSTELLEN</strong> eintippen:
          </label>
          <input v-model="restoreConfirm" type="text"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm font-mono"
            placeholder="WIEDERHERSTELLEN" />
        </div>
        <div v-if="restoreError" class="text-xs text-red-300 bg-red-900/30 rounded px-2 py-1">{{ restoreError }}</div>
        <div v-if="restoreResult" class="text-xs text-green-300 bg-green-900/30 rounded px-2 py-2 space-y-1">
          <p class="font-semibold">✓ Restore erfolgreich</p>
          <p>{{ restoreResult.note }}</p>
          <p v-if="restoreResult.safetyBackup" class="text-green-400/70 break-all">
            Sicherheits-Backup auf Server: <code>{{ restoreResult.safetyBackup }}</code>
          </p>
        </div>
        <div class="flex gap-2">
          <button @click="performRestore" :disabled="restoreBusy || !restoreFile || restoreConfirm !== 'WIEDERHERSTELLEN'"
            class="btn-primary text-sm flex-1 min-h-[44px] disabled:opacity-40">
            {{ restoreBusy ? 'Spiele ein…' : 'Jetzt wiederherstellen' }}
          </button>
          <button @click="cancelRestore" class="btn-secondary text-sm min-h-[44px]">Abbrechen</button>
        </div>
      </div>
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

    <!-- Fahrzeug-Bestätigungsdialog — Teleport to body, sonst frisst der
         .card-Stacking-Context die Overlay-Optik. -->
    <Teleport to="body">
      <div v-if="deleteVehicleTarget" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
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
    </Teleport>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api.js';
import { useAppStore } from '../store/index.js';
import AppIcon from '../components/AppIcon.vue';

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

// ─── Backup / Restore ─────────────────────────────────────────────────
const backupBusy    = ref(false);
const showRestore   = ref(false);
const restoreFile   = ref(null);
const restoreConfirm = ref('');
const restoreBusy   = ref(false);
const restoreError  = ref('');
const restoreResult = ref(null);
const fileInput     = ref(null);

async function downloadBackup() {
  backupBusy.value = true;
  try {
    // Backup ueber den axios-Client laden — der Request-Interceptor in
    // api.js setzt automatisch den Authorization-Header aus dem Auth-
    // Store + cycelt bei 401 den Token via /auth/refresh durch. fetch()
    // direkt aufzurufen hat den Token frueher ignoriert und 401 geliefert.
    //
    // responseType:'blob' damit axios kein JSON.parse erzwingt — sonst
    // wuerde der Browser den Download intern parsen und das Original-
    // JSON wuerde nie als File ankommen.
    const res = await api.get('/data/backup', { responseType: 'blob' });
    const filename = (res.headers['content-disposition'] || '')
      .match(/filename="([^"]+)"/)?.[1]
      || `tesla-carview-backup-${new Date().toISOString().slice(0,10)}.json`;
    const a = Object.assign(document.createElement('a'),
      { href: URL.createObjectURL(res.data), download: filename });
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    // axios-Errors haben err.response.status; bei Blob-Response liegt
    // der eigentliche Server-Text noch als Blob, nicht als String vor.
    const status = err.response?.status;
    let msg = err.message;
    if (err.response?.data instanceof Blob) {
      try { msg = await err.response.data.text(); } catch { /* keep msg */ }
    }
    alert(`Backup-Download fehlgeschlagen${status ? ` (HTTP ${status})` : ''}: ${msg}`);
  } finally {
    backupBusy.value = false;
  }
}

function onRestoreFile(e) {
  restoreFile.value = e.target.files?.[0] ?? null;
  restoreError.value = '';
  restoreResult.value = null;
}

function cancelRestore() {
  showRestore.value = false;
  restoreFile.value = null;
  restoreConfirm.value = '';
  restoreError.value = '';
  restoreResult.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

async function performRestore() {
  if (!restoreFile.value) return;
  if (restoreConfirm.value !== 'WIEDERHERSTELLEN') return;
  restoreBusy.value = true;
  restoreError.value = '';
  restoreResult.value = null;
  try {
    const fd = new FormData();
    fd.append('file', restoreFile.value);
    fd.append('confirmationText', 'WIEDERHERSTELLEN');
    const { data } = await api.post('/data/restore', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Restore kann je nach DB-Groesse mehrere Sekunden brauchen
      timeout: 5 * 60 * 1000,
    });
    restoreResult.value = data;
    // Frisch laden, damit Statistik-Karte den neuen Stand zeigt
    const infoRes = await api.get('/data/info');
    info.value = infoRes.data;
  } catch (err) {
    restoreError.value = err.response?.data?.error || err.message;
  } finally {
    restoreBusy.value = false;
  }
}

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

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Daten exportieren</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card space-y-4">
        <h2 class="text-lg font-semibold">🗺️ Fahrten</h2>
        <p class="text-gray-400 text-sm">Alle Fahrtdaten mit Strecke, Verbrauch und SoC.</p>
        <div class="flex gap-3">
          <a :href="exportUrl('trips.csv')" class="btn-primary flex-1 text-center" download
            v-tooltip="'CSV-Format mit BOM – öffnet sich direkt in Excel und LibreOffice Calc. Trennzeichen ist Semikolon.'">CSV</a>
          <a :href="exportUrl('trips.json')" class="btn-secondary flex-1 text-center" download
            v-tooltip="'JSON-Format inklusive aller GPS-Punkte je Fahrt. Ideal für eigene Auswertungen, Skripte oder Datenmigration.'">JSON</a>
        </div>
      </div>

      <div class="card space-y-4">
        <h2 class="text-lg font-semibold">🔋 Ladevorgänge</h2>
        <p class="text-gray-400 text-sm">Alle Ladesessions mit Energie, Kosten und Ladertyp.</p>
        <div class="flex gap-3">
          <a :href="exportUrl('charging.csv')" class="btn-primary flex-1 text-center" download
            v-tooltip="'CSV-Datei mit allen Ladesessions – Energie, Kosten, Ladertyp, SoC-Bereich. Excel-kompatibel.'">CSV</a>
        </div>
      </div>

      <div class="card space-y-4 md:col-span-2">
        <h2 class="text-lg font-semibold">💾 Vollständiges Backup</h2>
        <p class="text-gray-400 text-sm">
          Alle Daten (Fahrten, Laden, Batterie, Betriebsbuch) als eine JSON-Datei.
          Kann für Backups oder den Umzug auf einen anderen Server genutzt werden.
        </p>
        <a :href="exportUrl('backup.json')" class="btn-primary inline-block" download
          v-tooltip="'Komplette Datenbank-Sicherung im JSON-Format.\nEnthält: Fahrzeuge, Fahrten + GPS-Punkte, Ladevorgänge + Ladekurven, Batterie-Snapshots, Betriebsbuch.\nKeine Passwörter oder Tokens enthalten.'">
          💾 Backup herunterladen
        </a>
      </div>
    </div>

    <div class="card space-y-4">
      <h2 class="text-lg font-semibold">🔔 Benachrichtigungen</h2>
      <p class="text-gray-400 text-sm">
        Erhalte eine Browser-Benachrichtigung wenn dein Tesla fertig geladen hat.
      </p>
      <div v-if="notifSupported">
        <button v-if="!subscribed" @click="subscribe" class="btn-primary"
          v-tooltip="'Aktiviert Web-Push-Benachrichtigungen. Funktioniert auch wenn der Browser geschlossen ist (auf unterstützten Systemen). Browser fragt nach Erlaubnis.'">
          Benachrichtigungen aktivieren
        </button>
        <div v-else class="flex items-center gap-3">
          <span class="text-green-400">✓ Benachrichtigungen aktiv</span>
          <button @click="unsubscribe" class="btn-secondary text-sm"
            v-tooltip="'Push-Benachrichtigungen für dieses Fahrzeug abmelden'">Deaktivieren</button>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm">Dein Browser unterstützt keine Web-Push-Benachrichtigungen.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';

const appStore = useAppStore();
const subscribed = ref(false);
const vapidKey = ref(null);
const notifSupported = 'serviceWorker' in navigator && 'PushManager' in window;

const exportUrl = path => {
  const vid = appStore.selectedVehicle?.id;
  return `/api/export/${path}${vid ? '?vehicle_id=' + vid : ''}`;
};

async function subscribe() {
  if (!vapidKey.value) return alert('Kein VAPID-Key konfiguriert (backend .env)');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return;
  const reg = await navigator.serviceWorker.register('/sw.js');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey.value),
  });
  await api.post('/notifications/subscribe', {
    vehicle_id: appStore.selectedVehicle?.id,
    subscription: sub.toJSON(),
  });
  subscribed.value = true;
}

async function unsubscribe() {
  await api.delete('/notifications/unsubscribe', { data: { vehicle_id: appStore.selectedVehicle?.id } });
  subscribed.value = false;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

onMounted(async () => {
  const { data } = await api.get('/notifications/vapid-public-key').catch(() => ({ data: { key: null } }));
  vapidKey.value = data.key;
});
</script>

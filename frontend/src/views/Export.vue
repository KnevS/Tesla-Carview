<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Daten exportieren</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Fahrten -->
      <div class="card space-y-4">
        <h2 class="text-lg font-semibold">🗺️ Fahrten</h2>
        <p class="text-gray-400 text-sm">Alle Fahrtdaten mit Strecke, Verbrauch und SoC.</p>
        <div class="flex gap-3">
          <a :href="exportUrl('trips.csv')" class="btn-primary flex-1 text-center" download>CSV</a>
          <a :href="exportUrl('trips.json')" class="btn-secondary flex-1 text-center" download>JSON</a>
        </div>
      </div>

      <!-- Laden -->
      <div class="card space-y-4">
        <h2 class="text-lg font-semibold">🔋 Ladevorgänge</h2>
        <p class="text-gray-400 text-sm">Alle Ladesessions mit Energie, Kosten und Ladertyp.</p>
        <div class="flex gap-3">
          <a :href="exportUrl('charging.csv')" class="btn-primary flex-1 text-center" download>CSV</a>
        </div>
      </div>

      <!-- Vollbackup -->
      <div class="card space-y-4 md:col-span-2">
        <h2 class="text-lg font-semibold">💾 Vollständiges Backup</h2>
        <p class="text-gray-400 text-sm">
          Alle Daten (Fahrten, Laden, Batterie, Betriebsbuch) als eine JSON-Datei.
          Kann für Backups oder den Umzug auf einen anderen Server genutzt werden.
        </p>
        <a :href="exportUrl('backup.json')" class="btn-primary inline-block" download>
          💾 Backup herunterladen
        </a>
      </div>
    </div>

    <!-- Push-Benachrichtigungen -->
    <div class="card space-y-4">
      <h2 class="text-lg font-semibold">🔔 Benachrichtigungen</h2>
      <p class="text-gray-400 text-sm">
        Erhalte eine Browser-Benachrichtigung wenn dein Tesla fertig geladen hat.
      </p>
      <div v-if="notifSupported">
        <button v-if="!subscribed" @click="subscribe" class="btn-primary">
          Benachrichtigungen aktivieren
        </button>
        <div v-else class="flex items-center gap-3">
          <span class="text-green-400">✓ Benachrichtigungen aktiv</span>
          <button @click="unsubscribe" class="btn-secondary text-sm">Deaktivieren</button>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm">Dein Browser unterstützt keine Web-Push-Benachrichtigungen.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
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

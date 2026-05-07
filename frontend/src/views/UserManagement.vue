<template>
  <div class="max-w-4xl space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Benutzerverwaltung</h1>
      <button @click="showCreate = true" class="btn-primary text-sm">+ Benutzer anlegen</button>
    </div>

    <!-- Benutzerliste -->
    <div class="card divide-y divide-gray-700">
      <div v-if="loading" class="p-4 text-center text-gray-500">Lade Benutzer…</div>
      <div v-for="user in users" :key="user.id"
        class="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ user.username }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full"
              :class="user.role === 'admin' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-400'">
              {{ user.role }}
            </span>
            <span v-if="!user.is_active" class="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full">
              gesperrt
            </span>
            <span v-if="user.mfa_enabled" class="text-xs text-green-400" title="MFA aktiv">🔐</span>
          </div>
          <p v-if="user.email" class="text-xs text-gray-500 mt-0.5">{{ user.email }}</p>
          <p class="text-xs text-gray-600 mt-0.5">
            Letzter Login: {{ user.last_login ? formatDate(user.last_login) : 'noch nie' }}
          </p>
          <!-- Zugewiesene Fahrzeuge -->
          <div v-if="vehicleMap[user.id]?.length" class="flex flex-wrap gap-1 mt-1">
            <span v-for="v in vehicleMap[user.id]" :key="v.id"
              class="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              🚗 {{ v.display_name }}
              <button @click="unassignVehicle(user.id, v.id)" class="text-gray-500 hover:text-red-400 ml-1">×</button>
            </span>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button @click="assignVehicleTo(user)" class="text-xs btn-secondary py-1 px-3">Fahrzeug zuweisen</button>
          <button @click="generateReset(user)" class="text-xs btn-secondary py-1 px-3">Reset-Link</button>
          <button @click="toggleUser(user)" class="text-xs btn-secondary py-1 px-3"
            :class="user.is_active ? 'hover:bg-yellow-900' : 'hover:bg-green-900'">
            {{ user.is_active ? 'Sperren' : 'Aktivieren' }}
          </button>
          <button @click="deleteUser(user)" class="text-xs py-1 px-3 rounded bg-gray-700 hover:bg-red-900 text-gray-300">
            Löschen
          </button>
        </div>
      </div>
    </div>

    <!-- Reset-Link anzeigen -->
    <div v-if="resetLink" class="card space-y-2 border border-yellow-700">
      <h3 class="font-semibold text-yellow-400">Reset-Link generiert</h3>
      <p class="text-xs text-gray-400">Link ist 60 Minuten gültig. Sende diesen Link sicher an den Benutzer:</p>
      <div class="bg-gray-900 rounded p-3 font-mono text-xs break-all text-gray-300 select-all">{{ resetLink }}</div>
      <button @click="copyReset" class="btn-secondary text-sm">Kopieren</button>
      <button @click="resetLink = ''" class="text-xs text-gray-500 hover:text-gray-300 ml-3">Schließen</button>
    </div>

    <!-- Fahrzeugzuweisung -->
    <div v-if="assignTarget" class="card space-y-3 border border-blue-700">
      <h3 class="font-semibold">Fahrzeug zuweisen an: {{ assignTarget.username }}</h3>
      <div v-for="v in vehicles" :key="v.id" class="flex items-center gap-3">
        <input type="checkbox" :id="`v${v.id}`"
          :checked="vehicleMap[assignTarget.id]?.some(x => x.id === v.id)"
          @change="e => toggleVehicleAssign(assignTarget.id, v.id, e.target.checked)"
          class="accent-tesla-red" />
        <label :for="`v${v.id}`" class="text-sm">{{ v.display_name }} ({{ v.vin }})</label>
      </div>
      <button @click="assignTarget = null" class="btn-secondary text-sm">Schließen</button>
    </div>

    <!-- Neuen Benutzer anlegen -->
    <div v-if="showCreate" class="card space-y-4 border border-gray-600">
      <h2 class="font-semibold">Neuen Benutzer anlegen</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2 sm:col-span-1">
          <label class="label">Benutzername</label>
          <input v-model="newUser.username" type="text" class="input" />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <label class="label">Rolle</label>
          <select v-model="newUser.role" class="input">
            <option value="user">Benutzer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <label class="label">E-Mail (optional)</label>
          <input v-model="newUser.email" type="email" class="input" />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <label class="label">Passwort</label>
          <input v-model="newUser.password" type="password" class="input" placeholder="Min. 12 Zeichen" />
        </div>
      </div>
      <div v-if="createError" class="text-red-400 text-sm">{{ createError }}</div>
      <div class="flex gap-2">
        <button @click="showCreate = false" class="btn-secondary flex-1">Abbrechen</button>
        <button @click="createUser" :disabled="creating" class="btn-primary flex-1">
          {{ creating ? 'Wird erstellt…' : 'Anlegen' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api.js';
import { useAppStore } from '../store/index.js';

const app     = useAppStore();
const users   = ref([]);
const vehicles = ref([]);
const vehicleMap = ref({});  // userId → [{id, display_name}]
const loading  = ref(true);
const resetLink = ref('');
const assignTarget = ref(null);
const showCreate = ref(false);
const createError = ref('');
const creating   = ref(false);
const newUser    = ref({ username: '', password: '', email: '', role: 'user' });

function formatDate(unix) {
  return new Date(unix * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function loadUsers() {
  loading.value = true;
  const { data } = await api.get('/users');
  users.value = data;
  // Fahrzeuge je User laden
  for (const u of data) {
    try {
      const { data: vs } = await api.get(`/users/${u.id}/vehicles`);
      vehicleMap.value[u.id] = vs;
    } catch { vehicleMap.value[u.id] = []; }
  }
  loading.value = false;
}

onMounted(async () => {
  await loadUsers();
  vehicles.value = app.vehicles;
  if (!vehicles.value.length) {
    const { data } = await api.get('/vehicles');
    vehicles.value = data;
  }
});

async function toggleUser(user) {
  await api.put(`/users/${user.id}/toggle`);
  user.is_active = !user.is_active;
}

async function deleteUser(user) {
  if (!confirm(`Benutzer "${user.username}" wirklich löschen?`)) return;
  await api.delete(`/users/${user.id}`);
  users.value = users.value.filter(u => u.id !== user.id);
}

async function generateReset(user) {
  const { data } = await api.post('/password-reset/generate', { userId: user.id });
  resetLink.value = data.resetUrl;
}

function copyReset() {
  navigator.clipboard.writeText(resetLink.value);
}

function assignVehicleTo(user) {
  assignTarget.value = user;
}

async function toggleVehicleAssign(userId, vehicleId, add) {
  if (add) {
    await api.post(`/users/${userId}/vehicles/${vehicleId}`);
    vehicleMap.value[userId] = [...(vehicleMap.value[userId] || []),
      vehicles.value.find(v => v.id === vehicleId)].filter(Boolean);
  } else {
    await unassignVehicle(userId, vehicleId);
  }
}

async function unassignVehicle(userId, vehicleId) {
  await api.delete(`/users/${userId}/vehicles/${vehicleId}`);
  vehicleMap.value[userId] = (vehicleMap.value[userId] || []).filter(v => v.id !== vehicleId);
}

async function createUser() {
  createError.value = '';
  if (!newUser.value.username || !newUser.value.password) { createError.value = 'Alle Pflichtfelder ausfüllen'; return; }
  if (newUser.value.password.length < 12) { createError.value = 'Passwort muss mindestens 12 Zeichen lang sein'; return; }
  creating.value = true;
  try {
    await api.post('/users', newUser.value);
    showCreate.value = false;
    newUser.value = { username: '', password: '', email: '', role: 'user' };
    await loadUsers();
  } catch (err) {
    createError.value = err.response?.data?.error ?? 'Fehler beim Erstellen';
  } finally {
    creating.value = false;
  }
}
</script>

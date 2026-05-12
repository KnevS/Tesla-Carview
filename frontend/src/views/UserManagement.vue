<template>
  <div class="max-w-4xl space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Benutzerverwaltung</h1>
      <div class="flex items-center gap-2">
        <SortToggle v-model:direction="sortDir" />
        <button @click="showCreate = true" class="btn-primary text-sm">+ Benutzer anlegen</button>
      </div>
    </div>

    <!-- Admin-Aufgaben (offene To-Dos für den Tenant-Admin):
         derzeit: aktive Nicht-Admin-Benutzer ohne Fahrzeug-Zuweisung. -->
    <div v-if="adminTasks.usersWithoutVehicle?.length"
         class="card border border-orange-700/60 bg-orange-900/15 space-y-2">
      <p class="text-sm font-semibold text-orange-300 flex items-center gap-1.5">
        <AppIcon name="alert" :size="16" />
        Offene Aufgaben
      </p>
      <p class="text-xs text-orange-200/80">
        Folgende Benutzer haben noch kein Fahrzeug zugewiesen. Weise ein Auto zu
        oder gib dem Benutzer das Recht, selbst eines anzulegen:
      </p>
      <ul class="space-y-1">
        <li v-for="t in adminTasks.usersWithoutVehicle" :key="t.id"
            class="text-sm flex items-center gap-2 flex-wrap">
          <span>👤 <strong>{{ t.username }}</strong></span>
          <button @click="assignFromTask(t.id)"
                  class="text-xs btn-secondary py-0.5 px-2"
                  v-tooltip="'Fahrzeug zuweisen — Auswahl scrollt zum Benutzer'">
            Fahrzeug zuweisen
          </button>
          <button v-if="!t.can_add_vehicles"
                  @click="grantAddVehicles(t.id)"
                  class="text-xs btn-secondary py-0.5 px-2"
                  v-tooltip="'Recht „selbst Fahrzeuge anlegen“ geben — der Benutzer kann dann sync ausloesen.'">
            Recht „Fahrzeug anlegen“ geben
          </button>
        </li>
      </ul>
    </div>

    <!-- Benutzerliste -->
    <div class="card divide-y divide-gray-700">
      <div v-if="loading" class="p-4 text-center text-gray-500">Lade Benutzer…</div>
      <div v-for="user in sortedUsers" :key="user.id"
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
          <div v-if="vehicleMap[user.id]?.length" :id="`user-${user.id}`" class="flex flex-wrap gap-1 mt-1">
            <span v-for="v in vehicleMap[user.id]" :key="v.id"
              class="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              🚗 {{ v.display_name }}
              <button @click="unassignVehicle(user.id, v.id)" class="text-gray-500 hover:text-red-400 ml-1">×</button>
            </span>
          </div>
          <!-- Berechtigungen (nicht editierbar bei Admin-Rolle, weil
               Admin implizit immer alles darf). -->
          <div v-if="user.role !== 'admin'" class="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
            <label class="flex items-center gap-1 cursor-pointer"
                   v-tooltip="'Wenn aktiv: User darf Fahrzeug-Grunddaten (Name, Farbe, Tarif, …) aendern.'">
              <input type="checkbox" :checked="!!user.can_edit_vehicles"
                     @change="setPerm(user, 'can_edit_vehicles', $event.target.checked)"
                     class="accent-tesla-red" />
              Fahrzeuge bearbeiten
            </label>
            <label class="flex items-center gap-1 cursor-pointer"
                   v-tooltip="'Wenn aktiv: User darf neue Fahrzeuge vom Tesla-Account synchronisieren.'">
              <input type="checkbox" :checked="!!user.can_add_vehicles"
                     @change="setPerm(user, 'can_add_vehicles', $event.target.checked)"
                     class="accent-tesla-red" />
              Fahrzeuge anlegen
            </label>
            <label class="flex items-center gap-1 cursor-pointer"
                   v-tooltip="'MFA-Pflicht: User wird nach dem Login zur Einrichtung gezwungen, bis MFA aktiv ist.'">
              <input type="checkbox" :checked="!!user.mfa_required"
                     @change="setPerm(user, 'mfa_required', $event.target.checked)"
                     class="accent-tesla-red" />
              MFA-Pflicht
            </label>
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

    <!-- Einladungslink für neue Mandanten -->
    <div class="card space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">🔗 Neuen Mandanten einladen</h2>
      </div>
      <p class="text-xs text-gray-400">
        Nur wer diesen Link besitzt, kann einen neuen Mandanten registrieren. Jeder Link ist 7 Tage gültig und kann nur einmal verwendet werden.
      </p>

      <!-- Hinweis-Feld + Erstellen-Button. Notiz hilft, spaeter
           wiederzuerkennen, an wen / wofuer der Link erzeugt wurde. -->
      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input v-model="newInviteNote" type="text" maxlength="200"
               placeholder="Notiz (z.B. ‚fuer Max Mustermann, Firma XY')"
               class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 flex-1"
               v-tooltip="'Optionale Notiz, max. 200 Zeichen — nur sichtbar fuer dich.'" />
        <button @click="generateInvite" :disabled="inviteLoading" class="btn-secondary text-sm whitespace-nowrap">
          {{ inviteLoading ? 'Generiere…' : '+ Einladungslink erstellen' }}
        </button>
      </div>

      <!-- Neu erzeugter Link -->
      <div v-if="newInviteUrl" class="bg-gray-900 rounded-lg p-3 space-y-2">
        <p class="text-xs text-gray-400">Link (7 Tage gültig, einmalig verwendbar):</p>
        <div class="font-mono text-xs text-green-400 break-all select-all">{{ newInviteUrl }}</div>
        <button @click="copyInvite" class="btn-secondary text-sm">Kopieren</button>
        <button @click="newInviteUrl = ''" class="text-xs text-gray-500 hover:text-gray-300 ml-3">Schließen</button>
      </div>

      <!-- Bestehende Einladungen — inkl. genutzter und gesperrter, damit
           der Admin Kontext wiederfindet. Inline-Editierung der Notiz. -->
      <div v-if="invites.length" class="space-y-2">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Einladungen</p>
        <div v-for="inv in invites" :key="inv.token"
          class="bg-gray-800 rounded-lg px-3 py-2 text-sm space-y-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="font-mono text-xs text-gray-400 truncate">{{ inv.token.slice(0, 16) }}…</p>
              <p class="text-xs text-gray-500">
                <span v-if="inv.revoked_at"  class="text-orange-400">⛔ gesperrt</span>
                <span v-else-if="inv.used_at" class="text-gray-400">✓ verwendet</span>
                <span v-else-if="inv.expires_at < nowEpoch" class="text-gray-500">⏱ abgelaufen</span>
                <span v-else class="text-green-400">● offen</span>
                · Läuft ab: {{ formatDate(inv.expires_at) }}
              </p>
              <!-- Notiz: bei Klick editieren, mit Enter speichern, Esc abbrechen.
                   Wir behalten unaufdringliches Inline-Edit statt eines Popups. -->
              <div class="mt-1">
                <input v-if="editingInviteToken === inv.token"
                       :value="editingInviteNote" @input="e => editingInviteNote = e.target.value"
                       @keydown.enter="saveInviteNote(inv.token)"
                       @keydown.esc="editingInviteToken = ''"
                       @blur="saveInviteNote(inv.token)"
                       maxlength="200" autofocus
                       class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white w-full" />
                <p v-else
                   @click="startEditNote(inv)"
                   class="text-xs text-gray-300 italic cursor-text hover:text-white"
                   v-tooltip="'Klicken zum Editieren'">
                  {{ inv.note ? '📝 ' + inv.note : '— keine Notiz —' }}
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-1 items-end">
              <button @click="reissueInvite(inv)"
                      class="text-xs text-blue-400 hover:text-blue-300 transition"
                      v-tooltip="'Neuen Einladungslink mit derselben Notiz erstellen.'">
                Erneut
              </button>
              <button v-if="!inv.revoked_at && !inv.used_at"
                      @click="blockInvite(inv.token)"
                      class="text-xs text-orange-400 hover:text-orange-300 transition"
                      v-tooltip="'Link sperren — bleibt sichtbar, kann aber nicht mehr verwendet werden.'">
                Sperren
              </button>
              <button @click="deleteInvite(inv.token)"
                      class="text-xs text-gray-500 hover:text-red-400 transition"
                      v-tooltip="'Einladung endgueltig entfernen.'">
                Löschen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Einladungslink für Benutzer im EIGENEN Mandanten -->
    <div class="card space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">👤 Neuen Benutzer in diesen Mandanten einladen</h2>
        <button @click="generateUserInvite" :disabled="userInviteLoading" class="btn-secondary text-sm"
                v-tooltip="'Erstellt einen Selbstregistrierungs-Link, mit dem ein neuer User mit der gewählten Rolle in DIESEM Mandanten ein eigenes Konto anlegen kann (Username + Passwort + Datenschutz/Nutzungsbedingungen-Akzept).'">
          {{ userInviteLoading ? 'Generiere…' : '+ Einladungslink erstellen' }}
        </button>
      </div>
      <div class="flex items-center gap-3 text-sm text-gray-400">
        <span>Rolle:</span>
        <select v-model="newUserInviteRole" class="bg-gray-700 rounded-lg px-2 py-1 text-sm text-white">
          <option value="user">Benutzer</option>
          <option value="admin">Administrator</option>
        </select>
        <span class="text-xs text-gray-500">— Link ist 14 Tage gültig, einmalig verwendbar</span>
      </div>

      <div v-if="newUserInviteUrl" class="bg-gray-900 rounded-lg p-3 space-y-2">
        <p class="text-xs text-gray-400">Diesen Link sicher dem neuen Benutzer übermitteln:</p>
        <div class="font-mono text-xs text-green-400 break-all select-all">{{ newUserInviteUrl }}</div>
        <button @click="copyUserInvite" class="btn-secondary text-sm">Kopieren</button>
        <button @click="newUserInviteUrl = ''" class="text-xs text-gray-500 hover:text-gray-300 ml-3">Schließen</button>
      </div>

      <div v-if="userInvites.length" class="space-y-2">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Offene Benutzer-Einladungen</p>
        <div v-for="inv in userInvites" :key="inv.token"
             class="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
          <div>
            <p class="font-mono text-xs text-gray-400">{{ inv.token.slice(0, 16) }}…
              <span class="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    :class="inv.role === 'admin' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-400'">
                {{ inv.role }}
              </span>
            </p>
            <p class="text-xs text-gray-500">
              <span v-if="inv.used_at">Verwendet von <strong>{{ inv.used_by_username || 'unbekannt' }}</strong></span>
              <span v-else>Offen</span>
              · Läuft ab: {{ formatDate(inv.expires_at) }}
              · von {{ inv.created_by_username || '?' }}
            </p>
          </div>
          <button v-if="!inv.used_at" @click="revokeUserInvite(inv.token)"
                  class="text-xs text-gray-500 hover:text-red-400 transition"
                  v-tooltip="'Diesen Einladungslink ungültig machen — er kann danach nicht mehr verwendet werden.'">
            Widerrufen
          </button>
          <span v-else class="text-xs text-gray-600">✓ genutzt</span>
        </div>
      </div>
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
import { ref, computed, onMounted } from 'vue';
import api from '../api.js';
import { useAppStore } from '../store/index.js';
import AppIcon from '../components/AppIcon.vue';
import SortToggle from '../components/SortToggle.vue';
import { useSortDirection } from '../composables/useSortDirection.js';

const app     = useAppStore();
const users   = ref([]);
// Sortierreihenfolge nach last_login pro View in localStorage.
// Default desc (juengster Login zuerst).
const { direction: sortDir } = useSortDirection('users');
// Client-seitige Sortierung — die Userliste pro Tenant ist klein
// genug, dass eine eigene Backend-Route Overkill waere.
// User ohne last_login werden bei desc ans Ende, bei asc an den
// Anfang sortiert (treat-as-0 hat Spezialposition).
const sortedUsers = computed(() => {
  const arr = [...users.value];
  const dir = sortDir.value === 'asc' ? 1 : -1;
  arr.sort((a, b) => ((a.last_login || 0) - (b.last_login || 0)) * dir);
  return arr;
});
const vehicles = ref([]);
const vehicleMap = ref({});  // userId → [{id, display_name}]
const loading  = ref(true);
const resetLink = ref('');
const assignTarget = ref(null);
const showCreate = ref(false);
const createError = ref('');
const creating   = ref(false);
const newUser    = ref({ username: '', password: '', email: '', role: 'user' });

const invites           = ref([]);
const inviteLoading     = ref(false);
const newInviteUrl      = ref('');
const newInviteNote     = ref('');
const editingInviteToken = ref('');
const editingInviteNote  = ref('');
// nowEpoch wird einmal beim Mount gesetzt — fuer „abgelaufen?"-Check in
// der Liste reicht eine Snapshot-Zeit, kein Live-Refresh.
const nowEpoch          = ref(Math.floor(Date.now() / 1000));

async function loadInvites() {
  try { invites.value = (await api.get('/invites')).data; } catch { invites.value = []; }
}

async function generateInvite() {
  inviteLoading.value = true;
  try {
    const note = newInviteNote.value.trim() || undefined;
    const { data } = await api.post('/invites', { note });
    newInviteUrl.value = data.url;
    newInviteNote.value = '';   // Eingabefeld leeren
    await loadInvites();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  } finally { inviteLoading.value = false; }
}

function copyInvite() {
  navigator.clipboard.writeText(newInviteUrl.value);
}

function startEditNote(inv) {
  editingInviteToken.value = inv.token;
  editingInviteNote.value  = inv.note || '';
}

async function saveInviteNote(token) {
  const note = editingInviteNote.value.trim() || null;
  // Edit-Mode bereits beendet (z.B. via Esc) → nichts senden.
  if (editingInviteToken.value !== token) return;
  editingInviteToken.value = '';
  try {
    await api.patch(`/invites/${token}`, { note });
    const inv = invites.value.find(i => i.token === token);
    if (inv) inv.note = note;
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
}

/** „Erneut": neuen Link mit derselben Notiz erzeugen. Den Original-Link
 *  lassen wir unangetastet — er kann bei Bedarf gesperrt/geloescht werden. */
async function reissueInvite(inv) {
  inviteLoading.value = true;
  try {
    const { data } = await api.post('/invites', { note: inv.note || undefined });
    newInviteUrl.value = data.url;
    await loadInvites();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  } finally { inviteLoading.value = false; }
}

async function blockInvite(token) {
  if (!confirm('Einladungslink sperren? Er kann danach nicht mehr verwendet werden, bleibt aber in der Liste sichtbar.')) return;
  await api.post(`/invites/${token}/revoke`);
  await loadInvites();
}

async function deleteInvite(token) {
  if (!confirm('Einladung endgueltig loeschen? Diese Aktion ist nicht umkehrbar.')) return;
  await api.delete(`/invites/${token}`);
  invites.value = invites.value.filter(i => i.token !== token);
}

// User-Invites (gleicher Mandant) — analog zu den Mandanten-Einladungen oben.
const userInvites      = ref([]);
const userInviteLoading = ref(false);
const newUserInviteUrl  = ref('');
const newUserInviteRole = ref('user');

async function loadUserInvites() {
  try { userInvites.value = (await api.get('/users/invite')).data; }
  catch { userInvites.value = []; }
}

async function generateUserInvite() {
  userInviteLoading.value = true;
  try {
    const { data } = await api.post('/users/invite', { role: newUserInviteRole.value });
    newUserInviteUrl.value = data.url;
    await loadUserInvites();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  } finally {
    userInviteLoading.value = false;
  }
}

function copyUserInvite() {
  navigator.clipboard.writeText(newUserInviteUrl.value);
}

async function revokeUserInvite(token) {
  if (!confirm('Benutzer-Einladungslink widerrufen?')) return;
  await api.delete(`/users/invite/${token}`);
  await loadUserInvites();
}

function formatDate(unix) {
  return new Date(unix * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Admin-Tasks (open To-Do-Karte) — laden parallel zur Userliste.
const adminTasks = ref({ usersWithoutVehicle: [] });

async function loadAdminTasks() {
  try {
    const { data } = await api.get('/users/admin-tasks');
    adminTasks.value = data || { usersWithoutVehicle: [] };
  } catch { adminTasks.value = { usersWithoutVehicle: [] }; }
}

/** Permission-Flag setzen — patcht den Backend-User und aktualisiert
 *  die lokale Liste optimistisch (rollback bei Fehler). */
async function setPerm(user, key, value) {
  const before = user[key];
  user[key] = value ? 1 : 0;
  try {
    await api.patch(`/users/${user.id}`, { [key]: !!value });
    await loadAdminTasks();
  } catch (err) {
    user[key] = before;
    alert(err.response?.data?.error || err.message);
  }
}

/** Aus der Admin-Tasks-Karte: zum betroffenen User scrollen und das
 *  Fahrzeug-Zuweisungs-Formular oeffnen. */
function assignFromTask(userId) {
  const target = users.value.find(u => u.id === userId);
  if (!target) return;
  assignVehicleTo(target);
  setTimeout(() => {
    document.getElementById(`user-${userId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

/** Aus der Admin-Tasks-Karte: dem User direkt das Recht „Fahrzeug
 *  anlegen" einraeumen, ohne durch die ganze Liste scrollen zu muessen. */
async function grantAddVehicles(userId) {
  const target = users.value.find(u => u.id === userId);
  if (!target) return;
  await setPerm(target, 'can_add_vehicles', true);
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
  loadAdminTasks();
  loadInvites();
  loadUserInvites();
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
  // Aufgabenliste neu rechnen — User koennte erst- oder letzt-malig
  // ein/kein Fahrzeug haben.
  loadAdminTasks();
}

async function unassignVehicle(userId, vehicleId) {
  await api.delete(`/users/${userId}/vehicles/${vehicleId}`);
  vehicleMap.value[userId] = (vehicleMap.value[userId] || []).filter(v => v.id !== vehicleId);
  loadAdminTasks();
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
    loadAdminTasks();
  } catch (err) {
    createError.value = err.response?.data?.error ?? 'Fehler beim Erstellen';
  } finally {
    creating.value = false;
  }
}
</script>

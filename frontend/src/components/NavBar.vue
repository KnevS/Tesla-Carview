<template>
  <nav class="bg-tesla-gray border-b border-gray-700 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
      <RouterLink to="/" class="flex items-center gap-2 font-bold text-xl"
        v-tooltip="'Zurück zur Startseite'">
        <span class="text-tesla-red">⚡</span> Tesla Carview
      </RouterLink>

      <div class="hidden md:flex items-center gap-1">
        <RouterLink v-for="link in navStore.visibleLinks" :key="link.to" :to="link.to"
          v-tooltip="link.tooltip"
          class="px-4 py-2 rounded-lg text-sm font-medium transition"
          :class="$route.path === link.to ? 'text-white' : 'text-gray-300 hover:bg-gray-700'"
          :style="$route.path === link.to ? { backgroundColor: 'var(--accent)' } : {}"
        >
          {{ link.icon }} {{ link.label }}
        </RouterLink>
      </div>

      <div class="flex items-center gap-3">
        <select v-if="appStore.vehicles.length > 1" v-model="appStore.selectedVehicleId"
          v-tooltip="'Aktives Fahrzeug auswählen – alle Statistiken werden für dieses Fahrzeug angezeigt'"
          class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option v-for="v in appStore.vehicles" :key="v.id" :value="v.id">{{ v.display_name }}</option>
        </select>
        <span v-else-if="appStore.selectedVehicle" class="text-sm text-gray-300"
          v-tooltip="'Aktuell aktives Fahrzeug'">
          {{ appStore.selectedVehicle.display_name }}
        </span>
        <RouterLink v-if="authStore.isAdmin" to="/admin/users"
          class="text-gray-400 hover:text-white transition"
          v-tooltip="'Benutzerverwaltung – Konten anlegen, Fahrzeuge zuweisen, Reset-Links generieren'">
          👥
        </RouterLink>
        <RouterLink v-if="authStore.isAdmin" to="/admin/data"
          class="text-gray-400 hover:text-white transition"
          v-tooltip="'Datenverwaltung – Daten löschen und Datenbestand einsehen'">
          🗑️
        </RouterLink>
        <RouterLink to="/support"
          class="text-gray-400 hover:text-red-400 transition"
          v-tooltip="'Unterstützen – gemeinnützige Organisationen'">
          ❤️
        </RouterLink>
        <RouterLink to="/handbook"
          class="text-gray-400 hover:text-white transition"
          v-tooltip="'Benutzerhandbuch – Anleitungen, FAQ und Tipps zur App'">
          📖
        </RouterLink>
        <RouterLink to="/settings" class="text-gray-400 hover:text-white transition"
          v-tooltip="'Einstellungen, Passwort und Zwei-Faktor-Authentifizierung verwalten'">
          ⚙️
        </RouterLink>
        <button @click="logout"
          class="text-gray-400 hover:text-red-400 transition text-lg leading-none"
          v-tooltip="'Abmelden'">
          ⏻
        </button>
      </div>
    </div>

    <div class="md:hidden flex overflow-x-auto gap-1 px-4 pb-2">
      <RouterLink v-for="link in navStore.visibleLinks" :key="link.to" :to="link.to"
        v-tooltip="link.tooltip"
        class="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition"
        :class="$route.path === link.to ? 'text-white' : 'text-gray-300 hover:bg-gray-700'"
        :style="$route.path === link.to ? { backgroundColor: 'var(--accent)' } : {}"
      >
        {{ link.icon }} {{ link.label }}
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { useRouter }    from 'vue-router';
import { useAppStore }  from '../store/index.js';
import { useAuthStore } from '../store/auth.js';
import { useNavStore }  from '../store/nav.js';
const appStore  = useAppStore();
const authStore = useAuthStore();
const navStore  = useNavStore();
const router    = useRouter();

async function logout() {
  if (!confirm('Wirklich abmelden?')) return;
  await authStore.logout().catch(() => {});
  router.push('/login');
}
</script>

<template>
  <nav class="bg-tesla-gray border-b border-gray-700 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
      <RouterLink to="/" class="flex items-center gap-2 font-bold text-xl"
        v-tooltip="'Zurück zur Startseite'">
        <span class="text-tesla-red">⚡</span> Tesla Carview
      </RouterLink>

      <div class="hidden md:flex items-center gap-1">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to"
          v-tooltip="link.tooltip"
          class="px-4 py-2 rounded-lg text-sm font-medium transition"
          :class="$route.path === link.to ? 'bg-tesla-red text-white' : 'text-gray-300 hover:bg-gray-700'"
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
        <RouterLink to="/settings" class="text-gray-400 hover:text-white transition"
          v-tooltip="'Einstellungen, Passwort und Zwei-Faktor-Authentifizierung verwalten'">
          ⚙️
        </RouterLink>
      </div>
    </div>

    <div class="md:hidden flex overflow-x-auto gap-1 px-4 pb-2">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to"
        v-tooltip="link.tooltip"
        class="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition"
        :class="$route.path === link.to ? 'bg-tesla-red text-white' : 'text-gray-300 hover:bg-gray-700'"
      >
        {{ link.icon }} {{ link.label }}
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { useAppStore } from '../store/index.js';
const appStore = useAppStore();
const links = [
  { to: '/',          icon: '🏠', label: 'Dashboard',    tooltip: 'Übersicht mit Kennzahlen, letzter Fahrt und Monatsstatistik' },
  { to: '/trips',     icon: '🗺️', label: 'Fahrten',      tooltip: 'Liste aller aufgezeichneten Fahrten mit GPS-Track auf einer Karte' },
  { to: '/charging',  icon: '🔋', label: 'Laden',        tooltip: 'Alle Ladevorgänge mit Ladekurven, Kosten und Aufschlüsselung nach Ladertyp' },
  { to: '/battery',   icon: '📊', label: 'Batterie',     tooltip: 'Reichweiten-Verlauf und Degradations-Analyse über Zeit' },
  { to: '/logbook',   icon: '📓', label: 'Betriebsbuch', tooltip: 'Wartungen, Reparaturen, Reifen, Inspektionen und Notizen zum Fahrzeug' },
  { to: '/telemetry', icon: '🏎', label: 'Technik',      tooltip: 'Live-Fahrzeugdaten: Reifendruck, Klima, Leistung, SOC – wie der Track-Mode' },
  { to: '/control',   icon: '🎮', label: 'Steuerung',   tooltip: 'Fahrzeug steuern: Klima, Türen, Laden, Navigation' },
  { to: '/export',    icon: '💾', label: 'Export',       tooltip: 'Daten als CSV/JSON exportieren, Vollbackup erstellen, Push-Benachrichtigungen' },
  { to: '/system',    icon: '📈', label: 'System',       tooltip: 'Versionsinformationen, CPU-/RAM-Auslastung und Datenbankstatistiken' },
];
</script>

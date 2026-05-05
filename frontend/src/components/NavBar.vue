<template>
  <nav class="bg-tesla-gray border-b border-gray-700 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
      <RouterLink to="/" class="flex items-center gap-2 font-bold text-xl">
        <span class="text-tesla-red">⚡</span> Tesla Carview
      </RouterLink>

      <div class="hidden md:flex items-center gap-1">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to"
          class="px-4 py-2 rounded-lg text-sm font-medium transition"
          :class="$route.path === link.to ? 'bg-tesla-red text-white' : 'text-gray-300 hover:bg-gray-700'"
        >
          {{ link.icon }} {{ link.label }}
        </RouterLink>
      </div>

      <div class="flex items-center gap-3">
        <select v-if="appStore.vehicles.length > 1" v-model="appStore.selectedVehicleId"
          class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option v-for="v in appStore.vehicles" :key="v.id" :value="v.id">{{ v.display_name }}</option>
        </select>
        <span v-else-if="appStore.selectedVehicle" class="text-sm text-gray-300">
          {{ appStore.selectedVehicle.display_name }}
        </span>
        <RouterLink to="/settings" class="text-gray-400 hover:text-white transition" title="Einstellungen">
          ⚙️
        </RouterLink>
      </div>
    </div>

    <div class="md:hidden flex overflow-x-auto gap-1 px-4 pb-2">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to"
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
  { to: '/',         icon: '🏠', label: 'Dashboard' },
  { to: '/trips',    icon: '🗺️', label: 'Fahrten' },
  { to: '/charging', icon: '🔋', label: 'Laden' },
  { to: '/battery',  icon: '📊', label: 'Batterie' },
  { to: '/logbook',  icon: '📓', label: 'Betriebsbuch' },
  { to: '/export',   icon: '💾', label: 'Export' },
];
</script>

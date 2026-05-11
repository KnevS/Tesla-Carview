<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <!-- Logo -->
      <RouterLink to="/" class="brand" v-tooltip="$t('auth.handbook')">
        <span class="brand-icon">⚡</span>
        <span class="brand-name">Tesla Carview</span>
      </RouterLink>

      <!-- Desktop: gruppierte Dropdowns -->
      <div class="hidden md:flex items-center gap-1">
        <NavGroup
          v-for="g in visibleGroups"
          :key="g.id"
          :title="$t(`nav.group_${g.id}`)"
          :items="g.items"
          :active="activeGroupId === g.id"
        />
      </div>

      <!-- Rechts: Fahrzeug, Sprache, Handbuch, Einstellungen, Logout -->
      <div class="flex items-center gap-2">
        <select v-if="appStore.vehicles.length > 1" v-model="appStore.selectedVehicleId"
          v-tooltip="'Aktives Fahrzeug auswählen'"
          class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
          <option v-for="v in appStore.vehicles" :key="v.id" :value="v.id">{{ v.display_name }}</option>
        </select>
        <span v-else-if="appStore.selectedVehicle" class="text-sm text-gray-300 truncate max-w-[8rem]"
          v-tooltip="appStore.selectedVehicle.display_name">
          🚗 {{ appStore.selectedVehicle.display_name }}
        </span>

        <LangSwitcher compact />

        <RouterLink to="/handbook" class="icon-btn" v-tooltip="$t('auth.handbook')">📖</RouterLink>
        <RouterLink to="/settings" class="icon-btn" v-tooltip="$t('settings.title')">⚙️</RouterLink>
        <button @click="logout" class="icon-btn icon-btn-danger" v-tooltip="$t('common.logout')">⏻</button>
      </div>
    </div>

    <!-- Mobile: horizontale Scroll-Leiste mit allen sichtbaren Items (flach) -->
    <div class="md:hidden flex overflow-x-auto gap-1 px-4 pb-2">
      <RouterLink v-for="link in mobileLinks" :key="link.to" :to="link.to"
        v-tooltip="link.tooltip"
        class="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition"
        :class="$route.path === link.to ? 'active-mobile' : 'text-gray-300 hover:bg-gray-700'"
        :style="$route.path === link.to ? { backgroundColor: 'var(--accent)' } : {}"
      >
        {{ link.icon }} {{ link.label }}
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppStore }  from '../store/index.js';
import { useAuthStore } from '../store/auth.js';
import { useNavStore, NAV_GROUPS } from '../store/nav.js';
import NavGroup     from './NavGroup.vue';
import LangSwitcher from './LangSwitcher.vue';

const appStore  = useAppStore();
const authStore = useAuthStore();
const navStore  = useNavStore();
const router    = useRouter();
const route     = useRoute();
const { t }     = useI18n();

// Beim Mount: stelle sicher, dass die persistierte Reihenfolge alle
// aktuell bekannten Routen kennt (App-Updates fuegen evtl. neue hinzu).
onMounted(() => navStore.sync());

/** Items mit i18n-Labels/Tooltips anreichern. Fallback: das hartkodierte
 *  Label/Tooltip aus der Store-Definition. */
function localize(items) {
  return items.map(it => ({
    ...it,
    label:   it.label   ?? t(`nav.${it.key}.label`),
    tooltip: it.tooltip ?? (() => { const k = `nav.${it.key}.tooltip`; const v = t(k); return v === k ? '' : v; })(),
  }));
}

/** Gruppen kommen aus dem Store — er filtert admin-only Items, wendet
 *  die user-spezifische Reihenfolge an und entfernt versteckte Punkte.
 *  Damit zeigt die NavBar exakt, was der User in Settings konfiguriert. */
const visibleGroups = computed(() =>
  navStore.visibleGroups.map(g => ({ ...g, items: localize(g.items) }))
);

/** Aktive Gruppe = jene mit dem aktuellen Route-Pfad — für Highlighting */
const activeGroupId = computed(() => {
  const p = route.path;
  for (const g of NAV_GROUPS) {
    if (g.items.some(it => it.to === p)) return g.id;
  }
  return null;
});

/** Mobile: flache Liste aller sichtbaren Items (auch user-gefiltert) */
const mobileLinks = computed(() => localize(navStore.visibleLinks));

async function logout() {
  if (!confirm(t('common.logout') + '?')) return;
  await authStore.logout().catch(() => {});
  router.push('/login');
}
</script>

<style scoped>
.navbar {
  background: var(--card-bg, #1f2937);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: saturate(150%) blur(8px);
}
.navbar-inner {
  max-width: 80rem;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.05rem;
  text-decoration: none;
  color: inherit;
  letter-spacing: -0.01em;
}
.brand-icon { color: var(--accent, #ef4444); font-size: 1.3rem; }
.brand-name { white-space: nowrap; }

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  min-width: 2rem;
  padding: 0 0.5rem;
  border-radius: 0.5rem;
  color: rgba(229,231,235,0.75);
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  text-decoration: none;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 1rem;
}
.icon-btn:hover { background: rgba(255,255,255,0.07); color: white; }
.icon-btn:active { transform: scale(0.96); }
.icon-btn-danger:hover { color: #fca5a5; }

.active-mobile {
  color: white;
  font-weight: 600;
}

</style>

<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <!-- Logo -->
      <RouterLink to="/" class="brand" v-tooltip="$t('auth.handbook')">
        <span class="brand-icon"><AppIcon name="bolt" :size="20" /></span>
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
        <!-- Mehrfach-Fahrzeuge: Silhouette + Dropdown. Bei nur einem
             Fahrzeug eine Chip-Anzeige mit Silhouette in echter
             Lackfarbe statt des generischen Auto-Emojis. -->
        <div v-if="appStore.vehicles.length > 1" class="flex items-center gap-2"
             v-tooltip="'Aktives Fahrzeug auswählen'">
          <VehicleSilhouette v-if="appStore.selectedVehicle"
            :model="appStore.selectedVehicle.model"
            :color="appStore.selectedVehicle.image_color"
            :width="32" :height="18" />
          <select v-model="appStore.selectedVehicleId"
            class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
            <option v-for="v in appStore.vehicles" :key="v.id" :value="v.id">{{ v.display_name }}</option>
          </select>
        </div>
        <span v-else-if="appStore.selectedVehicle"
              class="flex items-center gap-2 text-sm text-gray-200 truncate max-w-[10rem]"
              v-tooltip="appStore.selectedVehicle.display_name">
          <VehicleSilhouette
            :model="appStore.selectedVehicle.model"
            :color="appStore.selectedVehicle.image_color"
            :width="32" :height="18" />
          <span class="truncate">{{ appStore.selectedVehicle.display_name }}</span>
        </span>

        <LangSwitcher compact />

        <RouterLink to="/handbook" class="icon-btn" v-tooltip="$t('auth.handbook')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </RouterLink>
        <RouterLink to="/settings" class="icon-btn" v-tooltip="$t('settings.title')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </RouterLink>
        <button @click="logout" class="icon-btn icon-btn-danger" v-tooltip="$t('common.logout')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile: Navigation uebernimmt MobileTabBar.vue (Bottom Tab Bar).
         Kein horizontaler Scroll-Streifen mehr — wird durch den
         iOS-style Tab Bar in App.vue ersetzt. -->
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
import VehicleSilhouette from './VehicleSilhouette.vue';
import AppIcon from './AppIcon.vue';

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

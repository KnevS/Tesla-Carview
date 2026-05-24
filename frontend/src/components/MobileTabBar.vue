<template>
  <!-- iOS-style Bottom Tab Bar — nur auf Mobile sichtbar (md:hidden).
       5 fixierte Haupt-Punkte + "Mehr"-Button der alle anderen Routen
       aufklappt. Respektiert env(safe-area-inset-bottom) fuer Dynamic
       Island / Home-Indicator. Ersetzt den horizontalen Scroll-Streifen
       in der NavBar. -->
  <nav v-if="authStore.isAuthenticated" class="mobile-tab-bar md:hidden" role="tablist">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="mtb-btn"
      :class="{ active: isActive(tab) }"
      :aria-label="tab.label"
      role="tab"
    >
      <span class="mtb-icon">
        <AppIcon :name="tab.icon" :size="22" />
        <!-- Aktiv-Indikator — kleines Pill über dem Icon -->
        <span v-if="isActive(tab)" class="mtb-active-pill"></span>
      </span>
      <span class="mtb-label">{{ tab.label }}</span>
    </RouterLink>

    <!-- Mehr-Button: öffnet Bottom Sheet mit allen restlichen Routen -->
    <button class="mtb-btn" :class="{ active: isMoreActive }" @click="showMore = true" role="tab" :aria-label="$t('nav.more') || 'Mehr'">
      <span class="mtb-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
        <span v-if="isMoreActive" class="mtb-active-pill"></span>
      </span>
      <span class="mtb-label">{{ $t('nav.more') || 'Mehr' }}</span>
    </button>

    <!-- Bottom Sheet — alle weiteren Routen + System-Aktionen -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showMore" class="mtb-sheet-backdrop" @click.self="showMore = false">
          <div class="mtb-sheet" role="dialog">
            <!-- Handle zum Swipen -->
            <div class="mtb-sheet-handle"></div>

            <!-- Fahrzeug-Selector (nur wenn > 1 Fahrzeug) -->
            <div v-if="appStore.vehicles.length > 1" class="mtb-vehicle-row">
              <VehicleSilhouette v-if="appStore.selectedVehicle"
                :model="appStore.selectedVehicle.model"
                :color="appStore.selectedVehicle.image_color"
                :width="28" :height="16" />
              <select v-model="appStore.selectedVehicleId"
                class="mtb-vehicle-select">
                <option v-for="v in appStore.vehicles" :key="v.id" :value="v.id">{{ v.display_name }}</option>
              </select>
            </div>
            <!-- Einzelnes Fahrzeug: Name anzeigen -->
            <div v-else-if="appStore.selectedVehicle" class="mtb-vehicle-label">
              <VehicleSilhouette
                :model="appStore.selectedVehicle.model"
                :color="appStore.selectedVehicle.image_color"
                :width="28" :height="16" />
              <span>{{ appStore.selectedVehicle.display_name }}</span>
            </div>

            <div class="mtb-sheet-title">{{ $t('nav.allSections') || 'Alle Bereiche' }}</div>

            <div class="mtb-sheet-grid">
              <RouterLink
                v-for="link in extraLinks"
                :key="link.to"
                :to="link.to"
                class="mtb-sheet-item"
                :class="{ active: route.path === link.to }"
                @click="showMore = false"
              >
                <span class="mtb-sheet-icon">
                  <AppIcon :name="link.icon" :size="20" />
                </span>
                <span class="mtb-sheet-label">{{ link.label }}</span>
              </RouterLink>
            </div>

            <!-- Trennlinie + System-Aktionen -->
            <div class="mtb-sheet-divider"></div>
            <div class="mtb-sheet-actions">
              <RouterLink to="/handbook" class="mtb-action-btn" @click="showMore = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>{{ $t('auth.handbook') || 'Handbuch' }}</span>
              </RouterLink>
              <RouterLink to="/settings" class="mtb-action-btn" @click="showMore = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span>{{ $t('settings.title') || 'Einstellungen' }}</span>
              </RouterLink>
              <button class="mtb-action-btn mtb-action-logout" @click="logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>{{ $t('common.logout') || 'Ausloggen' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import { useNavStore, NAV_GROUPS } from '../store/nav.js';
import AppIcon from './AppIcon.vue';
import VehicleSilhouette from './VehicleSilhouette.vue';

const authStore = useAuthStore();
const appStore  = useAppStore();
const navStore  = useNavStore();
const route     = useRoute();
const router    = useRouter();
const { t }     = useI18n();

const showMore = ref(false);

// Die 4 wichtigsten Tabs — immer sichtbar
const TAB_KEYS = ['dashboard', 'trips', 'charging', 'control', 'routes'];

const allLinks = computed(() =>
  NAV_GROUPS.flatMap(g => g.items).map(it => ({
    ...it,
    label: it.label ?? t(`nav.${it.key}.label`, it.label),
  }))
);

const tabs = computed(() =>
  TAB_KEYS
    .map(k => allLinks.value.find(l => l.key === k))
    .filter(Boolean)
    .slice(0, 4) // max 4 + Mehr-Button = 5 gesamt
);

const extraLinks = computed(() =>
  allLinks.value.filter(l => !TAB_KEYS.slice(0, 4).includes(l.key))
);

function isActive(tab) {
  if (tab.to === '/') return route.path === '/';
  return route.path.startsWith(tab.to);
}

async function logout() {
  showMore.value = false;
  if (!confirm(t('common.logout') + '?')) return;
  await authStore.logout().catch(() => {});
  router.push('/login');
}

const isMoreActive = computed(() =>
  extraLinks.value.some(l => route.path.startsWith(l.to))
);
</script>

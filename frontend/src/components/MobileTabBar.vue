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

    <!-- Bottom Sheet — alle weiteren Routen -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showMore" class="mtb-sheet-backdrop" @click.self="showMore = false">
          <div class="mtb-sheet" role="dialog">
            <!-- Handle -->
            <div class="mtb-sheet-handle"></div>
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
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth.js';
import { useNavStore, NAV_GROUPS } from '../store/nav.js';
import AppIcon from './AppIcon.vue';

const authStore = useAuthStore();
const navStore  = useNavStore();
const route     = useRoute();
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

const isMoreActive = computed(() =>
  extraLinks.value.some(l => route.path.startsWith(l.to))
);
</script>

<template>
  <!-- Zentrale SVG-Icon-Component. Eigene Pfade im Lucide-Stil
       (24×24, stroke-width 2, rounded). Reine geometrische Primitive
       — kein Drittanbieter-Asset, kein Markenuebernahme. Wird in
       NavBar, NavGroup, Dashboard-Tiles, Settings-Headern etc.
       verwendet, damit alle Icons konsistent aus EINER Quelle kommen.

       Usage:
         <AppIcon name="home" />
         <AppIcon name="home" :size="20" />
         <AppIcon name="map" class="text-tesla-red" />

       Unbekannte Namen werden als reiner Text gerendert (Fallback) —
       laesst sich also schrittweise einfuehren, ohne Bestands-Emojis
       zu brechen. -->
  <svg v-if="path" :width="size" :height="size" viewBox="0 0 24 24"
       fill="none" stroke="currentColor"
       :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"
       class="app-icon inline-block align-middle"
       :aria-label="name" role="img">
    <component :is="'g'" v-html="path" />
  </svg>
  <span v-else class="app-icon-fallback">{{ name }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { ICONS } from '../lib/icons.js';

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  strokeWidth: { type: [Number, String], default: 2 },
});

/**
 * Icon-Set wird aus lib/icons.js importiert, damit auch Stellen, die
 * SVG als Raw-String in einen v-html-Kontext injizieren (z.B.
 * Handbook.vue rendert Markdown → HTML und ersetzt fuehrende Emoji
 * in Section-Headers durch das passende Icon) ohne Vue-Komponenten-
 * Schicht auf dieselbe Pfad-Definition zugreifen koennen.
 */
const path = computed(() => ICONS[props.name] || null);
</script>

<style scoped>
.app-icon { display: inline-block; flex-shrink: 0; vertical-align: -0.125em; }
.app-icon-fallback { display: inline-block; line-height: 1; }
</style>

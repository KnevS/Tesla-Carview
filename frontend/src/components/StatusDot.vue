<template>
  <!-- Lebendiger Status-Indikator. Drei Farben:
        - status="online"   → gruener Puls
        - status="warning"  → gelber Puls
        - status="offline"  → rot-grauer Puls (oder dezent statisch)
        Optional: status="static" — kein Puls, nur Farbpunkt. -->
  <span class="inline-flex items-center gap-1.5">
    <span
      :class="[
        'rounded-full',
        size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5',
        animated ? dotClass : staticClass,
      ]"
      aria-hidden="true" />
    <span v-if="$slots.default" class="text-sm text-gray-300">
      <slot />
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status:   { type: String, default: 'online' }, // online | warning | offline | static
  size:     { type: String, default: 'md' },     // sm | md | lg
  animated: { type: Boolean, default: true },
});

const dotClass = computed(() => ({
  online:  'pulse-dot',
  warning: 'pulse-dot pulse-dot--yellow',
  offline: 'pulse-dot pulse-dot--red',
  static:  'bg-gray-500',
}[props.status] || 'pulse-dot'));

const staticClass = computed(() => ({
  online:  'bg-green-500',
  warning: 'bg-yellow-400',
  offline: 'bg-red-500',
  static:  'bg-gray-500',
}[props.status] || 'bg-gray-500'));
</script>

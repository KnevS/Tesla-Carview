<template>
  <!-- Sort-Toggle fuer chronologische Listen.
       Klick = Richtung umkehren. v-model:direction (asc|desc).
       Wird mit useSortDirection (composables) gekoppelt, damit
       die Praeferenz je View in localStorage liegt.

       Usage:
         <SortToggle v-model:direction="sortDir" />
  -->
  <button
    type="button"
    @click="onClick"
    class="btn-secondary text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
    :aria-pressed="direction === 'asc'"
    :aria-label="label"
    :title="tooltip"
  >
    <AppIcon :name="direction === 'desc' ? 'arrow-down' : 'arrow-up'" :size="16" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  // 'desc' = neueste zuerst (Default), 'asc' = aelteste zuerst.
  direction: { type: String, required: true, validator: (v) => v === 'asc' || v === 'desc' },
});

const emit = defineEmits(['update:direction']);

const { t } = useI18n();

const label = computed(() =>
  props.direction === 'desc' ? t('common.sortNewestFirst') : t('common.sortOldestFirst')
);

const tooltip = computed(() => t('common.sortToggleTooltip'));

function onClick() {
  emit('update:direction', props.direction === 'desc' ? 'asc' : 'desc');
}
</script>

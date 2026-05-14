<template>
  <div
    class="sortable-section"
    :class="{
      'drag-over-before': isDragOver && dragPos === 'before',
      'drag-over-after':  isDragOver && dragPos === 'after',
      'is-dragging':      dragging,
    }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.stop="onDrop"
    @dragend="onDragEnd"
  >
    <!-- Header (immer sichtbar, als Drag-Handle) -->
    <div
      class="section-header card flex items-center gap-2 cursor-default select-none"
      :class="[
        collapsed ? '' : 'rounded-b-none border-b-transparent',
        'py-2.5 px-3'
      ]"
      :draggable="sortable"
      @dragstart.stop="onDragStart"
    >
      <!-- Grip-Handle -->
      <span
        v-if="sortable" class="flex-shrink-0 flex flex-col gap-[3px] cursor-grab active:cursor-grabbing opacity-30 hover:opacity-70 transition-opacity touch-none"
        title="Ziehen zum Umsortieren"
        @mousedown.stop
      >
        <span class="block w-3.5 h-[2px] bg-current rounded"></span>
        <span class="block w-3.5 h-[2px] bg-current rounded"></span>
        <span class="block w-3.5 h-[2px] bg-current rounded"></span>
      </span>

      <!-- Icon + Titel -->
      <span v-if="icon" class="flex-shrink-0 text-base leading-none">{{ icon }}</span>
      <h2 class="flex-1 font-semibold text-sm md:text-base truncate">{{ title }}</h2>

      <!-- Badge-Slot (z.B. Anzahl-Chips) -->
      <slot name="badge" />

      <!-- Einklappen-Button -->
      <button
        @click.stop="$emit('toggle')"
        class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition"
        :title="collapsed ? 'Aufklappen' : 'Einklappen'"
      >
        <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': !collapsed }"
          viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <!-- Body (kollabierbar) -->
    <transition name="section-body">
      <div
        v-show="!collapsed"
        class="section-content card rounded-t-none border-t-0"
      >
        <slot />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { _dragState } from '../composables/usePageLayout.js';

const props = defineProps({
  pageId:    { type: String, required: true },
  sectionId: { type: String, required: true },
  title:     { type: String, required: true },
  icon:      { type: String, default: '' },
  collapsed: { type: Boolean, default: true },
  sortable:  { type: Boolean, default: true },
});

const emit = defineEmits(['toggle', 'move']);

const dragging  = ref(false);
const isDragOver = ref(false);
const dragPos   = ref(null); // 'before' | 'after'

function onDragStart(e) {
  dragging.value = true;
  _dragState.pageId    = props.pageId;
  _dragState.sectionId = props.sectionId;
  e.dataTransfer.effectAllowed = 'move';
  // Fallback für Browser die setData lesen können
  try {
    e.dataTransfer.setData('text/plain', `${props.pageId}:${props.sectionId}`);
  } catch { /* ignore */ }
}

function onDragEnd() {
  dragging.value  = false;
  isDragOver.value = false;
  dragPos.value   = null;
  _dragState.pageId    = null;
  _dragState.sectionId = null;
}

function onDragOver(e) {
  if (_dragState.pageId !== props.pageId) return;
  if (_dragState.sectionId === props.sectionId) return;
  isDragOver.value = true;
  const rect = e.currentTarget.getBoundingClientRect();
  dragPos.value = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function onDragLeave(e) {
  // Nur wenn tatsächlich das Element verlassen wird (nicht ein Kind-Element)
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragOver.value = false;
    dragPos.value   = null;
  }
}

function onDrop(e) {
  e.preventDefault();
  const fromId = _dragState.sectionId;
  const fromPage = _dragState.pageId;
  isDragOver.value = false;
  if (!fromId || fromPage !== props.pageId || fromId === props.sectionId) return;
  emit('move', fromId, props.sectionId, dragPos.value ?? 'before');
  dragPos.value = null;
}
</script>

<style scoped>
.sortable-section {
  position: relative;
  transition: opacity 0.15s ease;
}

.is-dragging {
  opacity: 0.4;
}

/* Einrücklinie vor/nach dem Element während Drag */
.drag-over-before::before,
.drag-over-after::after {
  content: '';
  display: block;
  height: 2px;
  background: var(--accent, #E31937);
  border-radius: 99px;
  position: absolute;
  left: 8px; right: 8px;
  z-index: 10;
}
.drag-over-before::before { top: -2px; }
.drag-over-after::after   { bottom: -2px; }

/* Collapse-Animation */
.section-body-enter-active,
.section-body-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
  max-height: 2000px;
}
.section-body-enter-from,
.section-body-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Header: untere Ränder entfernen wenn Content sichtbar */
.section-header {
  margin-bottom: 0 !important;
}
.section-content {
  padding-top: 1rem;
}
</style>

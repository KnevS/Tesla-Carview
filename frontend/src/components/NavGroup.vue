<template>
  <div
    class="nav-group"
    ref="rootEl"
    @mouseenter="onHoverEnter"
    @mouseleave="onHoverLeave"
  >
    <button
      type="button"
      class="nav-group-trigger"
      :class="{ active }"
      @click="onTriggerClick"
      @focus="onFocus"
      :aria-expanded="open"
      :aria-haspopup="'menu'"
    >
      <span class="nav-group-title">{{ title }}</span>
      <span class="nav-group-caret" :class="{ rotated: open }" aria-hidden="true">▾</span>
    </button>

    <transition name="nav-slide">
      <div v-if="open" class="nav-group-menu" role="menu">
        <RouterLink
          v-for="it in items"
          :key="it.to"
          :to="it.to"
          class="nav-group-item"
          :class="{ 'is-current': $route.path === it.to }"
          v-tooltip="it.tooltip"
          @click="closeNow"
        >
          <!-- AppIcon rendert den benannten SVG; Fallback auf Emoji bei
               unbekanntem Namen wuerde im AppIcon-Komponenten-Code
               passieren, aber wir setzen ihn hier auch nochmal als
               Belt-and-Suspenders. -->
          <AppIcon :name="it.icon" :size="18" class="nav-group-item-icon" />
          <span class="nav-group-item-label">{{ it.label }}</span>
        </RouterLink>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from './AppIcon.vue';

defineProps({
  title:  { type: String,  required: true },
  items:  { type: Array,   required: true },
  active: { type: Boolean, default: false },
});

const open   = ref(false);
const rootEl = ref(null);
const route  = useRoute();

// Pointer-Type-Detection: nur echte Maus-Geräte triggern Hover-Open.
// Touch- und Pen-Eingaben fallen auf Click-Open zurück (Tap öffnet, zweiter Tap schließt).
const hasFineHover = (typeof window !== 'undefined') &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let openTimer  = null;
let closeTimer = null;
const OPEN_DELAY  = 60;   // kurze Verzögerung gegen versehentliches Hover-Streifen
const CLOSE_DELAY = 220;  // großzügig — Maus darf vom Trigger zum Menü wandern

function clearTimers() {
  if (openTimer)  { clearTimeout(openTimer);  openTimer  = null; }
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
}
function openNow()  { clearTimers(); open.value = true;  }
function closeNow() { clearTimers(); open.value = false; }

function onHoverEnter() {
  if (!hasFineHover) return;
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  if (open.value) return;
  openTimer = setTimeout(() => { open.value = true; openTimer = null; }, OPEN_DELAY);
}
function onHoverLeave() {
  if (!hasFineHover) return;
  if (openTimer) { clearTimeout(openTimer); openTimer = null; }
  closeTimer = setTimeout(() => { open.value = false; closeTimer = null; }, CLOSE_DELAY);
}
function onTriggerClick() {
  // Touch / Click: Toggle. Auf Hover-Geräten wirkt das wie ein Pin/Unpin.
  clearTimers();
  open.value = !open.value;
}
function onFocus() {
  // Tastatur-Navigation: beim Fokus auf Trigger Menü öffnen.
  openNow();
}

function onDocClick(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) closeNow();
}
function onKey(e) { if (e.key === 'Escape') closeNow(); }

// Beim Routenwechsel das Menü zu — verhindert hängenbleibendes Dropdown
watch(() => route.path, () => { closeNow(); });

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  clearTimers();
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
.nav-group { position: relative; }
.nav-group-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 2.2rem;
  padding: 0 0.85rem;
  border-radius: 0.55rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(229,231,235,0.85);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}
.nav-group-trigger:hover { background: rgba(255,255,255,0.06); color: white; }
.nav-group-trigger:active { transform: scale(0.98); }
.nav-group-trigger.active {
  color: white;
  background: var(--accent, #ef4444);
  box-shadow: 0 6px 16px rgba(239,68,68,0.18);
}

.nav-group-title { letter-spacing: -0.005em; }
.nav-group-caret {
  font-size: 0.75rem;
  opacity: 0.7;
  transition: transform 0.15s ease;
}
.nav-group-caret.rotated { transform: rotate(180deg); }

.nav-group-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 0.4rem);
  min-width: 14rem;
  padding: 0.35rem;
  background: var(--card-bg, #1e293b);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.7rem;
  box-shadow: 0 18px 48px rgba(0,0,0,0.4);
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.nav-group-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.7rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: rgba(229,231,235,0.92);
  font-size: 0.92rem;
  transition: background 0.12s ease, color 0.12s ease;
}
.nav-group-item:hover { background: rgba(255,255,255,0.07); color: white; }
.nav-group-item.is-current {
  background: rgba(99,102,241,0.18);
  outline: 1px solid rgba(99,102,241,0.4);
  color: white;
}
.nav-group-item-icon { width: 1.4rem; height: 1.4rem; flex-shrink: 0; opacity: 0.85; }
.nav-group-item:hover .nav-group-item-icon { opacity: 1; }
.nav-group-item-label { flex: 1; }

/* Slide-Animation: gleitet sanft aus dem Trigger heraus nach unten,
 * etwas schneller raus als rein damit Folge-Hovers responsiv wirken.
 * `transform-origin: top` macht das Slide visuell wie ein Aufrollen aus
 * der NavBar, kein Drüberknallen. */
.nav-slide-enter-active {
  transition: opacity 0.18s ease-out, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.nav-slide-leave-active {
  transition: opacity 0.13s ease-in, transform 0.18s cubic-bezier(0.4, 0, 1, 1);
}
.nav-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.94);
  transform-origin: top center;
}
.nav-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px) scaleY(0.96);
  transform-origin: top center;
}
@media (prefers-reduced-motion: reduce) {
  .nav-slide-enter-active, .nav-slide-leave-active { transition: opacity 0.1s ease; }
  .nav-slide-enter-from, .nav-slide-leave-to { transform: none; }
  .nav-group-caret { transition: none; }
}

</style>

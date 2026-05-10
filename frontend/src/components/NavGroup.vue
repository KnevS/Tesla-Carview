<template>
  <div class="nav-group" ref="rootEl">
    <button
      type="button"
      class="nav-group-trigger"
      :class="{ active }"
      @click="open = !open"
      :aria-expanded="open"
      :aria-haspopup="'menu'"
    >
      <span class="nav-group-title">{{ title }}</span>
      <span class="nav-group-caret" :class="{ rotated: open }" aria-hidden="true">▾</span>
    </button>

    <transition name="nav-pop">
      <div v-if="open" class="nav-group-menu" role="menu">
        <RouterLink
          v-for="it in items"
          :key="it.to"
          :to="it.to"
          class="nav-group-item"
          :class="{ 'is-current': $route.path === it.to }"
          v-tooltip="it.tooltip"
          @click="open = false"
        >
          <span class="nav-group-item-icon" aria-hidden="true">{{ it.icon }}</span>
          <span class="nav-group-item-label">{{ it.label }}</span>
        </RouterLink>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';

defineProps({
  title:  { type: String,  required: true },
  items:  { type: Array,   required: true },
  active: { type: Boolean, default: false },
});

const open   = ref(false);
const rootEl = ref(null);
const route  = useRoute();

function onDocClick(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false;
}
function onKey(e) { if (e.key === 'Escape') open.value = false; }

// Beim Routenwechsel das Menü zu — verhindert hängenbleibendes Dropdown
watch(() => route.path, () => { open.value = false; });

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
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
.nav-group-item-icon { font-size: 1.05rem; width: 1.4rem; text-align: center; }
.nav-group-item-label { flex: 1; }

.nav-pop-enter-active, .nav-pop-leave-active { transition: opacity 0.13s ease, transform 0.13s ease; }
.nav-pop-enter-from { opacity: 0; transform: translateY(-4px) scale(0.98); }
.nav-pop-leave-to   { opacity: 0; transform: translateY(-2px); }
@media (prefers-reduced-motion: reduce) {
  .nav-pop-enter-active, .nav-pop-leave-active { transition: none; }
  .nav-group-caret { transition: none; }
}

@media (prefers-color-scheme: light) {
  .nav-group-trigger { color: rgba(31,41,55,0.85); }
  .nav-group-trigger:hover { background: rgba(0,0,0,0.06); color: black; }
  .nav-group-menu { background: #ffffff; border-color: rgba(0,0,0,0.08); box-shadow: 0 18px 48px rgba(0,0,0,0.18); }
  .nav-group-item { color: rgba(31,41,55,0.95); }
  .nav-group-item:hover { background: rgba(0,0,0,0.05); color: black; }
}
</style>

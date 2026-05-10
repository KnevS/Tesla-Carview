<template>
  <div class="relative" ref="rootEl">
    <button
      type="button"
      class="lang-trigger"
      :class="{ compact }"
      @click="open = !open"
      :aria-label="$t('lang.switcher')"
      :title="$t('lang.switcher')"
    >
      <span class="text-base leading-none">🌐</span>
      <span class="ml-1 text-sm font-medium tracking-wide">{{ currentLang.code.toUpperCase() }}</span>
      <span class="ml-0.5 text-xs opacity-70" aria-hidden="true">▾</span>
    </button>

    <transition name="lang-pop">
      <ul v-if="open" class="lang-menu" role="listbox" :aria-label="$t('lang.switcher')">
        <li
          v-for="l in LANGS"
          :key="l.code"
          role="option"
          :aria-selected="l.code === current"
          class="lang-item"
          :class="{ active: l.code === current }"
          @click="choose(l.code)"
        >
          <span class="text-lg leading-none">{{ l.flag }}</span>
          <span class="flex-1 text-sm">{{ l.label }}</span>
          <span class="text-xs uppercase opacity-60">{{ l.code }}</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useLangStore, LANGS } from '../store/lang.js';
import { useAuthStore } from '../store/auth.js';

defineProps({
  /** Compact = nur Globe + Code; Standard zeigt etwas mehr Padding für die NavBar */
  compact: { type: Boolean, default: false },
});

const langStore = useLangStore();
const authStore = useAuthStore();
const open      = ref(false);
const rootEl    = ref(null);

const current     = computed(() => langStore.current);
const currentLang = computed(() => LANGS.find(l => l.code === current.value) || LANGS[0]);

function choose(code) {
  // Profil-Persistenz nur für eingeloggte User; auf Login-Seite bleibt's lokal.
  langStore.setLang(code, { persistToProfile: !!authStore.token });
  open.value = false;
}

function onDocClick(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false;
}
function onKey(e) { if (e.key === 'Escape') open.value = false; }

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
.lang-trigger {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border-radius: 0.6rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: inherit;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  cursor: pointer;
}
.lang-trigger:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
.lang-trigger:active { transform: scale(0.98); }
.lang-trigger.compact { padding: 0.3rem 0.5rem; }

.lang-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  min-width: 11rem;
  padding: 0.3rem;
  background: var(--card-bg, #1e293b);
  color: inherit;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.7rem;
  box-shadow: 0 12px 32px rgba(0,0,0,0.35);
  list-style: none;
  margin: 0;
  z-index: 50;
}
.lang-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.7rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.12s ease;
}
.lang-item:hover { background: rgba(255,255,255,0.07); }
.lang-item.active {
  background: rgba(99,102,241,0.18);
  outline: 1px solid rgba(99,102,241,0.4);
}

/* Light-Mode-Komfort */
@media (prefers-color-scheme: light) {
  .lang-trigger { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.08); }
  .lang-trigger:hover { background: rgba(0,0,0,0.07); }
  .lang-menu { background: #fff; border-color: rgba(0,0,0,0.08); }
  .lang-item:hover { background: rgba(0,0,0,0.05); }
}

/* sanftes Pop-In, prefers-reduced-motion respektieren */
.lang-pop-enter-active, .lang-pop-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.lang-pop-enter-from { opacity: 0; transform: translateY(-4px) scale(0.98); }
.lang-pop-leave-to   { opacity: 0; transform: translateY(-2px); }
@media (prefers-reduced-motion: reduce) {
  .lang-pop-enter-active, .lang-pop-leave-active { transition: none; }
}
</style>

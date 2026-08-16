<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <transition name="throttle-fade">
    <div v-if="visible" class="throttle-notice" role="status" aria-live="polite">
      <span class="throttle-dot" aria-hidden="true"></span>
      <span>{{ $t('common.throttled') }}</span>
    </div>
  </transition>
</template>

<script setup>
/**
 * Kleiner, nicht blockierender Hinweis waehrend einer Drosselung (HTTP 429).
 *
 * Der Interceptor in api.js wiederholt gedrosselte Requests selbst — dieser
 * Hinweis sagt dem User nur, dass gerade gewartet wird, damit eine kurz
 * unvollstaendige Seite nicht wie ein Fehler aussieht.
 *
 * Bewusst ohne Ursachen-Behauptung: der Browser sieht nur, DASS gedrosselt
 * wird. Ob das der Reverse-Proxy oder das App-Limit war, kann er nicht
 * unterscheiden — also behaupten wir es auch nicht.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';

// Nachlauf, damit der Hinweis bei mehreren gestaffelten Retries nicht
// flackert, aber auch nicht laenger steht als noetig.
const LINGER_MS = 2_000;

const visible = ref(false);
let hideTimer = null;

function onThrottled() {
  visible.value = true;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { visible.value = false; }, LINGER_MS);
}

onMounted(() => window.addEventListener('api-throttled', onThrottled));
onBeforeUnmount(() => {
  window.removeEventListener('api-throttled', onThrottled);
  clearTimeout(hideTimer);
});
</script>

<style scoped>
.throttle-notice {
  position: fixed;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: min(22rem, calc(100vw - 2rem));
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.5rem;
  background: rgba(23, 26, 32, 0.94);
  color: #d7dae0;
  font-size: 0.8125rem;
  line-height: 1.3;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

/* Auf Mobile sitzt die Tab-Bar unten — Hinweis darueber schieben. */
@media (max-width: 767px) {
  .throttle-notice { bottom: calc(5rem + env(safe-area-inset-bottom, 0px)); }
}

.throttle-dot {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #f0a020;
  animation: throttle-pulse 1.2s ease-in-out infinite;
}

@keyframes throttle-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .throttle-dot { animation: none; }
}

.throttle-fade-enter-active,
.throttle-fade-leave-active { transition: opacity 0.2s ease; }
.throttle-fade-enter-from,
.throttle-fade-leave-to { opacity: 0; }
</style>

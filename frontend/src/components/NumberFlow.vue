<template>
  <span :class="$attrs.class">{{ display }}</span>
</template>

<script setup>
/**
 * Animiertes Count-Up fuer KPI-Zahlen. Beim ersten Mount zaehlt der
 * Wert von 0 auf den Zielwert hoch (≈ 800ms). Bei Wertaenderungen
 * danach laeuft eine kurze 350ms-Anpassung.
 *
 * - duration: ms fuer den initialen Count-Up
 * - decimals: Anzahl Nachkommastellen
 * - locale:   'de-DE' o.ae., fuers Tausender-/Dezimalformat
 * - respektiert prefers-reduced-motion (kein Easing, springt direkt
 *   auf den Endwert).
 */
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  value:    { type: [Number, String], default: 0 },
  duration: { type: Number, default: 800 },
  decimals: { type: Number, default: 0 },
  locale:   { type: String, default: 'de-DE' },
  suffix:   { type: String, default: '' },
  prefix:   { type: String, default: '' },
});

const display   = ref(props.prefix + format(0) + props.suffix);
const internal  = ref(0);
let frame  = null;
let started = false;
const reduced = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function format(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  return v.toLocaleString(props.locale, {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  });
}

function animateTo(target, ms) {
  if (frame) cancelAnimationFrame(frame);
  if (reduced || ms <= 0) {
    internal.value = target;
    display.value  = props.prefix + format(target) + props.suffix;
    return;
  }
  const from = internal.value;
  const startTs = performance.now();
  const step = now => {
    const t = Math.min(1, (now - startTs) / ms);
    // ease-out-cubic — schneller Sprung, sanftes Einlaufen.
    const eased = 1 - Math.pow(1 - t, 3);
    internal.value = from + (target - from) * eased;
    display.value  = props.prefix + format(internal.value) + props.suffix;
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

onMounted(() => {
  started = true;
  animateTo(+props.value || 0, props.duration);
});

watch(() => props.value, v => {
  if (!started) return;
  // Wertaenderung nach Mount: kuerzere Anpassung.
  animateTo(+v || 0, 350);
});
</script>

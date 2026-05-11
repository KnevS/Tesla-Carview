<template>
  <!-- Inline-SVG Silhouette pro Tesla-Modell. Selbst gezeichnete
       schematische Seitenansichten — keine Übernahme von Tesla-Logos
       oder Marketing-Material; reine Funktions-Icons aus geometrischen
       Primitiven. Fuellt sich mit `fill` aus der Farb-Prop, sodass der
       NavBar-Chip in der echten Lackfarbe des Wagens erscheint. -->
  <svg :viewBox="vb" :width="width" :height="height" xmlns="http://www.w3.org/2000/svg"
       class="vehicle-silhouette" aria-hidden="true">
    <g :fill="resolvedColor" :stroke="strokeColor" stroke-width="0.8" stroke-linejoin="round">
      <!-- Pfade pro Modell — kompakte, leicht stilisierte Seitenansichten. -->
      <path v-if="model === 'm3'"
        d="M2 18 L8 11 Q14 7 24 6.5 Q34 7 40 11 L46 18 L46 22 L40 22 A4 4 0 0 0 32 22 L16 22 A4 4 0 0 0 8 22 L2 22 Z" />
      <!-- Model Y: höher hinten als Model 3, etwas SUV-iger -->
      <path v-else-if="model === 'my'"
        d="M2 18 L7 10 Q12 6 22 5.5 Q32 6 38 9.5 L46 18 L46 23 L40 23 A4 4 0 0 0 32 23 L16 23 A4 4 0 0 0 8 23 L2 23 Z" />
      <!-- Model S: lang, fließend, niedriger -->
      <path v-else-if="model === 'ms'"
        d="M2 19 L7 13 Q15 7.5 26 7 Q37 7.5 44 12 L48 19 L48 22 L42 22 A4 4 0 0 0 34 22 L14 22 A4 4 0 0 0 6 22 L2 22 Z" />
      <!-- Model X: SUV, höhere Dachlinie, mehr Volumen -->
      <path v-else-if="model === 'mx'"
        d="M2 18 L6 8 Q12 4 22 3.5 Q32 4 38 8 L46 18 L46 23 L40 23 A4 4 0 0 0 32 23 L16 23 A4 4 0 0 0 8 23 L2 23 Z" />
      <!-- Cybertruck: eckig, Pickup-Profil -->
      <path v-else-if="model === 'ct'"
        d="M2 22 L2 14 L18 6 L48 14 L48 22 L42 22 A4 4 0 0 0 34 22 L14 22 A4 4 0 0 0 6 22 Z" />
      <!-- Fallback (unbekanntes Modell): generischer Auto-Glyph -->
      <path v-else
        d="M2 18 L8 11 Q14 7 24 6.5 Q34 7 40 11 L46 18 L46 22 L40 22 A4 4 0 0 0 32 22 L16 22 A4 4 0 0 0 8 22 L2 22 Z" />
      <!-- Fenster-Andeutung (heller, semitransparent) — gibt Tiefe ohne
           dass das Fahrzeug zu massiv wirkt. -->
      <path :fill="windowColor" stroke="none" :opacity="0.35"
            v-if="model !== 'ct'"
            d="M11 11 Q16 8 24 7.5 Q32 8 37 11 L36 17 L12 17 Z" />
      <path :fill="windowColor" stroke="none" :opacity="0.35"
            v-if="model === 'ct'"
            d="M8 14 L18 8.5 L42 14.5 L42 17 L8 17 Z" />
    </g>
    <!-- Räder — dunkel, immer gleicher Ton, unabhängig vom Lack. -->
    <g fill="#0a0a0a">
      <circle :cx="model === 'ms' ? 13 : 12" cy="22" r="3" />
      <circle :cx="model === 'ms' ? 37 : 36" cy="22" r="3" />
      <circle :cx="model === 'ms' ? 13 : 12" cy="22" r="1.2" :fill="hubColor" />
      <circle :cx="model === 'ms' ? 37 : 36" cy="22" r="1.2" :fill="hubColor" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  model:  { type: String, default: 'm3' },     // m3 | my | ms | mx | ct
  color:  { type: String, default: 'PPSW' },   // Tesla image_color-Code ODER hex
  width:  { type: [String, Number], default: 32 },
  height: { type: [String, Number], default: 18 },
});

// Tesla image_color-Codes auf Hex. Quelle: oeffentliche Farbpalette der
// Tesla-Konfigurator-Seite (Stand 2025). Eigene Werte, kein Markenuebernahme.
const COLOR_MAP = {
  PPSW: '#e8e8ea',  // Pearl White Multi-Coat
  PMNG: '#5b5b5b',  // Midnight Silver Metallic
  PBSB: '#1a1a1a',  // Obsidian Black
  PPMR: '#cc1130',  // Ultra Red
  PPSB: '#1e3a5f',  // Deep Blue Metallic
  PPW:  '#ffffff',  // Solid White
  PMSS: '#bfbfc1',  // Silver
  PSPB: '#2a4d8c',  // Pacific Blue
};

const resolvedColor = computed(() => {
  const c = props.color || 'PPSW';
  if (c.startsWith('#')) return c;
  return COLOR_MAP[c] || '#ef4444';
});

// Fuer dunkle Lacke heller Stroke, fuer helle Lacke dunkler — sonst
// verschmilzt die Silhouette mit dem Hintergrund.
function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
const strokeColor = computed(() =>
  luminance(resolvedColor.value) > 0.5 ? '#404040' : '#d4d4d4'
);
const windowColor = computed(() =>
  luminance(resolvedColor.value) > 0.5 ? '#1f2937' : '#e5e7eb'
);
const hubColor = computed(() =>
  luminance(resolvedColor.value) > 0.5 ? '#525252' : '#9ca3af'
);

// ViewBox fuer alle Modelle gleich — die Pfade sind in den gleichen
// 50×30-Koordinatenraum eingepasst.
const vb = '0 0 50 30';
</script>

<style scoped>
.vehicle-silhouette {
  display: inline-block;
  vertical-align: middle;
  /* Subtiler Schatten gibt dem Chip-Element Tiefe ohne aufdringlich zu wirken. */
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.4));
}
</style>

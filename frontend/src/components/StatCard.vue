<template>
  <!-- Wenn ein `to`-Prop gesetzt ist, rendert die Karte als RouterLink
       und führt mit einem Klick zur passenden Detail-Ansicht
       (Trips/Charging/etc.). Cursor wechselt automatisch auf pointer,
       Hover-Effekt ist im card-interactive bereits drin.
       Ohne `to`: rein dekorative Statistik-Karte (Fallback aufs frueher
       benutzte <div>). -->
  <component :is="to ? 'RouterLink' : 'div'"
    :to="to || undefined"
    class="card card-interactive group transition block no-underline"
    :class="[
      tooltip && !to ? 'cursor-help' : '',
      to ? 'cursor-pointer hover:border-tesla-red/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tesla-red' : '',
    ]"
    v-tooltip="tooltip">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="label flex items-center gap-1">
          {{ label }}
          <span v-if="to" class="text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition">→</span>
        </p>
        <p class="text-3xl font-bold mt-1 kpi-display tracking-tight">
          <!-- Wenn ein numerischer animierbarer Wert mitgegeben wird,
               nutzen wir NumberFlow fuers Count-Up. Sonst (Strings mit
               Einheit, '–', etc.) zeigen wir den fertigen Wert direkt. -->
          <NumberFlow v-if="numeric != null"
            :value="numeric" :decimals="decimals" :prefix="prefix" :suffix="suffix" />
          <template v-else>{{ value }}</template>
        </p>
        <p v-if="sub" class="text-gray-400 text-sm mt-1">{{ sub }}</p>
      </div>
      <span class="text-3xl transition group-hover:scale-110 group-hover:-rotate-3">{{ icon }}</span>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue';
import NumberFlow from './NumberFlow.vue';

const props = defineProps({
  label:    String,
  value:   [String, Number],
  sub:      String,
  icon:     String,
  tooltip:  String,
  // Optional: macht die Karte klickbar und navigiert dorthin.
  // Kann ein String wie '/trips' sein oder ein Vue-Router-Object.
  to:       { type: [String, Object], default: null },
  // Optional explizit numerisch + Format-Pattern, falls value bereits
  // einen String mit Einheit enthaelt. Wenn animate=false, wird
  // NumberFlow nicht benutzt — fuer Werte, die nicht hochzaehlen sollen
  // (z.B. „Online", „—"). Default: true, mit smartem Auto-Detect.
  animate:  { type: Boolean, default: true },
  decimals: { type: Number, default: 0 },
});

/** Extrahiert eine Zahl + Prefix/Suffix aus value, wenn moeglich. So
 *  funktioniert das Count-Up auch bei Werten wie „123 km" oder „45,3 €"
 *  ohne dass der Aufrufer was umstellen muss. */
const parsed = computed(() => {
  if (!props.animate) return { num: null, prefix: '', suffix: '' };
  const v = props.value;
  if (typeof v === 'number') return { num: v, prefix: '', suffix: '' };
  if (typeof v !== 'string') return { num: null, prefix: '', suffix: '' };
  // Bsp.: „12 850 km" → num=12850, suffix=' km'
  // Bsp.: „45,32 €"   → num=45.32 (decimal-aware), suffix=' €'
  const m = v.match(/^(.*?)([-+]?[0-9.,\s']+)(.*)$/);
  if (!m) return { num: null, prefix: '', suffix: '' };
  const raw = m[2].replace(/[\s']/g, '').replace(',', '.');
  const num = parseFloat(raw);
  if (!Number.isFinite(num)) return { num: null, prefix: '', suffix: '' };
  return { num, prefix: m[1], suffix: m[3] };
});

const numeric = computed(() => parsed.value.num);
const prefix  = computed(() => parsed.value.prefix);
const suffix  = computed(() => parsed.value.suffix);
</script>

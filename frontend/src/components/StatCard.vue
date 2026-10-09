<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
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
            :value="numeric" :decimals="effectiveDecimals" :locale="locale" :prefix="prefix" :suffix="suffix" />
          <template v-else>{{ value }}</template>
        </p>
        <p v-if="sub" class="text-gray-400 text-sm mt-1">{{ sub }}</p>
      </div>
      <!-- Icon: bevorzugt AppIcon-Set (benannter SVG-Icon-Pfad), fuer
           Rueckwaertskompatibilitaet aber auch direkt Emoji oder
           sonstigen Text. AppIcon faellt bei unbekanntem Namen
           automatisch auf den Text-Fallback. -->
      <span class="transition group-hover:scale-110 group-hover:-rotate-3 text-tesla-red"
            :class="{ 'text-3xl': isEmoji }">
        <AppIcon v-if="!isEmoji" :name="icon" :size="36" />
        <template v-else>{{ icon }}</template>
      </span>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import NumberFlow from './NumberFlow.vue';
import { parseDisplayNumber } from '../lib/displayNumber.js';
import AppIcon from './AppIcon.vue';

/** Wenn `icon` ein gepflegter AppIcon-Name ist (a-z, dash erlaubt),
 *  rendern wir die SVG. Sonst gehen wir davon aus dass es ein Emoji
 *  oder anderer Anzeige-Text ist und rendern as-is. Diese Heuristik
 *  laesst die App schrittweise von Emoji auf benannte Icons migrieren,
 *  ohne dass beim ersten Schritt alles auf einmal ausgetauscht werden
 *  muss. */
const ICON_NAME_RX = /^[a-z][a-z0-9-]*$/;

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
  // null = Nachkommastellen aus dem Anzeigetext uebernehmen („16,5" → 1).
  decimals: { type: Number, default: null },
});

const isEmoji = computed(() => !props.icon || !ICON_NAME_RX.test(props.icon));

const { locale } = useI18n();

/** Zerlegt `value` in Zahl + Prefix/Suffix, damit auch „1.698 kWh" oder
 *  „16,5 %" hochzaehlen koennen — sprachbewusst, siehe lib/displayNumber.js.
 *  Was keine eindeutige Zahl ist (Datum, Uhrzeit, „3/5"), bleibt Text. */
const parsed = computed(() => {
  const none = { num: null, prefix: '', suffix: '', decimals: 0 };
  if (!props.animate) return none;
  const v = props.value;
  if (typeof v === 'number') return Number.isFinite(v) ? { num: v, prefix: '', suffix: '', decimals: 0 } : none;
  return parseDisplayNumber(v, locale.value) ?? none;
});

const effectiveDecimals = computed(() => props.decimals ?? parsed.value.decimals);
const numeric = computed(() => parsed.value.num);
const prefix  = computed(() => parsed.value.prefix);
const suffix  = computed(() => parsed.value.suffix);
</script>

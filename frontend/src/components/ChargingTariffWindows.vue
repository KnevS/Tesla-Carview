<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  „Günstige Ladefenster" für die Laden-Ansicht. Ausführlicher als das
  kompakte TariffWidget (Dashboard-Sparkline): zeigt die nächsten 24h als
  beschriftetes Stundenraster und hebt das günstigste 4h- und 8h-Fenster
  hervor. Voll lokalisiert.

  Datenquelle: GET /api/tariff/prices ({ configured, provider, prices[],
  current, best_4h, best_8h }). Ist kein Anbieter eingerichtet, erscheint
  ein erklärender Leerzustand statt eines Fehlers.
-->
<template>
  <div>
    <!-- Leerzustand: kein Tarif-Anbieter konfiguriert -->
    <p v-if="!configured && !error" class="text-sm text-gray-400">
      {{ $t('charging.windowsNotConfigured') }}
    </p>

    <div v-else-if="configured" class="space-y-4">
      <!-- Kopfzeile: aktueller Preis + günstigste Fenster -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-gray-700/50 rounded-xl p-3">
          <p class="text-xs text-gray-400">{{ $t('charging.windowsCurrent') }}</p>
          <p class="font-bold text-lg" :class="current ? priceColor(current.ct_per_kwh) : ''">
            {{ current ? fmt(current.ct_per_kwh, 1) + ' ' + $t('charging.windowsUnit') : '–' }}
          </p>
        </div>
        <div v-if="best4h" class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.windowsBestTooltip')">
          <p class="text-xs text-gray-400">{{ $t('charging.windowsBest4h') }}</p>
          <p class="font-semibold">{{ fmtTime(best4h.start) }}–{{ fmtTime(best4h.end) }}</p>
          <p class="text-xs text-green-400">{{ $t('charging.windowsAvgPrice', { value: fmt(best4h.avg_ct_per_kwh, 1) }) }}</p>
        </div>
        <div v-if="best8h" class="bg-gray-700/50 rounded-xl p-3" v-tooltip="$t('charging.windowsBestTooltip')">
          <p class="text-xs text-gray-400">{{ $t('charging.windowsBest8h') }}</p>
          <p class="font-semibold">{{ fmtTime(best8h.start) }}–{{ fmtTime(best8h.end) }}</p>
          <p class="text-xs text-green-400">{{ $t('charging.windowsAvgPrice', { value: fmt(best8h.avg_ct_per_kwh, 1) }) }}</p>
        </div>
      </div>

      <!-- 24h-Raster -->
      <div v-if="upcoming.length">
        <p class="text-xs text-gray-400 mb-1">{{ $t('charging.windowsNext24h') }}</p>
        <div class="flex items-end gap-0.5 h-24">
          <div v-for="p in upcoming" :key="p.start" class="flex-1 flex flex-col items-center justify-end h-full">
            <div class="w-full rounded-t transition-all"
                 :style="{ height: barHeight(p.ct_per_kwh) + '%', background: barColor(p) }"
                 v-tooltip="$t('charging.windowsBarTooltip', { time: fmtHour(p.start), value: fmt(p.ct_per_kwh, 1) })">
            </div>
          </div>
        </div>
        <!-- Stundenachse: jede 3. Stunde beschriften -->
        <div class="flex gap-0.5 mt-1">
          <div v-for="(p, i) in upcoming" :key="p.start" class="flex-1 text-center">
            <span v-if="i % 3 === 0" class="text-[10px] text-gray-500">{{ fmtHourShort(p.start) }}</span>
          </div>
        </div>
      </div>

      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../api.js';

const { locale } = useI18n();
const configured = ref(false);
const prices  = ref([]);
const current = ref(null);
const best4h  = ref(null);
const best8h  = ref(null);
const error   = ref('');

const fmt = (v, d = 0) => (+(v || 0)).toFixed(d);
const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR', uk: 'uk-UA' };
const tag = () => LOCALE_TAG[locale.value] || 'de-DE';
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString(tag(), { hour: '2-digit', minute: '2-digit' });
const fmtHour = ts => new Date(ts * 1000).toLocaleString(tag(), { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const fmtHourShort = ts => new Date(ts * 1000).toLocaleTimeString(tag(), { hour: '2-digit' });

// Ohne Date.now()-Verbot hier unkritisch (reines Frontend zur Laufzeit).
const upcoming = computed(() => {
  const now = Math.floor(Date.now() / 1000);
  return prices.value.filter(p => p.end > now).slice(0, 24);
});

function barHeight(ct) {
  const vals = upcoming.value.map(p => p.ct_per_kwh);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = Math.max(max - min, 1);
  return Math.max(6, Math.round(((ct - min) / range) * 90 + 6));
}

// Farben konsistent mit TariffWidget: günstigstes 4h-Fenster grün
// hervorgehoben, sonst Preisklassen (grün <10, gelb <25, rot darüber).
function barColor(p) {
  if (best4h.value && p.start >= best4h.value.start && p.end <= best4h.value.end) return '#10b981';
  if (p.ct_per_kwh < 10) return '#34d399';
  if (p.ct_per_kwh < 25) return '#facc15';
  return '#ef4444';
}
function priceColor(ct) {
  return ct < 15 ? 'text-green-400' : ct < 30 ? 'text-yellow-400' : 'text-red-400';
}

async function load() {
  try {
    const { data } = await api.get('/tariff/prices');
    if (!data.configured) { configured.value = false; return; }
    configured.value = true;
    prices.value  = data.prices ?? [];
    current.value = data.current;
    best4h.value  = data.best_4h;
    best8h.value  = data.best_8h;
    error.value   = '';
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  }
}

onMounted(load);
</script>

<template>
  <div class="card space-y-3" v-if="configured">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="wallet" :size="20" class="text-tesla-red" />
        Strompreis ({{ providerLabel }})
      </h2>
      <span v-if="current" class="text-2xl font-bold"
            :class="priceColor(current.ct_per_kwh)">
        {{ current.ct_per_kwh.toFixed(1).replace('.', ',') }} ct/kWh
      </span>
    </div>

    <p v-if="best4h" class="text-sm text-gray-300">
      Günstigstes 4h-Fenster:
      <span class="font-mono">{{ fmtTime(best4h.start) }}–{{ fmtTime(best4h.end) }}</span>
      <span class="text-gray-400">
        · Ø {{ best4h.avg_ct_per_kwh.toFixed(1).replace('.', ',') }} ct/kWh
      </span>
      <span v-if="appliedHint" class="ml-2 text-green-400 text-xs">{{ appliedHint }}</span>
    </p>

    <!-- Sparkline der naechsten 24h. Position des Slider-Cursors zeigt
         die aktuelle Stunde, Hoehe der Balken den Preis. -->
    <div v-if="upcoming.length" class="flex items-end gap-0.5 h-16">
      <div v-for="p in upcoming" :key="p.start"
           class="flex-1 rounded-t transition-all"
           :style="{
             height: barHeight(p.ct_per_kwh) + '%',
             background: barColor(p),
           }"
           v-tooltip="`${fmtHour(p.start)}: ${p.ct_per_kwh.toFixed(1).replace('.', ',')} ct/kWh`">
      </div>
    </div>

    <div v-if="error" class="text-xs text-red-400">{{ error }}</div>

    <div class="flex gap-2 flex-wrap">
      <button v-if="best4h && allowApply" @click="applyOffPeak"
              class="text-xs btn-secondary py-1 px-3 inline-flex items-center gap-1.5"
              v-tooltip="'Setzt set_scheduled_charging im Auto auf den Beginn des günstigsten 4h-Fensters. Auto wartet bis zur Uhrzeit und lädt dann.'">
        <AppIcon name="steering" :size="14" />
        Lade-Plan auf günstigstes Fenster
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
import AppIcon from './AppIcon.vue';

defineProps({
  // Erlaubt das Auto-Set-Verhalten zu unterdruecken (z.B. wenn Widget
  // im Dashboard ohne Befehlrechte angezeigt wird).
  allowApply: { type: Boolean, default: true },
});

const appStore = useAppStore();
const configured = ref(false);
const provider   = ref('');
const prices     = ref([]);
const current    = ref(null);
const best4h     = ref(null);
const error      = ref('');
const appliedHint = ref('');

const providerLabel = computed(() => provider.value === 'awattar' ? 'aWattar Spotmarkt'
  : provider.value === 'tibber' ? 'Tibber' : '');

const upcoming = computed(() => {
  const now = Math.floor(Date.now() / 1000);
  return prices.value.filter(p => p.end > now).slice(0, 24);
});

// Skala: 0 ct = 5%, max ct in upcoming = 100%. Negative Preise gehen
// gegen 0%, sind aber sehr gute Ladezeiten — Farbe markiert das.
function barHeight(ct) {
  const max = Math.max(...upcoming.value.map(p => p.ct_per_kwh), 1);
  const min = Math.min(...upcoming.value.map(p => p.ct_per_kwh), 0);
  const range = Math.max(max - min, 1);
  return Math.max(5, Math.round(((ct - min) / range) * 95 + 5));
}

function barColor(p) {
  if (best4h.value && p.start >= best4h.value.start && p.end <= best4h.value.end) {
    return '#10b981'; // gruen — innerhalb des billigsten Fensters
  }
  if (p.ct_per_kwh < 10) return '#34d399';
  if (p.ct_per_kwh < 25) return '#facc15';
  return '#ef4444';
}

function priceColor(ct) {
  return ct < 15 ? 'text-green-400' : ct < 30 ? 'text-yellow-400' : 'text-red-400';
}

const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('de-DE',
  { hour: '2-digit', minute: '2-digit' });
const fmtHour = ts => new Date(ts * 1000).toLocaleString('de-DE',
  { weekday: 'short', hour: '2-digit', minute: '2-digit' });

async function load() {
  try {
    const { data } = await api.get('/tariff/prices');
    if (!data.configured) { configured.value = false; return; }
    configured.value = true;
    provider.value   = data.provider;
    prices.value     = data.prices ?? [];
    current.value    = data.current;
    best4h.value     = data.best_4h;
    error.value      = '';
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  }
}

async function applyOffPeak() {
  const vid = appStore.selectedVehicle?.id;
  if (!vid || !best4h.value) return;
  // best4h.start ist Unix-Sekunden — wir wandeln in Minuten ab Mitternacht.
  const d = new Date(best4h.value.start * 1000);
  const minutes = d.getHours() * 60 + d.getMinutes();
  try {
    await api.post(`/commands/${vid}/set_scheduled_charging`, { enable: true, time: minutes });
    appliedHint.value = `→ Lade-Start auf ${fmtTime(best4h.value.start)} gesetzt`;
    setTimeout(() => { appliedHint.value = ''; }, 6000);
  } catch (err) {
    error.value = err.response?.data?.error || 'Setzen fehlgeschlagen';
  }
}

onMounted(load);
</script>

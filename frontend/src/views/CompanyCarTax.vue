<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  Dienstwagen-Versteuerungs-Assistent (S09).

  Stellt für einen Dienstwagen die 1-%-Regel der Fahrtenbuchmethode gegenüber
  und rechnet den geldwerten Vorteil aus. Der maßgebliche Satz (0,25 % / 0,5 %
  / 1 %) hängt bei E-Fahrzeugen vom Bruttolistenpreis UND vom Anschaffungs-/
  Überlassungsdatum ab (die BLP-Grenze für die Viertelung wurde mehrfach
  angehoben) — deshalb die Datumsabfrage. Reine Orientierungsrechnung,
  clientseitig, deutschsprachig (deutsches Steuerthema wie die Kostenabrechnung).

  Datenquellen: GET /api/tco/vehicles/:id (Gesamtkosten + Abschreibung +
  purchase_date) und GET /api/trips/stats (km nach trip_type).
-->
<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        Dienstwagen-Versteuerung
        <InfoTip text="Vergleicht 1-%-Regel und Fahrtenbuchmethode und berechnet den monatlichen geldwerten Vorteil. Der E-Fahrzeug-Satz hängt vom Bruttolistenpreis und vom Anschaffungsdatum ab." />
      </h1>
      <p class="text-gray-400 text-sm mt-0.5">1-%-Regel vs. Fahrtenbuchmethode — inkl. E-Fahrzeug-Privileg</p>
    </div>

    <!-- Hinweis für Privatfahrzeuge -->
    <div v-if="vehicle && vehicle.category !== 'company'"
         class="flex items-start gap-3 bg-blue-900/20 border border-blue-700/30 rounded-xl px-4 py-3 text-sm text-blue-200">
      <span class="text-lg leading-none mt-0.5">ℹ️</span>
      <span>Der Versteuerungs-Assistent ist Fahrzeugen der Kategorie
        <RouterLink to="/settings" class="underline underline-offset-2 hover:text-blue-100">Dienstwagen</RouterLink> vorbehalten.</span>
    </div>

    <template v-if="vehicle && vehicle.category === 'company'">
      <!-- Eingaben -->
      <div class="bg-gray-800 rounded-xl p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label class="block">
            <span class="text-xs text-gray-400 flex items-center gap-1">Bruttolistenpreis (€) <InfoTip text="Inländischer Brutto-Listenpreis zum Zeitpunkt der Erstzulassung, inkl. Sonderausstattung und USt., abgerundet auf volle 100 €." /></span>
            <input v-model.number="form.blp" type="number" min="0" step="100"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
          <label class="block">
            <span class="text-xs text-gray-400 flex items-center gap-1">Anschaffung / Überlassung <InfoTip text="Datum der Anschaffung bzw. erstmaligen Überlassung. Bestimmt, welche BLP-Grenze für das E-Fahrzeug-Privileg gilt (60.000 € bis 2023, 70.000 € ab 2024, 100.000 € ab Juli 2025)." /></span>
            <input v-model="form.acquisitionDate" type="date"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
          <label class="block">
            <span class="text-xs text-gray-400">Fahrzeugtyp</span>
            <select v-model="form.vehicleType" class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600">
              <option value="bev">Elektro (BEV)</option>
              <option value="phev">Plug-in-Hybrid</option>
              <option value="ice">Verbrenner</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-gray-400 flex items-center gap-1">Entfernung Wohnung–Arbeit (km) <InfoTip text="Einfache Entfernung zur ersten Tätigkeitsstätte. Grundlage des 0,03-%-Zuschlags pro Monat." /></span>
            <input v-model.number="form.commuteKm" type="number" min="0" step="1"
              class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
          </label>
          <template v-if="form.vehicleType === 'phev'">
            <label class="block">
              <span class="text-xs text-gray-400">E-Reichweite (km)</span>
              <input v-model.number="form.phevRangeKm" type="number" min="0" step="1"
                class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
            </label>
            <label class="block">
              <span class="text-xs text-gray-400">CO₂ (g/km)</span>
              <input v-model.number="form.phevCo2" type="number" min="0" step="1"
                class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
            </label>
          </template>
        </div>
      </div>

      <!-- Ermittelter Satz -->
      <div class="bg-gray-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span class="text-xs text-gray-400 uppercase tracking-wide">Maßgeblicher Satz</span>
        <span class="text-2xl font-bold text-tesla-red">{{ factor.rate }}</span>
        <span class="text-sm text-gray-400">— {{ factor.reason }}</span>
      </div>

      <!-- Methodenvergleich -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- 1-%-Regel -->
        <div class="bg-gray-800 rounded-xl p-4 border-2"
             :class="cheaper === 'pauschal' ? 'border-green-700' : 'border-transparent'">
          <div class="flex items-center justify-between mb-3">
            <p class="font-semibold">1-%-Regel (pauschal)</p>
            <span v-if="cheaper === 'pauschal'" class="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300">günstiger</span>
          </div>
          <p class="text-3xl font-bold text-white">{{ eur(pauschal.total_month) }}<span class="text-sm font-normal text-gray-400"> / Monat</span></p>
          <p class="text-xs text-gray-400 mt-1">{{ eur(pauschal.total_year) }} / Jahr geldwerter Vorteil</p>
          <div class="mt-3 space-y-1 text-sm text-gray-300">
            <div class="flex justify-between"><span>Bemessungsgrundlage (reduziert)</span><span>{{ eur(pauschal.reduced_blp) }}</span></div>
            <div class="flex justify-between"><span>Nutzungsvorteil (1 %)</span><span>{{ eur(pauschal.private_use_month) }}</span></div>
            <div class="flex justify-between"><span>Weg zur Arbeit (0,03 % × {{ form.commuteKm }} km)</span><span>{{ eur(pauschal.commute_month) }}</span></div>
          </div>
        </div>

        <!-- Fahrtenbuch -->
        <div class="bg-gray-800 rounded-xl p-4 border-2"
             :class="cheaper === 'fahrtenbuch' ? 'border-green-700' : 'border-transparent'">
          <div class="flex items-center justify-between mb-3">
            <p class="font-semibold">Fahrtenbuchmethode</p>
            <span v-if="cheaper === 'fahrtenbuch'" class="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300">günstiger</span>
          </div>
          <template v-if="tcoAvailable">
            <p class="text-3xl font-bold text-white">{{ eur(fahrtenbuch.total_month) }}<span class="text-sm font-normal text-gray-400"> / Monat</span></p>
            <p class="text-xs text-gray-400 mt-1">{{ eur(fahrtenbuch.total_year) }} / Jahr geldwerter Vorteil</p>
            <div class="mt-3 space-y-1 text-sm text-gray-300">
              <div class="flex justify-between"><span>Privatanteil (aus Fahrten)</span><span>{{ fahrtenbuch.private_share_pct }} %</span></div>
              <div class="flex justify-between"><span>Kosten p. a. (AfA reduziert)</span><span>{{ eur(fahrtenbuch.adjusted_costs_year) }}</span></div>
              <div class="flex justify-between"><span>davon Abschreibung × {{ factor.rate }}-Basis</span><span>{{ eur(tco.summary.depreciation_eur) }}</span></div>
            </div>
          </template>
          <div v-else class="text-sm text-amber-200 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
            Für die Fahrtenbuchmethode fehlen Kostendaten. Pflege im
            <RouterLink to="/tco" class="underline">TCO-Cockpit</RouterLink> Kaufpreis, Versicherung, Steuer usw.
          </div>
        </div>
      </div>

      <!-- Fazit -->
      <div v-if="tcoAvailable && cheaper" class="bg-gray-800 rounded-xl p-4">
        <p class="text-sm">
          <span class="font-semibold">Empfehlung:</span>
          Die <span class="text-green-400 font-semibold">{{ cheaper === 'pauschal' ? '1-%-Regel' : 'Fahrtenbuchmethode' }}</span>
          ist hier günstiger — Ersparnis rund <span class="font-semibold">{{ eur(Math.abs(pauschal.total_year - fahrtenbuch.total_year)) }}</span> pro Jahr geldwerter Vorteil.
        </p>
      </div>

      <p class="text-xs text-gray-500">
        Orientierungsrechnung nach § 6 Abs. 1 Nr. 4 EStG / § 8 Abs. 2 EStG, Rechtsstand 2026 —
        <span class="text-gray-400">keine Steuerberatung</span>. Maßgeblich sind der individuelle Bescheid und die zum Anschaffungsdatum geltenden Regelungen.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
import InfoTip from '../components/InfoTip.vue';
import { determineFactor, pauschalMethod, fahrtenbuchMethod } from '../lib/companyCarTax.js';

const appStore = useAppStore();
const vehicle  = ref(null);
const tco      = ref(null);
const stats    = ref(null);

const STORAGE_KEY = 'tesla-carview-dienstwagensteuer';
const form = reactive({
  blp: 50000,
  acquisitionDate: '',
  vehicleType: 'bev',
  phevRangeKm: 0,
  phevCo2: null,
  commuteKm: 20,
});

const fmt = (v, d = 2) => Number(+(v || 0)).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const eur = v => fmt(v, 2) + ' €';

const tcoAvailable = computed(() => tco.value?.summary?.total_eur != null);
const privateShare = computed(() => {
  const s = stats.value;
  return s && s.total_km > 0 ? s.private_km / s.total_km : 0;
});

const factor = computed(() => determineFactor({
  vehicleType: form.vehicleType,
  blp: form.blp,
  acquisitionDate: form.acquisitionDate,
  phevRangeKm: form.phevRangeKm || null,
  phevCo2: form.phevCo2,
}));
const pauschal = computed(() => pauschalMethod({
  blp: form.blp, factor: factor.value.factor, commuteKm: form.commuteKm,
}));
const fahrtenbuch = computed(() => fahrtenbuchMethod({
  totalCostsYear: tco.value?.summary?.total_eur,
  depreciationYear: tco.value?.summary?.depreciation_eur,
  privateShare: privateShare.value,
  factor: factor.value.factor,
}));
const cheaper = computed(() => {
  if (!tcoAvailable.value) return null;
  return fahrtenbuch.value.total_year < pauschal.value.total_year ? 'fahrtenbuch' : 'pauschal';
});

function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* egal */ } }
watch(form, persist, { deep: true });

async function load() {
  const v = appStore.selectedVehicle;
  if (!v) return;
  const [tRes, sRes] = await Promise.all([
    api.get(`/tco/vehicles/${v.id}`).catch(() => ({ data: null })),
    api.get('/trips/stats', { params: { vehicle_id: v.id } }).catch(() => ({ data: null })),
  ]);
  tco.value = tRes.data;
  stats.value = sRes.data;
  vehicle.value = tRes.data?.vehicle ?? v;

  // Eingaben wiederherstellen; Anschaffungsdatum aus TCO vorbelegen, falls leer.
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) Object.assign(form, saved);
  } catch { /* egal */ }
  if (!form.acquisitionDate && tco.value?.vehicle?.purchase_date) {
    form.acquisitionDate = String(tco.value.vehicle.purchase_date).slice(0, 10);
  }
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

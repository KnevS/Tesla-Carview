<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <!-- Wartungsintervalle pro Fahrzeug. Wird im Betriebsbuch eingebunden,
       weil Intervalle thematisch zu den Betriebs-/Wartungs-Eintraegen
       gehoeren. Bezugs-Fahrzeug kommt aus dem App-Store (selectedVehicle). -->
  <div id="service-intervals" class="card space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="font-semibold flex items-center gap-2" v-tooltip="$t('serviceCard.titleTip')">
        <AppIcon name="tool" :size="20" class="text-tesla-red" />
        {{ $t('serviceCard.title') }}
      </h2>
      <div class="flex gap-2">
        <button @click="seedDefaults" :disabled="!canEdit || !vehicle"
          class="btn-secondary text-sm" v-tooltip="$t('serviceCard.seedTip')">
          {{ $t('serviceCard.seedBtn') }}
        </button>
        <button @click="add" :disabled="!canEdit || !vehicle"
          class="btn-primary text-sm">{{ $t('serviceCard.addBtn') }}</button>
      </div>
    </div>
    <p v-if="!canEdit" class="text-xs text-yellow-300/80">{{ $t('serviceCard.readOnly') }}</p>
    <!-- Disclaimer: alle Werte sind Naeherungen, keine rechtsverbindliche Auskunft. -->
    <p class="text-xs text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2 leading-relaxed">
      {{ $t('serviceCard.disclaimer') }}
      <br>
      {{ $t('serviceCard.disclaimerTuv') }}
    </p>
    <p v-if="!intervals.length" class="text-sm text-gray-400">{{ $t('serviceCard.empty') }}</p>
    <div v-else class="space-y-2">
      <div v-for="s in intervals" :key="s.id"
           class="bg-gray-800 rounded-lg p-3 text-sm space-y-2">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold">{{ s.label }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="statusClass(s.status)">
                {{ statusLabel(s.status) }}
              </span>
              <span v-if="!s.is_active" class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{{ $t('serviceCard.deactivated') }}</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">
              <span v-if="s.interval_months">{{ $t('serviceCard.everyMonths', { n: s.interval_months }) }}</span>
              <span v-if="s.interval_months && s.interval_km"> {{ $t('serviceCard.or') }} </span>
              <span v-if="s.interval_km">{{ $t('serviceCard.everyKm', { km: fmtNum(s.interval_km) }) }}</span>
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              <span v-if="s.last_done_at">{{ $t('serviceCard.lastDone', { day: fmtDay(s.last_done_at) }) }}</span>
              <span v-if="s.last_done_at && s.last_done_km != null">, </span>
              <span v-if="s.last_done_km != null">{{ $t('serviceCard.lastKm', { km: fmtNum(s.last_done_km) }) }}</span>
              <span v-if="!s.last_done_at && s.last_done_km == null" class="italic">{{ $t('serviceCard.neverDone') }}</span>
            </p>
            <p v-if="s.days_until_due != null || s.km_until_due != null" class="text-xs mt-0.5"
               :class="s.status === 'overdue' ? 'text-red-300' : (s.status === 'soon' ? 'text-yellow-300' : 'text-gray-400')">
              <span v-if="s.days_until_due != null">
                {{ s.days_until_due < 0 ? $t('serviceCard.daysOverdue', { n: -s.days_until_due }) : $t('serviceCard.daysUntil', { n: s.days_until_due }) }}
              </span>
              <span v-if="s.km_until_due != null" class="ml-2">
                · {{ s.km_until_due < 0 ? $t('serviceCard.kmOverdue', { n: -s.km_until_due }) : $t('serviceCard.kmLeft', { n: s.km_until_due }) }}
              </span>
              <span v-if="s.km_until_due != null && s.km_until_due >= 0 && s.km_per_day && s.predicted_days != null && s.predicted_days >= 0"
                class="ml-2 text-gray-500" v-tooltip="$t('serviceCard.predictTip', { km: s.km_per_day })">
                · ≈ {{ predictText(s.predicted_days) }}
              </span>
            </p>
          </div>
          <div class="flex gap-1 flex-wrap items-center">
            <button @click="markDone(s)" :disabled="!canEdit"
              class="text-xs btn-secondary py-1 px-2" v-tooltip="$t('serviceCard.doneTip')">
              {{ $t('serviceCard.doneBtn') }}
            </button>
            <button v-if="s.status !== 'snoozed'" @click="snooze(s)" :disabled="!canEdit"
              class="text-xs btn-secondary py-1 px-2" v-tooltip="$t('serviceCard.snoozeTip')">
              {{ $t('serviceCard.snoozeBtn') }}
            </button>
            <button @click="edit(s)" :disabled="!canEdit"
              class="text-xs btn-secondary py-1 px-2">✎</button>
            <button @click="del(s)" :disabled="!canEdit"
              class="text-xs py-1 px-2 rounded bg-gray-700 hover:bg-red-900 text-gray-300"
              v-tooltip="$t('serviceCard.delTip')">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit / Add Modal — Teleport: kein clipping durch .card-Backdrop. -->
    <Teleport to="body">
    <div v-if="form.show"
         class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
      <div class="card w-full max-w-md space-y-3">
        <h3 class="text-lg font-bold">{{ form.id ? $t('serviceCard.modalEdit') : $t('serviceCard.modalNew') }}</h3>
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">{{ $t('serviceCard.fLabel') }}</label>
          <input v-model="form.label" type="text" maxlength="120"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm"
            :placeholder="$t('serviceCard.fLabelPh')" />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">{{ $t('serviceCard.fKind') }}</label>
          <input v-model="form.kind" type="text" maxlength="64"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm font-mono"
            :placeholder="$t('serviceCard.fKindPh')" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">{{ $t('serviceCard.fMonths') }}</label>
            <input v-model.number="form.interval_months" type="number" min="0" max="120"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">{{ $t('serviceCard.fKm') }}</label>
            <input v-model.number="form.interval_km" type="number" min="0"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">{{ $t('serviceCard.fLastDate') }}</label>
            <input v-model="form.last_done_date" type="date"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">{{ $t('serviceCard.fLastKm') }}</label>
            <input v-model.number="form.last_done_km" type="number" min="0"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" v-model="form.is_active" class="accent-tesla-red" />
          {{ $t('serviceCard.fActive') }}
        </label>
        <div class="flex gap-2 pt-1">
          <button @click="save" class="btn-primary flex-1 text-sm">{{ $t('serviceCard.save') }}</button>
          <button @click="form.show = false" class="btn-secondary flex-1 text-sm">{{ $t('serviceCard.cancel') }}</button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';
import AppIcon from './AppIcon.vue';

const { t, locale } = useI18n();
const appStore = useAppStore();
const auth     = useAuthStore();

const vehicle  = computed(() => appStore.selectedVehicle);
const canEdit  = computed(() => auth.canEditVehicles);

const intervals = ref([]);
const form = ref({
  show: false, id: null, kind: '', label: '',
  interval_months: null, interval_km: null,
  last_done_date: '', last_done_km: null, is_active: true,
});

const STATUS_KEY = {
  overdue: 'statusOverdue', soon: 'statusSoon', ok: 'statusOk',
  pending: 'statusPending', snoozed: 'statusSnoozed',
};
const STATUS_CLASS = {
  overdue: 'bg-red-900 text-red-300',
  soon:    'bg-yellow-900 text-yellow-300',
  ok:      'bg-green-900 text-green-300',
  pending: 'bg-gray-700 text-gray-300',
  snoozed: 'bg-blue-900 text-blue-300',
};
const statusLabel = s => STATUS_KEY[s] ? t('serviceCard.' + STATUS_KEY[s]) : s;
const statusClass = s => STATUS_CLASS[s] || 'bg-gray-700 text-gray-300';

const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR', uk: 'uk-UA' };
const localeTag = () => LOCALE_TAG[locale.value] || 'de-DE';
const fmtNum = n => Number(n).toLocaleString(localeTag());
const fmtDay = ts => ts ? new Date(ts * 1000).toLocaleDateString(localeTag()) : '';

// Vorausschau: prognostizierte Tage bis Fälligkeit in grobe Wochen-/Monatsschritte.
function predictText(days) {
  if (days < 14)  return t('serviceCard.predictDays',   { n: days });
  if (days < 90)  return t('serviceCard.predictWeeks',  { n: Math.round(days / 7) });
  if (days < 730) return t('serviceCard.predictMonths', { n: Math.round(days / 30) });
  return t('serviceCard.predictYears', { n: (days / 365).toFixed(1) });
}

async function load() {
  const vid = vehicle.value?.id;
  if (!vid) { intervals.value = []; return; }
  try {
    const { data } = await api.get('/service-intervals', { params: { vehicle_id: vid } });
    intervals.value = data;
  } catch { intervals.value = []; }
}

async function seedDefaults() {
  const vid = vehicle.value?.id;
  if (!vid) { alert(t('serviceCard.alertNoVehicle')); return; }
  try {
    const { data } = await api.post('/service-intervals/seed-defaults', { vehicle_id: vid });
    await load();
    if (data?.added === 0) alert(t('serviceCard.alertSeedNone'));
  } catch (err) {
    alert(t('serviceCard.alertSeedFail', { err: err.response?.data?.error || err.message }));
  }
}

function add() {
  form.value = {
    show: true, id: null, kind: '', label: '',
    interval_months: 12, interval_km: null,
    last_done_date: '', last_done_km: null, is_active: true,
  };
}

function edit(s) {
  form.value = {
    show: true, id: s.id, kind: s.kind, label: s.label,
    interval_months: s.interval_months, interval_km: s.interval_km,
    last_done_date: s.last_done_at ? new Date(s.last_done_at * 1000).toISOString().slice(0, 10) : '',
    last_done_km: s.last_done_km,
    is_active: !!s.is_active,
  };
}

async function save() {
  const f = form.value;
  if (!f.label.trim() || !f.kind.trim()) {
    alert(t('serviceCard.alertRequired'));
    return;
  }
  const last_done_at = f.last_done_date
    ? Math.floor(new Date(f.last_done_date + 'T12:00:00').getTime() / 1000)
    : null;
  const payload = {
    label: f.label.trim(),
    kind:  f.kind.trim(),
    interval_months: f.interval_months || null,
    interval_km:     f.interval_km     || null,
    last_done_at,
    last_done_km:    f.last_done_km    ?? null,
    is_active:       !!f.is_active,
  };
  try {
    if (f.id) {
      await api.put(`/service-intervals/${f.id}`, payload);
    } else {
      payload.vehicle_id = vehicle.value.id;
      await api.post('/service-intervals', payload);
    }
    form.value.show = false;
    await load();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
}

async function markDone(s) {
  await api.put(`/service-intervals/${s.id}`, {
    last_done_at: Math.floor(Date.now() / 1000),
    last_done_km: vehicle.value?.odometer_km ?? null,
  });
  await load();
}

async function snooze(s) {
  await api.post(`/service-intervals/${s.id}/snooze`, { days: 30 });
  await load();
}

async function del(s) {
  if (!confirm(t('serviceCard.confirmDelete', { label: s.label }))) return;
  await api.delete(`/service-intervals/${s.id}`);
  await load();
}

onMounted(load);
watch(() => vehicle.value?.id, load);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col"
           style="max-height: 90vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 class="font-bold text-lg">{{ $t('wizard.title') }}</h2>
            <p v-if="step > 0 && step < LAST_STEP" class="text-xs text-gray-400 mt-0.5">
              {{ $t('wizard.step', { n: step, total: LAST_STEP - 1 }) }}
            </p>
          </div>
          <button @click="$emit('close')" class="text-gray-500 hover:text-white text-2xl leading-none transition" v-tooltip="$t('common.cancel')">×</button>
        </div>

        <!-- Fortschrittsbalken -->
        <div v-if="step > 0 && step < LAST_STEP" class="h-1 bg-gray-800 shrink-0">
          <div class="h-full bg-tesla-red transition-all duration-300"
               :style="{ width: ((step / (LAST_STEP - 1)) * 100) + '%' }"></div>
        </div>

        <!-- Inhalt -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- STEP 0: Willkommen -->
          <template v-if="step === 0">
            <div class="text-center space-y-4 py-4">
              <div class="text-5xl">⚙️</div>
              <h3 class="text-xl font-bold">{{ $t('wizard.welcome') }}</h3>
              <p class="text-gray-300 text-sm leading-relaxed">{{ $t('wizard.intro') }}</p>
              <div class="bg-gray-800 rounded-xl p-4 text-left space-y-2 text-sm text-gray-300">
                <p>✓ {{ $t('wizard.featureSkip') }}</p>
                <p>✓ {{ $t('wizard.featureDraft') }}</p>
                <p>✓ {{ $t('wizard.featureBack') }}</p>
                <p>✓ {{ $t('wizard.featureRelaunch') }}</p>
              </div>
            </div>
          </template>

          <!-- STEP 1: Sprache -->
          <template v-else-if="step === 1">
            <WizardStep :title="$t('wizard.s1.title')" :question="$t('wizard.s1.question')"
              :current-label="langLabel(draft.lang ?? prefs.data.lang)" />
            <div class="grid grid-cols-2 gap-2">
              <button v-for="l in LANGS" :key="l.code"
                @click="draft.lang = l.code"
                class="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition"
                :class="(draft.lang ?? prefs.data.lang) === l.code
                  ? 'border-tesla-red bg-tesla-red/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'">
                <span class="text-xl">{{ l.flag }}</span>
                <span class="font-medium">{{ l.label }}</span>
                <span v-if="(draft.lang ?? prefs.data.lang) === l.code" class="ml-auto text-tesla-red">✓</span>
              </button>
            </div>
          </template>

          <!-- STEP 2: Design-Stil -->
          <template v-else-if="step === 2">
            <WizardStep :title="$t('wizard.s2.title')" :question="$t('wizard.s2.question')"
              :current-label="designLabel(draft.theme_design ?? prefs.data.theme_design)" />
            <div class="grid grid-cols-2 gap-3">
              <button v-for="d in DESIGNS" :key="d.key"
                @click="draft.theme_design = d.key"
                class="flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-sm transition text-left"
                :class="(draft.theme_design ?? prefs.data.theme_design) === d.key
                  ? 'border-tesla-red bg-tesla-red/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'">
                <div class="flex items-center gap-2 font-semibold text-white">
                  <span>{{ d.icon }}</span>
                  <span>{{ d.label }}</span>
                  <span v-if="(draft.theme_design ?? prefs.data.theme_design) === d.key" class="ml-auto text-tesla-red text-xs">✓</span>
                </div>
                <span class="text-xs text-gray-400">{{ d.tagline }}</span>
              </button>
            </div>
          </template>

          <!-- STEP 3: Akzentfarbe -->
          <template v-else-if="step === 3">
            <WizardStep :title="$t('wizard.s3.title')" :question="$t('wizard.s3.question')"
              :current-label="themeLabel(draft.theme_color ?? prefs.data.theme_color)" />
            <div class="grid grid-cols-3 gap-3">
              <button v-for="t in THEMES" :key="t.key"
                @click="draft.theme_color = t.key"
                class="flex flex-col items-center gap-2 py-4 rounded-xl border text-sm transition"
                :class="(draft.theme_color ?? prefs.data.theme_color) === t.key
                  ? 'border-white/40 bg-gray-700'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'">
                <span class="w-8 h-8 rounded-full shadow-lg ring-2 ring-offset-2 ring-offset-gray-900 transition"
                  :style="{ background: t.accent }"
                  :class="(draft.theme_color ?? prefs.data.theme_color) === t.key ? 'ring-white' : 'ring-transparent'"></span>
                <span class="text-xs text-gray-300">{{ t.label }}</span>
              </button>
            </div>
          </template>

          <!-- STEP 4: Einheiten -->
          <template v-else-if="step === 4">
            <WizardStep :title="$t('wizard.s4.title')" :question="$t('wizard.s4.question')" />
            <div class="space-y-4">
              <!-- Distanz -->
              <div class="card space-y-2">
                <p class="text-sm font-medium text-gray-300">{{ $t('wizard.s4.distance') }}</p>
                <div class="flex gap-2">
                  <ToggleChip v-for="o in UNIT_DISTANCE" :key="o.key"
                    :active="(draft.unit_distance ?? prefs.data.unit_distance) === o.key"
                    @click="draft.unit_distance = o.key">{{ o.label }}</ToggleChip>
                </div>
              </div>
              <!-- Temperatur -->
              <div class="card space-y-2">
                <p class="text-sm font-medium text-gray-300">{{ $t('wizard.s4.temp') }}</p>
                <div class="flex gap-2">
                  <ToggleChip v-for="o in UNIT_TEMP" :key="o.key"
                    :active="(draft.unit_temp ?? prefs.data.unit_temp) === o.key"
                    @click="draft.unit_temp = o.key">{{ o.label }}</ToggleChip>
                </div>
              </div>
              <!-- Verbrauch -->
              <div class="card space-y-2">
                <p class="text-sm font-medium text-gray-300">{{ $t('wizard.s4.efficiency') }}</p>
                <div class="flex flex-wrap gap-2">
                  <ToggleChip v-for="o in UNIT_EFF" :key="o.key"
                    :active="(draft.unit_efficiency ?? prefs.data.unit_efficiency) === o.key"
                    @click="draft.unit_efficiency = o.key">{{ o.label }}</ToggleChip>
                </div>
              </div>
            </div>
          </template>

          <!-- STEP 5: Dashboard-Karten -->
          <template v-else-if="step === 5">
            <WizardStep :title="$t('wizard.s5.title')" :question="$t('wizard.s5.question')" />
            <p class="text-xs text-gray-400">{{ $t('wizard.s5.hint') }}</p>
            <ul class="space-y-2">
              <li v-for="(card, i) in draftCardOrder" :key="card"
                class="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5">
                <span class="text-lg w-6 text-center">{{ DASHBOARD_CARD_DEFS.find(d => d.key === card)?.icon }}</span>
                <span class="flex-1 text-sm text-white">{{ $t('wizard.s5.cards.' + card) }}</span>
                <!-- Reihenfolge -->
                <button @click="moveCard(i, -1)" :disabled="i === 0"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▲</button>
                <button @click="moveCard(i, 1)" :disabled="i === draftCardOrder.length - 1"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▼</button>
                <!-- Sichtbarkeit -->
                <button @click="toggleCard(card)"
                  class="w-10 h-5 rounded-full transition relative"
                  :class="draftCardVisible[card] !== false ? 'bg-tesla-red' : 'bg-gray-600'">
                  <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    :class="draftCardVisible[card] !== false ? 'translate-x-5' : 'translate-x-0.5'"></span>
                </button>
              </li>
            </ul>
          </template>

          <!-- STEP 6: Navigation -->
          <template v-else-if="step === 6">
            <WizardStep :title="$t('wizard.s6.title')" :question="$t('wizard.s6.question')" />
            <p class="text-xs text-gray-400">{{ $t('wizard.s6.hint') }}</p>
            <ul class="space-y-2">
              <li v-for="(item, i) in draftNavOrder" :key="item.key"
                class="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5">
                <span class="text-gray-400 text-xs font-mono w-4 text-center">{{ i+1 }}</span>
                <span class="flex-1 text-sm text-white">{{ item.label }}</span>
                <button @click="moveNav(i, -1)" :disabled="i === 0"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▲</button>
                <button @click="moveNav(i, 1)" :disabled="i === draftNavOrder.length - 1"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▼</button>
                <button @click="toggleNav(item.key)"
                  class="w-10 h-5 rounded-full transition relative"
                  :class="!draftNavHidden.includes(item.key) ? 'bg-tesla-red' : 'bg-gray-600'">
                  <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    :class="!draftNavHidden.includes(item.key) ? 'translate-x-5' : 'translate-x-0.5'"></span>
                </button>
              </li>
            </ul>
          </template>

          <!-- STEP 7: Benachrichtigungen -->
          <template v-else-if="step === 7">
            <WizardStep :title="$t('wizard.s7.title')" :question="$t('wizard.s7.question')" />
            <div class="space-y-3">
              <NotifRow v-model="draftNotif.charge" :label="$t('wizard.s7.charging')" icon="⚡" />
              <NotifRow v-model="draftNotif.service" :label="$t('wizard.s7.service')" icon="🔧" />
              <NotifRow v-model="draftNotif.battery" :label="$t('wizard.s7.battery')" icon="🔋">
                <div v-if="draftNotif.battery" class="mt-2 ml-1 space-y-1">
                  <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>{{ $t('wizard.s7.batteryThreshold', { n: draftNotif.batteryThreshold }) }}</span>
                  </div>
                  <input type="range" min="5" max="50" step="5"
                    v-model.number="draftNotif.batteryThreshold"
                    class="w-full accent-tesla-red" />
                </div>
              </NotifRow>
            </div>
          </template>

          <!-- STEP 8 (LAST): Zusammenfassung -->
          <template v-else-if="step === LAST_STEP">
            <WizardStep :title="$t('wizard.s8.title')" :question="$t('wizard.s8.question')" />
            <div v-if="summaryRows.length" class="space-y-2">
              <div v-for="row in summaryRows" :key="row.key"
                class="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3">
                <span class="text-lg shrink-0">{{ row.icon }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-400">{{ row.label }}</p>
                  <div class="flex items-center gap-3 flex-wrap mt-0.5">
                    <span class="text-xs text-gray-500 line-through">{{ row.from }}</span>
                    <span class="text-xs text-white font-semibold">→ {{ row.to }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-400 text-center py-4">{{ $t('wizard.s8.noChanges') }}</p>

            <div v-if="saving" class="text-center py-3 text-sm text-gray-400">{{ $t('common.loading') }} …</div>
          </template>

        </div>

        <!-- Footer Buttons -->
        <div class="px-6 py-4 border-t border-gray-800 flex items-center gap-3 shrink-0">

          <!-- Schritt 0: Los geht's -->
          <template v-if="step === 0">
            <button @click="next" class="flex-1 btn-primary">{{ $t('wizard.start') }}</button>
          </template>

          <!-- Zwischenschritte 1–(LAST-1) -->
          <template v-else-if="step < LAST_STEP">
            <button @click="back" class="btn-secondary px-4">{{ $t('wizard.back') }}</button>
            <button @click="skip" class="flex-1 text-sm text-gray-400 hover:text-white transition">{{ $t('wizard.skip') }}</button>
            <button @click="next" class="btn-primary px-6">{{ $t('wizard.next') }}</button>
          </template>

          <!-- Letzter Schritt: Zusammenfassung -->
          <template v-else>
            <button @click="discard" class="btn-secondary px-4 text-red-400 hover:text-red-300">{{ $t('wizard.discard') }}</button>
            <button @click="back" class="btn-secondary px-4">{{ $t('wizard.back') }}</button>
            <button @click="confirm" :disabled="saving" class="flex-1 btn-primary">{{ $t('wizard.confirm') }}</button>
          </template>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePrefsStore, DASHBOARD_CARD_DEFS, PREF_KEYS } from '../store/prefs.js';
import { LANGS } from '../store/lang.js';
import { THEMES, DESIGNS } from '../store/theme.js';
import { ALL_LINKS } from '../store/nav.js';

const emit = defineEmits(['close', 'done']);
const { t } = useI18n();
const prefs = usePrefsStore();

const LAST_STEP = 8;
const step = ref(0);
const saving = ref(false);

// ─── Optionen ──────────────────────────────────────────────────────────────

const UNIT_DISTANCE = [
  { key: 'km', label: 'km' },
  { key: 'mi', label: 'Meilen (mi)' },
];
const UNIT_TEMP = [
  { key: 'celsius',    label: '°C (Celsius)' },
  { key: 'fahrenheit', label: '°F (Fahrenheit)' },
];
const UNIT_EFF = [
  { key: 'kwh100', label: 'kWh/100 km' },
  { key: 'whkm',  label: 'Wh/km' },
  { key: 'mpkwh', label: 'mi/kWh' },
];

// ─── Draft-Zustand ─────────────────────────────────────────────────────────
// Jeder Schritt schreibt in dieses Objekt. Erst bei "Confirm" wird gespeichert.

const draft = ref({});

// Dashboard-Karten-Draft
const draftCardVisible = ref({ ...(prefs.data.dashboard_cards ?? {}) });
const draftCardOrder   = ref([...(prefs.data.dashboard_card_order ?? DASHBOARD_CARD_DEFS.map(d => d.key))]);

// Sicherstellen dass alle Karten im Draft sind
for (const d of DASHBOARD_CARD_DEFS) {
  if (!draftCardOrder.value.includes(d.key)) draftCardOrder.value.push(d.key);
  if (draftCardVisible.value[d.key] === undefined) draftCardVisible.value[d.key] = true;
}

// Navigation-Draft
const navItems = ALL_LINKS.filter(l => !l.adminOnly);
const draftNavOrder  = ref((() => {
  const saved = prefs.data.nav_order;
  if (saved?.length) {
    const map = Object.fromEntries(navItems.map(l => [l.key, l]));
    return saved.map(k => map[k]).filter(Boolean);
  }
  return [...navItems];
})());
const draftNavHidden = ref([...(prefs.data.nav_hidden ?? [])]);

// Benachrichtigungen-Draft
const draftNotif = ref({
  charge:           prefs.data[PREF_KEYS.NOTIF_CHARGE]   ?? true,
  service:          prefs.data[PREF_KEYS.NOTIF_SERVICE]  ?? true,
  battery:          prefs.data[PREF_KEYS.NOTIF_BATTERY]  ?? false,
  batteryThreshold: prefs.data[PREF_KEYS.NOTIF_BATTERY_T] ?? 20,
});

// ─── Dashboard-Karten-Aktionen ─────────────────────────────────────────────

function moveCard(i, dir) {
  const arr = [...draftCardOrder.value];
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  draftCardOrder.value = arr;
}

function toggleCard(key) {
  draftCardVisible.value = { ...draftCardVisible.value, [key]: draftCardVisible.value[key] === false };
}

// ─── Nav-Aktionen ──────────────────────────────────────────────────────────

function moveNav(i, dir) {
  const arr = [...draftNavOrder.value];
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  draftNavOrder.value = arr;
}

function toggleNav(key) {
  draftNavHidden.value = draftNavHidden.value.includes(key)
    ? draftNavHidden.value.filter(k => k !== key)
    : [...draftNavHidden.value, key];
}

// ─── Navigation im Wizard ──────────────────────────────────────────────────

function next() { step.value = Math.min(step.value + 1, LAST_STEP); }
function back() { step.value = Math.max(step.value - 1, 0); }
function skip() { next(); }

function discard() {
  draft.value = {};
  emit('close');
}

// ─── Zusammenfassung ───────────────────────────────────────────────────────

function langLabel(code) { return LANGS.find(l => l.code === code)?.label ?? code; }
function designLabel(key) { return DESIGNS.find(d => d.key === key)?.label ?? key; }
function themeLabel(key) { return THEMES.find(t => t.key === key)?.label ?? key; }

const summaryRows = computed(() => {
  const rows = [];

  const add = (key, icon, label, from, to) => {
    if (from !== to) rows.push({ key, icon, label, from: String(from), to: String(to) });
  };

  if (draft.value.lang != null) add('lang', '🌐', t('wizard.s1.title'), langLabel(prefs.data.lang), langLabel(draft.value.lang));
  if (draft.value.theme_design != null) add('theme_design', '🎨', t('wizard.s2.title'), designLabel(prefs.data.theme_design), designLabel(draft.value.theme_design));
  if (draft.value.theme_color != null) add('theme_color', '🎨', t('wizard.s3.title'), themeLabel(prefs.data.theme_color), themeLabel(draft.value.theme_color));
  if (draft.value.unit_distance != null) add('unit_distance', '📏', t('wizard.s4.distance'), prefs.data.unit_distance, draft.value.unit_distance);
  if (draft.value.unit_temp != null) add('unit_temp', '🌡️', t('wizard.s4.temp'), prefs.data.unit_temp, draft.value.unit_temp);
  if (draft.value.unit_efficiency != null) add('unit_eff', '⚡', t('wizard.s4.efficiency'), prefs.data.unit_efficiency, draft.value.unit_efficiency);

  // Dashboard cards
  const origCards = JSON.stringify(prefs.data.dashboard_cards ?? {});
  const origOrder = JSON.stringify(prefs.data.dashboard_card_order ?? []);
  if (JSON.stringify(draftCardVisible.value) !== origCards || JSON.stringify(draftCardOrder.value) !== origOrder) {
    rows.push({ key: 'dashboard', icon: '📊', label: t('wizard.s5.title'), from: '—', to: t('wizard.s5.changed') });
  }

  // Nav
  const origNavOrder  = JSON.stringify(prefs.data.nav_order ?? []);
  const origNavHidden = JSON.stringify(prefs.data.nav_hidden ?? []);
  if (JSON.stringify(draftNavOrder.value.map(l => l.key)) !== origNavOrder ||
      JSON.stringify(draftNavHidden.value) !== origNavHidden) {
    rows.push({ key: 'nav', icon: '🧭', label: t('wizard.s6.title'), from: '—', to: t('wizard.s6.changed') });
  }

  // Notifications
  if (draftNotif.value.charge !== prefs.data[PREF_KEYS.NOTIF_CHARGE]) {
    rows.push({ key: 'notif_charge', icon: '🔔', label: t('wizard.s7.charging'), from: prefs.data[PREF_KEYS.NOTIF_CHARGE] ? '✓' : '✗', to: draftNotif.value.charge ? '✓' : '✗' });
  }

  return rows;
});

// ─── Confirm & Speichern ───────────────────────────────────────────────────

async function confirm() {
  saving.value = true;
  try {
    const delta = {
      ...draft.value,
      dashboard_cards:      draftCardVisible.value,
      dashboard_card_order: draftCardOrder.value,
      nav_order:  draftNavOrder.value.map(l => l.key),
      nav_hidden: draftNavHidden.value,
      [PREF_KEYS.NOTIF_CHARGE]:    draftNotif.value.charge,
      [PREF_KEYS.NOTIF_SERVICE]:   draftNotif.value.service,
      [PREF_KEYS.NOTIF_BATTERY]:   draftNotif.value.battery,
      [PREF_KEYS.NOTIF_BATTERY_T]: draftNotif.value.batteryThreshold,
      wizard_completed: true,
    };
    await prefs.save(delta);
    emit('done');
    emit('close');
  } finally {
    saving.value = false;
  }
}
</script>

<script>
// ─── Interne Hilfskomponenten ──────────────────────────────────────────────

const WizardStep = {
  props: ['title', 'question', 'currentLabel'],
  template: `
    <div>
      <h3 class="text-lg font-bold text-white">{{ title }}</h3>
      <p class="text-sm text-gray-300 mt-1">{{ question }}</p>
      <p v-if="currentLabel" class="text-xs text-gray-500 mt-1">Aktuell: <span class="text-gray-300">{{ currentLabel }}</span></p>
    </div>
  `,
};

const ToggleChip = {
  props: ['active'],
  emits: ['click'],
  template: `
    <button @click="$emit('click')"
      class="px-4 py-2 rounded-xl text-sm font-medium transition border"
      :class="active
        ? 'bg-tesla-red border-tesla-red text-white'
        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'">
      <slot />
    </button>
  `,
};

const NotifRow = {
  props: ['modelValue', 'label', 'icon'],
  emits: ['update:modelValue'],
  template: `
    <div class="bg-gray-800 rounded-xl px-4 py-3 space-y-1">
      <div class="flex items-center gap-3">
        <span class="text-xl">{{ icon }}</span>
        <span class="flex-1 text-sm text-white">{{ label }}</span>
        <button @click="$emit('update:modelValue', !modelValue)"
          class="w-10 h-5 rounded-full transition relative"
          :class="modelValue ? 'bg-tesla-red' : 'bg-gray-600'">
          <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'"></span>
        </button>
      </div>
      <slot />
    </div>
  `,
};

export default { components: { WizardStep, ToggleChip, NotifRow } };
</script>

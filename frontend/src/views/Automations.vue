<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('automations.title') }}</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('automations.subtitle') }}</p>
      </div>
      <button @click="openForm()" class="px-4 py-2 bg-tesla-red hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
        + {{ $t('automations.addRule') }}
      </button>
    </div>

    <template v-for="sid in layoutOrder" :key="sid">

    <SortableSection v-if="sid === 'rules'" page-id="automations" section-id="rules"
      :title="$t('automations.sectionRules')" icon="⚡"
      :collapsed="isCollapsed('rules')" @toggle="toggle('rules')" @move="(f,t,p) => moveSection(f,t,p)">

      <p v-if="!rules.length" class="text-gray-400">{{ $t('automations.noRules') }}</p>

      <div v-else class="space-y-3">
        <div v-for="rule in rules" :key="rule.id"
          class="flex items-start justify-between gap-3 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs px-2 py-0.5 rounded-full"
                :class="rule.enabled ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'">
                {{ rule.enabled ? $t('automations.ruleEnabled') : $t('automations.ruleDisabled') }}
              </span>
              <span class="text-sm font-medium">{{ triggerLabel(rule) }}</span>
              <span class="text-gray-500">→</span>
              <span class="text-sm text-tesla-red">{{ actionLabel(rule) }}</span>
            </div>
            <div class="flex gap-4 mt-2 text-xs text-gray-500">
              <span v-tooltip="$t('automations.tooltipCooldown')">
                {{ $t('automations.cooldownLabel') }}: {{ $t('automations.cooldownMinutes', { n: rule.cooldown_minutes }) }}
              </span>
              <span>
                {{ $t('automations.lastTriggered') }}:
                {{ rule.last_triggered_at ? fmtTs(rule.last_triggered_at) : $t('automations.never') }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button @click="toggleEnabled(rule)"
              class="p-1.5 rounded-lg hover:bg-gray-700 transition text-gray-400 hover:text-white"
              :title="rule.enabled ? $t('automations.ruleDisabled') : $t('automations.ruleEnabled')">
              <span class="text-base">{{ rule.enabled ? '⏸' : '▶' }}</span>
            </button>
            <button @click="deleteRule(rule)"
              class="p-1.5 rounded-lg hover:bg-red-900/50 transition text-gray-400 hover:text-red-400">
              <span class="text-base">🗑</span>
            </button>
          </div>
        </div>
      </div>
    </SortableSection>

    </template>

    <!-- New-Rule Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md space-y-4">
        <h2 class="text-lg font-semibold">{{ $t('automations.form.title') }}</h2>

        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-400 mb-1 block">{{ $t('automations.form.vehicle') }}</label>
            <select v-model="form.vehicle_id" class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700">
              <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.display_name }}</option>
            </select>
          </div>

          <div>
            <label class="text-xs text-gray-400 mb-1 block">{{ $t('automations.form.ruleType') }}</label>
            <select v-model="form.rule_type" class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700">
              <option value="soc_above">{{ $t('automations.ruleTypes.soc_above', { n: form.threshold ?? 80 }) }}</option>
              <option value="soc_below">{{ $t('automations.ruleTypes.soc_below', { n: form.threshold ?? 20 }) }}</option>
              <option value="charging_complete">{{ $t('automations.ruleTypes.charging_complete') }}</option>
              <option value="geofence_enter">{{ $t('automations.ruleTypes.geofence_enter') }}</option>
              <option value="geofence_exit">{{ $t('automations.ruleTypes.geofence_exit') }}</option>
            </select>
          </div>

          <div v-if="['soc_above','soc_below'].includes(form.rule_type)">
            <label class="text-xs text-gray-400 mb-1 block" v-tooltip="$t('automations.tooltipThreshold')">
              {{ $t('automations.form.threshold') }}
            </label>
            <input v-model.number="form.threshold" type="number" min="1" max="100"
              class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700" />
          </div>

          <div v-if="['geofence_enter','geofence_exit'].includes(form.rule_type)">
            <label class="text-xs text-gray-400 mb-1 block" v-tooltip="$t('automations.tooltipGeofence')">
              {{ $t('automations.form.geofence') }}
            </label>
            <select v-model="form.geofence_id" class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700">
              <option v-for="g in geofences" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>

          <div>
            <label class="text-xs text-gray-400 mb-1 block">{{ $t('automations.form.actionType') }}</label>
            <select v-model="form.action_type" class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700">
              <option value="push_notify">{{ $t('automations.actionTypes.push_notify') }}</option>
              <option value="climate_on">{{ $t('automations.actionTypes.climate_on') }}</option>
              <option value="climate_off">{{ $t('automations.actionTypes.climate_off') }}</option>
              <option value="climate_set_temp">{{ $t('automations.actionTypes.climate_set_temp') }}</option>
            </select>
          </div>

          <div v-if="form.action_type === 'push_notify'">
            <label class="text-xs text-gray-400 mb-1 block">{{ $t('automations.form.message') }}</label>
            <input v-model="form.action_param.message" type="text" maxlength="200"
              class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700" />
          </div>

          <div v-if="form.action_type === 'climate_set_temp'">
            <label class="text-xs text-gray-400 mb-1 block">{{ $t('automations.form.tempC') }}</label>
            <input v-model.number="form.action_param.temp_c" type="number" min="15" max="28"
              class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700" />
          </div>

          <div>
            <label class="text-xs text-gray-400 mb-1 block" v-tooltip="$t('automations.tooltipCooldown')">
              {{ $t('automations.form.cooldown') }}
            </label>
            <input v-model.number="form.cooldown_minutes" type="number" min="1" max="1440"
              class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700" />
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button @click="saveRule"
            class="flex-1 py-2 bg-tesla-red hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
            {{ $t('automations.form.save') }}
          </button>
          <button @click="showForm = false"
            class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">
            {{ $t('automations.form.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const { t } = useI18n();
const AUTO_SECTIONS = ['rules'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('automations', AUTO_SECTIONS);

const appStore = useAppStore();
const rules    = ref([]);
const vehicles = ref([]);
const geofences = ref([]);
const showForm  = ref(false);

const form = reactive({
  vehicle_id:    null,
  rule_type:     'soc_below',
  threshold:     20,
  geofence_id:   null,
  action_type:   'push_notify',
  action_param:  { message: '', temp_c: 21 },
  cooldown_minutes: 30,
});

async function load() {
  try {
    const [rRes, vRes] = await Promise.all([
      api.get('/notification-rules'),
      api.get('/vehicles'),
    ]);
    rules.value    = rRes.data;
    vehicles.value = vRes.data?.vehicles ?? vRes.data ?? [];
    if (vehicles.value.length && !form.vehicle_id)
      form.vehicle_id = vehicles.value[0].id;
  } catch { /* ignore */ }
}

async function loadGeofences() {
  if (geofences.value.length) return;
  try {
    const { data } = await api.get('/geofences');
    geofences.value = data ?? [];
  } catch { /* ignore */ }
}

function openForm() {
  form.vehicle_id = appStore.selectedVehicle?.id ?? vehicles.value[0]?.id ?? null;
  form.rule_type  = 'soc_below';
  form.threshold  = 20;
  form.geofence_id = null;
  form.action_type = 'push_notify';
  form.action_param = { message: '', temp_c: 21 };
  form.cooldown_minutes = 30;
  loadGeofences();
  showForm.value = true;
}

async function saveRule() {
  if (!form.vehicle_id || !form.rule_type || !form.action_type) return;
  const payload = {
    vehicle_id:  form.vehicle_id,
    rule_type:   form.rule_type,
    action_type: form.action_type,
    cooldown_minutes: form.cooldown_minutes,
    threshold:   ['soc_above','soc_below'].includes(form.rule_type) ? form.threshold : null,
    geofence_id: ['geofence_enter','geofence_exit'].includes(form.rule_type) ? form.geofence_id : null,
    action_param: form.action_type === 'push_notify'    ? { message: form.action_param.message }
                : form.action_type === 'climate_set_temp' ? { temp_c: form.action_param.temp_c }
                : null,
  };
  try {
    await api.post('/notification-rules', payload);
    showForm.value = false;
    load();
  } catch { /* ignore */ }
}

async function toggleEnabled(rule) {
  try {
    await api.patch(`/notification-rules/${rule.id}`, { enabled: !rule.enabled });
    load();
  } catch { /* ignore */ }
}

async function deleteRule(rule) {
  if (!confirm(t('automations.deleteConfirm'))) return;
  try {
    await api.delete(`/notification-rules/${rule.id}`);
    load();
  } catch { /* ignore */ }
}

function triggerLabel(rule) {
  const n = rule.threshold ?? '';
  switch (rule.rule_type) {
    case 'soc_above':          return t('automations.ruleTypes.soc_above', { n });
    case 'soc_below':          return t('automations.ruleTypes.soc_below', { n });
    case 'charging_complete':  return t('automations.ruleTypes.charging_complete');
    case 'geofence_enter':     return t('automations.ruleTypes.geofence_enter') + (rule.geofence_name ? ` (${rule.geofence_name})` : '');
    case 'geofence_exit':      return t('automations.ruleTypes.geofence_exit')  + (rule.geofence_name ? ` (${rule.geofence_name})` : '');
    default: return rule.rule_type;
  }
}

function actionLabel(rule) {
  switch (rule.action_type) {
    case 'push_notify':     return t('automations.actionTypes.push_notify');
    case 'climate_on':      return t('automations.actionTypes.climate_on');
    case 'climate_off':     return t('automations.actionTypes.climate_off');
    case 'climate_set_temp': {
      const p = rule.action_param ? JSON.parse(rule.action_param) : {};
      return t('automations.actionTypes.climate_set_temp') + (p.temp_c ? ` (${p.temp_c}°C)` : '');
    }
    default: return rule.action_type;
  }
}

function fmtTs(ts) {
  return new Date(ts * 1000).toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
</script>

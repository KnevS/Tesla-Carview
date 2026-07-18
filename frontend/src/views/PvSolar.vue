<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  PV-Überschussladen (S08).

  Liest den Solar-Überschuss aus Home Assistant (lokale REST-API) und zeigt
  die empfohlene Ladestromstärke. Admins konfigurieren die HA-Verbindung und
  die Anlagenparameter; „Jetzt anwenden" setzt den Ladestrom und startet/
  stoppt das Laden am Fahrzeug (Fleet-API + Virtual Key nötig).

  Datenquellen: GET/PUT /api/pv/config (Admin), GET /api/pv/status,
  POST /api/pv/:vehicleId/apply.
-->
<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        {{ $t('pvSolar.title') }}
        <InfoTip :text="$t('pvSolar.intro')" />
      </h1>
      <p class="text-gray-400 text-sm mt-0.5">{{ $t('pvSolar.subtitle') }}</p>
    </div>

    <!-- Leerzustand ohne Admin-Rechte -->
    <div v-if="status && status.configured === false && !isAdmin"
         class="bg-gray-800 rounded-xl p-6 text-center text-gray-300">
      {{ $t('pvSolar.notConfiguredUser') }}
    </div>

    <!-- Status -->
    <div v-if="status && status.configured" class="bg-gray-800 rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm font-semibold">{{ $t('pvSolar.statusTitle') }}</p>
        <div class="flex items-center gap-2">
          <button @click="loadStatus" class="btn-secondary text-xs" v-tooltip="$t('pvSolar.refresh')">↻</button>
          <button @click="apply" :disabled="applying"
            class="btn-primary text-xs disabled:opacity-40"
            v-tooltip="$t('pvSolar.applyTip')">
            {{ applying ? $t('pvSolar.applying') : $t('pvSolar.apply') }}
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="bg-gray-700/50 rounded-xl p-3">
          <p class="text-xs text-gray-400">{{ $t('pvSolar.surplus') }}</p>
          <p class="text-2xl font-bold" :class="status.above_threshold ? 'text-green-400' : 'text-gray-200'">
            {{ fmt(status.surplus_w) }} <span class="text-sm font-normal text-gray-400">W</span>
          </p>
        </div>
        <div class="bg-gray-700/50 rounded-xl p-3">
          <p class="text-xs text-gray-400">{{ $t('pvSolar.recommendedAmps') }}</p>
          <p class="text-2xl font-bold text-gray-200">{{ status.recommended_amps }} <span class="text-sm font-normal text-gray-400">A</span></p>
        </div>
        <div class="bg-gray-700/50 rounded-xl p-3 flex flex-col justify-center">
          <span class="text-xs px-2 py-0.5 rounded-full self-start"
            :class="status.above_threshold ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'">
            {{ status.above_threshold ? $t('pvSolar.aboveThreshold') : $t('pvSolar.belowThreshold') }}
          </span>
          <p class="text-xs text-gray-500 mt-1">{{ $t('pvSolar.threshold', { value: fmt(status.min_surplus_w) }) }}</p>
        </div>
      </div>
      <p v-if="applyResult" class="text-xs mt-3" :class="applyResult.ok ? 'text-green-400' : 'text-red-400'">
        {{ applyResult.msg }}
      </p>
      <p v-if="status.error" class="text-xs text-red-400 mt-3">{{ status.error }}</p>
    </div>

    <!-- Admin-Konfiguration -->
    <div v-if="isAdmin" class="bg-gray-800 rounded-xl p-4">
      <p class="text-sm font-semibold mb-3">{{ $t('pvSolar.cfgTitle') }}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label class="block sm:col-span-2">
          <span class="text-xs text-gray-400 flex items-center gap-1">{{ $t('pvSolar.haUrl') }} <InfoTip :text="$t('pvSolar.haUrlTip')" /></span>
          <input v-model="cfg.ha_url" type="text" placeholder="http://homeassistant.local:8123"
            class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-400 flex items-center gap-1">{{ $t('pvSolar.haToken') }} <InfoTip :text="$t('pvSolar.haTokenTip')" /></span>
          <input v-model="cfg.ha_token" type="password"
            :placeholder="cfg.token_configured ? '••••••••' : ''"
            class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-400 flex items-center gap-1">{{ $t('pvSolar.entity') }} <InfoTip :text="$t('pvSolar.entityTip')" /></span>
          <input v-model="cfg.surplus_entity" type="text" placeholder="sensor.pv_ueberschuss"
            class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-400 flex items-center gap-1">{{ $t('pvSolar.minSurplus') }} <InfoTip :text="$t('pvSolar.minSurplusTip')" /></span>
          <input v-model.number="cfg.min_surplus_w" type="number" min="0" max="50000" step="100"
            class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-400">{{ $t('pvSolar.phases') }}</span>
          <select v-model.number="cfg.phases" class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600">
            <option :value="1">1</option>
            <option :value="3">3</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs text-gray-400">{{ $t('pvSolar.voltage') }}</span>
          <input v-model.number="cfg.voltage" type="number" min="100" max="500"
            class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-400 flex items-center gap-1">{{ $t('pvSolar.maxAmps') }} <InfoTip :text="$t('pvSolar.maxAmpsTip')" /></span>
          <input v-model.number="cfg.max_amps" type="number" min="5" max="80"
            class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
        </label>
        <label class="flex items-center gap-2 mt-5">
          <input v-model="cfg.enabled" type="checkbox" class="accent-tesla-red" />
          <span class="text-sm text-gray-300 flex items-center gap-1">{{ $t('pvSolar.enabled') }} <InfoTip :text="$t('pvSolar.enabledTip')" /></span>
        </label>
      </div>
      <div class="flex items-center gap-3 mt-4">
        <button @click="saveCfg" :disabled="saving" class="btn-primary text-sm disabled:opacity-40">
          {{ saving ? $t('pvSolar.saving') : $t('pvSolar.save') }}
        </button>
        <p v-if="savedMsg" class="text-xs text-green-400">{{ savedMsg }}</p>
        <p v-if="cfgError" class="text-xs text-red-400">{{ cfgError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth.js';
import { useAppStore } from '../store/index.js';
import InfoTip from '../components/InfoTip.vue';
import api from '../api.js';

const { t } = useI18n();
const auth = useAuthStore();
const appStore = useAppStore();
const isAdmin = auth.isAdmin;

const status = ref(null);
const applying = ref(false);
const applyResult = ref(null);
const saving = ref(false);
const savedMsg = ref('');
const cfgError = ref('');
let pollTimer = null;

const cfg = reactive({
  ha_url: '', ha_token: '', surplus_entity: '',
  min_surplus_w: 1400, voltage: 230, phases: 1, max_amps: 16,
  enabled: false, token_configured: false,
});

const fmt = v => Number(v || 0).toLocaleString();

async function loadStatus() {
  try {
    const { data } = await api.get('/pv/status');
    status.value = data;
  } catch (err) {
    status.value = { configured: true, error: err.response?.data?.error || err.message };
  }
}

async function loadCfg() {
  if (!isAdmin) return;
  try {
    const { data } = await api.get('/pv/config');
    Object.assign(cfg, data, { ha_token: '' });
  } catch { /* ignoriert */ }
}

async function saveCfg() {
  saving.value = true; savedMsg.value = ''; cfgError.value = '';
  try {
    const body = {
      ha_url: cfg.ha_url, surplus_entity: cfg.surplus_entity,
      min_surplus_w: cfg.min_surplus_w, voltage: cfg.voltage,
      phases: cfg.phases, max_amps: cfg.max_amps, enabled: cfg.enabled,
    };
    if (cfg.ha_token) body.ha_token = cfg.ha_token;   // nur bei Neueingabe senden
    await api.put('/pv/config', body);
    savedMsg.value = t('pvSolar.saved');
    cfg.ha_token = '';
    await loadCfg();
    await loadStatus();
  } catch (err) {
    cfgError.value = err.response?.data?.error || err.message;
  } finally { saving.value = false; }
}

async function apply() {
  const v = appStore.selectedVehicle;
  if (!v) { applyResult.value = { ok: false, msg: t('pvSolar.noVehicle') }; return; }
  applying.value = true; applyResult.value = null;
  try {
    const { data } = await api.post(`/pv/${v.id}/apply`);
    applyResult.value = {
      ok: true,
      msg: data.action === 'start'
        ? t('pvSolar.applyStart', { amps: data.recommended_amps })
        : t('pvSolar.applyStop'),
    };
    await loadStatus();
  } catch (err) {
    applyResult.value = { ok: false, msg: err.response?.data?.error || err.message };
  } finally { applying.value = false; }
}

onMounted(async () => {
  await Promise.all([loadCfg(), loadStatus()]);
  pollTimer = setInterval(loadStatus, 30000);
});
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });
</script>

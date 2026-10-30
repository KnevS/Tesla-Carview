<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<!--
  Integrations-Tokens für Hausautomationen (ioBroker, Home Assistant, …).
  Admins legen je Fahrzeug einen Token an: nur lesen (Ladezustand) oder
  zusätzlich laden (Ladestrom setzen, Laden starten/stoppen). Der Token wird
  genau einmal angezeigt; gespeichert ist nur sein Hash.

  Datenquellen: GET/POST /api/integration/tokens, DELETE /api/integration/tokens/:id.
-->
<template>
  <div class="bg-gray-800 rounded-xl p-4">
    <p class="text-sm font-semibold flex items-center gap-1">
      {{ $t('integration.title') }} <InfoTip :text="$t('integration.intro')" />
    </p>
    <p class="text-xs text-gray-400 mt-0.5 mb-3">{{ $t('integration.subtitle') }}</p>

    <!-- Neu angelegter Token: nur jetzt sichtbar -->
    <div v-if="created" class="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-3">
      <p class="text-xs text-green-300 mb-2">{{ $t('integration.createdOnce') }}</p>
      <div class="flex items-center gap-2">
        <code class="flex-1 text-xs bg-gray-900 rounded px-2 py-1.5 break-all">{{ created.token }}</code>
        <button @click="copy" class="btn-secondary text-xs">{{ copied ? '✓' : $t('common.copy') }}</button>
      </div>
      <p class="text-xs text-gray-400 mt-2">{{ $t('integration.endpoint') }}: <code>{{ created.endpoint }}</code></p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <label class="block sm:col-span-1">
        <span class="text-xs text-gray-400">{{ $t('integration.label') }}</span>
        <input v-model="form.label" type="text" maxlength="80" placeholder="ioBroker"
          class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-400">{{ $t('integration.vehicle') }}</span>
        <select v-model.number="form.vehicle_id" class="mt-1 w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600">
          <option v-for="v in appStore.vehicles" :key="v.id" :value="v.id">{{ v.display_name || v.id }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.charge" type="checkbox" class="accent-tesla-red" />
        <span>{{ $t('integration.allowCharge') }}</span>
        <InfoTip :text="$t('integration.allowChargeTip')" />
      </label>
      <button @click="create" :disabled="busy || !form.label || !form.vehicle_id" class="btn-primary text-sm disabled:opacity-40">
        {{ $t('integration.create') }}
      </button>
    </div>
    <p v-if="error" class="text-xs text-red-400 mt-2">{{ error }}</p>

    <table v-if="tokens.length" class="w-full text-sm mt-4">
      <thead>
        <tr class="text-xs text-gray-400 text-left">
          <th class="py-1">{{ $t('integration.label') }}</th>
          <th>{{ $t('integration.vehicle') }}</th>
          <th>{{ $t('integration.rights') }}</th>
          <th>{{ $t('integration.lastUsed') }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tk in tokens" :key="tk.id" class="border-t border-gray-700">
          <td class="py-1.5">{{ tk.label }} <span class="text-xs text-gray-500">…{{ tk.token_hint }}</span></td>
          <td>{{ tk.vehicle_name || tk.vehicle_id }}</td>
          <td>{{ tk.scopes.includes('charge') ? $t('integration.readCharge') : $t('integration.readOnly') }}</td>
          <td class="text-xs text-gray-400">{{ tk.last_used_at ? new Date(tk.last_used_at * 1000).toLocaleString() : '–' }}</td>
          <td class="text-right">
            <button @click="remove(tk)" class="text-xs text-red-400 hover:text-red-300">{{ $t('integration.revoke') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import InfoTip from './InfoTip.vue';
import api from '../api.js';

const { t } = useI18n();
const appStore = useAppStore();
const tokens = ref([]);
const created = ref(null);
const copied = ref(false);
const busy = ref(false);
const error = ref('');
const form = reactive({ label: 'ioBroker', vehicle_id: appStore.selectedVehicle?.id ?? null, charge: false });

async function load() {
  try { tokens.value = (await api.get('/integration/tokens')).data; } catch { /* ignoriert */ }
}

async function create() {
  busy.value = true; error.value = ''; created.value = null; copied.value = false;
  try {
    const { data } = await api.post('/integration/tokens', {
      label: form.label, vehicle_id: form.vehicle_id, scopes: form.charge ? ['read', 'charge'] : ['read'],
    });
    created.value = data;
    await load();
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  } finally { busy.value = false; }
}

async function remove(tk) {
  if (!window.confirm(t('integration.revokeConfirm', { label: tk.label }))) return;
  try { await api.delete(`/integration/tokens/${tk.id}`); await load(); } catch (err) { error.value = err.response?.data?.error || err.message; }
}

async function copy() {
  try { await navigator.clipboard.writeText(created.value.token); copied.value = true; } catch { /* Kopieren nicht erlaubt */ }
}

onMounted(load);
</script>

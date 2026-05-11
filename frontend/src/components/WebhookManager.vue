<!--
  WebhookManager.vue
  Admin-Card fuer Outbound-Webhooks. Wird in Settings.vue eingebunden,
  v-if="auth.isAdmin". Strings sind via $t() lokalisiert; Keys leben
  unter dem Namespace `webhooks.*` in den Locale-Files.
-->
<template>
  <div class="space-y-3">
    <p class="text-xs text-gray-400">
      <i18n-t keypath="webhooks.intro" tag="span">
        <template #signatureHeader>
          <code class="text-tesla-red">sha256=&lt;hex&gt;</code>
        </template>
      </i18n-t>
    </p>

    <!-- Liste vorhandener Webhooks -->
    <div v-if="webhooks.length" class="space-y-2">
      <div v-for="w in webhooks" :key="w.id"
           class="bg-gray-800/60 rounded-lg p-3 space-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-lg leading-none" :class="dotClass(w)" v-tooltip="statusTooltip(w)">●</span>
          <span class="font-medium text-sm truncate">{{ w.name }}</span>
          <span v-if="!w.is_active" class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
            {{ $t('webhooks.disabledBadge') }}
          </span>
          <span class="ml-auto flex gap-2">
            <button @click="testHook(w)" :disabled="testing === w.id"
                    class="text-xs text-blue-300 hover:text-blue-100 transition disabled:opacity-40">
              {{ testing === w.id ? '…' : $t('webhooks.testBtn') }}
            </button>
            <button @click="toggleActive(w)"
                    class="text-xs text-yellow-300 hover:text-yellow-100 transition">
              {{ w.is_active ? $t('webhooks.disableBtn') : $t('webhooks.enableBtn') }}
            </button>
            <button @click="remove(w)"
                    class="text-xs text-red-400 hover:text-red-200 transition">✕</button>
          </span>
        </div>
        <p class="text-xs font-mono text-gray-400 truncate" v-tooltip="w.url">{{ shortUrl(w.url) }}</p>
        <div class="flex flex-wrap gap-1">
          <span v-for="ev in w.events" :key="ev"
                class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-700/70 text-gray-200 font-mono">
            {{ ev }}
          </span>
        </div>
        <p v-if="w.last_fired_at" class="text-[11px] text-gray-500">
          {{ $t('webhooks.lastFired') }}: {{ fmtDate(w.last_fired_at) }}
          <span v-if="w.last_status != null" class="ml-1"
                :class="w.last_status >= 200 && w.last_status < 300 ? 'text-green-400' : 'text-red-300'">
            (HTTP {{ w.last_status || 'n/a' }})
          </span>
        </p>
        <p v-if="w.last_error" class="text-[11px] text-red-300">{{ w.last_error }}</p>
      </div>
    </div>
    <p v-else class="text-xs text-gray-500 italic">{{ $t('webhooks.empty') }}</p>

    <!-- Anlegen-Form -->
    <div class="bg-gray-800/40 rounded-lg p-3 space-y-2">
      <p class="text-xs text-gray-300 font-medium">{{ $t('webhooks.addHeader') }}</p>
      <div class="grid grid-cols-2 gap-2">
        <input v-model="form.name" type="text" class="input text-sm"
               :placeholder="$t('webhooks.namePlaceholder')" />
        <input v-model="form.url" type="url" class="input text-sm font-mono col-span-1"
               :placeholder="$t('webhooks.urlPlaceholder')" />
      </div>
      <div class="flex flex-wrap gap-3 text-xs text-gray-300">
        <label v-for="ev in supportedEvents" :key="ev" class="inline-flex items-center gap-1.5">
          <input type="checkbox" :value="ev" v-model="form.events" class="accent-tesla-red" />
          <span class="font-mono">{{ ev }}</span>
        </label>
      </div>
      <button @click="save" :disabled="!canSave || saving"
              class="btn-primary text-sm w-full">
        {{ saving ? $t('webhooks.saving') : $t('webhooks.addBtn') }}
      </button>
      <p v-if="msg" class="text-xs" :class="msgOk ? 'text-green-400' : 'text-red-400'">{{ msg }}</p>
    </div>

    <!-- Secret-Toast nach Anlegen -->
    <div v-if="newSecret" class="bg-yellow-900/30 border border-yellow-700/40 rounded-lg p-3 space-y-1 text-sm">
      <p class="font-semibold text-yellow-200">{{ $t('webhooks.secretTitle') }}</p>
      <p class="text-xs text-yellow-100/80">{{ $t('webhooks.secretHint') }}</p>
      <code class="block break-all text-xs font-mono bg-black/40 rounded px-2 py-1 text-yellow-100">{{ newSecret }}</code>
      <button @click="newSecret = ''" class="btn-secondary text-xs">{{ $t('webhooks.dismiss') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../api.js';

const { t } = useI18n();
const webhooks        = ref([]);
const supportedEvents = ref(['trip.completed', 'charging.completed', 'service.due']);
const form            = ref({ name: '', url: '', events: [] });
const msg             = ref('');
const msgOk           = ref(false);
const saving          = ref(false);
const testing         = ref(null);
const newSecret       = ref('');

const canSave = computed(() =>
  form.value.name.trim().length > 0 &&
  /^https?:\/\//i.test(form.value.url.trim()) &&
  form.value.events.length > 0,
);

async function load() {
  try {
    const { data } = await api.get('/webhooks');
    webhooks.value = data.webhooks || [];
    if (Array.isArray(data.supported_events) && data.supported_events.length) {
      supportedEvents.value = data.supported_events;
    }
  } catch { webhooks.value = []; }
}

async function save() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  msg.value = '';
  try {
    const { data } = await api.post('/webhooks', {
      name:   form.value.name.trim(),
      url:    form.value.url.trim(),
      events: form.value.events.slice(),
    });
    if (data.secret) newSecret.value = data.secret;
    form.value = { name: '', url: '', events: [] };
    msgOk.value = true;
    msg.value = '✓ ' + t('webhooks.savedMsg');
    await load();
    setTimeout(() => { msg.value = ''; }, 2500);
  } catch (err) {
    msgOk.value = false;
    msg.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
}

async function remove(w) {
  if (!confirm(t('webhooks.removeConfirm', { name: w.name }))) return;
  try {
    await api.delete(`/webhooks/${w.id}`);
    await load();
  } catch (err) {
    msg.value = err.response?.data?.error || err.message;
    msgOk.value = false;
  }
}

async function toggleActive(w) {
  try {
    await api.patch(`/webhooks/${w.id}`, { is_active: !w.is_active });
    await load();
  } catch (err) {
    msg.value = err.response?.data?.error || err.message;
    msgOk.value = false;
  }
}

async function testHook(w) {
  if (testing.value) return;
  testing.value = w.id;
  try {
    const { data } = await api.post(`/webhooks/${w.id}/test`);
    msgOk.value = !!data.ok;
    msg.value = data.ok
      ? `✓ ${t('webhooks.testOk', { status: data.status })}`
      : `✗ ${t('webhooks.testFail', { error: data.error || t('webhooks.unknownError') })}`;
    await load();
  } catch (err) {
    msgOk.value = false;
    msg.value = err.response?.data?.error || err.message;
  } finally {
    testing.value = null;
    setTimeout(() => { msg.value = ''; }, 4000);
  }
}

function shortUrl(u) {
  try {
    const url = new URL(u);
    const path = url.pathname.length > 30 ? url.pathname.slice(0, 27) + '…' : url.pathname;
    return `${url.protocol}//${url.host}${path}`;
  } catch { return u; }
}

function fmtDate(ts) { return new Date(ts * 1000).toLocaleString(); }

function dotClass(w) {
  if (!w.is_active) return 'text-gray-500';
  if (w.last_status == null) return 'text-gray-400';
  if (w.last_status >= 200 && w.last_status < 300) return 'text-green-400';
  return 'text-red-400';
}

function statusTooltip(w) {
  if (!w.is_active) return t('webhooks.tooltipDisabled');
  if (w.last_status == null) return t('webhooks.tooltipNever');
  if (w.last_status >= 200 && w.last_status < 300) return t('webhooks.tooltipOk', { status: w.last_status });
  return t('webhooks.tooltipFail', { error: w.last_error || w.last_status });
}

onMounted(load);
</script>

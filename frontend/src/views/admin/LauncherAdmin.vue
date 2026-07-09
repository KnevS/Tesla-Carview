<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="max-w-3xl space-y-4">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold">{{ $t('launcherAdmin.title') }}</h1>
      <span class="text-xs bg-tesla-red/20 text-tesla-red px-2 py-0.5 rounded-full font-medium">Admin</span>
    </div>

    <p class="text-sm text-gray-400">{{ $t('launcherAdmin.subtitle') }}</p>

    <div v-if="apps.length" class="space-y-2">
      <div v-for="app in apps" :key="app.slug"
        class="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
        <span class="text-3xl">{{ app.icon }}</span>
        <div class="flex-1">
          <p class="font-semibold">{{ $t(app.label_i18n) }}</p>
          <p class="text-xs text-gray-400">
            <a :href="app.url" target="_blank" rel="noopener noreferrer" class="hover:underline">
              {{ app.url }}
            </a>
            · {{ $t('launcher.category.' + app.category) }}
            <span v-if="app.note_i18n"> · {{ $t(app.note_i18n) }}</span>
          </p>
        </div>
        <button @click="toggle(app)"
          v-tooltip="app.enabled ? $t('launcherAdmin.disable') : $t('launcherAdmin.enable')"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
          :class="app.enabled
            ? 'bg-green-700 hover:bg-green-600 text-white'
            : 'bg-gray-600 hover:bg-gray-500 text-gray-200'">
          {{ app.enabled ? $t('launcherAdmin.statusEnabled') : $t('launcherAdmin.statusDisabled') }}
        </button>
      </div>
    </div>
    <p v-else-if="loaded" class="text-gray-400 text-sm">{{ $t('launcherAdmin.noApps') }}</p>

    <!-- Eigene Apps: anlegen, ändern, löschen -->
    <div class="pt-2">
      <div class="flex items-center justify-between mb-1">
        <h2 class="text-lg font-semibold">{{ $t('launcherAdmin.customTitle') }}</h2>
        <button v-if="editing === null" @click="startNew" class="btn-primary text-sm">
          ＋ {{ $t('launcherAdmin.add') }}
        </button>
      </div>
      <p class="text-sm text-gray-400 mb-3">{{ $t('launcherAdmin.customSubtitle') }}</p>

      <!-- Formular (neu / bearbeiten) -->
      <div v-if="editing !== null" class="bg-gray-800 rounded-lg p-4 mb-3 space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-[5rem_1fr] gap-3">
          <div>
            <label class="text-xs text-gray-500 block mb-0.5">{{ $t('launcherAdmin.icon') }}</label>
            <input v-model="form.icon" type="text" maxlength="8"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-2xl text-center" placeholder="🌐">
          </div>
          <div>
            <label class="text-xs text-gray-500 block mb-0.5">{{ $t('launcherAdmin.name') }}</label>
            <input v-model="form.name" type="text" maxlength="60"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" placeholder="z. B. Tagesschau">
          </div>
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-0.5">URL</label>
          <input v-model="form.url" type="url" maxlength="300"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" placeholder="https://…">
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-0.5">{{ $t('launcherAdmin.note') }}</label>
          <input v-model="form.note" type="text" maxlength="140"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm">
        </div>
        <p v-if="formError" class="text-sm text-red-400">{{ formError }}</p>
        <div class="flex gap-2">
          <button @click="save" class="btn-primary text-sm">{{ $t('launcherAdmin.save') }}</button>
          <button @click="editing = null" class="btn-secondary text-sm">{{ $t('launcherAdmin.cancel') }}</button>
        </div>
      </div>

      <!-- Liste eigener Apps -->
      <div v-if="custom.length" class="space-y-2">
        <div v-for="app in custom" :key="app.id"
          class="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
          <span class="text-3xl">{{ app.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold">{{ app.label }}</p>
            <p class="text-xs text-gray-400 truncate">
              <a :href="app.url" target="_blank" rel="noopener noreferrer" class="hover:underline">{{ app.url }}</a>
              <span v-if="app.note"> · {{ app.note }}</span>
            </p>
          </div>
          <button @click="startEdit(app)" class="btn-secondary text-sm"
            v-tooltip="$t('launcherAdmin.edit')">✎</button>
          <button @click="remove(app)" class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
            :class="armedDelete === app.id ? 'bg-red-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'"
            v-tooltip="$t('launcherAdmin.delete')">
            {{ armedDelete === app.id ? $t('launcherAdmin.confirmDelete') : '🗑' }}
          </button>
        </div>
      </div>
      <p v-else-if="loaded && editing === null" class="text-gray-400 text-sm">
        {{ $t('launcherAdmin.noCustom') }}
      </p>
    </div>

    <div class="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
      <p class="font-semibold mb-2">{{ $t('launcherAdmin.hintTitle') }}</p>
      <p class="text-gray-400">{{ $t('launcherAdmin.hintBody') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../api.js';

const { t } = useI18n();
const apps = ref([]);
const custom = ref([]);
const loaded = ref(false);

// CRUD-State für eigene Apps
const editing = ref(null);        // null | 'new' | <id>
const form = ref({ name: '', url: '', icon: '', note: '' });
const formError = ref('');
const armedDelete = ref(null);    // Zwei-Klick-Löschen statt confirm()

async function load() {
  try {
    const { data } = await api.get('/launcher/admin');
    apps.value = data.apps || [];
    custom.value = data.custom || [];
  } catch {
    apps.value = [];
    custom.value = [];
  } finally {
    loaded.value = true;
  }
}

function startNew() {
  form.value = { name: '', url: '', icon: '', note: '' };
  formError.value = '';
  editing.value = 'new';
}

function startEdit(app) {
  form.value = { name: app.label, url: app.url, icon: app.icon, note: app.note ?? '' };
  formError.value = '';
  editing.value = app.id;
}

async function save() {
  formError.value = '';
  try {
    const payload = { ...form.value };
    const { data } = editing.value === 'new'
      ? await api.post('/launcher/admin/apps', payload)
      : await api.put(`/launcher/admin/apps/${editing.value}`, payload);
    custom.value = data.custom || [];
    editing.value = null;
  } catch (e) {
    formError.value = e.response?.data?.error === 'invalid url'
      ? t('launcherAdmin.urlInvalid')
      : (e.response?.data?.error || e.message);
  }
}

async function remove(app) {
  if (armedDelete.value !== app.id) {
    armedDelete.value = app.id;
    setTimeout(() => { if (armedDelete.value === app.id) armedDelete.value = null; }, 4000);
    return;
  }
  armedDelete.value = null;
  try {
    const { data } = await api.delete(`/launcher/admin/apps/${app.id}`);
    custom.value = data.custom || [];
  } catch (e) {
    console.error('[LauncherAdmin] löschen fehlgeschlagen:', e);
  }
}

async function toggle(app) {
  const action = app.enabled ? 'disable' : 'enable';
  try {
    await api.post(`/launcher/admin/${action}/${app.slug}`);
    app.enabled = !app.enabled;
  } catch (e) {
    console.error('[LauncherAdmin] toggle fehlgeschlagen:', e);
  }
}

onMounted(load);
</script>

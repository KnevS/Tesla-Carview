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

    <div class="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
      <p class="font-semibold mb-2">{{ $t('launcherAdmin.hintTitle') }}</p>
      <p class="text-gray-400">{{ $t('launcherAdmin.hintBody') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api.js';

const apps = ref([]);
const loaded = ref(false);

async function load() {
  try {
    const { data } = await api.get('/launcher/admin');
    apps.value = data.apps || [];
  } catch {
    apps.value = [];
  } finally {
    loaded.value = true;
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

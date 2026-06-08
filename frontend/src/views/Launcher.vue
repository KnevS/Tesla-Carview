<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('launcher.title') }}</h1>
        <p class="text-gray-400 text-sm mt-1">{{ $t('launcher.subtitle') }}</p>
      </div>
    </div>

    <!-- Category-Filter -->
    <div v-if="apps.length" class="flex flex-wrap gap-2">
      <button @click="filter = 'all'"
        class="px-3 py-1.5 rounded-lg text-sm transition"
        :class="filter === 'all' ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'">
        {{ $t('launcher.category.all') }} ({{ apps.length }})
      </button>
      <button v-for="cat in availableCategories" :key="cat"
        @click="filter = cat"
        class="px-3 py-1.5 rounded-lg text-sm transition"
        :class="filter === cat ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300'">
        {{ $t('launcher.category.' + cat) }} ({{ countByCategory[cat] }})
      </button>
    </div>

    <!-- App-Grid -->
    <div v-if="filteredApps.length" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <a v-for="app in filteredApps" :key="app.slug"
        :href="app.url" target="_blank" rel="noopener noreferrer"
        class="bg-gray-800 hover:bg-gray-700 rounded-xl p-5 flex flex-col items-center text-center transition active:scale-95">
        <span class="text-5xl mb-3" aria-hidden="true">{{ app.icon }}</span>
        <p class="font-semibold text-base">{{ $t(app.label_i18n) }}</p>
        <p v-if="app.note_i18n" class="text-gray-400 text-xs mt-1">{{ $t(app.note_i18n) }}</p>
      </a>
    </div>
    <p v-else-if="loaded" class="text-gray-400 text-sm">{{ $t('launcher.empty') }}</p>

    <!-- Hinweis -->
    <div class="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
      <p class="font-semibold mb-2">{{ $t('launcher.hintTitle') }}</p>
      <p class="text-gray-400">{{ $t('launcher.hintBody') }}</p>
    </div>

    <!-- Admin-Link -->
    <p v-if="isAdmin" class="text-xs">
      <router-link to="/admin?tab=launcher" class="text-tesla-red hover:underline">
        {{ $t('launcher.adminLink') }}
      </router-link>
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';

const apps = ref([]);
const loaded = ref(false);
const filter = ref('all');
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin');

const availableCategories = computed(() => {
  const set = new Set(apps.value.map(a => a.category));
  return [...set];
});
const countByCategory = computed(() => {
  const m = {};
  for (const a of apps.value) m[a.category] = (m[a.category] || 0) + 1;
  return m;
});
const filteredApps = computed(() =>
  filter.value === 'all'
    ? apps.value
    : apps.value.filter(a => a.category === filter.value)
);

onMounted(async () => {
  try {
    const { data } = await api.get('/launcher/apps');
    apps.value = data.apps || [];
  } catch {
    apps.value = [];
  } finally {
    loaded.value = true;
  }
});
</script>

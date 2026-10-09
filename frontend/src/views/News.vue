<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-4 max-w-3xl">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('news.title') }}</h1>
      <p class="text-gray-400 text-sm mt-0.5">{{ $t('news.subtitle') }}</p>
    </div>

    <article v-for="n in items" :key="n.id" class="card">
      <div class="flex items-start gap-3">
        <span class="text-2xl leading-none" aria-hidden="true">{{ n.icon }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-400">
            <span class="font-mono">{{ n.id }}</span> · {{ fmtDate(n.date) }}
            <span v-if="unreadIds.has(n.id)" class="ml-2 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">{{ $t('news.new') }}</span>
          </p>
          <h2 class="text-lg font-semibold mt-1">{{ n.title }}</h2>
          <p class="text-gray-300 text-sm mt-1">{{ n.body }}</p>
          <RouterLink v-if="n.path !== '/news'" :to="n.path" class="inline-block mt-2 text-sm text-sky-300 hover:underline">{{ $t('news.open') }} →</RouterLink>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePrefsStore } from '../store/prefs.js';
import { NEWS, localizedNews, unreadNews } from '../news/news.js';

const prefs = usePrefsStore();
const { locale } = useI18n();

// Beim Oeffnen gilt alles als gelesen — die „Neu"-Marke zeigt aber noch,
// was beim Aufruf ungelesen war.
const unreadIds = new Set(unreadNews(prefs.data.news_seen).map(n => n.id));
const items = computed(() => localizedNews(locale.value));

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' });
}

onMounted(() => prefs.set('news_seen', NEWS[0].id));
</script>

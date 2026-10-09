<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <!-- Info-Hinweis auf die neueste ungelesene Neuigkeit. Verschwindet nach
       „Ansehen", „Alle Neuigkeiten" oder „Ausblenden" (pro Nutzer gemerkt). -->
  <div v-if="visible" class="max-w-7xl w-full mx-auto px-4 pt-3">
    <div class="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3" role="status">
      <span class="text-xl leading-none mt-0.5" aria-hidden="true">{{ latest.icon }}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm">
          <span class="text-sky-300 font-semibold">{{ $t('news.bannerLabel', { version: latest.id }) }}</span>
          <span class="font-semibold"> · {{ latest.title }}</span>
        </p>
        <p class="text-sm text-gray-300 mt-0.5 line-clamp-2">{{ latest.body }}</p>
        <div class="flex flex-wrap items-center gap-3 mt-2 text-sm">
          <button v-if="latest.path !== '/news'" class="text-sky-300 hover:underline font-medium" @click="open(latest.path)">{{ $t('news.open') }} →</button>
          <button class="text-gray-300 hover:underline" @click="open('/news')">
            {{ $t('news.all') }}<span v-if="unread.length > 1"> ({{ $t('news.more', { n: unread.length - 1 }) }})</span>
          </button>
        </div>
      </div>
      <button class="text-gray-400 hover:text-white p-1 -m-1" :aria-label="$t('news.dismiss')" v-tooltip="$t('news.dismiss')" @click="markSeen">✕</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePrefsStore } from '../store/prefs.js';
import { NEWS, localizedNews, unreadNews } from '../news/news.js';

const prefs  = usePrefsStore();
const route  = useRoute();
const router = useRouter();
const { locale } = useI18n();

const unread = computed(() => unreadNews(prefs.data.news_seen));
const latest = computed(() => localizedNews(locale.value).find(n => n.id === unread.value[0]?.id));
// Erst nach dem Laden der Praeferenzen zeigen — sonst blitzt der Hinweis
// bei jedem Start kurz auf, bevor der gespeicherte Lesestand da ist.
const visible = computed(() => prefs.loaded && !!latest.value && route.path !== '/news');

function markSeen() {
  prefs.set('news_seen', NEWS[0].id);
}

function open(path) {
  markSeen();
  router.push(path);
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('legal.adminTitle') }}</h1>
      <p class="text-sm text-gray-400 mt-1 max-w-3xl">{{ $t('legal.adminIntro') }}</p>
    </div>

    <!-- Default-Sprache-Modus: nur DE pflegen, alle Locales mit-syncen -->
    <label class="flex items-start gap-2 cursor-pointer text-sm">
      <input type="checkbox" v-model="syncMode" class="mt-1 h-4 w-4 accent-tesla-red" />
      <span>
        <span class="text-gray-200 font-medium">{{ $t('legal.adminSyncMode') }}</span>
        <span class="block text-xs text-gray-500 mt-0.5">{{ $t('legal.adminSyncModeHint') }}</span>
      </span>
    </label>

    <!-- Scope-Tabs -->
    <div class="flex gap-2 flex-wrap">
      <button v-for="s in SCOPES" :key="s"
              @click="scope = s"
              class="px-4 py-1.5 rounded-lg text-sm transition"
              :class="scope === s ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'">
        {{ scopeLabel(s) }}
      </button>
    </div>

    <!-- Locale-Tabs (mit Versions-Badge) — im Sync-Mode nur DE editierbar -->
    <div class="flex gap-1.5 flex-wrap">
      <button v-for="l in LOCALES" :key="l"
              @click="!syncMode || l === DEFAULT_LOCALE ? (locale = l) : null"
              :disabled="syncMode && l !== DEFAULT_LOCALE"
              class="px-3 py-1 rounded-lg text-xs transition flex items-center gap-1.5"
              :class="[
                locale === l ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
                (syncMode && l !== DEFAULT_LOCALE) ? 'opacity-40 cursor-not-allowed' : '',
              ]">
        <span class="font-mono uppercase">{{ l }}</span>
        <span v-if="versionMap[`${scope}/${l}`]"
              class="text-[10px] opacity-70">v{{ versionMap[`${scope}/${l}`] }}</span>
        <span v-if="syncMode && l !== DEFAULT_LOCALE" class="text-[10px]">🔗</span>
      </button>
    </div>

    <!-- Editor + Preview -->
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="card space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm text-gray-300">
            {{ $t('legal.adminEditing', { scope: scopeLabel(scope), locale: locale.toUpperCase() }) }}
          </h2>
          <span v-if="meta?.updated_at" class="text-xs text-gray-500">
            {{ $t('legal.adminLastUpdated', { date: fmtDateTime(meta.updated_at) }) }}
          </span>
        </div>
        <textarea v-model="bodyMd"
                  class="w-full bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono leading-snug text-gray-200 resize-y"
                  :rows="22"
                  spellcheck="false"></textarea>
        <label class="flex items-center gap-2 text-sm text-gray-300 mt-2 cursor-pointer">
          <input type="checkbox" v-model="bumpVersion" class="h-4 w-4 accent-tesla-red" />
          <span>{{ $t('legal.adminBumpVersion') }}</span>
        </label>
        <div class="flex items-center gap-3 pt-1">
          <button @click="save" :disabled="saving || bodyMd === ''"
                  class="btn-primary">
            {{ saving ? '…' : $t('legal.adminSave') }}
          </button>
          <span v-if="savedMsg" class="text-xs text-green-400">{{ savedMsg }}</span>
          <span v-if="error" class="text-xs text-red-400">{{ error }}</span>
        </div>
      </div>

      <div class="card space-y-2">
        <h2 class="font-semibold text-sm text-gray-300">Preview</h2>
        <div class="legal-preview prose prose-invert max-w-none" v-html="previewHtml"></div>
      </div>
    </div>

    <!-- Übersicht: alle Einträge -->
    <div class="card space-y-2">
      <h2 class="font-semibold text-sm text-gray-300">Alle Einträge</h2>
      <table class="w-full text-sm">
        <thead class="text-gray-500">
          <tr>
            <th class="text-left px-2 py-1">Scope</th>
            <th class="text-left px-2 py-1">Locale</th>
            <th class="text-left px-2 py-1">Version</th>
            <th class="text-left px-2 py-1">Bytes</th>
            <th class="text-left px-2 py-1">Zuletzt</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in allRows" :key="`${r.scope}/${r.locale}`"
              class="border-t border-gray-800 hover:bg-gray-800/50 cursor-pointer"
              @click="scope = r.scope; locale = r.locale;">
            <td class="px-2 py-1">{{ scopeLabel(r.scope) }}</td>
            <td class="px-2 py-1 font-mono uppercase">{{ r.locale }}</td>
            <td class="px-2 py-1">v{{ r.version }}</td>
            <td class="px-2 py-1 text-gray-500">{{ r.body_size }}</td>
            <td class="px-2 py-1 text-gray-500">{{ fmtDateTime(r.updated_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { sanitizeMarkdown } from '../../lib/sanitize.js';
import { useI18n } from 'vue-i18n';
import api from '../../api.js';

const { t } = useI18n();
const SCOPES  = ['imprint', 'privacy', 'terms'];
const LOCALES = ['de', 'en', 'fr', 'es', 'tr', 'el'];
const DEFAULT_LOCALE = 'de';

// „Nur Default-Sprache pflegen": Operator pflegt nur DE, alle anderen
// 5 Locales bekommen den DE-Body 1:1 mit-gespeichert (Public-View
// blendet dann einen 'wird derzeit nur deutsch gepflegt' Banner ein).
// Persistiert in localStorage, damit der Toggle ueber Sessions stehen
// bleibt. Default ON.
const syncMode = ref(localStorage.getItem('legalAdmin.syncMode') !== '0');
watch(syncMode, v => {
  localStorage.setItem('legalAdmin.syncMode', v ? '1' : '0');
  if (v) locale.value = DEFAULT_LOCALE; // automatisch zur Default-Sprache springen
});

const scope   = ref('imprint');
const locale  = ref(syncMode.value ? DEFAULT_LOCALE : 'de');
const meta    = ref(null);
const bodyMd  = ref('');
const bumpVersion = ref(false);
const saving  = ref(false);
const savedMsg = ref('');
const error   = ref('');
const allRows = ref([]);

const scopeLabelMap = {
  imprint: () => t('legal.imprint'),
  privacy: () => t('legal.privacy'),
  terms:   () => t('legal.terms'),
};
const scopeLabel = s => (scopeLabelMap[s] || (() => s))();

const versionMap = computed(() => Object.fromEntries(
  allRows.value.map(r => [`${r.scope}/${r.locale}`, r.version])
));

const previewHtml = computed(() => {
  if (!bodyMd.value) return '';
  const decorated = bodyMd.value.replace(
    /<<[A-Z_]+>>/g, m => `<span class="legal-placeholder">${m}</span>`
  );
  // sanitize auch in der Admin-Preview — sonst koennte der Admin im
  // eigenen Editor ein injiziertes <script> live ausfuehren. Sieht
  // beim Editieren genauso aus wie die spaeter im Public-View
  // sanitizierte Variante, also gleich der Wahrheit.
  return sanitizeMarkdown(decorated);
});

const fmtDateTime = ts => ts
  ? new Date(ts * 1000).toLocaleString()
  : '';

async function loadAll() {
  const { data } = await api.get('/legal/admin/all');
  allRows.value = data;
}

async function loadOne() {
  error.value = '';
  savedMsg.value = '';
  try {
    const { data } = await api.get(`/legal/admin/${scope.value}/${locale.value}`);
    meta.value = data;
    bodyMd.value = data.body_md;
    bumpVersion.value = false;
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  }
}

async function save() {
  saving.value = true;
  error.value = '';
  savedMsg.value = '';
  try {
    // Im Sync-Mode: ein PUT in alle 6 Locales gleichzeitig.
    // Sonst: nur die aktuell gewaehlte Locale.
    const url = syncMode.value
      ? `/legal/admin/${scope.value}/_/all`
      : `/legal/admin/${scope.value}/${locale.value}`;
    const { data } = await api.put(url, {
      body_md: bodyMd.value,
      bumpVersion: bumpVersion.value,
    });
    savedMsg.value = t('legal.adminSaved', { version: data.version });
    bumpVersion.value = false;
    await loadAll();
    await loadOne();
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  } finally {
    saving.value = false;
  }
}

watch([scope, locale], loadOne);
onMounted(async () => { await loadAll(); await loadOne(); });
</script>

<style scoped>
.legal-preview :deep(h1) { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.7rem; }
.legal-preview :deep(h2) { font-size: 1.2rem; font-weight: 600; margin-top: 1rem;   margin-bottom: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.2rem; }
.legal-preview :deep(h3) { font-size: 1rem;   font-weight: 600; margin-top: 0.8rem; }
.legal-preview :deep(p)  { margin-bottom: 0.55rem; line-height: 1.55; font-size: 0.92rem; color: rgba(229,231,235,0.92); }
.legal-preview :deep(ul), .legal-preview :deep(ol) { padding-left: 1.4rem; margin-bottom: 0.55rem; }
.legal-preview :deep(li) { margin-bottom: 0.2rem; line-height: 1.5; font-size: 0.9rem; }
.legal-preview :deep(a)  { color: #60a5fa; text-decoration: underline; }
.legal-preview :deep(blockquote) { border-left: 3px solid rgba(99,102,241,0.5); padding: 0.4rem 0.7rem; margin: 0.5rem 0; background: rgba(99,102,241,0.06); border-radius: 0.3rem; font-size: 0.88rem; }
.legal-preview :deep(code) { background: rgba(255,255,255,0.07); padding: 0.05em 0.3em; border-radius: 0.2rem; font-size: 0.85em; }
.legal-preview :deep(table) { width: 100%; border-collapse: collapse; margin: 0.5rem 0; font-size: 0.85rem; }
.legal-preview :deep(th), .legal-preview :deep(td) { border: 1px solid rgba(255,255,255,0.1); padding: 0.3rem 0.55rem; text-align: left; }
.legal-preview :deep(th) { background: rgba(255,255,255,0.04); font-weight: 600; }
.legal-preview :deep(.legal-placeholder) {
  background: rgba(250,204,21,0.18);
  color: #fde047;
  padding: 0.05em 0.3em;
  border-radius: 0.2rem;
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
}
</style>

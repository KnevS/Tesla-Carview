<template>
  <div v-if="visible"
       class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
       role="dialog"
       aria-modal="true"
       :aria-labelledby="titleId">
    <!-- Voll-Layout: Header + scrollbarer Bedingungs-Text + Footer mit
         Checkboxen + Button. Maximal 92vh hoch, damit immer im
         Viewport. Auf schmalen Bildschirmen (Smartphone, Tesla im
         Hochformat) bleibt der Action-Bereich unten klebend. -->
    <div class="card w-full max-w-3xl flex flex-col max-h-[92vh]">
      <header class="space-y-1.5 pb-3 border-b border-white/5">
        <h2 :id="titleId" class="text-xl font-bold">{{ $t('legal.acceptModalTitle') }}</h2>
        <p class="text-sm text-gray-300">{{ $t('legal.acceptModalBody') }}</p>
      </header>

      <!-- Inhalts-Block: pro pendingScope der volle Markdown-Text
           direkt sichtbar. Scrollbar, damit User wirklich lesen kann
           ohne erst zu akzeptieren. -->
      <div class="flex-1 overflow-y-auto py-3 space-y-5">
        <section v-for="scope in pendingScopes" :key="scope" class="space-y-2">
          <div class="flex items-baseline justify-between gap-3 sticky top-0 bg-tesla-gray/95 backdrop-blur z-10 pb-1">
            <h3 class="font-semibold text-base">
              {{ $t(`legal.${scope}`) }}
              <span class="text-xs text-gray-500 ml-2 font-normal">
                v{{ status[scope]?.currentVersion }}
                <template v-if="status[scope]?.acceptedVersion">
                  · zuvor akzeptiert: v{{ status[scope].acceptedVersion }}
                </template>
              </span>
            </h3>
            <RouterLink :to="`/legal/${scope}`" target="_blank" rel="noopener"
                        class="text-xs text-blue-400 hover:text-blue-300 underline whitespace-nowrap">
              ⤴ in neuem Tab
            </RouterLink>
          </div>
          <!-- Markdown gerendert; benutzt die gleichen Styles wie
               LegalDoc.vue. Bei Lade-Fehler zeigen wir wenigstens die
               Roh-Information + den Link in den neuen Tab. -->
          <article v-if="rendered[scope]" v-html="rendered[scope]"
                   class="legal-content prose prose-invert max-w-none text-sm" />
          <p v-else class="text-sm text-gray-400 italic">
            Inhalt wird geladen — falls das hängenbleibt,
            <RouterLink :to="`/legal/${scope}`" target="_blank" class="underline">in neuem Tab öffnen</RouterLink>.
          </p>
        </section>
      </div>

      <!-- Footer: Checkboxen + Akzept-Button, klebt am unteren Rand. -->
      <footer class="pt-3 border-t border-white/5 space-y-3">
        <ul class="space-y-2">
          <li v-for="scope in pendingScopes" :key="scope" class="flex items-start gap-3">
            <input
              type="checkbox"
              :id="`accept-${scope}`"
              v-model="checked[scope]"
              class="mt-1 h-4 w-4 accent-tesla-red"
            />
            <label :for="`accept-${scope}`" class="text-sm leading-snug">
              <i18n-t :keypath="`legal.acceptCheckbox${cap(scope)}`" tag="span">
                <template #link>
                  <span class="text-blue-300">{{ $t(`legal.${scope}`) }}</span>
                </template>
              </i18n-t>
            </label>
          </li>
        </ul>
        <div class="flex gap-3">
          <button class="btn-primary flex-1"
                  :disabled="!allChecked || submitting"
                  @click="submit">
            {{ submitting ? '…' : $t('legal.acceptModalSubmit') }}
          </button>
        </div>
        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { sanitizeMarkdown } from '../lib/sanitize.js';
import { useAuthStore } from '../store/auth.js';
import { useLangStore } from '../store/lang.js';
import { i18n } from '../plugins/i18n.js';
import api from '../api.js';

const auth      = useAuthStore();
const langStore = useLangStore();
const status    = ref({});
const checked   = reactive({});
const rendered  = ref({});   // scope → fertiges HTML
const submitting= ref(false);
const error     = ref('');
const titleId   = 'legal-accept-title';

const pendingScopes = computed(() =>
  Object.entries(status.value)
    .filter(([, v]) => !v.upToDate && v.currentVersion != null)
    .map(([scope]) => scope)
);

const visible = computed(() => auth.isAuthenticated && pendingScopes.value.length > 0);

const allChecked = computed(() =>
  pendingScopes.value.every(s => checked[s])
);

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const currentLocale = computed(() =>
  langStore.current || i18n.global.locale.value || 'de'
);

/** Holt die volle Markdown-Variante zu einem Scope und rendert sie
 *  inline. Die gleiche Logik wie LegalDoc.vue: <<DATUM>>-Platzhalter
 *  durch updated_at ersetzen, restliche Platzhalter mit Span markieren. */
async function loadRendered(scope) {
  try {
    const { data } = await api.get(`/legal/${scope}/${currentLocale.value}`);
    let body = data.body_md || '';
    if (data.updated_at) {
      const fmtLong = new Date(data.updated_at * 1000).toLocaleDateString(currentLocale.value,
        { day: '2-digit', month: 'long', year: 'numeric' });
      body = body.replace(/<<(DATUM|DATE)>>/g, fmtLong);
    }
    body = body.replace(/<<[A-Z_]+>>/g, m => `<span class="legal-placeholder">${m}</span>`);
    // sanitize VOR v-html — sonst koennte ein boeswilliger Admin
    // <script>/<img onerror>-Payloads in Legal-Texte schreiben und
    // damit jeden Besucher der oeffentlichen /legal-Seiten XSSen.
    rendered.value[scope] = sanitizeMarkdown(body);
  } catch {
    rendered.value[scope] = null;
  }
}

async function loadStatus() {
  if (!auth.isAuthenticated) { status.value = {}; rendered.value = {}; return; }
  try {
    const { data } = await api.get('/legal/acceptance-status');
    status.value = data;
    for (const scope of Object.keys(data)) {
      checked[scope] = false;
    }
    // Inhalte aller pending Scopes parallel laden
    const pending = Object.entries(data)
      .filter(([, v]) => !v.upToDate && v.currentVersion != null)
      .map(([s]) => s);
    rendered.value = {};
    await Promise.all(pending.map(loadRendered));
  } catch {
    status.value = {};
  }
}

async function submit() {
  if (!allChecked.value) return;
  submitting.value = true;
  error.value = '';
  try {
    for (const scope of pendingScopes.value) {
      const v = status.value[scope]?.currentVersion;
      if (v) await api.post('/legal/accept', { scope, version: v });
    }
    await loadStatus();
  } catch (err) {
    error.value = err.response?.data?.error || err.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(loadStatus);
watch(() => auth.isAuthenticated, loadStatus);
watch(() => auth.user?.id, loadStatus);
// Sprache wechselt → Inhalt der pending Texte neu laden
watch(currentLocale, () => {
  for (const scope of pendingScopes.value) loadRendered(scope);
});
</script>

<style scoped>
/* Markdown-Styles wie in LegalDoc.vue — der scrollbare Block soll
 * sich angemessen lesen, auch wenn die Bedingungen Tabellen oder
 * lange Aufzählungen haben. */
.legal-content :deep(h1) { font-size: 1.15rem; font-weight: 700; margin: 0.6rem 0 0.3rem; color: #f3f4f6; }
.legal-content :deep(h2) { font-size: 1rem;    font-weight: 600; margin: 0.6rem 0 0.3rem; color: #f3f4f6; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.15rem; }
.legal-content :deep(h3) { font-size: 0.95rem; font-weight: 600; margin: 0.4rem 0 0.2rem; color: #f3f4f6; }
.legal-content :deep(p)  { margin-bottom: 0.5rem; line-height: 1.55; color: #e5e7eb; }
.legal-content :deep(ul), .legal-content :deep(ol) { padding-left: 1.3rem; margin-bottom: 0.5rem; color: #e5e7eb; }
.legal-content :deep(li) { margin-bottom: 0.15rem; line-height: 1.5; color: #e5e7eb; }
.legal-content :deep(strong) { color: #ffffff; }
.legal-content :deep(em) { color: #f3f4f6; }
.legal-content :deep(a) { color: #60a5fa; text-decoration: underline; }
.legal-content :deep(code) { background: rgba(255,255,255,0.08); color: #f9fafb; padding: 0.08em 0.3em; border-radius: 0.2rem; font-size: 0.85em; }
.legal-content :deep(.legal-placeholder) {
  background: rgba(250,204,21,0.18);
  color: #fde047;
  padding: 0.05em 0.25em;
  border-radius: 0.2rem;
  font-family: ui-monospace, monospace;
  font-size: 0.88em;
}
</style>

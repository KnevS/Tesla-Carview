<template>
  <div class="max-w-3xl mx-auto space-y-6 pb-16">
    <!-- Banner: noch unausgefüllte Platzhalter? Admin-Hinweis. -->
    <div v-if="hasPlaceholders && isAdmin"
         class="card border border-yellow-700/60 bg-yellow-900/20">
      <p class="text-sm text-yellow-300 flex items-center gap-1.5 flex-wrap">
        <AppIcon name="alert" :size="16" />
        {{ $t('legal.placeholdersWarningAdmin') }}
        <RouterLink to="/admin/legal" class="underline hover:text-yellow-100">
          /admin/legal
        </RouterLink>
      </p>
    </div>

    <!-- Banner: Sprache wird nur auf Deutsch gepflegt. -->
    <div v-if="meta?.synced_from_default"
         class="card border border-blue-700/60 bg-blue-900/15">
      <p class="text-sm text-blue-300 flex items-center gap-1.5">
        <AppIcon name="globe" :size="16" />
        {{ $t('legal.syncedFromDefaultBanner') }}
      </p>
    </div>

    <!-- Markdown-Inhalt -->
    <article v-if="!loading"
             class="legal-content prose prose-invert max-w-none"
             v-html="html"></article>

    <!-- Demo-Tester-Erweiterung — wird automatisch unter dem regulaeren
         Inhalt eingeblendet, wenn der angemeldete User im Demo-Mandanten
         ist. Operator muss nichts zusaetzlich pflegen. Nur fuer privacy
         und terms relevant (Imprint betrifft Datenverarbeitung nicht). -->
    <section v-if="!loading && auth.isDemo && (scope === 'privacy' || scope === 'terms')"
             class="legal-content prose prose-invert max-w-none card border border-blue-700/40 bg-blue-900/10">
      <h2>🧪 Zusatz für Demo-Tester</h2>
      <p v-if="scope === 'privacy'">
        Du nutzt einen <strong>Demo-/Sandbox-Account</strong>. Folgendes gilt zusätzlich zur regulären Datenschutzerklärung:
      </p>
      <ul v-if="scope === 'privacy'">
        <li>Es werden <strong>keine echten Fahrzeugdaten</strong> verarbeitet — alle in der Demo angezeigten Inhalte sind <strong>frei erfunden</strong> und werden vom System dynamisch generiert.</li>
        <li>Wir speichern nur das, was zur Funktion nötig ist: einen anonymisierten Tester-Benutzernamen (z.B. <code>tester-abc123</code>), Sitzungs-Token, IP-Adresse und User-Agent des Login-Vorgangs sowie ein Audit-Log über sicherheitsrelevante Aktionen.</li>
        <li>Eine <strong>E-Mail-Adresse oder anderweitige personenbezogene Daten werden nicht abgefragt</strong>.</li>
        <li>Nach Ablauf von <strong>2 Tagen</strong> ab Account-Erzeugung wird der Tester-Account inklusive aller damit verknüpften Daten <strong>vollständig und unwiderruflich</strong> gelöscht.</li>
        <li>Die Daten werden nicht an Dritte weitergegeben und nicht für Werbung oder Analyse genutzt.</li>
      </ul>
      <p v-if="scope === 'terms'">
        Folgende Sonderregeln gelten zusätzlich zu den regulären Nutzungsbedingungen, wenn du einen Demo-/Sandbox-Account nutzt:
      </p>
      <ul v-if="scope === 'terms'">
        <li>Die Demo ist <strong>ausschließlich zum unverbindlichen Ausprobieren</strong> der Anwendung gedacht. Es besteht <strong>kein Anspruch auf Verfügbarkeit, Funktion oder Datenerhalt</strong>.</li>
        <li>Der Account ist <strong>2 Tage gültig</strong> und wird danach automatisch gelöscht. Eine Verlängerung ist nicht vorgesehen.</li>
        <li>Es werden Fake-Daten angezeigt; diese stellen keine realen Fahrten, Ladungen oder Fahrzeuge dar. Eine Verwendung dieser Daten für Buchführung, Steuer (Fahrtenbuch) oder Versicherungsangelegenheiten ist <strong>ausgeschlossen</strong>.</li>
        <li>Missbrauch (z.B. automatisierte Mehrfach-Signups, Last-Tests, Penetration-Versuche) führt zur sofortigen Sperrung und Löschung.</li>
        <li>Der Betreiber behält sich vor, Tester-Accounts <strong>jederzeit und ohne Vorankündigung zu löschen</strong>, wenn Ressourcen knapp werden oder der Betrieb es erfordert.</li>
        <li>Es wird keine technische oder rechtliche Unterstützung für Demo-Nutzer geleistet.</li>
      </ul>
      <p class="text-xs text-blue-200/80 mt-2">
        Diese Zusätze entsprechen einem reduzierten Funktions- und Datenumfang;
        sobald du dich abmeldest oder die 2 Tage abgelaufen sind, verlierst du den Zugang.
      </p>
    </section>

    <div v-else-if="loading" class="text-gray-400 text-sm">{{ $t('common.loading') }}</div>

    <!-- Footer-Meta -->
    <div v-if="meta" class="text-xs text-gray-500 border-t border-gray-800 pt-4">
      {{ $t('legal.versionInfo', {
        version: meta.version,
        date: fmtDate(meta.updated_at),
      }) }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { sanitizeMarkdown } from '../../lib/sanitize.js';
import api from '../../api.js';
import { useAuthStore } from '../../store/auth.js';
import { useLangStore } from '../../store/lang.js';
import { i18n } from '../../plugins/i18n.js';
import AppIcon from '../../components/AppIcon.vue';

const props = defineProps({
  scope: { type: String, required: true }, // 'imprint' | 'privacy' | 'terms'
});

const auth      = useAuthStore();
const langStore = useLangStore();

const isAdmin = computed(() => auth.isAdmin);
const meta    = ref(null);
const html    = ref('');
const loading = ref(true);

// Auto-Fill Platzhalter, die wir aus den Metadaten ableiten können —
// derzeit nur das Datum/Stand. Bleibt im Storage als Platzhalter, wird
// zur Anzeige durch updated_at ersetzt, sodass „Stand" immer aktuell
// stimmt, ohne dass der Admin nach jedem Save das Datum nachpflegen muss.
const AUTO_FILL_KEYS = new Set(['DATUM', 'DATE']);
function autoFill(text, ts) {
  if (!ts) return text;
  const fmtLong = new Date(ts * 1000).toLocaleDateString(currentLocale.value, {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return text.replace(/<<([A-Z_]+)>>/g, (m, key) =>
    AUTO_FILL_KEYS.has(key) ? fmtLong : m
  );
}

// Erkennt verbleibende Boilerplate-Platzhalter (nach AutoFill) wie <<NAME>>,
// <<EMAIL>> — die muss der Admin ausfüllen.
const hasPlaceholders = computed(() => {
  if (!meta.value?.body_md) return false;
  return /<<[A-Z_]+>>/.test(autoFill(meta.value.body_md, meta.value.updated_at));
});

// Sprache: User-Profil > Tenant-Default > localStorage > Browser > 'de'
// (langStore liefert das resolvierte Endergebnis; vor Login fällt es auf
// localStorage/Browser zurück).
const currentLocale = computed(() => langStore.current || i18n.global.locale.value || 'de');

const fmtDate = ts => ts
  ? new Date(ts * 1000).toLocaleDateString(currentLocale.value)
  : '';

/** Markdown vom Backend laden, mit DE-Fallback wenn Locale fehlt — der
 *  Backend-Handler erledigt den Fallback bereits, hier nur ein UI-Reset. */
async function load() {
  loading.value = true;
  try {
    const { data } = await api.get(`/legal/${props.scope}/${currentLocale.value}`);
    meta.value = data;
    // 1. Stand-Platzhalter (<<DATUM>>, <<DATE>>) durch updated_at fuellen.
    // 2. Verbleibende ungefuellte Platzhalter im Public-View gelb markieren.
    const filled = autoFill(data.body_md, data.updated_at);
    const decorated = filled.replace(
      /<<[A-Z_]+>>/g,
      m => `<span class="legal-placeholder">${m.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
    );
    // sanitize VOR v-html — diese Seite ist oeffentlich (auch unauth),
    // ein <script> im Markdown wuerde jeden Besucher exploiten.
    html.value = sanitizeMarkdown(decorated);
  } catch (err) {
    meta.value = null;
    html.value = `<p class="text-red-400">${err.message}</p>`;
  } finally {
    loading.value = false;
  }
}

watch(currentLocale, load);
watch(() => props.scope, load);
onMounted(load);
</script>

<style scoped>
/* Die App-Shell ist durchgaengig dunkel (bg-tesla-dark). Wir setzen
 * Textfarben deshalb explizit hell — und nutzen KEIN
 * prefers-color-scheme: light, weil ein hell-konfigurierter Browser
 * sonst dunkle Schrift auf unseren dunklen Hintergrund kippt. */
.legal-content :deep(h1) { font-size: 1.875rem; font-weight: 700; margin-bottom: 1rem; color: #f3f4f6; }
.legal-content :deep(h2) { font-size: 1.5rem;   font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #f3f4f6; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 0.25rem; }
.legal-content :deep(h3) { font-size: 1.2rem;   font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.4rem; color: #f3f4f6; }
.legal-content :deep(h4) { font-size: 1.05rem;  font-weight: 600; margin-top: 1rem;   margin-bottom: 0.35rem; color: #f3f4f6; }
.legal-content :deep(p) { margin-bottom: 0.75rem; line-height: 1.65; color: #e5e7eb; }
.legal-content :deep(ul), .legal-content :deep(ol) { padding-left: 1.5rem; margin-bottom: 0.75rem; color: #e5e7eb; }
.legal-content :deep(li) { margin-bottom: 0.25rem; line-height: 1.55; color: #e5e7eb; }
.legal-content :deep(strong), .legal-content :deep(b) { color: #ffffff; font-weight: 600; }
.legal-content :deep(em), .legal-content :deep(i) { color: #f3f4f6; }
.legal-content :deep(a) { color: #60a5fa; text-decoration: underline; }
.legal-content :deep(a:hover) { color: #93c5fd; }
.legal-content :deep(blockquote) { border-left: 3px solid rgba(99,102,241,0.55); padding: 0.5rem 0.85rem; margin: 0.75rem 0; background: rgba(99,102,241,0.08); border-radius: 0.35rem; color: #e5e7eb; }
.legal-content :deep(blockquote p), .legal-content :deep(blockquote li) { color: #e5e7eb; }
.legal-content :deep(code) { background: rgba(255,255,255,0.1); color: #f9fafb; padding: 0.1em 0.35em; border-radius: 0.25rem; font-size: 0.9em; }
.legal-content :deep(pre) { background: rgba(0,0,0,0.4); color: #e5e7eb; padding: 0.75rem 1rem; border-radius: 0.4rem; overflow-x: auto; }
.legal-content :deep(pre code) { background: transparent; color: inherit; padding: 0; }
.legal-content :deep(hr) { border: 0; border-top: 1px solid rgba(255,255,255,0.12); margin: 1rem 0; }
.legal-content :deep(table) { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.9rem; color: #e5e7eb; }
.legal-content :deep(th), .legal-content :deep(td) { border: 1px solid rgba(255,255,255,0.14); padding: 0.45rem 0.7rem; text-align: left; color: #e5e7eb; }
.legal-content :deep(th) { background: rgba(255,255,255,0.06); color: #ffffff; font-weight: 600; }
.legal-content :deep(.legal-placeholder) {
  background: rgba(250,204,21,0.22);
  color: #fde047;
  padding: 0.05em 0.3em;
  border-radius: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
}
</style>

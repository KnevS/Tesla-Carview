<template>
  <div class="max-w-2xl space-y-6">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold">{{ $t('nav.adminSettings.label', 'Admin-Einstellungen') }}</h1>
      <RouterLink to="/admin"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition">
        ← Übersicht
      </RouterLink>
    </div>

    <!-- Mandanten-Standardsprache -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="tenantLang"
      :title="$t('settings.tenantDefaultLocaleTitle')"
      icon="🌍"
      :collapsed="isCollapsed('tenantLang')"
      @toggle="toggle('tenantLang')"
    >
      <p class="text-sm text-gray-400">{{ $t('settings.tenantDefaultLocaleHint') }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="l in LANGS" :key="l.code"
          type="button"
          class="lang-pick"
          :class="{ active: tenantDefaultLocale === l.code }"
          :disabled="tenantSaving"
          @click="saveTenantDefault(l.code)"
        >
          <span class="text-lg leading-none">{{ l.flag }}</span>
          <span>{{ l.label }}</span>
        </button>
      </div>
      <p v-if="tenantSaved" class="text-xs text-green-400">✓ {{ $t('settings.saved') }}</p>
    </SortableSection>

    <!-- Mandanten-Pseudonym -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="pseudonym"
      :title="$t('settings.pseudonymTitle')"
      icon="🏷️"
      :collapsed="isCollapsed('pseudonym')"
      @toggle="toggle('pseudonym')"
    >
      <p class="text-sm text-gray-400">{{ $t('settings.pseudonymIntro') }}</p>
      <div class="bg-black/30 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <p class="text-xs text-gray-500 uppercase tracking-wide">{{ $t('settings.pseudonymCurrent') }}</p>
          <p class="text-xl font-mono font-bold text-white tracking-wider">{{ tenantPseudonym || '…' }}</p>
        </div>
        <button @click="confirmRegeneratePseudonym = true"
          class="btn-secondary text-sm"
          v-tooltip="$t('settings.pseudonymRegenerateTip')">
          {{ $t('settings.pseudonymRegenerate') }}
        </button>
      </div>
      <div v-if="tenantPseudonymHistory.length" class="text-xs text-gray-500">
        {{ $t('settings.pseudonymHistory') }}: <span class="font-mono">{{ tenantPseudonymHistory.join(', ') }}</span>
      </div>

      <Teleport to="body">
        <div v-if="confirmRegeneratePseudonym"
             class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4"
             @click.self="confirmRegeneratePseudonym = false">
          <div class="card max-w-md space-y-3">
            <h3 class="font-semibold text-lg">{{ $t('settings.pseudonymConfirmTitle') }}</h3>
            <p class="text-sm text-gray-300">
              {{ $t('settings.pseudonymCurrent') }}: <span class="font-mono">{{ tenantPseudonym }}</span>
            </p>
            <div class="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 text-sm space-y-2 text-yellow-200">
              <p>{{ $t('settings.pseudonymWarnHeader') }}</p>
              <ul class="list-disc list-inside space-y-1 text-xs text-yellow-100">
                <li>{{ $t('settings.pseudonymWarnUsers') }}</li>
                <li>{{ $t('settings.pseudonymWarnHistory') }}</li>
                <li>{{ $t('settings.pseudonymWarnBackup') }}</li>
                <li><RouterLink to="/data" class="underline">{{ $t('settings.pseudonymBackupCta') }}</RouterLink></li>
              </ul>
            </div>
            <div class="flex gap-2">
              <button @click="confirmRegeneratePseudonym = false" class="btn-secondary flex-1">
                {{ $t('settings.pseudonymCancel') }}
              </button>
              <button @click="doRegeneratePseudonym"
                :disabled="regeneratingPseudonym"
                class="btn-primary flex-1">
                {{ regeneratingPseudonym ? '…' : $t('settings.pseudonymConfirm') }}
              </button>
            </div>
            <p v-if="regenerateError" class="text-red-400 text-sm">{{ regenerateError }}</p>
          </div>
        </div>
      </Teleport>
    </SortableSection>

    <!-- Strompreis-API -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="tariff"
      title="Strompreis-API (dynamischer Tarif)"
      icon="⚡"
      :collapsed="isCollapsed('tariff')"
      @toggle="toggle('tariff')"
    >
      <p class="text-xs text-gray-400">
        Quelle für stündliche Strompreise. Nur Admin — sichtbar im Dashboard-Widget für alle Nutzer.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">Anbieter</label>
          <select v-model="tariffCfg.provider" class="w-full bg-gray-700 rounded px-2 py-1.5 text-white"
            v-tooltip="'aWattar: Spotmarkt-Preise (DE/AT), kein Token noetig, oeffentliche API. Tibber: persoenlicher Endpreis inkl. Steuern, braucht API-Token.'">
            <option value="none">Aus</option>
            <option value="awattar">aWattar (Spotmarkt DE/AT)</option>
            <option value="tibber">Tibber (Endkunden-API)</option>
          </select>
        </div>
        <div v-if="tariffCfg.provider === 'awattar'">
          <label class="text-xs text-gray-400 block mb-0.5">Land</label>
          <select v-model="tariffCfg.country" class="w-full bg-gray-700 rounded px-2 py-1.5 text-white">
            <option value="de">Deutschland</option>
            <option value="at">Österreich</option>
          </select>
        </div>
        <div v-if="tariffCfg.provider === 'awattar'">
          <label class="text-xs text-gray-400 block mb-0.5">Aufschlag (ct/kWh, optional)</label>
          <input v-model.number="tariffCfg.surcharge_ct" type="number" step="0.1" min="-50" max="50"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white"
            v-tooltip="'Pauschaler Aufschlag fuer Steuern, Netzentgelte und Vertriebsmarge.'" />
        </div>
        <div v-if="tariffCfg.provider === 'tibber'" class="sm:col-span-2">
          <label class="text-xs text-gray-400 block mb-0.5">Tibber API-Token</label>
          <input v-model="tariffCfg.token" type="password"
            :placeholder="tariffCfg.token_configured ? '••••••••• (konfiguriert)' : 'Token aus Tibber Developer-Portal'"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white font-mono"
            v-tooltip="'Token unter developer.tibber.com erstellen. Wird verschluesselt gespeichert.'" />
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button @click="saveTariffConfig" class="btn-primary text-sm">Speichern</button>
        <span v-if="tariffMsg" :class="tariffMsg.ok ? 'text-green-400 text-xs' : 'text-red-400 text-xs'">{{ tariffMsg.text }}</span>
      </div>
    </SortableSection>

    <!-- Wartungsintervalle -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="serviceIntervals"
      :title="$t('settings.serviceIntervalsTitle')"
      icon="🔧"
      :collapsed="isCollapsed('serviceIntervals')"
      @toggle="toggle('serviceIntervals')"
    >
      <p class="text-sm text-gray-400">
        Die Verwaltung von Wartungsintervallen ist jetzt direkt im
        <RouterLink to="/logbook#service-intervals" class="text-tesla-red hover:underline">Betriebsbuch</RouterLink>
        — pro Fahrzeug, neben den Wartungs- und Inspektionseinträgen.
      </p>
    </SortableSection>

    <!-- GPS-Fuzzing -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="gpsFuzzing"
      :title="$t('settings.gpsFuzzingTitle')"
      icon="📡"
      :collapsed="isCollapsed('gpsFuzzing')"
      @toggle="toggle('gpsFuzzing')"
    >
      <p class="text-xs text-gray-400">{{ $t('settings.gpsFuzzingIntro') }}</p>
      <div class="flex items-center gap-3">
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="gpsFuzzing.enabled" class="accent-tesla-red" />
          <span class="text-sm">{{ $t('settings.gpsFuzzingEnable') }}</span>
        </label>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label class="label">{{ $t('settings.gpsFuzzingRadius') }}</label>
          <input v-model.number="gpsFuzzing.radius_m" type="number" min="50" max="5000" step="50"
                 class="input" :disabled="!gpsFuzzing.enabled" />
        </div>
        <div class="flex items-end text-xs text-gray-500">
          <span>{{ $t('settings.gpsFuzzingRadiusHint') }}</span>
        </div>
      </div>
      <div class="flex gap-2 items-center">
        <button @click="saveGpsFuzzing" class="btn-primary text-sm">{{ $t('settings.gpsFuzzingSave') }}</button>
        <span v-if="gpsFuzzingMsg" :class="gpsFuzzingOk ? 'text-green-400' : 'text-red-400'"
              class="text-xs">{{ gpsFuzzingMsg }}</span>
      </div>
    </SortableSection>

    <!-- Tesla Verbindung -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="tesla"
      :title="$t('settings.teslaConnectionTitle')"
      icon="🔌"
      :collapsed="isCollapsed('tesla')"
      @toggle="toggle('tesla')"
    >
      <div class="bg-blue-900/15 border border-blue-700/30 rounded-lg p-3 text-xs text-blue-100 space-y-1">
        <p class="font-semibold text-sm">{{ $t('settings.teslaStrategyTitle') }}</p>
        <ol class="list-decimal list-inside space-y-0.5 text-blue-200">
          <li>{{ $t('settings.teslaStrategyTelemetry') }}</li>
          <li>{{ $t('settings.teslaStrategyPolling') }}</li>
        </ol>
        <p class="text-gray-400 pt-1">{{ $t('settings.teslaStrategyFooter') }}</p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-sm" :class="teslaConnected ? 'text-green-400' : 'text-red-400'">
          {{ teslaConnected ? '● Verbunden' : '● Nicht verbunden' }}
        </span>
        <button @click="teslaReconnect" :disabled="!teslaAuthUrl" class="btn-primary text-sm"
          v-tooltip="'Tesla-Account neu verbinden – holt einen neuen Token mit allen benötigten Scopes'">
          Tesla neu verbinden
        </button>
        <button @click="syncVehicles"
          :disabled="syncingVehicles || !auth.canAddVehicles"
          class="btn-secondary text-sm"
          v-tooltip="auth.canAddVehicles
            ? 'Alle Fahrzeuge des Tesla-Accounts abrufen und in die App übernehmen.'
            : 'Du hast keine Berechtigung, neue Fahrzeuge anzulegen.'">
          {{ syncingVehicles ? 'Synchronisiere…' : '🔄 Fahrzeuge synchronisieren' }}
        </button>
      </div>
      <div v-if="syncMsg" class="text-sm" :class="syncOk ? 'text-green-400' : 'text-red-400'">{{ syncMsg }}</div>

      <!-- Virtual Key -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <div>
          <p class="font-medium text-sm">Virtual Key (Fahrzeugbefehle)</p>
          <p class="text-xs text-gray-400 mt-0.5">Einmalig am Fahrzeug registrieren damit Klima, Türen und Laden funktionieren</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4 space-y-3 text-sm">
          <ol class="space-y-2 text-gray-300">
            <li class="flex gap-2"><span class="text-tesla-red font-bold">1.</span> iPhone nahe am Auto, Bluetooth ein, Tesla-App offen</li>
            <li class="flex gap-2"><span class="text-tesla-red font-bold">2.</span> Diesen Link im iPhone-Browser öffnen:</li>
          </ol>
          <a :href="`https://tesla.com/_ak/${virtualKeyHost}`" target="_blank"
            class="block w-full text-center py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white font-medium transition">
            tesla.com/_ak/{{ virtualKeyHost }}
          </a>
          <p class="text-xs text-gray-500">Tesla-App zeigt "Drittanbieter-Schlüssel hinzufügen" → Allow tippen.</p>
        </div>
      </div>

      <!-- Fleet Telemetrie -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <div>
          <p class="font-medium text-sm flex items-center gap-2">
            <AppIcon name="pulse" :size="16" class="text-tesla-red" />
            {{ $t('settings.telemetryHeader') }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">{{ $t('settings.telemetryIntro') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button @click="registerPartner" :disabled="partnerBusy" class="btn-secondary text-sm">
            {{ partnerBusy ? '…' : $t('settings.telemetryRegisterApp') }}
          </button>
          <button @click="loadTelemetryStatus" class="btn-secondary text-sm">
            {{ $t('settings.telemetryRefreshStatus') }}
          </button>
        </div>
        <div v-if="partnerResult" class="rounded-lg px-3 py-2 text-sm"
          :class="partnerResult.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'">
          {{ partnerResult.ok ? '✓ App erfolgreich registriert – jetzt pro Fahrzeug aktivieren' : '✗ ' + partnerResult.error }}
        </div>

        <div v-if="telemetryStatus.vehicles?.length" class="space-y-2">
          <div v-for="v in telemetryStatus.vehicles" :key="v.vin"
            class="bg-gray-800/60 rounded-lg p-3 flex items-center gap-3 flex-wrap">
            <span class="text-lg leading-none" :class="telemetryDotClass(v.status)"
              v-tooltip="telemetryStatusLabel(v.status)">●</span>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{{ v.display_name || v.vin }}</p>
              <p class="text-xs text-gray-400 font-mono">{{ v.vin }}</p>
              <p class="text-xs mt-0.5" :class="telemetryTextClass(v.status)">
                {{ telemetryStatusLabel(v.status) }}
                <span v-if="v.last_signal_at" class="text-gray-500 ml-1">
                  · {{ $t('settings.telemetryLastSignal', { ago: relativeAgo(v.last_signal_at) }) }}
                </span>
              </p>
              <p v-if="v.last_error" class="text-xs text-red-300 mt-0.5 truncate"
                 v-tooltip="v.last_error">{{ v.last_error }}</p>
            </div>
            <button v-if="v.status !== 'streaming'"
              @click="configureTelemetryFor(v.vin)" :disabled="telemetryBusyFor === v.vin"
              class="btn-primary text-xs whitespace-nowrap">
              {{ telemetryBusyFor === v.vin ? '…'
                 : v.status === 'not_registered' ? $t('settings.telemetryActivate')
                 : $t('settings.telemetryReconfigure') }}
            </button>
          </div>
        </div>
      </div>
    </SortableSection>

    <!-- Outbound-Webhooks -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="webhooks"
      :title="$t('settings.webhooksTitle')"
      icon="🌐"
      :collapsed="isCollapsed('webhooks')"
      @toggle="toggle('webhooks')"
    >
      <WebhookManager />
    </SortableSection>

    <!-- Tesla API-Nutzung -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="teslaUsage"
      title="Tesla API-Nutzung"
      icon="📊"
      :collapsed="isCollapsed('teslaUsage')"
      @toggle="toggle('teslaUsage')"
    >
      <p v-if="usageMsg" :class="usageOk ? 'text-green-400' : 'text-red-400'" class="text-xs">{{ usageMsg }}</p>
      <div v-if="usageCfg" class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label class="label">Währung</label>
          <select v-model="usageCfg.currency" class="input">
            <option>USD</option><option>EUR</option><option>GBP</option>
          </select>
        </div>
        <div>
          <label class="label">Monatslimit</label>
          <input v-model.number="usageCfg.monthly_limit_usd" type="number" min="0" step="1" class="input" />
        </div>
        <div>
          <label class="label">Free-Credit pro Monat</label>
          <input v-model.number="usageCfg.free_credit_usd" type="number" min="0" step="1" class="input" />
        </div>
        <div>
          <label class="label">Hard-Stop bei (% vom Limit)</label>
          <input v-model.number="usageCfg.hard_stop_pct" type="number" min="0" max="100" step="1" class="input" />
        </div>
        <div class="col-span-2 flex items-center gap-2">
          <input id="hardstop" v-model="usageCfg.hard_stop_enabled" type="checkbox" class="accent-tesla-red" />
          <label for="hardstop" class="text-sm"
            v-tooltip="'Wenn aktiv: Tesla-API-Calls werden ab der Schwelle blockiert (HTTP 429), bis zur Monatswende oder Reset.'">
            Hard-Stop aktivieren (blockiert Tesla-Calls bei Schwelle)
          </label>
        </div>
        <div class="col-span-2 border-t border-gray-700 pt-3">
          <p class="text-sm font-medium text-gray-300 mb-2">Tarife (USD pro Aufruf bzw. pro Streaming-Signal)</p>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Vehicle-Data</label>
              <input v-model.number="usageCfg.rate_vehicle_data" type="number" min="0" step="0.0001" class="input" /></div>
            <div><label class="label">Wake-Up</label>
              <input v-model.number="usageCfg.rate_wake" type="number" min="0" step="0.0001" class="input" /></div>
            <div><label class="label">Commands</label>
              <input v-model.number="usageCfg.rate_command" type="number" min="0" step="0.0001" class="input" /></div>
            <div><label class="label">Streaming-Signal</label>
              <input v-model.number="usageCfg.rate_streaming_signal" type="number" min="0" step="0.000001" class="input" /></div>
            <div><label class="label">Sonstige</label>
              <input v-model.number="usageCfg.rate_other" type="number" min="0" step="0.0001" class="input" /></div>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="saveUsageConfig" class="btn-primary text-sm">Tarife speichern</button>
        <button @click="resetUsageMonth" class="btn-secondary text-sm"
          v-tooltip="'Setzt die Zähler des laufenden Monats zurück – nur nach Tesla-Korrekturbuchung sinnvoll.'">
          Aktuellen Monat zurücksetzen
        </button>
      </div>
    </SortableSection>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import AppIcon from '../components/AppIcon.vue';
import WebhookManager from '../components/WebhookManager.vue';
import { useLangStore, LANGS } from '../store/lang.js';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';

const ADMIN_SECTIONS = ['tenantLang', 'pseudonym', 'tariff', 'serviceIntervals', 'gpsFuzzing', 'tesla', 'webhooks', 'teslaUsage'];
const { isCollapsed, toggle } = usePageLayout('admin-settings', ADMIN_SECTIONS);

const auth     = useAuthStore();
const appStore = useAppStore();
const { t }    = useI18n();
const langStore = useLangStore();

// ── Mandanten-Standardsprache ──
const tenantDefaultLocale = ref('de');
const tenantSaved         = ref(false);
const tenantSaving        = ref(false);

async function loadTenantDefaultLocale() {
  try {
    const { data } = await api.get('/system/tenant-settings/default-locale');
    tenantDefaultLocale.value = data.defaultLocale || 'de';
  } catch { /* leave default */ }
}

async function saveTenantDefault(code) {
  if (tenantSaving.value) return;
  tenantSaving.value = true;
  try {
    await api.put('/system/tenant-settings/default-locale', { defaultLocale: code });
    tenantDefaultLocale.value = code;
    tenantSaved.value = true;
    setTimeout(() => { tenantSaved.value = false; }, 1500);
  } catch { /* ignore */ }
  finally { tenantSaving.value = false; }
}

// ── Mandanten-Pseudonym ──
const tenantPseudonym            = ref('');
const tenantPseudonymHistory     = ref([]);
const confirmRegeneratePseudonym = ref(false);
const regeneratingPseudonym      = ref(false);
const regenerateError            = ref('');

async function loadTenantPseudonym() {
  if (!auth.tenantId) return;
  try {
    const { data } = await api.get(`/system/tenants/${auth.tenantId}`);
    tenantPseudonym.value        = data.pseudonym || '';
    tenantPseudonymHistory.value = data.pseudonymHistory || [];
  } catch { /* admin endpoint nicht erreichbar */ }
}

async function doRegeneratePseudonym() {
  if (regeneratingPseudonym.value) return;
  regeneratingPseudonym.value = true;
  regenerateError.value = '';
  try {
    const { data } = await api.post(`/system/tenants/${auth.tenantId}/regenerate-pseudonym`);
    tenantPseudonym.value = data.current_pseudonym;
    if (data.previous_pseudonym) {
      tenantPseudonymHistory.value = [...tenantPseudonymHistory.value, data.previous_pseudonym];
    }
    confirmRegeneratePseudonym.value = false;
  } catch (err) {
    regenerateError.value = err.response?.data?.error || err.message;
  } finally {
    regeneratingPseudonym.value = false;
  }
}

// ── Strompreis-API ──
const tariffCfg = ref({ provider: 'none', country: 'de', surcharge_ct: 0, token: '', token_configured: false });
const tariffMsg = ref(null);

async function loadTariffConfig() {
  try {
    const { data } = await api.get('/tariff/config');
    tariffCfg.value = { ...data, token: '' };
  } catch { /* nicht kritisch */ }
}

async function saveTariffConfig() {
  const payload = { provider: tariffCfg.value.provider, country: tariffCfg.value.country, surcharge_ct: +tariffCfg.value.surcharge_ct || 0 };
  if (tariffCfg.value.token && tariffCfg.value.token.length) payload.token = tariffCfg.value.token;
  try {
    await api.put('/tariff/config', payload);
    tariffCfg.value.token = '';
    tariffCfg.value.token_configured = !!payload.token || tariffCfg.value.token_configured;
    tariffMsg.value = { ok: true, text: '✓ gespeichert' };
  } catch (err) {
    tariffMsg.value = { ok: false, text: err.response?.data?.error || 'Fehler' };
  } finally {
    setTimeout(() => { tariffMsg.value = null; }, 4000);
  }
}

// ── GPS-Fuzzing ──
const gpsFuzzing    = ref({ enabled: false, radius_m: 200 });
const gpsFuzzingMsg = ref('');
const gpsFuzzingOk  = ref(false);

async function loadGpsFuzzing() {
  try {
    const { data } = await api.get('/system/tenant-settings/gps-fuzzing');
    gpsFuzzing.value = { enabled: !!data.enabled, radius_m: data.radius_m || 200 };
  } catch { /* ignore */ }
}

async function saveGpsFuzzing() {
  gpsFuzzingMsg.value = '';
  try {
    const radius = Math.max(50, Math.min(5000, +gpsFuzzing.value.radius_m || 200));
    const { data } = await api.put('/system/tenant-settings/gps-fuzzing', { enabled: !!gpsFuzzing.value.enabled, radius_m: radius });
    gpsFuzzing.value = { enabled: !!data.enabled, radius_m: data.radius_m };
    gpsFuzzingMsg.value = '✓ ' + t('settings.saved'); gpsFuzzingOk.value = true;
  } catch (err) {
    gpsFuzzingMsg.value = err.response?.data?.error || err.message; gpsFuzzingOk.value = false;
  }
  setTimeout(() => { gpsFuzzingMsg.value = ''; }, 2500);
}

// ── Tesla Verbindung ──
const teslaConnected   = ref(false);
const virtualKeyHost   = window.location.hostname;
const syncingVehicles  = ref(false);
const syncMsg          = ref('');
const syncOk           = ref(false);
const telemetryBusyFor = ref(null);
const telemetryStatus  = ref({ vehicles: [] });
const partnerBusy      = ref(false);
const partnerResult    = ref(null);
const teslaAuthUrl     = ref('');

async function prefetchTeslaAuthUrl() {
  try {
    const { data } = await api.get('/auth/tesla/auth-url');
    teslaAuthUrl.value = data.url;
  } catch { /* ignorieren */ }
}

function teslaReconnect() {
  if (!teslaAuthUrl.value) return;
  const popup = window.open(teslaAuthUrl.value, 'tesla_oauth', 'width=600,height=700,scrollbars=yes');
  teslaAuthUrl.value = '';
  const onMessage = (event) => {
    if (event.data?.type !== 'tesla_connected') return;
    window.removeEventListener('message', onMessage);
    clearInterval(timer);
    try { popup?.close(); } catch { /* ignorieren */ }
    teslaConnected.value = true;
    syncMsg.value = 'Tesla erfolgreich verbunden ✓'; syncOk.value = true;
    prefetchTeslaAuthUrl();
  };
  window.addEventListener('message', onMessage);
  const timer = setInterval(() => {
    if (popup?.closed) { clearInterval(timer); window.removeEventListener('message', onMessage); prefetchTeslaAuthUrl(); }
  }, 500);
}

async function syncVehicles() {
  syncingVehicles.value = true; syncMsg.value = '';
  try {
    const { data } = await api.post('/vehicles/sync');
    syncOk.value = true;
    syncMsg.value = `${data.synced} Fahrzeug(e) synchronisiert`;
    appStore.vehicles = data.vehicles;
    if (!appStore.selectedVehicleId && data.vehicles.length) appStore.selectedVehicleId = data.vehicles[0].id;
  } catch (err) {
    syncOk.value = false;
    syncMsg.value = err.response?.data?.error ?? 'Synchronisierung fehlgeschlagen';
  } finally { syncingVehicles.value = false; }
}

async function registerPartner() {
  partnerBusy.value = true; partnerResult.value = null;
  try {
    await api.post('/fleet/partner/register');
    partnerResult.value = { ok: true };
    await loadTelemetryStatus();
  } catch (err) {
    partnerResult.value = { ok: false, error: err.response?.data?.error ?? err.message };
  } finally { partnerBusy.value = false; }
}

async function loadTelemetryStatus() {
  try {
    const { data } = await api.get('/fleet/telemetry/status');
    telemetryStatus.value = data;
  } catch { telemetryStatus.value = { vehicles: [] }; }
}

async function configureTelemetryFor(vin) {
  if (telemetryBusyFor.value) return;
  telemetryBusyFor.value = vin;
  try {
    await api.post(`/fleet/telemetry/configure/${encodeURIComponent(vin)}`, {}, { timeout: 100000 });
  } catch { /* Fehler kommen via Status-Refresh als last_error wieder */ }
  await loadTelemetryStatus();
  telemetryBusyFor.value = null;
}

const TELEMETRY_KEYS = {
  streaming:        'settings.telemetryStatusStreaming',
  registered_idle:  'settings.telemetryStatusIdle',
  not_registered:   'settings.telemetryStatusNotReg',
  approval_missing: 'settings.telemetryStatusApproval',
  error:            'settings.telemetryStatusError',
};
const telemetryStatusLabel = s => TELEMETRY_KEYS[s] ? t(TELEMETRY_KEYS[s]) : s;
const telemetryDotClass    = s => ({
  streaming: 'text-green-400', registered_idle: 'text-yellow-400',
  not_registered: 'text-red-400', approval_missing: 'text-gray-500', error: 'text-red-400',
}[s] || 'text-gray-400');
const telemetryTextClass = s => ({
  streaming: 'text-green-300', registered_idle: 'text-yellow-200',
  not_registered: 'text-red-200', approval_missing: 'text-gray-400', error: 'text-red-200',
}[s] || 'text-gray-300');

function relativeAgo(ts) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (diff < 60)    return `vor ${diff}s`;
  if (diff < 3600)  return `vor ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

// ── Tesla API-Nutzung ──
const usageCfg = ref(null);
const usageMsg = ref('');
const usageOk  = ref(false);

async function loadUsageConfig() {
  try {
    const { data } = await api.get('/tesla-usage/config');
    usageCfg.value = data;
  } catch { /* ignore */ }
}

async function saveUsageConfig() {
  usageMsg.value = '';
  try {
    const { data } = await api.put('/tesla-usage/config', usageCfg.value);
    usageCfg.value = data;
    usageMsg.value = 'Tarife gespeichert ✓'; usageOk.value = true;
  } catch (err) {
    usageMsg.value = err.response?.data?.error ?? 'Fehler beim Speichern'; usageOk.value = false;
  }
  setTimeout(() => { usageMsg.value = ''; }, 2500);
}

async function resetUsageMonth() {
  if (!confirm('Zähler für den aktuellen Monat wirklich auf 0 setzen?')) return;
  try {
    const { data } = await api.post('/tesla-usage/reset');
    usageMsg.value = `Zurückgesetzt (${data.deletedRows} Zeilen)`; usageOk.value = true;
  } catch (err) {
    usageMsg.value = err.response?.data?.error ?? 'Fehler beim Reset'; usageOk.value = false;
  }
  setTimeout(() => { usageMsg.value = ''; }, 2500);
}

onMounted(async () => {
  loadTenantDefaultLocale();
  loadTenantPseudonym();
  loadTariffConfig();
  loadGpsFuzzing();
  loadUsageConfig();
  loadTelemetryStatus();
  prefetchTeslaAuthUrl();
  const { data } = await api.get('/auth/tesla/status').catch(() => ({ data: { connected: false } }));
  teslaConnected.value = data.connected;
});
</script>

<style scoped>
.lang-pick {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  border-radius: 0.55rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, transform 0.1s ease;
}
.lang-pick:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
.lang-pick:active { transform: scale(0.97); }
.lang-pick:disabled { opacity: 0.55; cursor: progress; }
.lang-pick.active {
  background: var(--accent, #ef4444);
  border-color: transparent;
  color: white;
  box-shadow: 0 6px 16px rgba(239,68,68,0.18);
}
</style>

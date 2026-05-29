<template>
  <div class="max-w-2xl space-y-6">

    <!-- Neustart-Banner: sticky oben, unabhängig von Scroll-Position und Sections -->
    <div v-if="restart.restarting"
         class="sticky top-2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
                bg-yellow-900/90 border border-yellow-600/60 shadow-lg backdrop-blur-sm text-yellow-100 text-sm">
      <svg class="w-5 h-5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      <span>Server startet neu — bitte warten…</span>
    </div>
    <div v-if="restart.restartDone"
         class="sticky top-2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
                bg-green-900/90 border border-green-600/60 shadow-lg backdrop-blur-sm text-green-100 text-sm">
      <span class="text-lg">✓</span>
      <span>Backend bereit — Neustart erfolgreich.</span>
    </div>

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

    <!-- Fahrerverwaltung (verschoben aus Profil) -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="drivers"
      title="Fahrer & Profile"
      icon="👤"
      :collapsed="isCollapsed('drivers')"
      @toggle="toggle('drivers')"
    >
      <p class="text-sm text-gray-400">Fahrer werden Fahrten zugeordnet und erscheinen im Fahrtenbuch.</p>
      <div class="space-y-2">
        <div v-for="d in drivers" :key="d.id"
          class="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2">
          <div class="relative flex-shrink-0">
            <button @click="editingColor = editingColor === d.id ? null : d.id"
              class="w-5 h-5 rounded-full border-2 border-gray-600 hover:border-white transition flex-shrink-0"
              :style="{ background: d.color }"
              v-tooltip="'Farbe ändern'"></button>
            <div v-if="editingColor === d.id"
              class="absolute left-0 top-full mt-1 z-20 bg-gray-900 border border-gray-600 rounded-xl p-2 flex flex-wrap gap-1.5 shadow-xl"
              style="width: 144px" @click.stop>
              <button v-for="c in DRIVER_COLORS" :key="c"
                class="w-7 h-7 rounded-full border-2 transition hover:scale-110"
                :class="d.color === c ? 'border-white' : 'border-transparent'"
                :style="{ background: c }"
                @click="saveDriverColor(d, c)"></button>
            </div>
          </div>
          <input :value="d.name"
            @change="e => saveDriverName(d, e.target.value)"
            class="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-gray-500 py-0.5 min-w-0"
            placeholder="Name" />
          <button @click="setDefaultDriver(d)"
            class="text-xs px-2 py-0.5 rounded-full transition flex-shrink-0"
            :class="d.is_default ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-400 hover:text-white'"
            v-tooltip="d.is_default ? 'Standard-Fahrer – wird bei neuen Fahrten auto-zugewiesen' : 'Als Standard-Fahrer setzen'">
            {{ d.is_default ? '★ Standard' : '☆ Standard' }}
          </button>
          <button @click="deleteDriver(d)"
            class="text-gray-600 hover:text-red-400 transition text-sm flex-shrink-0"
            v-tooltip="'Fahrer löschen'">✕</button>
        </div>
        <p v-if="!drivers.length" class="text-gray-500 text-sm">Noch keine Fahrer angelegt.</p>
      </div>
      <div class="flex gap-2">
        <input v-model="newDriverName" type="text" placeholder="Name (z.B. Sven)"
          class="flex-1 bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-tesla-red"
          @keyup.enter="addDriver" />
        <button @click="addDriver" :disabled="!newDriverName.trim()" class="btn-primary text-sm">+ Hinzufügen</button>
      </div>
      <p v-if="driverMsg" class="text-sm" :class="driverOk ? 'text-green-400' : 'text-red-400'">{{ driverMsg }}</p>
    </SortableSection>

    <!-- Geofences (verschoben aus Profil) -->
    <SortableSection
      v-if="appStore.selectedVehicle"
      :sortable="false"
      page-id="admin-settings"
      section-id="geofences"
      :title="('settings.geofenceTitle')"
      icon="📍"
      :collapsed="isCollapsed('geofences')"
      @toggle="toggle('geofences')"
    >
      <GeofenceManager />
    </SortableSection>

    <!-- Tesla Fleet-API Zugangsdaten -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="teslaCredentials"
      title="Tesla Fleet-API Zugangsdaten"
      icon="🔑"
      :collapsed="isCollapsed('teslaCredentials')"
      @toggle="toggle('teslaCredentials')"
    >
      <p class="text-sm text-gray-400">
        Client-ID und Secret aus dem
        <a href="https://developer.tesla.com/" target="_blank" rel="noopener" class="text-blue-400 hover:underline">Tesla Developer Portal</a>.
        Vorrangig gegenüber .env — kein Server-Neustart nötig.
      </p>
      <div v-if="teslaCredsCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
        ℹ️ Derzeit aktiv aus <code>.env</code>. Werte hier eingeben, um .env zu überschreiben.
      </div>
      <div class="space-y-3">
        <div>
          <label class="label">Client ID</label>
          <input v-model="teslaCreds.client_id" type="text" placeholder="z.B. abc123def456"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
        </div>
        <div>
          <label class="label">Client Secret</label>
          <input v-model="teslaCreds.client_secret" type="password"
            :placeholder="teslaCredsCfg.client_secret_set ? '••••••••••••••••' : 'Secret eingeben'"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
        </div>
        <div>
          <label class="label">Audience (Fleet API URL)</label>
          <input v-model="teslaCreds.audience" type="text" placeholder="https://fleet-api.prd.eu.vn.cloud.tesla.com"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
          <p class="text-xs text-gray-500 mt-1">EU: ...eu... | NA: ...na...</p>
        </div>
      </div>
      <button @click="saveTeslaCredentials" :disabled="teslaCreds.saving" class="btn-primary text-sm">
        {{ teslaCreds.saving ? '…' : 'Zugangsdaten speichern' }}
      </button>
      <p v-if="teslaCreds.msg" class="text-sm" :class="teslaCreds.ok ? 'text-green-400' : 'text-red-400'">{{ teslaCreds.msg }}</p>
    </SortableSection>

    <!-- Web Push / VAPID -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="webPush"
      title="Web Push Benachrichtigungen (VAPID)"
      icon="🔔"
      :collapsed="isCollapsed('webPush')"
      @toggle="toggle('webPush')"
    >
      <p class="text-sm text-gray-400">
        VAPID-Keys ermöglichen Browser-Push-Benachrichtigungen. Einmal generieren, dann nie mehr ändern
        (sonst müssen alle Nutzer erneut zustimmen).
      </p>
      <div v-if="vapidCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
        ℹ️ Derzeit aktiv aus <code>.env</code>. Neuen Key generieren, um .env zu überschreiben.
      </div>
      <div v-if="vapidCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
        ✓ VAPID konfiguriert — Push-Benachrichtigungen aktiv
        <br><span class="text-xs text-gray-400 font-mono break-all">{{ vapidCfg.public_key?.slice(0, 40) }}…</span>
      </div>
      <div class="space-y-3">
        <div>
          <label class="label">Kontakt-E-Mail</label>
          <input v-model="vapidForm.contact" type="email" placeholder="mailto:admin@example.com"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
        </div>
        <div v-if="vapidCfg.configured" class="space-y-2">
          <label class="label">Manuell überschreiben</label>
          <input v-model="vapidForm.public_key" type="text" placeholder="Public Key (base64url)"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red font-mono text-xs" />
          <input v-model="vapidForm.private_key" type="password" placeholder="Private Key (nur bei Änderung eingeben)"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="generateVapid" :disabled="vapidForm.generating"
          class="btn-primary text-sm flex items-center gap-2">
          {{ vapidForm.generating ? '…' : (vapidCfg.configured ? '🔄 Neu generieren' : '⚡ VAPID-Keys generieren') }}
        </button>
        <button v-if="vapidCfg.configured" @click="saveVapidConfig" :disabled="vapidForm.saving" class="btn-secondary text-sm">
          {{ vapidForm.saving ? '…' : 'Speichern' }}
        </button>
      </div>
      <p v-if="vapidForm.msg" class="text-sm" :class="vapidForm.ok ? 'text-green-400' : 'text-red-400'">{{ vapidForm.msg }}</p>
    </SortableSection>

    <!-- Telegram Bot -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="telegramBot"
      title="Telegram Bot"
      icon="✈️"
      :collapsed="isCollapsed('telegramBot')"
      @toggle="toggle('telegramBot')"
    >
      <p class="text-sm text-gray-400">
        Erstelle einen Bot über
        <a href="https://t.me/BotFather" target="_blank" rel="noopener" class="text-blue-400 hover:underline">@BotFather</a>
        und füge das Token hier ein. Nutzer können danach Benachrichtigungen über Telegram aktivieren.
      </p>
      <div v-if="telegramCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
        ℹ️ Derzeit aktiv aus <code>.env</code>. Token hier eingeben überschreibt die .env.
      </div>
      <div v-if="telegramCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
        ✓ Telegram Bot konfiguriert
      </div>
      <div class="space-y-3">
        <div>
          <label class="label">Bot Token</label>
          <input v-model="telegramForm.bot_token" type="password"
            :placeholder="telegramCfg.configured ? '••••••••:••••••••••••••••••••' : 'z.B. 123456789:ABCdef…'"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
        </div>
        <div>
          <label class="label">Webhook URL (optional)</label>
          <input v-model="telegramForm.webhook_url" type="url" placeholder="https://deine-app.example.com"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
          <p class="text-xs text-gray-500 mt-1">Leer lassen = Long-Polling. Webhook ist effizienter für Produktionsserver.</p>
        </div>
      </div>
      <button @click="saveTelegramConfig" :disabled="telegramForm.saving" class="btn-primary text-sm">
        {{ telegramForm.saving ? '…' : 'Bot-Token speichern' }}
      </button>
      <p v-if="telegramForm.msg && !restart.pickerOpen && !restart.active" class="text-sm text-amber-300">{{ telegramForm.msg }}</p>

      <!-- Restart-Picker erscheint direkt nach Telegram-Save. Vier Optionen:
           Sofort, +10 min, +30 min, Zu Uhrzeit, oder „Später manuell". -->
      <div v-if="restart.pickerOpen && !restart.active"
           class="bg-amber-900/15 border border-amber-700/40 rounded-lg p-3 space-y-3">
        <p class="text-sm text-amber-200 flex items-center gap-2">
          <span>🔄</span>
          <span class="flex-1">Damit der Bot aktiv wird, muss der Server-Container neu starten. Wann?</span>
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <button @click="scheduleRestart(0,    'telegram')"
                  class="btn-primary text-xs px-3 py-1.5">Sofort</button>
          <button @click="scheduleRestart(600,  'telegram')"
                  class="btn-secondary text-xs px-3 py-1.5">In 10 Min</button>
          <button @click="scheduleRestart(1800, 'telegram')"
                  class="btn-secondary text-xs px-3 py-1.5">In 30 Min</button>
          <div class="flex items-center gap-1.5">
            <input type="time" v-model="restart.atTime"
                   class="bg-gray-700 rounded-lg px-2 py-1 text-xs text-white"
                   v-tooltip="'Uhrzeit heute (oder morgen, falls schon vorbei)'">
            <button @click="scheduleAtTime('telegram')"
                    class="btn-secondary text-xs px-3 py-1.5">Zu Uhrzeit</button>
          </div>
          <button @click="restart.pickerOpen = false"
                  class="text-xs text-gray-400 hover:text-gray-200 px-2 py-1.5">
            Später manuell
          </button>
        </div>
        <p v-if="restart.error" class="text-xs text-red-400">{{ restart.error }}</p>
      </div>

      <!-- Aktiver Schedule-Status + Abbrechen-Button -->
      <div v-if="restart.active"
           class="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3">
        <p class="text-sm text-blue-200 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span class="flex-1">
            Neustart geplant in
            <strong class="font-mono">{{ formatRemaining(restart.remainingSec) }}</strong>
            <span class="text-xs text-blue-300/70">
              ({{ new Date(restart.scheduledFor).toLocaleTimeString() }})
            </span>
          </span>
          <button @click="cancelRestart" class="text-xs text-blue-300 hover:text-blue-100 underline">
            Abbrechen
          </button>
        </p>
      </div>

      <!-- Server startet gerade neu -->
      <div v-if="restart.restarting"
           class="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3">
        <p class="text-sm text-yellow-200 flex items-center gap-2">
          <svg class="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          Server startet neu — bitte warten…
        </p>
      </div>

      <!-- Neustart erfolgreich -->
      <div v-if="restart.restartDone"
           class="bg-green-900/20 border border-green-700/40 rounded-lg p-3">
        <p class="text-sm text-green-300 flex items-center gap-2">
          <span>✓</span>
          Backend bereit — Neustart erfolgreich.
        </p>
      </div>
    </SortableSection>

    <!-- Grok / xAI API Key -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="grokKey"
      title="Grok / xAI API Key"
      icon="🤖"
      :collapsed="isCollapsed('grokKey')"
      @toggle="toggle('grokKey')"
    >
      <p class="text-sm text-gray-400">
        API-Key für den KI-Chat (Grok). Registrierung auf
        <a href="https://console.x.ai" target="_blank" rel="noopener" class="text-blue-400 hover:underline">console.x.ai</a>.
      </p>
      <div v-if="grokCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
        ✓ xAI API Key konfiguriert — Grok-Chat aktiv
      </div>
      <div class="space-y-2">
        <input v-model="grokForm.xai_api_key" type="password"
          :placeholder="grokCfg.configured ? '••••••••••••••••' : 'xai-… Key eingeben'"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
      </div>
      <div class="flex gap-2">
        <button @click="saveGrokKey" :disabled="grokForm.saving" class="btn-primary text-sm">
          {{ grokForm.saving ? '…' : 'API-Key speichern' }}
        </button>
        <button v-if="grokCfg.configured" @click="clearGrokKey" class="btn-secondary text-sm">Key löschen</button>
      </div>
      <p v-if="grokForm.msg" class="text-sm" :class="grokForm.ok ? 'text-green-400' : 'text-red-400'">{{ grokForm.msg }}</p>
    </SortableSection>

    <!-- ABRP Global API Key -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="abrpKey"
      title="ABRP App-Key (Global)"
      icon="⚡"
      :collapsed="isCollapsed('abrpKey')"
      @toggle="toggle('abrpKey')"
    >
      <p class="text-sm text-gray-400">
        Der globale App-API-Key für A Better Route Planner (ABRP), registriert auf
        <a href="https://api.iternio.com" target="_blank" rel="noopener" class="text-blue-400 hover:underline">api.iternio.com</a>.
        Nutzer geben ihren persönlichen ABRP-Token separat im Profil ein.
      </p>
      <div v-if="abrpCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
        ℹ️ Derzeit aktiv aus <code>.env</code>.
      </div>
      <div v-if="abrpCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
        ✓ ABRP App-Key: {{ abrpCfg.masked }}
      </div>
      <div class="space-y-2">
        <input v-model="abrpForm.key" type="password"
          :placeholder="abrpCfg.configured ? '••••••••' : 'API-Key eingeben'"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
      </div>
      <div class="flex gap-2">
        <button @click="saveAbrpKey" :disabled="abrpForm.saving" class="btn-primary text-sm">
          {{ abrpForm.saving ? '…' : 'Key speichern' }}
        </button>
        <button v-if="abrpCfg.configured" @click="clearAbrpKey" class="btn-secondary text-sm">Key löschen</button>
      </div>
      <p v-if="abrpForm.msg" class="text-sm" :class="abrpForm.ok ? 'text-green-400' : 'text-red-400'">{{ abrpForm.msg }}</p>
    </SortableSection>

    <!-- Externe API-Schlüssel (OCM + HERE) -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="externalApiKeys"
      title="Externe API-Schlüssel"
      icon="🔑"
      :collapsed="isCollapsed('externalApiKeys')"
      @toggle="toggle('externalApiKeys')"
    >
      <p class="text-sm text-gray-400">
        API-Keys für externe Kartendienste — werden vom Routenplaner verwendet.
      </p>

      <!-- OpenChargeMap -->
      <div class="space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span :class="ocmCfg.configured ? 'text-green-400' : 'text-red-400'" class="text-lg">●</span>
            <div>
              <p class="text-sm font-medium">OpenChargeMap API-Key</p>
              <p class="text-xs text-gray-500">
                Schnellladestationen im Routenplaner ·
                <a href="https://openchargemap.org/site/develop/api" target="_blank"
                  class="text-blue-400 hover:underline">Kostenlos registrieren →</a>
              </p>
            </div>
          </div>
          <span v-if="ocmCfg.configured" class="text-xs text-gray-500 font-mono">{{ ocmCfg.masked }}</span>
        </div>
        <div class="flex gap-2">
          <input v-model="ocmKeyInput" type="password"
            :placeholder="ocmCfg.configured ? '••••••••  (neuen Key eingeben zum Ändern)' : 'API-Key einfügen …'"
            class="input flex-1 text-sm font-mono" @keyup.enter="saveOcmKey" />
          <button @click="saveOcmKey" :disabled="ocmSaving || !ocmKeyInput.trim()"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-tesla-red text-white hover:bg-red-600 disabled:opacity-40">
            {{ ocmSaving ? '…' : 'Speichern' }}
          </button>
          <button v-if="ocmCfg.configured" @click="deleteOcmKey" :disabled="ocmSaving"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-gray-700 text-gray-300 hover:bg-red-900 hover:text-red-200 disabled:opacity-40"
            v-tooltip="'API-Key löschen'">✕</button>
        </div>
        <p v-if="ocmMsg" :class="ocmMsgOk ? 'text-green-400' : 'text-red-400'" class="text-xs">{{ ocmMsg }}</p>
      </div>

      <div class="border-t border-gray-700/50 pt-4 space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span :class="hereCfg.configured ? 'text-green-400' : 'text-red-400'" class="text-lg">●</span>
            <div>
              <p class="text-sm font-medium">HERE Maps API-Key</p>
              <p class="text-xs text-gray-500">
                Echtzeit-Verkehr im Routenplaner ·
                <a href="https://developer.here.com/sign-up" target="_blank"
                  class="text-blue-400 hover:underline">Kostenlos registrieren →</a>
              </p>
            </div>
          </div>
          <span v-if="hereCfg.configured" class="text-xs text-gray-500 font-mono">{{ hereCfg.masked }}</span>
        </div>
        <div class="flex gap-2">
          <input v-model="hereKeyInput" type="password"
            :placeholder="hereCfg.configured ? '••••••••  (neuen Key eingeben zum Ändern)' : 'API-Key einfügen …'"
            class="input flex-1 text-sm font-mono" @keyup.enter="saveHereKey" />
          <button @click="saveHereKey" :disabled="hereSaving || !hereKeyInput.trim()"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-tesla-red text-white hover:bg-red-600 disabled:opacity-40">
            {{ hereSaving ? '…' : 'Speichern' }}
          </button>
          <button v-if="hereCfg.configured" @click="deleteHereKey" :disabled="hereSaving"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-gray-700 text-gray-300 hover:bg-red-900 hover:text-red-200 disabled:opacity-40"
            v-tooltip="'API-Key löschen'">✕</button>
        </div>
        <p v-if="hereMsg" :class="hereMsgOk ? 'text-green-400' : 'text-red-400'" class="text-xs">{{ hereMsg }}</p>
      </div>
    </SortableSection>

    <!-- Monitoring & Selbstheilung -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="monitoring"
      title="Monitoring &amp; Selbstheilung"
      icon="🛡"
      :collapsed="isCollapsed('monitoring')"
      @toggle="toggle('monitoring')"
    >
      <div class="flex items-center justify-between flex-wrap gap-2">
        <p class="text-sm text-gray-400">Automatische Überwachung: alle 15 min Container-Status + /api/health. Bei Ausfall automatischer Neustart + optionaler E-Mail-Alert.</p>
        <button @click="loadMonitoringLog" :disabled="monLogLoading"
          class="btn-secondary text-xs px-3 py-1">
          {{ monLogLoading ? '…' : 'Log aktualisieren' }}
        </button>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-xs text-gray-400 block">Alert-E-Mail bei Selbstheilung</label>
          <div class="flex gap-2">
            <input v-model="monCfg.alert_email" type="email"
              placeholder="admin@example.com"
              class="input flex-1 text-sm" @keyup.enter="saveMonitoringConfig" />
            <button @click="saveMonitoringConfig" :disabled="monSaving"
              class="px-3 py-1.5 rounded-lg text-sm bg-tesla-red text-white hover:bg-red-600 disabled:opacity-40">
              {{ monSaving ? '…' : 'Speichern' }}
            </button>
          </div>
          <p class="text-xs text-gray-500">Leer lassen = kein E-Mail-Alert.</p>
        </div>
        <div class="flex items-start gap-3 pt-1">
          <button @click="toggleHeal" :disabled="monSaving"
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="monCfg.heal_enabled ? 'bg-green-600' : 'bg-gray-600'"
            v-tooltip="monCfg.heal_enabled ? 'Selbstheilung aktiv – alle 15 min' : 'Selbstheilung deaktiviert'">
            <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
              :class="monCfg.heal_enabled ? 'translate-x-5' : 'translate-x-0'"></span>
          </button>
          <div>
            <p class="text-sm font-medium">Selbstheilung</p>
            <p class="text-xs text-gray-500">Alle 15 min: Container-Status + /api/health. Bei Ausfall automatischer Neustart.</p>
          </div>
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-xs text-gray-400 flex items-center gap-2">
          🤖 KI-Autofix-Schlüssel
          <span v-if="monCfg.anthropic_configured" class="text-green-400">✓ konfiguriert</span>
        </label>
        <div class="flex gap-2">
          <input v-model="monCfg.anthropic_key" type="password"
            :placeholder="monCfg.anthropic_configured ? 'Neuen Key eingeben zum Überschreiben' : 'Anthropic API-Key eingeben'"
            class="input flex-1 text-sm" @keyup.enter="saveMonitoringConfig" />
          <button @click="saveMonitoringConfig" :disabled="monSaving || !monCfg.anthropic_key"
            class="px-3 py-1.5 rounded-lg text-sm bg-tesla-red text-white hover:bg-red-600 disabled:opacity-40">
            {{ monSaving ? '…' : 'Speichern' }}
          </button>
        </div>
        <p class="text-xs text-gray-500">Anthropic API-Key für KI-Eskalation (Claude Haiku). Leer lassen = nur E-Mail.</p>
      </div>
      <p v-if="monMsg" :class="monMsgOk ? 'text-green-400' : 'text-red-400'" class="text-xs">{{ monMsg }}</p>

      <!-- SMTP -->
      <div class="space-y-2 pt-2 border-t border-gray-700">
        <label class="text-xs text-gray-400 flex items-center gap-2">
          📨 E-Mail-Versand (SMTP)
          <span v-if="smtpCfg.configured" class="text-green-400">✓ konfiguriert</span>
        </label>
        <p class="text-xs text-gray-500">Gmail: App-Passwort unter myaccount.google.com → Sicherheit → App-Passwörter. Port 587 (STARTTLS) oder 465 (SSL).</p>
        <div class="grid sm:grid-cols-3 gap-2">
          <input v-model="smtpCfg.host" type="text" placeholder="smtp.gmail.com" class="sm:col-span-2 input text-sm" />
          <input v-model="smtpCfg.port" type="number" placeholder="587" class="input text-sm" />
        </div>
        <input v-model="smtpCfg.user" type="email" placeholder="Benutzername" class="w-full input text-sm" />
        <input v-model="smtpCfg.password" type="password" placeholder="Passwort / App-Passwort" class="w-full input text-sm" />
        <input v-model="smtpCfg.from" type="email" placeholder="Absenderadresse (optional)" class="w-full input text-sm" />
        <div class="flex gap-2">
          <button @click="saveSmtpConfig" :disabled="smtpSaving"
            class="px-3 py-1.5 rounded-lg text-sm bg-tesla-red text-white hover:bg-red-600 disabled:opacity-40">
            {{ smtpSaving ? '…' : 'Speichern' }}
          </button>
          <button @click="testSmtp" :disabled="smtpTesting || !smtpCfg.configured"
            class="px-3 py-1.5 rounded-lg text-sm border border-gray-600 text-gray-300 hover:border-gray-400 disabled:opacity-40 transition">
            {{ smtpTesting ? '…' : smtpTestMsg || 'Test-Mail senden' }}
          </button>
        </div>
        <p v-if="smtpMsg" :class="smtpMsgOk ? 'text-green-400' : 'text-red-400'" class="text-xs">{{ smtpMsg }}</p>
      </div>

      <div v-if="monLog.heal?.length || monLog.security?.length" class="space-y-3">
        <details v-if="monLog.heal?.length">
          <summary class="cursor-pointer text-xs text-gray-400 hover:text-white select-none">
            Heal-Log (letzte {{ monLog.heal.length }} Einträge)
          </summary>
          <pre class="mt-2 bg-gray-900 rounded p-2 text-[10px] overflow-x-auto max-h-48 text-gray-300">{{ monLog.heal.join('\n') }}</pre>
        </details>
        <details v-if="monLog.security?.length">
          <summary class="cursor-pointer text-xs text-gray-400 hover:text-white select-none">
            Security-Check (letzte {{ monLog.security.length }} Einträge)
          </summary>
          <pre class="mt-2 bg-gray-900 rounded p-2 text-[10px] overflow-x-auto max-h-48 text-gray-300">{{ monLog.security.join('\n') }}</pre>
        </details>
      </div>
      <p v-else class="text-xs text-gray-500">Noch keine Heal-Ereignisse protokolliert.</p>
    </SortableSection>

    <!-- Automatisches Backup -->
    <SortableSection
      :sortable="false"
      page-id="admin-settings"
      section-id="backup"
      title="Automatisches Backup"
      icon="💾"
      :collapsed="isCollapsed('backup')"
      @toggle="toggle('backup')"
    >
      <div class="flex items-center gap-3">
        <span v-if="bkpCfg.enabled" class="text-xs text-green-400 font-normal">● Aktiv</span>
        <span v-else class="text-xs text-gray-500 font-normal">● Inaktiv</span>
      </div>
      <label class="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" v-model="bkpCfg.enabled" class="w-4 h-4 accent-tesla-red" />
        <span class="text-sm">Tägliches Backup aktivieren</span>
      </label>

      <template v-if="bkpCfg.enabled">
        <div class="flex items-center gap-3 text-sm">
          <span class="text-gray-400 shrink-0">Uhrzeit (UTC):</span>
          <select v-model.number="bkpCfg.hour_utc" class="input text-sm w-32">
            <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2,'0') }}:00 UTC</option>
          </select>
          <span class="text-xs text-gray-500">(02:00 UTC ≈ 03:00 / 04:00 Berlin)</span>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-2">Backup-Ziel</p>
          <div class="flex gap-1 rounded-lg bg-gray-800/60 p-1 text-sm">
            <button v-for="m in [{k:'local',l:'📁 Lokal'},{k:'path',l:'🗂 Pfad'},{k:'s3',l:'☁ S3'},{k:'sftp',l:'🔒 SFTP'}]"
              :key="m.k" @click="bkpCfg.mode = m.k"
              :class="bkpCfg.mode===m.k ? 'bg-tesla-red text-white shadow' : 'text-gray-400 hover:text-white'"
              class="flex-1 py-1.5 px-2 rounded-md transition text-center text-xs font-medium">
              {{ m.l }}
            </button>
          </div>
        </div>
        <div v-if="bkpCfg.mode==='local'" class="space-y-2">
          <p class="text-xs text-gray-400">Speichert nach <code class="text-gray-300">/app/data/backups/</code>. Kein Setup nötig.</p>
          <div class="flex items-center gap-3 text-sm">
            <span class="text-gray-400">Aufbewahrung:</span>
            <input type="number" v-model.number="bkpCfg.retention_days" min="1" max="365" class="input text-sm w-24" />
            <span class="text-gray-400">Tage</span>
          </div>
        </div>
        <div v-if="bkpCfg.mode==='path'" class="space-y-2">
          <p class="text-xs text-gray-400">Pfad innerhalb des Containers — muss als Volume in <code class="text-gray-300">docker-compose.prod.yml</code> gemountet sein.</p>
          <input v-model="bkpCfg.path" type="text" placeholder="/mnt/nas/backups" class="w-full input text-sm font-mono" />
          <div class="flex items-center gap-3 text-sm">
            <span class="text-gray-400">Aufbewahrung:</span>
            <input type="number" v-model.number="bkpCfg.retention_days" min="1" max="365" class="input text-sm w-24" />
            <span class="text-gray-400">Tage</span>
          </div>
        </div>
        <div v-if="bkpCfg.mode==='s3'" class="space-y-2">
          <p class="text-xs text-gray-400">Amazon S3, MinIO, Backblaze B2, Cloudflare R2 o. Ä.</p>
          <div class="grid sm:grid-cols-2 gap-2">
            <input v-model="bkpCfg.s3_bucket" type="text" placeholder="Bucket-Name" class="input text-sm" />
            <input v-model="bkpCfg.s3_region" type="text" placeholder="us-east-1" class="input text-sm" />
          </div>
          <input v-model="bkpCfg.s3_endpoint" type="text" placeholder="https://minio.example.com  (leer = AWS S3)" class="w-full input text-sm font-mono" />
          <input v-model="bkpCfg.s3_prefix" type="text" placeholder="tesla-carview/" class="w-full input text-sm font-mono" />
          <input v-model="bkpCfg.s3_key_id" type="text" placeholder="Access Key ID" class="w-full input text-sm font-mono" />
          <input v-model="bkpCfg.s3_secret_input" type="password"
            :placeholder="bkpCfg.s3_secret_set ? '••••••  (leer = nicht ändern)' : 'Secret Access Key'"
            class="w-full input text-sm font-mono" />
        </div>
        <div v-if="bkpCfg.mode==='sftp'" class="space-y-2">
          <p class="text-xs text-gray-400">Lädt die Backup-JSON auf einen SFTP-Server hoch. Passwortauthentifizierung.</p>
          <div class="grid sm:grid-cols-3 gap-2">
            <input v-model="bkpCfg.sftp_host" type="text" placeholder="backup.example.com" class="sm:col-span-2 input text-sm" />
            <input v-model.number="bkpCfg.sftp_port" type="number" placeholder="22" class="input text-sm" />
          </div>
          <input v-model="bkpCfg.sftp_user" type="text" placeholder="Benutzername" class="w-full input text-sm" />
          <input v-model="bkpCfg.sftp_pw_input" type="password"
            :placeholder="bkpCfg.sftp_password_set ? '••••••  (leer = nicht ändern)' : 'Passwort'"
            class="w-full input text-sm" />
          <input v-model="bkpCfg.sftp_path" type="text" placeholder="/backups/" class="w-full input text-sm font-mono" />
        </div>
      </template>

      <div v-if="bkpCfg.last_run" class="border-t border-gray-700 pt-3 space-y-1">
        <div class="flex items-center gap-2 text-xs">
          <span :class="bkpCfg.last_status==='success' ? 'text-green-400' : 'text-red-400'">
            {{ bkpCfg.last_status==='success' ? '✓' : '✗' }}
          </span>
          <span class="text-gray-400">Letzter Lauf: {{ new Date(bkpCfg.last_run).toLocaleString('de-DE') }}</span>
        </div>
        <p v-if="bkpCfg.last_filename" class="text-xs text-gray-500 font-mono truncate">{{ bkpCfg.last_filename }}</p>
        <p v-if="bkpCfg.last_error" class="text-xs text-red-400">{{ bkpCfg.last_error }}</p>
      </div>
      <p v-else class="text-xs text-gray-500">Noch kein automatischer Backup durchgeführt.</p>

      <div class="flex gap-2 flex-wrap items-center">
        <button @click="saveBackupConfig" :disabled="bkpSaving"
          class="px-3 py-1.5 rounded-lg text-sm bg-tesla-red text-white hover:bg-red-600 disabled:opacity-40 transition">
          {{ bkpSaving ? '…' : 'Speichern' }}
        </button>
        <button @click="triggerBackupNow" :disabled="bkpRunning"
          class="px-3 py-1.5 rounded-lg text-sm border border-gray-600 text-gray-300 hover:border-gray-400 disabled:opacity-40 transition">
          {{ bkpRunning ? 'Läuft …' : 'Jetzt sichern' }}
        </button>
      </div>
      <p v-if="bkpMsg" :class="bkpMsgOk ? 'text-green-400' : 'text-red-400'" class="text-xs mt-1">{{ bkpMsg }}</p>
    </SortableSection>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import AppIcon from '../components/AppIcon.vue';
import WebhookManager from '../components/WebhookManager.vue';
import GeofenceManager from '../components/GeofenceManager.vue';
import { useLangStore, LANGS } from '../store/lang.js';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';

const ADMIN_SECTIONS = ['tenantLang', 'pseudonym', 'tariff', 'serviceIntervals', 'gpsFuzzing', 'tesla', 'webhooks', 'teslaUsage', 'drivers', 'geofences', 'teslaCredentials', 'webPush', 'telegramBot', 'grokKey', 'abrpKey', 'externalApiKeys', 'monitoring', 'backup'];
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


// ── Fahrerverwaltung ──
const DRIVER_COLORS = [
  '#6b7280','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#a855f7','#ec4899',
];
const drivers       = ref([]);
const newDriverName = ref('');
const driverMsg     = ref('');
const driverOk      = ref(false);
const editingColor  = ref(null);

async function loadDrivers() {
  const { data } = await api.get('/drivers');
  drivers.value = data;
}
async function addDriver() {
  const name = newDriverName.value.trim();
  if (!name) return;
  try {
    await api.post('/drivers', { name, color: '#6b7280' });
    newDriverName.value = '';
    driverMsg.value = 'Fahrer gespeichert.'; driverOk.value = true;
    await loadDrivers();
  } catch { driverMsg.value = 'Fehler beim Speichern.'; driverOk.value = false; }
  setTimeout(() => { driverMsg.value = ''; }, 2500);
}
async function saveDriverName(driver, name) {
  if (!name.trim()) return;
  await api.patch(`/drivers/${driver.id}`, { name: name.trim() });
  driver.name = name.trim();
}
async function saveDriverColor(driver, color) {
  editingColor.value = null;
  await api.patch(`/drivers/${driver.id}`, { color });
  driver.color = color;
}
async function setDefaultDriver(driver) {
  await api.patch(`/drivers/${driver.id}`, { is_default: driver.is_default ? 0 : 1 });
  await loadDrivers();
}
async function deleteDriver(driver) {
  if (!confirm(`Fahrer "${driver.name}" loeschen?`)) return;
  await api.delete(`/drivers/${driver.id}`);
  await loadDrivers();
}

// ── Tesla Fleet Credentials ──
const teslaCredsCfg = ref({ client_id: '', client_secret_set: false, from_env: false });
const teslaCreds    = ref({ client_id: '', client_secret: '', audience: '', saving: false, msg: '', ok: false });

async function loadTeslaCredentials() {
  try {
    const { data } = await api.get('/system/tesla-credentials');
    teslaCredsCfg.value = data;
    teslaCreds.value.client_id = data.client_id?.startsWith('(aus .env)') ? '' : (data.client_id || '');
    teslaCreds.value.audience  = data.audience || '';
  } catch { /* ignore */ }
}
async function saveTeslaCredentials() {
  teslaCreds.value.saving = true;
  try {
    await api.put('/system/tesla-credentials', {
      client_id:     teslaCreds.value.client_id,
      client_secret: teslaCreds.value.client_secret,
      audience:      teslaCreds.value.audience,
    });
    teslaCreds.value.msg = 'Zugangsdaten gespeichert.'; teslaCreds.value.ok = true;
    teslaCreds.value.client_secret = '';
    await loadTeslaCredentials();
  } catch { teslaCreds.value.msg = 'Fehler beim Speichern.'; teslaCreds.value.ok = false; }
  teslaCreds.value.saving = false;
  setTimeout(() => { teslaCreds.value.msg = ''; }, 3000);
}

// ── VAPID / Web Push ──
const vapidCfg  = ref({ configured: false, public_key: '', from_env: false });
const vapidForm = ref({ contact: '', public_key: '', private_key: '', saving: false, generating: false, msg: '', ok: false });

async function loadVapidConfig() {
  try {
    const { data } = await api.get('/system/vapid-config');
    vapidCfg.value  = data;
    vapidForm.value.contact = data.contact || '';
  } catch { /* ignore */ }
}
async function generateVapid() {
  if (!confirm('Neue VAPID-Keys generieren? Alle bestehenden Push-Abonnements müssen erneuert werden!')) return;
  vapidForm.value.generating = true;
  try {
    const { data } = await api.post('/system/vapid-generate');
    vapidForm.value.msg = 'VAPID-Keys generiert und gespeichert.'; vapidForm.value.ok = true;
    await loadVapidConfig();
  } catch (e) { vapidForm.value.msg = e.response?.data?.error || 'Fehler'; vapidForm.value.ok = false; }
  vapidForm.value.generating = false;
  setTimeout(() => { vapidForm.value.msg = ''; }, 4000);
}
async function saveVapidConfig() {
  vapidForm.value.saving = true;
  try {
    await api.put('/system/vapid-config', {
      contact:     vapidForm.value.contact,
      public_key:  vapidForm.value.public_key || undefined,
      private_key: vapidForm.value.private_key || undefined,
    });
    vapidForm.value.msg = 'Gespeichert.'; vapidForm.value.ok = true;
    vapidForm.value.public_key = ''; vapidForm.value.private_key = '';
    await loadVapidConfig();
  } catch { vapidForm.value.msg = 'Fehler.'; vapidForm.value.ok = false; }
  vapidForm.value.saving = false;
  setTimeout(() => { vapidForm.value.msg = ''; }, 3000);
}

// ── Telegram Bot ──
const telegramCfg  = ref({ configured: false, from_env: false });
const telegramForm = ref({ bot_token: '', webhook_url: '', saving: false, msg: '' });

async function loadTelegramConfig() {
  try {
    const { data } = await api.get('/system/telegram-config');
    telegramCfg.value  = data;
    telegramForm.value.webhook_url = data.webhook_url || '';
  } catch { /* ignore */ }
}
async function saveTelegramConfig() {
  telegramForm.value.saving = true;
  try {
    await api.put('/system/telegram-config', {
      bot_token:   telegramForm.value.bot_token,
      webhook_url: telegramForm.value.webhook_url,
    });
    telegramForm.value.bot_token = '';
    telegramForm.value.msg = 'Bot-Token gespeichert.';
    await loadTelegramConfig();
    // Statt nur Hinweis-Text: Picker öffnen, damit der Admin direkt
    // wählen kann, wann der Restart laufen soll.
    restart.pickerOpen = true;
    restart.error      = '';
  } catch { telegramForm.value.msg = 'Fehler beim Speichern.'; }
  telegramForm.value.saving = false;
}

// ── Restart-Scheduler ────────────────────────────────────────────────────
// Plant einen Container-Neustart (Sofort, in N Sekunden, oder zu Uhrzeit).
// Backend hält den setTimeout im laufenden Prozess; Frontend pollt nur den
// Status und zeigt einen lokalen Sekunden-Countdown, der alle 15 s mit
// dem Server synchronisiert.
const restart = reactive({
  pickerOpen:   false,
  active:       false,
  scheduledFor: null,
  remainingSec: 0,
  atTime:       '',
  error:        '',
  pollTimer:    null,
  restarting:   false,
  restartDone:  false,
});

function formatRemaining(sec) {
  if (sec < 60)  return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60)    return `${m}:${String(s).padStart(2,'0')} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

async function loadRestartSchedule() {
  try {
    const { data } = await api.get('/system/container-restart-schedule');
    if (data.scheduled) {
      restart.active       = true;
      restart.scheduledFor = data.scheduled_for;
      restart.remainingSec = data.remaining_sec;
    } else {
      restart.active       = false;
      restart.scheduledFor = null;
      restart.remainingSec = 0;
    }
  } catch { /* nicht-kritisch */ }
}

async function scheduleRestart(delaySec, reason) {
  restart.error = '';
  try {
    const { data } = await api.post('/system/container-restart-schedule', { delaySec, reason });
    if (data.immediate) {
      restart.active       = false;
      restart.pickerOpen   = false;
      restart.restarting   = true;
      restart.restartDone  = false;
      listenForAppUp();
      return;
    }
    restart.active       = true;
    restart.scheduledFor = data.scheduled_for;
    restart.remainingSec = data.delay_sec;
    restart.pickerOpen   = false;
    startRestartPoll();
  } catch (err) {
    // Kein err.response = Netzwerkfehler: Backend ist sofort weggegangen (immediate restart).
    if (!err.response) {
      restart.pickerOpen  = false;
      restart.restarting  = true;
      restart.restartDone = false;
      listenForAppUp();
    } else {
      restart.error = err.response?.data?.error || 'Konnte Neustart nicht planen.';
    }
  }
}

function scheduleAtTime(reason) {
  const t = (restart.atTime || '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) { restart.error = 'Bitte Uhrzeit als HH:MM angeben.'; return; }
  const target = new Date();
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
  const delay = Math.round((target.getTime() - Date.now()) / 1000);
  scheduleRestart(delay, reason);
}

async function cancelRestart() {
  try {
    await api.post('/system/container-restart-schedule', { delaySec: -1 });
    restart.active       = false;
    restart.scheduledFor = null;
    restart.remainingSec = 0;
    stopRestartPoll();
  } catch { /* ignore */ }
}

function startRestartPoll() {
  stopRestartPoll();
  let tick = 0;
  restart.pollTimer = setInterval(() => {
    if (restart.remainingSec > 0) restart.remainingSec -= 1;
    tick += 1;
    if (tick >= 15) { tick = 0; loadRestartSchedule(); }
    if (restart.remainingSec <= 0) stopRestartPoll();
  }, 1000);
}
function stopRestartPoll() {
  if (restart.pollTimer) { clearInterval(restart.pollTimer); restart.pollTimer = null; }
}

function listenForAppUp() {
  let done = false;
  let pollTimer = null;

  function finish() {
    if (done) return;
    done = true;
    window.removeEventListener('app-up', onAppUp);
    clearInterval(pollTimer);
    clearTimeout(timeoutTimer);
    restart.restarting  = false;
    restart.restartDone = true;
    setTimeout(() => { restart.restartDone = false; }, 15000);
  }

  // MaintenanceOverlay-Weg: app-up kommt wenn Overlay sich wieder schließt.
  function onAppUp() { finish(); }
  window.addEventListener('app-up', onAppUp);

  // Direkter Fallback-Poll: startet nach 1.5 s (gibt Backend Zeit um wirklich wegzugehen).
  // Arbeitet unabhängig von der MaintenanceOverlay — funktioniert auch wenn kein
  // Axios-Request läuft und deshalb kein app-down/app-up ausgelöst wird.
  setTimeout(() => {
    if (done) return;
    pollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (res.ok) finish();
      } catch { /* noch nicht erreichbar */ }
    }, 2000);
  }, 1500);

  const timeoutTimer = setTimeout(() => {
    if (!done) {
      done = true;
      window.removeEventListener('app-up', onAppUp);
      clearInterval(pollTimer);
      restart.restarting = false;
      restart.error = 'Neustart dauert ungewöhnlich lange — bitte Seite neu laden.';
    }
  }, 180_000);
}

// ── Grok / xAI ──
const grokCfg  = ref({ configured: false });
const grokForm = ref({ xai_api_key: '', saving: false, msg: '', ok: false });

async function loadGrokConfig() {
  try {
    const { data } = await api.get('/grok/config');
    grokCfg.value = data;
  } catch { /* ignore */ }
}
async function saveGrokKey() {
  grokForm.value.saving = true;
  try {
    await api.put('/grok/config', { xai_api_key: grokForm.value.xai_api_key });
    grokForm.value.xai_api_key = '';
    grokForm.value.msg = 'API-Key gespeichert.'; grokForm.value.ok = true;
    await loadGrokConfig();
  } catch { grokForm.value.msg = 'Fehler.'; grokForm.value.ok = false; }
  grokForm.value.saving = false;
  setTimeout(() => { grokForm.value.msg = ''; }, 3000);
}
async function clearGrokKey() {
  if (!confirm('xAI API-Key löschen? Grok-Chat wird deaktiviert.')) return;
  await api.put('/grok/config', { xai_api_key: '' });
  grokCfg.value.configured = false;
}

// ── ABRP Global Key ──
const abrpCfg  = ref({ configured: false, masked: '', from_env: false });
const abrpForm = ref({ key: '', saving: false, msg: '', ok: false });

async function loadAbrpConfig() {
  try {
    const { data } = await api.get('/system/abrp-config');
    abrpCfg.value = data;
  } catch { /* ignore */ }
}
async function saveAbrpKey() {
  abrpForm.value.saving = true;
  try {
    await api.put('/system/abrp-config', { abrp_api_key: abrpForm.value.key });
    abrpForm.value.key = '';
    abrpForm.value.msg = 'ABRP-Key gespeichert.'; abrpForm.value.ok = true;
    await loadAbrpConfig();
  } catch { abrpForm.value.msg = 'Fehler.'; abrpForm.value.ok = false; }
  abrpForm.value.saving = false;
  setTimeout(() => { abrpForm.value.msg = ''; }, 3000);
}
async function clearAbrpKey() {
  if (!confirm('ABRP App-Key löschen?')) return;
  await api.put('/system/abrp-config', { abrp_api_key: '' });
  abrpCfg.value.configured = false;
}

// ── Externe API-Schlüssel (OCM + HERE) ──
const ocmCfg      = ref({ configured: false, masked: '' });
const ocmKeyInput = ref('');
const ocmSaving   = ref(false);
const ocmMsg      = ref('');
const ocmMsgOk    = ref(true);

async function loadOcmConfig() {
  try { const { data } = await api.get('/routing/ocm-config'); ocmCfg.value = data; } catch { /* ignore */ }
}
async function saveOcmKey() {
  if (!ocmKeyInput.value.trim()) return;
  ocmSaving.value = true; ocmMsg.value = '';
  try {
    const { data } = await api.put('/routing/ocm-config', { ocm_api_key: ocmKeyInput.value.trim() });
    ocmCfg.value = data; ocmKeyInput.value = '';
    ocmMsg.value = '✓ Key gespeichert'; ocmMsgOk.value = true;
  } catch (e) { ocmMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern'; ocmMsgOk.value = false; }
  finally { ocmSaving.value = false; setTimeout(() => { ocmMsg.value = ''; }, 4000); }
}
async function deleteOcmKey() {
  ocmSaving.value = true; ocmMsg.value = '';
  try {
    const { data } = await api.put('/routing/ocm-config', { ocm_api_key: '' });
    ocmCfg.value = data; ocmMsg.value = 'Key gelöscht'; ocmMsgOk.value = true;
  } catch (e) { ocmMsg.value = e.response?.data?.error ?? 'Fehler'; ocmMsgOk.value = false; }
  finally { ocmSaving.value = false; setTimeout(() => { ocmMsg.value = ''; }, 3000); }
}

const hereCfg      = ref({ configured: false, masked: '' });
const hereKeyInput = ref('');
const hereSaving   = ref(false);
const hereMsg      = ref('');
const hereMsgOk    = ref(true);

async function loadHereConfig() {
  try { const { data } = await api.get('/routing/traffic-config'); hereCfg.value = data; } catch { /* ignore */ }
}
async function saveHereKey() {
  if (!hereKeyInput.value.trim()) return;
  hereSaving.value = true; hereMsg.value = '';
  try {
    const { data } = await api.put('/routing/traffic-config', { here_api_key: hereKeyInput.value.trim() });
    hereCfg.value = data; hereKeyInput.value = '';
    hereMsg.value = '✓ Key gespeichert'; hereMsgOk.value = true;
  } catch (e) { hereMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern'; hereMsgOk.value = false; }
  finally { hereSaving.value = false; setTimeout(() => { hereMsg.value = ''; }, 4000); }
}
async function deleteHereKey() {
  hereSaving.value = true; hereMsg.value = '';
  try {
    const { data } = await api.put('/routing/traffic-config', { here_api_key: '' });
    hereCfg.value = data; hereMsg.value = 'Key gelöscht'; hereMsgOk.value = true;
  } catch (e) { hereMsg.value = e.response?.data?.error ?? 'Fehler'; hereMsgOk.value = false; }
  finally { hereSaving.value = false; setTimeout(() => { hereMsg.value = ''; }, 3000); }
}

// ── Monitoring & Selbstheilung ──
const monCfg        = ref({ alert_email: '', heal_enabled: true, anthropic_key: '', anthropic_configured: false });
const monSaving     = ref(false);
const monMsg        = ref('');
const monMsgOk      = ref(true);
const monLog        = ref({ heal: [], security: [] });
const monLogLoading = ref(false);

async function loadMonitoringConfig() {
  try { const { data } = await api.get('/system/monitoring-config'); monCfg.value = { ...monCfg.value, ...data, anthropic_key: '' }; } catch { /* ignore */ }
}
async function saveMonitoringConfig() {
  monSaving.value = true; monMsg.value = '';
  try {
    const payload = { alert_email: monCfg.value.alert_email, heal_enabled: monCfg.value.heal_enabled };
    if (monCfg.value.anthropic_key?.trim()) payload.anthropic_key = monCfg.value.anthropic_key.trim();
    await api.put('/system/monitoring-config', payload);
    if (monCfg.value.anthropic_key?.trim()) { monCfg.value.anthropic_configured = true; monCfg.value.anthropic_key = ''; }
    monMsg.value = '✓ Gespeichert'; monMsgOk.value = true;
  } catch (e) { monMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern'; monMsgOk.value = false; }
  finally { monSaving.value = false; setTimeout(() => { monMsg.value = ''; }, 4000); }
}
async function toggleHeal() { monCfg.value.heal_enabled = !monCfg.value.heal_enabled; await saveMonitoringConfig(); }
async function loadMonitoringLog() {
  monLogLoading.value = true;
  try { const { data } = await api.get('/system/monitoring-log?lines=50'); monLog.value = data; } catch { /* ignore */ }
  finally { monLogLoading.value = false; }
}

// ── SMTP ──
const smtpCfg     = ref({ host: '', port: '587', user: '', password: '', from: '', configured: false });
const smtpSaving  = ref(false);
const smtpMsg     = ref('');
const smtpMsgOk   = ref(true);
const smtpTesting = ref(false);
const smtpTestMsg = ref('');

async function loadSmtpConfig() {
  try { const { data } = await api.get('/system/smtp-config'); smtpCfg.value = { ...data, password: '' }; } catch { /* ignore */ }
}
async function saveSmtpConfig() {
  smtpSaving.value = true; smtpMsg.value = '';
  try {
    const payload = { host: smtpCfg.value.host, port: smtpCfg.value.port, user: smtpCfg.value.user, from: smtpCfg.value.from };
    if (smtpCfg.value.password?.trim()) payload.password = smtpCfg.value.password.trim();
    await api.put('/system/smtp-config', payload);
    if (smtpCfg.value.password?.trim()) { smtpCfg.value.configured = true; smtpCfg.value.password = ''; }
    smtpMsg.value = '✓ Gespeichert'; smtpMsgOk.value = true;
  } catch (e) { smtpMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern'; smtpMsgOk.value = false; }
  finally { smtpSaving.value = false; setTimeout(() => { smtpMsg.value = ''; }, 4000); }
}
async function testSmtp() {
  smtpTesting.value = true; smtpTestMsg.value = '';
  try { await api.post('/system/smtp-test', {}); smtpTestMsg.value = '✓ Gesendet'; }
  catch (e) { smtpTestMsg.value = '✗ ' + (e.response?.data?.error ?? 'Fehler'); }
  finally { smtpTesting.value = false; setTimeout(() => { smtpTestMsg.value = ''; }, 5000); }
}

// ── Automatisches Backup ──
const bkpCfg     = ref({ enabled: false, mode: 'local', hour_utc: 2, retention_days: 30 });
const bkpSaving  = ref(false);
const bkpRunning = ref(false);
const bkpMsg     = ref('');
const bkpMsgOk   = ref(true);

async function loadBackupConfig() {
  try { const { data } = await api.get('/system/backup-config'); bkpCfg.value = { ...data, s3_secret_input: '', sftp_pw_input: '' }; } catch { /* ignore */ }
}
async function saveBackupConfig() {
  bkpSaving.value = true; bkpMsg.value = '';
  try {
    const payload = { ...bkpCfg.value };
    if (payload.s3_secret_input?.trim()) payload.s3_secret = payload.s3_secret_input;
    if (payload.sftp_pw_input?.trim())   payload.sftp_password = payload.sftp_pw_input;
    ['s3_secret_input', 'sftp_pw_input', 's3_secret_set', 'sftp_password_set', 'last_run', 'last_status', 'last_error', 'last_filename'].forEach(k => delete payload[k]);
    await api.put('/system/backup-config', payload);
    bkpMsg.value = '✓ Gespeichert'; bkpMsgOk.value = true;
    await loadBackupConfig();
  } catch (e) { bkpMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern'; bkpMsgOk.value = false; }
  finally { bkpSaving.value = false; setTimeout(() => { bkpMsg.value = ''; }, 3000); }
}
async function triggerBackupNow() {
  bkpRunning.value = true; bkpMsg.value = '';
  try {
    const { data } = await api.post('/system/backup-now');
    bkpMsg.value = `✓ Backup: ${data.target}`; bkpMsgOk.value = true;
    await loadBackupConfig();
  } catch (e) { bkpMsg.value = e.response?.data?.error ?? 'Fehler'; bkpMsgOk.value = false; }
  finally { bkpRunning.value = false; setTimeout(() => { bkpMsg.value = ''; }, 8000); }
}

onMounted(async () => {
  loadTenantDefaultLocale();
  loadTenantPseudonym();
  loadTariffConfig();
  loadGpsFuzzing();
  loadUsageConfig();
  loadTelemetryStatus();
  loadDrivers();
  loadTeslaCredentials();
  loadVapidConfig();
  loadTelegramConfig();
  // Restart-Schedule beim Öffnen einmal laden — falls schon einer aktiv ist,
  // zeigt die Telegram-Sektion direkt den Countdown statt der Picker-UI.
  loadRestartSchedule().then(() => { if (restart.active) startRestartPoll(); });
  loadGrokConfig();
  loadAbrpConfig();
  loadOcmConfig();
  loadHereConfig();
  loadMonitoringConfig();
  loadSmtpConfig();
  loadMonitoringLog();
  loadBackupConfig();
  prefetchTeslaAuthUrl();
  const { data } = await api.get('/auth/tesla/status').catch(() => ({ data: { connected: false } }));
  teslaConnected.value = data.connected;
});

onUnmounted(() => { stopRestartPoll(); });
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

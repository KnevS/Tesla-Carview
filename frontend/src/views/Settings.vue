<template>
  <div class="max-w-2xl space-y-6">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold">{{ $t('settings.title') }}</h1>
      <button @click="launchWizard"
        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-tesla-red/10 hover:bg-tesla-red/20 border border-tesla-red/30 text-tesla-red text-sm font-medium transition"
        v-tooltip="$t('wizard.launchHint')">
        <span>⚙️</span>
        {{ $t('wizard.launch') }}
      </button>
    </div>

    <!-- Sprache (User-Preference) -->
    <div class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="globe" :size="20" class="text-tesla-red" />
        {{ $t('settings.languageTitle') }}
      </h2>
      <p class="text-sm text-gray-400">{{ $t('settings.languageHint') }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="l in LANGS" :key="l.code"
          type="button"
          class="lang-pick"
          :class="{ active: langStore.current === l.code }"
          @click="onPickLang(l.code)"
        >
          <span class="text-lg leading-none">{{ l.flag }}</span>
          <span>{{ l.label }}</span>
        </button>
      </div>
      <p v-if="langSaved" class="text-xs text-green-400">✓ {{ $t('settings.saved') }}</p>
    </div>

    <!-- Mandanten-Standardsprache (nur Admin) -->
    <div v-if="auth.isAdmin" class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="users" :size="20" class="text-tesla-red" />
        {{ $t('settings.tenantDefaultLocaleTitle') }}
      </h2>
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
    </div>

    <!-- Mandanten-Pseudonym (Admin) — nach aussen sichtbarer Login-
         Identifier. Aus Datenschutz nicht der Klarname. -->
    <div v-if="auth.isAdmin" class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="lock" :size="20" class="text-tesla-red" />
        {{ $t('settings.pseudonymTitle') }}
      </h2>
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

      <!-- Confirmation-Modal mit kritischen Hinweisen. Teleport-to-body,
           damit der Modal-Hintergrund nicht halb durch die umgebende
           .card-backdrop-filter durchschimmert (Stacking-Context-Bug). -->
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
    </div>

    <!-- Vehicle profile -->
    <div class="card space-y-4">
      <h2 class="font-semibold flex items-center gap-2" v-tooltip="'Kennzeichen, Farbe und Modell des Fahrzeugs einstellen – wird auf Dashboard und Technik-Seite angezeigt'">
        <AppIcon name="steering" :size="20" class="text-tesla-red" />
        {{ $t('settings.vehicleProfileTitle') }}
      </h2>
      <!-- Hinweis-Banner: User ohne Edit-Recht sieht den Bereich
           read-only. Inputs sind weiter sichtbar fuer Transparenz, aber
           per :disabled-Bind unten (siehe fieldset) gesperrt. -->
      <p v-if="!auth.canEditVehicles" class="text-xs text-yellow-300/80 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2">
        🔒 Nur lesbar — du hast aktuell keine Berechtigung, Fahrzeug-Grunddaten zu aendern.
        Bitte wende dich an einen Administrator, wenn du Aenderungen vornehmen moechtest.
      </p>
      <fieldset :disabled="!auth.canEditVehicles" class="contents">
      <div v-if="appStore.selectedVehicle" class="space-y-4">
        <div class="flex gap-4 items-center">
          <img :src="vehicleImageUrl" :alt="appStore.selectedVehicle.display_name"
            class="h-24 object-contain bg-gray-800 rounded-lg px-2"
            v-tooltip="hasOptionCodes
              ? 'Vorschau basiert auf den echten Werks-Optionen deines Tesla (Farbe, Felgen, Spoiler, Trim)'
              : 'Vorschau basiert nur auf Modell + Farbe. Sobald der Tesla-Poller dein Auto erreicht, kommen Felgen + Trim automatisch dazu.'" />
          <button v-if="!hasOptionCodes && teslaConnected" @click="refreshVehicleOptions" type="button"
            class="text-xs text-blue-300 hover:text-blue-200 underline whitespace-nowrap"
            v-tooltip="'Holt option_codes + vehicle_config jetzt aktiv von der Tesla API. Nur wenn das Auto online ist.'">
            🔄 Werks-Optionen abrufen
          </button>
          <div class="text-sm">
            <p class="font-semibold text-white text-base">{{ appStore.selectedVehicle.display_name }}</p>
            <p class="text-gray-400">{{ vProfile.license_plate || 'Kein Kennzeichen' }}</p>
            <a v-if="teslaManualUrl" :href="teslaManualUrl" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
              v-tooltip="$t('settings.manualTooltip')">
              📖 {{ $t('settings.manualLink') }}
            </a>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="label">Fahrzeugkategorie</label>
            <div class="flex gap-3">
              <label class="flex-1 flex items-center gap-2 bg-gray-700 rounded-xl p-3 cursor-pointer border-2 transition"
                :class="vProfile.category === 'private' ? 'border-tesla-red' : 'border-transparent'">
                <input type="radio" v-model="vProfile.category" value="private" class="accent-tesla-red" />
                <div>
                  <p class="font-medium text-sm">🏠 Privatfahrzeug</p>
                  <p class="text-xs text-gray-400">Nur Privatfahrten, kein Fahrtenbuch nötig</p>
                </div>
              </label>
              <label class="flex-1 flex items-center gap-2 bg-gray-700 rounded-xl p-3 cursor-pointer border-2 transition"
                :class="vProfile.category === 'company' ? 'border-tesla-red' : 'border-transparent'">
                <input type="radio" v-model="vProfile.category" value="company" class="accent-tesla-red" />
                <div>
                  <p class="font-medium text-sm flex items-center gap-1.5">
                    <AppIcon name="wallet" :size="14" class="text-tesla-red" />
                    Dienstwagen
                  </p>
                  <p class="text-xs text-gray-400">Fahrtenbuch + Kostenabrechnung aktiv</p>
                </div>
              </label>
            </div>
          </div>
          <div v-if="vProfile.category === 'company'" class="col-span-2">
            <label class="label">Firmenname (Arbeitgeber)</label>
            <input v-model="vProfile.company_name" type="text" class="input" placeholder="Musterfirma AG" />
          </div>
          <div>
            <label class="label">Kennzeichen</label>
            <input v-model="vProfile.license_plate" type="text" class="input" placeholder="MU-TC 1337E"
              v-tooltip="'Amtliches Kennzeichen – wird auf dem Dashboard angezeigt. Format: Stadt-Buchstaben Zahl'" />
          </div>
          <div>
            <label class="label">Modell</label>
            <select v-model="vProfile.model" class="input"
              v-tooltip="'Tesla-Modell – bestimmt die Fahrzeugsilhouette in der Darstellung'">
              <option value="ms">Model S</option>
              <option value="mx">Model X</option>
              <option value="m3">Model 3</option>
              <option value="my">Model Y</option>
              <option value="ct">Cybertruck</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="label">Farbe</label>
            <select v-model="vProfile.image_color" class="input"
              v-tooltip="'Lackfarbe – Tesla-Farbcode für die korrekte Abbildung des Fahrzeugs'">
              <option value="PPSW">Pearl White Multi-Coat</option>
              <option value="PMNG">Midnight Silver Metallic</option>
              <option value="PBSB">Obsidian Black Metallic</option>
              <option value="PPMR">Ultra Red</option>
              <option value="PPSB">Deep Blue Metallic</option>
              <option value="PPW">Solid White</option>
            </select>
          </div>
        </div>
        <!-- ABRP-Integration -->
        <div class="col-span-2 border-t border-gray-700 pt-3 space-y-3">
          <p class="text-sm font-medium text-gray-300 flex items-center gap-2">
            <AppIcon name="map" :size="16" class="text-tesla-red" />
            A Better Route Planner (ABRP)
            <InfoTip :text="$t('settings.abrp.sectionTip')" />
          </p>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="label">{{ $t('settings.abrp.tokenLabel') }}</label>
              <input v-model="vProfile.abrp_token" type="password" class="input"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                v-tooltip="$t('settings.abrp.tokenTooltip')" />
              <p class="text-xs text-gray-500 mt-1">{{ $t('settings.abrp.tokenHint') }}</p>
            </div>
            <div v-if="vProfile.abrp_token" class="text-xs text-green-400 flex items-center gap-1.5">
              <AppIcon name="check" :size="13" />
              {{ $t('settings.abrp.activeHint') }}
            </div>
          </div>
        </div>

        <!-- Monta-Konfiguration (nur Dienstwagen) -->
        <div v-if="vProfile.category === 'company'" class="col-span-2 border-t border-gray-700 pt-3 space-y-3">
          <p class="text-sm font-medium text-gray-300">Heimladen / Monta-Konfiguration</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Strompreis Wallbox (€/kWh)</label>
              <input v-model.number="vProfile.electricity_rate_kwh" type="number" step="0.01" min="0" max="5" class="input" placeholder="0.30" />
            </div>
            <div>
              <label class="label">Monta Charge-Point-ID</label>
              <input v-model="vProfile.monta_charge_point_id" type="text" class="input" placeholder="cp_12345" />
            </div>
            <div>
              <label class="label">Monta Client ID</label>
              <input v-model="vProfile.monta_client_id" type="text" class="input" placeholder="90026e8a-…" />
              <p class="text-xs text-gray-500 mt-1">Partner API: Hub → Anwendung → Client ID</p>
            </div>
            <div>
              <label class="label">Monta Client Secret</label>
              <input v-model="vProfile.monta_api_key" type="password" class="input" placeholder="2cde9e96-…" />
              <p class="text-xs text-gray-500 mt-1">Partner API: Hub → Anwendung → Client Secret</p>
            </div>
          </div>
        </div>
        <p v-if="vMsg" :class="vOk ? 'text-green-400' : 'text-red-400'" class="text-sm">{{ vMsg }}</p>
        <button @click="saveVehicle" class="btn-primary text-sm"
          v-tooltip="auth.canEditVehicles
            ? 'Fahrzeugprofil speichern – Änderungen werden sofort auf dem Dashboard sichtbar'
            : 'Du hast keine Berechtigung, Fahrzeug-Grunddaten zu aendern.'">
          Speichern
        </button>
      </div>
      <p v-else class="text-gray-400 text-sm">Kein Fahrzeug verbunden.</p>
      </fieldset>
    </div>

    <!-- Strompreis-API (Admin-only) -->
    <div v-if="auth.isAdmin" class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2" v-tooltip="'Mit dynamischem Stromtarif (Tibber, aWattar, EPEX) das Lade-Fenster automatisch optimieren. Die App holt stuendliche Preise und schlaegt das guenstigste 4h-Fenster vor — bzw. setzt es auf Wunsch direkt im Auto.'">
        <AppIcon name="wallet" :size="20" class="text-tesla-red" />
        Strompreis-API (dynamischer Tarif)
      </h2>
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
            v-tooltip="'Pauschaler Aufschlag fuer Steuern, Netzentgelte und Vertriebsmarge. aWattar liefert reinen Spotpreis — viele Tarife wie aWattar HOURLY rechnen z.B. ~5–8 ct/kWh dazu.'" />
        </div>
        <div v-if="tariffCfg.provider === 'tibber'" class="sm:col-span-2">
          <label class="text-xs text-gray-400 block mb-0.5">Tibber API-Token</label>
          <input v-model="tariffCfg.token" type="password"
            :placeholder="tariffCfg.token_configured ? '••••••••• (konfiguriert)' : 'Token aus Tibber Developer-Portal'"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white font-mono"
            v-tooltip="'Token unter developer.tibber.com erstellen. Wird verschluesselt gespeichert; nach dem Speichern nur noch Marker zur Existenz sichtbar.'" />
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button @click="saveTariffConfig" class="btn-primary text-sm">Speichern</button>
        <span v-if="tariffMsg" :class="tariffMsg.ok ? 'text-green-400 text-xs' : 'text-red-400 text-xs'">{{ tariffMsg.text }}</span>
      </div>
    </div>

    <!-- Wartungsintervalle ist in das Betriebsbuch umgezogen — passt
         thematisch besser dort hin (Bezug zu Wartungs-Eintraegen). -->
    <div class="card space-y-2">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="tool" :size="20" class="text-tesla-red" />
        {{ $t('settings.serviceIntervalsTitle') }}
      </h2>
      <p class="text-sm text-gray-400">
        Die Verwaltung von Wartungsintervallen ist jetzt direkt im
        <RouterLink to="/logbook#service-intervals" class="text-tesla-red hover:underline">Betriebsbuch</RouterLink>
        — pro Fahrzeug, neben den Wartungs- und Inspektionseinträgen.
      </p>
    </div>

    <!-- Fahrerverwaltung -->
    <div class="card space-y-4">
      <h2 class="font-semibold" v-tooltip="'Fahrer anlegen und benennen – werden bei Fahrten zugewiesen und in der Auswertung angezeigt.'">
        👤 Fahrer &amp; Profile
      </h2>

      <div class="space-y-2">
        <div v-for="d in drivers" :key="d.id"
          class="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2">
          <!-- Farbpunkt wählbar -->
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

          <!-- Name -->
          <input :value="d.name"
            @change="e => saveDriverName(d, e.target.value)"
            class="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-gray-500 py-0.5 min-w-0"
            :placeholder="'Name'" />

          <!-- Default-Badge -->
          <button @click="setDefaultDriver(d)"
            class="text-xs px-2 py-0.5 rounded-full transition flex-shrink-0"
            :class="d.is_default ? 'bg-tesla-red text-white' : 'bg-gray-700 text-gray-400 hover:text-white'"
            v-tooltip="d.is_default ? 'Standard-Fahrer – wird bei neuen Fahrten auto-zugewiesen' : 'Als Standard-Fahrer setzen'">
            {{ d.is_default ? '★ Standard' : '☆ Standard' }}
          </button>

          <!-- Löschen -->
          <button @click="deleteDriver(d)"
            class="text-gray-600 hover:text-red-400 transition text-sm flex-shrink-0"
            v-tooltip="'Fahrer löschen – bestehende Fahrten werden auf Kein Fahrer gesetzt'">✕</button>
        </div>
        <p v-if="!drivers.length" class="text-gray-500 text-sm">Noch keine Fahrer angelegt.</p>
      </div>

      <!-- Neuen Fahrer -->
      <div class="flex gap-2">
        <input v-model="newDriverName" type="text" placeholder="Name (z.B. Sven)"
          class="flex-1 bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-tesla-red"
          @keyup.enter="addDriver" />
        <button @click="addDriver" :disabled="!newDriverName.trim()" class="btn-primary text-sm">
          + Hinzufügen
        </button>
      </div>
      <p v-if="driverMsg" class="text-sm" :class="driverOk ? 'text-green-400' : 'text-red-400'">{{ driverMsg }}</p>
    </div>

    <div class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2"
        v-tooltip="'Zwei-Faktor-Authentifizierung schützt dein Konto: auch wenn dein Passwort gestohlen wird, kann sich niemand ohne deinen zweiten Faktor anmelden.'">
        <AppIcon name="lock" :size="20" class="text-tesla-red" />
        {{ $t('settings.mfaTitle') }}
      </h2>
      <div v-if="mfaStatus.mfaEnabled" class="space-y-3">
        <div class="flex items-center gap-2 text-green-400">
          <span>✓</span><span class="text-sm">MFA ist aktiviert</span>
        </div>
        <p class="text-sm text-gray-400"
          v-tooltip="'Backup-Codes sind Einmal-Codes für den Notfall, falls du keinen Zugriff auf deine Authenticator-App hast (z.B. Handy verloren). Bei wenigen verbleibenden Codes solltest du MFA neu einrichten.'">
          Noch verwendbare Backup-Codes: <strong>{{ mfaStatus.unusedBackupCodes }}</strong>
        </p>
        <div v-if="!showDisableForm">
          <button @click="showDisableForm = true" class="btn-secondary text-sm"
            v-tooltip="'MFA komplett entfernen – dein Konto ist danach nur durch das Passwort geschützt. Nicht empfohlen.'">
            MFA deaktivieren
          </button>
        </div>
        <div v-else class="space-y-2">
          <p class="text-sm text-gray-400">Passwort zur Bestaetigung eingeben:</p>
          <input v-model="disablePassword" type="password"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
          <div v-if="disableError" class="text-red-400 text-sm">{{ disableError }}</div>
          <div class="flex gap-2">
            <button @click="disableMfa" class="btn-primary text-sm">Bestaetigen</button>
            <button @click="showDisableForm = false" class="btn-secondary text-sm">Abbrechen</button>
          </div>
        </div>
      </div>
      <div v-else class="space-y-2">
        <p class="text-sm text-gray-400">MFA ist nicht aktiviert. Aktiviere es fuer mehr Sicherheit.</p>
        <RouterLink to="/mfa/setup" class="btn-primary inline-block text-sm"
          v-tooltip="'Richtet MFA in 3 Schritten ein: QR-Code mit Authenticator-App scannen, Code bestätigen, Backup-Codes sichern. Dauert ca. 1 Minute.'">
          MFA aktivieren
        </RouterLink>
      </div>
    </div>

    <!-- Passkey -->
    <div class="card space-y-3">
      <button class="w-full flex items-center justify-between group"
        @click="togglePasskeys" v-tooltip="$t('settings.passkeyTooltip')">
        <h2 class="font-semibold flex items-center gap-2">
          {{ $t('settings.passkey') }}
          <span v-if="passkeys.length" class="text-xs text-gray-500 font-normal">({{ passkeys.length }})</span>
        </h2>
        <span class="text-gray-500 group-hover:text-white transition text-sm">{{ collapsed.passkeys ? '▸' : '▾' }}</span>
      </button>
      <div v-show="!collapsed.passkeys">
        <p class="text-sm text-gray-400 mb-2">{{ $t('settings.passkeyDesc') }}</p>
        <div v-if="passkeys.length" class="space-y-2 mb-2">
          <div v-for="pk in passkeys" :key="pk.id"
            class="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
            <div>
              <p class="text-sm font-medium text-white">{{ pk.device_type || $t('settings.passkeyDevice') }}</p>
              <p class="text-xs text-gray-500">{{ $t('settings.passkeyAdded') }} {{ fmtDate(pk.created_at) }}</p>
            </div>
            <button @click="removePasskey(pk.id)"
              class="text-xs text-gray-500 hover:text-red-400 transition">{{ $t('settings.passkeyRemove') }}</button>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 mb-2">{{ $t('settings.passkeyNone') }}</p>
        <div v-if="passkeyError"   class="text-red-400 text-sm mb-1">{{ passkeyError }}</div>
        <div v-if="passkeySuccess" class="text-green-400 text-sm mb-1">{{ passkeySuccess }}</div>
        <div class="flex flex-wrap gap-2">
          <button @click="addPasskey" :disabled="passkeyRegistering"
            class="btn-secondary text-sm"
            v-tooltip="$t('settings.passkeyAddTooltip')">
            {{ passkeyRegistering ? $t('settings.passkeyAdding') : $t('settings.passkeyAdd') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Geofences fuer Auto-Klassifikation Privat / Arbeitsweg / Dienst -->
    <div v-if="appStore.selectedVehicle" class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="pin" :size="20" class="text-tesla-red" />
        {{ $t('settings.geofenceTitle') }}
      </h2>
      <GeofenceManager />
    </div>

    <!-- GPS-Fuzzing-Modus (Admin) -->
    <div v-if="auth.isAdmin" class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="lock" :size="20" class="text-tesla-red" />
        {{ $t('settings.gpsFuzzingTitle') }}
      </h2>
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
    </div>

    <!-- Tesla Verbindung -->
    <div class="card space-y-4">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="bolt" :size="20" class="text-tesla-red" />
        {{ $t('settings.teslaConnectionTitle') }}
      </h2>

      <!-- Strategie-Erklaerung: Telemetry-first, Polling als Fallback. -->
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
            ? 'Alle Fahrzeuge des Tesla-Accounts abrufen und in die App übernehmen. Nützlich wenn ein neues Fahrzeug zum Account hinzugefügt wurde.'
            : 'Du hast keine Berechtigung, neue Fahrzeuge anzulegen. Bitte wende dich an einen Administrator.'">
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
          <p class="text-xs text-gray-500">Tesla-App zeigt "Drittanbieter-Schlüssel hinzufügen" → Allow tippen. Danach funktionieren alle Steuerbefehle.</p>
        </div>
      </div>

      <!-- Fleet Telemetrie: Live-GPS + Fahrdaten via WebSocket vom Auto. -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <div>
          <p class="font-medium text-sm flex items-center gap-2">
            <AppIcon name="pulse" :size="16" class="text-tesla-red" />
            {{ $t('settings.telemetryHeader') }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">{{ $t('settings.telemetryIntro') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button @click="registerPartner" :disabled="partnerBusy"
            class="btn-secondary text-sm">
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

        <!-- Status pro VIN — Live-Dot, Aktion, Letztes Signal. -->
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
    </div>

    <!-- Outbound-Webhooks (Admin) -->
    <div v-if="auth.isAdmin" class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="alert" :size="20" class="text-tesla-red" />
        {{ $t('settings.webhooksTitle') }}
      </h2>
      <WebhookManager />
    </div>

    <div class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2">
        <AppIcon name="lock" :size="20" class="text-tesla-red" />
        {{ $t('settings.passwordChangeTitle') }}
      </h2>
      <div class="space-y-2">
        <input v-model="pw.current" type="password" placeholder="Aktuelles Passwort"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Dein bisheriges Passwort – zur Bestätigung deiner Identität'" />
        <input v-model="pw.next" type="password" placeholder="Neues Passwort (mind. 12 Zeichen)"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Mindestens 12 Zeichen. Empfohlen: Passphrase aus 4+ zufaelligen Woertern – ist sicherer als kurze, komplexe Passwoerter.'" />
        <input v-model="pw.confirm" type="password" placeholder="Neues Passwort wiederholen"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Bitte das neue Passwort zur Sicherheit erneut eingeben'" />
        <div v-if="pwError" class="text-red-400 text-sm">{{ pwError }}</div>
        <div v-if="pwSuccess" class="text-green-400 text-sm">{{ pwSuccess }}</div>
        <button @click="changePassword" class="btn-primary text-sm">Passwort ändern</button>
      </div>
    </div>

    <div class="card space-y-3">
      <button class="w-full flex items-center justify-between" @click="toggleAudit">
        <h2 class="font-semibold">
          📝 Letzte Aktivitaeten
          <span v-if="auditLog.length" class="text-xs text-gray-500 font-normal ml-1">({{ auditLog.length }})</span>
        </h2>
        <span class="text-gray-400 text-xs">{{ collapsed.audit ? '[+]' : '[-]' }}</span>
      </button>
      <div v-show="!collapsed.audit" class="space-y-1">
        <div v-for="e in auditLog" :key="e.created_at"
          class="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
          <span class="font-mono text-gray-300" v-tooltip="actionTooltip(e.action)">{{ e.action }}</span>
          <span class="text-gray-500" v-tooltip="'IP-Adresse: ' + (e.ip_address || 'unbekannt')">{{ fmtDate(e.created_at) }}</span>
        </div>
        <p v-if="!auditLog.length" class="text-gray-500 text-sm">Keine Eintraege</p>
      </div>
    </div>

    <!-- Design-Stil -->
    <div class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2"
        v-tooltip="'Optisches Erscheinungsbild der App — wird sofort live übernommen und lokal gespeichert. Jeder Benutzer kann seinen Stil unabhaengig waehlen.'">
        <AppIcon name="star" :size="20" class="text-tesla-red" />
        {{ $t('settings.designStyleTitle') }}
      </h2>
      <p class="text-xs text-gray-500">
        Vier komplette Design-Sprachen. Klick auf eine Karte → wird sofort live angewendet.
        Akzent-Farbe waehlst du weiter unten getrennt.
      </p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button v-for="d in DESIGNS" :key="d.key"
          @click="themeStore.setDesign(d.key)"
          class="design-preview text-left"
          :class="[
            `design-preview--${d.key}`,
            themeStore.designKey === d.key ? 'design-preview--active' : '',
          ]">
          <!-- Miniatur-Vorschau pro Stil. Statt nur Text geben wir
               eine kleine Karten-Andeutung — der User sieht direkt
               wie der Look wird. -->
          <div class="design-preview__inner">
            <div class="design-preview__chip"></div>
            <div class="design-preview__bar"></div>
            <div class="design-preview__bar design-preview__bar--short"></div>
          </div>
          <div class="design-preview__label">
            <span class="block text-sm font-semibold flex items-center gap-1">
              <span>{{ d.icon }}</span> {{ d.label }}
              <span v-if="themeStore.designKey === d.key" class="text-tesla-red ml-auto">✓</span>
            </span>
            <span class="block text-xs text-gray-400 mt-0.5">{{ d.tagline }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Farbschema -->
    <div class="card space-y-3">
      <h2 class="font-semibold"
        v-tooltip="'Akzentfarbe der Benutzeroberfläche – Schaltflächen, aktive Navigationspunkte und Fokus-Rahmen. Kombinierbar mit jedem Design-Stil.'">
        🎨 Akzentfarbe
      </h2>
      <p class="text-xs text-gray-500">Akzentfarbe für Schaltflächen und Navigation. Wird lokal gespeichert.</p>
      <div class="flex flex-wrap gap-3">
        <button v-for="t in THEMES" :key="t.key"
          @click="themeStore.apply(t.key)"
          class="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm transition"
          :class="themeStore.activeKey === t.key
            ? 'border-white text-white'
            : 'border-gray-700 text-gray-400 hover:border-gray-500'"
          :style="themeStore.activeKey === t.key ? { backgroundColor: t.accent } : {}">
          <span class="w-4 h-4 rounded-full flex-shrink-0" :style="{ backgroundColor: t.accent }"></span>
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Navigation anpassen -->
    <div class="card space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold"
          v-tooltip="'Reihenfolge und Sichtbarkeit der Navigationspunkte individuell anpassen. Änderungen werden lokal gespeichert.'">
          🧭 Navigationsleiste anpassen
        </h2>
        <button @click="navStore.reset()" class="text-xs text-gray-500 hover:text-gray-300 transition"
          v-tooltip="'Reihenfolge und Sichtbarkeit auf Standardwerte zurücksetzen'">
          Zurücksetzen
        </button>
      </div>
      <p class="text-xs text-gray-500">
        Reihenfolge mit ↑↓ ändern · Auge zum Ein-/Ausblenden ·
        Änderungen wirken auf Desktop-Dropdowns + Mobile-Strip, lokal gespeichert.
      </p>
      <!-- Items sind nach Gruppen-Zugehoerigkeit (Übersicht / Auswertung
           / Admin) farbig gerahmt, damit klar ist, wo sie in der Bar
           landen. Reihenfolge innerhalb der Gruppe wird respektiert. -->
      <div class="space-y-1">
        <div v-for="(link, idx) in navStore.allLinks" :key="link.key"
          class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800 transition border-l-2"
          :class="groupBorder(link.group)">
          <div class="flex flex-col gap-0.5">
            <button @click="navStore.moveUp(link.key)" :disabled="idx === 0"
              class="text-gray-500 hover:text-white disabled:opacity-20 leading-none text-xs transition">▲</button>
            <button @click="navStore.moveDown(link.key)" :disabled="idx === navStore.allLinks.length - 1"
              class="text-gray-500 hover:text-white disabled:opacity-20 leading-none text-xs transition">▼</button>
          </div>
          <span class="w-6 flex items-center justify-center"><AppIcon :name="link.icon" :size="18" /></span>
          <span class="flex-1 text-sm" :class="link.visible ? 'text-white' : 'text-gray-600 line-through'">
            {{ link.label }}
            <span class="text-[10px] uppercase tracking-wide text-gray-500 ml-1">{{ groupLabel(link.group) }}</span>
          </span>
          <button @click="navStore.toggleVisible(link.key)"
            v-tooltip="link.visible ? 'Ausblenden' : 'Einblenden'"
            class="text-lg leading-none transition"
            :class="link.visible ? 'text-gray-400 hover:text-white' : 'text-gray-700 hover:text-gray-400'">
            {{ link.visible ? '👁' : '🚫' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tesla API-Nutzung (admin only) -->
    <div v-if="auth.isAdmin" class="card space-y-3">
      <h2 class="font-semibold flex items-center gap-2"
        v-tooltip="'Tarife und Schwellwerte für die Tesla-Fleet-API-Nutzung – passt zur Tesla-Preisliste, kann jederzeit angepasst werden, sobald Tesla sie ändert.'">
        <AppIcon name="wallet" :size="20" class="text-tesla-red" />
        Tesla API-Nutzung
      </h2>

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
          <label for="hardstop" class="text-sm" v-tooltip="'Wenn aktiv: Tesla-API-Calls werden ab der Schwelle blockiert (HTTP 429), bis zur Monatswende oder Reset.'">
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
          v-tooltip="'Setzt die Zähler des laufenden Monats zurück – nur nach Tesla-Korrekturbuchung oder zur Behebung von Doppelzählungen sinnvoll.'">
          Aktuellen Monat zurücksetzen
        </button>
      </div>
    </div>

    <div class="card">
      <button @click="logout" class="text-red-400 hover:text-red-300 text-sm transition"
        v-tooltip="'Aktuelle Session beenden – du wirst zur Login-Seite weitergeleitet'">Abmelden</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import { useNavStore }   from '../store/nav.js';
import GeofenceManager from '../components/GeofenceManager.vue';
import AppIcon from '../components/AppIcon.vue';
import WebhookManager from '../components/WebhookManager.vue';
import { useThemeStore, THEMES, DESIGNS } from '../store/theme.js';
import { useLangStore, LANGS } from '../store/lang.js';

const auth     = useAuthStore();
const appStore = useAppStore();
const navStore = useNavStore();

function launchWizard() {
  if (typeof window.__launchWizard === 'function') window.__launchWizard();
}
const { t, locale } = useI18n();

// Tesla-Handbuch-URL basierend auf Fahrzeugmodell + Sprache
const teslaManualUrl = computed(() => {
  const model = appStore.selectedVehicle?.model;
  if (!model) return null;
  const modelMap = { m3: 'model3', my: 'modely', ms: 'models', mx: 'modelx', ct: 'cybertruck', semi: 'semi' };
  const localeMap = { de: 'de_eu', en: 'en_eu', fr: 'fr_eu', es: 'es_eu', tr: 'tr_eu', el: 'el_eu' };
  const urlModel  = modelMap[model];
  if (!urlModel) return null;
  const urlLocale = localeMap[locale.value] ?? 'en_eu';
  return `https://www.tesla.com/ownersmanual/${urlModel}/${urlLocale}/`;
});

// Group-Labels + farbige Markierung im Customization-UI — gleiche
// Gruppen-IDs wie die NavBar-Dropdowns ('overview', 'analytics',
// 'admin'). Border-Color macht visuell klar, wo das Item landet.
const GROUP_LABELS = { overview: 'Übersicht', analytics: 'Auswertung', admin: 'Admin' };
const groupLabel  = id => GROUP_LABELS[id] || id;
const groupBorder = id => ({
  overview:  'border-blue-500/40',
  analytics: 'border-green-500/40',
  admin:     'border-red-500/40',
}[id] || 'border-gray-700');
const themeStore = useThemeStore();
const langStore  = useLangStore();
const router     = useRouter();

// ── Sprache (User) ──
const langSaved = ref(false);
async function onPickLang(code) {
  await langStore.setLang(code);
  langSaved.value = true;
  setTimeout(() => { langSaved.value = false; }, 1500);
}

// ── Mandanten-Standardsprache (Admin) ──
const tenantDefaultLocale = ref('de');
const tenantSaved         = ref(false);
const tenantSaving        = ref(false);
async function loadTenantDefaultLocale() {
  if (!auth.isAdmin) return;
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
  } catch { /* ignore – server validates */ }
  finally { tenantSaving.value = false; }
}

// ── Mandanten-Pseudonym (Login-Identifier, Admin) ──
const tenantPseudonym        = ref('');
const tenantPseudonymHistory = ref([]);
const confirmRegeneratePseudonym = ref(false);
const regeneratingPseudonym  = ref(false);
const regenerateError        = ref('');

async function loadTenantPseudonym() {
  if (!auth.isAdmin || !auth.tenantId) return;
  try {
    const { data } = await api.get(`/system/tenants/${auth.tenantId}`);
    tenantPseudonym.value        = data.pseudonym || '';
    tenantPseudonymHistory.value = data.pseudonymHistory || [];
  } catch { /* admin endpoint nicht erreichbar — Anzeige bleibt leer */ }
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

// Fahrerverwaltung
const DRIVER_COLORS = [
  '#6b7280','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#a855f7','#ec4899',
];
const drivers      = ref([]);
const newDriverName = ref('');
const driverMsg    = ref('');
const driverOk     = ref(false);
const editingColor = ref(null);

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
  const newDefault = driver.is_default ? 0 : 1;
  await api.patch(`/drivers/${driver.id}`, { is_default: newDefault });
  await loadDrivers();
}

async function deleteDriver(driver) {
  if (!confirm(`Fahrer "${driver.name}" löschen? Bestehende Fahrten werden auf "kein Fahrer" gesetzt.`)) return;
  await api.delete(`/drivers/${driver.id}`);
  await loadDrivers();
}

const teslaConnected  = ref(false);
const virtualKeyHost  = window.location.hostname;
const syncingVehicles  = ref(false);
const syncMsg          = ref('');
const syncOk           = ref(false);
const telemetryBusyFor = ref(null);          // VIN gerade in Bearbeitung
const telemetryStatus  = ref({ vehicles: [] });
const partnerBusy      = ref(false);
const partnerResult    = ref(null);

async function registerPartner() {
  partnerBusy.value = true;
  partnerResult.value = null;
  try {
    await api.post('/fleet/partner/register');
    partnerResult.value = { ok: true };
    await loadTelemetryStatus();
  } catch (err) {
    partnerResult.value = { ok: false, error: err.response?.data?.error ?? err.message };
  } finally {
    partnerBusy.value = false;
  }
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

// Status-Label kommt aus i18n — die Map merkt sich nur den Key.
const TELEMETRY_KEYS = {
  streaming:        'settings.telemetryStatusStreaming',
  registered_idle:  'settings.telemetryStatusIdle',
  not_registered:   'settings.telemetryStatusNotReg',
  approval_missing: 'settings.telemetryStatusApproval',
  error:            'settings.telemetryStatusError',
};
const telemetryStatusLabel = s => TELEMETRY_KEYS[s] ? t(TELEMETRY_KEYS[s]) : s;
const telemetryDotClass    = s => ({
  streaming:        'text-green-400',
  registered_idle:  'text-yellow-400',
  not_registered:   'text-red-400',
  approval_missing: 'text-gray-500',
  error:            'text-red-400',
}[s] || 'text-gray-400');
const telemetryTextClass = s => ({
  streaming:        'text-green-300',
  registered_idle:  'text-yellow-200',
  not_registered:   'text-red-200',
  approval_missing: 'text-gray-400',
  error:            'text-red-200',
}[s] || 'text-gray-300');

/** Relative Zeitangabe „vor 3 min" / „vor 2h" — fuer last_signal_at-Anzeige. */
function relativeAgo(ts) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (diff < 60)       return `vor ${diff}s`;
  if (diff < 3600)     return `vor ${Math.floor(diff / 60)} min`;
  if (diff < 86400)    return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

const teslaAuthUrl = ref('');

async function prefetchTeslaAuthUrl() {
  try {
    const { data } = await api.get('/auth/tesla/auth-url');
    teslaAuthUrl.value = data.url;
  } catch { /* ignorieren */ }
}

function teslaReconnect() {
  if (!teslaAuthUrl.value) return;

  // Synchron öffnen – kein await, Browser blockt das nicht
  const popup = window.open(teslaAuthUrl.value, 'tesla_oauth', 'width=600,height=700,scrollbars=yes');
  teslaAuthUrl.value = ''; // einmalig verbrauchen, danach neu laden

  const onMessage = (event) => {
    if (event.data?.type !== 'tesla_connected') return;
    window.removeEventListener('message', onMessage);
    clearInterval(timer);
    try { popup?.close(); } catch { /* ignorieren */ }
    teslaConnected.value = true;
    syncMsg.value = 'Tesla erfolgreich verbunden ✓';
    syncOk.value = true;
    prefetchTeslaAuthUrl(); // für nächstes Mal neu laden
  };
  window.addEventListener('message', onMessage);

  const timer = setInterval(() => {
    if (popup?.closed) {
      clearInterval(timer);
      window.removeEventListener('message', onMessage);
      prefetchTeslaAuthUrl();
    }
  }, 500);
}

async function syncVehicles() {
  syncingVehicles.value = true;
  syncMsg.value = '';
  try {
    const { data } = await api.post('/vehicles/sync');
    syncOk.value  = true;
    syncMsg.value = `${data.synced} Fahrzeug(e) synchronisiert`;
    // App-Store aktualisieren
    appStore.vehicles = data.vehicles;
    if (!appStore.selectedVehicleId && data.vehicles.length) {
      appStore.selectedVehicleId = data.vehicles[0].id;
    }
  } catch (err) {
    syncOk.value  = false;
    syncMsg.value = err.response?.data?.error ?? 'Synchronisierung fehlgeschlagen';
  } finally {
    syncingVehicles.value = false;
  }
}

// Vehicle profile
const vProfile = ref({ license_plate: '', model: 'm3', image_color: 'PPSW', category: 'private', company_name: '', electricity_rate_kwh: 0.30, monta_client_id: '', monta_api_key: '', monta_charge_point_id: '', abrp_token: '' });
const vMsg = ref('');
const vOk  = ref(false);

/** Liefert true, wenn der Tesla-API-Sync option_codes mitgebracht hat —
 *  dann zeigt das Compositor-Bild Farbe, Felgen, Spoiler, Trim usw.
 *  exakt wie das echte Auto. Ohne option_codes muessen wir auf manuelle
 *  Farb-/Modell-Auswahl zurueckfallen (das alte Verhalten). */
const hasOptionCodes = computed(() => {
  return !!appStore.selectedVehicle?.option_codes;
});

// Mapping der semantischen vehicle_config-Felder auf Tesla-Compositor-Codes.
// Tesla liefert fuer Juniper-VINs (XP7…) keinen kompletten option_codes-String
// mehr, sondern nur die strukturierten Einzelfelder (wheel_type,
// exterior_color, spoiler_type). Ohne dieses Mapping landete das Bild
// ohne Felgen/Lack im Compositor-Fallback.
//
// Codes sind gegen static-assets.tesla.com/configurator/compositor verifiziert
// (groessere Antwort-Bytes = Compositor rendert das Detail, identische
// Antwort-Bytes wie ohne Code = der Code wird ignoriert).
const WHEEL_CODE_MAP = {
  UberTurbine21Black: 'WY21P',  // 21" Ueberturbine schwarz (Performance Y)
  UberTurbine21:      'WY21P',
  Induction20:        'WY20P',  // 20" Induction (Long Range Y)
  Gemini19:           'WY19B',  // 19" Gemini (Basis Y Juniper)
  Apollo19:           'WY19B',
};
const COLOR_CODE_MAP = {
  PearlWhite:     'PPSW',
  MidnightSilver: 'PMNG',
  DeepBlue:       'PPSB',
  RedMulticoat:   'PPMR',
  SolidBlack:     'PBSB',
  UltraRed:       'PR01',
  StealthGrey:    'PMNG',
  Quicksilver:    'PQSI',
};
const SPOILER_CODE_MAP = {
  Passive: 'SPTP',
  Active:  'SPTA',
};

/** Baut aus den Einzelfeldern eine Tesla-Compositor-Options-Liste, wenn
 *  option_codes fehlt. Unbekannte Werte werden uebersprungen, damit der
 *  Compositor sie nicht stillschweigend ignorieren muss. */
function buildFallbackOptionCodes(v) {
  const codes = ['MDLY']; // Basis-Modelltag fuer Y; Compositor braucht das Modell-Token
  const w = WHEEL_CODE_MAP[v.wheel_type];
  const c = COLOR_CODE_MAP[v.exterior_color];
  const s = SPOILER_CODE_MAP[v.spoiler_type];
  if (w) codes.push(w);
  if (c) codes.push(c);
  if (s) codes.push(s);
  return codes.join(',');
}

const vehicleImageUrl = computed(() => {
  const v = appStore.selectedVehicle;
  if (!v) return '';
  const model = vProfile.value.model || 'my';

  // Bevorzugter Pfad: vollstaendige Werks-Option-Codes aus Tesla API.
  // Beispiel: 'MDLY,PPSW,W41B,IPMB,SLR1,SC04,…' → komplettes Compositor-
  // Rendering mit Felgen, Spoiler, Innenraum, Trim. Der Aufrufer kann
  // trotzdem image_color als zusaetzlichen Override mitgeben — wir
  // haengen es einfach hinten an, der Compositor nimmt den letzten
  // Wert pro Slot.
  //
  // Fallback fuer Juniper-Fahrzeuge: aus wheel_type/exterior_color/
  // spoiler_type eine Options-Liste konstruieren, sonst rendert der
  // Compositor das Auto ohne Felgen.
  const codes = [];
  if (v.option_codes) codes.push(v.option_codes);
  else                codes.push(buildFallbackOptionCodes(v));
  // Manuelle Farbwahl als Override — laesst den Admin gezielt eine andere
  // Farbe sehen ohne option_codes neu zu holen.
  if (vProfile.value.image_color) codes.push(vProfile.value.image_color);

  const optionsParam = codes.filter(Boolean).join(',') || 'PPSW';
  return `https://static-assets.tesla.com/configurator/compositor?&options=${optionsParam}&view=STUD_3QTR&model=${model}&size=400`;
});

/** Loest einen Tesla-API-Call zu /api/vehicles/:id/status aus — damit
 *  laeuft der Poller-Code-Pfad einmalig und schreibt option_codes +
 *  vehicle_config in die DB. Setzt dann appStore.selectedVehicle frisch,
 *  damit das Bild sofort neu berechnet wird. */
async function refreshVehicleOptions() {
  const v = appStore.selectedVehicle;
  if (!v) return;
  try {
    await api.get(`/vehicles/${v.id}/status`);
    // Vehicles aus dem Store neu laden, damit option_codes ankommen
    await appStore.loadVehicles();
    vMsg.value = '✓ Werks-Optionen aktualisiert';
    vOk.value = true;
  } catch (e) {
    const code = e.response?.status;
    if (code === 503) vMsg.value = 'Auto offline — sobald es wieder online ist, holt der Poller die Daten automatisch.';
    else if (code === 401 || code === 403) vMsg.value = 'Tesla-Verbindung abgelaufen — bitte oben neu verbinden.';
    else vMsg.value = e.response?.data?.error ?? 'Fehler beim Abruf';
  }
}

async function saveVehicle() {
  vMsg.value = ''; vOk.value = false;
  const v = appStore.selectedVehicle;
  if (!v) return;
  try {
    const { data } = await api.put(`/vehicles/${v.id}`, vProfile.value);
    Object.assign(v, data);
    vMsg.value = 'Fahrzeugprofil gespeichert ✓';
    vOk.value = true;
  } catch (e) {
    vMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern';
  }
}

// Zugeklappte Sektionen — Letzte Aktivitäten standardmäßig zu
const collapsed = ref({ audit: true, mfa: false, passkeys: false, password: false });
function toggleAudit()    { collapsed.value.audit    = !collapsed.value.audit; }
function togglePassword() { collapsed.value.password = !collapsed.value.password; }
function togglePasskeys() { collapsed.value.passkeys = !collapsed.value.passkeys; }

const mfaStatus       = ref({ mfaEnabled: false, unusedBackupCodes: 0 });
const showDisableForm = ref(false);
const disablePassword = ref('');
const disableError    = ref('');
const pw              = ref({ current: '', next: '', confirm: '' });
const pwError         = ref('');
const pwSuccess       = ref('');
const auditLog        = ref([]);

const passkeys          = ref([]);
const passkeyRegistering = ref(false);
const passkeyError      = ref('');
const passkeySuccess    = ref('');

async function loadPasskeys() {
  try {
    const { data } = await api.get('/passkey/credentials');
    passkeys.value = data;
  } catch { passkeys.value = []; }
}

async function addPasskey() {
  passkeyError.value = passkeySuccess.value = '';
  passkeyRegistering.value = true;
  try {
    const { startRegistration } = await import('@simplewebauthn/browser');
    const { data: opts } = await api.post('/passkey/register-options');
    const response   = await startRegistration(opts);
    const ua         = navigator.userAgent;
    const deviceName = /iPhone|iPad/.test(ua) ? 'iPhone/iPad'
                     : /Mac/.test(ua)          ? 'Mac'
                     : /Android/.test(ua)      ? 'Android'
                     : /Windows/.test(ua)      ? 'Windows'
                     : 'Gerät';
    await api.post('/passkey/register-verify', { challengeId: opts.challengeId, response, deviceName });
    passkeySuccess.value = 'Passkey erfolgreich registriert';
    await loadPasskeys();
  } catch (err) {
    passkeyError.value = err.response?.data?.error ?? err.message ?? 'Fehler beim Registrieren';
  } finally {
    passkeyRegistering.value = false;
  }
}

async function removePasskey(id) {
  if (!confirm('Diesen Passkey wirklich entfernen?')) return;
  try {
    await api.delete(`/passkey/credentials/${id}`);
    passkeys.value = passkeys.value.filter(p => p.id !== id);
  } catch (err) {
    passkeyError.value = err.response?.data?.error ?? 'Fehler beim Entfernen';
  }
}

const fmtDate = ts => new Date(ts * 1000).toLocaleString('de-DE');

const actionTooltips = {
  login_success:     'Erfolgreiche Anmeldung',
  login_failed:      'Fehlgeschlagener Login-Versuch (falsches Passwort oder unbekannter Benutzer)',
  login_blocked:     'Login blockiert wegen zu vieler Fehlversuche',
  login_mfa_pending: 'Passwort akzeptiert, MFA-Code wurde angefordert',
  mfa_failed:        'MFA-Code war ungültig',
  mfa_enabled:       'Zwei-Faktor-Authentifizierung wurde aktiviert',
  mfa_disabled:      'Zwei-Faktor-Authentifizierung wurde deaktiviert',
  password_changed:  'Passwort wurde geändert',
  logout:            'Abmeldung',
};
const actionTooltip = a => actionTooltips[a] || a;

// ─── Strompreis-API (dynamischer Tarif) ─────────────────────────────
const tariffCfg = ref({
  provider: 'none', country: 'de', surcharge_ct: 0,
  token: '', token_configured: false,
});
const tariffMsg = ref(null);

async function loadTariffConfig() {
  if (!auth.isAdmin) return;
  try {
    const { data } = await api.get('/tariff/config');
    tariffCfg.value = { ...data, token: '' };
  } catch { /* nicht kritisch */ }
}

async function saveTariffConfig() {
  const payload = {
    provider:     tariffCfg.value.provider,
    country:      tariffCfg.value.country,
    surcharge_ct: +tariffCfg.value.surcharge_ct || 0,
  };
  // Token nur senden, wenn der User explizit was getippt hat — leer
  // bedeutet „lassen wie es ist", nicht „loeschen". Loeschen via separate
  // Aktion (Provider auf 'none' setzen) — vermeidet versehentliche
  // Token-Loeschung beim Speichern anderer Felder.
  if (tariffCfg.value.token && tariffCfg.value.token.length) {
    payload.token = tariffCfg.value.token;
  }
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

// Wartungsintervalle ist in das Betriebsbuch umgezogen — die Logik
// lebt jetzt in components/ServiceIntervalsCard.vue. Keine lokalen
// Refs / Funktionen mehr hier.

onMounted(async () => {
  loadDrivers();
  loadTenantDefaultLocale();
  loadTenantPseudonym();
  loadTariffConfig();
  loadTelemetryStatus();
  const [mfa, audit, teslaStatus] = await Promise.all([
    api.get('/mfa/status'),
    api.get('/users/me/audit'),
    api.get('/auth/tesla/status').catch(() => ({ data: { connected: false } })),
  ]);
  prefetchTeslaAuthUrl();
  loadPasskeys();
  mfaStatus.value      = mfa.data;
  auditLog.value       = audit.data;
  teslaConnected.value = teslaStatus.data.connected;

  const v = appStore.selectedVehicle;
  if (v) {
    vProfile.value = {
      license_plate:         v.license_plate         ?? '',
      model:                 v.model                 ?? 'm3',
      image_color:           v.image_color           ?? 'PPSW',
      category:              v.category              ?? 'private',
      company_name:          v.company_name          ?? '',
      electricity_rate_kwh:  v.electricity_rate_kwh  ?? 0.30,
      monta_client_id:       v.monta_client_id       ?? '',
      monta_api_key:         v.monta_api_key         ?? '',
      monta_charge_point_id: v.monta_charge_point_id ?? '',
      abrp_token:            v.abrp_token            ?? '',
    };
  }
});

// Wartungsintervalle sind pro Fahrzeug — beim Wechsel neu laden.
// Wartungsintervalle reagieren jetzt selbst in ServiceIntervalsCard.vue
// auf appStore.selectedVehicleId — hier nichts mehr zu tun.

async function disableMfa() {
  disableError.value = '';
  try {
    await api.post('/mfa/disable', { password: disablePassword.value });
    mfaStatus.value.mfaEnabled = false;
    showDisableForm.value = false;
  } catch (err) {
    disableError.value = err.response?.data?.error || 'Fehler';
  }
}

async function changePassword() {
  pwError.value = pwSuccess.value = '';
  if (pw.value.next !== pw.value.confirm) {
    pwError.value = 'Passwoerter stimmen nicht ueberein';
    return;
  }
  if (pw.value.next.length < 12) {
    pwError.value = 'Passwort muss mindestens 12 Zeichen lang sein';
    return;
  }
  try {
    await api.put('/users/me/password', {
      currentPassword: pw.value.current,
      newPassword: pw.value.next,
    });
    pwSuccess.value = 'Passwort erfolgreich geändert';
    pw.value = { current: '', next: '', confirm: '' };
  } catch (err) {
    pwError.value = err.response?.data?.error || 'Fehler beim Aendern';
  }
}

async function logout() {
  await auth.logout();
  router.push('/login');
}

// GPS-Fuzzing (admin) – Privacy-Schutz fuer Trip-Koordinaten
const gpsFuzzing    = ref({ enabled: false, radius_m: 200 });
const gpsFuzzingMsg = ref('');
const gpsFuzzingOk  = ref(false);

async function loadGpsFuzzing() {
  if (!auth.isAdmin) return;
  try {
    const { data } = await api.get('/system/tenant-settings/gps-fuzzing');
    gpsFuzzing.value = { enabled: !!data.enabled, radius_m: data.radius_m || 200 };
  } catch { /* ignore */ }
}

async function saveGpsFuzzing() {
  gpsFuzzingMsg.value = '';
  try {
    const radius = Math.max(50, Math.min(5000, +gpsFuzzing.value.radius_m || 200));
    const { data } = await api.put('/system/tenant-settings/gps-fuzzing', {
      enabled:  !!gpsFuzzing.value.enabled,
      radius_m: radius,
    });
    gpsFuzzing.value = { enabled: !!data.enabled, radius_m: data.radius_m };
    gpsFuzzingMsg.value = '✓ ' + t('settings.saved'); gpsFuzzingOk.value = true;
  } catch (err) {
    gpsFuzzingMsg.value = err.response?.data?.error || err.message;
    gpsFuzzingOk.value = false;
  }
  setTimeout(() => { gpsFuzzingMsg.value = ''; }, 2500);
}

// Tesla API-Nutzung (admin)
const usageCfg = ref(null);
const usageMsg = ref('');
const usageOk  = ref(false);

async function loadUsageConfig() {
  if (!auth.isAdmin) return;
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

loadUsageConfig();
loadGpsFuzzing();
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

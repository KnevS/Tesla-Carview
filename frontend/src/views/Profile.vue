<template>
  <div class="max-w-2xl space-y-6">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold">{{ $t('nav.profile.label', 'Mein Profil') }}</h1>
      <button @click="launchWizard"
        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-tesla-red/10 hover:bg-tesla-red/20 border border-tesla-red/30 text-tesla-red text-sm font-medium transition"
        v-tooltip="$t('wizard.launchHint')">
        <span>⚙️</span>
        {{ $t('wizard.launch') }}
      </button>
    </div>

    <!-- Sprache (User-Preference) -->
    <SortableSection
      :sortable="false"
      page-id="profile"
      section-id="language"
      :title="$t('settings.languageTitle')"
      icon="🌐"
      :collapsed="isCollapsed('language')"
      @toggle="toggle('language')"
    >
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
    </SortableSection>

    <!-- Vehicle profile -->
    <SortableSection
      :sortable="false"
      page-id="profile"
      section-id="vehicle"
      :title="$t('settings.vehicleProfileTitle')"
      icon="🚗"
      :collapsed="isCollapsed('vehicle')"
      @toggle="toggle('vehicle')"
    >
      <p v-if="!auth.canEditVehicles" class="text-xs text-yellow-300/80 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2">
        🔒 Nur lesbar — du hast aktuell keine Berechtigung, Fahrzeug-Grunddaten zu aendern.
        Bitte wende dich an einen Administrator, wenn du Aenderungen vornehmen moechtest.
      </p>
      <fieldset :disabled="!auth.canEditVehicles" class="contents">
      <div v-if="appStore.selectedVehicle" class="space-y-4">
        <div class="flex gap-4 items-center">
          <img :src="vehicleImageUrl" :alt="appStore.selectedVehicle.display_name"
            class="h-24 w-40 object-contain bg-gray-800 rounded-lg px-2"
            @error="e => e.target.style.opacity = '0.3'"
            v-tooltip="hasOptionCodes
              ? 'Vorschau basiert auf den echten Werks-Optionen deines Tesla (Farbe, Felgen, Spoiler, Trim)'
              : 'Vorschau basiert nur auf Modell + Farbe. Sobald der Tesla-Poller dein Auto erreicht, kommen Felgen + Trim automatisch dazu.'" />
          <button v-if="!hasOptionCodes && teslaConnectedStatus" @click="refreshVehicleOptions" type="button"
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

        <!-- Monta-Konfiguration (alle Fahrzeuge) -->
        <div class="col-span-2 border-t border-gray-700 pt-3 space-y-3">
          <p class="text-sm font-medium text-gray-300">Heimladen / Monta-Konfiguration</p>
          <!-- Hinweis für Privatfahrzeuge -->
          <p v-if="vProfile.category !== 'company'"
             class="text-xs text-blue-300/90 bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-2"
             v-tooltip="'Für Dienstwagen steht zusätzlich eine monatliche Kostenabrechnung zur Verfügung.'">
            ℹ️ Monta steht als Lade-Informationsquelle zur Verfügung. Die Kostenabrechnung ist Fahrzeugen der Kategorie <strong>Dienstwagen</strong> vorbehalten.
          </p>
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
    </SortableSection>

    <!-- MFA -->
    <SortableSection
      :sortable="false"
      page-id="profile"
      section-id="mfa"
      :title="$t('settings.mfaTitle')"
      icon="🔐"
      :collapsed="isCollapsed('mfa')"
      @toggle="toggle('mfa')"
    >
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
    </SortableSection>

    <!-- Passkey -->
    <SortableSection
      :sortable="false"
      page-id="profile"
      section-id="passkey"
      :title="$t('settings.passkey')"
      icon="🔑"
      :collapsed="isCollapsed('passkey')"
      @toggle="toggle('passkey')"
    >
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
    </SortableSection>

    <!-- Passwort ändern -->
    <SortableSection
      :sortable="false"
      page-id="profile"
      section-id="password"
      :title="$t('settings.passwordChangeTitle')"
      icon="🔒"
      :collapsed="isCollapsed('password')"
      @toggle="toggle('password')"
    >
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
    </SortableSection>

    <!-- Letzte Aktivitaeten -->
    <SortableSection
      :sortable="false"
      page-id="profile"
      section-id="audit"
      title="Letzte Aktivitaeten"
      icon="📝"
      :collapsed="isCollapsed('audit')"
      @toggle="toggle('audit')"
    >
      <div class="space-y-1">
        <div v-for="e in auditLog" :key="e.created_at"
          class="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
          <span class="font-mono text-gray-300" v-tooltip="actionTooltip(e.action)">{{ e.action }}</span>
          <span class="text-gray-500" v-tooltip="'IP-Adresse: ' + (e.ip_address || 'unbekannt')">{{ fmtDate(e.created_at) }}</span>
        </div>
        <p v-if="!auditLog.length" class="text-gray-500 text-sm">Keine Eintraege</p>
      </div>
    </SortableSection>

    <!-- Design-Stil -->
    <SortableSection
      :sortable="false"
      page-id="profile"
      section-id="appearance"
      :title="$t('settings.designStyleTitle')"
      icon="🎨"
      :collapsed="isCollapsed('appearance')"
      @toggle="toggle('appearance')"
    >
      <p class="text-xs text-gray-500">
        Vier komplette Design-Sprachen. Klick auf eine Karte → wird sofort live angewendet.
        Akzent-Farbe waehlst du weiter unten getrennt.
      </p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button v-for="d in DESIGNS" :key="d.key"
          @click="selectDesign(d.key)"
          class="design-preview text-left"
          :class="[
            `design-preview--${d.key}`,
            themeStore.designKey === d.key ? 'design-preview--active' : '',
          ]">
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

      <!-- Akzentfarbe -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <h3 class="font-medium text-sm"
          v-tooltip="'Akzentfarbe der Benutzeroberfläche – Schaltflächen, aktive Navigationspunkte und Fokus-Rahmen. Kombinierbar mit jedem Design-Stil.'">
          🎨 Akzentfarbe
        </h3>
        <p class="text-xs text-gray-500">Akzentfarbe für Schaltflächen und Navigation. Wird lokal gespeichert.</p>
        <div class="flex flex-wrap gap-3">
          <button v-for="t in THEMES" :key="t.key"
            @click="selectAccent(t.key)"
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
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-sm"
            v-tooltip="'Reihenfolge und Sichtbarkeit der Navigationspunkte individuell anpassen. Änderungen werden lokal gespeichert.'">
            🧭 Navigationsleiste anpassen
          </h3>
          <button @click="navStore.reset()" class="text-xs text-gray-500 hover:text-gray-300 transition"
            v-tooltip="'Reihenfolge und Sichtbarkeit auf Standardwerte zurücksetzen'">
            Zurücksetzen
          </button>
        </div>
        <p class="text-xs text-gray-500">
          Reihenfolge mit ↑↓ ändern · Auge zum Ein-/Ausblenden ·
          Änderungen wirken auf Desktop-Dropdowns + Mobile-Strip, lokal gespeichert.
        </p>
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
    </SortableSection>

    <!-- Benachrichtigungen -->
    <SortableSection
      page-id="profile" section-id="notifications"
      title="🔔 Benachrichtigungen" icon="🔔"
      :collapsed="isCollapsed('notifications')"
      @toggle="toggle('notifications')"
      @move="() => {}">
      <div class="space-y-6">
        <!-- Web Push -->
        <div class="space-y-3">
          <h4 class="font-semibold text-sm text-gray-200 flex items-center gap-2">
            📲 Browser-Push (Apple Watch, iPhone, Desktop)
            <InfoTip text="Web-Push-Nachrichten erscheinen auf deinem Gerät auch wenn die App nicht geöffnet ist. Auf iPhone/Apple Watch werden sie automatisch gespiegelt." />
          </h4>
          <div v-if="pushState === 'unsupported'" class="text-sm text-gray-500">
            Dein Browser unterstützt Web Push nicht.
          </div>
          <div v-else-if="pushState === 'denied'" class="text-sm text-yellow-400">
            Push-Benachrichtigungen im Browser blockiert. Bitte in den Browser-Einstellungen erlauben.
          </div>
          <div v-else class="flex items-center gap-3">
            <div v-if="pushSubscribed" class="flex items-center gap-2 text-sm text-green-400">
              <AppIcon name="check" :size="16" /> Aktiv auf diesem Gerät
            </div>
            <div v-else class="text-sm text-gray-400">Inaktiv auf diesem Gerät</div>
            <button v-if="!pushSubscribed" @click="subscribePush"
              :disabled="pushLoading"
              class="btn-primary text-xs px-3 py-1.5">
              {{ pushLoading ? 'Aktiviere…' : 'Aktivieren' }}
            </button>
            <button v-else @click="unsubscribePush"
              :disabled="pushLoading"
              class="btn-secondary text-xs px-3 py-1.5">
              {{ pushLoading ? 'Deaktiviere…' : 'Deaktivieren' }}
            </button>
            <button v-if="pushSubscribed" @click="testPush"
              class="btn-secondary text-xs px-3 py-1.5"
              v-tooltip="'Sendet sofort eine Test-Benachrichtigung auf dieses Gerät'">
              Test
            </button>
          </div>
          <p v-if="pushMsg" class="text-xs" :class="pushMsgErr ? 'text-red-400' : 'text-green-400'">{{ pushMsg }}</p>
        </div>

        <hr class="border-gray-700" />

        <!-- Telegram -->
        <div class="space-y-3">
          <h4 class="font-semibold text-sm text-gray-200 flex items-center gap-2">
            ✈️ Telegram Bot
            <InfoTip text="Erhalte Benachrichtigungen (Ladeende, Akku-Warnung, Wächter-Alarm, Fahrtenbuch-Erinnerung) direkt im Telegram-Messenger — ohne App geöffnet zu haben." />
          </h4>
          <div v-if="!tgBotConfigured" class="text-sm text-gray-500">
            Telegram-Benachrichtigungen sind auf diesem Server noch nicht verfügbar. Bitte wende dich an einen Administrator.
          </div>
          <div v-else-if="tgLinked" class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-green-400">
              <AppIcon name="check" :size="16" />
              Verknüpft mit <span class="font-mono text-blue-300">@{{ tgUsername || '(unbekannt)' }}</span>
            </div>
            <div class="flex gap-2">
              <a v-if="tgBotUsername" :href="`https://t.me/${tgBotUsername}`" target="_blank"
                class="btn-secondary text-xs px-3 py-1.5">Bot öffnen →</a>
              <button @click="unlinkTelegram" class="btn-secondary text-xs px-3 py-1.5 text-red-300">
                Verknüpfung aufheben
              </button>
            </div>
          </div>
          <div v-else class="space-y-3">
            <div v-if="!tgCode" class="flex items-center gap-2">
              <button @click="generateTgCode" :disabled="tgCodeLoading"
                class="btn-primary text-xs px-3 py-1.5">
                {{ tgCodeLoading ? 'Erzeuge…' : 'Verknüpfungs-Code erzeugen' }}
              </button>
              <span v-if="tgBotUsername" class="text-gray-500 text-xs">
                Bot: <a :href="`https://t.me/${tgBotUsername}`" target="_blank"
                  class="text-blue-400 hover:text-blue-300">@{{ tgBotUsername }}</a>
              </span>
            </div>
            <div v-if="tgCode" class="bg-gray-800/70 border border-gray-600 rounded-xl p-4 space-y-3">
              <p class="text-sm text-gray-300 font-medium">So verknüpfst du Telegram:</p>
              <ol class="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                <li>Öffne Telegram und suche nach
                  <a v-if="tgBotUsername" :href="`https://t.me/${tgBotUsername}`" target="_blank"
                    class="text-blue-400 font-mono">@{{ tgBotUsername }}</a>
                  <span v-else class="text-gray-500">deinen Bot</span>
                </li>
                <li>Sende folgende Nachricht an den Bot:</li>
              </ol>
              <div class="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2">
                <code class="text-blue-300 font-mono text-sm flex-1">/start {{ tgCode }}</code>
                <button @click="copyTgCode" class="text-gray-400 hover:text-white transition"
                  v-tooltip="tgCodeCopied ? 'Kopiert!' : 'Kopieren'">
                  <AppIcon :name="tgCodeCopied ? 'check' : 'copy'" :size="16" />
                </button>
              </div>
              <p class="text-xs text-gray-500 flex items-center gap-1">
                <AppIcon name="clock" :size="12" />
                Gültig noch {{ tgCodeExpiresIn }}
              </p>
              <button @click="checkTgStatus" class="btn-secondary text-xs px-3 py-1.5">
                Status prüfen
              </button>
            </div>
          </div>
          <p v-if="tgMsg" class="text-xs" :class="tgMsgErr ? 'text-red-400' : 'text-green-400'">{{ tgMsg }}</p>
        </div>

        <hr class="border-gray-700" />

        <!-- Ereignis-Einstellungen -->
        <div class="space-y-3">
          <h4 class="font-semibold text-sm text-gray-200">Welche Ereignisse möchtest du erhalten?</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label v-for="(label, key) in notifTypes" :key="key"
              class="flex items-center gap-3 cursor-pointer select-none bg-gray-800/50 rounded-lg px-3 py-2 hover:bg-gray-700/50 transition">
              <input type="checkbox" v-model="notifPrefs[key]" @change="saveNotifPrefs"
                class="accent-tesla-red w-4 h-4 cursor-pointer" />
              <span class="text-sm text-gray-200">{{ label }}</span>
            </label>
          </div>
        </div>
      </div>
    </SortableSection>

    <div class="card">
      <button @click="logout" class="text-red-400 hover:text-red-300 text-sm transition"
        v-tooltip="'Aktuelle Session beenden – du wirst zur Login-Seite weitergeleitet'">Abmelden</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import { useNavStore }   from '../store/nav.js';
import AppIcon from '../components/AppIcon.vue';
import { useThemeStore, THEMES, DESIGNS } from '../store/theme.js';
import { useLangStore, LANGS } from '../store/lang.js';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import InfoTip from '../components/InfoTip.vue';
import { usePrefsStore } from '../store/prefs.js';

const PROFILE_SECTIONS = ['language', 'vehicle', 'mfa', 'passkey', 'password', 'audit', 'appearance', 'notifications'];
const { isCollapsed, toggle } = usePageLayout('profile', PROFILE_SECTIONS);

const auth     = useAuthStore();
const appStore = useAppStore();
const navStore = useNavStore();
const router   = useRouter();
const { t, locale } = useI18n();

function launchWizard() {
  if (typeof window.__launchWizard === 'function') window.__launchWizard();
}

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

const GROUP_LABELS = { overview: 'Übersicht', analytics: 'Auswertung', admin: 'Admin' };
const groupLabel  = id => GROUP_LABELS[id] || id;
const groupBorder = id => ({
  overview:  'border-blue-500/40',
  analytics: 'border-green-500/40',
  admin:     'border-red-500/40',
}[id] || 'border-gray-700');

const themeStore = useThemeStore();
const prefsStore = usePrefsStore();

function selectDesign(key) { themeStore.setDesign(key); prefsStore.set("theme_design", key); }
function selectAccent(key) { themeStore.apply(key); prefsStore.set("theme_color", key); }
const langStore  = useLangStore();

// ── Sprache ──
const langSaved = ref(false);
async function onPickLang(code) {
  await langStore.setLang(code);
  langSaved.value = true;
  setTimeout(() => { langSaved.value = false; }, 1500);
}

// ── Fahrerverwaltung ──











// ── Fahrzeugprofil ──
const teslaConnectedStatus = ref(false);

const WHEEL_CODE_MAP = {
  UberTurbine21Black: 'WY21P',
  UberTurbine21:      'WY21P',
  Induction20:        'WY20P',
  Gemini19:           'WY19B',
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

function buildFallbackOptionCodes(v) {
  const codes = ['MDLY'];
  const w = WHEEL_CODE_MAP[v.wheel_type];
  const c = COLOR_CODE_MAP[v.exterior_color];
  const s = SPOILER_CODE_MAP[v.spoiler_type];
  if (w) codes.push(w);
  if (c) codes.push(c);
  if (s) codes.push(s);
  return codes.join(',');
}

const hasOptionCodes = computed(() => !!appStore.selectedVehicle?.option_codes);

const vehicleImageUrl = computed(() => {
  const v = appStore.selectedVehicle;
  if (!v) return '';
  const model = vProfile.value.model || 'my';
  const codes = [];
  if (v.option_codes) codes.push(v.option_codes);
  else                codes.push(buildFallbackOptionCodes(v));
  if (vProfile.value.image_color) codes.push(vProfile.value.image_color);
  const optionsParam = codes.filter(Boolean).join(',') || 'PPSW';
  return `https://static-assets.tesla.com/configurator/compositor?&options=${optionsParam}&view=STUD_3QTR&model=${model}&size=400`;
});

const vProfile = ref({ license_plate: '', model: 'm3', image_color: 'PPSW', category: 'private', company_name: '', electricity_rate_kwh: 0.30, monta_client_id: '', monta_api_key: '', monta_charge_point_id: '', abrp_token: '' });
const vMsg = ref('');
const vOk  = ref(false);

async function refreshVehicleOptions() {
  const v = appStore.selectedVehicle;
  if (!v) return;
  try {
    await api.get(`/vehicles/${v.id}/status`);
    await appStore.loadVehicles();
    vMsg.value = '✓ Werks-Optionen aktualisiert'; vOk.value = true;
  } catch (e) {
    const code = e.response?.status;
    if (code === 503) vMsg.value = 'Auto offline — sobald es wieder online ist, holt der Poller die Daten automatisch.';
    else if (code === 401 || code === 403) vMsg.value = 'Tesla-Verbindung abgelaufen — bitte in den Admin-Einstellungen neu verbinden.';
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
    vMsg.value = 'Fahrzeugprofil gespeichert ✓'; vOk.value = true;
  } catch (e) {
    vMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern';
  }
}

// ── MFA ──
const mfaStatus       = ref({ mfaEnabled: false, unusedBackupCodes: 0 });
const showDisableForm = ref(false);
const disablePassword = ref('');
const disableError    = ref('');

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

// ── Passkey ──
const passkeys           = ref([]);
const passkeyRegistering = ref(false);
const passkeyError       = ref('');
const passkeySuccess     = ref('');

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
    const response   = await startRegistration({ optionsJSON: opts });
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

// ── Passwort / Audit ──
const pw        = ref({ current: '', next: '', confirm: '' });
const pwError   = ref('');
const pwSuccess = ref('');
const auditLog  = ref([]);
const fmtDate   = ts => new Date(ts * 1000).toLocaleString('de-DE');

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

async function changePassword() {
  pwError.value = pwSuccess.value = '';
  if (pw.value.next !== pw.value.confirm) { pwError.value = 'Passwoerter stimmen nicht ueberein'; return; }
  if (pw.value.next.length < 12) { pwError.value = 'Passwort muss mindestens 12 Zeichen lang sein'; return; }
  try {
    await api.put('/users/me/password', { currentPassword: pw.value.current, newPassword: pw.value.next });
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

// ── Web Push ──
const pushState      = ref('loading');
const pushSubscribed = ref(false);
const pushLoading    = ref(false);
const pushMsg        = ref('');
const pushMsgErr     = ref(false);
let   _swReg         = null;

async function initPushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) { pushState.value = 'unsupported'; return; }
  const perm = Notification.permission;
  if (perm === 'denied') { pushState.value = 'denied'; return; }
  try {
    _swReg = await navigator.serviceWorker.ready;
    const sub = await _swReg.pushManager.getSubscription();
    pushSubscribed.value = !!sub;
    pushState.value = 'ready';
  } catch { pushState.value = 'ready'; }
}

async function subscribePush() {
  pushLoading.value = true; pushMsg.value = '';
  try {
    const { data } = await api.get('/notifications/vapid-public-key');
    if (!data.key) { pushMsg.value = 'Push-Benachrichtigungen sind auf diesem Server noch nicht eingerichtet. Bitte wende dich an einen Administrator.'; pushMsgErr.value = true; return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { pushState.value = 'denied'; return; }
    if (!_swReg) _swReg = await navigator.serviceWorker.ready;
    const sub = await _swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.key) });
    await api.post('/notifications/subscribe', { subscription: sub.toJSON() });
    pushSubscribed.value = true;
    pushMsg.value = 'Push aktiviert! Du erhältst jetzt Benachrichtigungen.'; pushMsgErr.value = false;
  } catch (err) {
    pushMsg.value = err.message || 'Fehler beim Aktivieren'; pushMsgErr.value = true;
  } finally {
    pushLoading.value = false;
    setTimeout(() => { pushMsg.value = ''; }, 4000);
  }
}

async function unsubscribePush() {
  pushLoading.value = true;
  try {
    if (!_swReg) _swReg = await navigator.serviceWorker.ready;
    const sub = await _swReg.pushManager.getSubscription();
    if (sub) {
      await api.delete('/notifications/unsubscribe', { data: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
    pushSubscribed.value = false;
    pushMsg.value = 'Push deaktiviert.'; pushMsgErr.value = false;
  } catch (err) {
    pushMsg.value = err.message; pushMsgErr.value = true;
  } finally {
    pushLoading.value = false;
    setTimeout(() => { pushMsg.value = ''; }, 3000);
  }
}

async function testPush() {
  try {
    await api.post('/notifications/test');
    pushMsg.value = 'Testbenachrichtigung gesendet!'; pushMsgErr.value = false;
  } catch (err) {
    pushMsg.value = err.response?.data?.error || err.message; pushMsgErr.value = true;
  } finally {
    setTimeout(() => { pushMsg.value = ''; }, 3000);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── Telegram ──
const tgLinked        = ref(false);
const tgUsername      = ref('');
const tgBotUsername   = ref('');
const tgBotConfigured = ref(false);
const tgCode          = ref('');
const tgCodeExpiry    = ref(0);
const tgCodeCopied    = ref(false);
const tgCodeLoading   = ref(false);
const tgMsg           = ref('');
const tgMsgErr        = ref(false);
let   tgCodeTimer     = null;

const tgCodeExpiresIn = computed(() => {
  const diff = tgCodeExpiry.value - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'abgelaufen';
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

async function loadTgStatus() {
  try {
    const { data } = await api.get('/telegram/status');
    tgLinked.value        = data.linked;
    tgUsername.value      = data.telegram_username || '';
    tgBotUsername.value   = data.bot_username || '';
    tgBotConfigured.value = data.bot_configured;
  } catch { /* ignorieren */ }
}

async function generateTgCode() {
  tgCodeLoading.value = true;
  clearInterval(tgCodeTimer);
  try {
    const { data } = await api.post('/telegram/generate-code');
    tgCode.value       = data.code;
    tgCodeExpiry.value = data.expiresAt;
    tgCodeTimer = setInterval(() => {
      if (tgCodeExpiry.value - Math.floor(Date.now() / 1000) <= 0) {
        clearInterval(tgCodeTimer);
        tgCode.value = '';
      }
    }, 1000);
    const pollTimer = setInterval(async () => {
      await checkTgStatus();
      if (tgLinked.value) clearInterval(pollTimer);
    }, 3000);
  } catch (err) {
    tgMsg.value = err.response?.data?.error || err.message; tgMsgErr.value = true;
    setTimeout(() => { tgMsg.value = ''; }, 3000);
  } finally {
    tgCodeLoading.value = false;
  }
}

async function checkTgStatus() {
  const { data } = await api.get('/telegram/status');
  tgLinked.value   = data.linked;
  tgUsername.value = data.telegram_username || '';
  if (data.linked) {
    tgCode.value = '';
    clearInterval(tgCodeTimer);
    tgMsg.value = `✓ Verknüpft mit @${data.telegram_username || '(unbekannt)'}!`; tgMsgErr.value = false;
    setTimeout(() => { tgMsg.value = ''; }, 4000);
  }
}

async function unlinkTelegram() {
  if (!confirm('Telegram-Verknüpfung wirklich aufheben?')) return;
  try {
    await api.delete('/telegram/unlink');
    tgLinked.value = false;
    tgMsg.value = 'Verknüpfung aufgehoben.'; tgMsgErr.value = false;
    setTimeout(() => { tgMsg.value = ''; }, 3000);
  } catch (err) {
    tgMsg.value = err.response?.data?.error || err.message; tgMsgErr.value = true;
  }
}

async function copyTgCode() {
  try {
    await navigator.clipboard.writeText(`/start ${tgCode.value}`);
    tgCodeCopied.value = true;
    setTimeout(() => { tgCodeCopied.value = false; }, 2000);
  } catch { /* Clipboard nicht verfügbar */ }
}

// ── Benachrichtigungstypen ──
const notifTypes = {
  charging_complete: '⚡ Ladevorgang abgeschlossen',
  battery_low:       '🔋 Akku unter Schwellwert',
  sentry_alert:      '🚨 Wächter-Alarm (Fahrzeug berührt)',
  trip_recorded:     '🚗 Neue Fahrt aufgezeichnet',
  logbook_reminder:  '📋 Fahrtenbuch-Erinnerung',
};
const notifPrefs = ref({
  charging_complete: true,
  battery_low:       true,
  sentry_alert:      true,
  trip_recorded:     false,
  logbook_reminder:  true,
});

async function loadNotifPrefs() {
  try {
    const { data } = await api.get('/notifications/prefs');
    Object.assign(notifPrefs.value, data);
  } catch { /* ignorieren */ }
}

async function saveNotifPrefs() {
  try {
    await api.put('/notifications/prefs', notifPrefs.value);
  } catch { /* stilles Fail */ }
}

onMounted(async () => {
  loadPasskeys();
  loadTgStatus();
  loadNotifPrefs();
  initPushState();
  const [mfa, audit, teslaStatus] = await Promise.all([
    api.get('/mfa/status'),
    api.get('/users/me/audit'),
    api.get('/auth/tesla/status').catch(() => ({ data: { connected: false } })),
  ]);
  mfaStatus.value          = mfa.data;
  auditLog.value           = audit.data;
  teslaConnectedStatus.value = teslaStatus.data.connected;

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

<template>
  <div class="max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold">{{ $t('settings.title') }}</h1>

    <!-- Sprache (User-Preference) -->
    <div class="card space-y-3">
      <h2 class="font-semibold">🌐 {{ $t('settings.languageTitle') }}</h2>
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
      <h2 class="font-semibold">🏢 {{ $t('settings.tenantDefaultLocaleTitle') }}</h2>
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

    <!-- Vehicle profile -->
    <div class="card space-y-4">
      <h2 class="font-semibold" v-tooltip="'Kennzeichen, Farbe und Modell des Fahrzeugs einstellen – wird auf Dashboard und Technik-Seite angezeigt'">
        🚗 Fahrzeugprofil
      </h2>
      <div v-if="appStore.selectedVehicle" class="space-y-4">
        <div class="flex gap-4 items-center">
          <img :src="vehicleImageUrl" :alt="appStore.selectedVehicle.display_name"
            class="h-20 object-contain bg-gray-800 rounded-lg px-2"
            v-tooltip="'Fahrzeugvorschau basierend auf Modell und Farbe'" />
          <div class="text-sm">
            <p class="font-semibold text-white text-base">{{ appStore.selectedVehicle.display_name }}</p>
            <p class="text-gray-400">{{ vProfile.license_plate || 'Kein Kennzeichen' }}</p>
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
                  <p class="font-medium text-sm">💼 Dienstwagen</p>
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
          v-tooltip="'Fahrzeugprofil speichern – Änderungen werden sofort auf dem Dashboard sichtbar'">
          Speichern
        </button>
      </div>
      <p v-else class="text-gray-400 text-sm">Kein Fahrzeug verbunden.</p>
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
      <h2 class="font-semibold"
        v-tooltip="'Zwei-Faktor-Authentifizierung schützt dein Konto: auch wenn dein Passwort gestohlen wird, kann sich niemand ohne deinen zweiten Faktor anmelden.'">
        🔐 Zwei-Faktor-Authentifizierung
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
      <h2 class="font-semibold"
        v-tooltip="'Passkeys ermöglichen passwortlosen Login per Touch ID, Face ID oder Sicherheitsschlüssel.'">
        🗝️ Passkey (Passwortlos anmelden)
      </h2>
      <p class="text-sm text-gray-400">
        Registriere einen Passkey für dieses Gerät, um dich künftig ohne Passwort anzumelden (Touch ID, Face ID, Windows Hello oder USB-Schlüssel).
      </p>
      <div v-if="passkeys.length" class="space-y-2">
        <div v-for="pk in passkeys" :key="pk.id"
          class="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
          <div>
            <p class="text-sm font-medium text-white">{{ pk.device_type || 'Gerät' }}</p>
            <p class="text-xs text-gray-500">Hinzugefügt: {{ fmtDate(pk.created_at) }}</p>
          </div>
          <button @click="removePasskey(pk.id)"
            class="text-xs text-gray-500 hover:text-red-400 transition">Entfernen</button>
        </div>
      </div>
      <p v-else class="text-sm text-gray-500">Noch kein Passkey registriert.</p>
      <div v-if="passkeyError"   class="text-red-400 text-sm">{{ passkeyError }}</div>
      <div v-if="passkeySuccess" class="text-green-400 text-sm">{{ passkeySuccess }}</div>
      <button @click="addPasskey" :disabled="passkeyRegistering"
        class="btn-secondary text-sm"
        v-tooltip="'Browser-Dialog öffnet sich – Fingerabdruck, Gesichtserkennung oder Sicherheitsschlüssel bestätigen'">
        {{ passkeyRegistering ? 'Bitte warten…' : '+ Passkey hinzufügen' }}
      </button>
    </div>

    <!-- Tesla Verbindung -->
    <div class="card space-y-4">
      <h2 class="font-semibold">⚡ Tesla-Verbindung</h2>

      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-sm" :class="teslaConnected ? 'text-green-400' : 'text-red-400'">
          {{ teslaConnected ? '● Verbunden' : '● Nicht verbunden' }}
        </span>
        <button @click="teslaReconnect" :disabled="!teslaAuthUrl" class="btn-primary text-sm"
          v-tooltip="'Tesla-Account neu verbinden – holt einen neuen Token mit allen benötigten Scopes'">
          Tesla neu verbinden
        </button>
        <button @click="syncVehicles" :disabled="syncingVehicles" class="btn-secondary text-sm"
          v-tooltip="'Alle Fahrzeuge des Tesla-Accounts abrufen und in die App übernehmen. Nützlich wenn ein neues Fahrzeug zum Account hinzugefügt wurde.'">
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

      <!-- Fleet Telemetrie -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <div>
          <p class="font-medium text-sm">📡 Fleet Telemetrie (GPS &amp; Echtzeit-Daten)</p>
          <p class="text-xs text-gray-400 mt-0.5">Sendet GPS-Track, Geschwindigkeit und Batterie live an diese App</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button @click="registerPartner" :disabled="partnerBusy"
            class="btn-secondary text-sm"
            v-tooltip="'Einmalig: Registriert diese App als Tesla-Partner. Muss vor der Telemetrie-Aktivierung gemacht werden.'">
            {{ partnerBusy ? 'Registriere…' : '🔑 App bei Tesla registrieren' }}
          </button>
          <button @click="configureTelemetry" :disabled="telemetryBusy"
            class="btn-primary text-sm"
            v-tooltip="'Registriert diese App bei Tesla als Telemetrie-Empfänger. Einmalig nötig – danach werden GPS und Fahrdaten automatisch übertragen.'">
            {{ telemetryBusy ? 'Wird aktiviert…' : '📡 Telemetrie aktivieren' }}
          </button>
        </div>
        <div v-if="partnerResult" class="rounded-lg px-3 py-2 text-sm"
          :class="partnerResult.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'">
          {{ partnerResult.ok ? '✓ App erfolgreich registriert – jetzt Telemetrie aktivieren' : '✗ ' + partnerResult.error }}
        </div>
        <div v-if="telemetryResults.length" class="space-y-2">
          <div v-for="r in telemetryResults" :key="r.vin"
            class="rounded-lg px-3 py-2 text-sm"
            :class="r.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'">
            <span class="font-mono text-xs">{{ r.vin }}</span>
            <span class="ml-2">{{ r.ok ? '✓ Aktiviert' : '✗ ' + (r.error?.error || r.error || 'Fehler') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card space-y-3">
      <h2 class="font-semibold">🔑 Passwort ändern</h2>
      <div class="space-y-2">
        <input v-model="pw.current" type="password" placeholder="Aktuelles Passwort"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Dein bisheriges Passwort – zur Bestätigung deiner Identität'" />
        <input v-model="pw.next" type="password" placeholder="Neues Passwort (mind. 12 Zeichen)"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Mindestens 12 Zeichen. Empfohlen: Passphrase aus 4+ zufälligen Wörtern (z.B. „Spaten-Berg-Donau-Mozart“) – ist sicherer als kurze, komplexe Passwörter und leichter zu merken.'" />
        <input v-model="pw.confirm" type="password" placeholder="Neues Passwort wiederholen"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Bitte das neue Passwort zur Sicherheit erneut eingeben'" />
        <div v-if="pwError" class="text-red-400 text-sm">{{ pwError }}</div>
        <div v-if="pwSuccess" class="text-green-400 text-sm">{{ pwSuccess }}</div>
        <button @click="changePassword" class="btn-primary text-sm">Passwort ändern</button>
      </div>
    </div>

    <div class="card space-y-3">
      <h2 class="font-semibold"
        v-tooltip="'Auflistung deiner letzten Sicherheits-Aktivitäten. Falls du hier verdächtige Einträge siehst (z.B. Login von unbekannten IPs), ändere sofort dein Passwort.'">
        📝 Letzte Aktivitäten
      </h2>
      <div class="space-y-1">
        <div v-for="e in auditLog" :key="e.created_at"
          class="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
          <span class="font-mono text-gray-300" v-tooltip="actionTooltip(e.action)">{{ e.action }}</span>
          <span class="text-gray-500" v-tooltip="'IP-Adresse: ' + (e.ip_address || 'unbekannt')">{{ fmtDate(e.created_at) }}</span>
        </div>
        <p v-if="!auditLog.length" class="text-gray-500 text-sm">Keine Einträge</p>
      </div>
    </div>

    <!-- Farbschema -->
    <div class="card space-y-3">
      <h2 class="font-semibold"
        v-tooltip="'Akzentfarbe der Benutzeroberfläche – Schaltflächen, aktive Navigationspunkte und Fokus-Rahmen.'">
        🎨 Farbschema
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
      <p class="text-xs text-gray-500">Reihenfolge mit ↑↓ ändern · Auge zum Ein-/Ausblenden</p>
      <div class="space-y-1">
        <div v-for="(link, idx) in navStore.allLinks" :key="link.key"
          class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800 transition">
          <div class="flex flex-col gap-0.5">
            <button @click="navStore.moveUp(link.key)" :disabled="idx === 0"
              class="text-gray-500 hover:text-white disabled:opacity-20 leading-none text-xs transition">▲</button>
            <button @click="navStore.moveDown(link.key)" :disabled="idx === navStore.allLinks.length - 1"
              class="text-gray-500 hover:text-white disabled:opacity-20 leading-none text-xs transition">▼</button>
          </div>
          <span class="text-base w-6 text-center">{{ link.icon }}</span>
          <span class="flex-1 text-sm" :class="link.visible ? 'text-white' : 'text-gray-600 line-through'">
            {{ link.label }}
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
      <h2 class="font-semibold"
        v-tooltip="'Tarife und Schwellwerte für die Tesla-Fleet-API-Nutzung – passt zur Tesla-Preisliste, kann jederzeit angepasst werden, sobald Tesla sie ändert.'">
        💸 Tesla API-Nutzung
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import { useAppStore }  from '../store/index.js';
import { useNavStore }   from '../store/nav.js';
import { useThemeStore, THEMES } from '../store/theme.js';
import { useLangStore, LANGS } from '../store/lang.js';

const auth     = useAuthStore();
const appStore = useAppStore();
const navStore   = useNavStore();
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
const telemetryBusy    = ref(false);
const telemetryResults = ref([]);
const partnerBusy      = ref(false);
const partnerResult    = ref(null);

async function registerPartner() {
  partnerBusy.value = true;
  partnerResult.value = null;
  try {
    const { data } = await api.post('/fleet/partner/register');
    partnerResult.value = { ok: true };
  } catch (err) {
    partnerResult.value = { ok: false, error: err.response?.data?.error ?? err.message };
  } finally {
    partnerBusy.value = false;
  }
}

async function configureTelemetry() {
  telemetryBusy.value = true;
  telemetryResults.value = [];
  try {
    const { data } = await api.post('/fleet/telemetry/configure', {}, { timeout: 100000 });
    telemetryResults.value = data.results;
  } catch (err) {
    telemetryResults.value = [{ vin: '–', ok: false, error: err.response?.data?.error ?? err.message }];
  } finally {
    telemetryBusy.value = false;
  }
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
const vProfile = ref({ license_plate: '', model: 'm3', image_color: 'PPSW', category: 'private', company_name: '', electricity_rate_kwh: 0.30, monta_client_id: '', monta_api_key: '', monta_charge_point_id: '' });
const vMsg = ref('');
const vOk  = ref(false);

const vehicleImageUrl = computed(() => {
  const v = appStore.selectedVehicle;
  if (!v) return '';
  return `https://static-assets.tesla.com/configurator/compositor?&options=${vProfile.value.image_color || 'PPSW'}&view=STUD_3QTR&model=${vProfile.value.model || 'm3'}&size=400`;
});

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

onMounted(async () => {
  loadDrivers();
  loadTenantDefaultLocale();
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
    };
  }
});

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

@media (prefers-color-scheme: light) {
  .lang-pick { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.08); }
  .lang-pick:hover { background: rgba(0,0,0,0.07); }
}
</style>

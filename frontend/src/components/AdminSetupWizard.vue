<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col"
           style="max-height: 90vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 class="font-bold text-lg">🛠️ Admin-Einrichtung</h2>
            <p v-if="step > 0 && !isLast" class="text-xs text-gray-400 mt-0.5">
              Schritt {{ step }} von {{ STEPS.length - 2 }}
            </p>
          </div>
          <button @click="$emit('close')" class="text-gray-500 hover:text-white text-2xl leading-none transition">×</button>
        </div>

        <!-- Fortschrittsbalken -->
        <div v-if="step > 0 && !isLast" class="h-1 bg-gray-800 shrink-0">
          <div class="h-full bg-tesla-red transition-all duration-300"
               :style="{ width: (step / (STEPS.length - 2) * 100) + '%' }"></div>
        </div>

        <!-- Inhalt -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- STEP: welcome -->
          <template v-if="currentId === 'welcome'">
            <div class="text-center space-y-4 py-4">
              <div class="text-5xl">🛠️</div>
              <h3 class="text-xl font-bold">System-Einrichtung</h3>
              <p class="text-gray-300 text-sm leading-relaxed">
                Dieser Assistent führt dich durch alle Server-seitigen Konfigurationen.
                Alles was du hier einstellst, wird in der Datenbank gespeichert — kein SSH und kein .env-Bearbeiten nötig.
              </p>
              <div class="bg-gray-800 rounded-xl p-4 text-left space-y-2 text-sm text-gray-300">
                <p>✓ Tesla Fleet-API Zugangsdaten</p>
                <p>✓ Tesla OAuth & Fahrzeugzuordnung</p>
                <p>✓ Push-Benachrichtigungen (VAPID)</p>
                <p>✓ Telegram Bot</p>
                <p>✓ Externe APIs (OCM, HERE, Grok, ABRP)</p>
                <p>✓ Monitoring & E-Mail</p>
              </div>
            </div>
          </template>

          <!-- STEP: credentials -->
          <template v-else-if="currentId === 'credentials'">
            <StepHeader title="Tesla Fleet-API Zugangsdaten"
              question="Trage deine Tesla Developer App-Daten ein. Diese werden sicher in der DB gespeichert." />
            <div v-if="credsCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
              ℹ️ Derzeit aktiv aus .env. Neue Werte überschreiben die .env.
            </div>
            <div class="space-y-3">
              <div>
                <label class="label">Client ID <a href="https://developer.tesla.com/" target="_blank" rel="noopener" class="text-xs text-blue-400 ml-1">developer.tesla.com ↗</a></label>
                <input v-model="credsForm.client_id" type="text" placeholder="abc123def456"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div>
                <label class="label">Client Secret</label>
                <input v-model="credsForm.client_secret" type="password"
                  :placeholder="credsCfg.client_secret_set ? '(gesetzt — leer lassen zum Beibehalten)' : 'Secret eingeben'"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div>
                <label class="label">Fleet API Audience</label>
                <input v-model="credsForm.audience" type="text"
                  placeholder="https://fleet-api.prd.eu.vn.cloud.tesla.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <p class="text-xs text-gray-500 mt-1">EU: ...eu... | NA: ...na...</p>
              </div>
            </div>
            <p v-if="credsMsg" class="text-sm" :class="credsOk ? 'text-green-400' : 'text-red-400'">{{ credsMsg }}</p>
          </template>

          <!-- STEP: oauth -->
          <template v-else-if="currentId === 'oauth'">
            <StepHeader title="Tesla OAuth-Verbindung" question="Verbinde dein Tesla-Konto, damit die App auf deine Fahrzeugdaten zugreifen kann." />
            <div class="card space-y-4">
              <div class="flex items-center gap-3">
                <span v-if="oauthStatus === 'connected'" class="text-2xl">✅</span>
                <span v-else-if="oauthStatus === 'checking'" class="text-2xl animate-pulse">🔄</span>
                <span v-else class="text-2xl">❌</span>
                <div>
                  <p class="text-sm font-semibold text-white">
                    {{ oauthStatus === 'connected' ? 'Verbunden' : 'Nicht verbunden' }}
                  </p>
                  <p class="text-xs text-gray-400">Tesla-Konto muss mit deinen Fleet API Credentials verknüpft sein.</p>
                </div>
              </div>
              <div v-if="oauthStatus !== 'connected'" class="flex gap-2">
                <button @click="openOauth" :disabled="oauthOpening" class="flex-1 btn-primary text-sm">
                  {{ oauthOpening ? 'Öffne Tesla-Login …' : '🔗 Mit Tesla verbinden' }}
                </button>
                <button @click="checkOauthStatus" class="btn-secondary text-sm px-4">↻</button>
              </div>
              <p v-if="oauthStatus === 'connected'" class="text-xs text-green-400">
                Verbindung aktiv. Fahrzeugdaten werden geladen.
              </p>
            </div>
          </template>

          <!-- STEP: vehicles -->
          <template v-else-if="currentId === 'vehicles'">
            <StepHeader title="Fahrzeuge" question="Deine Tesla-Fahrzeuge werden hier angezeigt. Synchronisiere, wenn nötig." />
            <div class="card space-y-3">
              <div v-if="vehicles.length === 0" class="text-center py-4 space-y-3">
                <p class="text-sm text-gray-400">Keine Fahrzeuge gefunden. Zuerst mit Tesla verbinden.</p>
                <button @click="syncVehicles" :disabled="vehicleSyncing" class="btn-primary text-sm">
                  {{ vehicleSyncing ? '…' : '🔄 Fahrzeuge abrufen' }}
                </button>
              </div>
              <div v-else class="space-y-2">
                <div v-for="v in vehicles" :key="v.id" class="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                  <span class="text-xl">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ v.vin }}</p>
                  </div>
                  <span class="text-xs text-green-400">✓</span>
                </div>
                <button @click="syncVehicles" :disabled="vehicleSyncing" class="w-full btn-secondary text-sm py-2">
                  {{ vehicleSyncing ? '…' : '🔄 Erneut abrufen' }}
                </button>
              </div>
              <p v-if="vehicleSyncError" class="text-xs text-red-400">{{ vehicleSyncError }}</p>
            </div>
          </template>

          <!-- STEP: virtualkey -->
          <template v-else-if="currentId === 'virtualkey'">
            <StepHeader title="Virtual Key" question="Für Fahrzeugbefehle (Klimaanlage, Laden etc.) ist ein Virtual Key erforderlich." />
            <div class="card space-y-4">
              <div v-if="telemetryStatus === null" class="text-sm text-gray-400">Lade …</div>
              <template v-else>
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ telemetryStatus.virtual_key_exists ? '✅' : '⚠️' }}</span>
                  <div>
                    <p class="text-sm font-semibold text-white">
                      {{ telemetryStatus.virtual_key_exists ? 'Virtual Key vorhanden' : 'Virtual Key fehlt' }}
                    </p>
                    <p v-if="telemetryStatus.virtual_key_exists && telemetryStatus.virtual_key_created_at" class="text-xs text-gray-400">
                      Erstellt: {{ new Date(telemetryStatus.virtual_key_created_at * 1000).toLocaleDateString() }}
                    </p>
                  </div>
                </div>
                <div v-if="!telemetryStatus.virtual_key_exists" class="space-y-3">
                  <p class="text-xs text-gray-400">Öffne die URL auf deinem Tesla-Touchscreen, um den Key zu genehmigen.</p>
                  <div class="bg-gray-950 rounded-lg p-3 space-y-2">
                    <p class="text-xs text-gray-500">Registrierungs-URL:</p>
                    <p class="text-xs font-mono text-amber-300 break-all select-all">{{ telemetryStatus.registration_url }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button @click="copyVkUrl" class="flex-1 btn-secondary text-sm">
                      {{ vkCopied ? 'Kopiert ✓' : 'URL kopieren' }}
                    </button>
                    <a :href="telemetryStatus.registration_url" target="_blank" rel="noopener"
                      class="btn-primary text-sm px-4 no-underline">↗ Öffnen</a>
                  </div>
                  <button @click="loadTelemetryStatus" class="btn-secondary text-sm w-full">Erneut prüfen</button>
                </div>
              </template>
            </div>
          </template>

          <!-- STEP: telemetry -->
          <template v-else-if="currentId === 'telemetry'">
            <StepHeader title="Fleet Telemetrie" question="Aktiviere die Live-Telemetrie für jedes Fahrzeug." />
            <div v-if="telemetryStatus === null" class="text-sm text-gray-400">Lade …</div>
            <div v-else class="space-y-3">
              <div v-if="!telemetryStatus.virtual_key_exists" class="card bg-amber-900/20 border border-amber-700/40 text-sm text-amber-300">
                ⚠️ Virtual Key fehlt — bitte zuerst den vorherigen Schritt abschließen.
              </div>
              <div v-for="v in telemetryStatus.vehicles ?? []" :key="v.id" class="card space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ v.vin }}</p>
                  </div>
                  <span :class="telemetryBadgeClass(v.status)" class="text-xs px-2 py-0.5 rounded-full font-medium">
                    {{ { streaming: '● Live', registered_idle: '◎ Registriert', not_registered: '○ Nicht registriert', approval_missing: '⚠ Genehmigung fehlt', error: '✕ Fehler' }[v.status] ?? v.status }}
                  </span>
                </div>
                <button v-if="v.status === 'not_registered' || v.status === 'error'"
                  @click="configureTelemetry(v.vin)" :disabled="telemetryConfiguring[v.vin]"
                  class="btn-primary text-xs w-full py-1.5">
                  {{ telemetryConfiguring[v.vin] ? '…' : 'Telemetrie aktivieren' }}
                </button>
              </div>
              <div v-if="!telemetryStatus.vehicles?.length" class="text-sm text-gray-400 text-center py-4">Keine Fahrzeuge.</div>
              <button @click="loadTelemetryStatus" class="btn-secondary text-sm w-full">Aktualisieren</button>
            </div>
          </template>

          <!-- STEP: vapid -->
          <template v-else-if="currentId === 'vapid'">
            <StepHeader title="Web Push (VAPID)" question="Push-Benachrichtigungen im Browser brauchen VAPID-Keys. Einmal generieren — fertig." />
            <div v-if="vapidCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
              ℹ️ Derzeit aktiv aus .env.
            </div>
            <div v-if="vapidCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
              ✓ VAPID konfiguriert. Push-Benachrichtigungen sind aktiv.
            </div>
            <div class="space-y-3">
              <div>
                <label class="label">Kontakt-E-Mail (für VAPID)</label>
                <input v-model="vapidForm.contact" type="email" placeholder="mailto:admin@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="generateVapid" :disabled="vapidForm.generating" class="flex-1 btn-primary text-sm">
                {{ vapidForm.generating ? '…' : (vapidCfg.configured ? '🔄 Neu generieren' : '⚡ VAPID-Keys generieren') }}
              </button>
            </div>
            <p v-if="vapidForm.msg" class="text-sm" :class="vapidForm.ok ? 'text-green-400' : 'text-red-400'">{{ vapidForm.msg }}</p>
            <p v-if="!vapidCfg.configured" class="text-xs text-gray-500">Du kannst diesen Schritt überspringen und VAPID später in Admin → Einstellungen konfigurieren.</p>
          </template>

          <!-- STEP: telegram -->
          <template v-else-if="currentId === 'telegram'">
            <StepHeader title="Telegram Bot" question="Optional: Nutzer können Benachrichtigungen über Telegram erhalten." />
            <div v-if="telegramCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
              ✓ Telegram Bot konfiguriert
            </div>
            <div class="space-y-3">
              <div>
                <label class="label">Bot Token <a href="https://t.me/BotFather" target="_blank" rel="noopener" class="text-xs text-blue-400 ml-1">@BotFather ↗</a></label>
                <input v-model="telegramForm.bot_token" type="password"
                  :placeholder="telegramCfg.configured ? '(gesetzt — leer lassen zum Beibehalten)' : '123456789:ABCdef…'"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div>
                <label class="label">Webhook URL (optional)</label>
                <input v-model="telegramForm.webhook_url" type="url"
                  placeholder="https://deine-app.example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <p class="text-xs text-gray-500 mt-1">Leer lassen = Long-Polling (auch ohne Public URL möglich).</p>
              </div>
            </div>
            <p v-if="telegramForm.msg" class="text-sm text-amber-300">{{ telegramForm.msg }}</p>
            <p class="text-xs text-gray-500">Du kannst diesen Schritt überspringen. Konfiguration auch in Admin → Einstellungen möglich.</p>
          </template>

          <!-- STEP: electricity -->
          <template v-else-if="currentId === 'electricity'">
            <StepHeader title="Strompreis" question="Trage den aktuellen Strompreis (€/kWh) für jedes Fahrzeug ein." />
            <div class="space-y-3">
              <div v-if="vehicles.length === 0" class="text-sm text-gray-400 text-center py-4">Keine Fahrzeuge vorhanden.</div>
              <div v-for="v in vehicles" :key="v.id" class="card space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400">Aktuell: <span class="text-gray-200">{{ v.electricity_rate_kwh != null ? v.electricity_rate_kwh + ' €/kWh' : 'Nicht gesetzt' }}</span></p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input type="number" step="0.001" min="0" max="5"
                    :value="draftElectricity[v.id] ?? v.electricity_rate_kwh ?? ''"
                    @input="draftElectricity[v.id] = parseFloat($event.target.value)"
                    placeholder="0.300"
                    class="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                  <span class="text-sm text-gray-400">€/kWh</span>
                </div>
              </div>
            </div>
          </template>

          <!-- STEP: external -->
          <template v-else-if="currentId === 'external'">
            <StepHeader title="Externe APIs" question="Optionale API-Keys für erweiterte Funktionen." />
            <div class="space-y-4">
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">⚡ OpenChargeMap (OCM)</p>
                  <span v-if="adminStatus.ocm?.configured" class="text-xs text-green-400">✓ Konfiguriert</span>
                  <span v-else class="text-xs text-gray-500">Nicht konfiguriert</span>
                </div>
                <p class="text-xs text-gray-400">Ladestationen-Finder (kostenlos mit Key).</p>
                <input v-model="draftAdmin.ocm_key" type="password"
                  :placeholder="adminStatus.ocm?.configured ? 'Neuer Key (leer lassen = unverändert)' : 'OCM API Key'"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">🗺️ HERE Maps (Verkehr)</p>
                  <span v-if="adminStatus.here?.configured" class="text-xs text-green-400">✓ Konfiguriert</span>
                  <span v-else class="text-xs text-gray-500">Nicht konfiguriert</span>
                </div>
                <p class="text-xs text-gray-400">Echtzeit-Verkehrsdaten im Routenplaner (kostenpflichtig).</p>
                <input v-model="draftAdmin.here_key" type="password"
                  :placeholder="adminStatus.here?.configured ? 'Neuer Key (leer lassen = unverändert)' : 'HERE API Key'"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">🤖 Grok / xAI</p>
                  <span v-if="adminStatus.grok?.configured" class="text-xs text-green-400">✓ Konfiguriert</span>
                  <span v-else class="text-xs text-gray-500">Nicht konfiguriert</span>
                </div>
                <p class="text-xs text-gray-400">KI-Chat mit Fahrzeugkontext (xAI API Key erforderlich).</p>
                <input v-model="draftAdmin.xai_key" type="password"
                  :placeholder="adminStatus.grok?.configured ? 'Neuer Key (leer lassen = unverändert)' : 'xai-… Key'"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">⚡ ABRP App-Key</p>
                  <span v-if="adminStatus.abrp?.configured" class="text-xs text-green-400">✓ Konfiguriert</span>
                  <span v-else class="text-xs text-gray-500">Nicht konfiguriert</span>
                </div>
                <p class="text-xs text-gray-400">Globaler App-Key für A Better Route Planner (api.iternio.com).</p>
                <input v-model="draftAdmin.abrp_key" type="password"
                  :placeholder="adminStatus.abrp?.configured ? 'Neuer Key (leer lassen = unverändert)' : 'ABRP API Key'"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
            </div>
          </template>

          <!-- STEP: monitoring -->
          <template v-else-if="currentId === 'monitoring'">
            <StepHeader title="Monitoring & E-Mail" question="Konfiguriere Alert-E-Mail und optionalen SMTP-Server." />
            <div class="space-y-4">
              <div class="card space-y-2">
                <p class="text-sm font-medium text-white">📧 Alert-E-Mail</p>
                <p class="text-xs text-gray-400">Bei System-Problemen wird diese Adresse benachrichtigt.</p>
                <input v-model="draftAdmin.alert_email" type="email" placeholder="admin@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">📨 SMTP (optional)</p>
                  <span v-if="adminStatus.smtp?.configured" class="text-xs text-green-400">✓ Konfiguriert</span>
                </div>
                <p class="text-xs text-gray-400">Für E-Mail-Benachrichtigungen und Passwort-Reset.</p>
                <div class="grid grid-cols-3 gap-2">
                  <input v-model="draftAdmin.smtp_host" type="text" placeholder="smtp.example.com"
                    class="col-span-2 w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                  <input v-model="draftAdmin.smtp_port" type="number" placeholder="587"
                    class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                </div>
                <input v-model="draftAdmin.smtp_user" type="email" placeholder="user@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <input v-model="draftAdmin.smtp_password" type="password" placeholder="Passwort"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <input v-model="draftAdmin.smtp_from" type="email" placeholder="noreply@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
            </div>
          </template>

          <!-- STEP: summary -->
          <template v-else>
            <div class="text-center space-y-4 py-4">
              <div class="text-5xl">✅</div>
              <h3 class="text-xl font-bold">Einrichtung abgeschlossen</h3>
              <p class="text-gray-300 text-sm">Alle Konfigurationen wurden gespeichert.</p>
              <div v-if="needsRestart" class="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-3 text-sm text-amber-300">
                ⚠️ Für Telegram-Bot und andere Dienst-Neustarts empfiehlt sich ein Container-Neustart.
              </div>
              <RouterLink to="/admin/settings" @click="$emit('close')" class="block btn-secondary text-sm">
                → Admin-Einstellungen
              </RouterLink>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex items-center gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
          <button v-if="step > 0 && !isLast" @click="back" class="btn-secondary text-sm px-4">← Zurück</button>
          <div class="flex-1"></div>
          <template v-if="isLast">
            <button @click="$emit('close')" class="btn-primary text-sm px-6">Fertig</button>
          </template>
          <template v-else-if="currentId === 'welcome'">
            <button @click="next" class="btn-primary text-sm px-6">Los geht's →</button>
          </template>
          <template v-else>
            <button @click="skip" class="text-sm text-gray-500 hover:text-gray-300 transition px-2">Überspringen</button>
            <button @click="saveAndNext" :disabled="saving" class="btn-primary text-sm px-6">
              {{ saving ? '…' : (isSecondToLast ? 'Fertigstellen' : 'Weiter →') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import api from '../api.js';

const emit = defineEmits(['close', 'done']);

const STEPS = [
  'welcome', 'credentials', 'oauth', 'vehicles', 'virtualkey', 'telemetry',
  'vapid', 'telegram', 'electricity', 'external', 'monitoring', 'summary'
];

const step      = ref(0);
const currentId = computed(() => STEPS[step.value] ?? 'summary');
const isLast    = computed(() => step.value === STEPS.length - 1);
const isSecondToLast = computed(() => step.value === STEPS.length - 2);
const saving    = ref(false);
const needsRestart = ref(false);

// ─── Tesla Credentials ─────────────────────────────────────────────────────
const credsCfg  = ref({ client_id: '', client_secret_set: false, from_env: false });
const credsForm = ref({ client_id: '', client_secret: '', audience: '' });
const credsMsg  = ref('');
const credsOk   = ref(false);

async function loadCredsCfg() {
  try {
    const { data } = await api.get('/system/tesla-credentials');
    credsCfg.value = data;
    credsForm.value.client_id = data.client_id?.startsWith('(aus .env)') ? '' : (data.client_id || '');
    credsForm.value.audience  = data.audience  || '';
  } catch { /* ignore */ }
}

async function saveCredentials() {
  if (!credsForm.value.client_id && !credsForm.value.client_secret) return;
  try {
    await api.put('/system/tesla-credentials', {
      client_id:     credsForm.value.client_id || undefined,
      client_secret: credsForm.value.client_secret || undefined,
      audience:      credsForm.value.audience  || undefined,
    });
    credsMsg.value = '✓ Gespeichert'; credsOk.value = true;
    await loadCredsCfg();
  } catch (e) {
    credsMsg.value = e.response?.data?.error || 'Fehler'; credsOk.value = false;
  }
  setTimeout(() => { credsMsg.value = ''; }, 3000);
}

// ─── Tesla OAuth ───────────────────────────────────────────────────────────
const oauthStatus  = ref('checking');
const oauthOpening = ref(false);

async function checkOauthStatus() {
  oauthStatus.value = 'checking';
  try {
    const { data } = await api.get('/auth/tesla/status');
    oauthStatus.value = data.connected ? 'connected' : 'disconnected';
  } catch { oauthStatus.value = 'disconnected'; }
}

async function openOauth() {
  oauthOpening.value = true;
  try {
    const { data } = await api.get('/auth/tesla/auth-url');
    const popup = window.open(data.url, 'tesla_oauth', 'width=600,height=700');
    const onMsg = async (e) => {
      if (e.data?.type === 'tesla_connected') {
        window.removeEventListener('message', onMsg);
        await checkOauthStatus();
      }
    };
    window.addEventListener('message', onMsg);
    const timer = setInterval(async () => {
      if (popup?.closed) { clearInterval(timer); window.removeEventListener('message', onMsg); await checkOauthStatus(); }
    }, 1000);
  } finally { oauthOpening.value = false; }
}

// ─── Fahrzeuge ─────────────────────────────────────────────────────────────
const vehicles       = ref([]);
const vehicleSyncing = ref(false);
const vehicleSyncError = ref('');

async function loadVehicles() {
  try { const { data } = await api.get('/vehicles'); vehicles.value = data; } catch { /* ignore */ }
}

async function syncVehicles() {
  vehicleSyncing.value = true; vehicleSyncError.value = '';
  try { await api.post('/vehicles/sync'); await loadVehicles(); }
  catch (e) { vehicleSyncError.value = e.response?.data?.error || e.message; }
  finally { vehicleSyncing.value = false; }
}

// ─── Virtual Key + Telemetry ───────────────────────────────────────────────
const telemetryStatus      = ref(null);
const telemetryConfiguring = reactive({});
const vkCopied = ref(false);

async function loadTelemetryStatus() {
  try { const { data } = await api.get('/telemetry/status'); telemetryStatus.value = data; } catch { /* ignore */ }
}

async function configureTelemetry(vin) {
  telemetryConfiguring[vin] = true;
  try { await api.post(`/telemetry/configure/${vin}`); await loadTelemetryStatus(); }
  catch { /* ignore */ } finally { telemetryConfiguring[vin] = false; }
}

function copyVkUrl() {
  if (!telemetryStatus.value?.registration_url) return;
  navigator.clipboard.writeText(telemetryStatus.value.registration_url);
  vkCopied.value = true;
  setTimeout(() => { vkCopied.value = false; }, 2000);
}

function telemetryBadgeClass(status) {
  return { streaming: 'bg-green-900/50 text-green-300', registered_idle: 'bg-blue-900/50 text-blue-300',
    not_registered: 'bg-gray-700 text-gray-400', approval_missing: 'bg-amber-900/50 text-amber-300',
    error: 'bg-red-900/50 text-red-300' }[status] ?? 'bg-gray-700 text-gray-400';
}

// ─── VAPID ─────────────────────────────────────────────────────────────────
const vapidCfg  = ref({ configured: false, from_env: false });
const vapidForm = ref({ contact: '', generating: false, msg: '', ok: false });

async function loadVapidCfg() {
  try { const { data } = await api.get('/system/vapid-config'); vapidCfg.value = data; vapidForm.value.contact = data.contact || ''; }
  catch { /* ignore */ }
}

async function generateVapid() {
  if (vapidCfg.value.configured && !confirm('VAPID-Keys neu generieren? Alle Push-Abonnements müssen erneuert werden!')) return;
  vapidForm.value.generating = true;
  try {
    if (vapidForm.value.contact) await api.put('/system/vapid-config', { contact: vapidForm.value.contact });
    await api.post('/system/vapid-generate');
    vapidForm.value.msg = '✓ VAPID-Keys generiert'; vapidForm.value.ok = true;
    await loadVapidCfg();
  } catch (e) { vapidForm.value.msg = e.response?.data?.error || 'Fehler'; vapidForm.value.ok = false; }
  vapidForm.value.generating = false;
  setTimeout(() => { vapidForm.value.msg = ''; }, 4000);
}

// ─── Telegram ──────────────────────────────────────────────────────────────
const telegramCfg  = ref({ configured: false });
const telegramForm = ref({ bot_token: '', webhook_url: '', msg: '' });

async function loadTelegramCfg() {
  try { const { data } = await api.get('/system/telegram-config'); telegramCfg.value = data; telegramForm.value.webhook_url = data.webhook_url || ''; }
  catch { /* ignore */ }
}

async function saveTelegram() {
  if (!telegramForm.value.bot_token) return;
  try {
    await api.put('/system/telegram-config', { bot_token: telegramForm.value.bot_token, webhook_url: telegramForm.value.webhook_url });
    telegramForm.value.bot_token = '';
    telegramForm.value.msg = '✓ Gespeichert. Neustart empfohlen.';
    needsRestart.value = true;
    await loadTelegramCfg();
  } catch { telegramForm.value.msg = 'Fehler.'; }
  setTimeout(() => { telegramForm.value.msg = ''; }, 4000);
}

// ─── Strompreis ────────────────────────────────────────────────────────────
const draftElectricity = reactive({});

// ─── Admin Status + Externe Keys ───────────────────────────────────────────
const adminStatus = ref({ ocm: null, here: null, grok: null, abrp: null, smtp: null });
const draftAdmin  = ref({ ocm_key: '', here_key: '', xai_key: '', abrp_key: '',
  alert_email: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_from: '' });

async function loadAdminStatus() {
  const [ocm, here, grok, smtpCfg, monCfg, abrp] = await Promise.all([
    api.get('/routing/ocm-config').then(r => r.data).catch(() => null),
    api.get('/routing/traffic-config').then(r => r.data).catch(() => null),
    api.get('/grok/config').then(r => r.data).catch(() => null),
    api.get('/system/smtp-config').then(r => r.data).catch(() => null),
    api.get('/system/monitoring-config').then(r => r.data).catch(() => null),
    api.get('/system/abrp-config').then(r => r.data).catch(() => null),
  ]);
  adminStatus.value = { ocm, here, grok, smtp: smtpCfg, abrp };
  draftAdmin.value.alert_email = monCfg?.alert_email || '';
  draftAdmin.value.smtp_host   = smtpCfg?.host       || '';
  draftAdmin.value.smtp_port   = smtpCfg?.port       || '587';
  draftAdmin.value.smtp_user   = smtpCfg?.user       || '';
  draftAdmin.value.smtp_from   = smtpCfg?.from       || '';
}

// ─── Navigation ────────────────────────────────────────────────────────────
function next() { step.value = Math.min(step.value + 1, STEPS.length - 1); }
function back() { step.value = Math.max(step.value - 1, 0); }
function skip() { next(); }

async function saveAndNext() {
  saving.value = true;
  try {
    if (currentId.value === 'credentials') {
      await saveCredentials();
    } else if (currentId.value === 'vapid' && vapidForm.value.contact) {
      await api.put('/system/vapid-config', { contact: vapidForm.value.contact }).catch(() => {});
    } else if (currentId.value === 'telegram') {
      await saveTelegram();
    } else if (currentId.value === 'monitoring' || currentId.value === 'external' || currentId.value === 'electricity') {
      await saveAdminData();
    }
    next();
  } finally {
    saving.value = false;
  }
}

async function saveAdminData() {
  const calls = [];

  for (const [vid, rate] of Object.entries(draftElectricity)) {
    if (rate == null || isNaN(rate)) continue;
    const v = vehicles.value.find(x => String(x.id) === String(vid));
    if (!v || String(v.electricity_rate_kwh) === String(rate)) continue;
    calls.push(api.put(`/vehicles/${vid}`, { electricity_rate_kwh: rate }));
  }

  if (draftAdmin.value.ocm_key.trim())
    calls.push(api.put('/routing/ocm-config',     { ocm_api_key:  draftAdmin.value.ocm_key.trim() }));
  if (draftAdmin.value.here_key.trim())
    calls.push(api.put('/routing/traffic-config', { here_api_key: draftAdmin.value.here_key.trim() }));
  if (draftAdmin.value.xai_key.trim())
    calls.push(api.put('/grok/config',            { xai_api_key:  draftAdmin.value.xai_key.trim() }));
  if (draftAdmin.value.abrp_key.trim())
    calls.push(api.put('/system/abrp-config',     { abrp_api_key: draftAdmin.value.abrp_key.trim() }));

  calls.push(api.put('/system/monitoring-config', {
    alert_email:  draftAdmin.value.alert_email,
    heal_enabled: true,
  }));

  if (draftAdmin.value.smtp_host.trim()) {
    const smtpPayload = {
      host: draftAdmin.value.smtp_host,
      port: draftAdmin.value.smtp_port,
      user: draftAdmin.value.smtp_user,
      from: draftAdmin.value.smtp_from,
    };
    if (draftAdmin.value.smtp_password.trim())
      smtpPayload.password = draftAdmin.value.smtp_password.trim();
    calls.push(api.put('/system/smtp-config', smtpPayload));
  }

  await Promise.all(calls);
}

// ─── onMounted ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    loadCredsCfg(),
    checkOauthStatus(),
    loadVehicles(),
    loadTelemetryStatus(),
    loadVapidCfg(),
    loadTelegramCfg(),
    loadAdminStatus(),
  ]);
});
</script>

<script>
const StepHeader = {
  props: ['title', 'question'],
  template: `
    <div>
      <h3 class="text-lg font-bold text-white">{{ title }}</h3>
      <p class="text-sm text-gray-300 mt-1">{{ question }}</p>
    </div>
  `,
};
export default { components: { StepHeader } };
</script>

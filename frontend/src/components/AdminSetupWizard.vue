<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col"
           style="max-height: 90vh">

        <!-- Header -->
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-800 shrink-0">
          <div class="min-w-0">
            <h2 class="font-bold text-lg">{{ $t('adminSetup.title') }}</h2>
            <p v-if="step > 0 && !isLast" class="text-xs text-gray-400 mt-0.5">
              {{ $t('adminSetup.step', { n: step, total: STEPS.length - 2 }) }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <!-- Sprach-Switcher: erbt die im Profil/Tenant gesetzte Sprache
                 und erlaubt im Wizard sofortigen Override. -->
            <LangSwitcher compact v-tooltip="$t('lang.switcherHint')" />
            <button @click="$emit('close')"
                    class="text-gray-500 hover:text-white text-2xl leading-none transition">×</button>
          </div>
        </div>

        <!-- Fortschrittsbalken -->
        <div v-if="step > 0 && !isLast" class="h-1 bg-gray-800 shrink-0">
          <div class="h-full bg-tesla-red transition-all duration-300"
               :style="{ width: (step / (STEPS.length - 2) * 100) + '%' }"></div>
        </div>

        <!-- Inhalt -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- Done-Banner: zeigt sich automatisch, wenn der aktuelle Schritt
               laut /system/wizard-prefill bereits eingerichtet ist. So muss
               der Admin den Schritt nicht „leer" durchklicken.
               Sonderfall ownerSkip: Schritte die Fleet API brauchen (Virtual
               Key, Telemetry) sind im Owner-Mode nicht aktivierbar — Banner
               sagt ehrlich „nicht erforderlich" statt „eingerichtet". -->
          <div v-if="step > 0 && !isLast && stepStatus(currentId)?.done"
               class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300 flex items-center gap-2">
            <span aria-hidden="true">{{ stepStatus(currentId)?.ownerSkip ? '⏭' : '✓' }}</span>
            <span class="flex-1">{{ stepStatus(currentId)?.ownerSkip ? $t('adminSetup.done.ownerSkipBanner') : $t('adminSetup.done.banner') }}</span>
            <span v-if="stepStatus(currentId)?.auto"
                  class="text-xs text-blue-300/80"
                  v-tooltip="$t('adminSetup.welcome.autoTooltip')">
              {{ $t('adminSetup.welcome.autoBadge') }}
            </span>
          </div>

          <!-- STEP: welcome -->
          <template v-if="currentId === 'welcome'">
            <div class="text-center space-y-4 py-4">
              <div class="text-5xl">🛠️</div>
              <h3 class="text-xl font-bold">{{ $t('adminSetup.welcome.title') }}</h3>
              <p class="text-gray-300 text-sm leading-relaxed">
                {{ $t('adminSetup.welcome.body') }}
              </p>
              <!-- Dynamische Status-Übersicht: Prefill liefert pro Schritt
                   einen Done-Flag. Wir zeigen ✓ (erledigt, ggf. „Auto"),
                   ⏳ (kann jetzt) oder ○ (offen). -->
              <div class="bg-gray-800 rounded-xl p-4 text-left space-y-2 text-sm">
                <div v-for="row in welcomeStatus" :key="row.id"
                     class="flex items-center gap-2"
                     :class="row.done ? 'text-green-300' : 'text-gray-300'">
                  <span class="w-4 text-center" aria-hidden="true">{{ row.done ? '✓' : '○' }}</span>
                  <span class="flex-1">{{ $t(row.label) }}</span>
                  <span v-if="row.auto" class="text-xs text-blue-300/80"
                        v-tooltip="$t('adminSetup.welcome.autoTooltip')">
                    {{ $t('adminSetup.welcome.autoBadge') }}
                  </span>
                  <span v-else-if="row.optional && !row.done"
                        class="text-xs text-gray-500">{{ $t('adminSetup.welcome.optional') }}</span>
                </div>
              </div>
              <p v-if="prefillSummary" class="text-xs text-gray-400">
                {{ prefillSummary }}
              </p>
            </div>
          </template>

          <!-- STEP: credentials -->
          <template v-else-if="currentId === 'credentials'">
            <StepHeader :title="$t('adminSetup.credentials.title')"
              :question="$t('adminSetup.credentials.question')" />
            <div v-if="credsCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
              {{ $t('adminSetup.credentials.fromEnvBanner') }}
            </div>
            <div class="space-y-3">
              <div>
                <label class="label">{{ $t('adminSetup.credentials.clientId') }} <a href="https://developer.tesla.com/" target="_blank" rel="noopener" class="text-xs text-blue-400 ml-1">developer.tesla.com ↗</a></label>
                <input v-model="credsForm.client_id" type="text" placeholder="abc123def456"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div>
                <label class="label">{{ $t('adminSetup.credentials.clientSecret') }}</label>
                <input v-model="credsForm.client_secret" type="password"
                  :placeholder="credsCfg.client_secret_set ? $t('adminSetup.credentials.secretSetPlaceholder') : $t('adminSetup.credentials.secretPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div>
                <label class="label">{{ $t('adminSetup.credentials.audience') }}</label>
                <input v-model="credsForm.audience" type="text"
                  placeholder="https://fleet-api.prd.eu.vn.cloud.tesla.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <p class="text-xs text-gray-500 mt-1">{{ $t('adminSetup.credentials.audienceHint') }}</p>
              </div>
            </div>
            <p v-if="credsMsg" class="text-sm" :class="credsOk ? 'text-green-400' : 'text-red-400'">{{ credsMsg }}</p>
          </template>

          <!-- STEP: oauth -->
          <template v-else-if="currentId === 'oauth'">
            <StepHeader :title="$t('adminSetup.oauth.title')" :question="$t('adminSetup.oauth.question')" />
            <div class="flex gap-2">
              <button @click="ownerApiTab = false"
                class="flex-1 text-xs rounded-lg px-3 py-2 transition"
                :class="!ownerApiTab ? 'bg-tesla-red text-white' : 'bg-gray-800 text-gray-400 hover:text-white'">
                {{ $t('adminSetup.oauth.tabFleet') }}
              </button>
              <button @click="ownerApiTab = true"
                class="flex-1 text-xs rounded-lg px-3 py-2 transition"
                :class="ownerApiTab ? 'bg-tesla-red text-white' : 'bg-gray-800 text-gray-400 hover:text-white'">
                {{ $t('adminSetup.oauth.tabOwner') }}
              </button>
            </div>
            <div v-if="!ownerApiTab" class="card space-y-4">
              <div class="flex items-center gap-3">
                <span v-if="oauthStatus === 'connected' && oauthMode !== 'owner'" class="text-2xl">✅</span>
                <span v-else-if="oauthStatus === 'checking'" class="text-2xl animate-pulse">🔄</span>
                <span v-else class="text-2xl">❌</span>
                <div>
                  <p class="text-sm font-semibold text-white">
                    {{ oauthStatus === 'connected' && oauthMode !== 'owner' ? $t('adminSetup.oauth.connected') : $t('adminSetup.oauth.notConnected') }}
                  </p>
                  <p class="text-xs text-gray-400">{{ $t('adminSetup.oauth.hint') }}</p>
                </div>
              </div>
              <div v-if="!(oauthStatus === 'connected' && oauthMode !== 'owner')" class="flex gap-2">
                <button @click="openOauth" :disabled="oauthOpening" class="flex-1 btn-primary text-sm">
                  {{ oauthOpening ? $t('adminSetup.oauth.opening') : $t('adminSetup.oauth.connectBtn') }}
                </button>
                <button @click="checkOauthStatus" class="btn-secondary text-sm px-4">↻</button>
              </div>
              <p v-if="oauthStatus === 'connected' && oauthMode !== 'owner'" class="text-xs text-green-400">
                {{ $t('adminSetup.oauth.activeHint') }}
              </p>
            </div>
            <div v-else class="card space-y-4">
              <div class="bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-300">
                <p>{{ $t('adminSetup.oauth.ownerInfo') }}</p>
              </div>
              <div v-if="oauthStatus === 'connected' && oauthMode === 'owner'" class="space-y-3">
                <div class="flex items-start gap-3">
                  <span class="text-2xl shrink-0">{{ ownerPaused ? '⏸️' : '⚠️' }}</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">
                      {{ ownerPaused ? $t('adminSetup.oauth.ownerPausedTitle') : $t('adminSetup.oauth.ownerBlockedTitle') }}
                    </p>
                    <p class="text-xs text-gray-400 mt-1 whitespace-pre-line">
                      {{ ownerPaused ? $t('adminSetup.oauth.ownerPausedHint') : $t('adminSetup.oauth.ownerBlockedHint') }}
                    </p>
                  </div>
                </div>
                <button v-if="!ownerPaused" @click="pauseOwnerApi" :disabled="ownerToggling"
                  class="w-full btn-secondary text-sm py-2">
                  {{ ownerToggling ? '…' : $t('adminSetup.oauth.ownerPauseBtn') }}
                </button>
                <button v-else @click="resumeOwnerApi" :disabled="ownerToggling"
                  class="w-full btn-primary text-sm py-2">
                  {{ ownerToggling ? '…' : $t('adminSetup.oauth.ownerResumeBtn') }}
                </button>
              </div>
              <template v-else>
                <button @click="openOwnerOauth" :disabled="ownerOauthOpening"
                  class="w-full btn-primary text-sm">
                  {{ ownerOauthOpening ? $t('adminSetup.oauth.ownerOpening') : $t('adminSetup.oauth.ownerConnectBtn') }}
                </button>
                <button @click="checkOauthStatus" class="w-full btn-secondary text-sm py-2">↻ {{ $t('adminSetup.oauth.refresh') }}</button>
                <p v-if="ownerApiError" class="text-xs text-red-400">{{ ownerApiError }}</p>
              </template>
            </div>
          </template>

          <!-- STEP: vehicles — Tesla-Sync ODER manuell anlegen -->
          <template v-else-if="currentId === 'vehicles'">
            <StepHeader :title="$t('adminSetup.vehicles.title')" :question="$t('adminSetup.vehicles.question')" />
            <div class="card space-y-4">
              <!-- Erklärung: zwei Wege -->
              <div class="bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-100 whitespace-pre-line">
                {{ $t('adminSetup.vehicles.intro') }}
              </div>

              <!-- Bestehende Fahrzeuge -->
              <div v-if="vehicles.length > 0" class="space-y-2">
                <div v-for="v in vehicles" :key="v.id" class="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                  <span class="text-xl">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ v.vin }}{{ v.tesla_id?.startsWith('manual-') ? ' · manuell' : '' }}</p>
                  </div>
                  <span class="text-xs text-green-400">✓</span>
                </div>
              </div>
              <p v-else class="text-sm text-gray-400 text-center py-2">{{ $t('adminSetup.vehicles.none') }}</p>

              <!-- Zwei-Spalten-Karte: Sync vs Manuell -->
              <div class="grid sm:grid-cols-2 gap-3">
                <!-- A: Tesla-Sync -->
                <div class="border border-gray-700 rounded-lg p-3 space-y-2">
                  <p class="text-sm font-semibold text-white">☁ {{ $t('adminSetup.vehicles.syncTitle') }}</p>
                  <p class="text-[11px] text-gray-400">{{ $t('adminSetup.vehicles.syncHint') }}</p>
                  <button @click="syncVehicles" :disabled="vehicleSyncing"
                          class="w-full btn-primary text-xs py-1.5">
                    {{ vehicleSyncing ? '…' : (vehicles.length ? $t('adminSetup.vehicles.resyncBtn') : $t('adminSetup.vehicles.syncBtn')) }}
                  </button>
                </div>

                <!-- B: Manuell anlegen -->
                <div class="border border-gray-700 rounded-lg p-3 space-y-2">
                  <p class="text-sm font-semibold text-white">✍ {{ $t('adminSetup.vehicles.manualTitle') }}</p>
                  <p class="text-[11px] text-gray-400">{{ $t('adminSetup.vehicles.manualHint') }}</p>
                  <button v-if="!manualVehicleForm" @click="manualVehicleForm = { display_name:'', vin:'', model:'', license_plate:'', initial_odometer_km:null }"
                          class="w-full btn-secondary text-xs py-1.5">
                    + {{ $t('adminSetup.vehicles.manualBtn') }}
                  </button>
                </div>
              </div>

              <!-- Manuelles Formular wenn aktiv -->
              <div v-if="manualVehicleForm" class="card bg-gray-800/40 p-4 space-y-3">
                <h4 class="text-sm font-semibold">{{ $t('adminSetup.vehicles.manualFormTitle') }}</h4>
                <div class="grid sm:grid-cols-2 gap-3">
                  <label class="block text-xs">
                    <span class="text-gray-400">{{ $t('adminSetup.vehicles.fName') }} *</span>
                    <input v-model="manualVehicleForm.display_name" required
                           :placeholder="$t('adminSetup.vehicles.fNamePlaceholder')"
                           class="mt-1 w-full bg-gray-700 rounded px-2 py-1 text-sm" />
                  </label>
                  <label class="block text-xs">
                    <span class="text-gray-400">{{ $t('adminSetup.vehicles.fPlate') }}</span>
                    <input v-model="manualVehicleForm.license_plate"
                           placeholder="z.B. M-AB 1234"
                           class="mt-1 w-full bg-gray-700 rounded px-2 py-1 text-sm" />
                  </label>
                  <label class="block text-xs">
                    <span class="text-gray-400">{{ $t('adminSetup.vehicles.fVin') }}</span>
                    <input v-model="manualVehicleForm.vin" maxlength="17"
                           :placeholder="$t('adminSetup.vehicles.fVinPlaceholder')"
                           class="mt-1 w-full bg-gray-700 rounded px-2 py-1 text-sm font-mono" />
                    <span class="text-[10px] text-gray-500">{{ $t('adminSetup.vehicles.fVinHint') }}</span>
                  </label>
                  <label class="block text-xs">
                    <span class="text-gray-400">{{ $t('adminSetup.vehicles.fModel') }}</span>
                    <input v-model="manualVehicleForm.model"
                           placeholder="z.B. Model Y Long Range"
                           class="mt-1 w-full bg-gray-700 rounded px-2 py-1 text-sm" />
                  </label>
                  <label class="block text-xs col-span-2">
                    <span class="text-gray-400">{{ $t('adminSetup.vehicles.fInitialKm') }}</span>
                    <input v-model.number="manualVehicleForm.initial_odometer_km" type="number" step="1"
                           placeholder="0"
                           class="mt-1 w-full bg-gray-700 rounded px-2 py-1 text-sm" />
                    <span class="text-[10px] text-gray-500">{{ $t('adminSetup.vehicles.fInitialKmHint') }}</span>
                  </label>
                </div>
                <div class="flex gap-2 justify-end">
                  <button @click="manualVehicleForm = null" class="btn-secondary text-xs px-3 py-1">{{ $t('common.cancel') }}</button>
                  <button @click="submitManualVehicle"
                          :disabled="!manualVehicleForm.display_name?.trim() || manualVehicleSaving"
                          class="btn-primary text-xs px-3 py-1">
                    {{ manualVehicleSaving ? '…' : $t('adminSetup.vehicles.manualSave') }}
                  </button>
                </div>
              </div>

              <p v-if="vehicleSyncError" class="text-xs text-red-400">{{ vehicleSyncError }}</p>
            </div>
          </template>

          <!-- STEP: owntracks — Smartphone-GPS-Tracking als Fleet-API-Alternative -->
          <template v-else-if="currentId === 'owntracks'">
            <StepHeader :title="$t('adminSetup.owntracks.title')" :question="$t('adminSetup.owntracks.question')" />
            <div class="card space-y-4">
              <div class="bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2 text-xs text-amber-200 whitespace-pre-line">
                {{ $t('adminSetup.owntracks.intro') }}
              </div>

              <!-- Geräte-Liste -->
              <div v-if="owntracksDevices.length > 0" class="space-y-2">
                <p class="text-xs font-medium text-gray-400">{{ $t('adminSetup.owntracks.devicesHeading') }}</p>
                <div v-for="d in owntracksDevices" :key="d.id"
                     class="bg-gray-800 rounded-lg p-3 flex items-start gap-3 text-xs">
                  <span class="text-xl shrink-0">{{ d.is_active ? '📱' : '⏸' }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-white">{{ d.label }}</p>
                    <p class="text-gray-400 mt-0.5">
                      🚗 {{ owntracksVehicleLabel(d.vehicle_id) }} ·
                      👤 {{ owntracksUserLabel(d.user_id) }} ·
                      📁 {{ $t('adminSetup.owntracks.tripTypes.' + d.default_trip_type) }}
                    </p>
                    <p class="text-gray-500 text-[10px] mt-0.5">
                      {{ d.last_ping_at ? $t('adminSetup.owntracks.lastPing', { time: owntracksRelative(d.last_ping_at) }) : $t('adminSetup.owntracks.neverPinged') }}
                    </p>
                  </div>
                  <div class="flex flex-col gap-1 shrink-0">
                    <button @click="toggleOwntracksDevice(d)"
                            class="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white">
                      {{ d.is_active ? '⏸' : '▶' }}
                    </button>
                    <button @click="deleteOwntracksDevice(d)"
                            class="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-900/40">✕</button>
                  </div>
                </div>
              </div>
              <p v-else-if="!owntracksShowForm && !owntracksCreated" class="text-xs text-gray-500">
                {{ $t('adminSetup.owntracks.noDevices') }}
              </p>

              <!-- Webhook-URL einmalig nach Create — mit QR-Code für 1-Tap-Setup -->
              <div v-if="owntracksCreated" class="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-4 space-y-3">
                <p class="text-sm font-semibold text-emerald-300">{{ $t('adminSetup.owntracks.createdTitle') }}</p>

                <!-- Primärer Weg: QR-Code scannen mit iPhone-Kamera -->
                <div class="bg-white rounded-lg p-3 inline-block">
                  <img :src="owntracksQrUrl" alt="OwnTracks QR-Code" class="w-56 h-56 block" />
                </div>
                <p class="text-xs text-emerald-100 whitespace-pre-line">{{ $t('adminSetup.owntracks.qrInstructions') }}</p>

                <!-- Backup: manueller Setup mit Webhook-URL -->
                <details class="text-xs">
                  <summary class="cursor-pointer text-emerald-300/80 hover:text-emerald-200">
                    {{ $t('adminSetup.owntracks.manualSetup') }}
                  </summary>
                  <div class="mt-2 space-y-2">
                    <p class="text-emerald-100 whitespace-pre-line">{{ $t('adminSetup.owntracks.createdHint') }}</p>
                    <div class="flex gap-2 items-center">
                      <code class="flex-1 bg-gray-950 rounded px-2 py-1.5 font-mono text-[10px] select-all break-all">{{ owntracksCreated.webhook_url }}</code>
                      <button @click="copyOwntracksUrl"
                              class="text-xs px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white shrink-0">
                        {{ owntracksCopied ? '✓' : $t('common.copy') }}
                      </button>
                    </div>
                    <a :href="owntracksOtrcUrl" target="_blank" rel="noopener"
                       class="inline-block text-emerald-300 hover:underline">
                      ⬇ {{ $t('adminSetup.owntracks.downloadOtrc') }}
                    </a>
                  </div>
                </details>

                <button @click="owntracksCreated = null"
                        class="text-xs text-gray-400 hover:text-white">
                  {{ $t('common.close') }}
                </button>
              </div>

              <!-- Form -->
              <div v-if="owntracksShowForm" class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                <label class="block">
                  <span class="text-xs font-medium text-gray-400">{{ $t('adminSetup.owntracks.form.label') }}</span>
                  <input v-model="owntracksForm.label" required
                         class="mt-1 input text-sm w-full"
                         :placeholder="$t('adminSetup.owntracks.form.labelPlaceholder')" />
                </label>
                <label class="block">
                  <span class="text-xs font-medium text-gray-400">{{ $t('adminSetup.owntracks.form.vehicle') }}</span>
                  <select v-model="owntracksForm.vehicle_id" class="mt-1 input text-sm w-full">
                    <option v-for="v in vehicles" :key="v.id" :value="v.id">
                      {{ v.display_name || v.vin }}
                    </option>
                  </select>
                  <p v-if="vehicles.length === 0" class="text-[11px] text-amber-400 mt-1">{{ $t('adminSetup.owntracks.form.noVehicles') }}</p>
                </label>
                <label class="block">
                  <span class="text-xs font-medium text-gray-400">{{ $t('adminSetup.owntracks.form.driver') }}</span>
                  <select v-model="owntracksForm.user_id" class="mt-1 input text-sm w-full">
                    <option v-for="u in owntracksUsers" :key="u.id" :value="u.id">{{ u.username }}</option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-xs font-medium text-gray-400">{{ $t('adminSetup.owntracks.form.tripType') }}</span>
                  <select v-model="owntracksForm.default_trip_type" class="mt-1 input text-sm w-full">
                    <option value="business">{{ $t('adminSetup.owntracks.tripTypes.business') }}</option>
                    <option value="private">{{ $t('adminSetup.owntracks.tripTypes.private') }}</option>
                    <option value="commute">{{ $t('adminSetup.owntracks.tripTypes.commute') }}</option>
                  </select>
                  <p class="text-[11px] text-gray-500 mt-1">{{ $t('adminSetup.owntracks.form.tripTypeHint') }}</p>
                </label>
                <div class="flex gap-2">
                  <button @click="createOwntracksDevice"
                          :disabled="!canCreateOwntracksDevice || owntracksCreating"
                          class="flex-1 btn-primary text-sm">
                    {{ owntracksCreating ? '…' : $t('adminSetup.owntracks.createBtn') }}
                  </button>
                  <button @click="owntracksShowForm = false" class="btn-secondary text-sm px-4">
                    {{ $t('common.cancel') }}
                  </button>
                </div>
              </div>
              <button v-else @click="openOwntracksForm"
                      class="w-full btn-primary text-sm py-2">
                + {{ $t('adminSetup.owntracks.addBtn') }}
              </button>

              <p v-if="owntracksError" class="text-xs text-red-400">{{ owntracksError }}</p>
              <p class="text-[11px] text-gray-500">
                {{ $t('adminSetup.owntracks.skipHint') }}
                <a href="https://owntracks.org" target="_blank" rel="noopener" class="text-blue-400 hover:underline">owntracks.org ↗</a>
              </p>
            </div>
          </template>

          <!-- STEP: virtualkey -->
          <template v-else-if="currentId === 'virtualkey'">
            <StepHeader :title="$t('adminSetup.virtualKey.title')" :question="$t('adminSetup.virtualKey.question')" />
            <!-- Owner-Mode: Virtual Key braucht Fleet API, hier kein Setup möglich.
                 Ehrliche Erklärung statt leere Form. -->
            <div v-if="oauthMode === 'owner'" class="card bg-amber-900/15 border border-amber-700/40 text-sm text-amber-100 whitespace-pre-line">
              {{ $t('adminSetup.virtualKey.ownerSkipBody') }}
            </div>
            <div v-else class="card space-y-4">
              <div v-if="telemetryStatus === null" class="text-sm text-gray-400">{{ $t('adminSetup.virtualKey.loading') }}</div>
              <template v-else>
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ telemetryStatus.virtual_key_exists ? '✅' : '⚠️' }}</span>
                  <div>
                    <p class="text-sm font-semibold text-white">
                      {{ telemetryStatus.virtual_key_exists ? $t('adminSetup.virtualKey.exists') : $t('adminSetup.virtualKey.missing') }}
                    </p>
                    <p v-if="telemetryStatus.virtual_key_exists && telemetryStatus.virtual_key_created_at" class="text-xs text-gray-400">
                      {{ $t('adminSetup.virtualKey.createdAt') }}: {{ new Date(telemetryStatus.virtual_key_created_at * 1000).toLocaleDateString() }}
                    </p>
                  </div>
                </div>
                <div v-if="!telemetryStatus.virtual_key_exists" class="space-y-3">
                  <p class="text-xs text-gray-400">{{ $t('adminSetup.virtualKey.openOnTesla') }}</p>
                  <div class="bg-gray-950 rounded-lg p-3 space-y-2">
                    <p class="text-xs text-gray-500">{{ $t('adminSetup.virtualKey.regUrl') }}</p>
                    <p class="text-xs font-mono text-amber-300 break-all select-all">{{ telemetryStatus.registration_url }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button @click="copyVkUrl" class="flex-1 btn-secondary text-sm">
                      {{ vkCopied ? $t('adminSetup.virtualKey.copied') : $t('adminSetup.virtualKey.copyBtn') }}
                    </button>
                    <a :href="telemetryStatus.registration_url" target="_blank" rel="noopener"
                      class="btn-primary text-sm px-4 no-underline">{{ $t('adminSetup.virtualKey.open') }}</a>
                  </div>
                  <button @click="loadTelemetryStatus" class="btn-secondary text-sm w-full">{{ $t('adminSetup.virtualKey.recheck') }}</button>
                </div>
              </template>
            </div>
          </template>

          <!-- STEP: telemetry -->
          <template v-else-if="currentId === 'telemetry'">
            <StepHeader :title="$t('adminSetup.telemetry.title')" :question="$t('adminSetup.telemetry.question')" />
            <!-- Owner-Mode: Telemetry-Stream braucht Fleet API + Virtual Key,
                 hier kein Setup möglich. Ehrliche Erklärung statt leere Form. -->
            <div v-if="oauthMode === 'owner'" class="card bg-amber-900/15 border border-amber-700/40 text-sm text-amber-100 whitespace-pre-line">
              {{ $t('adminSetup.telemetry.ownerSkipBody') }}
            </div>
            <div v-else-if="telemetryStatus === null" class="text-sm text-gray-400">{{ $t('adminSetup.virtualKey.loading') }}</div>
            <div v-else class="space-y-3">
              <div v-if="!telemetryStatus.virtual_key_exists" class="card bg-amber-900/20 border border-amber-700/40 text-sm text-amber-300">
                {{ $t('adminSetup.telemetry.needsVkey') }}
              </div>
              <div v-for="v in telemetryStatus.vehicles ?? []" :key="v.id" class="card space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ v.vin }}</p>
                  </div>
                  <span :class="telemetryBadgeClass(v.status)" class="text-xs px-2 py-0.5 rounded-full font-medium">
                    {{ telemetryStatusLabel(v.status) }}
                  </span>
                </div>
                <button v-if="v.status === 'not_registered' || v.status === 'error'"
                  @click="configureTelemetry(v.vin)" :disabled="telemetryConfiguring[v.vin]"
                  class="btn-primary text-xs w-full py-1.5">
                  {{ telemetryConfiguring[v.vin] ? '…' : $t('adminSetup.telemetry.activateBtn') }}
                </button>
              </div>
              <div v-if="!telemetryStatus.vehicles?.length" class="text-sm text-gray-400 text-center py-4">{{ $t('adminSetup.telemetry.noVehicles') }}</div>
              <button @click="loadTelemetryStatus" class="btn-secondary text-sm w-full">{{ $t('adminSetup.telemetry.refresh') }}</button>
            </div>
          </template>

          <!-- STEP: vapid -->
          <template v-else-if="currentId === 'vapid'">
            <StepHeader :title="$t('adminSetup.vapid.title')" :question="$t('adminSetup.vapid.question')" />
            <div v-if="vapidCfg.from_env" class="text-xs bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-blue-300">
              {{ $t('adminSetup.vapid.fromEnvBanner') }}
            </div>
            <div v-if="vapidCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
              {{ $t('adminSetup.vapid.configured') }}
            </div>
            <div class="space-y-3">
              <div>
                <label class="label">{{ $t('adminSetup.vapid.contactLabel') }}</label>
                <input v-model="vapidForm.contact" type="email" placeholder="mailto:admin@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="generateVapid" :disabled="vapidForm.generating" class="flex-1 btn-primary text-sm">
                {{ vapidForm.generating ? '…' : (vapidCfg.configured ? $t('adminSetup.vapid.regenerate') : $t('adminSetup.vapid.generate')) }}
              </button>
            </div>
            <p v-if="vapidForm.msg" class="text-sm" :class="vapidForm.ok ? 'text-green-400' : 'text-red-400'">{{ vapidForm.msg }}</p>
            <p v-if="!vapidCfg.configured" class="text-xs text-gray-500">{{ $t('adminSetup.vapid.skipHint') }}</p>
          </template>

          <!-- STEP: telegram -->
          <template v-else-if="currentId === 'telegram'">
            <StepHeader :title="$t('adminSetup.telegram.title')" :question="$t('adminSetup.telegram.question')" />
            <div v-if="telegramCfg.configured" class="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 text-sm text-green-300">
              {{ $t('adminSetup.telegram.configured') }}
            </div>
            <div class="space-y-3">
              <div>
                <label class="label">{{ $t('adminSetup.telegram.botToken') }} <a href="https://t.me/BotFather" target="_blank" rel="noopener" class="text-xs text-blue-400 ml-1">@BotFather ↗</a></label>
                <input v-model="telegramForm.bot_token" type="password"
                  :placeholder="telegramCfg.configured ? $t('adminSetup.telegram.tokenSetPlaceholder') : $t('adminSetup.telegram.tokenPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div>
                <label class="label">{{ $t('adminSetup.telegram.webhookUrl') }}</label>
                <input v-model="telegramForm.webhook_url" type="url"
                  placeholder="https://deine-app.example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <p class="text-xs text-gray-500 mt-1">{{ $t('adminSetup.telegram.webhookHint') }}</p>
              </div>
            </div>
            <p v-if="telegramForm.msg" class="text-sm text-amber-300">{{ telegramForm.msg }}</p>
            <p class="text-xs text-gray-500">{{ $t('adminSetup.telegram.skipHint') }}</p>
          </template>

          <!-- STEP: electricity -->
          <template v-else-if="currentId === 'electricity'">
            <StepHeader :title="$t('adminSetup.electricity.title')" :question="$t('adminSetup.electricity.question')" />
            <div class="space-y-3">
              <div v-if="vehicles.length === 0" class="text-sm text-gray-400 text-center py-4">{{ $t('adminSetup.electricity.noVehicles') }}</div>
              <div v-for="v in vehicles" :key="v.id" class="card space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400">{{ $t('adminSetup.electricity.currentLabel') }} <span class="text-gray-200">{{ v.electricity_rate_kwh != null ? v.electricity_rate_kwh + ' €/kWh' : $t('adminSetup.electricity.notSet') }}</span></p>
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
            <StepHeader :title="$t('adminSetup.external.title')" :question="$t('adminSetup.external.question')" />
            <div class="space-y-4">
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">{{ $t('adminSetup.external.ocmName') }}</p>
                  <span v-if="adminStatus.ocm?.configured" class="text-xs text-green-400">{{ $t('adminSetup.external.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('adminSetup.external.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('adminSetup.external.ocmHint') }}</p>
                <input v-model="draftAdmin.ocm_key" type="password"
                  :placeholder="adminStatus.ocm?.configured ? $t('adminSetup.external.keyChangePlaceholder') : $t('adminSetup.external.ocmPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">{{ $t('adminSetup.external.hereName') }}</p>
                  <span v-if="adminStatus.here?.configured" class="text-xs text-green-400">{{ $t('adminSetup.external.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('adminSetup.external.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('adminSetup.external.hereHint') }}</p>
                <input v-model="draftAdmin.here_key" type="password"
                  :placeholder="adminStatus.here?.configured ? $t('adminSetup.external.keyChangePlaceholder') : $t('adminSetup.external.herePlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <!-- KI-Provider: Ollama (lokal) vs Grok (Cloud) — vor Grok-Card -->
              <div class="card space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">🤖 {{ $t('adminSetup.external.aiProvider') }}</p>
                  <span v-if="aiConfig.provider === 'ollama'" class="text-xs text-green-400">🏠 Ollama (lokal)</span>
                  <span v-else-if="aiConfig.provider === 'grok'" class="text-xs text-amber-300">☁ Grok (Cloud)</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('adminSetup.external.aiOff') }}</span>
                </div>
                <p class="text-xs text-gray-400 whitespace-pre-line">{{ $t('adminSetup.external.aiProviderHint') }}</p>

                <div class="grid grid-cols-3 gap-2">
                  <button @click="aiConfig.provider = 'ollama'" type="button"
                          :class="aiConfig.provider === 'ollama' ? 'border-tesla-red bg-tesla-red/10 text-white' : 'border-gray-700 text-gray-400 hover:text-white'"
                          class="border-2 rounded-lg p-2 text-xs">
                    <div class="font-semibold">🏠 Ollama</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">lokal · datensouverän</div>
                  </button>
                  <button @click="aiConfig.provider = 'grok'" type="button"
                          :class="aiConfig.provider === 'grok' ? 'border-tesla-red bg-tesla-red/10 text-white' : 'border-gray-700 text-gray-400 hover:text-white'"
                          class="border-2 rounded-lg p-2 text-xs">
                    <div class="font-semibold">☁ Grok</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">xAI Cloud · pro Token</div>
                  </button>
                  <button @click="aiConfig.provider = 'none'" type="button"
                          :class="aiConfig.provider === 'none' ? 'border-tesla-red bg-tesla-red/10 text-white' : 'border-gray-700 text-gray-400 hover:text-white'"
                          class="border-2 rounded-lg p-2 text-xs">
                    <div class="font-semibold">⊝ Aus</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">kein KI-Chat</div>
                  </button>
                </div>

                <!-- Ollama-Settings (nur sichtbar wenn Ollama gewählt) -->
                <div v-if="aiConfig.provider === 'ollama'" class="space-y-2 border-t border-gray-700 pt-3">
                  <label class="block text-xs">
                    <span class="text-gray-400">{{ $t('adminSetup.external.ollamaUrl') }}</span>
                    <input v-model="aiConfig.ollama_url" type="url"
                           placeholder="http://localhost:11434"
                           class="mt-1 w-full bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                  </label>
                  <label class="block text-xs">
                    <span class="text-gray-400">{{ $t('adminSetup.external.ollamaModel') }}</span>
                    <input v-model="aiConfig.ollama_model"
                           placeholder="qwen2.5:3b"
                           class="mt-1 w-full bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                    <span class="text-[10px] text-gray-500 mt-0.5 block whitespace-pre-line">{{ $t('adminSetup.external.ollamaModelHint') }}</span>
                  </label>
                  <button @click="testOllamaHealth" :disabled="aiOllamaTesting" type="button"
                          class="text-xs bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5 disabled:opacity-50">
                    {{ aiOllamaTesting ? '⟳ ' + $t('common.loading') : '🔌 ' + $t('adminSetup.external.ollamaTest') }}
                  </button>
                  <div v-if="aiOllamaHealth" class="text-xs space-y-1 pt-1">
                    <p v-if="aiOllamaHealth.ok" class="text-green-400">
                      ✓ {{ $t('adminSetup.external.ollamaOk') }}
                      <span v-if="aiOllamaHealth.configured_model_available">— {{ aiConfig.ollama_model }} verfügbar</span>
                      <span v-else class="text-amber-300">— Modell {{ aiConfig.ollama_model }} fehlt</span>
                    </p>
                    <p v-else class="text-red-400">✗ {{ aiOllamaHealth.error }}</p>
                    <p v-if="aiOllamaHealth.models?.length" class="text-gray-500 text-[10px]">
                      {{ $t('adminSetup.external.ollamaInstalled') }}: {{ aiOllamaHealth.models.join(', ') }}
                    </p>
                  </div>

                  <!-- Modell-Installation: nur sichtbar wenn Ollama erreichbar -->
                  <div v-if="aiOllamaHealth?.ok" class="border-t border-gray-700 pt-3 mt-3 space-y-2">
                    <p class="text-xs font-medium text-white">{{ $t('adminSetup.external.ollamaPullTitle') }}</p>
                    <p class="text-[11px] text-gray-400 whitespace-pre-line">{{ $t('adminSetup.external.ollamaPullHint') }}</p>
                    <div class="flex gap-2 items-stretch">
                      <select v-model="aiPullModel" class="flex-1 bg-gray-700 rounded text-xs px-2 py-1.5">
                        <option value="">— {{ $t('adminSetup.external.ollamaPullSelect') }} —</option>
                        <option v-for="m in aiRecommendedModels" :key="m.name" :value="m.name">
                          {{ m.name }} · {{ m.disk_mb }} MB · {{ m.for_hardware }} · {{ m.speed }}
                        </option>
                      </select>
                      <button @click="pullOllamaModel(aiPullModel)"
                              :disabled="!aiPullModel || (aiPullProgress && !aiPullProgress.status?.match(/done|error/))"
                              type="button"
                              class="text-xs bg-tesla-red hover:bg-tesla-red/80 text-white rounded px-3 py-1.5 disabled:opacity-50 shrink-0">
                        ⬇ {{ $t('adminSetup.external.ollamaPullBtn') }}
                      </button>
                    </div>
                    <div v-if="aiPullProgress" class="space-y-1">
                      <div class="flex justify-between text-[10px] text-gray-400">
                        <span>{{ aiPullProgress.status }}</span>
                        <span v-if="aiPullProgress.percent !== null && aiPullProgress.percent !== undefined">
                          {{ aiPullProgress.percent }}% ·
                          {{ aiPullProgress.completed_mb }} / {{ aiPullProgress.total_mb }} MB
                        </span>
                      </div>
                      <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-tesla-red transition-all"
                             :style="{ width: (aiPullProgress.percent ?? 5) + '%' }"></div>
                      </div>
                      <p v-if="aiPullProgress.status === 'done'" class="text-xs text-green-400">
                        ✓ {{ aiPullModel }} {{ $t('adminSetup.external.ollamaPullDone') }}
                      </p>
                    </div>
                    <p v-if="aiPullError" class="text-xs text-red-400">✗ {{ aiPullError }}</p>
                  </div>
                </div>
              </div>

              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">{{ $t('adminSetup.external.grokName') }}</p>
                  <span v-if="adminStatus.grok?.configured" class="text-xs text-green-400">{{ $t('adminSetup.external.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('adminSetup.external.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('adminSetup.external.grokHint') }}</p>
                <input v-model="draftAdmin.xai_key" type="password"
                  :placeholder="adminStatus.grok?.configured ? $t('adminSetup.external.keyChangePlaceholder') : $t('adminSetup.external.grokPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">{{ $t('adminSetup.external.abrpName') }}</p>
                  <span v-if="adminStatus.abrp?.configured" class="text-xs text-green-400">{{ $t('adminSetup.external.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('adminSetup.external.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('adminSetup.external.abrpHint') }}</p>
                <input v-model="draftAdmin.abrp_key" type="password"
                  :placeholder="adminStatus.abrp?.configured ? $t('adminSetup.external.keyChangePlaceholder') : $t('adminSetup.external.abrpPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
            </div>
          </template>

          <!-- STEP: monitoring -->
          <template v-else-if="currentId === 'monitoring'">
            <StepHeader :title="$t('adminSetup.monitoring.title')" :question="$t('adminSetup.monitoring.question')" />
            <div class="space-y-4">
              <div class="card space-y-2">
                <p class="text-sm font-medium text-white">{{ $t('adminSetup.monitoring.alertEmailName') }}</p>
                <p class="text-xs text-gray-400">{{ $t('adminSetup.monitoring.alertEmailHint') }}</p>
                <input v-model="draftAdmin.alert_email" type="email" placeholder="admin@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">{{ $t('adminSetup.monitoring.smtpName') }}</p>
                  <span v-if="adminStatus.smtp?.configured" class="text-xs text-green-400">{{ $t('adminSetup.monitoring.smtpConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('adminSetup.monitoring.smtpHint') }}</p>
                <div class="grid grid-cols-3 gap-2">
                  <input v-model="draftAdmin.smtp_host" type="text" placeholder="smtp.example.com"
                    class="col-span-2 w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                  <input v-model="draftAdmin.smtp_port" type="number" placeholder="587"
                    class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                </div>
                <input v-model="draftAdmin.smtp_user" type="email" placeholder="user@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <input v-model="draftAdmin.smtp_password" type="password" :placeholder="$t('adminSetup.monitoring.passwordPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <input v-model="draftAdmin.smtp_from" type="email" placeholder="noreply@example.com"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
            </div>
          </template>

          <!-- STEP: summary -->
          <template v-else>
            <div class="text-center space-y-4 py-4">
              <div class="text-5xl">{{ restartDone ? '🔄' : '✅' }}</div>
              <h3 class="text-xl font-bold">{{ restartDone ? $t('adminSetup.summary.titleRestart') : $t('adminSetup.summary.titleDone') }}</h3>
              <p class="text-gray-300 text-sm">{{ $t('adminSetup.summary.body') }}</p>

              <!-- Neustart-Banner + Button -->
              <div v-if="needsRestart && !restartDone"
                class="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-4 text-sm text-amber-200 space-y-3 text-left">
                <p class="font-medium flex items-center gap-2">
                  {{ $t('adminSetup.summary.restartBannerTitle') }}
                </p>
                <p class="text-xs text-amber-300/80">
                  {{ $t('adminSetup.summary.restartBannerBody') }}
                </p>
                <button @click="triggerRestart" :disabled="restarting"
                  class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition disabled:opacity-50">
                  <span v-if="restarting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span v-else>🔄</span>
                  {{ restarting ? $t('adminSetup.summary.restarting') : $t('adminSetup.summary.restartBtn') }}
                </button>
                <p v-if="restartError" class="text-xs text-red-400">{{ restartError }}</p>
              </div>

              <!-- Nach Neustart: Warte-Hinweis + Auto-Reload -->
              <div v-if="restartDone"
                class="bg-blue-900/20 border border-blue-700/40 rounded-xl px-4 py-4 text-sm text-blue-200 space-y-2">
                <p v-html="restartDoneText"></p>
                <div class="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-blue-400 h-full rounded-full transition-all duration-1000"
                    :style="{ width: ((RESTART_WAIT - restartCountdown) / RESTART_WAIT * 100) + '%' }"></div>
                </div>
                <p class="text-xs text-blue-300/70">{{ $t('adminSetup.summary.restartAutoReload') }}</p>
              </div>

              <RouterLink v-if="!restartDone" to="/admin/settings" @click="$emit('close')" class="block btn-secondary text-sm">
                {{ $t('adminSetup.summary.adminLink') }}
              </RouterLink>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex items-center gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
          <button v-if="step > 0 && !isLast" @click="back" class="btn-secondary text-sm px-4">{{ $t('adminSetup.nav.back') }}</button>
          <div class="flex-1"></div>
          <template v-if="isLast">
            <button @click="$emit('close')" class="btn-primary text-sm px-6">{{ $t('adminSetup.nav.done') }}</button>
          </template>
          <template v-else-if="currentId === 'welcome'">
            <button @click="next" class="btn-primary text-sm px-6">{{ $t('adminSetup.nav.start') }}</button>
          </template>
          <template v-else>
            <button @click="skip" class="text-sm text-gray-500 hover:text-gray-300 transition px-2">{{ $t('adminSetup.nav.skip') }}</button>
            <button @click="saveAndNext" :disabled="saving" class="btn-primary text-sm px-6">
              {{ saving ? '…' : (isSecondToLast ? $t('adminSetup.nav.finish') : $t('adminSetup.nav.next')) }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../api.js';
import LangSwitcher from './LangSwitcher.vue';

const { t } = useI18n();

const emit = defineEmits(['close', 'done']);

// ─── Wizard-Prefill ────────────────────────────────────────────────────────
// /system/wizard-prefill liefert in einem Aufruf:
//   • defaults.* — Werte, die wir aus Geo-IP / Admin-Profil / Hostname raten
//     können (z. B. Fleet-API-Audience, Alert-Mail = Admin-Mail).
//   • steps.*   — Status pro Wizard-Schritt: was ist bereits erledigt?
// Beides flutet vor dem ersten Render in die Forms — der Admin sieht
// dadurch vorbelegte Felder und kann erledigte Schritte überspringen.
const prefill = ref({ defaults: {}, steps: {}, auth_mode: 'fleet' });

async function loadPrefill() {
  try {
    const { data } = await api.get('/system/wizard-prefill');
    prefill.value = data;
  } catch { /* nicht-kritisch: ohne Prefill funktioniert der Wizard wie vorher */ }
}

// Defaults in leere Formularfelder einspeisen — bestehende Werte
// werden niemals überschrieben. Wird nach loadCredsCfg, loadVapidCfg etc.
// aufgerufen, weil deren API-Antworten Vorrang haben.
function applyPrefillToForms() {
  const d = prefill.value?.defaults || {};
  if (!credsForm.value.audience    && d.tesla_audience)   credsForm.value.audience    = d.tesla_audience;
  if (!vapidForm.value.contact     && d.vapid_contact)    vapidForm.value.contact     = d.vapid_contact;
  if (!draftAdmin.value.alert_email && d.alert_email)     draftAdmin.value.alert_email = d.alert_email;
  // Strompreis-Default pro Fahrzeug nur dann setzen, wenn weder Fahrzeug
  // noch Draft schon einen Wert haben — sonst überschreibt der Default
  // gespeicherte Mandanten-Werte.
  if (d.electricity_rate != null) {
    for (const v of vehicles.value) {
      if (draftElectricity[v.id] == null && v.electricity_rate_kwh == null) {
        draftElectricity[v.id] = d.electricity_rate;
      }
    }
  }
}

// Welcome-Screen-Liste: pro Wizard-Block ein Eintrag mit i18n-Label, Done-Flag,
// Auto-Flag (vom Backend automatisch erzeugt) und Optional-Flag.
const welcomeStatus = computed(() => {
  const s = prefill.value?.steps || {};
  return [
    { id: 'credentials', label: 'adminSetup.welcome.f1', done: !!s.credentials?.done },
    { id: 'oauth',       label: 'adminSetup.welcome.f2', done: !!s.oauth?.done },
    { id: 'vapid',       label: 'adminSetup.welcome.f3', done: !!s.vapid?.done,    auto: !!s.vapid?.auto },
    { id: 'telegram',    label: 'adminSetup.welcome.f4', done: !!s.telegram?.done,    optional: true },
    { id: 'external',    label: 'adminSetup.welcome.f5', done: !!s.external?.done,    optional: true },
    { id: 'monitoring',  label: 'adminSetup.welcome.f6', done: !!s.monitoring?.done,  optional: true },
  ];
});

// Kompakte Zusammenfassung „X von Y Schritten erledigt" für das Welcome.
const prefillSummary = computed(() => {
  const rows = welcomeStatus.value;
  if (!rows.length) return '';
  const done = rows.filter(r => r.done).length;
  const remaining = rows.length - done;
  return t('adminSetup.welcome.summary', { done, total: rows.length, remaining });
});

// Done-Banner pro Step: nur anzeigen wenn der Status erledigt ist — der
// User sieht „✓ schon eingerichtet (klick für Details)" statt einem leeren
// Formular. Identifier mappt 1:1 auf den `currentId`.
const STEP_DONE_KEY = {
  credentials: 'credentials',
  oauth:       'oauth',
  vehicles:    'vehicles',
  virtualkey:  'virtualkey',
  telemetry:   'telemetry',
  vapid:       'vapid',
  telegram:    'telegram',
  electricity: 'electricity',
  external:    'external',
  monitoring:  'monitoring',
};
function stepStatus(id) {
  const k = STEP_DONE_KEY[id];
  if (!k) return null;
  return prefill.value?.steps?.[k] || null;
}

// ─── Container-Neustart ───────────────────────────────────────────────────────
const RESTART_WAIT    = 12; // Sekunden bis Auto-Reload
const restarting      = ref(false);
const restartDone     = ref(false);
const restartError    = ref('');
const restartCountdown = ref(RESTART_WAIT);
let   restartTimer    = null;
// Reaktiv: locale-aware Übersetzung mit eingebettetem <strong> für die Sekunden
const restartDoneText = computed(() =>
  t('adminSetup.summary.restartDone', { sec: `<strong>${restartCountdown.value}</strong>` })
);

async function triggerRestart() {
  restarting.value = true; restartError.value = '';
  try {
    await api.post('/system/container-restart');
    restartDone.value = true;
    restarting.value  = false;
    restartCountdown.value = RESTART_WAIT;
    restartTimer = setInterval(() => {
      restartCountdown.value--;
      if (restartCountdown.value <= 0) {
        clearInterval(restartTimer);
        window.location.reload();
      }
    }, 1000);
  } catch (e) {
    restartError.value = e.response?.data?.error ?? e.message ?? t('adminSetup.summary.restartError');
    restarting.value = false;
  }
}

onUnmounted(() => { if (restartTimer) clearInterval(restartTimer); });

const STEPS = [
  'welcome', 'credentials', 'oauth', 'vehicles', 'owntracks', 'virtualkey', 'telemetry',
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
    credsMsg.value = t('adminSetup.msgSaved'); credsOk.value = true;
    await loadCredsCfg();
  } catch (e) {
    credsMsg.value = e.response?.data?.error || t('adminSetup.msgError'); credsOk.value = false;
  }
  setTimeout(() => { credsMsg.value = ''; }, 3000);
}

// ─── Tesla OAuth ───────────────────────────────────────────────────────────
const oauthStatus      = ref('checking');
const oauthOpening     = ref(false);
const oauthMode        = ref('fleet');
const ownerApiTab      = ref(false);
const ownerOauthOpening = ref(false);
const ownerApiError    = ref('');
const ownerPaused      = ref(false);
const ownerToggling    = ref(false);

async function checkOauthStatus() {
  oauthStatus.value = 'checking';
  try {
    const { data } = await api.get('/auth/tesla/status');
    oauthStatus.value = data.connected ? 'connected' : 'disconnected';
    oauthMode.value = data.mode || 'fleet';
    ownerPaused.value = !!data.paused;
    if (data.mode === 'owner') ownerApiTab.value = true;
  } catch { oauthStatus.value = 'disconnected'; }
}

async function pauseOwnerApi() {
  ownerToggling.value = true;
  try { await api.post('/auth/tesla/owner-api/pause'); await checkOauthStatus(); }
  finally { ownerToggling.value = false; }
}
async function resumeOwnerApi() {
  ownerToggling.value = true;
  try { await api.post('/auth/tesla/owner-api/resume'); await checkOauthStatus(); }
  finally { ownerToggling.value = false; }
}

// ─── OwnTracks (Smartphone-GPS) ────────────────────────────────────────────
const owntracksDevices  = ref([]);
const owntracksUsers    = ref([]);
const owntracksShowForm = ref(false);
const owntracksForm     = reactive({
  label: '', vehicle_id: null, user_id: null, default_trip_type: 'business',
});
const owntracksCreated  = ref(null);
const owntracksCopied   = ref(false);
const owntracksCreating = ref(false);
const owntracksError    = ref('');

const canCreateOwntracksDevice = computed(() =>
  !!(owntracksForm.label?.trim() && owntracksForm.vehicle_id && owntracksForm.user_id)
);

// Token-basierte URLs fuer Selbst-Setup nach Device-Erstellung.
// Werden vom Backend an /api/owntracks/qr.png + /config.otrc bedient,
// brauchen kein JWT (Token in der URL ist die Auth).
const owntracksQrUrl   = computed(() =>
  owntracksCreated.value
    ? `/api/owntracks/qr.png?token=${encodeURIComponent(owntracksCreated.value.token)}`
    : ''
);
const owntracksOtrcUrl = computed(() =>
  owntracksCreated.value
    ? `/api/owntracks/config.otrc?token=${encodeURIComponent(owntracksCreated.value.token)}`
    : ''
);

async function loadOwntracks() {
  try {
    const [devs, users] = await Promise.all([
      api.get('/owntracks/devices').then(r => r.data),
      api.get('/users').then(r => r.data).catch(() => []),
    ]);
    owntracksDevices.value = devs || [];
    owntracksUsers.value   = users || [];
  } catch (e) {
    owntracksError.value = e.response?.data?.error || e.message;
  }
}

function openOwntracksForm() {
  owntracksShowForm.value = true;
  owntracksCreated.value  = null;
  owntracksError.value    = '';
  if (!owntracksForm.vehicle_id && vehicles.value[0]) owntracksForm.vehicle_id = vehicles.value[0].id;
  if (!owntracksForm.user_id    && owntracksUsers.value[0]) owntracksForm.user_id = owntracksUsers.value[0].id;
}

async function createOwntracksDevice() {
  owntracksCreating.value = true; owntracksError.value = '';
  try {
    const { data } = await api.post('/owntracks/devices', {
      label:             owntracksForm.label.trim(),
      vehicle_id:        owntracksForm.vehicle_id,
      user_id:           owntracksForm.user_id,
      default_trip_type: owntracksForm.default_trip_type,
    });
    owntracksCreated.value  = data;
    owntracksShowForm.value = false;
    owntracksForm.label     = '';
    await loadOwntracks();
  } catch (e) {
    owntracksError.value = e.response?.data?.error || e.message;
  } finally {
    owntracksCreating.value = false;
  }
}

async function toggleOwntracksDevice(d) {
  try {
    await api.patch(`/owntracks/devices/${d.id}`, { is_active: !d.is_active });
    await loadOwntracks();
  } catch (e) { owntracksError.value = e.response?.data?.error || e.message; }
}

async function deleteOwntracksDevice(d) {
  if (!confirm(t('adminSetup.owntracks.confirmDelete', { label: d.label }))) return;
  try {
    await api.delete(`/owntracks/devices/${d.id}`);
    await loadOwntracks();
  } catch (e) { owntracksError.value = e.response?.data?.error || e.message; }
}

async function copyOwntracksUrl() {
  if (!owntracksCreated.value) return;
  await navigator.clipboard.writeText(owntracksCreated.value.webhook_url);
  owntracksCopied.value = true;
  setTimeout(() => { owntracksCopied.value = false; }, 2000);
}

function owntracksVehicleLabel(id) {
  const v = vehicles.value.find(x => x.id === id);
  return v?.display_name || v?.vin || `#${id}`;
}
function owntracksUserLabel(id) {
  const u = owntracksUsers.value.find(x => x.id === id);
  return u?.username || `#${id}`;
}
function owntracksRelative(unixSec) {
  const mins = Math.round((Date.now() / 1000 - unixSec) / 60);
  if (mins < 1)    return t('adminSetup.owntracks.justNow');
  if (mins < 60)   return t('adminSetup.owntracks.minsAgo',  { mins });
  if (mins < 1440) return t('adminSetup.owntracks.hoursAgo', { hours: Math.round(mins / 60) });
  return t('adminSetup.owntracks.daysAgo', { days: Math.round(mins / 1440) });
}

async function openOwnerOauth() {
  ownerOauthOpening.value = true;
  ownerApiError.value = '';
  try {
    const { data } = await api.get('/auth/tesla/owner-auth-url');
    const popup = window.open(data.url, 'tesla_owner_oauth', 'width=600,height=700');
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
  } catch (err) {
    ownerApiError.value = err.response?.data?.error || err.message;
  } finally {
    ownerOauthOpening.value = false;
  }
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

// Manuelle Fahrzeug-Anlage (Fallback wenn Tesla-API nicht verfuegbar)
const manualVehicleForm   = ref(null);
const manualVehicleSaving = ref(false);

async function submitManualVehicle() {
  if (!manualVehicleForm.value?.display_name?.trim()) return;
  manualVehicleSaving.value = true; vehicleSyncError.value = '';
  try {
    const payload = {
      display_name:        manualVehicleForm.value.display_name.trim(),
      vin:                 manualVehicleForm.value.vin?.trim() || undefined,
      model:               manualVehicleForm.value.model?.trim() || undefined,
      license_plate:       manualVehicleForm.value.license_plate?.trim() || undefined,
      initial_odometer_km: manualVehicleForm.value.initial_odometer_km != null && manualVehicleForm.value.initial_odometer_km !== ''
                           ? Number(manualVehicleForm.value.initial_odometer_km) : undefined,
    };
    await api.post('/vehicles/manual', payload);
    manualVehicleForm.value = null;
    await loadVehicles();
  } catch (e) {
    vehicleSyncError.value = e.response?.data?.error || e.message;
  } finally {
    manualVehicleSaving.value = false;
  }
}

// ─── Virtual Key + Telemetry ───────────────────────────────────────────────
const telemetryStatus      = ref(null);
const telemetryConfiguring = reactive({});
const vkCopied = ref(false);

async function loadTelemetryStatus() {
  try { const { data } = await api.get('/fleet/telemetry/status'); telemetryStatus.value = data; } catch { /* ignore */ }
}

async function configureTelemetry(vin) {
  telemetryConfiguring[vin] = true;
  try { await api.post(`/fleet/telemetry/configure/${vin}`); await loadTelemetryStatus(); }
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

function telemetryStatusLabel(status) {
  // Mapping zu i18n-Keys; Fallback ist der Roh-Status, falls Backend einen
  // unbekannten String liefert.
  const map = {
    streaming:        'adminSetup.telemetry.statusStreaming',
    registered_idle:  'adminSetup.telemetry.statusRegisteredIdle',
    not_registered:   'adminSetup.telemetry.statusNotRegistered',
    approval_missing: 'adminSetup.telemetry.statusApprovalMissing',
    error:            'adminSetup.telemetry.statusError',
  };
  return map[status] ? t(map[status]) : status;
}

// ─── VAPID ─────────────────────────────────────────────────────────────────
const vapidCfg  = ref({ configured: false, from_env: false });
const vapidForm = ref({ contact: '', generating: false, msg: '', ok: false });

async function loadVapidCfg() {
  try { const { data } = await api.get('/system/vapid-config'); vapidCfg.value = data; vapidForm.value.contact = data.contact || ''; }
  catch { /* ignore */ }
}

async function generateVapid() {
  if (vapidCfg.value.configured && !confirm(t('adminSetup.vapid.regenConfirm'))) return;
  vapidForm.value.generating = true;
  try {
    if (vapidForm.value.contact) await api.put('/system/vapid-config', { contact: vapidForm.value.contact });
    await api.post('/system/vapid-generate');
    vapidForm.value.msg = t('adminSetup.vapid.generated'); vapidForm.value.ok = true;
    await loadVapidCfg();
  } catch (e) { vapidForm.value.msg = e.response?.data?.error || t('adminSetup.msgError'); vapidForm.value.ok = false; }
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
    telegramForm.value.msg = t('adminSetup.telegram.saved');
    needsRestart.value = true;
    await loadTelegramCfg();
  } catch { telegramForm.value.msg = t('adminSetup.telegram.saveError'); }
  setTimeout(() => { telegramForm.value.msg = ''; }, 4000);
}

// ─── Strompreis ────────────────────────────────────────────────────────────
const draftElectricity = reactive({});

// ─── Admin Status + Externe Keys ───────────────────────────────────────────
const adminStatus = ref({ ocm: null, here: null, grok: null, abrp: null, smtp: null });
const draftAdmin  = ref({ ocm_key: '', here_key: '', xai_key: '', abrp_key: '',
  alert_email: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_from: '' });

// ─── KI-Provider (Ollama lokal vs Grok cloud) ─────────────────────────────
// Default-Wahl beim ersten Bearbeiten: Ollama (datensouveraen).
const aiConfig = ref({ provider: 'none', grok_configured: false, ollama_url: 'http://localhost:11434', ollama_model: 'qwen2.5:3b' });
const aiOllamaHealth = ref(null);
const aiOllamaTesting = ref(false);
const aiRecommendedModels = ref([]);
const aiPullModel    = ref('');
const aiPullProgress = ref(null);  // { status, percent, completed_mb, total_mb }
const aiPullError    = ref('');

async function loadAiConfig() {
  try { aiConfig.value = (await api.get('/grok/ai-config')).data; }
  catch { /* ignore — Endpoint kommt aus v3.4.27 */ }
  try { aiRecommendedModels.value = (await api.get('/grok/ollama-recommended')).data; }
  catch { /* ignore — Endpoint kommt aus v3.5.0 */ }
}

// SSE-basierter Modell-Pull. Frontend macht das per fetch+ReadableStream
// statt EventSource, weil EventSource keinen POST-Body kann.
async function pullOllamaModel(modelName) {
  if (!modelName) return;
  aiPullProgress.value = { status: 'starting', percent: null };
  aiPullError.value    = '';
  try {
    const tokenStore = (await import('../store/auth.js')).useAuthStore();
    const r = await fetch('/api/grok/ollama-pull', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStore.accessToken}` },
      body:    JSON.stringify({ model: modelName }),
    });
    if (!r.ok) {
      aiPullError.value = `Pull fehlgeschlagen: HTTP ${r.status}`;
      aiPullProgress.value = null; return;
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const evt of events) {
        const line = evt.split('\n').find(l => l.startsWith('data: '));
        if (!line) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.error) { aiPullError.value = payload.error; continue; }
          if (payload.done)  {
            aiPullProgress.value = { status: 'done', percent: 100 };
            await testOllamaHealth();   // refresh installed list
            return;
          }
          aiPullProgress.value = payload;
        } catch { /* skip */ }
      }
    }
  } catch (e) {
    aiPullError.value = e.message;
    aiPullProgress.value = null;
  }
}

async function testOllamaHealth() {
  // Vorher Settings speichern, sonst testet er die alten Werte
  aiOllamaTesting.value = true;
  try {
    await api.put('/grok/ai-config', {
      ollama_url:   aiConfig.value.ollama_url,
      ollama_model: aiConfig.value.ollama_model,
    });
    aiOllamaHealth.value = (await api.get('/grok/ollama-health')).data;
  } catch (e) {
    aiOllamaHealth.value = { ok: false, error: e.response?.data?.error || e.message };
  } finally {
    aiOllamaTesting.value = false;
  }
}

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

  // KI-Provider-Wahl + Ollama-Settings (immer, nicht nur bei input)
  calls.push(api.put('/grok/ai-config', {
    provider:     aiConfig.value.provider,
    ollama_url:   aiConfig.value.ollama_url,
    ollama_model: aiConfig.value.ollama_model,
  }));
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
    loadOwntracks(),
    loadTelemetryStatus(),
    loadVapidCfg(),
    loadTelegramCfg(),
    loadAdminStatus(),
    loadAiConfig(),
    loadPrefill(),
  ]);
  // Erst nachdem sowohl Prefill als auch Configs geladen sind: leere
  // Felder mit Defaults füllen. Reihenfolge ist wichtig — Configs haben
  // Vorrang, daher applyPrefillToForms() zuletzt.
  applyPrefillToForms();
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

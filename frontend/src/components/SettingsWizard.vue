<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col"
           style="max-height: 90vh">

        <!-- Header -->
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-800 shrink-0">
          <div class="min-w-0">
            <h2 class="font-bold text-lg">{{ $t('wizard.title') }}</h2>
            <p v-if="step > 0 && !isLast" class="text-xs text-gray-400 mt-0.5">
              {{ $t('wizard.step', { n: step, total: STEPS.length - 2 }) }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <LangSwitcher compact
              v-tooltip="$t('lang.switcherHint')" />
            <button @click="$emit('close')" class="text-gray-500 hover:text-white text-2xl leading-none transition"
                    v-tooltip="$t('common.cancel')">×</button>
          </div>
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
              <div class="text-5xl">⚙️</div>
              <h3 class="text-xl font-bold">{{ $t('wizard.welcome') }}</h3>
              <p class="text-gray-300 text-sm leading-relaxed">{{ $t('wizard.intro') }}</p>
              <div class="bg-gray-800 rounded-xl p-4 text-left space-y-2 text-sm text-gray-300">
                <p>✓ {{ $t('wizard.featureSkip') }}</p>
                <p>✓ {{ $t('wizard.featureDraft') }}</p>
                <p>✓ {{ $t('wizard.featureBack') }}</p>
                <p>✓ {{ $t('wizard.featureRelaunch') }}</p>
              </div>
            </div>
          </template>

          <!-- STEP: lang -->
          <template v-else-if="currentId === 'lang'">
            <WizardStep :title="$t('wizard.s1.title')" :question="$t('wizard.s1.question')"
              :current-label="langLabel(draft.lang ?? prefs.data.lang)" />
            <div class="grid grid-cols-2 gap-2">
              <button v-for="l in LANGS" :key="l.code"
                @click="draft.lang = l.code"
                class="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition"
                :class="(draft.lang ?? prefs.data.lang) === l.code
                  ? 'border-tesla-red bg-tesla-red/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'">
                <span class="text-xl">{{ l.flag }}</span>
                <span class="font-medium">{{ l.label }}</span>
                <span v-if="(draft.lang ?? prefs.data.lang) === l.code" class="ml-auto text-tesla-red">✓</span>
              </button>
            </div>
          </template>

          <!-- STEP: oauth (Admin) -->
          <template v-else-if="currentId === 'oauth'">
            <WizardStep :title="$t('wizard.sOauth.title')" :question="$t('wizard.sOauth.question')" />
            <div class="flex gap-2">
              <button @click="ownerApiTab = false"
                class="flex-1 text-xs rounded-lg px-3 py-2 transition"
                :class="!ownerApiTab ? 'bg-tesla-red text-white' : 'bg-gray-800 text-gray-400 hover:text-white'">
                {{ $t('wizard.sOauth.tabFleet') }}
              </button>
              <button @click="ownerApiTab = true"
                class="flex-1 text-xs rounded-lg px-3 py-2 transition"
                :class="ownerApiTab ? 'bg-tesla-red text-white' : 'bg-gray-800 text-gray-400 hover:text-white'">
                {{ $t('wizard.sOauth.tabOwner') }}
              </button>
            </div>
            <div v-if="!ownerApiTab" class="card space-y-4">
              <div class="flex items-center gap-3">
                <span v-if="oauthStatus === 'connected' && oauthMode !== 'owner'" class="text-2xl">✅</span>
                <span v-else-if="oauthStatus === 'checking'" class="text-2xl animate-pulse">🔄</span>
                <span v-else class="text-2xl">❌</span>
                <div>
                  <p class="text-sm font-semibold text-white">
                    {{ oauthStatus === 'connected' && oauthMode !== 'owner' ? $t('wizard.sOauth.connected') : $t('wizard.sOauth.notConnected') }}
                  </p>
                  <p class="text-xs text-gray-400">{{ $t('wizard.sOauth.hint') }}</p>
                </div>
              </div>
              <div v-if="!(oauthStatus === 'connected' && oauthMode !== 'owner')" class="flex gap-2">
                <button @click="openOauth" :disabled="oauthOpening"
                  class="flex-1 btn-primary text-sm">
                  {{ oauthOpening ? $t('common.loading') + ' …' : $t('wizard.sOauth.connectBtn') }}
                </button>
                <button @click="checkOauthStatus" class="btn-secondary text-sm px-4">
                  {{ $t('wizard.sOauth.refresh') }}
                </button>
              </div>
              <p v-if="oauthStatus === 'connected' && oauthMode !== 'owner'" class="text-xs text-green-400">
                {{ $t('wizard.sOauth.connectedHint') }}
              </p>
            </div>
            <div v-else class="card space-y-4">
              <div class="bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-300 space-y-1">
                <p>{{ $t('wizard.sOauth.ownerInfo') }}</p>
                <a href="https://github.com/timdorr/tesla-api" target="_blank" rel="noopener"
                   class="text-blue-400 hover:underline">tesla-api Docs ↗</a>
              </div>
              <div v-if="oauthStatus === 'connected' && oauthMode === 'owner'" class="flex items-center gap-3">
                <span class="text-2xl">✅</span>
                <div>
                  <p class="text-sm font-semibold text-white">{{ $t('wizard.sOauth.ownerConnected') }}</p>
                  <p class="text-xs text-gray-400">{{ $t('wizard.sOauth.ownerActiveHint') }}</p>
                </div>
              </div>
              <template v-else>
                <div>
                  <label class="label">{{ $t('wizard.sOauth.ownerTokenLabel') }}</label>
                  <textarea v-model="ownerApiToken" rows="3"
                    :placeholder="$t('wizard.sOauth.ownerTokenPlaceholder')"
                    class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red font-mono resize-none"></textarea>
                </div>
                <button @click="connectOwnerApi" :disabled="ownerApiConnecting || !ownerApiToken.trim()"
                  class="w-full btn-primary text-sm">
                  {{ ownerApiConnecting ? $t('wizard.sOauth.ownerConnecting') : $t('wizard.sOauth.ownerConnectBtn') }}
                </button>
                <p v-if="ownerApiError" class="text-xs text-red-400">{{ ownerApiError }}</p>
              </template>
            </div>
          </template>

          <!-- STEP: vehicles (Admin) -->
          <template v-else-if="currentId === 'vehicles'">
            <WizardStep :title="$t('wizard.sVehicles.title')" :question="$t('wizard.sVehicles.question')" />
            <div class="card space-y-3">
              <div v-if="vehicles.length === 0" class="text-center py-4 space-y-3">
                <p class="text-sm text-gray-400">{{ $t('wizard.sVehicles.empty') }}</p>
                <button @click="syncVehicles" :disabled="vehicleSyncing"
                  class="btn-primary text-sm">
                  {{ vehicleSyncing ? $t('wizard.sVehicles.syncing') : $t('wizard.sVehicles.syncBtn') }}
                </button>
              </div>
              <div v-else class="space-y-2">
                <div v-for="v in vehicles" :key="v.id"
                  class="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                  <span class="text-xl">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ v.vin }}</p>
                  </div>
                  <span class="text-xs text-green-400">✓</span>
                </div>
                <button @click="syncVehicles" :disabled="vehicleSyncing"
                  class="w-full btn-secondary text-sm py-2">
                  {{ vehicleSyncing ? $t('wizard.sVehicles.syncing') : $t('wizard.sVehicles.resyncBtn') }}
                </button>
              </div>
              <p v-if="vehicleSyncError" class="text-xs text-red-400">{{ vehicleSyncError }}</p>
            </div>
          </template>

          <!-- STEP: virtualkey (Admin) -->
          <template v-else-if="currentId === 'virtualkey'">
            <WizardStep :title="$t('wizard.sVKey.title')" :question="$t('wizard.sVKey.question')" />
            <div class="card space-y-4">
              <div v-if="telemetryStatus === null" class="text-sm text-gray-400">{{ $t('common.loading') }} …</div>
              <template v-else>
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ telemetryStatus.virtual_key_exists ? '✅' : '⚠️' }}</span>
                  <div>
                    <p class="text-sm font-semibold text-white">
                      {{ telemetryStatus.virtual_key_exists
                          ? $t('wizard.sVKey.exists')
                          : $t('wizard.sVKey.missing') }}
                    </p>
                    <p v-if="telemetryStatus.virtual_key_exists && telemetryStatus.virtual_key_created_at"
                      class="text-xs text-gray-400">
                      {{ $t('wizard.sVKey.createdAt') }}: {{ new Date(telemetryStatus.virtual_key_created_at * 1000).toLocaleDateString() }}
                    </p>
                  </div>
                </div>
                <div v-if="!telemetryStatus.virtual_key_exists" class="space-y-3">
                  <p class="text-xs text-gray-400">{{ $t('wizard.sVKey.hint') }}</p>
                  <div class="bg-gray-950 rounded-lg p-3 space-y-2">
                    <p class="text-xs text-gray-500">{{ $t('wizard.sVKey.regUrl') }}</p>
                    <p class="text-xs font-mono text-amber-300 break-all select-all">{{ telemetryStatus.registration_url }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button @click="copyVkUrl" class="flex-1 btn-secondary text-sm">
                      {{ vkCopied ? $t('common.copied') + ' ✓' : $t('common.copy') }}
                    </button>
                    <a :href="telemetryStatus.registration_url" target="_blank" rel="noopener"
                      class="btn-primary text-sm px-4 no-underline">↗ {{ $t('wizard.sVKey.openUrl') }}</a>
                  </div>
                  <p class="text-xs text-gray-500">{{ $t('wizard.sVKey.afterPair') }}</p>
                  <button @click="loadTelemetryStatus" class="btn-secondary text-sm w-full">
                    {{ $t('wizard.sVKey.checkAgain') }}
                  </button>
                </div>
              </template>
            </div>
          </template>

          <!-- STEP: telemetry (Admin) -->
          <template v-else-if="currentId === 'telemetry'">
            <WizardStep :title="$t('wizard.sTelemetry.title')" :question="$t('wizard.sTelemetry.question')" />
            <div v-if="telemetryStatus === null" class="text-sm text-gray-400">{{ $t('common.loading') }} …</div>
            <div v-else class="space-y-3">
              <div v-if="!telemetryStatus.virtual_key_exists"
                class="card bg-amber-900/20 border border-amber-700/40 text-sm text-amber-300">
                ⚠️ {{ $t('wizard.sTelemetry.needsVkey') }}
              </div>
              <div v-for="v in telemetryStatus.vehicles ?? []" :key="v.id"
                class="card space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ v.vin }}</p>
                  </div>
                  <span :class="telemetryBadgeClass(v.status)" class="text-xs px-2 py-0.5 rounded-full font-medium">
                    {{ $t('wizard.sTelemetry.status.' + v.status) }}
                  </span>
                </div>
                <div v-if="v.last_error && v.status === 'error'" class="text-xs text-red-400 font-mono truncate">{{ v.last_error }}</div>
                <button v-if="v.status === 'not_registered' || v.status === 'error'"
                  @click="configureTelemetry(v.vin)"
                  :disabled="telemetryConfiguring[v.vin]"
                  class="btn-primary text-xs w-full py-1.5">
                  {{ telemetryConfiguring[v.vin] ? $t('common.loading') + ' …' : $t('wizard.sTelemetry.configureBtn') }}
                </button>
                <p v-if="v.status === 'approval_missing'" class="text-xs text-amber-400">
                  {{ $t('wizard.sTelemetry.approvalHint') }}
                </p>
              </div>
              <div v-if="!telemetryStatus.vehicles?.length" class="text-sm text-gray-400 text-center py-4">
                {{ $t('wizard.sTelemetry.noVehicles') }}
              </div>
              <button @click="loadTelemetryStatus" class="btn-secondary text-sm w-full">
                {{ $t('wizard.sTelemetry.refresh') }}
              </button>
            </div>
          </template>

          <!-- STEP: electricity (Admin) -->
          <template v-else-if="currentId === 'electricity'">
            <WizardStep :title="$t('wizard.sElec.title')" :question="$t('wizard.sElec.question')" />
            <div class="space-y-3">
              <div v-if="vehicles.length === 0" class="text-sm text-gray-400 text-center py-4">
                {{ $t('wizard.sElec.noVehicles') }}
              </div>
              <div v-for="v in vehicles" :key="v.id" class="card space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🚗</span>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-white">{{ v.display_name || v.vin }}</p>
                    <p class="text-xs text-gray-400">{{ $t('wizard.sElec.currentRate') }}:
                      <span class="text-gray-200">{{ v.electricity_rate_kwh != null ? v.electricity_rate_kwh + ' €/kWh' : $t('wizard.sElec.notSet') }}</span>
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input type="number" step="0.001" min="0" max="5"
                    :value="draftElectricity[v.id] ?? v.electricity_rate_kwh ?? ''"
                    @input="draftElectricity[v.id] = parseFloat($event.target.value)"
                    :placeholder="$t('wizard.sElec.placeholder')"
                    class="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                  <span class="text-sm text-gray-400">€/kWh</span>
                </div>
              </div>
              <p class="text-xs text-gray-500">{{ $t('wizard.sElec.hint') }}</p>
            </div>
          </template>

          <!-- STEP: legal (Admin) -->
          <template v-else-if="currentId === 'legal'">
            <WizardStep :title="$t('wizard.sLegal.title')" :question="$t('wizard.sLegal.question')" />
            <div v-if="legalStatus === null" class="text-sm text-gray-400">{{ $t('common.loading') }} …</div>
            <div v-else class="space-y-3">
              <div v-if="legalIncomplete.length === 0"
                class="card bg-green-900/20 border border-green-700/40 text-sm text-green-300 flex items-center gap-3">
                <span class="text-xl">✅</span>
                <span>{{ $t('wizard.sLegal.allDone') }}</span>
              </div>
              <div v-else class="space-y-2">
                <div class="card bg-amber-900/20 border border-amber-700/40 space-y-2">
                  <p class="text-sm text-amber-300">⚠️ {{ $t('wizard.sLegal.hasPlaceholders') }}</p>
                  <ul class="space-y-1">
                    <li v-for="item in legalIncomplete" :key="item.scope + item.locale"
                      class="text-xs text-gray-300 flex items-center gap-2">
                      <span class="font-mono text-gray-500 w-16 shrink-0">{{ item.scope }}</span>
                      <span class="text-gray-400">{{ item.locale }}</span>
                      <span class="text-amber-400 font-mono text-xs">{{ item.placeholders.join(', ') }}</span>
                    </li>
                  </ul>
                </div>
                <router-link to="/admin/legal" @click="$emit('close')"
                  class="block btn-primary text-sm text-center">
                  {{ $t('wizard.sLegal.editBtn') }}
                </router-link>
              </div>
              <p class="text-xs text-gray-500">{{ $t('wizard.sLegal.hint') }}</p>
            </div>
          </template>

          <!-- STEP: external (Admin) -->
          <template v-else-if="currentId === 'external'">
            <WizardStep :title="$t('wizard.sExt.title')" :question="$t('wizard.sExt.question')" />
            <div class="space-y-4">
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">⚡ {{ $t('wizard.sExt.ocm') }}</p>
                  <span v-if="adminStatus.ocm?.configured" class="text-xs text-green-400">✓ {{ $t('wizard.sExt.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('wizard.sExt.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('wizard.sExt.ocmHint') }}</p>
                <input v-model="draftAdmin.ocm_key" type="password"
                  :placeholder="adminStatus.ocm?.configured ? $t('wizard.sExt.keyChangePlaceholder') : $t('wizard.sExt.keyPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">🗺️ {{ $t('wizard.sExt.here') }}</p>
                  <span v-if="adminStatus.here?.configured" class="text-xs text-green-400">✓ {{ $t('wizard.sExt.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('wizard.sExt.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('wizard.sExt.hereHint') }}</p>
                <input v-model="draftAdmin.here_key" type="password"
                  :placeholder="adminStatus.here?.configured ? $t('wizard.sExt.keyChangePlaceholder') : $t('wizard.sExt.keyPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">🤖 {{ $t('wizard.sExt.grok') }}</p>
                  <span v-if="adminStatus.grok?.configured" class="text-xs text-green-400">✓ {{ $t('wizard.sExt.configured') }}</span>
                  <span v-else class="text-xs text-amber-400">{{ $t('wizard.sExt.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('wizard.sExt.grokEnvHint') }}</p>
                <code v-if="!adminStatus.grok?.configured" class="block bg-gray-950 rounded px-3 py-2 text-xs text-amber-300 font-mono select-all">XAI_API_KEY=your-xai-api-key-here</code>
              </div>
            </div>
          </template>

          <!-- STEP: monitoring (Admin) -->
          <template v-else-if="currentId === 'monitoring'">
            <WizardStep :title="$t('wizard.sMon.title')" :question="$t('wizard.sMon.question')" />
            <div class="space-y-4">
              <div class="card space-y-3">
                <div class="flex items-center gap-3">
                  <span class="flex-1 text-sm text-white">🔄 {{ $t('wizard.sMon.healEnabled') }}</span>
                  <button @click="draftAdmin.heal_enabled = !draftAdmin.heal_enabled"
                    class="w-10 h-5 rounded-full transition relative shrink-0"
                    :class="draftAdmin.heal_enabled ? 'bg-tesla-red' : 'bg-gray-600'">
                    <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                      :class="draftAdmin.heal_enabled ? 'translate-x-5' : 'translate-x-0.5'"></span>
                  </button>
                </div>
                <p class="text-xs text-gray-400">{{ $t('wizard.sMon.healEnabledHint') }}</p>
              </div>
              <div class="card space-y-2">
                <p class="text-sm font-medium text-white">📧 {{ $t('wizard.sMon.alertEmail') }}</p>
                <p class="text-xs text-gray-400">{{ $t('wizard.sMon.alertEmailHint') }}</p>
                <input v-model="draftAdmin.alert_email" type="email"
                  :placeholder="$t('wizard.sMon.alertEmailPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
              <div class="card space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">📨 {{ $t('wizard.sMon.smtpTitle') }}</p>
                  <span v-if="adminStatus.smtp?.configured" class="text-xs text-green-400">✓ {{ $t('wizard.sExt.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('wizard.sExt.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('wizard.sMon.smtpHint') }}</p>
                <div class="grid grid-cols-3 gap-2">
                  <input v-model="draftAdmin.smtp_host" type="text" :placeholder="$t('wizard.sMon.smtpHost')"
                    class="col-span-2 w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                  <input v-model="draftAdmin.smtp_port" type="number" :placeholder="$t('wizard.sMon.smtpPort')"
                    class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                </div>
                <input v-model="draftAdmin.smtp_user" type="email" :placeholder="$t('wizard.sMon.smtpUser')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <input v-model="draftAdmin.smtp_password" type="password" :placeholder="$t('wizard.sMon.smtpPassword')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <input v-model="draftAdmin.smtp_from" type="email" :placeholder="$t('wizard.sMon.smtpFrom')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
                <button v-if="adminStatus.smtp?.configured || draftAdmin.smtp_host"
                  :disabled="smtpTestState === 'sending'"
                  @click="testSmtp"
                  class="w-full py-1.5 rounded-lg text-sm border border-gray-600 text-gray-300 hover:border-gray-400 disabled:opacity-40 transition">
                  {{ smtpTestState === 'sending' ? '…' : smtpTestState === 'ok' ? $t('wizard.sMon.smtpTestSent') : smtpTestState === 'fail' ? $t('wizard.sMon.smtpTestFailed') : $t('wizard.sMon.smtpTest') }}
                </button>
              </div>
              <div class="card space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">🤖 {{ $t('wizard.sMon.anthropicKey') }}</p>
                  <span v-if="adminStatus.anthropic?.configured" class="text-xs text-green-400">✓ {{ $t('wizard.sExt.configured') }}</span>
                  <span v-else class="text-xs text-gray-500">{{ $t('wizard.sExt.notConfigured') }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ $t('wizard.sMon.anthropicKeyHint') }}</p>
                <input v-model="draftAdmin.anthropic_key" type="password"
                  :placeholder="adminStatus.anthropic?.configured ? $t('wizard.sExt.keyChangePlaceholder') : $t('wizard.sExt.keyPlaceholder')"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tesla-red" />
              </div>
            </div>
          </template>

          <!-- STEP: design -->
          <template v-else-if="currentId === 'design'">
            <WizardStep :title="$t('wizard.s2.title')" :question="$t('wizard.s2.question')"
              :current-label="designLabel(draft.theme_design ?? prefs.data.theme_design)" />
            <div class="grid grid-cols-2 gap-3">
              <button v-for="d in DESIGNS" :key="d.key"
                @click="draft.theme_design = d.key"
                class="flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-sm transition text-left"
                :class="(draft.theme_design ?? prefs.data.theme_design) === d.key
                  ? 'border-tesla-red bg-tesla-red/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'">
                <div class="flex items-center gap-2 font-semibold text-white">
                  <span>{{ d.icon }}</span>
                  <span>{{ $t(`wizard.designs.${d.key}.label`, d.label) }}</span>
                  <span v-if="(draft.theme_design ?? prefs.data.theme_design) === d.key" class="ml-auto text-tesla-red text-xs">✓</span>
                </div>
                <span class="text-xs text-gray-400">{{ $t(`wizard.designs.${d.key}.tagline`, d.tagline) }}</span>
              </button>
            </div>
          </template>

          <!-- STEP: color -->
          <template v-else-if="currentId === 'color'">
            <WizardStep :title="$t('wizard.s3.title')" :question="$t('wizard.s3.question')"
              :current-label="themeLabel(draft.theme_color ?? prefs.data.theme_color)" />
            <div class="grid grid-cols-3 gap-3">
              <button v-for="t in THEMES" :key="t.key"
                @click="draft.theme_color = t.key"
                class="flex flex-col items-center gap-2 py-4 rounded-xl border text-sm transition"
                :class="(draft.theme_color ?? prefs.data.theme_color) === t.key
                  ? 'border-white/40 bg-gray-700'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'">
                <span class="w-8 h-8 rounded-full shadow-lg ring-2 ring-offset-2 ring-offset-gray-900 transition"
                  :style="{ background: t.accent }"
                  :class="(draft.theme_color ?? prefs.data.theme_color) === t.key ? 'ring-white' : 'ring-transparent'"></span>
                <span class="text-xs text-gray-300">{{ $t(`wizard.themes.${t.key}.label`, t.label) }}</span>
              </button>
            </div>
          </template>

          <!-- STEP: units -->
          <template v-else-if="currentId === 'units'">
            <WizardStep :title="$t('wizard.s4.title')" :question="$t('wizard.s4.question')" />
            <div class="space-y-4">
              <div class="card space-y-2">
                <p class="text-sm font-medium text-gray-300">{{ $t('wizard.s4.distance') }}</p>
                <div class="flex gap-2">
                  <ToggleChip v-for="o in UNIT_DISTANCE" :key="o.key"
                    :active="(draft.unit_distance ?? prefs.data.unit_distance) === o.key"
                    @click="draft.unit_distance = o.key">{{ o.labelKey ? $t(o.labelKey, o.label) : o.label }}</ToggleChip>
                </div>
              </div>
              <div class="card space-y-2">
                <p class="text-sm font-medium text-gray-300">{{ $t('wizard.s4.temp') }}</p>
                <div class="flex gap-2">
                  <ToggleChip v-for="o in UNIT_TEMP" :key="o.key"
                    :active="(draft.unit_temp ?? prefs.data.unit_temp) === o.key"
                    @click="draft.unit_temp = o.key">{{ o.label }}</ToggleChip>
                </div>
              </div>
              <div class="card space-y-2">
                <p class="text-sm font-medium text-gray-300">{{ $t('wizard.s4.efficiency') }}</p>
                <div class="flex flex-wrap gap-2">
                  <ToggleChip v-for="o in UNIT_EFF" :key="o.key"
                    :active="(draft.unit_efficiency ?? prefs.data.unit_efficiency) === o.key"
                    @click="draft.unit_efficiency = o.key">{{ o.label }}</ToggleChip>
                </div>
              </div>
            </div>
          </template>

          <!-- STEP: dashboard -->
          <template v-else-if="currentId === 'dashboard'">
            <WizardStep :title="$t('wizard.s5.title')" :question="$t('wizard.s5.question')" />
            <p class="text-xs text-gray-400">{{ $t('wizard.s5.hint') }}</p>
            <ul class="space-y-2">
              <li v-for="(card, i) in draftCardOrder" :key="card"
                class="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5">
                <span class="text-lg w-6 text-center">{{ DASHBOARD_CARD_DEFS.find(d => d.key === card)?.icon }}</span>
                <span class="flex-1 text-sm text-white">{{ $t('wizard.s5.cards.' + card) }}</span>
                <button @click="moveCard(i, -1)" :disabled="i === 0"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▲</button>
                <button @click="moveCard(i, 1)" :disabled="i === draftCardOrder.length - 1"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▼</button>
                <button @click="toggleCard(card)"
                  class="w-10 h-5 rounded-full transition relative"
                  :class="draftCardVisible[card] !== false ? 'bg-tesla-red' : 'bg-gray-600'">
                  <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    :class="draftCardVisible[card] !== false ? 'translate-x-5' : 'translate-x-0.5'"></span>
                </button>
              </li>
            </ul>
          </template>

          <!-- STEP: nav -->
          <template v-else-if="currentId === 'nav'">
            <WizardStep :title="$t('wizard.s6.title')" :question="$t('wizard.s6.question')" />
            <p class="text-xs text-gray-400">{{ $t('wizard.s6.hint') }}</p>
            <ul class="space-y-2">
              <li v-for="(item, i) in draftNavOrder" :key="item.key"
                class="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5">
                <span class="text-gray-400 text-xs font-mono w-4 text-center">{{ i+1 }}</span>
                <span class="flex-1 text-sm text-white">{{ $t(`nav.${item.key}.label`, item.label) }}</span>
                <button @click="moveNav(i, -1)" :disabled="i === 0"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▲</button>
                <button @click="moveNav(i, 1)" :disabled="i === draftNavOrder.length - 1"
                  class="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-1">▼</button>
                <button @click="toggleNav(item.key)"
                  class="w-10 h-5 rounded-full transition relative"
                  :class="!draftNavHidden.includes(item.key) ? 'bg-tesla-red' : 'bg-gray-600'">
                  <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    :class="!draftNavHidden.includes(item.key) ? 'translate-x-5' : 'translate-x-0.5'"></span>
                </button>
              </li>
            </ul>
          </template>

          <!-- STEP: notifications -->
          <template v-else-if="currentId === 'notifications'">
            <WizardStep :title="$t('wizard.s7.title')" :question="$t('wizard.s7.question')" />
            <div class="space-y-3">
              <NotifRow v-model="draftNotif.charge" :label="$t('wizard.s7.charging')" icon="⚡" />
              <NotifRow v-model="draftNotif.service" :label="$t('wizard.s7.service')" icon="🔧" />
              <NotifRow v-model="draftNotif.battery" :label="$t('wizard.s7.battery')" icon="🔋">
                <div v-if="draftNotif.battery" class="mt-2 ml-1 space-y-1">
                  <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>{{ $t('wizard.s7.batteryThreshold', { n: draftNotif.batteryThreshold }) }}</span>
                  </div>
                  <input type="range" min="5" max="50" step="5"
                    v-model.number="draftNotif.batteryThreshold"
                    class="w-full accent-tesla-red" />
                </div>
              </NotifRow>
            </div>
          </template>

          <!-- STEP: summary -->
          <template v-else-if="currentId === 'summary'">
            <WizardStep :title="$t('wizard.s8.title')" :question="$t('wizard.s8.question')" />
            <div v-if="summaryRows.length" class="space-y-2">
              <div v-for="row in summaryRows" :key="row.key"
                class="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3">
                <span class="text-lg shrink-0">{{ row.icon }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-400">{{ row.label }}</p>
                  <div class="flex items-center gap-3 flex-wrap mt-0.5">
                    <span class="text-xs text-gray-500 line-through">{{ row.from }}</span>
                    <span class="text-xs text-white font-semibold">→ {{ row.to }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-400 text-center py-4">{{ $t('wizard.s8.noChanges') }}</p>
            <div v-if="saving" class="text-center py-3 text-sm text-gray-400">{{ $t('common.loading') }} …</div>
          </template>

        </div>

        <!-- Footer Buttons -->
        <div class="px-6 py-4 border-t border-gray-800 flex items-center gap-3 shrink-0">
          <template v-if="currentId === 'welcome'">
            <button @click="next" class="flex-1 btn-primary">{{ $t('wizard.start') }}</button>
          </template>
          <template v-else-if="isLast">
            <button @click="discard" class="btn-secondary px-4 text-red-400 hover:text-red-300">{{ $t('wizard.discard') }}</button>
            <button @click="back" class="btn-secondary px-4">{{ $t('wizard.back') }}</button>
            <button @click="confirm" :disabled="saving" class="flex-1 btn-primary">{{ $t('wizard.confirm') }}</button>
          </template>
          <template v-else>
            <button @click="back" class="btn-secondary px-4">{{ $t('wizard.back') }}</button>
            <button @click="skip" class="flex-1 text-sm text-gray-400 hover:text-white transition">{{ $t('wizard.skip') }}</button>
            <button @click="next" class="btn-primary px-6">{{ $t('wizard.next') }}</button>
          </template>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePrefsStore, DASHBOARD_CARD_DEFS, PREF_KEYS } from '../store/prefs.js';
import { LANGS } from '../store/lang.js';
import LangSwitcher from './LangSwitcher.vue';
import { THEMES, DESIGNS } from '../store/theme.js';
import { ALL_LINKS } from '../store/nav.js';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';

const emit = defineEmits(['close', 'done']);
const { t } = useI18n();
const prefs = usePrefsStore();
const auth  = useAuthStore();

// ─── Schritt-Liste ──────────────────────────────────────────────────────────

const STEPS = computed(() =>
  ['welcome', 'lang', 'design', 'color', 'units', 'dashboard', 'nav', 'notifications', 'summary']
);

const step      = ref(0);
const currentId = computed(() => STEPS.value[step.value] ?? 'summary');
const isLast    = computed(() => step.value === STEPS.value.length - 1);
const saving    = ref(false);

// ─── Optionen ──────────────────────────────────────────────────────────────

const UNIT_DISTANCE = [
  { key: 'km', label: 'km' },
  { key: 'mi', labelKey: 'wizard.s4.miles', label: 'Meilen (mi)' },
];
const UNIT_TEMP = [
  { key: 'celsius',    label: '°C (Celsius)' },
  { key: 'fahrenheit', label: '°F (Fahrenheit)' },
];
const UNIT_EFF = [
  { key: 'kwh100', label: 'kWh/100 km' },
  { key: 'whkm',  label: 'Wh/km' },
  { key: 'mpkwh', label: 'mi/kWh' },
];

// ─── Draft-Zustand (Prefs) ─────────────────────────────────────────────────

const draft = ref({});

const draftCardVisible = ref({ ...(prefs.data.dashboard_cards ?? {}) });
const draftCardOrder   = ref([...(prefs.data.dashboard_card_order ?? DASHBOARD_CARD_DEFS.map(d => d.key))]);

for (const d of DASHBOARD_CARD_DEFS) {
  if (!draftCardOrder.value.includes(d.key))   draftCardOrder.value.push(d.key);
  if (draftCardVisible.value[d.key] === undefined) draftCardVisible.value[d.key] = true;
}

const navItems = ALL_LINKS.filter(l => !l.adminOnly);
const draftNavOrder  = ref((() => {
  const saved = prefs.data.nav_order;
  if (saved?.length) {
    const map = Object.fromEntries(navItems.map(l => [l.key, l]));
    return saved.map(k => map[k]).filter(Boolean);
  }
  return [...navItems];
})());
const draftNavHidden = ref([...(prefs.data.nav_hidden ?? [])]);

const draftNotif = ref({
  charge:           prefs.data[PREF_KEYS.NOTIF_CHARGE]    ?? true,
  service:          prefs.data[PREF_KEYS.NOTIF_SERVICE]   ?? true,
  battery:          prefs.data[PREF_KEYS.NOTIF_BATTERY]   ?? false,
  batteryThreshold: prefs.data[PREF_KEYS.NOTIF_BATTERY_T] ?? 20,
});

// ─── Admin-Draft (externe Keys, Monitoring) ────────────────────────────────

const adminStatus = ref({ ocm: null, here: null, grok: null, email: null, anthropic: null, smtp: null, loading: false });
const draftAdmin  = ref({ ocm_key: '', here_key: '', alert_email: '', heal_enabled: true, anthropic_key: '',
  smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_from: '' });
const smtpTestState = ref('');  // '' | 'sending' | 'ok' | 'fail'

// ─── OAuth-State ───────────────────────────────────────────────────────────

const oauthStatus     = ref('checking'); // 'checking' | 'connected' | 'disconnected'
const oauthOpening    = ref(false);
const oauthMode       = ref('fleet');
const ownerApiTab     = ref(false);
const ownerApiToken   = ref('');
const ownerApiConnecting = ref(false);
const ownerApiError   = ref('');

async function checkOauthStatus() {
  oauthStatus.value = 'checking';
  try {
    const { data } = await api.get('/auth/tesla/status');
    oauthStatus.value = data.connected ? 'connected' : 'disconnected';
    oauthMode.value = data.mode || 'fleet';
    if (data.mode === 'owner') ownerApiTab.value = true;
  } catch {
    oauthStatus.value = 'disconnected';
  }
}

async function connectOwnerApi() {
  ownerApiConnecting.value = true;
  ownerApiError.value = '';
  try {
    await api.post('/auth/tesla/connect-owner-token', { refresh_token: ownerApiToken.value.trim() });
    ownerApiToken.value = '';
    await checkOauthStatus();
  } catch (err) {
    ownerApiError.value = err.response?.data?.error || err.message;
  } finally {
    ownerApiConnecting.value = false;
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
    // Fallback: wenn Popup geschlossen, Status prüfen
    const timer = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(timer);
        window.removeEventListener('message', onMsg);
        await checkOauthStatus();
      }
    }, 1000);
  } finally {
    oauthOpening.value = false;
  }
}

// ─── Fahrzeuge ─────────────────────────────────────────────────────────────

const vehicles      = ref([]);
const vehicleSyncing   = ref(false);
const vehicleSyncError = ref('');

async function loadVehicles() {
  try {
    const { data } = await api.get('/vehicles');
    vehicles.value = data;
  } catch { /* ignore */ }
}

async function syncVehicles() {
  vehicleSyncing.value  = true;
  vehicleSyncError.value = '';
  try {
    await api.post('/vehicles/sync');
    await loadVehicles();
  } catch (e) {
    vehicleSyncError.value = e.response?.data?.error || e.message;
  } finally {
    vehicleSyncing.value = false;
  }
}

// ─── Virtual Key + Telemetry ───────────────────────────────────────────────

const telemetryStatus     = ref(null);
const telemetryConfiguring = reactive({});
const vkCopied = ref(false);

async function loadTelemetryStatus() {
  try {
    const { data } = await api.get('/telemetry/status');
    telemetryStatus.value = data;
  } catch { /* ignore */ }
}

async function configureTelemetry(vin) {
  telemetryConfiguring[vin] = true;
  try {
    await api.post(`/telemetry/configure/${vin}`);
    await loadTelemetryStatus();
  } catch { /* ignore */ } finally {
    telemetryConfiguring[vin] = false;
  }
}

function copyVkUrl() {
  if (!telemetryStatus.value?.registration_url) return;
  navigator.clipboard.writeText(telemetryStatus.value.registration_url);
  vkCopied.value = true;
  setTimeout(() => { vkCopied.value = false; }, 2000);
}

function telemetryBadgeClass(status) {
  return {
    streaming:        'bg-green-900/50 text-green-300',
    registered_idle:  'bg-blue-900/50 text-blue-300',
    not_registered:   'bg-gray-700 text-gray-400',
    approval_missing: 'bg-amber-900/50 text-amber-300',
    error:            'bg-red-900/50 text-red-300',
  }[status] ?? 'bg-gray-700 text-gray-400';
}

// ─── Strompreis ────────────────────────────────────────────────────────────

const draftElectricity = reactive({});

// ─── Legal-Check ───────────────────────────────────────────────────────────

const legalStatus = ref(null);

const legalIncomplete = computed(() => {
  if (!legalStatus.value) return [];
  return legalStatus.value
    .map(row => {
      const matches = (row.body_md || '').match(/<<[^>]+>>/g) ?? [];
      return { ...row, placeholders: [...new Set(matches)] };
    })
    .filter(row => row.placeholders.length > 0);
});

async function loadLegalStatus() {
  try {
    const { data } = await api.get('/legal/admin/all');
    legalStatus.value = data;
  } catch { legalStatus.value = []; }
}

// ─── onMounted ─────────────────────────────────────────────────────────────

onMounted(async () => {
  if (!auth.isAdmin) return;
  adminStatus.value.loading = true;
  const [ocm, here, grok, emailSt, monCfg, smtpCfg] = await Promise.all([
    api.get('/routing/ocm-config').then(r => r.data).catch(() => null),
    api.get('/routing/traffic-config').then(r => r.data).catch(() => null),
    api.get('/grok/config').then(r => r.data).catch(() => null),
    api.get('/system/email-status').then(r => r.data).catch(() => null),
    api.get('/system/monitoring-config').then(r => r.data).catch(() => null),
    api.get('/system/smtp-config').then(r => r.data).catch(() => null),
  ]);
  adminStatus.value = { ocm, here, grok, email: emailSt,
    anthropic: { configured: monCfg?.anthropic_configured ?? false },
    smtp: { configured: smtpCfg?.configured ?? false },
    loading: false };
  draftAdmin.value.alert_email  = monCfg?.alert_email  ?? '';
  draftAdmin.value.heal_enabled = monCfg?.heal_enabled ?? true;
  draftAdmin.value.smtp_host    = smtpCfg?.host || '';
  draftAdmin.value.smtp_port    = smtpCfg?.port || '587';
  draftAdmin.value.smtp_user    = smtpCfg?.user || '';
  draftAdmin.value.smtp_from    = smtpCfg?.from || '';

  await Promise.all([
    checkOauthStatus(),
    loadVehicles(),
    loadTelemetryStatus(),
    loadLegalStatus(),
  ]);
});

// ─── Dashboard-Karten ──────────────────────────────────────────────────────

function moveCard(i, dir) {
  const arr = [...draftCardOrder.value];
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  draftCardOrder.value = arr;
}

function toggleCard(key) {
  draftCardVisible.value = { ...draftCardVisible.value, [key]: draftCardVisible.value[key] === false };
}

// ─── Navigation ────────────────────────────────────────────────────────────

function moveNav(i, dir) {
  const arr = [...draftNavOrder.value];
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  draftNavOrder.value = arr;
}

function toggleNav(key) {
  draftNavHidden.value = draftNavHidden.value.includes(key)
    ? draftNavHidden.value.filter(k => k !== key)
    : [...draftNavHidden.value, key];
}

// ─── Wizard-Navigation ─────────────────────────────────────────────────────

function next() { step.value = Math.min(step.value + 1, STEPS.value.length - 1); }
function back() { step.value = Math.max(step.value - 1, 0); }
function skip() { next(); }

function discard() {
  draft.value = {};
  emit('close');
}

// ─── Labels ────────────────────────────────────────────────────────────────

function langLabel(code)   { return LANGS.find(l => l.code === code)?.label    ?? code; }
function designLabel(key)  { return key ? t(`wizard.designs.${key}.label`, DESIGNS.find(d => d.key === key)?.label ?? key) : key; }
function themeLabel(key)   { return key ? t(`wizard.themes.${key}.label`,  THEMES.find(d => d.key === key)?.label  ?? key) : key; }

// ─── Zusammenfassung ───────────────────────────────────────────────────────

const summaryRows = computed(() => {
  const rows = [];
  const add = (key, icon, label, from, to) => {
    if (String(from) !== String(to)) rows.push({ key, icon, label, from: String(from), to: String(to) });
  };

  if (draft.value.lang != null)
    add('lang', '🌐', t('wizard.s1.title'), langLabel(prefs.data.lang), langLabel(draft.value.lang));
  if (draft.value.theme_design != null)
    add('theme_design', '🎨', t('wizard.s2.title'), designLabel(prefs.data.theme_design), designLabel(draft.value.theme_design));
  if (draft.value.theme_color != null)
    add('theme_color', '🎨', t('wizard.s3.title'), themeLabel(prefs.data.theme_color), themeLabel(draft.value.theme_color));
  if (draft.value.unit_distance != null)
    add('unit_distance', '📏', t('wizard.s4.distance'), prefs.data.unit_distance, draft.value.unit_distance);
  if (draft.value.unit_temp != null)
    add('unit_temp', '🌡️', t('wizard.s4.temp'), prefs.data.unit_temp, draft.value.unit_temp);
  if (draft.value.unit_efficiency != null)
    add('unit_eff', '⚡', t('wizard.s4.efficiency'), prefs.data.unit_efficiency, draft.value.unit_efficiency);

  const origCards = JSON.stringify(prefs.data.dashboard_cards ?? {});
  const origOrder = JSON.stringify(prefs.data.dashboard_card_order ?? []);
  if (JSON.stringify(draftCardVisible.value) !== origCards || JSON.stringify(draftCardOrder.value) !== origOrder)
    rows.push({ key: 'dashboard', icon: '📊', label: t('wizard.s5.title'), from: '—', to: t('wizard.s5.changed') });

  const origNavOrder  = JSON.stringify(prefs.data.nav_order ?? []);
  const origNavHidden = JSON.stringify(prefs.data.nav_hidden ?? []);
  if (JSON.stringify(draftNavOrder.value.map(l => l.key)) !== origNavOrder ||
      JSON.stringify(draftNavHidden.value) !== origNavHidden)
    rows.push({ key: 'nav', icon: '🧭', label: t('wizard.s6.title'), from: '—', to: t('wizard.s6.changed') });

  if (draftNotif.value.charge !== prefs.data[PREF_KEYS.NOTIF_CHARGE])
    rows.push({ key: 'notif_charge', icon: '🔔', label: t('wizard.s7.charging'), from: prefs.data[PREF_KEYS.NOTIF_CHARGE] ? '✓' : '✗', to: draftNotif.value.charge ? '✓' : '✗' });

  if (auth.isAdmin) {
    // Strompreise
    for (const [vid, rate] of Object.entries(draftElectricity)) {
      if (rate == null || isNaN(rate)) continue;
      const v = vehicles.value.find(x => String(x.id) === String(vid));
      if (!v || String(v.electricity_rate_kwh) === String(rate)) continue;
      rows.push({ key: 'elec_' + vid, icon: '💡', label: (v.display_name || v.vin) + ' ' + t('wizard.sElec.title'), from: (v.electricity_rate_kwh ?? '—') + ' €/kWh', to: rate + ' €/kWh' });
    }
    if (draftAdmin.value.ocm_key.trim())
      rows.push({ key: 'ocm_key', icon: '⚡', label: t('wizard.sExt.ocm'), from: '—', to: t('wizard.sExt.keySaved') });
    if (draftAdmin.value.here_key.trim())
      rows.push({ key: 'here_key', icon: '🗺️', label: t('wizard.sExt.here'), from: '—', to: t('wizard.sExt.keySaved') });
    if (draftAdmin.value.alert_email)
      rows.push({ key: 'alert_email', icon: '📧', label: t('wizard.sMon.alertEmail'), from: '—', to: draftAdmin.value.alert_email });
    if (draftAdmin.value.anthropic_key.trim())
      rows.push({ key: 'anthropic_key', icon: '🤖', label: t('wizard.sMon.anthropicKey'), from: '—', to: t('wizard.sExt.keySaved') });
    if (draftAdmin.value.smtp_host.trim())
      rows.push({ key: 'smtp', icon: '📨', label: t('wizard.sMon.smtpTitle'), from: '—', to: draftAdmin.value.smtp_host });
  }

  return rows;
});

// ─── Confirm & Speichern ───────────────────────────────────────────────────

async function testSmtp() {
  smtpTestState.value = 'sending';
  try {
    await api.post('/system/smtp-test', {});
    smtpTestState.value = 'ok';
  } catch {
    smtpTestState.value = 'fail';
  }
  setTimeout(() => { smtpTestState.value = ''; }, 4000);
}

async function confirm() {
  saving.value = true;
  try {
    const delta = {
      ...draft.value,
      dashboard_cards:      draftCardVisible.value,
      dashboard_card_order: draftCardOrder.value,
      nav_order:  draftNavOrder.value.map(l => l.key),
      nav_hidden: draftNavHidden.value,
      [PREF_KEYS.NOTIF_CHARGE]:    draftNotif.value.charge,
      [PREF_KEYS.NOTIF_SERVICE]:   draftNotif.value.service,
      [PREF_KEYS.NOTIF_BATTERY]:   draftNotif.value.battery,
      [PREF_KEYS.NOTIF_BATTERY_T]: draftNotif.value.batteryThreshold,
      wizard_completed: true,
    };
    await prefs.save(delta);

    if (auth.isAdmin) {
      const adminCalls = [];

      // Strompreise pro Fahrzeug
      for (const [vid, rate] of Object.entries(draftElectricity)) {
        if (rate == null || isNaN(rate)) continue;
        const v = vehicles.value.find(x => String(x.id) === String(vid));
        if (!v || String(v.electricity_rate_kwh) === String(rate)) continue;
        adminCalls.push(api.put(`/vehicles/${vid}`, { electricity_rate_kwh: rate }));
      }

      if (draftAdmin.value.ocm_key.trim())
        adminCalls.push(api.put('/routing/ocm-config',      { ocm_api_key:  draftAdmin.value.ocm_key.trim() }));
      if (draftAdmin.value.here_key.trim())
        adminCalls.push(api.put('/routing/traffic-config',  { here_api_key: draftAdmin.value.here_key.trim() }));

      const monPayload = {
        alert_email:  draftAdmin.value.alert_email,
        heal_enabled: draftAdmin.value.heal_enabled,
      };
      if (draftAdmin.value.anthropic_key.trim())
        monPayload.anthropic_key = draftAdmin.value.anthropic_key.trim();
      adminCalls.push(api.put('/system/monitoring-config', monPayload));

      if (draftAdmin.value.smtp_host.trim() || draftAdmin.value.smtp_user.trim()) {
        const smtpPayload = {
          host: draftAdmin.value.smtp_host,
          port: draftAdmin.value.smtp_port,
          user: draftAdmin.value.smtp_user,
          from: draftAdmin.value.smtp_from,
        };
        if (draftAdmin.value.smtp_password.trim())
          smtpPayload.password = draftAdmin.value.smtp_password.trim();
        adminCalls.push(api.put('/system/smtp-config', smtpPayload));
      }

      await Promise.all(adminCalls);
    }

    emit('done');
    emit('close');
  } finally {
    saving.value = false;
  }
}
</script>

<script>
// ─── Interne Hilfskomponenten ──────────────────────────────────────────────

const WizardStep = {
  props: ['title', 'question', 'currentLabel'],
  template: `
    <div>
      <h3 class="text-lg font-bold text-white">{{ title }}</h3>
      <p class="text-sm text-gray-300 mt-1">{{ question }}</p>
      <p v-if="currentLabel" class="text-xs text-gray-500 mt-1">Aktuell: <span class="text-gray-300">{{ currentLabel }}</span></p>
    </div>
  `,
};

const ToggleChip = {
  props: ['active'],
  emits: ['click'],
  template: `
    <button @click="$emit('click')"
      class="px-4 py-2 rounded-xl text-sm font-medium transition border"
      :class="active
        ? 'bg-tesla-red border-tesla-red text-white'
        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'">
      <slot />
    </button>
  `,
};

const NotifRow = {
  props: ['modelValue', 'label', 'icon'],
  emits: ['update:modelValue'],
  template: `
    <div class="bg-gray-800 rounded-xl px-4 py-3 space-y-1">
      <div class="flex items-center gap-3">
        <span class="text-xl">{{ icon }}</span>
        <span class="flex-1 text-sm text-white">{{ label }}</span>
        <button @click="$emit('update:modelValue', !modelValue)"
          class="w-10 h-5 rounded-full transition relative"
          :class="modelValue ? 'bg-tesla-red' : 'bg-gray-600'">
          <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'"></span>
        </button>
      </div>
      <slot />
    </div>
  `,
};

export default { components: { WizardStep, ToggleChip, NotifRow } };
</script>

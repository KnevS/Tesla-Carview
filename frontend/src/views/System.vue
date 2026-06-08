<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <AppIcon name="system" :size="24" class="text-tesla-red" />
        System &amp; Version
      </h1>
      <RouterLink to="/admin"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition">
        ← Übersicht
      </RouterLink>
    </div>

    <!-- System-Health-Karte (Admin-only). Schnelle Diagnose-Ampel
         fuer alle Subsysteme. -->
    <div v-if="health" class="card space-y-3"
         :class="health.summary === 'error' ? 'border border-red-700/50 bg-red-900/10'
               : health.summary === 'warn'  ? 'border border-yellow-700/50 bg-yellow-900/10'
               : 'border border-green-700/40 bg-green-900/10'">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h2 class="font-semibold flex items-center gap-2">
          <AppIcon :name="health.summary === 'error' ? 'alert' : health.summary === 'warn' ? 'info' : 'check'" :size="20"
                   :class="health.summary === 'error' ? 'text-red-400' : health.summary === 'warn' ? 'text-yellow-400' : 'text-green-400'" />
          System-Status
        </h2>
        <button @click="loadHealth" class="text-xs btn-secondary py-1 px-2 inline-flex items-center gap-1.5"
          v-tooltip="'Health-Status neu abfragen.'">
          <AppIcon name="refresh" :size="14" />
          Aktualisieren
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div v-for="c in health.checks" :key="c.key"
             class="bg-gray-800 rounded-lg p-2 flex items-start gap-2"
             :class="c.status === 'info' ? 'opacity-60' : ''">
          <AppIcon
            :name="c.status === 'error' ? 'x' : c.status === 'warn' ? 'alert' : c.status === 'ok' ? 'check' : 'info'"
            :size="18"
            :class="c.status === 'error' ? 'text-red-400' : c.status === 'warn' ? 'text-yellow-400' : c.status === 'ok' ? 'text-green-400' : 'text-gray-500'" />
          <div class="min-w-0 flex-1">
            <p class="font-medium">{{ c.label }}</p>
            <p class="text-xs text-gray-400">{{ c.message }}</p>
            <RouterLink v-if="c.status === 'info' && c.key === 'ocm'"
              to="/admin/settings"
              class="text-xs text-blue-400 hover:underline">Einrichten →</RouterLink>
            <RouterLink v-if="c.status === 'info' && c.key === 'here'"
              to="/admin/settings"
              class="text-xs text-blue-400 hover:underline">Einrichten →</RouterLink>
          </div>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        Uptime: {{ Math.round(health.uptime_seconds / 60) }} Min · Node {{ health.node_version }}
      </p>

      <!-- Naechtliche Wartung — Status + manueller Trigger. Der
           Scheduler laeuft taeglich ~03:30 Europe/Berlin. -->
      <div class="border-t border-white/5 pt-3 mt-2 space-y-2">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <p class="text-sm font-medium flex items-center gap-1.5">
            <AppIcon name="clock" :size="16" class="text-indigo-300" />
            Nächtliche Wartung
            <span v-if="maintLog.auto_update_enabled" class="text-xs text-green-300 ml-2">Auto-Update: AN</span>
            <span v-else class="text-xs text-gray-500 ml-2">Auto-Update: aus</span>
          </p>
          <button @click="runMaintenanceNow" :disabled="maintBusy"
            class="text-xs btn-secondary py-1 px-2 disabled:opacity-40"
            v-tooltip="'Wartungslauf jetzt sofort ausfuehren — gleicher Code wie um 03:30. Dauert je nach DB-Groesse ein paar Sekunden.'">
            {{ maintBusy ? 'Laeuft…' : 'Jetzt ausführen' }}
          </button>
        </div>
        <p v-if="!maintLog.runs?.length" class="text-xs text-gray-500">
          Noch kein Lauf protokolliert (Backend läuft seit weniger als einem Tag, oder Logbuch ist leer).
        </p>
        <details v-else class="text-xs">
          <summary class="cursor-pointer text-gray-400 hover:text-white">
            Letzter Lauf: {{ fmtTs(maintLog.runs[0].at) }} · {{ (maintLog.runs[0].durationMs / 1000).toFixed(1) }} s
          </summary>
          <pre class="mt-2 bg-gray-900 rounded p-2 text-[11px] overflow-x-auto">{{ JSON.stringify(maintLog.runs[0].tasks, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <!-- Version info -->
    <div class="card grid md:grid-cols-2 gap-6">
      <div class="space-y-3">
        <h2 class="font-semibold text-tesla-red flex items-center gap-2">
          <AppIcon name="bolt" :size="20" />
          Tesla Carview
        </h2>
        <DataRow label="Version"       :value="'v' + (ver.version ?? '…')"  tooltip="Versionsnummer der Anwendung (aus package.json)" />
        <DataRow label="Git-Hash"      :value="ver.git?.hash ?? '…'"        tooltip="Kurz-Hash des aktuellen Git-Commits – eindeutige Build-ID" />
        <DataRow label="Branch"        :value="ver.git?.branch ?? '…'"      tooltip="Git-Branch der aktuell laufenden Instanz" />
        <DataRow label="Build-Datum"   :value="fmtDate(ver.git?.date)"      tooltip="Datum des letzten Commits (Zeitpunkt des letzten Deployments)" />
        <DataRow label="Node.js"       :value="ver.nodeVersion ?? '…'"      tooltip="Node.js-Version des Backend-Prozesses" />
        <DataRow label="Server-Uptime" :value="fmtUp(ver.uptime)"           tooltip="Wie lange der Backend-Prozess läuft (seit letztem Neustart)" />
      </div>
      <div class="flex flex-col items-center justify-center gap-2 opacity-30 select-none">
        <AppIcon name="bolt" :size="128" class="text-tesla-red" />
        <div class="text-sm text-gray-400">Tesla Carview v{{ ver.version }}</div>
      </div>
    </div>

    <!-- Update-Status (admin only) -->
    <div v-if="isAdmin" class="card space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold flex items-center gap-2" v-tooltip="'Vergleicht den aktuell laufenden Build mit dem neuesten Commit auf GitHub'">
          <AppIcon name="refresh" :size="20" class="text-tesla-red" />
          Software-Update
        </h2>
        <button @click="checkUpdate" :disabled="updateChecking"
          class="btn-secondary text-xs px-3 py-1"
          v-tooltip="'GitHub nach neuen Commits abfragen'">
          {{ updateChecking ? 'Prüfe…' : 'Jetzt prüfen' }}
        </button>
      </div>

      <div v-if="updateError" class="text-yellow-400 text-sm">{{ updateError }}</div>

      <template v-else-if="updateInfo">
        <div v-if="updateInfo.updateAvailable"
          class="flex items-start gap-3 bg-green-900/30 border border-green-700/50 rounded-xl p-4">
          <div class="text-2xl">🆕</div>
          <div class="space-y-1 text-sm">
            <p class="font-semibold text-green-300">Update verfügbar!</p>
            <p class="text-gray-300">Neuer Commit: <code class="text-green-300">{{ updateInfo.latest }}</code>
              <span v-if="updateInfo.latestDate" class="text-gray-500 ml-2">{{ fmtDate(updateInfo.latestDate) }}</span>
            </p>
            <p v-if="updateInfo.latestMsg" class="text-gray-400 italic">„{{ updateInfo.latestMsg }}"</p>
            <div class="mt-3 bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-300 space-y-1">
              <p class="text-gray-500"># Auf dem Server ausführen:</p>
              <p>bash /opt/tesla-carview/deploy/update.sh</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
              <AppIcon name="check" :size="14" class="text-green-400 flex-shrink-0 mt-0.5" />
              <span>Alle Daten bleiben erhalten – die Datenbanken liegen im Docker-Volume
              <code>tesla_data</code> und werden beim Update nicht berührt.</span>
            </p>

          </div>
        </div>

        <div v-else class="flex items-center gap-2 text-green-400 text-sm">
          <span>✓</span>
          <span>Aktuell – du läufst den neuesten Build
            (<code class="text-gray-300">{{ updateInfo.current }}</code>).
          </span>
        </div>
      </template>

      <div v-else class="text-sm text-gray-500">
        Klicke „Jetzt prüfen" um nach Updates zu suchen.
      </div>

      <!-- Deploy-Trigger (admin) — immer sichtbar, auch bei aktuellem Build -->
      <div class="border-t border-white/5 pt-3 mt-2 flex items-center justify-between gap-3 flex-wrap">
        <p class="text-xs text-gray-400 flex items-center gap-1.5"
           v-tooltip="'Deployment manuell auslösen — nützlich um nach Fehlern einen Force-Redeploy zu starten. Erfordert DEPLOY_WEBHOOK_URL in backend/.env.'">
          <AppIcon name="bolt" :size="14" class="text-[var(--accent)]"/>
          In-App Deployment
          <InfoTip text="Startet update.sh auf dem Host. Konfiguration: DEPLOY_WEBHOOK_URL in backend/.env setzen." />
        </p>
        <button @click="triggerDeploy" :disabled="deployBusy"
          class="text-xs btn-secondary py-1 px-3 flex items-center gap-1.5 disabled:opacity-40"
          v-tooltip="'Deployment jetzt auslösen'">
          <span v-if="deployBusy" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <AppIcon v-else name="bolt" :size="14" />
          {{ deployBusy ? 'Startet…' : updateInfo?.updateAvailable ? 'Jetzt deployen' : 'Force-Redeploy' }}
        </button>
      </div>
      <p v-if="deployMsg" class="text-xs mt-1" :class="deployOk ? 'text-green-400' : 'text-yellow-400'">{{ deployMsg }}</p>

      <!-- Auto-Update Hinweis -->
      <details class="text-xs text-gray-500 border-t border-gray-800 pt-3">
        <summary class="cursor-pointer hover:text-gray-300 transition">
          ⏰ Automatische Updates einrichten (optional)
        </summary>
        <div class="mt-3 bg-gray-900 rounded-lg p-3 font-mono space-y-1 text-gray-300">
          <p class="text-gray-500"># Täglich um 03:00 Uhr automatisch updaten:</p>
          <p>crontab -e</p>
          <p class="text-yellow-300">0 3 * * * bash /opt/tesla-carview/deploy/update.sh >> /var/log/tesla-carview-update.log 2>&1</p>
        </div>
        <p class="mt-2 text-gray-600">
          Daten sind auch bei automatischen Updates sicher – Docker-Volumes bleiben immer erhalten.
        </p>
      </details>
    </div>

    <!-- Fahrzeug-Firmware-Historie -->
    <div v-if="selectedVehicle" class="card space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h2 class="font-semibold flex items-center gap-2">
          <AppIcon name="refresh" :size="20" class="text-blue-400" />
          {{ $t('system.firmware.title') }}
          <InfoTip :text="$t('system.firmware.titleTip')" />
        </h2>
        <span v-if="firmware.current" class="text-xs bg-blue-900/40 border border-blue-700/40 text-blue-300 px-2 py-0.5 rounded-full">
          {{ $t('system.firmware.current') }}: {{ firmware.current.version }}
        </span>
      </div>
      <div v-if="firmware.history?.length" class="space-y-1">
        <div v-for="(f, idx) in firmware.history" :key="f.version"
          class="flex items-center gap-3 p-2.5 rounded-lg transition"
          :class="idx === 0 ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-gray-800'">
          <div class="w-2 h-2 rounded-full shrink-0"
            :class="idx === 0 ? 'bg-blue-400' : 'bg-gray-600'"></div>
          <div class="flex-1 min-w-0">
            <span class="font-mono text-sm" :class="idx === 0 ? 'text-blue-300' : 'text-gray-300'">
              {{ f.version }}
            </span>
            <span v-if="idx === 0" class="ml-2 text-xs text-blue-400">{{ $t('system.firmware.currentTag') }}</span>
          </div>
          <div class="text-xs text-gray-500 shrink-0">
            {{ fmtDate(f.detected_at) }}
          </div>
        </div>
      </div>
      <p v-else class="text-gray-400 text-sm">{{ $t('system.firmware.noData') }}</p>
      <p class="text-xs text-gray-600">{{ $t('system.firmware.hint') }}</p>
    </div>

    <!-- System stats (admin only) -->
    <template v-if="stats">
      <div class="grid md:grid-cols-2 gap-4">
        <!-- CPU -->
        <div class="card space-y-3">
          <h2 class="font-semibold" v-tooltip="'CPU-Auslastung des Servers (1-Minuten Load Average / Anzahl Kerne)'">🖥 CPU</h2>
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-400">Auslastung</span>
              <span class="font-medium">{{ stats.system.cpuUsagePct }}%</span>
            </div>
            <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                :class="Number(stats.system.cpuUsagePct) >= 90 ? 'bg-red-500' : Number(stats.system.cpuUsagePct) >= 70 ? 'bg-yellow-500' : 'bg-green-500'"
                :style="{ width: Math.min(100, stats.system.cpuUsagePct) + '%' }"></div>
            </div>
          </div>
          <DataRow label="Kerne"    :value="stats.system.cpuCores"    tooltip="Anzahl logischer CPU-Kerne" />
          <DataRow label="Modell"   :value="stats.system.cpuModel"    tooltip="CPU-Modell des Servers" />
          <DataRow label="Load 1m"  :value="stats.system.loadAvg[0].toFixed(2)" tooltip="Systemlast der letzten 1 Minute" />
          <DataRow label="Load 5m"  :value="stats.system.loadAvg[1].toFixed(2)" tooltip="Systemlast der letzten 5 Minuten" />
          <DataRow label="Load 15m" :value="stats.system.loadAvg[2].toFixed(2)" tooltip="Systemlast der letzten 15 Minuten" />
        </div>

        <!-- RAM -->
        <div class="card space-y-3">
          <h2 class="font-semibold flex items-center gap-2" v-tooltip="'Arbeitsspeichernutzung des gesamten Systems'">
            <AppIcon name="database" :size="20" class="text-tesla-red" />
            Arbeitsspeicher
          </h2>
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-400">Belegt</span>
              <span class="font-medium">{{ fmtB(stats.system.memory.used) }} / {{ fmtB(stats.system.memory.total) }}</span>
            </div>
            <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                :class="Number(stats.system.memory.usedPct) >= 90 ? 'bg-red-500' : Number(stats.system.memory.usedPct) >= 70 ? 'bg-yellow-500' : 'bg-green-500'"
                :style="{ width: Math.min(100, Number(stats.system.memory.usedPct)) + '%' }"></div>
            </div>
          </div>
          <DataRow label="Belegt"  :value="fmtB(stats.system.memory.used)"  tooltip="Belegter Arbeitsspeicher" />
          <DataRow label="Frei"    :value="fmtB(stats.system.memory.free)"  tooltip="Freier Arbeitsspeicher" />
          <DataRow label="Gesamt"  :value="fmtB(stats.system.memory.total)" tooltip="Gesamter Arbeitsspeicher des Servers" />
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <!-- Process -->
        <div class="card space-y-3">
          <h2 class="font-semibold" v-tooltip="'Speichernutzung des Node.js Backend-Prozesses'">⚙️ Node.js Prozess</h2>
          <DataRow label="PID"           :value="stats.process.pid"                            tooltip="Prozess-ID des Backends" />
          <DataRow label="Heap belegt"   :value="fmtB(stats.process.memUsage.heapUsed)"        tooltip="Vom JavaScript-Heap belegter Speicher" />
          <DataRow label="Heap gesamt"   :value="fmtB(stats.process.memUsage.heapTotal)"       tooltip="Gesamter vom Prozess reservierter Heap" />
          <DataRow label="RSS"           :value="fmtB(stats.process.memUsage.rss)"             tooltip="Resident Set Size – gesamter Speicher des Prozesses inkl. C++-Teile" />
          <DataRow label="Prozess-Uptime" :value="fmtUp(stats.process.uptime)"                 tooltip="Wie lange der Backend-Prozess läuft" />
        </div>

        <!-- Database -->
        <div class="card space-y-3">
          <h2 class="font-semibold" v-tooltip="'SQLite-Datenbankstatistiken'">🗄 Datenbank</h2>
          <DataRow label="Dateigröße"       :value="fmtB(stats.database.sizeByte)"              tooltip="Aktuelle Größe der SQLite-Datenbankdatei" />
          <DataRow label="Fahrten"          :value="stats.database.records.trips"                tooltip="Gespeicherte Fahrten" />
          <DataRow label="Ladevorgänge"     :value="stats.database.records.charging_sessions"    tooltip="Gespeicherte Ladesessions" />
          <DataRow label="Akku-Snapshots"   :value="stats.database.records.battery_snapshots"    tooltip="Batteriezustand-Snapshots (alle 15 min)" />
          <DataRow label="Betriebsbuch"     :value="stats.database.records.logbook_entries"      tooltip="Betriebsbucheinträge" />
          <DataRow label="Audit-Einträge"   :value="stats.database.records.audit_logs"           tooltip="Sicherheitsprotokolleinträge" />
        </div>
      </div>

      <!-- Server info -->
      <div class="card space-y-3">
        <h2 class="font-semibold" v-tooltip="'Allgemeine Serverinformationen'">🖥 Server</h2>
        <div class="grid md:grid-cols-2 gap-x-8">
          <DataRow label="Hostname"    :value="stats.system.hostname"         tooltip="Hostname des Servers" />
          <DataRow label="Plattform"   :value="stats.system.platform"         tooltip="Betriebssystem" />
          <DataRow label="Architektur" :value="stats.system.arch"             tooltip="CPU-Architektur" />
          <DataRow label="OS-Uptime"   :value="fmtUp(stats.system.uptime)"    tooltip="Wie lange das Betriebssystem ohne Reboot läuft" />
        </div>
      </div>

      <!-- Mandanten -->
      <div v-if="stats.tenants" class="card space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold"
            v-tooltip="'Alle in der Master-Datenbank registrierten Mandanten. Jeder Mandant hat eine eigene SQLite-Datenbank.'">
            {{ tt('heading') }}
          </h2>
          <span class="text-xs text-gray-500">{{ stats.tenants.count }} {{ tt('total') }}</span>
        </div>
        <p v-if="!stats.tenants.items.length" class="text-sm text-gray-500">
          {{ tt('empty') }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs text-gray-400 border-b border-gray-700">
              <tr>
                <th class="w-6 py-1"></th>
                <th class="text-left py-1 pr-3">{{ tt('cols.status') }}</th>
                <th class="text-left py-1 pr-3">{{ tt('cols.name') }}</th>
                <th class="text-left py-1 pr-3">{{ tt('cols.slug') }}</th>
                <th class="text-right py-1 pr-3">{{ tt('cols.vehicles') }}</th>
                <th class="text-right py-1 pr-3">{{ tt('cols.users') }}</th>
                <th class="text-right py-1 pr-3">{{ tt('cols.size') }}</th>
                <th class="text-right py-1 pr-3">{{ tt('cols.lastActivity') }}</th>
                <th class="text-right py-1">{{ tt('cols.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="tn in stats.tenants.items" :key="tn.id">
                <tr class="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 cursor-pointer"
                    @click="toggleExpanded(tn.id)">
                  <td class="py-1 text-gray-500 select-none">{{ expandedId === tn.id ? '▾' : '▸' }}</td>
                  <td class="py-1 pr-3">
                    <span :class="tn.status === 'suspended'
                      ? 'inline-block px-1.5 py-0.5 rounded text-xs bg-yellow-900/40 text-yellow-300 border border-yellow-700/40'
                      : 'inline-block px-1.5 py-0.5 rounded text-xs bg-green-900/40 text-green-300 border border-green-700/40'">
                      {{ tn.status === 'suspended' ? tt('status.suspended') : tt('status.active') }}
                    </span>
                  </td>
                  <td class="py-1 pr-3 font-medium text-white">
                    <input v-if="editingId === tn.id"
                      v-model="editName"
                      @click.stop
                      @keyup.enter.stop="saveRename(tn)"
                      @keyup.esc.stop="cancelRename"
                      class="bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-sm w-40" />
                    <template v-else>
                      {{ tn.name }}
                      <span v-if="tn.isSelf" class="text-xs text-gray-500 ml-1">{{ tt('you') }}</span>
                    </template>
                  </td>
                  <td class="py-1 pr-3 font-mono text-gray-400">{{ tn.slug }}</td>
                  <td class="py-1 pr-3 text-right">{{ tn.vehicleCount }}</td>
                  <td class="py-1 pr-3 text-right">{{ tn.userCount }}</td>
                  <td class="py-1 pr-3 text-right text-gray-400">{{ tn.sizeByte != null ? fmtB(tn.sizeByte) : '–' }}</td>
                  <td class="py-1 pr-3 text-right text-gray-400">{{ tn.lastActivity ? fmtDate(tn.lastActivity * 1000) : '–' }}</td>
                  <td class="py-1 text-right whitespace-nowrap" @click.stop>
                    <template v-if="editingId === tn.id">
                      <button @click="saveRename(tn)" v-tooltip="tt('actions.save')"
                        class="px-1.5 hover:text-green-400">✓</button>
                      <button @click="cancelRename" v-tooltip="tt('actions.cancel')"
                        class="px-1.5 hover:text-gray-300">✗</button>
                    </template>
                    <template v-else>
                      <button @click="startRename(tn)" v-tooltip="tt('actions.rename')"
                        class="px-1.5 hover:text-blue-400">✏️</button>
                      <button v-if="!tn.isSelf && tn.status === 'active'"
                        @click="doSuspend(tn)" v-tooltip="tt('actions.suspend')"
                        class="px-1.5 hover:text-yellow-400">⏸</button>
                      <button v-if="!tn.isSelf && tn.status === 'suspended'"
                        @click="doUnsuspend(tn)" v-tooltip="tt('actions.unsuspend')"
                        class="px-1.5 hover:text-green-400">▶</button>
                      <button v-if="!tn.isSelf"
                        @click="askDelete(tn)" v-tooltip="tt('actions.delete')"
                        class="px-1.5 hover:text-red-400">🗑</button>
                    </template>
                  </td>
                </tr>
                <tr v-if="expandedId === tn.id" class="border-b border-gray-800 bg-gray-900/40">
                  <td colspan="9" class="p-4">
                    <div v-if="!tenantDetails[tn.id]" class="text-sm text-gray-500">
                      {{ tt('detail.loading') }}
                    </div>
                    <div v-else-if="tenantDetails[tn.id].error" class="text-sm text-red-400">
                      {{ tt('errors.loadDetailFailed') }}
                    </div>
                    <div v-else class="grid md:grid-cols-3 gap-6 text-sm">
                      <!-- Vehicles -->
                      <div>
                        <div class="font-semibold text-gray-300 mb-2">
                          {{ tt('detail.vehicles') }} ({{ tenantDetails[tn.id].vehicles.length }})
                        </div>
                        <p v-if="!tenantDetails[tn.id].vehicles.length" class="text-gray-500">
                          {{ tt('detail.noVehicles') }}
                        </p>
                        <ul v-else class="space-y-1">
                          <li v-for="v in tenantDetails[tn.id].vehicles" :key="v.id"
                            class="text-gray-300">
                            <span class="text-white">{{ v.display_name || v.vin || v.id }}</span>
                            <span v-if="v.model" class="text-gray-500 text-xs ml-2">{{ v.model }}</span>
                            <div v-if="v.vin" class="text-gray-500 text-xs font-mono">{{ v.vin }}</div>
                          </li>
                        </ul>
                      </div>
                      <!-- Users -->
                      <div>
                        <div class="font-semibold text-gray-300 mb-2">
                          {{ tt('detail.users') }} ({{ tenantDetails[tn.id].users.length }})
                        </div>
                        <p v-if="!tenantDetails[tn.id].users.length" class="text-gray-500">
                          {{ tt('detail.noUsers') }}
                        </p>
                        <ul v-else class="space-y-1">
                          <li v-for="u in tenantDetails[tn.id].users" :key="u.id">
                            <span class="text-white">{{ u.username }}</span>
                            <span class="text-gray-500 text-xs ml-2">· {{ u.role }}</span>
                            <span v-if="u.is_active === 0" class="text-red-400 text-xs ml-2">⚠ inaktiv</span>
                            <div class="text-gray-500 text-xs">
                              {{ tt('detail.lastLogin') }}:
                              {{ u.last_login ? fmtDate(u.last_login * 1000) : tt('detail.neverLoggedIn') }}
                            </div>
                          </li>
                        </ul>
                      </div>
                      <!-- Counts + meta -->
                      <div>
                        <div class="font-semibold text-gray-300 mb-2">{{ tt('detail.counts') }}</div>
                        <div class="space-y-0.5 text-gray-300">
                          <div class="flex justify-between"><span class="text-gray-500">{{ tt('detail.trips') }}</span><span>{{ tenantDetails[tn.id].counts.trips }}</span></div>
                          <div class="flex justify-between"><span class="text-gray-500">{{ tt('detail.charging') }}</span><span>{{ tenantDetails[tn.id].counts.charging_sessions }}</span></div>
                          <div class="flex justify-between"><span class="text-gray-500">{{ tt('detail.battery') }}</span><span>{{ tenantDetails[tn.id].counts.battery_snapshots }}</span></div>
                          <div class="flex justify-between"><span class="text-gray-500">{{ tt('detail.telemetry') }}</span><span>{{ tenantDetails[tn.id].counts.telemetry_points }}</span></div>
                          <div class="flex justify-between"><span class="text-gray-500">{{ tt('detail.logbook') }}</span><span>{{ tenantDetails[tn.id].counts.logbook_entries }}</span></div>
                          <div class="flex justify-between"><span class="text-gray-500">{{ tt('detail.audit') }}</span><span>{{ tenantDetails[tn.id].counts.audit_logs }}</span></div>
                        </div>
                        <div class="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 space-y-0.5">
                          <div>{{ tt('detail.createdAt') }}: {{ fmtDate(tenantDetails[tn.id].createdAt * 1000) }}</div>
                          <div class="font-mono break-all">{{ tt('detail.dbPath') }}: {{ tenantDetails[tn.id].dbPath }}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else-if="isAdmin === false" class="card text-gray-400 text-sm text-center py-6">
      Systemdetails sind nur für Administratoren sichtbar.
    </div>

    <!-- Lösch-Bestätigungsmodal — Teleport ans Ende, damit es die
         v-if='stats' / v-else-if='isAdmin === false'-Kette nicht
         unterbricht. Render via to=body garantiert ueberlagerungsfreie
         Anzeige unabhaengig von der .card-Backdrop-Stacking-Context. -->
    <Teleport to="body">
      <div v-if="deleteTarget"
        class="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4"
        @click.self="deleteTarget = null">
        <div class="card max-w-md w-full space-y-4">
          <h3 class="text-lg font-semibold text-red-300 flex items-center gap-2">
            <AppIcon name="alert" :size="20" />
            {{ tt('delete.title') }}
          </h3>
          <p class="text-sm text-gray-300">
            „<span class="font-semibold text-white">{{ deleteTarget.name }}</span>"
            (<code class="text-gray-400">{{ deleteTarget.slug }}</code>)
          </p>
          <p class="text-sm text-yellow-300">{{ tt('delete.warning') }}</p>
          <p class="text-xs text-gray-500">{{ tt('delete.backupNote') }}</p>
          <div class="space-y-2">
            <label class="text-sm text-gray-400">
              {{ tt('delete.typeSlug') }} <code class="text-yellow-300">{{ deleteTarget.slug }}</code>
            </label>
            <input v-model="deleteSlugInput" type="text"
              class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm font-mono" />
          </div>
          <p v-if="deleteError" class="text-sm text-red-400">{{ deleteError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button @click="deleteTarget = null; deleteSlugInput = ''; deleteError = ''"
              class="btn-secondary text-sm">{{ tt('delete.cancel') }}</button>
            <button @click="confirmDelete"
              :disabled="deleteSlugInput !== deleteTarget.slug || deleting"
              class="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium
                     hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
              {{ deleting ? '…' : tt('delete.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, h, resolveDirective, withDirectives, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth.js';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
import AppIcon from '../components/AppIcon.vue';
import InfoTip from '../components/InfoTip.vue';

const auth    = useAuthStore();
const appStore = useAppStore();
const selectedVehicle = computed(() => appStore.selectedVehicle);
const isAdmin = computed(() => auth.user?.role === 'admin');
const { t }   = useI18n();
const tt = (key) => t('system.tenants.' + key);

// ─── Firmware-Historie ─────────────────────────────────────────────
const firmware = ref({ current: null, history: [], total_updates: 0 });
async function loadFirmware() {
  const vid = selectedVehicle.value?.id;
  if (!vid) return;
  try {
    const { data } = await api.get(`/firmware/${vid}`);
    firmware.value = data;
  } catch { /* ignore */ }
}

const ver   = ref({});
const stats = ref(null);


const updateInfo     = ref(null);
const updateChecking = ref(false);
const updateError    = ref('');
const deployBusy = ref(false);
const deployMsg  = ref('');
const deployOk   = ref(true);

async function triggerDeploy() {
  deployBusy.value = true;
  deployMsg.value  = '';
  try {
    await api.post('/system/update/trigger');
    deployMsg.value = '✓ Deployment gestartet – Seite in ca. 1–2 Min neu laden.';
    deployOk.value  = true;
  } catch (e) {
    deployMsg.value = e.response?.data?.error ?? 'Fehler beim Auslösen';
    deployOk.value  = false;
  } finally {
    deployBusy.value = false;
  }
}

// ─── Mandanten-Verwaltung ─────────────────────────────────────────
const expandedId    = ref(null);
const tenantDetails = reactive({});       // id → detail | { error: true }
const editingId     = ref(null);
const editName      = ref('');
const deleteTarget  = ref(null);
const deleteSlugInput = ref('');
const deleteError   = ref('');
const deleting      = ref(false);

async function reloadStats() {
  try {
    const { data } = await api.get('/system/stats');
    stats.value = data;
  } catch { /* ignore */ }
}

// System-Health-Ampel (Admin) — Tesla-Token, Virtual Key, Telemetry, Poller.
const health = ref(null);
async function loadHealth() {
  try {
    const { data } = await api.get('/system/health');
    health.value = data;
  } catch { health.value = null; }
}

// Naechtliche Wartung — Logbuch + manueller Trigger.
const maintLog  = ref({ runs: [], auto_update_enabled: false });
const maintBusy = ref(false);
const fmtTs = ms => new Date(ms).toLocaleString('de-DE');
async function loadMaintenanceLog() {
  try {
    const { data } = await api.get('/system/maintenance-log');
    maintLog.value = data;
  } catch { /* nicht kritisch */ }
}
async function runMaintenanceNow() {
  maintBusy.value = true;
  try {
    await api.post('/system/maintenance-now');
    await loadMaintenanceLog();
    await loadHealth();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  } finally {
    maintBusy.value = false;
  }
}

async function loadTenantDetail(id) {
  try {
    const { data } = await api.get('/system/tenants/' + id);
    tenantDetails[id] = data;
  } catch {
    tenantDetails[id] = { error: true };
  }
}

function toggleExpanded(id) {
  if (editingId.value === id) return;        // im Edit-Modus nicht zuklappen
  if (expandedId.value === id) {
    expandedId.value = null;
  } else {
    expandedId.value = id;
    if (!tenantDetails[id]) loadTenantDetail(id);
  }
}

function startRename(tn) {
  editingId.value = tn.id;
  editName.value  = tn.name;
}
function cancelRename() {
  editingId.value = null;
  editName.value  = '';
}
async function saveRename(tn) {
  const name = editName.value.trim();
  if (!name || name === tn.name) { cancelRename(); return; }
  try {
    await api.patch('/system/tenants/' + tn.id, { name });
    cancelRename();
    await reloadStats();
  } catch (e) {
    alert(tt('errors.renameFailed') + ': ' + (e.response?.data?.error ?? e.message));
  }
}

async function doSuspend(tn) {
  try {
    await api.post('/system/tenants/' + tn.id + '/suspend');
    await reloadStats();
    if (tenantDetails[tn.id]) await loadTenantDetail(tn.id);
  } catch (e) {
    alert(tt('errors.suspendFailed') + ': ' + (e.response?.data?.error ?? e.message));
  }
}
async function doUnsuspend(tn) {
  try {
    await api.post('/system/tenants/' + tn.id + '/unsuspend');
    await reloadStats();
    if (tenantDetails[tn.id]) await loadTenantDetail(tn.id);
  } catch (e) {
    alert(tt('errors.unsuspendFailed') + ': ' + (e.response?.data?.error ?? e.message));
  }
}

function askDelete(tn) {
  deleteTarget.value    = tn;
  deleteSlugInput.value = '';
  deleteError.value     = '';
}
async function confirmDelete() {
  if (!deleteTarget.value) return;
  if (deleteSlugInput.value !== deleteTarget.value.slug) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await api.delete('/system/tenants/' + deleteTarget.value.id, {
      data: { confirm: true, confirmationText: deleteTarget.value.slug },
    });
    const removedId = deleteTarget.value.id;
    deleteTarget.value = null;
    deleteSlugInput.value = '';
    if (expandedId.value === removedId) expandedId.value = null;
    delete tenantDetails[removedId];
    await reloadStats();
  } catch (e) {
    deleteError.value = e.response?.data?.error ?? tt('errors.deleteFailed');
  } finally {
    deleting.value = false;
  }
}

async function checkUpdate() {
  updateChecking.value = true;
  updateError.value    = '';
  try {
    const { data } = await api.get('/system/update-check');
    updateInfo.value = data;
  } catch (e) {
    updateError.value = e.response?.data?.error ?? 'GitHub konnte nicht erreicht werden';
  } finally {
    updateChecking.value = false;
  }
}

const DataRow = {
  props: ['label', 'value', 'tooltip'],
  setup(props) {
    const tooltip = resolveDirective('tooltip');
    return () => withDirectives(
      h('div', { class: 'flex justify-between items-center text-sm border-b border-gray-800 pb-1.5' }, [
        h('span', { class: 'text-gray-400' }, props.label),
        h('span', { class: 'font-medium text-white text-right' }, props.value ?? '—'),
      ]),
      [[tooltip, props.tooltip]]
    );
  },
};

function fmtB(b) {
  if (b == null) return '—';
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + ' GB';
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(1) + ' MB';
  return (b / 1024).toFixed(0) + ' KB';
}
function fmtUp(s) {
  if (s == null) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h ${m}min` : h ? `${h}h ${m}min` : `${m}min`;
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleString('de-DE') : '—';
}

onMounted(async () => {
  try {
    const { data } = await api.get('/system/version');
    ver.value = data;
  } catch { /* ignore */ }

  loadFirmware();

  if (isAdmin.value) {
    await reloadStats();
    loadHealth();
    loadMaintenanceLog();
  }
});

watch(() => appStore.selectedVehicleId, loadFirmware);
</script>

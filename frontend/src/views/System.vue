<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">📊 System & Version</h1>

    <!-- Version info -->
    <div class="card grid md:grid-cols-2 gap-6">
      <div class="space-y-3">
        <h2 class="font-semibold text-tesla-red">⚡ Tesla Carview</h2>
        <DataRow label="Version"       :value="'v' + (ver.version ?? '…')"  tooltip="Versionsnummer der Anwendung (aus package.json)" />
        <DataRow label="Git-Hash"      :value="ver.git?.hash ?? '…'"        tooltip="Kurz-Hash des aktuellen Git-Commits – eindeutige Build-ID" />
        <DataRow label="Branch"        :value="ver.git?.branch ?? '…'"      tooltip="Git-Branch der aktuell laufenden Instanz" />
        <DataRow label="Build-Datum"   :value="fmtDate(ver.git?.date)"      tooltip="Datum des letzten Commits (Zeitpunkt des letzten Deployments)" />
        <DataRow label="Node.js"       :value="ver.nodeVersion ?? '…'"      tooltip="Node.js-Version des Backend-Prozesses" />
        <DataRow label="Server-Uptime" :value="fmtUp(ver.uptime)"           tooltip="Wie lange der Backend-Prozess läuft (seit letztem Neustart)" />
      </div>
      <div class="flex flex-col items-center justify-center gap-2 opacity-30 select-none">
        <div class="text-8xl">⚡</div>
        <div class="text-sm text-gray-400">Tesla Carview v{{ ver.version }}</div>
      </div>
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
          <h2 class="font-semibold" v-tooltip="'Arbeitsspeichernutzung des gesamten Systems'">💾 Arbeitsspeicher</h2>
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
    </template>

    <div v-else-if="isAdmin === false" class="card text-gray-400 text-sm text-center py-6">
      Systemdetails sind nur für Administratoren sichtbar.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h, resolveDirective, withDirectives } from 'vue';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';

const auth    = useAuthStore();
const isAdmin = computed(() => auth.user?.role === 'admin');

const ver   = ref({});
const stats = ref(null);

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

  if (isAdmin.value) {
    try {
      const { data } = await api.get('/system/stats');
      stats.value = data;
    } catch { /* ignore */ }
  }
});
</script>

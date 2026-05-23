<template>
  <!-- Technischer Status-Streifen im Nevs-Edition Design.
       Nur sichtbar wenn data-design="editorial" aktiv.
       Zeigt Live-Fahrzeugdaten aus dem lokalen Cache (kein Tesla-API-Call).
       Inspiriert vom Status-Bar-Pattern aus dem indasys-Clickdummy. -->
  <div v-if="isEditorial && vehicle" class="editorial-status-bar">
    <div class="esb-inner">
      <!-- Links: Pulse + Fahrzeugname + letztes Update -->
      <div class="esb-left">
        <span class="esb-pulse-wrap">
          <span :class="['esb-pulse', pulseClass]"></span>
          <span class="esb-pulse-label">{{ pulseLabel }}</span>
        </span>
        <span class="esb-sep">·</span>
        <span class="esb-vehicle">{{ vehicle.display_name }}</span>
        <span class="esb-sep">·</span>
        <span class="esb-time">{{ lastUpdateLabel }}</span>
      </div>

      <!-- Rechts: technische Kenndaten -->
      <div class="esb-right">
        <!-- SoC -->
        <span v-if="vehicle.battery_level != null" class="esb-stat">
          <span class="esb-stat-icon">⚡</span>
          <span :class="['esb-stat-val', socClass]">{{ vehicle.battery_level }}%</span>
        </span>

        <!-- Fahrmodus -->
        <span v-if="gearLabel" class="esb-stat">
          <span class="esb-stat-icon">⬤</span>
          <span class="esb-stat-val">{{ gearLabel }}</span>
        </span>

        <!-- Kilometerstand -->
        <span v-if="vehicle.odometer_km_live != null" class="esb-stat">
          <span class="esb-stat-icon">◎</span>
          <span class="esb-stat-val">{{ Math.round(vehicle.odometer_km_live).toLocaleString('de-DE') }} km</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore }   from '../store/index.js';
import { useThemeStore } from '../store/theme.js';

const appStore   = useAppStore();
const themeStore = useThemeStore();

const isEditorial = computed(() => themeStore.designKey === 'editorial');
const vehicle     = computed(() => appStore.selectedVehicle);

// Pulsing-Status: grün = online/fährt, gelb = parked/laden, grau = offline/unbekannt
const pulseClass = computed(() => {
  const s = vehicle.value?.shift_state;
  const upd = vehicle.value?.state_cached_at;
  if (!upd) return 'esb-pulse--offline';
  const ageMin = (Date.now() / 1000 - upd) / 60;
  if (s === 'D' || s === 'R' || s === 'N') return 'esb-pulse--driving';
  if (ageMin < 30) return 'esb-pulse--online';
  return 'esb-pulse--offline';
});

const pulseLabel = computed(() => {
  const s = vehicle.value?.shift_state;
  if (s === 'D') return 'FAHRT';
  if (s === 'R') return 'RÜCKWÄRTS';
  if (s === 'N') return 'NEUTRAL';
  const upd = vehicle.value?.state_cached_at;
  if (!upd) return 'OFFLINE';
  const ageMin = (Date.now() / 1000 - upd) / 60;
  return ageMin < 30 ? 'ONLINE' : 'OFFLINE';
});

const gearLabel = computed(() => {
  const s = vehicle.value?.shift_state;
  if (s === 'D') return 'D';
  if (s === 'R') return 'R';
  if (s === 'N') return 'N';
  if (s === 'P' || s == null) return 'P';
  return s;
});

const socClass = computed(() => {
  const lvl = vehicle.value?.battery_level;
  if (lvl == null) return '';
  if (lvl <= 15) return 'esb-stat-val--red';
  if (lvl <= 25) return 'esb-stat-val--yellow';
  return 'esb-stat-val--green';
});

const lastUpdateLabel = computed(() => {
  const ts = vehicle.value?.state_cached_at;
  if (!ts) return 'kein Signal';
  const diffS = Math.floor(Date.now() / 1000 - ts);
  if (diffS < 60)   return 'gerade eben';
  if (diffS < 3600) return `vor ${Math.floor(diffS / 60)} min`;
  if (diffS < 86400)return `vor ${Math.floor(diffS / 3600)} h`;
  return `vor ${Math.floor(diffS / 86400)} d`;
});
</script>

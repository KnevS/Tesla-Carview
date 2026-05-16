<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ $t('control.title') }}</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm" :class="stateColor">{{ stateLabel }}</span>
        <button @click="wakeUp" :disabled="busy || vehicleState === 'online'"
          class="btn-secondary text-sm" v-tooltip="$t('control.wakeTooltip')">
          {{ $t('control.wake') }}
        </button>
      </div>
    </div>

    <!-- Hinweis wenn schläft -->
    <div v-if="vehicleState === 'asleep' || vehicleState === 'offline'" class="card bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-sm space-y-1">
      <p class="font-semibold">{{ $t('control.sleepHint') }}</p>
      <p>{{ $t('control.sleepHintDetail') }}</p>
    </div>

    <!-- Toast — Teleport, kein clipping durch .card-Backdrop. -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="toast" class="fixed top-20 right-4 z-[1000] px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
          :class="toast.ok ? 'bg-green-800 text-green-100' : 'bg-red-900 text-red-200'">
          {{ toast.msg }}
        </div>
      </transition>
    </Teleport>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Klimaanlage -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('control.climate') }}</h2>

        <div class="flex items-center justify-between">
          <span class="text-gray-300">{{ $t('control.climateLabel') }}</span>
          <div class="flex gap-2">
            <button @click="cmd('auto_conditioning_start')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition disabled:opacity-40">
              {{ $t('control.on') }}
            </button>
            <button @click="cmd('auto_conditioning_stop')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40">
              {{ $t('control.off') }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-300">{{ $t('control.temp') }}</span>
            <div class="flex items-center gap-3">
              <button @click="temp = Math.max(15, temp - 0.5)" class="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold transition">−</button>
              <span class="text-white font-bold text-xl w-14 text-center">{{ fmtTemp(temp) }}</span>
              <button @click="temp = Math.min(28, temp + 0.5)" class="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold transition">+</button>
            </div>
          </div>
          <button @click="cmd('set_temps', { driver_temp: temp, passenger_temp: temp })" :disabled="busy"
            class="w-full py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40">
            {{ $t('control.setTemp') }}
          </button>
        </div>

        <div class="border-t border-gray-700 pt-3 space-y-2">
          <button @click="cmd('set_preconditioning_max', { on: true })" :disabled="busy"
            class="w-full py-2 rounded-lg bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.preConditionTooltip')">
            {{ $t('control.preCondition') }}
          </button>

          <!-- Climate Keeper / Pet / Camp Mode — laeuft nur, wenn das
               Fahrzeug eingeschaltet bleibt und der Fahrer abgeschlossen
               weggegangen ist. Gut fuer Hund im Auto (Dog) oder
               Uebernachtung (Camp). -->
          <div>
            <p class="text-xs text-gray-400 mb-1">{{ $t('control.climateMode') }}</p>
            <div class="grid grid-cols-4 gap-1">
              <button @click="cmd('set_climate_keeper_mode', { climate_keeper_mode: 0 })" :disabled="busy"
                class="py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs transition disabled:opacity-40"
                v-tooltip="$t('control.keeperOffTooltip')">{{ $t('control.keeperOff') }}</button>
              <button @click="cmd('set_climate_keeper_mode', { climate_keeper_mode: 1 })" :disabled="busy"
                class="py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs transition disabled:opacity-40"
                v-tooltip="$t('control.keeperKeepTooltip')">{{ $t('control.keeperKeep') }}</button>
              <button @click="cmd('set_climate_keeper_mode', { climate_keeper_mode: 2 })" :disabled="busy"
                class="py-1.5 rounded bg-yellow-700 hover:bg-yellow-600 text-white text-xs transition disabled:opacity-40"
                v-tooltip="$t('control.keeperDogTooltip')">{{ $t('control.keeperDog') }}</button>
              <button @click="cmd('set_climate_keeper_mode', { climate_keeper_mode: 3 })" :disabled="busy"
                class="py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white text-xs transition disabled:opacity-40"
                v-tooltip="$t('control.keeperCampTooltip')">{{ $t('control.keeperCamp') }}</button>
            </div>
          </div>

          <!-- Lenkradheizung Toggle. Bei Highland/Juniper steuert sie
               sich ueber den neueren Endpunkt remote_steering_wheel_heat_
               climate_request — wir versuchen den zuerst und fallen auf
               den klassischen Endpunkt zurueck, falls 4xx. -->
          <button @click="toggleSteeringWheel" :disabled="busy"
            class="w-full py-2 rounded-lg bg-orange-700 hover:bg-orange-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.steeringWheelTooltip')">
            {{ $t('control.steeringWheel') }}
          </button>
        </div>
      </div>

      <!-- Sitzheizung — 5 Sitze × 4 Stufen. Stufen: 0 aus, 1 niedrig,
           2 mittel, 3 hoch. Klima muss aktiv sein, sonst lehnt das
           Auto den Befehl ab. -->
      <div class="card space-y-3">
        <h2 class="font-semibold text-lg">{{ $t('control.seatHeater') }}</h2>
        <p class="text-xs text-gray-500">{{ $t('control.seatHeaterHint') }}</p>
        <div v-for="seat in SEATS" :key="seat.id" class="flex items-center gap-2">
          <span class="text-sm text-gray-300 flex-1">{{ seat.label }}</span>
          <div class="flex gap-1">
            <button v-for="lvl in 4" :key="lvl-1"
              @click="cmd('remote_seat_heater_request', { heater: seat.id, level: lvl-1 })"
              :disabled="busy"
              class="w-8 h-8 rounded text-xs font-medium transition disabled:opacity-40"
              :class="lvl === 1
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : ['bg-orange-900 hover:bg-orange-800 text-orange-200',
                   'bg-orange-700 hover:bg-orange-600 text-white',
                   'bg-orange-500 hover:bg-orange-400 text-white'][lvl - 2]"
              v-tooltip="lvl === 1 ? $t('control.seatLevelOff') : $t('control.seatLevelTooltip', { level: lvl - 1, label: seatLevelLabels[lvl - 2] })">
              {{ lvl - 1 }}
            </button>
          </div>
        </div>
      </div>

      <!-- Fahrzeug -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('control.vehicle') }}</h2>

        <div class="flex items-center justify-between">
          <span class="text-gray-300">{{ $t('control.doors') }}</span>
          <div class="flex gap-2">
            <button @click="cmd('door_unlock')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium transition disabled:opacity-40"
              v-tooltip="$t('control.unlockTooltip')">
              {{ $t('control.unlock') }}
            </button>
            <button @click="cmd('door_lock')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
              v-tooltip="$t('control.lockTooltip')">
              {{ $t('control.lock') }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-gray-700 pt-3">
          <span class="text-gray-300">{{ $t('control.sentryMode') }}</span>
          <div class="flex gap-2">
            <button @click="cmd('set_sentry_mode', { on: true })" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-purple-800 hover:bg-purple-700 text-white text-sm font-medium transition disabled:opacity-40">
              {{ $t('control.on') }}
            </button>
            <button @click="cmd('set_sentry_mode', { on: false })" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40">
              {{ $t('control.off') }}
            </button>
          </div>
        </div>

        <div class="flex gap-2 border-t border-gray-700 pt-3">
          <button @click="cmd('flash_lights')" :disabled="busy"
            class="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.lightsTooltip')">
            {{ $t('control.lights') }}
          </button>
          <button @click="cmd('honk_horn')" :disabled="busy"
            class="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.hornTooltip')">
            {{ $t('control.horn') }}
          </button>
        </div>

        <!-- Trunk / Frunk — actuate_trunk ist ein Toggle: oeffnet, falls
             zu, schliesst, falls auf (nur bei elektrisch betaetigter Klappe). -->
        <div class="grid grid-cols-2 gap-2 border-t border-gray-700 pt-3">
          <button @click="cmd('actuate_trunk', { which_trunk: 'front' })" :disabled="busy"
            class="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.frunkTooltip')">
            {{ $t('control.frunk') }}
          </button>
          <button @click="cmd('actuate_trunk', { which_trunk: 'rear' })" :disabled="busy"
            class="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.trunkTooltip')">
            {{ $t('control.trunk') }}
          </button>
        </div>

        <!-- Fenster — vent (luefte spaltbreit) / close. Ohne Standort
             benoetigt der Befehl lat/lon — wir senden 0/0 und das Auto
             nutzt die eigene GPS-Position. -->
        <div class="grid grid-cols-2 gap-2">
          <button @click="cmd('window_control', { command: 'vent', lat: 0, lon: 0 })" :disabled="busy"
            class="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.windowVentTooltip')">
            {{ $t('control.windowVent') }}
          </button>
          <button @click="cmd('window_control', { command: 'close', lat: 0, lon: 0 })" :disabled="busy"
            class="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.windowCloseTooltip')">
            {{ $t('control.windowClose') }}
          </button>
        </div>
      </div>

      <!-- Laden -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('control.charging') }}</h2>

        <div class="flex items-center justify-between">
          <span class="text-gray-300">{{ $t('control.chargeLabel') }}</span>
          <div class="flex gap-2">
            <button @click="cmd('charge_start')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition disabled:opacity-40">
              {{ $t('control.chargeStart') }}
            </button>
            <button @click="cmd('charge_stop')" :disabled="busy"
              class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40">
              {{ $t('control.chargeStop') }}
            </button>
          </div>
        </div>

        <div class="space-y-2 border-t border-gray-700 pt-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-300">{{ $t('control.chargeLimit') }}</span>
            <span class="text-white font-bold">{{ chargeLimit }}%</span>
          </div>
          <input type="range" min="50" max="100" step="5" v-model.number="chargeLimit"
            class="w-full accent-tesla-red" />
          <div class="flex justify-between text-xs text-gray-500">
            <span>{{ $t('control.chargeLimitDaily') }}</span><span>{{ $t('control.chargeLimitStandard') }}</span><span>{{ $t('control.chargeLimitTrip') }}</span>
          </div>
          <button @click="cmd('set_charge_limit', { percent: chargeLimit })" :disabled="busy"
            class="w-full py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40">
            {{ $t('control.setChargeLimit') }}
          </button>
        </div>

        <!-- Ladestrom (Ampere) — beeinflusst nur AC-Laden an einer Wallbox.
             Beim DC-Schnellladen ignoriert das Fahrzeug den Wert. -->
        <div class="space-y-2 border-t border-gray-700 pt-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-300">{{ $t('control.chargeAmps') }}</span>
            <span class="text-white font-bold">{{ chargeAmps }} A</span>
          </div>
          <input type="range" min="5" max="48" step="1" v-model.number="chargeAmps"
            class="w-full accent-tesla-red" />
          <button @click="cmd('set_charging_amps', { charging_amps: chargeAmps })" :disabled="busy"
            class="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.chargeAmpsTooltip')">
            {{ $t('control.setChargeAmps') }}
          </button>
        </div>

        <!-- Ladeklappe — Tesla nennt sie „charge_port_door". Manche
             Stationen erkennen das Fahrzeug erst, wenn die Klappe offen
             ist — daher als eigener Knopf. -->
        <div class="grid grid-cols-2 gap-2 border-t border-gray-700 pt-3">
          <button @click="cmd('charge_port_door_open')" :disabled="busy"
            class="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.chargePortOpenTooltip')">
            {{ $t('control.chargePortOpen') }}
          </button>
          <button @click="cmd('charge_port_door_close')" :disabled="busy"
            class="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition disabled:opacity-40"
            v-tooltip="$t('control.chargePortCloseTooltip')">
            {{ $t('control.chargePortClose') }}
          </button>
        </div>
      </div>

      <!-- Boombox — Tesla-eigene Spielerei: spielt vorinstallierte Sounds
           ueber die externen Lautsprecher des Fahrzeugs. Funktioniert nur
           bei Modellen mit Boombox-Hardware (Model S/X Plaid, neuere Y/3). -->
      <div class="card space-y-3">
        <h2 class="font-semibold text-lg">{{ $t('control.boombox') }}</h2>
        <p class="text-xs text-gray-500">{{ $t('control.boomboxHint') }}</p>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="sound in BOOMBOX_SOUNDS" :key="sound.id"
            @click="cmd('remote_boombox', { sound: sound.id })" :disabled="busy"
            class="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition disabled:opacity-40"
            v-tooltip="sound.tooltip">
            {{ sound.icon }} {{ sound.label }}
          </button>
        </div>
      </div>

      <!-- Vorklim-Zeitplan: setzt eine taegliche Abfahrtszeit, zu der das
           Auto bereits warm ist. Tesla nennt es „Scheduled Departure".
           Der Zeitwert wird in Minuten ab Mitternacht uebertragen.
           Optional auf Wochentage beschraenken. -->
      <div class="card space-y-3">
        <h2 class="font-semibold text-lg">{{ $t('control.departure') }}</h2>
        <p class="text-xs text-gray-500">{{ $t('control.departureHint') }}</p>
        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-300 flex-1">{{ $t('control.departureTime') }}</label>
          <input v-model="departureTime" type="time" required
            class="bg-gray-700 rounded px-2 py-1 text-white text-sm w-32"
            v-tooltip="$t('control.departureTimeTooltip')" />
        </div>
        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-300 flex-1">{{ $t('control.departureWeekdays') }}</label>
          <input v-model="departureWeekdays" type="checkbox" class="accent-tesla-red"
            v-tooltip="$t('control.departureWeekdaysTooltip')" />
        </div>
        <div class="flex gap-2">
          <button @click="saveDeparture" :disabled="busy"
            class="flex-1 py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm transition disabled:opacity-40"
            v-tooltip="$t('control.departureSaveTooltip')">
            {{ $t('control.departureSave') }}
          </button>
          <button @click="cmd('set_scheduled_departure', { enable: false })" :disabled="busy"
            class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition disabled:opacity-40"
            v-tooltip="$t('control.departureDisableTooltip')">
            {{ $t('control.departureDisable') }}
          </button>
        </div>
      </div>

      <!-- Off-Peak-Laden — fuer dynamische Tarife (Tibber, aWattar, etc.).
           Setzt einen festen Lade-Start-Zeitpunkt; das Auto laedt dann ab
           dieser Uhrzeit, bis das Ladelimit erreicht ist. Anders als der
           Vorklim-Zeitplan rechnet das Auto NICHT zurueck — die Zeit ist
           der Start, nicht die Fertig-Zeit. Verwendet die einfachere
           set_scheduled_charging-API.

           Wann Vorklim-Zeitplan vs. Off-Peak laden?
           - Vorklim-Zeitplan: „Ich will um 7:30 fahren bereit sein."
             Auto rechnet zurueck und schaltet Klima rechtzeitig ein.
           - Off-Peak laden:    „Ladestart erst um 23:00 wenn der Strom
             billig wird." Reine Lade-Verzoegerung, kein Klima.
           Die beiden lassen sich kombinieren — der Off-Peak-Start
           dominiert dann den Lade-Beginn, die Vorklim laeuft trotzdem
           rechtzeitig vor dem departure_time. -->
      <div class="card space-y-3">
        <h2 class="font-semibold text-lg">{{ $t('control.offPeak') }}</h2>
        <p class="text-xs text-gray-500">{{ $t('control.offPeakHint') }}</p>
        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-300 flex-1">{{ $t('control.offPeakStart') }}</label>
          <input v-model="offPeakStart" type="time" required
            class="bg-gray-700 rounded px-2 py-1 text-white text-sm w-32"
            v-tooltip="$t('control.offPeakStartTooltip')" />
        </div>
        <div class="flex gap-2">
          <button @click="saveOffPeak" :disabled="busy"
            class="flex-1 py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm transition disabled:opacity-40"
            v-tooltip="$t('control.offPeakSaveTooltip')">
            {{ $t('control.offPeakSave') }}
          </button>
          <button @click="cmd('set_scheduled_charging', { enable: false })" :disabled="busy"
            class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition disabled:opacity-40"
            v-tooltip="$t('control.offPeakDisableTooltip')">
            {{ $t('control.offPeakDisable') }}
          </button>
        </div>
      </div>

      <!-- Software-Update — zeigt aktuellen Status (verfuegbar / im
           Download / Install in Progress) und erlaubt das Einplanen. -->
      <div class="card space-y-3">
        <h2 class="font-semibold text-lg">{{ $t('control.softwareUpdate') }}</h2>
        <div class="text-sm">
          <p v-if="!swUpdate" class="text-gray-500">{{ $t('control.swStatusLoading') }}</p>
          <template v-else>
            <p class="text-gray-300">
              {{ $t('control.swStatus') }}: <span class="font-mono text-white">{{ swStatusLabel }}</span>
            </p>
            <p v-if="swUpdate.version" class="text-gray-300">
              {{ $t('control.swVersion') }}: <span class="font-mono text-white">{{ swUpdate.version }}</span>
            </p>
            <p v-if="swUpdate.downloadPercentage" class="text-gray-400 text-xs">
              {{ $t('control.swDownloadInstall', { download: swUpdate.downloadPercentage, install: swUpdate.installPercentage ?? 0 }) }}
            </p>
            <p v-if="swUpdate.scheduledTimeMs" class="text-blue-300 text-xs">
              {{ $t('control.swScheduledFor', { when: fmtScheduled(swUpdate.scheduledTimeMs) }) }}
            </p>
          </template>
        </div>
        <div class="flex gap-2">
          <button @click="loadSoftwareUpdate" :disabled="busy"
            class="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition disabled:opacity-40"
            v-tooltip="$t('control.swRefreshTooltip')">
            {{ $t('control.swRefresh') }}
          </button>
          <button @click="cmd('schedule_software_update', { offset_sec: 60 })"
            :disabled="busy || !canInstallUpdate"
            class="flex-1 py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm transition disabled:opacity-40"
            v-tooltip="$t('control.swInstallTooltip')">
            {{ $t('control.swInstall') }}
          </button>
          <button v-if="swUpdate?.scheduledTimeMs"
            @click="cmd('cancel_software_update')" :disabled="busy"
            class="py-2 px-3 rounded-lg bg-yellow-800 hover:bg-yellow-700 text-white text-sm transition disabled:opacity-40"
            v-tooltip="$t('control.swCancelTooltip')">
            {{ $t('control.swCancel') }}
          </button>
        </div>
      </div>

      <!-- Navigation -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('control.navigation') }}</h2>
        <p class="text-sm text-gray-400">{{ $t('control.navHint') }}</p>

        <div class="space-y-2">
          <input v-model="navAddress" type="text" :placeholder="$t('control.navPlaceholder')"
            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-tesla-red"
            @keyup.enter="sendNav" />
          <button @click="sendNav" :disabled="busy || !navAddress.trim()"
            class="w-full py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40">
            {{ $t('control.sendNav') }}
          </button>
        </div>

        <div v-if="recentDests.length" class="border-t border-gray-700 pt-3 space-y-1">
          <p class="text-xs text-gray-500 mb-2">{{ $t('control.recentNav') }}</p>
          <button v-for="d in recentDests" :key="d" @click="navAddress = d"
            class="w-full text-left px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition truncate">
            📍 {{ d }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import { useUnits } from '../store/prefs.js';
import api from '../api.js';

const { t, locale } = useI18n();
const appStore = useAppStore();
const { fmtTemp } = useUnits();
const vehicle  = computed(() => appStore.selectedVehicle);

const busy         = ref(false);
const toast        = ref(null);
const vehicleState = ref('unknown');
const temp         = ref(21.0);
const chargeLimit  = ref(80);
const chargeAmps   = ref(16);
const navAddress   = ref('');
const recentDests  = ref(JSON.parse(localStorage.getItem('recentDests') || '[]'));
const swUpdate     = ref(null);
const departureTime     = ref('07:30');
const departureWeekdays = ref(true);
// Off-Peak-Standardwert: 23:00 — Tibber/aWattar typisch der Beginn der
// guenstigen Nachtfenster in Deutschland. Wird beim ersten Render aus
// dem Fahrzeug-State ueberschrieben, falls dort ein Plan aktiv ist.
const offPeakStart      = ref('23:00');

// Tesla-Heizungs-Schluessel: 0 = Fahrer, 1 = Beifahrer,
// 2 = hinten links, 4 = hinten rechts, 5 = hinten Mitte.
// (Nummer 3 fehlt absichtlich — Tesla-API-Konvention.)
const SEATS = computed(() => [
  { id: 0, label: t('control.seatDriver') },
  { id: 1, label: t('control.seatPassenger') },
  { id: 2, label: t('control.seatRearLeft') },
  { id: 5, label: t('control.seatRearCenter') },
  { id: 4, label: t('control.seatRearRight') },
]);

const seatLevelLabels = computed(() => [
  t('control.seatLevelLow'),
  t('control.seatLevelMedium'),
  t('control.seatLevelHigh'),
]);

// Boombox-Sounds wie in der Tesla-API. 0 = Stop, 1–9 sind verschiedene
// vorinstallierte Sounds (Hupe, Pups, Ziege, …). Wir benennen sie auf
// Deutsch, damit die UI verstaendlich ist.
const BOOMBOX_SOUNDS = computed(() => [
  { id: 0, icon: '⏹', label: t('control.boomboxStop'),     tooltip: t('control.boomboxStopTooltip') },
  { id: 1, icon: '📯', label: t('control.boomboxHorn'),     tooltip: t('control.boomboxHornTooltip') },
  { id: 2, icon: '🐐', label: t('control.boomboxGoat'),     tooltip: t('control.boomboxGoatTooltip') },
  { id: 3, icon: '😊', label: t('control.boomboxApplause'), tooltip: t('control.boomboxApplauseTooltip') },
  { id: 4, icon: '🐦', label: t('control.boomboxBird'),     tooltip: t('control.boomboxBirdTooltip') },
  { id: 5, icon: '🤡', label: t('control.boomboxClown'),    tooltip: t('control.boomboxClownTooltip') },
  { id: 6, icon: '🎵', label: t('control.boomboxSound', { n: 6 }), tooltip: t('control.boomboxSoundTooltip', { n: 6 }) },
  { id: 7, icon: '🎵', label: t('control.boomboxSound', { n: 7 }), tooltip: t('control.boomboxSoundTooltip', { n: 7 }) },
  { id: 8, icon: '🎵', label: t('control.boomboxSound', { n: 8 }), tooltip: t('control.boomboxSoundTooltip', { n: 8 }) },
]);

const stateColor = computed(() => ({
  online:  'text-green-400',
  asleep:  'text-yellow-400',
  offline: 'text-red-400',
  unknown: 'text-gray-400',
}[vehicleState.value] ?? 'text-gray-400'));

const stateLabel = computed(() => ({
  online:  t('control.online'),
  asleep:  t('control.sleeping'),
  offline: t('control.offline'),
  unknown: '—',
}[vehicleState.value] ?? '—'));

function showToast(msg, ok = true) {
  toast.value = { msg, ok };
  setTimeout(() => { toast.value = null; }, 3500);
}

async function fetchState() {
  if (!vehicle.value) return;
  try {
    const { data } = await api.get(`/commands/${vehicle.value.id}/state`);
    vehicleState.value = data.state;
  } catch { vehicleState.value = 'unknown'; }
}

/** Konvertiert "HH:MM" → Minuten ab Mitternacht. Tesla nutzt diese
 *  Repraesentation in beiden Schedule-APIs. */
function timeToMinutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

/** Vorklim-Zeitplan absenden. Tesla erwartet die Uhrzeit als Minuten
 *  ab Mitternacht — das `<input type="time">` liefert "HH:MM", das hier
 *  konvertiert wird. */
async function saveDeparture() {
  const minutes = timeToMinutes(departureTime.value);
  if (minutes == null) { showToast(t('control.toastInvalidTime'), false); return; }
  await cmd('set_scheduled_departure', {
    enable: true,
    departure_time: minutes,
    preconditioning_enabled: true,
    preconditioning_weekdays_only: !!departureWeekdays.value,
    off_peak_charging_enabled: false,
    off_peak_charging_weekdays_only: false,
  });
}

/** Off-Peak-Lade-Start absenden. set_scheduled_charging ist die
 *  schlankere API: nur ein Start-Zeitpunkt, keine Endzeit, kein
 *  Klima-Vorlauf. Das Auto laedt ab dieser Uhrzeit, bis das Ladelimit
 *  erreicht ist. */
async function saveOffPeak() {
  const minutes = timeToMinutes(offPeakStart.value);
  if (minutes == null) { showToast(t('control.toastInvalidTime'), false); return; }
  await cmd('set_scheduled_charging', { enable: true, time: minutes });
}

async function loadSoftwareUpdate() {
  if (!vehicle.value) return;
  try {
    const { data } = await api.get(`/commands/${vehicle.value.id}/software-update`);
    swUpdate.value = data;
  } catch { swUpdate.value = { status: 'unknown' }; }
}

const swStatusLabel = computed(() => ({
  unknown:                t('control.swStatusUnknown'),
  available:              t('control.swStatusAvailable'),
  scheduled:              t('control.swStatusScheduled'),
  installing:             t('control.swStatusInstalling'),
  downloading:            t('control.swStatusDownloading'),
  downloading_wifi_wait:  t('control.swStatusDownloadingWifi'),
  '':                     t('control.swStatusCurrent'),
}[swUpdate.value?.status] || swUpdate.value?.status || t('control.swStatusUnknown')));

const canInstallUpdate = computed(() =>
  swUpdate.value && ['available', 'downloading_wifi_wait'].includes(swUpdate.value.status)
);

// Locale-abhaengiges Datumsformat — Tesla liefert ms-Timestamp, wir
// formatieren in der aktiv ausgewaehlten App-Sprache.
const LOCALE_TAG = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR', el: 'el-GR' };
function fmtScheduled(ms) {
  const tag = LOCALE_TAG[locale.value] || 'de-DE';
  return new Date(ms).toLocaleString(tag,
    { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Lenkradheizung: neuere Modelle (Highland/Juniper) erwarten den
 *  remote_steering_wheel_heat_climate_request-Endpunkt; aeltere den
 *  klassischen remote_steering_wheel_heater_request. Wir versuchen den
 *  neuen zuerst und fallen bei 4xx auf den alten zurueck. */
async function toggleSteeringWheel() {
  if (!vehicle.value) return;
  busy.value = true;
  try {
    try {
      // on=true → letztlich ein Toggle bzw. eine 3-Stufen-Logik;
      // wir senden „on" als Default, das Auto entscheidet selbst.
      await api.post(`/commands/${vehicle.value.id}/remote_steering_wheel_heat_climate_request`, { on: true });
      showToast(t('control.toastSteeringSent'), true);
    } catch {
      await api.post(`/commands/${vehicle.value.id}/remote_steering_wheel_heater_request`, { on: true });
      showToast(t('control.toastSteeringSentLegacy'), true);
    }
  } catch (e) {
    showToast(e.response?.data?.error || t('control.toastError'), false);
  } finally { busy.value = false; }
}

async function wakeUp() {
  if (!vehicle.value) return;
  busy.value = true;
  showToast(t('control.toastWaking'), true);
  try {
    const { data } = await api.post(`/commands/${vehicle.value.id}/wake_up`, {});
    vehicleState.value = data.state === 'online' ? 'online' : 'asleep';
    showToast(data.state === 'online' ? t('control.toastOnline') : t('control.toastWakeTimeout'), data.state === 'online');
  } catch (e) {
    showToast(t('control.toastWakeError'), false);
  } finally { busy.value = false; }
}

async function cmd(command, body = {}) {
  if (!vehicle.value) return;
  busy.value = true;
  try {
    const { data } = await api.post(`/commands/${vehicle.value.id}/${command}`, body);
    if (data?.result === false) {
      showToast(data.reason || t('control.toastRejected'), false);
    } else {
      showToast(t('control.toastSent'), true);
      vehicleState.value = 'online';
    }
  } catch (e) {
    if (e.response?.data?.code === 'ASLEEP') {
      showToast(t('control.toastAsleep'), false);
      vehicleState.value = 'asleep';
    } else {
      showToast(e.response?.data?.error || t('control.toastSendError'), false);
    }
  } finally { busy.value = false; }
}

async function sendNav() {
  const address = navAddress.value.trim();
  if (!address) return;
  // Tesla-API erwartet locale-Tag (zB de-DE). Wir mappen den aktiven
  // App-Locale-Code auf den passenden Region-Tag.
  const navLocale = LOCALE_TAG[locale.value] || 'de-DE';
  await cmd('navigation_request', {
    type: 'share_ext_content_raw',
    locale: navLocale,
    timestamp_ms: Date.now(),
    value: { 'android.intent.extra.TEXT': address },
  });
  const updated = [address, ...recentDests.value.filter(d => d !== address)].slice(0, 5);
  recentDests.value = updated;
  localStorage.setItem('recentDests', JSON.stringify(updated));
  navAddress.value = '';
}

onMounted(async () => { await fetchState(); loadSoftwareUpdate(); });
watch(() => vehicle.value?.id, async () => { await fetchState(); loadSoftwareUpdate(); });
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

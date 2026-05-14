<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <AppIcon name="map" :size="24" class="text-tesla-red" />
        {{ $t('routes.title') }}
      </h1>
    </div>

    <div v-if="!vehicle" class="card text-gray-400 text-sm text-center py-8">
      {{ $t('common.noVehicle') }}
    </div>

    <div v-else class="grid lg:grid-cols-[400px_1fr] gap-4 items-start">

      <!-- ─── Linke Spalte ─────────────────────────────────────────────────── -->
      <div class="space-y-2 overflow-y-auto sticky top-4 pr-1" style="max-height:calc(100vh - 2rem)">
        <template v-for="sid in orderedSections" :key="sid">

        <!-- Startort -->
        <SortableSection v-if="sid === 'start'" page-id="routePlanner" section-id="start"
          :title="$t('routes.startTitle')" icon="🟢"
          :collapsed="isCollapsed('start')" @toggle="toggle('start')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="space-y-3">
          <div class="flex gap-2 flex-wrap">
            <button @click="setStartVehicle"
              :class="startMode === 'vehicle' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              v-tooltip="$t('routes.startVehicleTip')">
              🚗 {{ $t('routes.startVehicle') }}
            </button>
            <button @click="setStartBrowser"
              :class="startMode === 'browser' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              v-tooltip="$t('routes.startBrowserTip')">
              📍 {{ $t('routes.startBrowser') }}
            </button>
            <button @click="startMode = 'manual'"
              :class="startMode === 'manual' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition">
              ✏️ {{ $t('routes.startManual') }}
            </button>
          </div>
          <div v-if="startMode === 'manual'" class="relative">
            <input v-model="startQuery" type="text" :placeholder="$t('routes.startPlaceholder')"
              class="input w-full pr-8 text-sm" @input="onStartInput" @keyup.escape="startResults = []" />
            <button v-if="startQuery" @click="startQuery = ''; startResults = []"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none">×</button>
            <ul v-if="startResults.length" class="absolute z-10 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700 shadow-xl">
              <li v-for="r in startResults" :key="r.place_id" @click="pickStartResult(r)"
                class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 transition">
                <p class="text-white truncate">{{ r.display_name.split(',')[0] }}</p>
                <p class="text-gray-400 text-xs truncate">{{ r.display_name.split(',').slice(1,3).join(',').trim() }}</p>
              </li>
            </ul>
          </div>
          <div v-if="startLocation" class="bg-gray-800/60 rounded-xl px-3 py-2 flex items-center gap-2">
            <span class="text-green-400 text-base">🟢</span>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-300 truncate font-medium">{{ startLocation.name }}</p>
              <p class="text-xs text-gray-500">{{ startLocation.lat.toFixed(4) }}, {{ startLocation.lon.toFixed(4) }}</p>
            </div>
          </div>
          <p v-else class="text-xs text-gray-500 italic">{{ $t('routes.startNoLocation') }}</p>
          </div>
        </SortableSection>

        <!-- Zielsuche -->
        <SortableSection v-if="sid === 'destination'" page-id="routePlanner" section-id="destination"
          :title="$t('routes.destination')" icon="📍"
          :collapsed="isCollapsed('destination')" @toggle="toggle('destination')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="space-y-3">
          <div class="relative">
            <input v-model="searchQuery" type="text" :placeholder="$t('routes.searchPlaceholder')"
              class="input w-full pr-8" @input="onSearchInput" @keyup.enter="onSearchEnter" @keyup.escape="searchResults = []" />
            <button v-if="searchQuery" @click="clearSearch"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>
          <ul v-if="searchResults.length" class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700">
            <li v-for="r in searchResults" :key="r.place_id ?? r.lat" @click="pickResult(r)"
              class="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-700 transition">
              <p class="text-white truncate">{{ r.display_name.split(',')[0] }}</p>
              <p class="text-gray-400 text-xs truncate">{{ r.display_name.split(',').slice(1,3).join(',').trim() }}</p>
            </li>
          </ul>
          <p v-if="searching" class="text-xs text-gray-500 animate-pulse">{{ $t('routes.geocoding') }}</p>
          <p v-else-if="searchNoResults" class="text-xs text-yellow-500">{{ $t('routes.noResults') }}</p>
          <div v-if="destination" class="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span class="text-tesla-red text-lg">📍</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white font-medium truncate">{{ destination.name }}</p>
              <p class="text-xs text-gray-400">{{ destination.lat.toFixed(5) }}, {{ destination.lon.toFixed(5) }}</p>
            </div>
            <button @click="clearDestination" class="text-gray-500 hover:text-white text-xl leading-none">×</button>
          </div>
          <p v-else class="text-xs text-gray-500">{{ $t('routes.clickMapHint') }}</p>
          </div>
        </SortableSection>

        <!-- Zwischenstopps -->
        <SortableSection v-if="sid === 'waypoints'" page-id="routePlanner" section-id="waypoints"
          :title="$t('routes.waypoints')" icon="📌"
          :collapsed="isCollapsed('waypoints')" @toggle="toggle('waypoints')" @move="(f,t,p) => moveSection(f,t,p)">
          <template #badge><span class="text-xs text-gray-500">{{ waypoints.length }}/5</span></template>
          <div class="space-y-3">
          <ul v-if="waypoints.length" class="space-y-2">
            <li v-for="(wp, i) in waypoints" :key="i" class="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
              <span class="text-gray-400 text-xs font-mono w-4">{{ i+1 }}</span>
              <p class="flex-1 text-sm truncate text-white">{{ wp.name }}</p>
              <button @click="removeWaypoint(i)" class="text-gray-500 hover:text-red-400 text-lg leading-none">×</button>
            </li>
          </ul>
          <p v-else class="text-xs text-gray-500">{{ $t('routes.noWaypoints') }}</p>
          <div class="relative">
            <input v-model="wpQuery" type="text" :placeholder="$t('routes.addWaypoint')"
              class="input w-full text-sm" :disabled="waypoints.length >= 5" @input="onWpInput" @keyup.escape="wpResults = []" />
          </div>
          <ul v-if="wpResults.length" class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700">
            <li v-for="r in wpResults" :key="r.place_id" @click="addWaypoint(r)"
              class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 transition truncate text-white">
              {{ r.display_name.split(',').slice(0,2).join(', ') }}
            </li>
          </ul>
          </div>
        </SortableSection>

        <!-- Zeitplanung: Abfahrt oder Ankunft -->
        <SortableSection v-if="sid === 'timing'" page-id="routePlanner" section-id="timing"
          :title="$t('routes.timingSection')" icon="🕐"
          :collapsed="isCollapsed('timing')" @toggle="toggle('timing')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="space-y-3">
            <!-- Modus-Auswahl -->
            <div class="flex rounded-xl overflow-hidden border border-gray-700">
              <button @click="planMode = 'depart'"
                class="flex-1 py-2 text-xs font-medium transition"
                :class="planMode === 'depart' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                v-tooltip="$t('routes.modeDepartTip')">
                🛫 {{ $t('routes.modeDepart') }}
              </button>
              <button @click="planMode = 'arrive'"
                class="flex-1 py-2 text-xs font-medium transition"
                :class="planMode === 'arrive' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                v-tooltip="$t('routes.modeArriveTip')">
                🏁 {{ $t('routes.modeArrive') }}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="label text-xs">{{ $t('routes.planDate') }}</label>
                <input v-model="planDate" type="date" class="input w-full text-sm" :min="todayStr" />
              </div>
              <div>
                <label class="label text-xs">
                  {{ planMode === 'depart' ? $t('routes.departureTime') : $t('routes.arrivalTime') }}
                </label>
                <div class="flex gap-1">
                  <input v-model="planTime" type="time" class="input flex-1 text-sm" />
                  <button @click="setDepartNow" class="px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 transition"
                    v-tooltip="$t('routes.departNow')">↺</button>
                </div>
              </div>
            </div>
            <div v-if="timingResult" class="bg-gray-800/60 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
              <span :class="planMode === 'depart' ? 'text-blue-400' : 'text-purple-400'">
                {{ planMode === 'depart' ? '🏁' : '🛫' }}
              </span>
              <span class="text-gray-400">
                {{ planMode === 'depart' ? $t('routes.expectedArrival') : $t('routes.neededDeparture') }}:
              </span>
              <span class="text-white font-medium">{{ timingResult }}</span>
              <span v-if="totalChargeMins > 0" class="text-yellow-400 ml-auto">+{{ totalChargeMins }} min ⚡</span>
            </div>
          </div>
        </SortableSection>

        <!-- Routeninfo -->
        <SortableSection v-if="sid === 'routeinfo' && (routeData || routeLoading)"
          page-id="routePlanner" section-id="routeinfo"
          :title="$t('routes.routeInfo')" icon="📏"
          :collapsed="isCollapsed('routeinfo')" @toggle="toggle('routeinfo')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="space-y-3">
          <div v-if="routeLoading" class="text-xs text-gray-400 animate-pulse">{{ $t('routes.calculating') }}</div>
          <template v-else-if="routeData">
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-gray-800 rounded-xl px-3 py-2.5 text-center">
                <p class="text-xs text-gray-400">{{ $t('routes.distance') }}</p>
                <p class="text-white font-semibold text-sm">{{ formatDistance(routeData.distance_km) }}</p>
              </div>
              <div class="bg-gray-800 rounded-xl px-3 py-2.5 text-center">
                <p class="text-xs text-gray-400">{{ $t('routes.duration') }}</p>
                <p class="text-white font-semibold text-sm">{{ formatDuration(routeData.duration_min) }}</p>
              </div>
            </div>
            <div v-if="routeStats.soc != null" class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-400">{{ $t('routes.currentSoc') }}</span>
                <span class="text-white font-medium">{{ routeStats.soc }}%</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-400">{{ $t('routes.arrivalSoc') }}</span>
                <span :class="arrivalSocClass" class="font-semibold">{{ arrivalSoc != null ? arrivalSoc + '%' : '—' }}</span>
              </div>
              <div class="h-2 rounded-full bg-gray-700 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" :class="arrivalSocBarClass"
                  :style="{ width: Math.max(0, arrivalSoc ?? 0) + '%' }"></div>
              </div>
              <div v-if="arrivalSoc != null && arrivalSoc < 10"
                class="rounded-xl bg-red-900/60 border border-red-700 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
                <span class="mt-0.5">⚠️</span>
                <span>{{ $t('routes.rangeInsufficient') }}</span>
              </div>
              <div v-else-if="arrivalSoc != null && arrivalSoc < 20"
                class="rounded-xl bg-yellow-900/50 border border-yellow-700 px-3 py-2 text-xs text-yellow-200 flex items-start gap-2">
                <span class="mt-0.5">⚡</span>
                <span>{{ $t('routes.rangeLow') }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-500">{{ $t('routes.noSocData') }}</p>
          </template>
          </div>
        </SortableSection>

        <!-- ⚡ Ladeplan -->
        <SortableSection v-if="sid === 'charging' && routeData"
          page-id="routePlanner" section-id="charging"
          title="⚡ Ladeplan" icon=""
          :collapsed="isCollapsed('charging')" @toggle="toggle('charging')" @move="(f,t,p) => moveSection(f,t,p)">
          <template #badge>
            <button @click.stop="calcChargingPlan" :disabled="planLoading || !routeData"
              class="px-3 py-1 rounded-lg text-xs font-medium transition"
              :class="planLoading ? 'bg-gray-700 text-gray-400' : 'bg-yellow-700 hover:bg-yellow-600 text-white'">
              {{ planLoading ? '…' : $t('routes.planChargingBtn') }}
            </button>
          </template>
          <div class="space-y-3">

          <!-- SoC-Konfiguration -->
          <div class="bg-gray-800/50 rounded-xl p-3 space-y-2.5 mb-1">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-400 block mb-1">🔋 {{ $t('routes.departureSocLabel') }}</label>
                <div v-if="!isScheduledDeparture && routeStats.soc != null"
                  class="flex items-center gap-2 bg-gray-700 rounded-lg px-2.5 py-2">
                  <span class="text-green-400 font-bold">{{ routeStats.soc }}%</span>
                  <span class="text-xs text-gray-500 ml-auto">● live</span>
                </div>
                <div v-else class="flex items-center gap-1.5">
                  <input v-model.number="departureSocManual" type="number" min="5" max="100" step="5"
                    :placeholder="String(routeStats.soc ?? 80)"
                    class="input flex-1 text-sm text-center" />
                  <span class="text-xs text-gray-400">%</span>
                </div>
                <p v-if="isScheduledDeparture" class="text-xs text-gray-600 mt-0.5">{{ $t('routes.departureSocHint') }}</p>
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">🏁 {{ $t('routes.minArrivalSocLabel') }}</label>
                <div class="flex items-center gap-1.5">
                  <input v-model.number="minArrivalSoc" type="number" min="5" max="80" step="5"
                    class="input flex-1 text-sm text-center" />
                  <span class="text-xs text-gray-400">%</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-700 pt-2">
              <span>{{ $t('routes.chargeToLabel') }}</span>
              <input v-model.number="chargeToSoc" type="number" min="50" max="100" step="5"
                class="input w-16 text-sm text-center py-1" />
              <span>%</span>
            </div>
          </div>

          <!-- Plan noch nicht berechnet -->
          <p v-if="!chargingPlan && !planLoading" class="text-xs text-gray-500">
            {{ $t('routes.chargingPlanHint') }}
          </p>
          <div v-if="planLoading" class="text-xs text-gray-400 animate-pulse">{{ $t('routes.planCalculating') }}</div>

          <!-- Plan: keine Stopps nötig -->
          <div v-if="chargingPlan && chargingPlan.stops.length === 0 && chargingPlan.feasible"
            class="rounded-xl bg-green-900/40 border border-green-700 px-3 py-2 text-sm text-green-200 flex items-center gap-2">
            <span>✅</span>
            <span>{{ $t('routes.noStopsNeeded') }}</span>
            <span class="ml-auto text-green-400 font-semibold">{{ chargingPlan.arrival_soc }}%</span>
          </div>

          <!-- Plan: nicht fahrbar -->
          <div v-if="chargingPlan && !chargingPlan.feasible"
            class="rounded-xl bg-red-900/60 border border-red-700 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
            <span class="mt-0.5">🚫</span>
            <span>{{ $t('routes.planNotFeasible') }}</span>
          </div>

          <!-- Ladestopps -->
          <ul v-if="chargingPlan?.stops?.length" class="space-y-2">
            <li v-for="(stop, i) in chargingPlan.stops" :key="i"
              class="rounded-xl border border-yellow-800/50 bg-yellow-900/20 px-3 py-2.5 space-y-1 cursor-pointer hover:bg-yellow-900/40 transition"
              @click="focusStop(stop)">
              <div class="flex items-center gap-2">
                <span class="text-yellow-400 text-sm">⚡</span>
                <p class="flex-1 text-sm font-medium text-white truncate">{{ stop.name }}</p>
                <span class="text-xs text-gray-400">{{ Math.round(stop.route_km) }} km</span>
              </div>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-gray-400">{{ stop.arrive_soc }}%</span>
                <span class="text-gray-600">→</span>
                <span class="text-green-400 font-medium">{{ stop.depart_soc }}%</span>
                <span class="ml-auto text-yellow-300">{{ stop.charge_minutes }} min</span>
                <span v-if="stop.max_kw" class="text-gray-500">{{ stop.max_kw }} kW</span>
              </div>
              <div v-if="stop.operator" class="text-xs text-gray-500 truncate">{{ stop.operator }}</div>
            </li>
          </ul>

          <!-- Gesamtzusammenfassung -->
          <div v-if="chargingPlan?.stops?.length" class="border-t border-gray-700 pt-2 flex items-center justify-between text-xs">
            <span class="text-gray-400">{{ $t('routes.totalChargeTime') }}:</span>
            <span class="text-yellow-300 font-medium">+{{ chargingPlan.stops.reduce((s,st)=>s+st.charge_minutes,0) }} min</span>
            <span class="text-gray-400 ml-3">{{ $t('routes.arriveWith') }}:</span>
            <span :class="chargingPlan.arrival_soc >= 20 ? 'text-green-400' : 'text-red-400'" class="font-semibold">
              {{ chargingPlan.arrival_soc }}%
            </span>
          </div>
          </div>
        </SortableSection>

        <!-- Wetter & Verkehr -->
        <SortableSection v-if="sid === 'weather' && (routeData || weatherData)"
          page-id="routePlanner" section-id="weather"
          :title="$t('routes.weatherTitle')" icon="🌤"
          :collapsed="isCollapsed('weather')" @toggle="toggle('weather')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="space-y-2">
            <div v-if="weatherLoading" class="text-xs text-gray-400 animate-pulse">{{ $t('routes.weatherLoading') }}</div>
            <template v-else-if="weatherData">
              <!-- Start-Wetter -->
              <div v-if="weatherData.start" class="bg-gray-800/60 rounded-xl px-3 py-2 flex items-center gap-2">
                <span class="text-2xl">{{ weatherEmoji(weatherData.start.current?.weather_code) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-400">{{ $t('routes.weatherAtStart') }}</p>
                  <p class="text-sm font-medium text-white">
                    {{ weatherData.start.current?.temperature_2m?.toFixed(1) }}°C
                    <span class="text-gray-400 text-xs ml-1">💨 {{ weatherData.start.current?.wind_speed_10m }} km/h</span>
                  </p>
                </div>
                <div v-if="(weatherData.start.current?.precipitation ?? 0) > 0" class="text-blue-400 text-xs">
                  🌧 {{ weatherData.start.current.precipitation }} mm
                </div>
              </div>
              <!-- Ziel-Wetter -->
              <div v-if="weatherData.dest" class="bg-gray-800/60 rounded-xl px-3 py-2 flex items-center gap-2">
                <span class="text-2xl">{{ weatherEmoji(weatherData.dest.hourly?.weather_code ?? weatherData.dest.current?.weather_code) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-400">{{ $t('routes.weatherAtDest') }} ({{ $t('routes.expectedArrival') }})</p>
                  <p class="text-sm font-medium text-white">
                    {{ (weatherData.dest.hourly?.temperature_2m ?? weatherData.dest.current?.temperature_2m)?.toFixed(1) }}°C
                    <span class="text-gray-400 text-xs ml-1">💨 {{ weatherData.dest.hourly?.wind_speed_10m ?? weatherData.dest.current?.wind_speed_10m }} km/h</span>
                  </p>
                </div>
                <div v-if="(weatherData.dest.hourly?.precipitation_probability ?? 0) > 40" class="text-blue-400 text-xs">
                  🌧 {{ weatherData.dest.hourly.precipitation_probability }}%
                </div>
              </div>
            </template>
            <p v-else class="text-xs text-gray-500">{{ $t('routes.weatherHint') }}</p>

            <!-- Verkehr -->
            <div v-if="trafficData?.available" class="bg-gray-800/60 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
              <span>🚗</span>
              <span class="text-gray-400">{{ $t('routes.trafficLabel') }}:</span>
              <span class="text-white">{{ trafficData.duration_min }} min</span>
              <span v-if="trafficData.delay_min > 5" class="text-red-400 ml-auto">+{{ trafficData.delay_min }} min Stau</span>
              <span v-else-if="trafficData.delay_min > 0" class="text-yellow-400 ml-auto">+{{ trafficData.delay_min }} min</span>
              <span v-else class="text-green-400 ml-auto">{{ $t('routes.trafficFree') }}</span>
            </div>
            <div v-else-if="trafficData?.available === false && trafficData?.reason === 'no_key'"
              class="text-xs text-gray-500 flex items-center gap-1">
              <span>ℹ️</span>
              <span>{{ $t('routes.trafficNoKey') }}</span>
              <RouterLink to="/settings" class="text-blue-400 hover:underline ml-1">{{ $t('routes.trafficSetup') }}</RouterLink>
            </div>
          </div>
        </SortableSection>

        <!-- Aktionen -->
        <SortableSection v-if="sid === 'actions'"
          page-id="routePlanner" section-id="actions"
          :title="$t('routes.actionsTitle')" icon="🎮"
          :collapsed="isCollapsed('actions')" @toggle="toggle('actions')" @move="(f,t,p) => moveSection(f,t,p)">
          <div class="space-y-3">
          <button @click="sendToTesla" :disabled="!destination || busy"
            class="w-full py-2.5 rounded-xl bg-tesla-red hover:bg-red-700 text-white font-medium text-sm transition disabled:opacity-40 flex items-center justify-center gap-2"
            v-tooltip="$t('routes.sendTooltip')">
            <AppIcon name="steering" :size="16" />
            {{ $t('routes.sendToTesla') }}
          </button>

          <div class="grid grid-cols-2 gap-2">
            <button @click="toggleChargers" :disabled="!routeData"
              class="py-2 rounded-xl text-white text-sm transition disabled:opacity-40 flex items-center justify-center gap-1"
              :class="showChargers ? 'bg-blue-700 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
              v-tooltip="$t('routes.chargerTooltip')">
              ⚡ {{ showChargers ? $t('routes.hideChargers') : $t('routes.showChargers') }}
            </button>
            <button @click="toggleCameras" :disabled="!routeData"
              class="py-2 rounded-xl text-white text-sm transition disabled:opacity-40 flex items-center justify-center gap-1"
              :class="showCameras ? 'bg-orange-700 hover:bg-orange-600' : 'bg-gray-700 hover:bg-gray-600'"
              v-tooltip="$t('routes.camerasTooltip')">
              📷 {{ showCameras ? `${cameras.length}` : $t('routes.showCameras') }}
            </button>
          </div>

          <div class="flex gap-2">
            <button @click="showSaveDialog = true" :disabled="!destination"
              class="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium text-sm transition disabled:opacity-40 flex items-center justify-center gap-2">
              <AppIcon name="export" :size="16" />
              {{ $t('routes.saveRoute') }}
            </button>
            <button v-if="destination && startLocation" @click="showReturnDialog = true" :disabled="!destination"
              class="px-3 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm transition disabled:opacity-40 flex items-center gap-1"
              v-tooltip="$t('routes.returnTripTitle')">
              🔄
            </button>
          </div>

          <!-- Blitzer-Rechtslage Hinweis -->
          <div v-if="showCameras" class="rounded-xl border border-orange-800/40 bg-orange-900/10 px-3 py-2 text-xs text-orange-200 space-y-1">
            <p class="font-semibold">⚖️ {{ $t('routes.camerasLegal') }}</p>
            <p class="text-orange-300/80">{{ $t('routes.camerasLegalText') }}</p>
          </div>

          <button @click="openAbrp"
            class="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-1">
            <AppIcon name="map" :size="12" />
            {{ $t('routes.abrpFallback') }}
          </button>
          </div>
        </SortableSection>

        <!-- Gespeicherte Routen -->
        <SortableSection v-if="sid === 'saved'"
          page-id="routePlanner" section-id="saved"
          :title="$t('routes.saved')" icon="💾"
          :collapsed="isCollapsed('saved')" @toggle="toggle('saved')" @move="(f,t,p) => moveSection(f,t,p)">
          <template #badge><span class="text-xs text-gray-500">{{ savedRoutes.length }}</span></template>
          <div class="space-y-3">
          <p v-if="!savedRoutes.length" class="text-xs text-gray-500">{{ $t('routes.noSaved') }}</p>
          <ul class="space-y-2">
            <li v-for="route in savedRoutes" :key="route.id" class="bg-gray-800 rounded-xl px-3 py-2.5 space-y-1.5">
              <div class="flex items-center gap-2">
                <template v-if="editingId === route.id">
                  <input v-model="editName" class="input flex-1 text-sm py-1"
                    @keyup.enter="confirmRename(route)" @keyup.escape="editingId = null" />
                  <button @click="confirmRename(route)" class="text-green-400 text-sm hover:text-green-300">✓</button>
                  <button @click="editingId = null" class="text-gray-500 text-sm hover:text-white">✕</button>
                </template>
                <template v-else>
                  <p class="flex-1 font-medium text-sm text-white truncate">{{ route.name }}</p>
                  <button @click="startEdit(route)" class="text-gray-500 hover:text-white text-xs" v-tooltip="$t('common.edit')">✏️</button>
                  <button @click="deleteRoute(route.id)" class="text-gray-500 hover:text-red-400 text-xs" v-tooltip="$t('common.delete')">🗑</button>
                </template>
              </div>
              <p class="text-xs text-gray-400 truncate">📍 {{ route.destination_name }}</p>
              <div v-if="route.scheduled_date" class="flex items-center gap-1 text-xs text-blue-400">
                <span>🕐</span>
                <span>{{ route.scheduled_date }} {{ route.departure_time ?? '' }}</span>
                <span v-if="route.auto_send" class="text-yellow-400 ml-1">⚡ auto</span>
              </div>
              <p v-if="route.waypoints?.length" class="text-xs text-gray-500">
                + {{ route.waypoints.length }} {{ $t('routes.stops') }}
              </p>
              <div class="flex gap-2 pt-0.5">
                <button @click="loadRoute(route)"
                  class="flex-1 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition">
                  {{ $t('routes.load') }}
                </button>
                <button @click="loadAndSend(route)" :disabled="busy"
                  class="flex-1 py-1 text-xs rounded-lg bg-tesla-red/80 hover:bg-tesla-red text-white transition disabled:opacity-40">
                  {{ $t('routes.loadAndSend') }}
                </button>
              </div>
            </li>
          </ul>
          </div>
        </SortableSection>

        </template><!-- end v-for orderedSections -->
      </div>

      <!-- ─── Karte ──────────────────────────────────────────────────────────── -->
      <div class="card p-0 overflow-hidden rounded-2xl sticky top-4" style="height: 75vh; min-height: 420px;">
        <div id="route-map" class="w-full h-full"></div>
        <div class="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none">
          <div v-if="showChargers && chargers.length" class="bg-gray-900/90 backdrop-blur rounded-xl px-3 py-1.5 text-xs text-gray-300 flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> {{ $t('routes.chargerLegend') }}
          </div>
          <div v-if="showCameras && cameras.length" class="bg-gray-900/90 backdrop-blur rounded-xl px-3 py-1.5 text-xs text-orange-300 flex items-center gap-2">
            📷 {{ cameras.length }} {{ $t('routes.camerasLegend') }}
          </div>
        </div>
        <div v-if="chargingPlan?.stops?.length" class="absolute top-3 right-3 bg-gray-900/90 backdrop-blur rounded-xl px-3 py-2 text-xs text-yellow-300 pointer-events-none">
          ⚡ {{ chargingPlan.stops.length }} {{ $t('routes.chargingStopShort') }}
        </div>
      </div>
    </div>

    <!-- ─── Speichern-Dialog ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showSaveDialog" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
        @click.self="showSaveDialog = false">
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
          <h3 class="font-semibold text-lg">{{ $t('routes.saveRoute') }}</h3>
          <div>
            <label class="label">{{ $t('routes.routeName') }}</label>
            <input v-model="saveName" class="input w-full" :placeholder="destination?.name"
              @keyup.enter="confirmSave" ref="saveInput" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label text-xs">{{ $t('routes.scheduleDate') }}</label>
              <input v-model="saveScheduleDate" type="date" class="input w-full text-sm" :min="todayStr" />
            </div>
            <div>
              <label class="label text-xs">{{ $t('routes.scheduleTime') }}</label>
              <input v-model="saveScheduleTime" type="time" class="input w-full text-sm" :disabled="!saveScheduleDate" />
            </div>
          </div>
          <div v-if="saveScheduleDate && saveScheduleTime" class="flex items-center gap-2 text-sm">
            <input id="autoSendCheck" v-model="saveAutoSend" type="checkbox" class="rounded" />
            <label for="autoSendCheck" class="text-gray-300 cursor-pointer">{{ $t('routes.autoSendLabel') }}</label>
          </div>
          <div>
            <label class="label text-xs">{{ $t('routes.notes') }}</label>
            <textarea v-model="saveNotes" class="input w-full text-sm resize-none" rows="2"
              :placeholder="$t('routes.notesPlaceholder')"></textarea>
          </div>
          <div class="flex items-center gap-2 text-sm border-t border-gray-700 pt-3">
            <input id="withReturn" v-model="saveWithReturn" type="checkbox" class="rounded" />
            <label for="withReturn" class="text-gray-300 cursor-pointer">{{ $t('routes.withReturnTrip') }}</label>
          </div>
          <div class="flex gap-3">
            <button @click="showSaveDialog = false" class="flex-1 btn-secondary">{{ $t('common.cancel') }}</button>
            <button @click="confirmSave" :disabled="saving" class="flex-1 btn-primary">
              {{ saving ? '…' : $t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Rückfahrt-Dialog ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showReturnDialog" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
        @click.self="showReturnDialog = false">
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
          <h3 class="font-semibold text-lg flex items-center gap-2">🔄 {{ $t('routes.returnTripTitle') }}</h3>
          <p class="text-sm text-gray-400">
            {{ destination?.name }} → {{ startLocation?.name ?? '?' }}
          </p>
          <div>
            <label class="label">{{ $t('routes.routeName') }}</label>
            <input v-model="returnName" class="input w-full" :placeholder="`Rückfahrt: ${startLocation?.name ?? ''}`" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label text-xs">{{ $t('routes.returnDeparture') }}</label>
              <input v-model="returnDate" type="date" class="input w-full text-sm" :min="todayStr" />
            </div>
            <div>
              <label class="label text-xs">{{ $t('routes.scheduleTime') }}</label>
              <input v-model="returnTime" type="time" class="input w-full text-sm" :disabled="!returnDate" />
            </div>
          </div>
          <div v-if="returnDate && returnTime" class="flex items-center gap-2 text-sm">
            <input id="returnAutoSend" v-model="returnAutoSend" type="checkbox" class="rounded" />
            <label for="returnAutoSend" class="text-gray-300 cursor-pointer">{{ $t('routes.autoSendLabel') }}</label>
          </div>
          <div class="flex gap-3">
            <button @click="showReturnDialog = false" class="flex-1 btn-secondary">{{ $t('common.cancel') }}</button>
            <button @click="confirmReturnTrip" :disabled="saving" class="flex-1 btn-primary">
              {{ saving ? '…' : $t('routes.addReturn') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Toast ────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="toast" class="fixed top-20 right-4 z-[1000] px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
          :class="toast.ok ? 'bg-green-800 text-green-100' : 'bg-red-900 text-red-200'">
          {{ toast.msg }}
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import AppIcon from '../components/AppIcon.vue';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import api from '../api.js';

const { t, locale } = useI18n();
const appStore = useAppStore();
const vehicle  = computed(() => appStore.selectedVehicle);

// ── Layout ──
const ROUTE_SECTIONS = ['start', 'destination', 'timing', 'charging', 'routeinfo', 'waypoints', 'weather', 'actions', 'saved'];
const { orderedSections, isCollapsed, toggle, moveSection } = usePageLayout('routePlanner', ROUTE_SECTIONS);

// ── Leaflet ──
let L              = null;
let leafletMap     = null;
let destMarker     = null;
let wpMarkers      = [];
let routeLayer     = null;
let chargerMarkers = [];
let planMarkers    = [];  // Ladestopps aus dem Ladeplan
let cameraMarkers  = [];  // Blitzerkameras

// ── Startort ──
const startMode     = ref('vehicle');
const startLocation = ref(null);
const startQuery    = ref('');
const startResults  = ref([]);
let startTimer      = null;

// ── Suche ──
const searchQuery     = ref('');
const searchResults   = ref([]);
const searching       = ref(false);
const searchNoResults = ref(false);
let searchTimer       = null;
const wpQuery         = ref('');
const wpResults       = ref([]);
let wpTimer           = null;

// ── Route ──
const destination = ref(null);
const waypoints   = ref([]);

// ── Routenberechnung ──
const routeData    = ref(null);
const routeLoading = ref(false);
const routeStats   = ref({ soc: null, rated_range_km: null, avg_kwh_per_100km: null });

// ── Ladeplan ──
const chargingPlan       = ref(null);
const planLoading        = ref(false);
const departureSocManual = ref(null);
const minArrivalSoc      = ref(20);
const chargeToSoc        = ref(80);

// ── Ladestationen (Karten-Layer) ──
const chargers      = ref([]);
const chargerLoading = ref(false);
const showChargers   = ref(false);

// ── Timing-Modus ──
const planMode = ref('depart'); // 'depart' | 'arrive'
const planDate = ref('');
const planTime = ref('');

// ── Wetter ──
const weatherData    = ref(null);
const weatherLoading = ref(false);
const trafficData    = ref(null);

// ── Blitzer ──
const showCameras   = ref(false);
const cameras       = ref([]);
const cameraLoading = ref(false);

// ── Heute als Mindestdatum ──
const todayStr = new Date().toISOString().slice(0, 10);

// ── Gespeicherte Routen ──
const savedRoutes    = ref([]);
const showSaveDialog = ref(false);
const saveName       = ref('');
const saveScheduleDate = ref('');
const saveScheduleTime = ref('');
const saveAutoSend     = ref(false);
const saveNotes        = ref('');
const saveWithReturn   = ref(false);
const saving           = ref(false);
const saveInput        = ref(null);
const editingId        = ref(null);
const editName         = ref('');

// ── Rückfahrt ──
const showReturnDialog = ref(false);
const returnName       = ref('');
const returnDate       = ref('');
const returnTime       = ref('');
const returnAutoSend   = ref(false);

// ── UI ──
const busy  = ref(false);
const toast = ref(null);

function showToast(msg, ok = true) {
  toast.value = { msg, ok };
  setTimeout(() => { toast.value = null; }, 3500);
}

// ── Abfahrtszeit jetzt setzen ──
function setDepartNow() {
  const now = new Date();
  planDate.value = now.toISOString().slice(0, 10);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  planTime.value = `${hh}:${mm}`;
}

// ── Gesamte Ladezeit in Minuten ──
const totalChargeMins = computed(() =>
  (chargingPlan.value?.stops ?? []).reduce((s, st) => s + st.charge_minutes, 0)
);
const isScheduledDeparture  = computed(() => !!(planDate.value && planTime.value));
const effectiveDepartureSoc = computed(() =>
  departureSocManual.value !== null ? departureSocManual.value : (routeStats.value.soc ?? null)
);

// ── Timing-Ergebnis (Ankunft oder benötigte Abfahrt) ──
const timingResult = computed(() => {
  if (!planDate.value || !planTime.value || !routeData.value) return null;
  const [hh, mm] = planTime.value.split(':').map(Number);
  const totalMin = routeData.value.duration_min + totalChargeMins.value;
  if (planMode.value === 'depart') {
    const dep = new Date(planDate.value);
    dep.setHours(hh, mm, 0, 0);
    dep.setMinutes(dep.getMinutes() + totalMin);
    const rh = String(dep.getHours()).padStart(2, '0');
    const rm = String(dep.getMinutes()).padStart(2, '0');
    const arrDay = dep.toISOString().slice(0, 10);
    return planDate.value === arrDay ? `${rh}:${rm}` : `${arrDay} ${rh}:${rm}`;
  } else {
    // Ankunft gewünscht → Abfahrt berechnen
    const arr = new Date(planDate.value);
    arr.setHours(hh, mm, 0, 0);
    arr.setMinutes(arr.getMinutes() - totalMin);
    const rh = String(arr.getHours()).padStart(2, '0');
    const rm = String(arr.getMinutes()).padStart(2, '0');
    const depDay = arr.toISOString().slice(0, 10);
    return depDay === planDate.value ? `${rh}:${rm}` : `${depDay} ${rh}:${rm}`;
  }
});
// Alias für Abwärtskompatibilität mit dem Save-Dialog
const expectedArrival = computed(() => planMode.value === 'depart' ? timingResult.value : null);

// ── Wetter-Emoji ──
function weatherEmoji(code) {
  if (code == null) return '🌡';
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤';
  if (code <= 48) return '☁️';
  if (code <= 67) return '🌧';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦';
  return '⛈';
}

async function loadWeather() {
  if (!routeData.value) return;
  const geo = routeData.value.geometry;
  const startPt = startLocation.value ?? vehicle.value;
  if (!startPt) return;
  const startLat = startPt.lat ?? startPt.last_lat;
  const startLon = startPt.lon ?? startPt.last_lon;
  const destPt   = destination.value;
  if (!startLat || !destPt) return;

  weatherLoading.value = true;
  try {
    const depTime = planDate.value && planTime.value
      ? `${planDate.value}T${planTime.value}`
      : new Date().toISOString().slice(0, 16);
    const arrMs = new Date(depTime).getTime() + routeData.value.duration_min * 60000;
    const arrTime = new Date(arrMs).toISOString().slice(0, 16);

    const [wStart, wDest] = await Promise.all([
      api.get('/routing/weather', { params: { lat: startLat, lon: startLon, time: depTime } }).then(r => r.data).catch(() => null),
      api.get('/routing/weather', { params: { lat: destPt.lat, lon: destPt.lon, time: arrTime } }).then(r => r.data).catch(() => null),
    ]);
    weatherData.value = { start: wStart, dest: wDest };
  } catch { /* silent */ }
  finally { weatherLoading.value = false; }
}

async function loadTraffic() {
  if (!routeData.value || !destination.value) return;
  const startPt = startLocation.value ?? vehicle.value;
  if (!startPt) return;
  const oLat = startPt.lat ?? startPt.last_lat;
  const oLon = startPt.lon ?? startPt.last_lon;
  try {
    const { data } = await api.get('/routing/traffic', {
      params: { origin_lat: oLat, origin_lon: oLon, dest_lat: destination.value.lat, dest_lon: destination.value.lon },
    });
    trafficData.value = data;
  } catch { trafficData.value = null; }
}

// ── Reichweite ──
const arrivalSoc = computed(() => {
  if (!routeData.value || routeStats.value.soc == null || !routeStats.value.rated_range_km) return null;
  const { distance_km } = routeData.value;
  const { soc, rated_range_km } = routeStats.value;
  if (rated_range_km <= 0) return null;
  const val = Math.round((rated_range_km - distance_km) * soc / rated_range_km);
  return Math.max(-99, val);
});

const arrivalSocClass = computed(() => {
  if (arrivalSoc.value == null) return 'text-gray-400';
  if (arrivalSoc.value < 10) return 'text-red-400';
  if (arrivalSoc.value < 20) return 'text-yellow-400';
  return 'text-green-400';
});

const arrivalSocBarClass = computed(() => {
  if (arrivalSoc.value == null || arrivalSoc.value < 0) return 'bg-red-500';
  if (arrivalSoc.value < 10) return 'bg-red-500';
  if (arrivalSoc.value < 20) return 'bg-yellow-500';
  return 'bg-green-500';
});

// ── Formatierung ──
function formatDistance(km) {
  if (km == null) return '—';
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

function formatDuration(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Geocoding ──
async function geocode(q) {
  const { data } = await api.get('/routing/geocode', { params: { q, lang: locale.value } });
  return Array.isArray(data) ? data : [];
}

async function reverseGeocode(lat, lon) {
  try {
    const { data } = await api.get('/routing/reverse', { params: { lat, lon, lang: locale.value } });
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

function onSearchInput() {
  clearTimeout(searchTimer);
  searchNoResults.value = false;
  if (searchQuery.value.length < 2) { searchResults.value = []; return; }
  searching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await geocode(searchQuery.value);
      searchNoResults.value = searchResults.value.length === 0;
    } catch { searchResults.value = []; }
    finally { searching.value = false; }
  }, 350);
}

async function onSearchEnter() {
  if (searchQuery.value.length < 2) return;
  searching.value = true; searchNoResults.value = false;
  try {
    searchResults.value = await geocode(searchQuery.value);
    searchNoResults.value = searchResults.value.length === 0;
    if (searchResults.value.length === 1) pickResult(searchResults.value[0]);
  } finally { searching.value = false; }
}

function onWpInput() {
  clearTimeout(wpTimer);
  if (wpQuery.value.length < 2) { wpResults.value = []; return; }
  wpTimer = setTimeout(async () => { wpResults.value = await geocode(wpQuery.value); }, 350);
}

// ── Startort ──
async function setStartVehicle() {
  startMode.value = 'vehicle';
  if (vehicle.value?.last_lat && vehicle.value?.last_lon) {
    const name = await reverseGeocode(vehicle.value.last_lat, vehicle.value.last_lon)
      .catch(() => t('routes.startVehicleLabel'));
    startLocation.value = {
      name: name.split(',')[0] || t('routes.startVehicleLabel'),
      lat: vehicle.value.last_lat, lon: vehicle.value.last_lon,
    };
  } else {
    startLocation.value = null;
  }
  if (destination.value) calculateRoute();
}

async function setStartBrowser() {
  startMode.value = 'browser';
  if (!navigator.geolocation) {
    showToast(t('routes.startBrowserUnavailable'), false); startMode.value = 'vehicle'; return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const name = await reverseGeocode(lat, lon).catch(() => t('routes.startBrowserLabel'));
      startLocation.value = { name: name.split(',')[0] || t('routes.startBrowserLabel'), lat, lon };
      if (destination.value) calculateRoute();
    },
    () => { showToast(t('routes.startBrowserDenied'), false); startMode.value = 'vehicle'; },
    { timeout: 8000 },
  );
}

function onStartInput() {
  clearTimeout(startTimer);
  if (startQuery.value.length < 2) { startResults.value = []; return; }
  startTimer = setTimeout(async () => { startResults.value = await geocode(startQuery.value); }, 350);
}

function pickStartResult(r) {
  startLocation.value = { name: r.display_name.split(',')[0], lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
  startQuery.value = ''; startResults.value = [];
  if (leafletMap && L) leafletMap.setView([startLocation.value.lat, startLocation.value.lon], Math.max(leafletMap.getZoom(), 10));
  if (destination.value) calculateRoute();
}

function pickResult(r) {
  setDestination(r.display_name.split(',')[0], parseFloat(r.lat), parseFloat(r.lon));
  searchResults.value = []; searchQuery.value = '';
}

function addWaypoint(r) {
  if (waypoints.value.length >= 5) return;
  waypoints.value.push({ name: r.display_name.split(',').slice(0,2).join(', '), lat: parseFloat(r.lat), lon: parseFloat(r.lon) });
  wpResults.value = []; wpQuery.value = '';
  updateWpMarkers(); calculateRoute();
}

function removeWaypoint(i) {
  waypoints.value.splice(i, 1); updateWpMarkers(); calculateRoute();
}

function clearSearch() { searchQuery.value = ''; searchResults.value = []; }

function clearDestination() {
  destination.value = null; routeData.value = null; chargingPlan.value = null;
  chargers.value = []; cameras.value = [];
  weatherData.value = null; trafficData.value = null;
  if (destMarker) { destMarker.remove(); destMarker = null; }
  clearRouteLayer(); clearChargerMarkers(); clearPlanMarkers(); clearCameraMarkers();
}

// ── Karte ──
function setDestination(name, lat, lon) {
  destination.value = { name, lat, lon };
  if (L && leafletMap) {
    if (destMarker) destMarker.remove();
    destMarker = L.marker([lat, lon], { icon: redIcon() }).addTo(leafletMap).bindPopup(name).openPopup();
    leafletMap.setView([lat, lon], Math.max(leafletMap.getZoom(), 12));
  }
  chargingPlan.value = null;
  calculateRoute();
}

function redIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:#e2231a;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
    iconSize: [24, 24], iconAnchor: [12, 24],
  });
}

function grayIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#6b7280;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });
}

function chargerIcon(kw) {
  const color = kw >= 100 ? '#3b82f6' : kw >= 50 ? '#60a5fa' : '#93c5fd';
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5);font-size:10px;color:white;font-weight:bold">⚡</div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

function planStopIcon(arrSoc) {
  const color = arrSoc >= 20 ? '#f59e0b' : '#ef4444';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.6);font-size:12px">⚡</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
}

function updateWpMarkers() {
  wpMarkers.forEach(m => m.remove()); wpMarkers = [];
  if (!L || !leafletMap) return;
  waypoints.value.forEach((wp, i) => {
    wpMarkers.push(L.marker([wp.lat, wp.lon], { icon: grayIcon() }).addTo(leafletMap).bindPopup(`${i+1}. ${wp.name}`));
  });
}

function clearRouteLayer() { if (routeLayer) { routeLayer.remove(); routeLayer = null; } }
function clearChargerMarkers() { chargerMarkers.forEach(m => m.remove()); chargerMarkers = []; }
function clearPlanMarkers() { planMarkers.forEach(m => m.remove()); planMarkers = []; }

// ── OSRM-Routing ──
let routeCalcTimer = null;

function calculateRoute() {
  clearTimeout(routeCalcTimer);
  if (!destination.value) return;
  routeCalcTimer = setTimeout(_doCalculateRoute, 300);
}

async function _doCalculateRoute() {
  if (!destination.value) return;
  routeLoading.value = true;
  clearRouteLayer(); clearPlanMarkers(); chargingPlan.value = null;

  const startLat = startLocation.value?.lat ?? vehicle.value?.last_lat ?? 51.1657;
  const startLon = startLocation.value?.lon ?? vehicle.value?.last_lon ?? 10.4515;

  const coordinates = [
    [parseFloat(startLon.toFixed(6)), parseFloat(startLat.toFixed(6))],
    ...waypoints.value.map(wp => [parseFloat(wp.lon.toFixed(6)), parseFloat(wp.lat.toFixed(6))]),
    [parseFloat(destination.value.lon.toFixed(6)), parseFloat(destination.value.lat.toFixed(6))],
  ];

  try {
    const { data: osrmData } = await api.post('/routing/route', { coordinates });
    const route = osrmData.routes?.[0];
    if (!route) throw new Error('Keine Route gefunden');

    routeData.value = {
      distance_km:  route.distance / 1000,
      duration_min: route.duration / 60,
      geometry:     route.geometry.coordinates,
      coordinates,  // für /plan weitergeben
    };

    if (L && leafletMap) {
      const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      routeLayer = L.polyline(latlngs, { color: '#e2231a', weight: 4, opacity: 0.8 }).addTo(leafletMap);
      leafletMap.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
    }

    if (showChargers.value) await _loadChargers();
    if (showCameras.value) await _loadCameras();
    // Wetter + Verkehr asynchron nachladen
    loadWeather();
    loadTraffic();

  } catch (err) {
    console.warn('[Routing]', err.message);
    showToast(t('routes.routeError'), false);
    routeData.value = null;
  } finally {
    routeLoading.value = false;
  }
}

// ── Ladeplan ──
async function calcChargingPlan() {
  if (!routeData.value || !vehicle.value) return;
  planLoading.value = true;
  clearPlanMarkers();

  // Batterie-kWh schätzen: rated_range_at_100 * (verbrauch/100)
  let batKwh = null;
  const { soc, rated_range_km, avg_kwh_per_100km } = routeStats.value;
  if (soc && rated_range_km && avg_kwh_per_100km) {
    const range100 = rated_range_km / (soc / 100);
    batKwh = range100 * (avg_kwh_per_100km / 100);
  }

  try {
    const { data } = await api.post('/routing/plan', {
      vehicleId:        vehicle.value.id,
      coordinates:      routeData.value.coordinates,
      current_soc:       (departureSocManual.value !== null ? departureSocManual.value : soc) ?? undefined,
      avg_kwh_per_100km: avg_kwh_per_100km ?? undefined,
      battery_kwh:       batKwh ?? undefined,
      min_arrival_soc:   minArrivalSoc.value,
      charge_to_soc:     chargeToSoc.value,
    });
    chargingPlan.value = data;
    if (L && leafletMap) updatePlanMarkers();
  } catch (err) {
    showToast(t('routes.planFailed'), false);
    console.warn('[ChargingPlan]', err.message);
  } finally {
    planLoading.value = false;
  }
}

function updatePlanMarkers() {
  clearPlanMarkers();
  if (!L || !leafletMap || !chargingPlan.value?.stops) return;
  for (const stop of chargingPlan.value.stops) {
    const popup = `<b>⚡ ${stop.name}</b><br>${stop.arrive_soc}% → ${stop.depart_soc}%<br>${stop.charge_minutes} min · ${stop.max_kw} kW`;
    planMarkers.push(
      L.marker([stop.lat, stop.lon], { icon: planStopIcon(stop.arrive_soc), zIndexOffset: 200 })
        .addTo(leafletMap).bindPopup(popup)
    );
  }
}

function focusStop(stop) {
  if (!L || !leafletMap) return;
  leafletMap.setView([stop.lat, stop.lon], Math.max(leafletMap.getZoom(), 13));
  const marker = planMarkers[chargingPlan.value.stops.indexOf(stop)];
  marker?.openPopup();
}

// ── Ladestationen (Karten-Layer) ──
async function toggleChargers() {
  showChargers.value = !showChargers.value;
  if (showChargers.value && routeData.value) await _loadChargers();
  else { clearChargerMarkers(); chargers.value = []; }
}

async function _loadChargers() {
  if (!routeData.value || !L || !leafletMap) return;
  chargerLoading.value = true;
  const geo = routeData.value.geometry;
  const queryPoints = [geo[Math.floor(geo.length / 2)]];
  if (routeData.value.distance_km > 150) {
    queryPoints.push(geo[Math.floor(geo.length * 0.25)]);
    queryPoints.push(geo[Math.floor(geo.length * 0.75)]);
  }
  if (routeData.value.distance_km > 400) {
    queryPoints.push(geo[Math.floor(geo.length * 0.125)]);
    queryPoints.push(geo[Math.floor(geo.length * 0.875)]);
  }
  clearChargerMarkers(); chargers.value = [];
  const seen = new Set();
  try {
    await Promise.all(queryPoints.map(async ([lon, lat]) => {
      const radius = Math.min(40, routeData.value.distance_km * 0.25);
      const { data } = await api.get('/routing/chargers', { params: { lat, lon, radius_km: radius } });
      for (const s of data) {
        if (!seen.has(s.id)) { seen.add(s.id); chargers.value.push(s); }
      }
    }));
    updateChargerMarkers();
  } catch (err) { console.warn('[Chargers]', err.message); }
  finally { chargerLoading.value = false; }
}

function updateChargerMarkers() {
  clearChargerMarkers();
  if (!L || !leafletMap) return;
  for (const s of chargers.value) {
    const kw    = s.max_kw ?? 0;
    const label = s.max_kw ? `${s.max_kw} kW` : '';
    const popup = `<b>${s.name}</b>${label ? `<br>${label}` : ''}${s.operator ? `<br><small>${s.operator}</small>` : ''}`;
    chargerMarkers.push(L.marker([s.lat, s.lon], { icon: chargerIcon(kw) }).addTo(leafletMap).bindPopup(popup));
  }
}

// ── Blitzer ──
function cameraIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;background:#f97316;border:2px solid white;border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5);font-size:11px">📷</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11],
  });
}

function clearCameraMarkers() { cameraMarkers.forEach(m => m.remove()); cameraMarkers = []; }

async function toggleCameras() {
  showCameras.value = !showCameras.value;
  if (showCameras.value && routeData.value) await _loadCameras();
  else { clearCameraMarkers(); cameras.value = []; }
}

async function _loadCameras() {
  if (!routeData.value || !L || !leafletMap) return;
  cameraLoading.value = true;
  clearCameraMarkers(); cameras.value = [];
  // Bounding Box der Route berechnen
  const geo = routeData.value.geometry;
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [lon, lat] of geo) {
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
  }
  // 5km Puffer
  const pad = 0.05;
  try {
    const { data } = await api.get('/routing/cameras', {
      params: { south: (minLat - pad).toFixed(5), west: (minLon - pad).toFixed(5),
                north: (maxLat + pad).toFixed(5), east: (maxLon + pad).toFixed(5) },
    });
    cameras.value = data.cameras ?? [];
    if (L && leafletMap) {
      for (const cam of cameras.value) {
        const popup = `📷 Blitzer${cam.maxspeed ? ` · ${cam.maxspeed} km/h` : ''}${cam.direction ? ` · Richtung: ${cam.direction}` : ''}`;
        cameraMarkers.push(L.marker([cam.lat, cam.lon], { icon: cameraIcon() }).addTo(leafletMap).bindPopup(popup));
      }
    }
  } catch (err) { console.warn('[Cameras]', err.message); }
  finally { cameraLoading.value = false; }
}

// ── Fahrzeugstats ──
async function loadRoutingStats() {
  if (!vehicle.value) return;
  try {
    const { data } = await api.get('/routing/stats', { params: { vehicleId: vehicle.value.id } });
    routeStats.value = data;
  } catch { /* silent */ }
}

// ── Karte initialisieren ──
async function initMap() {
  if (leafletMap) return;
  const el = document.getElementById('route-map');
  if (!el) return;

  L = (await import('leaflet')).default;

  leafletMap = L.map('route-map').setView(
    vehicle.value?.last_lat && vehicle.value?.last_lon
      ? [vehicle.value.last_lat, vehicle.value.last_lon]
      : [51.1657, 10.4515],
    vehicle.value?.last_lat ? 12 : 6
  );

  // Backend-Tile-Proxy (vermeidet CSP + OSM-Rate-Limits im Browser)
  L.tileLayer('/api/tiles/{z}/{x}/{y}', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap);

  setTimeout(() => leafletMap?.invalidateSize(), 250);

  leafletMap.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    try {
      const name = await reverseGeocode(lat, lng);
      setDestination(name.split(',')[0], lat, lng);
    } catch {
      setDestination(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng);
    }
  });
}

// ── Gespeicherte Routen ──
async function loadSavedRoutes() {
  if (!vehicle.value) return;
  try {
    const { data } = await api.get('/saved-routes', { params: { vehicleId: vehicle.value.id } });
    savedRoutes.value = data;
  } catch { /* silent */ }
}

function loadRoute(route) {
  destination.value = { name: route.destination_name, lat: route.destination_lat, lon: route.destination_lon };
  waypoints.value   = route.waypoints ?? [];
  if (route.departure_time) { planDate.value = route.scheduled_date ?? ''; planTime.value = route.departure_time; }
  if (L && leafletMap) {
    if (destMarker) destMarker.remove();
    destMarker = L.marker([route.destination_lat, route.destination_lon], { icon: redIcon() })
      .addTo(leafletMap).bindPopup(route.destination_name).openPopup();
    leafletMap.setView([route.destination_lat, route.destination_lon], 12);
    updateWpMarkers();
  }
  chargingPlan.value = null;
  calculateRoute();
}

async function loadAndSend(route) { loadRoute(route); await nextTick(); await sendToTesla(); }

async function confirmSave() {
  if (!destination.value) return;
  saving.value = true;
  try {
    const payload = {
      vehicle_id:       vehicle.value.id,
      name:             (saveName.value.trim() || destination.value.name).substring(0, 80),
      destination_name: destination.value.name,
      destination_lat:  destination.value.lat,
      destination_lon:  destination.value.lon,
      start_name:       startLocation.value?.name ?? null,
      start_lat:        startLocation.value?.lat ?? null,
      start_lon:        startLocation.value?.lon ?? null,
      waypoints:        waypoints.value,
      scheduled_date:   saveScheduleDate.value || null,
      departure_time:   saveScheduleTime.value || null,
      auto_send:        saveAutoSend.value ? 1 : 0,
      notes:            saveNotes.value || null,
    };
    await api.post('/saved-routes', payload);
    showSaveDialog.value  = false;
    saveName.value        = '';
    saveScheduleDate.value = '';
    saveScheduleTime.value = '';
    saveAutoSend.value     = false;
    saveNotes.value        = '';
    await loadSavedRoutes();
    showToast(t('routes.saved'));

    if (saveWithReturn.value && startLocation.value) {
      saveWithReturn.value = false;
      showReturnDialog.value = true;
    }
  } catch { showToast(t('routes.saveError'), false); }
  finally { saving.value = false; }
}

async function confirmReturnTrip() {
  if (!destination.value || !startLocation.value) return;
  saving.value = true;
  try {
    await api.post('/saved-routes', {
      vehicle_id:       vehicle.value.id,
      name:             (returnName.value.trim() || `Rückfahrt: ${startLocation.value.name}`).substring(0, 80),
      destination_name: startLocation.value.name,
      destination_lat:  startLocation.value.lat,
      destination_lon:  startLocation.value.lon,
      start_name:       destination.value.name,
      start_lat:        destination.value.lat,
      start_lon:        destination.value.lon,
      waypoints:        [...waypoints.value].reverse(),
      scheduled_date:   returnDate.value || null,
      departure_time:   returnTime.value || null,
      auto_send:        returnAutoSend.value ? 1 : 0,
    });
    showReturnDialog.value = false;
    returnName.value = ''; returnDate.value = ''; returnTime.value = ''; returnAutoSend.value = false;
    await loadSavedRoutes();
    showToast(t('routes.returnAdded'));
  } catch { showToast(t('routes.saveError'), false); }
  finally { saving.value = false; }
}

function startEdit(route) { editingId.value = route.id; editName.value = route.name; }

async function confirmRename(route) {
  if (!editName.value.trim()) return;
  try {
    await api.put(`/saved-routes/${route.id}`, { name: editName.value.trim() });
    await loadSavedRoutes(); editingId.value = null;
  } catch { showToast(t('routes.saveError'), false); }
}

async function deleteRoute(id) {
  try { await api.delete(`/saved-routes/${id}`); await loadSavedRoutes(); }
  catch { showToast(t('routes.saveError'), false); }
}

// ── Tesla-Navigation ──
const LOCALE_TAG = { de:'de-DE', en:'en-US', fr:'fr-FR', es:'es-ES', tr:'tr-TR', el:'el-GR' };

async function sendToTesla() {
  if (!destination.value) return;
  busy.value = true;
  try {
    await api.post(`/commands/${vehicle.value.id}/navigation_request`, {
      type: 'share_ext_content_raw',
      locale: LOCALE_TAG[locale.value] || 'de-DE',
      timestamp_ms: Date.now(),
      value: { 'android.intent.extra.TEXT': destination.value.name },
    });
    showToast(t('routes.sentToTesla'));
  } catch (e) {
    const code = e.response?.data?.code;
    showToast(code === 'ASLEEP' ? t('routes.asleep') : t('routes.sendError'), false);
  } finally { busy.value = false; }
}

function openAbrp() {
  const abrpToken = vehicle.value?.abrp_token;
  let url = 'https://abetterrouteplanner.com/';
  const params = new URLSearchParams();
  if (abrpToken) params.set('token', abrpToken);
  if (destination.value) {
    params.set('destination_lat', destination.value.lat.toFixed(6));
    params.set('destination_lng', destination.value.lon.toFixed(6));
    params.set('destination_name', destination.value.name);
  }
  const qs = params.toString();
  if (qs) url += '?' + qs;
  window.open(url, '_blank', 'noopener');
}

// ── Lifecycle ──
watch(showSaveDialog, async (v) => {
  if (v) { await nextTick(); saveInput.value?.focus(); }
});

watch(() => vehicle.value?.id, async (id, oldId) => {
  if (id && id !== oldId) { await loadSavedRoutes(); await loadRoutingStats(); }
});

watch(vehicle, async (v) => {
  if (v && !leafletMap) { await nextTick(); await initMap(); await setStartVehicle(); }
}, { immediate: false });

onMounted(async () => {
  await loadSavedRoutes();
  await loadRoutingStats();
  if (vehicle.value) { await nextTick(); await initMap(); await setStartVehicle(); }
});

onBeforeUnmount(() => {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

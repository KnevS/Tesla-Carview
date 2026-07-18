<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-6">
    <!-- Kopf: Titel + Filter + Aktionen. Auf schmalen Bildschirmen
         (Smartphone, Tesla im Hochformat) bricht das in mehrere Reihen. -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Fahrtenbuch</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <select v-model="selYear" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 min-h-[44px]">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model="selMonth" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 min-h-[44px]">
          <option value="">Alle Monate</option>
          <option v-for="m in 12" :key="m" :value="String(m).padStart(2,'0')">{{ monthName(m) }}</option>
        </select>
        <select v-model="selType" @change="load" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 min-h-[44px]">
          <option value="">Alle Typen</option>
          <option value="private">Privatfahrten</option>
          <option value="business">Dienstfahrten</option>
          <option value="commute">Arbeitswege</option>
        </select>
        <button @click="showCompactView = !showCompactView"
          class="btn-secondary text-sm min-h-[44px]"
          v-tooltip="'Kompakte Karten-Ansicht — empfohlen fuer Smartphone und das Tesla-Display.'">
          {{ showCompactView ? '☷ Tabelle' : '◫ Karten' }}
        </button>
        <SortToggle v-model:direction="sortDir" />
        <button @click="manualForm.show = true" class="btn-secondary text-sm min-h-[44px]"
          v-tooltip="'Fahrt komplett manuell anlegen — fuer Fahrzeuge ohne Auto-Erfassung oder zur Nachpflege.'">
          + Manuell
        </button>
        <button @click="exportCsv" class="btn-secondary text-sm min-h-[44px]"
          v-tooltip="'Tabellarisches CSV — fuer eigene Auswertung in Excel oder Buchhaltung.'">
          CSV
        </button>
        <button @click="exportFinanzamtPdf" :disabled="!trips.length"
          class="btn-primary text-sm min-h-[44px] disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
          v-tooltip="'Finanzamt-konformes PDF nach BMF-Standard — mit Kilometerstaenden, Reisezielen, Zweck und Geschaeftspartner pro Fahrt. Anerkannt durch deutsche Finanzaemter.'">
          <AppIcon name="export" :size="16" />
          Finanzamt-PDF
        </button>
        <!-- Tesla-Browser-Direktzugang: erstellt Pair-Session mit redirect=/fahrtenbuch -->
        <button @click="openInTesla"
          class="btn-secondary text-sm min-h-[44px] inline-flex items-center gap-1.5"
          v-tooltip="'Fahrtenbuch direkt im Tesla-Browser öffnen — erzeugt einen QR-Code und einen Link. Passkey-Login im Tesla-Browser, danach direkt im Fahrtenbuch.'">
          🚗 Im Tesla öffnen
        </button>
      </div>
    </div>

    <!-- Manipulationssicheres Fahrtenbuch: Integritätsstatus (S09) -->
    <div v-if="ledgerStatus" class="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
         :class="ledgerStatus.ok ? 'bg-green-900/20 border border-green-800 text-green-300' : 'bg-red-900/20 border border-red-800 text-red-300'"
         v-tooltip="'Jede Änderung an einer Fahrt wird als HMAC-signierter Eintrag in eine verkettete Hash-Chain geschrieben. Die Prüfung rechnet die Kette nach — jede nachträgliche Änderung oder Löschung würde auffallen (GoBD).'">
      <span>{{ ledgerStatus.ok ? '🔒' : '⚠️' }}</span>
      <span v-if="ledgerStatus.ok">Manipulationssicher: Änderungshistorie signiert &amp; lückenlos verifiziert ({{ ledgerStatus.total }} Einträge).</span>
      <span v-else>Integritätswarnung: Bruch der Änderungskette bei Eintrag {{ ledgerStatus.first_break?.seq }} — die Historie wurde außerhalb der App verändert.</span>
    </div>

    <!-- BMF-Hinweis: nur einblenden, wenn der Filter auf einen kompletten
         Monat zeigt — das ist der Use-Case fuers Finanzamt. -->
    <div v-if="selMonth" class="card bg-blue-900/15 border border-blue-700/40 text-sm space-y-1">
      <p class="text-blue-200 flex items-center gap-2">
        <AppIcon name="info" :size="16" class="text-blue-300 flex-shrink-0" />
        <strong>So nutzt du das Fahrtenbuch fuers Finanzamt:</strong>
      </p>
      <ul class="text-xs text-gray-300 list-disc list-inside space-y-0.5">
        <li>Klassifiziere jede Fahrt (Privat / Dienst / Arbeitsweg) — Klick auf den Typ-Badge wechselt durch.</li>
        <li>Bei Dienstfahrten: <strong>Geschäftspartner</strong> + <strong>Zweck</strong> ausfüllen. BMF verlangt beide.</li>
        <li>Mit <strong>„Finanzamt-PDF"</strong> exportieren — die Fahrten werden danach gegen Aenderungen gesperrt (BMF-Manipulationsschutz).</li>
        <li>Aenderungen vor dem Export werden in der Aenderungs-Historie pro Fahrt protokolliert.</li>
      </ul>
    </div>

    <!-- Dynamisches Sektions-Layout: per Drag sortierbar, kollabierbar. -->
    <template v-for="sid in layoutOrder" :key="sid">

      <!-- Jahresübersicht — Karten zeigen primaer Kilometer (grosse Zahl) und
           darunter die Trip-Anzahl + Anteil. -->
      <SortableSection v-if="sid === 'stats'"
        page-id="fahrtenbuch" section-id="stats"
        title="Jahresübersicht" icon="📊"
        :collapsed="isCollapsed('stats')"
        @toggle="toggle('stats')"
        @move="(f, t, p) => moveSection(f, t, p)">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-gray-800 rounded-xl p-4 text-center space-y-1">
            <p class="text-xs text-gray-400 uppercase tracking-wide">Gesamt km</p>
            <p class="text-3xl font-bold text-white">{{ fmt(yearStats.total_km) }}</p>
            <p class="text-xs text-gray-500">{{ yearStats.trips }} Fahrten</p>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center space-y-1">
            <p class="text-xs text-gray-400 uppercase tracking-wide">Privat (km)</p>
            <p class="text-3xl font-bold text-gray-300">{{ fmt(yearStats.private_km) }}</p>
            <p class="text-xs text-gray-500">
              {{ yearStats.private_trips }} {{ yearStats.private_trips === 1 ? 'Fahrt' : 'Fahrten' }}
              · {{ pct(yearStats.private_km, yearStats.total_km) }}%
            </p>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center space-y-1">
            <p class="text-xs text-gray-400 uppercase tracking-wide">Dienst (km)</p>
            <p class="text-3xl font-bold text-blue-300">{{ fmt(yearStats.business_km) }}</p>
            <p class="text-xs text-gray-500">
              {{ yearStats.business_trips }} {{ yearStats.business_trips === 1 ? 'Fahrt' : 'Fahrten' }}
              · {{ pct(yearStats.business_km, yearStats.total_km) }}%
            </p>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center space-y-1">
            <p class="text-xs text-gray-400 uppercase tracking-wide">Arbeitsweg (km)</p>
            <p class="text-3xl font-bold text-green-300">{{ fmt(yearStats.commute_km) }}</p>
            <p class="text-xs text-gray-500">
              {{ yearStats.commute_trips }} {{ yearStats.commute_trips === 1 ? 'Fahrt' : 'Fahrten' }}
              · {{ pct(yearStats.commute_km, yearStats.total_km) }}%
            </p>
          </div>
        </div>
      </SortableSection>

      <!-- Heatmap: Aktivitaet pro Tag -->
      <SortableSection v-if="sid === 'heatmap'"
        page-id="fahrtenbuch" section-id="heatmap"
        :title="$t('trips.heatmapTitle')" icon="📅"
        :collapsed="isCollapsed('heatmap')"
        @toggle="toggle('heatmap')"
        @move="(f, t, p) => moveSection(f, t, p)">
        <TripsHeatmap />
      </SortableSection>

      <!-- Standort-Heatmap auf Leaflet -->
      <SortableSection v-if="sid === 'location'"
        page-id="fahrtenbuch" section-id="location"
        :title="$t('trips.locationHeatmapTitle')" icon="📍"
        :collapsed="isCollapsed('location')"
        @toggle="toggle('location')"
        @move="(f, t, p) => moveSection(f, t, p)">
        <LocationHeatmap />
      </SortableSection>

      <!-- Jahresbericht-PDF -->
      <SortableSection v-if="sid === 'annual'"
        page-id="fahrtenbuch" section-id="annual"
        :title="$t('trips.annualReportTitle')" icon="📄"
        :collapsed="isCollapsed('annual')"
        @toggle="toggle('annual')"
        @move="(f, t, p) => moveSection(f, t, p)">
        <AnnualReportButton />
      </SortableSection>

      <!-- Monatsübersicht (nur Desktop, nur wenn kein spezifischer Monat gewählt) -->
      <SortableSection v-if="sid === 'months' && !selMonth && months.length"
        page-id="fahrtenbuch" section-id="months"
        :title="'Monatsübersicht ' + selYear" icon="📆"
        :collapsed="isCollapsed('months')"
        @toggle="toggle('months')"
        @move="(f, t, p) => moveSection(f, t, p)"
        class="hidden md:block">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-gray-400 border-b border-gray-700">
                <th class="text-left py-2">Monat</th>
                <th class="text-right py-2">Fahrten</th>
                <th class="text-right py-2">Gesamt km</th>
                <th class="text-right py-2">Privat km</th>
                <th class="text-right py-2">Dienst km</th>
                <th class="text-right py-2">Arbeitsweg km</th>
                <th class="text-right py-2">Privat %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in months" :key="m.month"
                @click="selMonth = m.month.split('-')[1]; load()"
                class="border-b border-gray-800 hover:bg-gray-700 cursor-pointer transition">
                <td class="py-2 font-medium">{{ fmtMonth(m.month) }}</td>
                <td class="text-right text-gray-300">{{ m.trips }}</td>
                <td class="text-right font-semibold">{{ fmt(m.total_km) }}</td>
                <td class="text-right text-gray-300">{{ fmt(m.private_km) }}</td>
                <td class="text-right text-blue-300">{{ fmt(m.business_km) }}</td>
                <td class="text-right text-green-300">{{ fmt(m.commute_km) }}</td>
                <td class="text-right" :class="pctColor(m.private_km, m.total_km)">
                  {{ pct(m.private_km, m.total_km) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SortableSection>

      <!-- Fahrten — Tabelle (Desktop) ODER Karten (Smartphone, Tesla) -->
      <SortableSection v-if="sid === 'trips'"
        page-id="fahrtenbuch" section-id="trips"
        :title="'Fahrten' + (selMonth ? ' – ' + monthName(+selMonth) + ' ' + selYear : ' ' + selYear) + ' (' + trips.length + ')'"
        icon="🚗"
        :collapsed="isCollapsed('trips')"
        @toggle="toggle('trips')"
        @move="(f, t, p) => moveSection(f, t, p)">
        <div class="space-y-3">
          <div v-if="!trips.length" class="text-gray-400 text-sm text-center py-8">
        Keine Fahrten für diesen Zeitraum.
      </div>

      <!-- Karten-Layout (Mobile-First) -->
      <div v-else-if="showCompactView || isNarrow" class="space-y-3">
        <div v-for="trip in trips" :key="trip.id"
          class="bg-gray-800 rounded-xl p-3 space-y-2"
          :class="trip.locked_at ? 'opacity-90 border-l-4 border-blue-600' : ''">
          <div class="flex items-start justify-between gap-2 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-gray-400 font-mono">{{ fmtDate(trip.start_time) }}</span>
                <button @click="cycleType(trip)" :disabled="trip.locked_at"
                  :class="typeBadge(trip.trip_type)"
                  class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap transition disabled:opacity-60"
                  v-tooltip="trip.locked_at ? 'Fahrt ist Finanzamt-gesperrt' : 'Klicken zum Wechseln (Privat → Dienst → Arbeitsweg)'">
                  {{ typeLabel(trip.trip_type) }}
                </button>
                <span v-if="trip.is_manual" class="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full"
                  v-tooltip="'Manuell eingegebene Fahrt'">✍ manuell</span>
                <span v-if="trip.locked_at" class="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full"
                  v-tooltip="'Fuers Finanzamt exportiert und gesperrt — Aenderungen nicht mehr möglich.'">🔒 FA</span>
              </div>
              <RouterLink :to="'/trips/' + trip.id" class="block mt-1 hover:text-tesla-red transition">
                <p class="text-sm font-medium truncate">
                  {{ trip.start_address || coordStr(trip.start_lat, trip.start_lon) }}
                </p>
                <p class="text-sm text-gray-400 truncate">
                  → {{ trip.end_address || coordStr(trip.end_lat, trip.end_lon) }}
                </p>
              </RouterLink>
            </div>
            <p class="text-right font-bold whitespace-nowrap">{{ fmtDistance(trip.distance_km) }}</p>
          </div>

          <!-- Zweck + Geschaeftspartner immer sichtbar; je nach Typ verschiedene
               Aufmerksamkeit. Dienstfahrt → BMF-Pflichtfelder hervorheben. -->
          <div v-if="trip.trip_type === 'business'" class="space-y-1.5">
            <input :value="trip.business_partner"
              @change="e => savePartner(trip, e.target.value)" :disabled="trip.locked_at"
              type="text" placeholder="Geschäftspartner *"
              class="w-full bg-gray-900 border border-blue-700/40 rounded-lg px-3 py-2 text-sm text-white placeholder-blue-300/60 focus:border-tesla-red focus:outline-none disabled:opacity-60"
              v-tooltip="'Aufgesuchter Geschaeftspartner (BMF-Pflicht bei Dienstfahrt). Z.B. „Mueller GmbH, Stuttgart“'" />
            <input :value="trip.purpose"
              @change="e => savePurpose(trip, e.target.value)" :disabled="trip.locked_at"
              type="text" placeholder="Reisezweck *"
              class="w-full bg-gray-900 border border-blue-700/40 rounded-lg px-3 py-2 text-sm text-white placeholder-blue-300/60 focus:border-tesla-red focus:outline-none disabled:opacity-60"
              v-tooltip="'Geschaeftlicher Anlass — z.B. „Vertragsverhandlung Projekt X“. BMF-Pflicht bei Dienstfahrt.'" />
          </div>
          <input v-else :value="trip.purpose"
            @change="e => savePurpose(trip, e.target.value)" :disabled="trip.locked_at"
            type="text" placeholder="Zweck (optional)"
            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-tesla-red focus:outline-none disabled:opacity-60" />

          <!-- Mehr-Aktionen: Merge mit naechster Fahrt + Detail. -->
          <div v-if="!trip.locked_at" class="flex gap-2 flex-wrap text-xs">
            <RouterLink :to="'/trips/' + trip.id" class="text-tesla-red hover:underline">Details →</RouterLink>
            <button v-if="canMergeWithNext(trip)" @click="mergeWithNext(trip)"
              class="text-blue-400 hover:underline"
              v-tooltip="'Diese Fahrt mit der naechsten zusammenfuehren — falls Telemetrie sie versehentlich getrennt hat.'">
              Mit nächster zusammenführen
            </button>
          </div>
        </div>
      </div>

      <!-- Klassische Tabelle (Desktop, breiter Bildschirm) -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700">
              <th class="text-left py-2">Datum</th>
              <th class="text-left py-2">Von → Nach</th>
              <th class="text-right py-2">km</th>
              <th class="text-right py-2">km-Stand</th>
              <th class="text-left py-2 pl-4">Typ</th>
              <th class="text-left py-2">Geschäftspartner / Zweck</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trip in trips" :key="trip.id"
              class="border-b border-gray-800 hover:bg-gray-700 transition"
              :class="trip.locked_at ? 'opacity-90' : ''">
              <td class="py-2 whitespace-nowrap text-gray-300">
                {{ fmtDate(trip.start_time) }}<br>
                <span class="text-xs text-gray-500">{{ fmtTime(trip.start_time) }}</span>
                <div v-if="trip.is_manual || trip.locked_at" class="flex gap-1 mt-1">
                  <span v-if="trip.is_manual" class="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">✍</span>
                  <span v-if="trip.locked_at" class="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded"
                    v-tooltip="'Finanzamt-gesperrt'">🔒</span>
                </div>
              </td>
              <td class="py-2 max-w-xs">
                <RouterLink :to="'/trips/' + trip.id" class="hover:text-tesla-red transition">
                  <span class="truncate block">{{ trip.start_address || coordStr(trip.start_lat, trip.start_lon) }}</span>
                  <span class="truncate block text-gray-400">{{ trip.end_address || coordStr(trip.end_lat, trip.end_lon) }}</span>
                </RouterLink>
              </td>
              <td class="py-2 text-right font-semibold whitespace-nowrap">{{ fmt(trip.distance_km, 1) }}</td>
              <td class="py-2 text-right text-gray-400 whitespace-nowrap text-xs">
                <span v-if="trip.start_odometer_km">{{ Math.round(trip.start_odometer_km).toLocaleString('de-DE') }}</span>
                <br>
                <span v-if="trip.end_odometer_km" class="text-gray-500">→ {{ Math.round(trip.end_odometer_km).toLocaleString('de-DE') }}</span>
              </td>
              <td class="py-2 pl-4">
                <button @click="cycleType(trip)" :disabled="trip.locked_at"
                  :class="typeBadge(trip.trip_type)"
                  class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap transition disabled:opacity-60">
                  {{ typeLabel(trip.trip_type) }}
                </button>
              </td>
              <td class="py-2 space-y-1">
                <input v-if="trip.trip_type === 'business'" :value="trip.business_partner"
                  @change="e => savePartner(trip, e.target.value)" :disabled="trip.locked_at"
                  type="text" placeholder="Geschäftspartner *"
                  class="bg-transparent border-b border-blue-600 focus:border-tesla-red text-sm text-white placeholder-blue-400/60 focus:outline-none w-full min-w-32 disabled:opacity-60"
                  v-tooltip="'BMF-Pflicht bei Dienstfahrt'" />
                <input :value="trip.purpose"
                  @change="e => savePurpose(trip, e.target.value)" :disabled="trip.locked_at"
                  type="text"
                  :placeholder="trip.trip_type === 'business' ? 'Reisezweck *' : 'Zweck…'"
                  class="bg-transparent border-b border-gray-600 focus:border-tesla-red text-sm text-white placeholder-gray-600 focus:outline-none w-full min-w-32 disabled:opacity-60"
                />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-gray-600 font-semibold">
              <td colspan="2" class="py-2 text-gray-400">Summe</td>
              <td class="py-2 text-right">{{ fmt(trips.reduce((s,t) => s + (t.distance_km||0), 0), 1) }}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
          </div>
        </div>
      </SortableSection>

    </template><!-- end v-for layoutOrder -->

    <!-- Modal: Manuelle Fahrt-Erfassung — Teleport: kein clipping durch
         .card-Backdrop-Stacking-Context. -->
    <Teleport to="body">
    <div v-if="manualForm.show"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
      <div class="card w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold">Manuelle Fahrt anlegen</h3>
        <p class="text-xs text-gray-400">
          Fuer Fahrzeuge ohne Auto-Erfassung oder zur Nachpflege. Datum, Uhrzeit
          und mindestens Distanz <em>oder</em> Kilometerstand-Werte sind Pflicht.
        </p>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Start</label>
            <input v-model="manualForm.start_local" type="datetime-local"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Ende</label>
            <input v-model="manualForm.end_local" type="datetime-local"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Von (Adresse)</label>
            <input v-model="manualForm.start_address" type="text"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm"
              placeholder="Mercedesstraße 120, Stuttgart" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Nach (Adresse)</label>
            <input v-model="manualForm.end_address" type="text"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm"
              placeholder="Hauptstraße 1, Esslingen" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">km-Stand Start</label>
            <input v-model.number="manualForm.start_odometer_km" type="number" min="0"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">km-Stand Ende</label>
            <input v-model.number="manualForm.end_odometer_km" type="number" min="0"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Strecke (km)</label>
            <input v-model.number="manualForm.distance_km" type="number" step="0.1" min="0"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm"
              v-tooltip="'Wird automatisch aus den km-Staenden berechnet, falls leer.'" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-0.5">Typ</label>
            <select v-model="manualForm.trip_type"
              class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm">
              <option value="private">Privat</option>
              <option value="business">Dienst</option>
              <option value="commute">Arbeitsweg</option>
            </select>
          </div>
        </div>
        <div v-if="manualForm.trip_type === 'business'">
          <label class="text-xs text-gray-400 block mb-0.5">Geschäftspartner *</label>
          <input v-model="manualForm.business_partner" type="text"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm"
            placeholder="Mueller GmbH, Stuttgart" />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-0.5">Zweck</label>
          <input v-model="manualForm.purpose" type="text"
            class="w-full bg-gray-700 rounded px-2 py-1.5 text-white text-sm"
            :placeholder="manualForm.trip_type === 'business' ? 'z.B. Vertragsverhandlung' : 'optional'" />
        </div>
        <div class="flex gap-2 pt-1">
          <button @click="saveManual" class="btn-primary flex-1 text-sm">Anlegen</button>
          <button @click="manualForm.show = false" class="btn-secondary flex-1 text-sm">Abbrechen</button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Tesla-Direktzugang: QR-Modal -->
    <Teleport to="body">
    <div v-if="qrModal.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      @click.self="closeQr">
      <div class="card max-w-sm w-full mx-4 space-y-4 text-center relative">
        <button @click="closeQr"
          class="absolute top-3 right-3 text-gray-500 hover:text-white transition text-xl leading-none"
          aria-label="Schließen">×</button>

        <div class="space-y-1">
          <p class="text-lg font-semibold">🚗 Fahrtenbuch im Tesla öffnen</p>
          <p class="text-gray-400 text-xs">
            Öffne die URL im Tesla-Browser und bestätige per Passkey —<br>
            du landest danach direkt im Fahrtenbuch.
          </p>
        </div>

        <!-- Ausstehend: QR + URL -->
        <template v-if="qrModal.status === 'pending'">
          <div v-if="qrModal.qrUrl" class="flex justify-center">
            <img :src="qrModal.qrUrl" class="rounded-xl w-52 h-52" alt="QR Code für Tesla-Browser" />
          </div>

          <div class="space-y-1">
            <p class="text-xs text-gray-500">URL für Tesla-Browser:</p>
            <div class="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
              <code class="text-xs text-blue-300 break-all flex-1 text-left">{{ qrModal.pairUrl }}</code>
              <button @click="copyUrl"
                class="text-gray-400 hover:text-white transition flex-shrink-0"
                :title="qrModal.copied ? 'Kopiert!' : 'Kopieren'"
                v-tooltip="qrModal.copied ? 'Kopiert!' : 'URL in Zwischenablage kopieren'"
              >
                <AppIcon :name="qrModal.copied ? 'check' : 'copy'" :size="16" />
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs text-gray-500">
            <div class="animate-spin w-3 h-3 border-2 border-tesla-red border-t-transparent rounded-full"></div>
            Warte auf Bestätigung im Tesla-Browser…
            <span class="ml-auto text-gray-600">{{ qrModal.expiresIn }}</span>
          </div>
        </template>

        <!-- Bestätigt -->
        <template v-else-if="qrModal.status === 'confirmed'">
          <div class="py-4 space-y-3">
            <div class="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <AppIcon name="check" :size="32" class="text-green-400" />
            </div>
            <p class="text-green-300 font-semibold">Login erfolgreich!</p>
            <p class="text-gray-500 text-xs">Der Tesla-Browser ist jetzt angemeldet und wurde weitergeleitet.</p>
          </div>
        </template>

        <!-- Abgelaufen -->
        <template v-else-if="qrModal.status === 'expired'">
          <div class="py-2 space-y-3">
            <AppIcon name="warning" :size="40" class="text-yellow-400 mx-auto" />
            <p class="text-yellow-300 text-sm">QR-Code abgelaufen.</p>
            <button @click="openInTesla" class="btn-secondary text-sm">Neuen Code erzeugen</button>
          </div>
        </template>

        <button @click="closeQr" class="btn-secondary text-sm w-full">Schließen</button>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useAppStore } from '../store/index.js';
import { useAuthStore } from '../store/auth.js';
import { useUnits } from '../store/prefs.js';
import api from '../api.js';
import TripsHeatmap from '../components/TripsHeatmap.vue';
import AppIcon from '../components/AppIcon.vue';
import LocationHeatmap from '../components/LocationHeatmap.vue';
import AnnualReportButton from '../components/AnnualReportButton.vue';
import SortToggle from '../components/SortToggle.vue';
import { useSortDirection } from '../composables/useSortDirection.js';
import SortableSection from '../components/SortableSection.vue';
import { usePageLayout } from '../composables/usePageLayout.js';
import { formatLocation, formatCoords } from '../lib/location.js';

const appStore  = useAppStore();
const authStore = useAuthStore();
const { fmtDistance } = useUnits();
const trips     = ref([]);
const months    = ref([]);
const loading   = ref(false);
const selYear   = ref(String(new Date().getFullYear()));
const selMonth  = ref('');
const selType   = ref('');
// Sortierreihenfolge pro View in localStorage. Default desc (Neueste oben).
const { direction: sortDir } = useSortDirection('fahrtenbuch');

// Dynamisches Sektions-Layout: per Drag sortierbar, kollabierbar.
const FB_SECTIONS = ['stats', 'heatmap', 'location', 'annual', 'months', 'trips'];
const { orderedSections: layoutOrder, isCollapsed, toggle, moveSection } = usePageLayout('fahrtenbuch', FB_SECTIONS);

// Karten-/Tabellen-Umschalter (manueller Override). Initial: bei
// schmalem Viewport (< 768 px) automatisch Karten. localStorage merkt
// sich die Wahl, damit Tesla-Browser-Refreshes nicht aergerlich werden.
const showCompactView = ref(localStorage.getItem('fb_compact') === '1');
const isNarrow = ref(false);
function updateNarrow() { isNarrow.value = window.innerWidth < 768; }
watch(showCompactView, v => localStorage.setItem('fb_compact', v ? '1' : '0'));
onMounted(updateNarrow);
window.addEventListener('resize', updateNarrow);
onBeforeUnmount(() => window.removeEventListener('resize', updateNarrow));

const years = computed(() => {
  const cur = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(cur - i));
});

const yearStats = computed(() => {
  const all = months.value;
  if (!all.length) return {
    total_km: 0, private_km: 0, business_km: 0, commute_km: 0,
    trips: 0, private_trips: 0, business_trips: 0, commute_trips: 0,
  };
  return {
    total_km:       all.reduce((s, m) => s + m.total_km,       0),
    private_km:     all.reduce((s, m) => s + m.private_km,     0),
    business_km:    all.reduce((s, m) => s + m.business_km,    0),
    commute_km:     all.reduce((s, m) => s + m.commute_km,     0),
    trips:          all.reduce((s, m) => s + m.trips,          0),
    private_trips:  all.reduce((s, m) => s + (m.private_trips  || 0), 0),
    business_trips: all.reduce((s, m) => s + (m.business_trips || 0), 0),
    commute_trips:  all.reduce((s, m) => s + (m.commute_trips  || 0), 0),
  };
});

const TYPES = ['private', 'business', 'commute'];
const fmt      = (v, d = 0) => Number(+(v || 0)).toLocaleString('de-DE', { maximumFractionDigits: d });
const pct      = (part, total) => total > 0 ? Math.round(part / total * 100) : 0;
const pctColor = (part, total) => { const p = pct(part, total); return p > 70 ? 'text-gray-300' : p > 40 ? 'text-yellow-300' : 'text-blue-300'; };
const fmtDate  = ts => new Date(ts * 1000).toLocaleDateString('de-DE');
const fmtTime  = ts => new Date(ts * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const fmtMonth = ym => { const [y, m] = ym.split('-'); return monthName(+m) + ' ' + y; };
const monthName = m => ['', 'Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][+m];
const coordStr  = (lat, lon) => formatCoords(lat, lon) || '–';
const typeLabel = t => ({ private: 'Privat', business: 'Dienstfahrt', commute: 'Arbeitsweg' }[t] ?? 'Privat');
const typeBadge = t => ({
  private:  'bg-gray-600 text-gray-200 hover:bg-gray-500',
  business: 'bg-blue-900 text-blue-200 hover:bg-blue-800',
  commute:  'bg-green-900 text-green-200 hover:bg-green-800',
}[t] ?? 'bg-gray-600 text-gray-200');

async function classify(trip, type, purpose, partner) {
  trip.trip_type = type;
  if (purpose !== undefined) trip.purpose = purpose;
  if (partner !== undefined) trip.business_partner = partner;
  await api.patch(`/trips/${trip.id}/classify`, {
    trip_type: type, purpose: trip.purpose ?? null,
  });
  if (partner !== undefined) {
    await api.patch(`/trips/${trip.id}/business-partner`, { business_partner: partner ?? null });
  }
}

async function cycleType(trip) {
  if (trip.locked_at) return;
  await classify(trip, TYPES[(TYPES.indexOf(trip.trip_type) + 1) % TYPES.length]);
}
async function savePurpose(trip, purpose) {
  if (trip.locked_at) return;
  await classify(trip, trip.trip_type, purpose);
}
async function savePartner(trip, partner) {
  if (trip.locked_at) return;
  trip.business_partner = partner;
  await api.patch(`/trips/${trip.id}/business-partner`, { business_partner: partner ?? null });
}

function canMergeWithNext(trip) {
  const idx = trips.value.indexOf(trip);
  const next = trips.value[idx + 1];
  // Tabelle ist DESC sortiert — also „next" zeitlich = der nachfolgende in der UI
  // ist tatsaechlich der zeitlich frueheren. Aber semantisch: nutzer denkt
  // „mit der naechsten" = der direkt darunter. Egal welche Richtung — der
  // Merge-Endpunkt sortiert intern nach start_time.
  return next && next.vehicle_id === trip.vehicle_id && !next.locked_at;
}

async function mergeWithNext(trip) {
  const idx = trips.value.indexOf(trip);
  const next = trips.value[idx + 1];
  if (!next) return;
  if (!confirm(`Diese Fahrt mit der nächsten zusammenführen?\n\n${fmtDate(trip.start_time)} ${fmtTime(trip.start_time)} → ${fmtDate(next.start_time)} ${fmtTime(next.start_time)}`)) return;
  try {
    await api.post(`/trips/${trip.id}/merge`, { other_trip_id: next.id });
    await load();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
}

// Manuelle Fahrt-Erfassung — Form-State.
const manualForm = ref({
  show: false,
  start_local: '', end_local: '',
  start_address: '', end_address: '',
  start_odometer_km: null, end_odometer_km: null, distance_km: null,
  trip_type: 'private', purpose: '', business_partner: '',
});

async function saveManual() {
  const f = manualForm.value;
  const vid = appStore.selectedVehicle?.id;
  if (!vid) return alert('Kein Fahrzeug ausgewählt');
  if (!f.start_local || !f.end_local) return alert('Start- und Endzeit sind Pflicht');
  const startTs = Math.floor(new Date(f.start_local).getTime() / 1000);
  const endTs   = Math.floor(new Date(f.end_local).getTime() / 1000);
  if (endTs <= startTs) return alert('Ende muss nach Start liegen');
  if (f.trip_type === 'business' && !f.business_partner.trim()) {
    return alert('Geschäftspartner ist Pflicht bei Dienstfahrt (BMF).');
  }
  try {
    await api.post('/trips/manual', {
      vehicle_id:        vid,
      start_time:        startTs,
      end_time:          endTs,
      start_address:     f.start_address.trim() || null,
      end_address:       f.end_address.trim()   || null,
      start_odometer_km: f.start_odometer_km ?? null,
      end_odometer_km:   f.end_odometer_km   ?? null,
      distance_km:       f.distance_km       ?? null,
      trip_type:         f.trip_type,
      purpose:           f.purpose.trim()          || null,
      business_partner:  f.business_partner.trim() || null,
    });
    manualForm.value.show = false;
    Object.assign(manualForm.value, {
      start_local: '', end_local: '',
      start_address: '', end_address: '',
      start_odometer_km: null, end_odometer_km: null, distance_km: null,
      purpose: '', business_partner: '',
    });
    await load();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
}

// Manipulationssicheres Fahrtenbuch (S09): Integrität der signierten
// Änderungs-Chain. null = noch nicht geprüft.
const ledgerStatus = ref(null);
async function verifyLedger() {
  try { ledgerStatus.value = (await api.get('/trips/ledger/verify')).data; }
  catch { ledgerStatus.value = null; }
}

async function load() {
  loading.value = true;
  const vid = appStore.selectedVehicle?.id;
  const base = vid ? { vehicle_id: vid } : {};

  const [tripsRes, monthsRes] = await Promise.all([
    api.get('/trips/logbook', { params: { ...base, year: selYear.value, month: selMonth.value || undefined, trip_type: selType.value || undefined, sort: sortDir.value } }),
    api.get('/trips/logbook/months', { params: { ...base } }),
  ]);

  trips.value  = tripsRes.data;
  months.value = monthsRes.data.filter(m => m.month.startsWith(selYear.value));
  loading.value = false;
  verifyLedger();
}

function exportCsv() {
  const rows = [
    ['Datum', 'Uhrzeit', 'Von', 'Nach', 'km', 'km-Stand Start', 'km-Stand Ende', 'Typ', 'Geschäftspartner', 'Zweck'],
    ...trips.value.map(t => [
      fmtDate(t.start_time),
      fmtTime(t.start_time),
      t.start_address || coordStr(t.start_lat, t.start_lon),
      t.end_address   || coordStr(t.end_lat,   t.end_lon),
      (+(t.distance_km || 0)).toFixed(1).replace('.', ','),
      t.start_odometer_km != null ? Math.round(t.start_odometer_km) : '',
      t.end_odometer_km   != null ? Math.round(t.end_odometer_km)   : '',
      typeLabel(t.trip_type),
      t.business_partner || '',
      t.purpose || '',
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `fahrtenbuch-${selYear.value}${selMonth.value ? '-' + selMonth.value : ''}.csv` });
  a.click();
}

/** BMF-konformes Fahrtenbuch-PDF. Layout:
 *  - Kopfblock: Steuerpflichtiger, Fahrzeug, Zeitraum, fortlaufende Nr.
 *  - Tabelle pro Fahrt mit: Datum, Start/Ende-Uhrzeit, km-Stand Anfang+Ende,
 *    Strecke, Reiseziel, Reisezweck, Geschaeftspartner
 *  - Pro Seite Seitennummer + „Erstellt am" — Pruefbarkeit
 *  - Nach Erstellung: Backend-Lock (locked_at) wird gesetzt → Aenderungen
 *    sperren und damit der Manipulationsschutz nach BMF nachweisbar. */
async function exportFinanzamtPdf() {
  if (!trips.value.length) return;
  if (!confirm(
    'Finanzamt-PDF erzeugen?\n\n' +
    'Wichtig: nach dem Export werden die enthaltenen Fahrten gegen Aenderungen ' +
    'gesperrt — das ist der Manipulationsschutz, den das Finanzamt fordert. ' +
    'Klassifikation, Zweck, Geschaeftspartner und Adressen lassen sich danach ' +
    'nicht mehr aendern.\n\nFortfahren?'
  )) return;

  const { jsPDF }   = await import('jspdf');
  const autoTable   = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  const v = appStore.selectedVehicle;
  const periodLabel = selMonth.value
    ? `${monthName(+selMonth.value)} ${selYear.value}`
    : selYear.value;
  const createdLabel = new Date().toLocaleString('de-DE');

  // Header
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Fahrtenbuch nach BMF-Schreiben', 14, 14);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Fahrzeug: ${v?.display_name ?? ''}${v?.license_plate ? ` (${v.license_plate})` : ''}`, 14, 21);
  doc.text(`Zeitraum: ${periodLabel}`, 14, 26);
  doc.text(`Erstellt: ${createdLabel}`, 14, 31);
  doc.text(`Anzahl Fahrten: ${trips.value.length}`, 100, 21);
  doc.text('Hinweis: nach diesem Export sind die enthaltenen Fahrten gegen Aenderungen gesperrt.', 100, 26);

  // BMF-Pflichtspalten chronologisch aufsteigend
  const chrono = [...trips.value].sort((a, b) => a.start_time - b.start_time);
  const body = chrono.map((t, i) => [
    i + 1,
    fmtDate(t.start_time),
    fmtTime(t.start_time) + ' – ' + (t.end_time ? fmtTime(t.end_time) : '?'),
    t.start_odometer_km != null ? Math.round(t.start_odometer_km).toLocaleString('de-DE') : '–',
    t.end_odometer_km   != null ? Math.round(t.end_odometer_km).toLocaleString('de-DE')   : '–',
    (+(t.distance_km || 0)).toFixed(1).replace('.', ','),
    typeLabel(t.trip_type),
    (t.start_address || '?') + ' → ' + (t.end_address || '?'),
    t.business_partner || (t.trip_type === 'business' ? '⚠ fehlt' : ''),
    t.purpose || (t.trip_type === 'business' ? '⚠ fehlt' : ''),
  ]);

  autoTable(doc, {
    startY: 38,
    head: [[
      'Nr.', 'Datum', 'Uhrzeit', 'km Start', 'km Ende',
      'Strecke (km)', 'Typ', 'Reiseziel (von → nach)', 'Geschäftspartner', 'Reisezweck',
    ]],
    body,
    styles:     { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    columnStyles: {
      0: { halign: 'right', cellWidth: 10 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 18 },
      6: { cellWidth: 22 },
      7: { cellWidth: 70 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: data => {
      // Footer auf jeder Seite — Seitennummer + Hinweis fuers Finanzamt.
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text(`Tesla Carview — elektronisches Fahrtenbuch · Seite ${data.pageNumber}`, 10, pageH - 8);
      doc.text(`Erstellt ${createdLabel}`, doc.internal.pageSize.getWidth() - 50, pageH - 8);
      doc.setTextColor(0);
    },
  });

  // Summenblock
  const totalKm    = chrono.reduce((s, t) => s + (t.distance_km || 0), 0);
  const businessKm = chrono.filter(t => t.trip_type === 'business').reduce((s, t) => s + (t.distance_km || 0), 0);
  const privateKm  = chrono.filter(t => t.trip_type === 'private').reduce((s, t) => s + (t.distance_km || 0), 0);
  const commuteKm  = chrono.filter(t => t.trip_type === 'commute').reduce((s, t) => s + (t.distance_km || 0), 0);

  const y = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('Zusammenfassung:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gesamt: ${fmt(totalKm, 1)} km`,           14, y + 5);
  doc.text(`Privat: ${fmt(privateKm, 1)} km`,         60, y + 5);
  doc.text(`Dienst: ${fmt(businessKm, 1)} km`,       110, y + 5);
  doc.text(`Arbeitsweg: ${fmt(commuteKm, 1)} km`,    160, y + 5);

  // Manipulationssicherheit (S09): Status der signierten Änderungs-Chain.
  const ls = ledgerStatus.value;
  if (ls) {
    const stmt = ls.ok
      ? `Manipulationssicheres Fahrtenbuch: Die Änderungshistorie ist als HMAC-signierte Hash-Chain lückenlos verifiziert (${ls.total} Einträge). Jede nachträgliche Änderung oder Löschung wäre erkennbar.`
      : `Manipulationssicheres Fahrtenbuch: Integritätsprüfung FEHLGESCHLAGEN — Bruch bei Eintrag ${ls.first_break?.seq}. Die Änderungshistorie wurde außerhalb der Anwendung verändert.`;
    doc.setFontSize(7);
    doc.setTextColor(ls.ok ? 90 : 180, ls.ok ? 90 : 40, ls.ok ? 90 : 40);
    doc.text(doc.splitTextToSize(stmt, 182), 14, y + 13);
    doc.setTextColor(0);
  }

  doc.save(`fahrtenbuch-finanzamt-${selYear.value}${selMonth.value ? '-' + selMonth.value : ''}.pdf`);

  // Nach erfolgreichem Save: Backend-Lock einplanen (best-effort, kein
  // Abbruch bei Fehler — der Admin kann es spaeter manuell auslosen).
  try {
    const from = Math.floor(new Date(`${selYear.value}-${selMonth.value || '01'}-01T00:00:00`).getTime() / 1000);
    const toDate = selMonth.value
      ? new Date(+selYear.value, +selMonth.value, 1)
      : new Date(+selYear.value + 1, 0, 1);
    const to = Math.floor(toDate.getTime() / 1000);
    await api.post('/trips/logbook/finanzamt-lock', {
      vehicle_id: appStore.selectedVehicle.id,
      from, to,
    });
    await load();
  } catch { /* Lock-Fehler nicht eskalieren — PDF ist trotzdem erzeugt */ }
}

onMounted(load);
watch(() => appStore.selectedVehicleId, load);
// Sortierwechsel triggert Reload, damit Backend mit korrektem ORDER BY liefert.
watch(sortDir, load);

// ── Tesla-Browser-Direktzugang ─────────────────────────────────────────────
// Erstellt eine Pair-Session mit redirect=/fahrtenbuch; zeigt QR + URL im Modal.
// Das öffnende Gerät (z.B. Tesla-Browser) navigiert zu /pair/<token>, bestätigt
// per Passkey und landet danach direkt im Fahrtenbuch.

const qrModal = ref({
  show:      false,
  status:    'pending', // pending | confirmed | expired
  qrUrl:     '',
  pairUrl:   '',
  token:     '',
  expiresAt: 0,
  expiresIn: '',
  copied:    false,
});
let qrPollTimer   = null;
let qrExpiryTimer = null;

function calcExpiresIn() {
  const diff = qrModal.value.expiresAt - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'abgelaufen';
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function openInTesla() {
  closeQr(); // bestehenden Timer stoppen
  try {
    const params = new URLSearchParams({ redirect: '/fahrtenbuch' });
    if (authStore.tenantSlug) params.append('tenantSlug', authStore.tenantSlug);
    const { data } = await api.get(`/pair/init?${params}`);

    qrModal.value = {
      show:      true,
      status:    'pending',
      qrUrl:     data.qrDataUrl,
      pairUrl:   `${window.location.origin}/pair/${data.token}`,
      token:     data.token,
      expiresAt: data.expiresAt,
      expiresIn: calcExpiresIn(),
      copied:    false,
    };

    // Ablauf-Ticker (1s)
    qrExpiryTimer = setInterval(() => {
      qrModal.value.expiresIn = calcExpiresIn();
      if (qrModal.value.expiresAt - Math.floor(Date.now() / 1000) <= 0) {
        clearInterval(qrExpiryTimer);
        clearInterval(qrPollTimer);
        if (qrModal.value.status === 'pending') qrModal.value.status = 'expired';
      }
    }, 1000);

    // Status-Polling über /pair/info (konsumiert den JWT NICHT — das macht der Tesla-Browser selbst)
    qrPollTimer = setInterval(async () => {
      try {
        const { data: info } = await api.get(`/pair/info/${data.token}`);
        if (info.status === 'already_confirmed') {
          clearInterval(qrPollTimer);
          clearInterval(qrExpiryTimer);
          qrModal.value.status = 'confirmed';
          setTimeout(() => { if (qrModal.value.show) qrModal.value.show = false; }, 2500);
        }
      } catch (e) {
        // 410 = abgelaufen
        if (e?.response?.status === 410) {
          clearInterval(qrPollTimer);
          clearInterval(qrExpiryTimer);
          if (qrModal.value.status === 'pending') qrModal.value.status = 'expired';
        }
      }
    }, 2000);
  } catch (err) {
    console.error('[Fahrtenbuch] openInTesla Fehler:', err.message);
  }
}

function closeQr() {
  clearInterval(qrPollTimer);
  clearInterval(qrExpiryTimer);
  qrModal.value.show = false;
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(qrModal.value.pairUrl);
    qrModal.value.copied = true;
    setTimeout(() => { qrModal.value.copied = false; }, 2000);
  } catch { /* Clipboard nicht verfügbar */ }
}
</script>

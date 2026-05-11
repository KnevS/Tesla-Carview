<template>
  <div class="max-w-2xl space-y-8">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold">Wenn dir das Programm etwas wert ist</h1>
      <p class="text-gray-400 text-sm">
        Tesla Carview ist <strong>für die private, selbst gehostete Nutzung im
        eigenen Haushalt</strong> kostenlos und werbefrei (siehe
        <a href="/legal/terms" class="text-blue-400 hover:underline">Nutzungsbedingungen</a> und
        <a href="https://polyformproject.org/licenses/noncommercial/1.0.0/" target="_blank" rel="noopener" class="text-blue-400 hover:underline">PolyForm Noncommercial&nbsp;1.0.0</a>).
        Kommerzieller Verkauf, SaaS-Angebote für Dritte oder die Einbettung in
        kommerzielle Produkte sind <strong>nicht</strong> gestattet.
      </p>
      <p class="text-gray-400 text-sm pt-2">
        Falls du etwas zurückgeben möchtest, freuen sich diese gemeinnützigen
        Organisationen über deine direkte Unterstützung.
      </p>
    </div>

    <div class="space-y-4">
      <a v-for="org in orgs" :key="org.name"
        :href="org.url" target="_blank" rel="noopener noreferrer"
        class="card flex items-start gap-4 hover:border-tesla-red border border-transparent transition group block no-underline">
        <div class="text-2xl mt-0.5 group-hover:scale-110 transition-transform">♥</div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-base">{{ org.name }}</p>
          <p class="text-sm text-gray-400 mt-1">{{ org.description }}</p>
        </div>
        <div class="flex-shrink-0 flex items-center gap-1 text-tesla-red font-medium text-sm group-hover:underline mt-0.5">
          Spenden <span>→</span>
        </div>
      </a>
    </div>

    <p class="text-xs text-gray-500 border-t border-gray-700 pt-4">
      100 % deiner Spende geht direkt an die Einrichtung.
      Wir sehen weder den Betrag noch deine Daten.
    </p>
  </div>
</template>

<script setup>
const orgs = [
  {
    name: 'Aktion Deutschland Hilft',
    description: 'Bündnis von Hilfsorganisationen für schnelle und wirkungsvolle Katastrophenhilfe weltweit – bei Erdbeben, Überschwemmungen und humanitären Krisen.',
    url: 'https://www.aktion-deutschland-hilft.de/de/spenden/',
  },
  {
    name: 'Lebenshilfe Rems-Murr',
    description: 'Unterstützung, Begleitung und Teilhabe für Menschen mit Behinderung im Rems-Murr-Kreis – für ein selbstbestimmtes und erfülltes Leben.',
    url: 'https://www.lebenshilfe-rems-murr.de/',
  },
  {
    name: 'Radio 7 Drachenkinder',
    description: 'Hilfe für schwer kranke Kinder in der Region – finanziert Therapien, Ausflüge und Wünsche, die sich Familien alleine nicht leisten könnten.',
    url: 'https://www.radio7.de/aktionen/drachenkinder',
  },
];
</script>

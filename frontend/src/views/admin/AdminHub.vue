<template>
  <div class="max-w-3xl space-y-6">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold">Administration</h1>
      <span class="text-xs bg-tesla-red/20 text-tesla-red px-2 py-0.5 rounded-full font-medium">Admin</span>
    </div>

    <p class="text-sm text-gray-400">
      Zentrale Verwaltung: Benutzer, Daten, Einstellungen, Rechtliches und Systemüberwachung.
    </p>

    <SystemHealthBanner />

    <!-- Setup-Assistent Button -->
    <button @click="showSetupWizard = true"
      class="flex items-center gap-3 w-full card p-4 hover:border-tesla-red/40 border border-dashed border-gray-700 text-left transition-all">
      <span class="text-2xl">🛠️</span>
      <div class="flex-1">
        <p class="font-semibold text-white">Setup-Assistent</p>
        <p class="text-xs text-gray-400 mt-0.5">Tesla-Credentials, Push, Telegram, externe APIs — alles ohne .env-Bearbeitung konfigurieren.</p>
      </div>
      <AppIcon name="chevron-right" :size="16" class="text-gray-500" />
    </button>

    <AdminSetupWizard v-if="showSetupWizard" @close="showSetupWizard = false" />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <RouterLink
        v-for="card in adminCards"
        :key="card.to"
        :to="card.to"
        class="card group flex items-start gap-4 p-4 hover:border-tesla-red/40 border border-transparent transition-all duration-150 no-underline"
      >
        <div class="text-3xl leading-none mt-0.5 flex-shrink-0">{{ card.icon }}</div>
        <div class="min-w-0">
          <p class="font-semibold text-white group-hover:text-tesla-red transition text-base">{{ card.title }}</p>
          <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ card.desc }}</p>
        </div>
        <AppIcon name="chevron-right" :size="16" class="ml-auto flex-shrink-0 text-gray-600 group-hover:text-tesla-red transition mt-1" />
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppIcon from '../../components/AppIcon.vue';
import SystemHealthBanner from '../../components/SystemHealthBanner.vue';
import AdminSetupWizard from '../../components/AdminSetupWizard.vue';

const showSetupWizard = ref(false);

const adminCards = [
  {
    to:    '/admin/settings',
    icon:  '⚙️',
    title: 'Einstellungen',
    desc:  'Tesla-Verbindung, Telemetrie, Fahrer, Geofences, API-Keys (VAPID, Telegram, Grok, ABRP), GPS-Fuzzing und Budget.',
  },
  {
    to:    '/admin/users',
    icon:  '👥',
    title: 'Benutzerverwaltung',
    desc:  'Konten anlegen und verwalten, Fahrzeuge zuweisen, Einladungen versenden und Passwort-Reset.',
  },
  {
    to:    '/admin/data',
    icon:  '🗑️',
    title: 'Datenverwaltung',
    desc:  'Fahrten, Ladevorgänge und Telemetrie-Daten löschen oder exportieren. Datenbestand einsehen.',
  },
  {
    to:    '/admin/legal',
    icon:  '⚖️',
    title: 'Rechtliche Inhalte',
    desc:  'Impressum, Datenschutzerklärung und Nutzungsbedingungen pro Sprache pflegen.',
  },
  {
    to:    '/admin/audit',
    icon:  '📋',
    title: 'Audit-Log',
    desc:  'Sicherheitsrelevante Ereignisse: Logins, Berechtigungsänderungen, Tesla-Befehle und Akzeptanzen.',
  },
  {
    to:    '/system',
    icon:  '📈',
    title: 'System',
    desc:  'Versionsinformationen, CPU- und RAM-Auslastung, Datenbankstatistiken und Deployment-Status.',
  },
];
</script>

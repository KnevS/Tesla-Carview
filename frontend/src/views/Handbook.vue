<template>
  <div class="max-w-3xl space-y-8 pb-16">

    <!-- Header -->
    <div class="text-center space-y-2 pt-4">
      <div class="text-5xl">📖</div>
      <h1 class="text-3xl font-bold">Tesla Carview Handbuch</h1>
      <p class="text-gray-400">Version 2.0 · Self-Hosted · Multi-Tenant</p>
    </div>

    <!-- Inhaltsverzeichnis -->
    <div class="card space-y-2 text-sm">
      <h2 class="font-semibold text-base mb-2">Inhaltsverzeichnis</h2>
      <a v-for="s in sections" :key="s.id" :href="`#${s.id}`"
        class="block text-gray-400 hover:text-white py-0.5 border-b border-gray-800 last:border-0">
        {{ s.icon }} {{ s.title }}
      </a>
    </div>

    <!-- Abschnitte -->
    <section id="overview" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">🌟 Überblick</h2>
      <p class="text-gray-300 leading-relaxed">
        Tesla Carview ist eine <strong>selbst gehostete</strong> Datenlogger-App für Tesla-Fahrzeuge.
        Alle Daten bleiben ausschließlich auf deinem eigenen Server – keine Cloud, keine Datenweitergabe.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div v-for="f in features" :key="f.icon" class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">{{ f.icon }} {{ f.title }}</p>
          <p class="text-gray-400 text-xs mt-1">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <section id="requirements" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">📋 Voraussetzungen</h2>
      <div class="space-y-4 text-sm">
        <div class="bg-gray-800 rounded-lg p-4 space-y-2">
          <p class="font-semibold text-white">Server</p>
          <ul class="text-gray-400 space-y-1 list-disc list-inside">
            <li>Linux-Server (x86_64, ARM64 oder ARMv7) mit min. 1 GB RAM</li>
            <li>Docker + Docker Compose (wird vom Setup-Script installiert)</li>
            <li>Öffentlich erreichbare Domain + TLS-Zertifikat (für Tesla API erforderlich)</li>
            <li>Port 443 (HTTPS) muss von außen erreichbar sein</li>
          </ul>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-2">
          <p class="font-semibold text-white">Tesla Developer Account</p>
          <ul class="text-gray-400 space-y-1 list-disc list-inside">
            <li>Registrierung auf <code class="text-gray-300">developer.tesla.com</code></li>
            <li>App anlegen → Client ID und Client Secret notieren</li>
            <li>Callback-URL: <code class="text-gray-300">https://&lt;deine-domain&gt;/api/auth/callback</code></li>
            <li>Für Fahrzeugbefehle: Fleet API Access beantragen (kostenlos, 1–3 Werktage)</li>
          </ul>
        </div>
      </div>
    </section>

    <section id="installation" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">🚀 Installation</h2>
      <p class="text-sm text-gray-400">Das Setup-Script installiert alles automatisch: Docker, nginx, TLS, tesla-http-proxy.</p>
      <div class="bg-gray-900 rounded-lg p-4 space-y-3 font-mono text-sm">
        <p class="text-gray-500"># Als root auf dem Zielserver:</p>
        <p class="text-green-400">curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash</p>
        <p class="text-gray-500 mt-3"># Das Script fragt interaktiv ab:</p>
        <p class="text-gray-300">→ Domain (z.B. carview.meinserver.de)</p>
        <p class="text-gray-300">→ Tesla Client ID und Client Secret</p>
        <p class="text-gray-300">→ Tesla Redirect URI</p>
        <p class="text-gray-300">→ JWT Secret (wird automatisch generiert)</p>
      </div>
      <div class="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-sm text-blue-300">
        <p class="font-semibold">Alternative: Manuelle Konfiguration</p>
        <p class="mt-1 text-blue-400/80">
          Kopiere <code>.env.example</code> → <code>.env</code> und passe alle Werte an.
          Dann: <code class="text-blue-300">docker compose -f docker-compose.prod.yml up -d</code>
        </p>
      </div>
    </section>

    <section id="first-setup" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">⚙️ Erst-Setup im Browser</h2>
      <ol class="space-y-4 text-sm">
        <li class="flex gap-3">
          <span class="w-7 h-7 rounded-full bg-tesla-red text-white flex-shrink-0 flex items-center justify-center font-bold">1</span>
          <div>
            <p class="font-semibold text-white">Browser öffnen</p>
            <p class="text-gray-400">Öffne <code>https://&lt;deine-domain&gt;/setup</code> — du wirst automatisch weitergeleitet.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="w-7 h-7 rounded-full bg-tesla-red text-white flex-shrink-0 flex items-center justify-center font-bold">2</span>
          <div>
            <p class="font-semibold text-white">Mandanten anlegen</p>
            <p class="text-gray-400">Wähle einen Mandantennamen (z.B. "Familie Muster") und ein Kürzel (z.B. "muster").
            Das Kürzel wird beim Login benötigt – notiere es dir.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="w-7 h-7 rounded-full bg-tesla-red text-white flex-shrink-0 flex items-center justify-center font-bold">3</span>
          <div>
            <p class="font-semibold text-white">Admin-Konto erstellen</p>
            <p class="text-gray-400">Lege Benutzername und Passwort fest. Das Passwort muss mindestens 12 Zeichen lang sein.
            Empfehlung: eine Passphrase aus 4 Wörtern.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="w-7 h-7 rounded-full bg-tesla-red text-white flex-shrink-0 flex items-center justify-center font-bold">4</span>
          <div>
            <p class="font-semibold text-white">Tesla verbinden</p>
            <p class="text-gray-400">Nach dem Login: <strong>Einstellungen → Tesla-Account verbinden</strong>.
            Du wirst zu Tesla weitergeleitet und musst dich dort anmelden.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="w-7 h-7 rounded-full bg-tesla-red text-white flex-shrink-0 flex items-center justify-center font-bold">5</span>
          <div>
            <p class="font-semibold text-white">Fahrzeug importieren</p>
            <p class="text-gray-400">Gehe zu <strong>Fahrzeuge</strong> — dein Fahrzeug wird automatisch aus der Tesla API importiert.</p>
          </div>
        </li>
      </ol>
    </section>

    <section id="virtual-key" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">🔑 Virtual Key einrichten</h2>
      <p class="text-sm text-gray-400">
        Für Fahrzeugbefehle (Türen öffnen, Klimaanlage etc.) muss ein Virtual Key am Fahrzeug registriert werden.
        Dies ist nur für neuere Fahrzeuge erforderlich (<code>vehicle_command_protocol_required: true</code>).
      </p>
      <ol class="space-y-3 text-sm">
        <li class="flex gap-3">
          <span class="w-6 h-6 rounded-full bg-gray-700 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">1</span>
          <p class="text-gray-300">Stelle sicher, dass <strong>tesla-http-proxy</strong> läuft:
          <code class="text-gray-400 text-xs block mt-1 bg-gray-900 p-1 rounded">systemctl status tesla-http-proxy</code></p>
        </li>
        <li class="flex gap-3">
          <span class="w-6 h-6 rounded-full bg-gray-700 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">2</span>
          <p class="text-gray-300">Öffne auf dem iPhone in Safari:
          <code class="text-gray-400 block mt-1">https://tesla.com/_ak/&lt;deine-domain&gt;</code></p>
        </li>
        <li class="flex gap-3">
          <span class="w-6 h-6 rounded-full bg-gray-700 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">3</span>
          <p class="text-gray-300">Die Tesla-App fragt "App zulassen?" → bestätigen</p>
        </li>
        <li class="flex gap-3">
          <span class="w-6 h-6 rounded-full bg-gray-700 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">4</span>
          <p class="text-gray-300">In Bluetooth-Reichweite des Fahrzeugs bleiben — der Key wird innerhalb von 30 Sekunden akzeptiert</p>
        </li>
        <li class="flex gap-3">
          <span class="w-6 h-6 rounded-full bg-gray-700 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">5</span>
          <p class="text-gray-300">Verifizieren unter <strong>Einstellungen → Fahrzeugverbindung → Virtual Key Status</strong></p>
        </li>
      </ol>
    </section>

    <section id="charging-locations" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">⚡ Ladeorte & Kosten</h2>
      <p class="text-sm text-gray-400">
        Ladeorte werden per GPS automatisch erkannt und mit einem Preis pro kWh verknüpft.
      </p>
      <div class="space-y-3 text-sm">
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold text-white">Automatische GPS-Erkennung</p>
          <p class="text-gray-400 mt-1">Wenn ein Ladeort mit GPS-Koordinaten und Radius (Standard 200m) hinterlegt ist,
          wird beim Ladestart automatisch der passende Ort erkannt und der hinterlegte Preis/kWh angewendet.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold text-white">Ladeort anlegen</p>
          <p class="text-gray-400 mt-1">Unter <strong>Laden → Ladeorte</strong>: Name, Typ (Zuhause/Büro/Öffentlich),
          Preis/kWh, GPS-Koordinaten und Erkennungsradius eingeben.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold text-white">Kosten manuell anpassen</p>
          <p class="text-gray-400 mt-1">In der Ladeliste: Klick auf eine Session → Kosten bearbeiten.
          Kosten können auch auf 0 gesetzt werden (z.B. Gratis-Laden).</p>
        </div>
      </div>
    </section>

    <section id="security" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">🔐 Sicherheit</h2>
      <div class="space-y-3 text-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="s in securityFeatures" :key="s.title" class="bg-gray-800 rounded-lg p-3">
            <p class="font-semibold">{{ s.icon }} {{ s.title }}</p>
            <p class="text-gray-400 text-xs mt-1">{{ s.desc }}</p>
          </div>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">Empfohlene Sicherheitseinstellungen</p>
          <ul class="text-gray-400 mt-2 space-y-1 list-disc list-inside">
            <li>MFA (TOTP) nach dem ersten Login aktivieren</li>
            <li>Passkey einrichten für passwortlosen Login</li>
            <li>Regelmäßig Datensicherung erstellen (Export)</li>
            <li>Starkes Passwort: min. 16 Zeichen oder 4-Wort-Passphrase</li>
          </ul>
        </div>
      </div>
    </section>

    <section id="multitenancy" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">🏢 Multi-Mandanten</h2>
      <p class="text-sm text-gray-400">
        Tesla Carview unterstützt mehrere vollständig isolierte Mandanten auf einer Instanz.
        Jeder Mandant hat seine eigene Datenbank – ein Mandant kann niemals Daten eines anderen sehen.
      </p>
      <div class="space-y-3 text-sm">
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">Mandanten anlegen</p>
          <p class="text-gray-400 mt-1">Öffne <code>/register</code> oder klicke auf "Neuen Mandanten registrieren"
          auf der Login-Seite. Jeder kann sich selbst registrieren.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">Login mit Mandanten-Kürzel</p>
          <p class="text-gray-400 mt-1">Bei mehreren Mandanten erscheint beim Login ein Mandanten-Feld.
          Bei nur einem Mandanten wird er automatisch erkannt.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">Benutzerverwaltung</p>
          <p class="text-gray-400 mt-1">Administratoren können innerhalb ihres Mandanten weitere Benutzer anlegen
          und Fahrzeuge zuweisen. Unter <strong>Admin → Benutzer</strong>.</p>
        </div>
      </div>
    </section>

    <section id="backup" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">💾 Datensicherung</h2>
      <div class="space-y-3 text-sm">
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">Manueller Export</p>
          <p class="text-gray-400 mt-1">Unter <strong>Export</strong>: CSV oder JSON für Fahrten und Ladesessions,
          sowie Vollbackup als ZIP.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">Automatisches Backup (Server)</p>
          <p class="text-gray-400 mt-1">Die SQLite-Datenbanken liegen im Docker-Volume <code>tesla_data</code>.
          Für automatische Backups auf dem Server:</p>
          <pre class="bg-gray-900 text-xs rounded p-2 mt-2 text-gray-300 overflow-x-auto">
# Tägliches Backup um 3 Uhr (crontab -e):
0 3 * * * cp /var/lib/docker/volumes/tesla_data/_data/*.db /backup/</pre>
        </div>
        <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
          <p class="font-semibold text-yellow-400">Wichtig vor dem Löschen</p>
          <p class="text-yellow-400/80 mt-1">Immer zuerst einen Export erstellen, bevor du Daten löschst.
          Gelöschte Daten können nicht wiederhergestellt werden.</p>
        </div>
      </div>
    </section>

    <section id="troubleshooting" class="space-y-3">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">🔧 Fehlerbehebung</h2>
      <div class="space-y-3">
        <div v-for="item in troubleshooting" :key="item.q" class="bg-gray-800 rounded-lg">
          <button @click="item.open = !item.open"
            class="w-full text-left p-4 flex items-center justify-between text-sm font-semibold">
            <span>{{ item.q }}</span>
            <span class="text-gray-500">{{ item.open ? '▲' : '▼' }}</span>
          </button>
          <div v-if="item.open" class="px-4 pb-4 text-sm text-gray-400 border-t border-gray-700 pt-3">
            {{ item.a }}
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { reactive } from 'vue';

const sections = [
  { id: 'overview',           icon: '🌟', title: 'Überblick' },
  { id: 'requirements',       icon: '📋', title: 'Voraussetzungen' },
  { id: 'installation',       icon: '🚀', title: 'Installation' },
  { id: 'first-setup',        icon: '⚙️',  title: 'Erst-Setup im Browser' },
  { id: 'virtual-key',        icon: '🔑', title: 'Virtual Key einrichten' },
  { id: 'charging-locations', icon: '⚡', title: 'Ladeorte & Kosten' },
  { id: 'security',           icon: '🔐', title: 'Sicherheit' },
  { id: 'multitenancy',       icon: '🏢', title: 'Multi-Mandanten' },
  { id: 'backup',             icon: '💾', title: 'Datensicherung' },
  { id: 'troubleshooting',    icon: '🔧', title: 'Fehlerbehebung' },
];

const features = [
  { icon: '🚗', title: 'Fahrtenbuch', desc: 'GPS-Tracks, Verbrauch, Fahrttyp-Kategorisierung' },
  { icon: '⚡', title: 'Laden', desc: 'Ladesessions mit Kosten, GPS-Standort-Erkennung' },
  { icon: '🔋', title: 'Batterie', desc: 'Degradations-Tracking, Reichweiten-Verlauf' },
  { icon: '📊', title: 'Dashboard', desc: 'Statistiken, monatliche Übersicht, letzte Aktivitäten' },
  { icon: '🎮', title: 'Steuerung', desc: 'Klimaanlage, Türen, Licht – direkt aus der App' },
  { icon: '📝', title: 'Betriebsbuch', desc: 'Wartungen, Reparaturen, Kosten mit Datum' },
  { icon: '📤', title: 'Export', desc: 'CSV/JSON für alle Daten, Vollbackup als ZIP' },
  { icon: '🔔', title: 'Push-Nachrichten', desc: 'Browser-Benachrichtigung bei Ladeende' },
];

const securityFeatures = [
  { icon: '🔑', title: 'Passkey / WebAuthn', desc: 'Passwortloser Login mit Fingerabdruck, Face ID oder Hardware-Key' },
  { icon: '📱', title: 'TOTP-MFA', desc: 'Zwei-Faktor-Authentifizierung mit Authenticator-App' },
  { icon: '🛡️', title: 'Account-Lockout', desc: 'Konto wird nach 5 Fehlversuchen für 15 min gesperrt' },
  { icon: '🍪', title: 'Refresh-Token', desc: 'httpOnly-Cookie, 7 Tage gültig, automatische Rotation' },
  { icon: '📋', title: 'Audit-Log', desc: 'Alle Logins, Änderungen und Sicherheitsereignisse protokolliert' },
  { icon: '🔒', title: 'HTTPS + HSTS', desc: 'TLS 1.2/1.3, HSTS, OCSP-Stapling, sichere Headers' },
];

const troubleshooting = reactive([
  {
    q: 'Das Fahrzeug gibt keine GPS-Daten zurück',
    a: 'Neuere Tesla-Modelle (XP7-VIN, z.B. Model Y Juniper) liefern keinen drive_state via REST-API. GPS-Tracking erfolgt über Fleet Telemetry. Stelle sicher, dass tesla-http-proxy läuft und der Virtual Key registriert ist.',
    open: false,
  },
  {
    q: 'Login funktioniert nicht nach dem Update',
    a: 'Bei einem Update auf v2.0 (Multi-Tenant) wird beim Login ein Mandanten-Kürzel benötigt. Das Kürzel für die migrierte Datenbank ist "default". Gib es im Login-Feld ein oder klicke auf "Mandant auswählen".',
    open: false,
  },
  {
    q: 'Tesla-Verbindung schlägt fehl (401)',
    a: 'Der Tesla OAuth-Token ist abgelaufen. Gehe zu Einstellungen → Tesla-Verbindung und verbinde dein Tesla-Konto erneut. Stelle sicher, dass TESLA_CLIENT_ID und TESLA_CLIENT_SECRET in der .env korrekt sind.',
    open: false,
  },
  {
    q: 'Fahrzeugbefehle schlagen fehl',
    a: 'Prüfe: 1) tesla-http-proxy läuft (systemctl status tesla-http-proxy) 2) Virtual Key ist am Fahrzeug registriert (Einstellungen → Fahrzeugverbindung) 3) Das Fahrzeug ist online (nicht schlafen).',
    open: false,
  },
  {
    q: 'Keine Telemetrie-Daten',
    a: 'Fleet Telemetry benötigt eine Genehmigung bei Tesla (partner.tesla.com). Nach Genehmigung: Einstellungen → Fleet Telemetry konfigurieren. Prüfe auch, ob Port 443 von außen erreichbar ist.',
    open: false,
  },
  {
    q: 'Backend startet nicht',
    a: 'Prüfe die Logs: docker logs tesla-carview-backend. Häufige Ursachen: fehlende .env-Variablen (JWT_SECRET, TESLA_CLIENT_ID), Datenbank-Migrationsfehler.',
    open: false,
  },
]);
</script>

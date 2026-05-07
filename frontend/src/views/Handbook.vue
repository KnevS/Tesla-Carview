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
        Die App ist vollständig <strong>responsive</strong> und läuft auf <strong>iPhone/iPad (Safari)</strong>,
        Android-Smartphones sowie Desktop-Browsern.
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
            <p class="font-semibold text-white">Fahrzeuge importieren</p>
            <p class="text-gray-400">Gehe zu <strong>Einstellungen → Tesla-Verbindung → Fahrzeuge synchronisieren</strong>.
            Alle Fahrzeuge des verbundenen Tesla-Accounts werden automatisch übernommen.
            Hast du mehrere Teslas unter einem Account, erscheinen alle auf einmal.</p>
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
        <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
          <p class="font-semibold text-white">✕ Ladung als kostenlos markieren</p>
          <p class="text-gray-400 mt-1">
            In der <strong>Ladehistorie</strong> hat jede Session einen kleinen Button <em>"✕ kostenlos"</em>.
            Damit markierte Ladungen erscheinen ausgegraut mit dem Badge <em>"kostenlos"</em> und werden
            <strong>automatisch aus der Heimladen-Abrechnung ausgeschlossen</strong> — sowohl aus den
            Monatszusammenfassungen als auch aus der Einzelauswertung.
          </p>
          <p class="text-gray-500 mt-1 text-xs">
            Typischer Anwendungsfall: Laden am Arbeitsplatz, das vom Arbeitgeber gestellt wird und nicht
            in die private Abrechnung einfließen soll. Mit dem Button <em>"↩ kostenpflichtig"</em>
            lässt sich die Markierung jederzeit rückgängig machen.
          </p>
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
          <p class="font-semibold">Mandanten anlegen (Einladungslink)</p>
          <p class="text-gray-400 mt-1">
            Neue Mandanten können nur über einen <strong>Einladungslink</strong> registriert werden.
            Ein Administrator generiert den Link unter <strong>Admin → Benutzer → Einladungslink erstellen</strong>.
            Der Link ist 7 Tage gültig und kann nur einmal verwendet werden.
            Ohne gültigen Link ist <code>/register</code> gesperrt.
          </p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3">
          <p class="font-semibold">Mehrere Fahrzeuge pro Mandant</p>
          <p class="text-gray-400 mt-1">
            Alle Fahrzeuge eines Tesla-Accounts werden beim Synchronisieren automatisch importiert.
            Unter <strong>Einstellungen → Tesla-Verbindung → 🔄 Fahrzeuge synchronisieren</strong>
            lässt sich der Sync jederzeit manuell anstoßen — nützlich wenn ein neues Fahrzeug zum
            Account hinzugefügt wurde. Zwischen Fahrzeugen wechselst du oben rechts in der Navigationsleiste.
          </p>
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

    <section id="tesla-api" class="space-y-4">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">⚡ Tesla Developer API einrichten</h2>
      <p class="text-sm text-gray-400">
        Tesla Carview kommuniziert über die offizielle <strong>Tesla Fleet API</strong>.
        Dazu brauchst du einen kostenlosen Tesla Developer Account und eine registrierte App.
      </p>
      <div class="space-y-3 text-sm">
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 1 – Developer Account anlegen</p>
          <ol class="text-gray-400 space-y-1.5 list-decimal list-inside">
            <li>Rufe <code class="text-gray-300">developer.tesla.com</code> auf und melde dich mit deinem Tesla-Account an.</li>
            <li>Akzeptiere die Developer Terms of Service.</li>
            <li>Klicke auf <strong>Create Application</strong>.</li>
          </ol>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 2 – App konfigurieren</p>
          <ol class="text-gray-400 space-y-2 list-decimal list-inside">
            <li><strong>Application Name:</strong> beliebiger Name, z.&nbsp;B. <em>Tesla Carview</em></li>
            <li><strong>Description:</strong> kurze Beschreibung (Pflichtfeld)</li>
            <li>
              <strong>Allowed Origin:</strong> deine öffentliche App-URL, z.&nbsp;B.<br>
              <code class="text-gray-300 text-xs block mt-1 bg-gray-900 p-1.5 rounded">https://carview.example.com</code>
            </li>
            <li>
              <strong>Redirect URI:</strong> Callback-URL der App:<br>
              <code class="text-gray-300 text-xs block mt-1 bg-gray-900 p-1.5 rounded">https://carview.example.com/api/auth/callback</code>
            </li>
            <li><strong>Scopes (erforderlich):</strong> <code class="text-gray-300">vehicle_device_data</code>, <code class="text-gray-300">vehicle_cmds</code>, <code class="text-gray-300">vehicle_charging_cmds</code>, <code class="text-gray-300">vehicle_location</code>, <code class="text-gray-300">openid</code>, <code class="text-gray-300">offline_access</code></li>
            <li class="text-yellow-300">⚠ <code class="text-gray-300">vehicle_location</code> ist für GPS-Tracking (Fleet Telemetry) zwingend erforderlich</li>
          </ol>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 3 – Zugangsdaten notieren</p>
          <p class="text-gray-400">Nach dem Erstellen erhältst du:</p>
          <ul class="text-gray-400 space-y-1 list-disc list-inside">
            <li><strong>Client ID</strong> – eine UUID-artige Zeichenkette</li>
            <li><strong>Client Secret</strong> – einmalig sichtbar, sofort kopieren und sicher speichern</li>
          </ul>
          <div class="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 font-mono space-y-1">
            <p>TESLA_CLIENT_ID=abc123def456...</p>
            <p>TESLA_CLIENT_SECRET=tsl_secret_...</p>
          </div>
          <p class="text-xs text-gray-500">Diese Werte trägst du in die <code>.env</code>-Datei ein oder gibst sie beim interaktiven Setup-Wizard an.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 4 – Fleet API Access beantragen (für Befehle)</p>
          <p class="text-gray-400">
            Damit Fahrzeugbefehle (Klima, Türen, Laden) funktionieren, muss deine App als <em>Partner</em>
            bei Tesla registriert sein. Das geht einmalig über:<br>
            <code class="text-gray-300 text-xs block mt-2 bg-gray-900 p-1.5 rounded">POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts</code>
          </p>
          <p class="text-gray-400">Das Setup-Script führt diesen Schritt automatisch aus, wenn <code>FRONTEND_URL</code> gesetzt ist. Sonst manuell via Postman oder curl. Dauert 1–3 Werktage bis zur Aktivierung.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-2">
          <p class="font-semibold text-white">Schritt 5 – In Tesla Carview verbinden</p>
          <ol class="text-gray-400 space-y-1.5 list-decimal list-inside">
            <li>Nach dem Login: <strong>Einstellungen → Tesla-Verbindung → Tesla neu verbinden</strong></li>
            <li>Du wirst zu Tesla weitergeleitet und musst dich dort anmelden und der App Zugriff erlauben.</li>
            <li>Nach der Weiterleitung: <strong>Einstellungen → 🔄 Fahrzeuge synchronisieren</strong></li>
            <li>Alle Fahrzeuge des Tesla-Accounts erscheinen in der App.</li>
          </ol>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 6 – Fleet Telemetrie aktivieren (GPS-Tracking)</p>
          <p class="text-gray-400">
            GPS-Daten kommen bei neueren Fahrzeugen (z.&nbsp;B. Model Y ab 2024, XP7-VIN) ausschließlich über
            <strong>Fleet Telemetry</strong> — nicht über die REST-API. Dafür sind zwei Einmal-Schritte nötig:
          </p>
          <ol class="text-gray-400 space-y-3 list-decimal list-inside">
            <li>
              <strong>App bei Tesla registrieren</strong><br>
              <span class="text-gray-500 ml-4 block mt-1">Einstellungen → Fleet Telemetrie → <em>„🔑 App bei Tesla registrieren"</em> klicken. Einmalig nötig.</span>
            </li>
            <li>
              <strong>Fleet Telemetry Access beantragen</strong><br>
              <span class="text-gray-500 ml-4 block mt-1">
                Wenn der nächste Schritt mit „HTTP 404" scheitert, hat Tesla den Endpoint noch nicht freigeschaltet.
                Dann den Tesla Developer Support kontaktieren (siehe unten).
              </span>
            </li>
            <li>
              <strong>Telemetrie aktivieren</strong><br>
              <span class="text-gray-500 ml-4 block mt-1">Einstellungen → Fleet Telemetrie → <em>„📡 Telemetrie aktivieren"</em> klicken. Konfiguriert das Fahrzeug so, dass es GPS, Geschwindigkeit und Batterie-Daten streamt.</span>
            </li>
          </ol>

          <div class="bg-gray-900 rounded-lg p-3 space-y-2 text-xs text-gray-400 mt-2">
            <p class="text-white font-medium text-sm">Fleet Telemetry Access beim Tesla Support beantragen</p>
            <p>Falls Schritt 2 mit 404 scheitert, schicke folgende Anfrage ans Tesla Developer Support-Formular
              (<code class="text-gray-300">developer.tesla.com/dashboard → Support Inquiry</code>):</p>
            <pre class="bg-gray-800 rounded p-3 text-gray-300 whitespace-pre-wrap leading-relaxed">Subject: Fleet Telemetry Access Request – Self-Hosted App for Personal Use

Hello Tesla Developer Support,

I am requesting approval for fleet_telemetry_config access for a
self-hosted application used exclusively for personal purposes
(own vehicle, single user).

Context:
- App name: MyCarviewApp
- Client ID: a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0
- Hosting: self-hosted on private infrastructure
- User scope: single user (vehicle owner)
- Vehicle VIN: 5YJ3E1EA1NF000000

Current status:
- OAuth, polling, charging control, and vehicle commands work.
- fleet_telemetry_config returns HTTP 404.

Use case:
Personal monitoring of my own vehicle (location, charging state,
drive state) via my self-hosted backend. No third-party access,
no commercial use, no data sharing.

Could you please review and enable fleet_telemetry_config?

Thank you</pre>
            <p class="text-yellow-300">⚠ Client ID und VIN durch eigene Werte ersetzen. Tesla antwortet erfahrungsgemäß innerhalb weniger Tage.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="monta" class="space-y-4">
      <h2 class="text-xl font-bold border-b border-gray-700 pb-2">🔌 Monta-Integration (Heimlade-Abrechnung)</h2>
      <p class="text-sm text-gray-400">
        Für Dienstwagen-Fahrer: Tesla Carview kann Ladedaten direkt aus deiner <strong>Monta-Wallbox</strong>
        abrufen und daraus eine monatliche Kostenabrechnung für deinen Arbeitgeber erstellen.
      </p>
      <div class="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-200">
        ⚠️ Monta-Integration ist nur für Fahrzeuge der Kategorie <strong>Dienstwagen</strong> verfügbar
        (Einstellungen → Fahrzeugprofil → Kategorie).
      </div>
      <div class="space-y-3 text-sm">
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 1 – Monta API-Key erstellen</p>
          <ol class="text-gray-400 space-y-2 list-decimal list-inside">
            <li>Melde dich bei <strong>Monta</strong> an (App oder Web: <code class="text-gray-300">portal.monta.com</code>).</li>
            <li>Gehe zu <strong>Einstellungen → API</strong>.</li>
            <li>Klicke auf <strong>API Key erstellen</strong> und kopiere den Schlüssel (er beginnt mit <code class="text-gray-300">monta_</code>).</li>
          </ol>
          <p class="text-xs text-gray-500">Der Key ist nur einmal sichtbar – sofort in Tesla Carview eintragen.</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 2 – Charge-Point-ID herausfinden</p>
          <ol class="text-gray-400 space-y-2 list-decimal list-inside">
            <li>Im Monta-Portal: <strong>Ladepunkte → Meine Geräte</strong> auswählen.</li>
            <li>Die <strong>Charge-Point-ID</strong> steht in der Detailansicht (Format: <code class="text-gray-300">cp_12345</code>).</li>
            <li>Alternativ: API-Aufruf <code class="text-gray-300">GET /api/v1/charge-points</code> liefert alle Ladepunkte mit IDs.</li>
          </ol>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Schritt 3 – In Tesla Carview eintragen</p>
          <ol class="text-gray-400 space-y-2 list-decimal list-inside">
            <li>Gehe zu <strong>Einstellungen → Fahrzeugprofil</strong>.</li>
            <li>Wähle Kategorie <strong>💼 Dienstwagen</strong>.</li>
            <li>Trage <strong>Strompreis Wallbox (€/kWh)</strong> ein – z.&nbsp;B. <code class="text-gray-300">0.34</code>.</li>
            <li>Füge <strong>Monta Charge-Point-ID</strong> und <strong>Monta API-Key</strong> ein.</li>
            <li>Klicke <strong>Speichern</strong>.</li>
          </ol>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 space-y-3">
          <p class="font-semibold text-white">Abrechnung nutzen</p>
          <ul class="text-gray-400 space-y-1.5 list-disc list-inside">
            <li>Gehe zu <strong>Abrechnung</strong> in der Navigation.</li>
            <li>Wähle den gewünschten Monat – alle Heim-Ladevorgänge werden aufgelistet.</li>
            <li>Ladungen, die kostenlos waren (z.&nbsp;B. beim Arbeitgeber), kannst du in der Ladehistorie mit <strong>✕ kostenlos</strong> markieren – sie werden dann aus der Abrechnung ausgeschlossen.</li>
            <li>Mit <strong>PDF exportieren</strong> erhältst du ein unterschriftsreifes Abrechnungsblatt.</li>
          </ul>
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
  { id: 'tesla-api',          icon: '⚡', title: 'Tesla Developer API einrichten' },
  { id: 'monta',              icon: '🔌', title: 'Monta-Integration (Abrechnung)' },
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
  { icon: '📱', title: 'Mobile-optimiert', desc: 'Vollständig nutzbar auf iPhone/iPad (Safari), Android und Desktop' },
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
    q: 'Keine Telemetrie-Daten / GPS fehlt',
    a: 'Fleet Telemetry erfordert zwei Schritte: (1) App bei Tesla registrieren (Einstellungen → „🔑 App registrieren"), (2) Telemetrie aktivieren (Einstellungen → „📡 Telemetrie aktivieren"). Falls Schritt 2 mit HTTP 404 scheitert, muss der fleet_telemetry_config-Zugang beim Tesla Developer Support beantragt werden – Vorlage steht im Handbuch unter „Schritt 6". Außerdem muss vehicle_location in den App-Scopes auf developer.tesla.com aktiviert sein.',
    open: false,
  },
  {
    q: 'Backend startet nicht',
    a: 'Prüfe die Logs: docker logs tesla-carview-backend. Häufige Ursachen: fehlende .env-Variablen (JWT_SECRET, TESLA_CLIENT_ID), Datenbank-Migrationsfehler.',
    open: false,
  },
]);
</script>

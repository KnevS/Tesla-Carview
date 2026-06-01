# Changelog

Alle relevanten Änderungen werden in dieser Datei dokumentiert.
Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

> 🇬🇧 [Read in English](CHANGELOG.en.md)

---

## [v3.4.6] - 2026-06-01

### Neu

- **Telegram-Info-Befehle**: Fünf neue Read-only-Befehle für den Bot — `/location` (aktueller Standort mit Google-Maps-Link aus der letzten Telemetry-Position), `/range` (Restreichweite + SOC + Stand aus `battery_snapshots`), `/today` (Tagesbilanz: Anzahl Fahrten, km, Anzahl Ladungen, kWh, Kosten — Tagesgrenze in Europe/Berlin), `/service` (nächste fällige Wartungsintervalle, mit "ueberfaellig"-Markierung), `/firmware` (aktuelle Software-Version + Vorgänger aus `firmware_versions`). Alle Befehle nutzen das MarkdownV2-Escape-Pattern aus v3.4.3.
- **Help-Text erweitert**: `/help` listet jetzt alle neun Befehle inklusive der neuen.

### Behoben

- **`/battery` zeigte "Letzte Ladung: –"**: Statt `charge_energy_added` heißt die Spalte in `charging_sessions` real `energy_added_kwh`. Stiller Bug (kein Crash, nur leere Anzeige). Jetzt richtige Spalte; auch `/today` greift korrekt darauf zu.

---

## [v3.4.5] - 2026-06-01

### Behoben

- **OFFLINE-Anzeige nach Auto-Deploy**: Bei jedem Backend-Restart kappte der Container den persistenten Tesla→Backend FleetTelemetry-WebSocket. Der Tesla baut die Verbindung erst beim nächsten State-Event neu auf (Fahrt, Wake, Ladung). In der Zwischenzeit hielt der Poller `vehicle.telemetry_last_signal_at` für aktuell und übersprang das Polling-Fallback — Fahrzeugkarte zeigte "OFFLINE · kein Signal", Fahrten- und Schlafmonitor-Daten alterten unbemerkt. Beim Boot wird `telemetry_last_signal_at` jetzt auf `NULL` zurückgesetzt; der Polling-Loop übernimmt damit sofort, bis der Stream wieder etabliert ist.

### Neu

- **Refresh-Button im EditorialStatusBar**: Notbremse für OFFLINE-Status. Klickt der Nutzer "⟳ Aktualisieren" wird ein einmaliger `vehicle_data`-Force-Poll ausgelöst (verbraucht 1 vom Tages-Cap). Die Antwort enthält den verbleibenden Cap-Stand, das Frontend zeigt "Aktualisiert ({day}/{dayMax} heute)" bzw. bei erschöpftem Cap "Tages-Cap erreicht — Pause bis morgen". Backend: neuer Endpoint `POST /api/commands/:vehicleId/refresh`, intern via neuer Export `forcePollVehicle()` aus `poller.js`.

---

## [v3.4.4] - 2026-06-01

### Behoben

- **Telegram-Befehle scheitern mit `no such column: is_active`**: `/status` und `/battery` lasen Fahrzeuge mit `SELECT * FROM vehicles WHERE is_active=1 LIMIT 3`, doch die `vehicles`-Tabelle hat keine `is_active`-Spalte (das Flag existiert nur auf `users`). Der Bot antwortete mit `❌ Fehler: no such column: is_active`. Beide Stellen verwenden jetzt `ORDER BY id LIMIT 3`. Das `bot.catch()` aus v3.4.3 verhindert weiterhin, dass ein einzelner Befehl den gesamten Bot lahmlegt — der `is_active`-Fehler war aber nutzersichtbar pro Befehl.

---

## [v3.4.3] - 2026-06-01

### Behoben

- **Telegram-Bot reagiert nicht auf Befehle**: `/status`, `/battery` und `/trips` erzeugten Nachrichten mit unescapeten `.`-Zeichen aus `toLocaleString('de-DE')` (Tausenderpunkt im Kilometerstand), `toFixed()` (Dezimalpunkt bei kWh/km) und `toLocaleDateString('de-DE')` (Trennzeichen im Datum). MarkdownV2 markiert `.` als reserviert, Telegram antwortet mit `400 Bad Request: can't parse entities`. Der Polling-Loop crasht beim ersten Versuch und reagiert ab da nicht mehr. Alle drei Stellen escapen die dynamischen Werte jetzt über `esc()`. Zusätzlich fängt ein globaler `bot.catch()` einzelne Handler-Fehler ab, damit ein Bug in einem Befehl nicht den ganzen Bot stumm schaltet.

---

## [v3.4.2] - 2026-05-30

### Behoben

- **Telegram-Bot stumm hinter Reverse-Proxy**: `initTelegramBot()` registrierte einen Webhook auf `FRONTEND_URL/api/telegram/webhook`, sobald kein dediziertes `TELEGRAM_WEBHOOK_URL` gesetzt war. Steht davor eine Auth-Middleware (z. B. Authelia), antwortet die Route mit 401 — Telegram konnte den Bot daher nicht erreichen, gleichzeitig blieb Long-Polling deaktiviert. Fallback auf `FRONTEND_URL` entfernt: ohne explizite `TELEGRAM_WEBHOOK_URL` läuft der Bot jetzt im Polling-Modus.

---

## [v3.4.1] - 2026-05-26

### Neu

- **Monta für alle Fahrzeuge**: Monta-Integration nicht mehr auf Dienstwagen beschränkt. Privatfahrzeuge sehen Heim-Ladesessions (🏠-Badge, Monta-Sync); Kostenabrechnung (PDF, Erstattungsvorlage, Betrag-Spalten) bleibt Dienstwagen vorbehalten.
- **Wizard-Restart-Button**: Abschluss-Seite des Admin-Setup-Assistenten bietet nach Telegram-Konfiguration eine In-App-Schaltfläche zum Container-Neustart inkl. 12-Sekunden-Countdown und automatischem Seitenreload.
- **Admin-Einstellungen**: Monitoring-, Backup- und Externe-API-Sektionen (OCM, HERE Maps) aus der System-Seite in Admin-Einstellungen verschoben (gehören inhaltlich dorthin).

### Behoben

- **Profil-Seite blank**: fehlender `usePrefsStore`-Import führte zu leerem Profil (Regression aus v3.4.0).
- **VAPID-Fehlermeldung**: technische Fehlermeldung `VAPID-Key nicht konfiguriert (Admin: .env setzen)` durch benutzerfreundlichen Text ersetzt (Profil + Einstellungen).
- **Telegram-Fehlermeldung**: gleicher Fix für nicht konfigurierten Telegram-Bot.
- **`generateVAPIDKeys is not a function`**: `web-push` ESM-Export liefert die Funktion auf `default`, nicht als Named-Export — Fallback-Muster behebt den Fehler beim Key-Generieren im Admin-UI.

### Technisch

- `POST /api/system/container-restart` — neuer Endpoint (Admin, audit-logged); sendet 200 bevor `process.exit(0)` nach 400 ms aufgerufen wird; Docker `restart: unless-stopped` startet den Container neu.
- `docker-compose.prod.yml`: `backend/src/routes/system.js` als Volume-Mount hinzugefügt (verhindert Überschreiben durch Image-Updates, analog zu `demo.js`).

---

## [v3.4.0] - 2026-05-25

### Neu - Admin-Konfiguration via UI

- Tesla Fleet-API Zugangsdaten via Admin-UI setzbar (kein .env-Bearbeiten mehr noetig)
- VAPID-Keys fuer Web Push direkt im Browser generierbar
- Telegram Bot Token via UI konfigurierbar
- Grok/xAI API Key via UI setzbar
- ABRP Global App-Key via UI setzbar
- Neuer configService.js: liest aus tenant_settings (DB), faellt auf .env zurueck

### Neu - Admin-Setup-Assistent

- AdminSetupWizard.vue: gefuehrt durch alle System-Konfigurationen
- Wizard-Split: Admin-Setup-Assistent (System) vs. persoenlicher Wizard (Nutzer)

### Geaendert

- Fahrerverwaltung aus Profil in Admin-Einstellungen verschoben
- Geofences aus Profil in Admin-Einstellungen verschoben

### Technisch

- teslaApi.js, telemetryConfig.js: DB vor .env fuer Tesla-Credentials
- notifications.js, serviceReminders.js: DB vor .env fuer VAPID
- grokService.js: DB vor .env fuer xAI-Key
- abrpService.js: DB vor .env fuer ABRP-Key
- telegramBot.js: liest Token beim Start aus tenant_settings

---

## [v3.3.3] — 2026-05-24

### Neu — Benachrichtigungen: Web Push + Telegram Bot

- **Zentraler Benachrichtigungs-Dispatcher** (`services/notifyService.js`) — ein einziger `notify()`-Aufruf sendet gleichzeitig an alle konfigurierten Kanäle (Web Push + Telegram). Jeder Kanal schlägt unabhängig fehl ohne den anderen zu blockieren.
- **Telegram-Bot** (`services/telegramBot.js`, `routes/telegram.js`):
  - Bot via `@BotFather` erstellen → `TELEGRAM_BOT_TOKEN` in `.env` setzen
  - **Verknüpfungsflow**: Einstellungen → Benachrichtigungen → Code erzeugen → `/start <CODE>` im Telegram
  - **Bot-Befehle**: `/status` (Batterie, km, Schloss), `/battery` (SoC-Details), `/trips` (letzte 5 Fahrten), `/unlink`, `/help`
  - **Webhook + Polling**: Webhook-Modus wenn `TELEGRAM_WEBHOOK_URL` gesetzt (empfohlen); automatischer Fallback auf Long-Polling
  - Multi-Tenant: Ein Bot für alle Mandanten; `chat_id → tenant_id + user_id` über master DB
- **Web Push** (`routes/notifications.js`, Service Worker bereits integriert):
  - Nutzerbasierte Subscriptions ergänzen die fahrzeugbasierten
  - VAPID-Keys einmalig generieren: `docker exec <backend> npx web-push generate-vapid-keys`
  - Pro Gerät abonnieren/deabonnieren; Test-Button sendet sofortige Benachrichtigung
  - iPhone/iPad: Benachrichtigungen werden automatisch auf der **Apple Watch** gespiegelt
- **Wächter-Modus-Alarm** — wenn der Wächter-Modus aktiviert wird während kein Nutzer anwesend ist, erscheint sofort ein `🚨 Wächter-Alarm — Fahrzeug möglicherweise berührt` auf allen Kanälen
- **Ereignis-Einstellungen** — pro Nutzer konfigurierbare Schalter für: Ladeende, Akku-Warnung, Wächter-Alarm, Neue Fahrt, Fahrtenbuch-Erinnerung
- **Einstellungs-UI** (`Settings.vue`) — neuer Abschnitt „🔔 Benachrichtigungen" mit Web-Push-Verwaltung, Telegram-Verknüpfungs-Assistent und Ereignis-Checkboxen
- **Datenbank** (`master-schema.sql`): neue Tabellen `telegram_links`, `telegram_link_codes`, `user_push_subscriptions`
- **`.env.example`** mit `TELEGRAM_BOT_TOKEN` und `TELEGRAM_WEBHOOK_URL`

---

## [v3.3.2] — 2026-05-24

### Neu
- **Fahrtenbuch — Im Tesla öffnen** (`Fahrtenbuch.vue`) — Neuer Button „🚗 Im Tesla öffnen" erstellt eine Pair-Session mit `redirect=/fahrtenbuch` und zeigt ein Modal mit QR-Code und direktem Link. Der Tesla-Browser öffnet die URL, der Nutzer authentifiziert sich per Passkey direkt im Tesla-Browser (WebAuthn/FIDO2) und landet sofort im Fahrtenbuch — kein separates Gerät zum QR-Scannen notwendig. Das Modal auf dem sendenden Gerät zeigt bei erfolgreicher Anmeldung einen Erfolgs-State.
- **Pair Self-Authentication** (`PairLogin.vue`) — Nach erfolgreicher Passkey-Bestätigung ruft das bestätigende Gerät (z. B. Tesla-Browser) sofort `/pair/poll/:token` auf, um seinen eigenen JWT und Refresh-Token-Cookie zu erhalten, und navigiert dann zum konfigurierten `redirectPath`. Bisher bestätigte `/pair/<token>` die Session nur für ein anderes Gerät, das pollt.
- **Pair-Sessions mit Weiterleitungspfad** (`backend/routes/pair.js`) — `/pair/init` akzeptiert jetzt den optionalen Query-Parameter `?redirect=<path>` (validiert: muss mit `/` beginnen, nicht `//`, max. 200 Zeichen). Wird in `pair_sessions.redirect_path` gespeichert (Spalte via `ALTER TABLE … ADD COLUMN` nachgerüstet) und von `/pair/info/:token` sowie `/pair/poll/:token` zurückgegeben.
- **Copy-Icon** (`lib/icons.js`) — Neues SVG-Icon `copy` (Zwischenablage) für alle `AppIcon`-Verwendungen verfügbar.

### Verbessert
- **PairLogin.vue** — Zeigt das konfigurierte Weiterleitungsziel vor der Authentifizierung an. Nach erfolgreicher Self-Auth erscheint eine pulsierende „Weiterleitung…"-Meldung vor der Navigation.

---

## [v3.3.1] — 2026-05-24

### Behoben
- **Ladestationen-Suche — stille Fehler behoben** — Alle Fehlerzustände (Adresse nicht gefunden, fehlender OpenChargeMap-API-Key, Netzwerkfehler) zeigen jetzt ein sichtbares, erklärendes Banner statt einer leeren Ergebnisliste. Bei fehlendem API-Key erscheint ein direkter Link zu Admin → System zur Konfiguration.
- **Geolokalisierungs-Fehlerbehandlung** — Verweigert der Browser den Standortzugriff, erscheint ein sichtbarer Fehlerstate statt stillschweigendem Abbruch.

### Navigation neu strukturiert
- **„Übersicht" → „Fahrzeug"** — Die erste Navigationsgruppe wird umbenannt und spiegelt klar ihren Inhalt wider (Live-Fahrzeugstatus).
- **„Auswertungen" bereinigt** — Automationen und Ladestationen entfernt; verbleiben nur Datenauswertungen: Fahrten, Fahrtenbuch, Laden, Energiebericht, Schlaf-Monitor, Klimastatistiken, Betriebsbuch, Abrechnung, Export.
- **Neue Gruppe „Planung"** — Routenplaner, Ladestationen, Automationen und Grok-KI hier zusammengeführt. Alle sind aktions- und zukunftsorientierte Tools.
- **„KI"-Gruppe entfällt** — Grok ist unter „Planung" logisch besser aufgehoben.
- Alle 6 Locales mit neuen Gruppenbezeichnungen aktualisiert (`group_vehicle`, `group_plan`).
- Handbuch in allen 6 Sprachen aktualisiert: neue Desktop-Navigationstabelle, aktualisierte Mobile-Tab-Bar-Beschreibung, neue eigenständige Abschnitte für Ladestationen-Suche und Automationen.

---

## [v3.3.0] — 2026-05-24

### Verbessert
- **Mobile UX — iPhone / Android** — NavBar wird auf kleinen Bildschirmen ausgeblendet; die bestehende MobileTabBar enthält jetzt in einem iOS-typischen Bottom-Sheet („Mehr") auch Settings, Handbuch, Fahrzeugauswahl und Logout. Safe-Area-Insets (`env(safe-area-inset-*)`) verhindern, dass Inhalte hinter Notch und Home-Indicator verschwinden. Settings-Sektionen sind auf Mobile beim ersten Aufruf standardmäßig zugeklappt, um endloses Scrollen zu vermeiden.
- **Touch-Targets nach HIG** — Climate-Keeper-Buttons, Sitzheizungs-Pads und Temperatur-±-Buttons sind auf Mobile per responsiven Tailwind-Klassen auf mindestens 44 × 44 px vergrößert. iOS-Formulareingaben werden auf `font-size: 16px` gezwungen, um den automatischen Zoom zu unterdrücken.
- **Bundle-Größe −57 %** — Alle 25+ View-Imports auf Lazy `() => import()` umgestellt. Schwere Vendor-Bibliotheken (Leaflet, Chart.js, jsPDF, vue-i18n, marked, DOMPurify) via Vite `manualChunks` in separat gecachte Chunks ausgelagert. Ergebnis: 2,3 MB → 1,0 MB roh, ~670 KB → ~257 KB gzip.
- **Leaflet-CSS Lazy-Loading** — `leaflet/dist/leaflet.css` ist nicht mehr Teil des globalen Bundles; es wird dynamisch innerhalb von `LocationHeatmap.vue` importiert, wenn die Karten-Ansicht erstmals besucht wird.

### Neu
- **Hygiene-Check-Skript** (`scripts/hygiene-check.sh`) — 7-stufiger Systemcheck: Docker, Node, Disk, npm audit (Frontend + Backend), Bundle-Größe, `.env`-Vollständigkeit, Docker-Container-Gesundheit, SQLite-Integrität und SSL-Zertifikats-Ablauf. Flags: `--fix` (Images automatisch bereinigen, `npm audit fix` ausführen), `--ci` (keine Farbe, Exit 1 bei Fehlern). Wird am Ende von `deploy/setup.sh` automatisch aufgerufen.
- **Nächtliche Hygiene-Automatisierung** — `nightlyMaintenance.js` führt jetzt jede Nacht um 03:30 Europe/Berlin Docker-Image-Bereinigung, npm audit (kritische Befunde werden in das Tenant-Audit-Log geschrieben) und Bundle-Größen-Check durch. Ergebnisse sichtbar unter Admin → System → Wartung.
- **CI-Sicherheitsgates** — GitHub Actions führt `npm audit --audit-level=high` für Frontend und Backend als blockierenden Merge-Gate aus. Bundle-Größe wird nach jedem Build gemessen (Warnung > 800 KB, Block > 1,5 MB); Ergebnisse erscheinen in der PR-Step-Summary.
- **Dependabot** — Automatische wöchentliche npm-Dependency-PRs für `/frontend` und `/backend`; monatliche GitHub-Actions-Updates. Patch/Minor-Updates werden gruppiert; Major-Updates als einzelne PRs zur manuellen Prüfung.

### CI / Infrastruktur
- **`chunkSizeWarningLimit: 800`** in `vite.config.js` — Vite warnt jetzt lokal, wenn ein Chunk 800 KB überschreitet, passend zur CI-Schwelle.

---

## [v3.2.0] — 2026-05-22

### Neu
- **CO₂-Vergleich im Energiebericht** — Neuer Abschnitt zeigt Tesla-CO₂-Verbrauch vs. Diesel-Äquivalent, eingesparte Tonnen CO₂ sowie den Strommix-Faktor des deutschen Netzes (0,38 kg/kWh). Pro Woche werden CO₂-Einsparungen im Trend-Chart eingeblendet.
- **Wetter-Verbrauchskorrelation** — Temperatur-Balkendiagramm im Energiebericht: Durchschnittsverbrauch in 6 Temperatur-Buckets (< −10 °C bis > 30 °C). Zeigt wie Kälte und Hitze den Verbrauch beeinflussen. Neuer Backend-Endpoint `GET /api/trips/weather-consumption`.
- **Firmware-Update-Tracker** — Neue Tabelle `firmware_versions` speichert automatisch jede neue Softwareversion des Fahrzeugs beim Sync. Verlauf aller Updates (Datum, Version, Installationsdauer) in Admin → System sichtbar.
- **Klimastatistiken** — Neue Seite `/climate` mit täglicher Auswertung: Klimaanlagennutzung (Stunden), Sitzheizung Fahrer/Beifahrer, Vorklimatisierungen, kältester/wärmster Tag. Datenerfassung läuft automatisch bei jedem Fahrzeug-Sync via `hvac_daily_stats`-Tabelle.
- **Community Benchmark** (opt-in) — Anonymer Verbrauchsvergleich mit anderen Tesla-Fahrern desselben Modells. Opt-in per Toggle; Beiträge werden als SHA-256-gehashte Instance-UUID gespeichert, nie als Klardaten. k-Anonymität: mindestens 3 Teilnehmer nötig. Bandbreite P25–P75 sichtbar. Jederzeit widerrufbar.

### Verbessert
- **Bundle-Cache-Busting repariert** — Vite-Entry-Bundle bekam immer den Namen `index-local.js` (kein `.git` im Docker-Build-Context), was vom nginx `immutable`-Cache für 1 Jahr eingefroren wurde. CI übergibt jetzt `GIT_HASH` als `--build-arg`; jeder Deploy erzeugt `index-<7charHash>.js` als neuen, eindeutigen Dateinamen.

---

## [v3.1.5] — 2026-05-18

### Sicherheit
- **Argon2id ersetzt bcrypt für Passwort-Hashes** — Neue Passwörter und Passwort-Änderungen verwenden jetzt Argon2id (t=3, m=64 MB, p=4 — OWASP-Empfehlung 2024). Bestehende bcrypt-Hashes bleiben gültig und werden beim nächsten erfolgreichen Login transparent migriert. Kein manuelles Eingreifen nötig.
- **Encryption-Key von Datenbankdateien trennbar** — Der AES-256-GCM-Schlüssel kann jetzt über `ENCRYPTION_KEY_B64` (Umgebungsvariable, außerhalb von `data/`) oder als Docker Secret übergeben werden. Bestehende `data/.encryption-key`-Installationen funktionieren weiterhin unverändert.
- **Refresh-Tokens bei Passwort-Änderung invalidiert** — Nach einer Passwort-Änderung werden alle aktiven Sessions des Benutzers sofort beendet. Ein zuvor gestohlener Refresh-Token überlebt das Passwort-Reset nicht mehr.
- **Refresh-Tokens bei Benutzer-Löschung / Deaktivierung invalidiert** — Wenn ein Admin einen Benutzer löscht oder deaktiviert, werden dessen aktive Sessions sofort beendet.
- **`Permissions-Policy`-Header ergänzt** — Browser sperren Kamera, Mikrofon, Geolocation, Payment, USB und Bluetooth für die App.

---

## [v3.1.4] — 2026-05-18

### Behoben
- **Passkey-Anmeldung nach Update auf simplewebauthn v10** — Vier Breaking-Changes in der Library-API wurden behoben: Challenge wird jetzt als base64url-String statt als Uint8Array in der DB gespeichert; `excludeCredentials[].id` muss ein String sein (kein Buffer); `credentialID` aus `registrationInfo` ist Uint8Array und wird korrekt konvertiert; der Parameter `authenticator` in `verifyAuthenticationResponse` wurde auf `credential` umbenannt (mit `publicKey` statt `credentialPublicKey`). Passkeys konnten seit dem v10-Upgrade weder registriert noch verwendet werden.
- **Passkey-Platzhalter im Legal-Viewer korrekt dargestellt** — `<<NAME>>` und ähnliche ungefüllte Platzhalter in Impressum / Datenschutz wurden durch den HTML-Parser zu `<>` verstümmelt. Fix: die `<<`-Zeichen werden vor dem Markdown-Render als HTML-Entities kodiert (`&lt;&lt;NAME&gt;&gt;`).

### Geändert
- **Vollbackup enthält jetzt `passkey_credentials`** — Die Tabelle fehlte bisher in `BACKUP_TABLES`. Passkeys überleben damit einen JSON-Restore auf demselben Server (WebAuthn ist domain-gebunden; ein Restore auf eine andere Domain erfordert weiterhin eine neue Registrierung).

---

## [v3.1.3] — 2026-05-17

### Neu
- **ICS-Kalenderexport im Routenplaner** — Geplante Routen können als `.ics`-Datei heruntergeladen und in beliebige Kalender-Apps importiert werden. Der Export enthält Abfahrt, Ankunft, Zwischenladestopps und einen Hinweis auf die Kalender-„Privat"-Einstellung für geteilte Kalender. Datenschutzklasse `CLASS:PRIVATE` wird automatisch gesetzt.
- **Verbesserter Reifendruck-View (TireMap)** — Neuer SVG-Fahrzeug-Top-Down-View mit farbkodierten Reifen (grün / gelb / rot) und Glow-Effekt je nach Drucklevel. Legende und Tooltip mit Volltext-Bezeichnung pro Reifen.
- **Layout-Toggle in der Fahrzeugsteuerung** — Nutzer können zwischen Kachel-Layout und kompakter Listenansicht wechseln. Einstellung wird per `localStorage` gespeichert.
- **Rekuperationsstatistik in Fahrtdetails** — Zeigt rückgewonnene kWh, Rekuperationsanteil in % und Netto-Verbrauch nach Rekuperation. Berechnung via SQLite `LEAD()`-Fensterfunktion auf `trip_points.power_kw < 0`.

### Verbessert
- **Touch-Dropdowns im Tesla-Infotainment-Browser** — `e.stopPropagation()` auf Trigger-Klick verhindert sofortiges Schließen durch den Document-Listener; `touch-action: manipulation` eliminiert 300 ms Tap-Verzögerung in NavGroup und LangSwitcher.
- **Setup: nginx optional** — `deploy/setup.sh` fragt zu Beginn nach dem Deployment-Modus (Direct / Proxy). Modus 2 überspringt nginx/certbot-Installation und -Konfiguration vollständig — kein Konflikt mehr mit bestehenden Reverse-Proxy-Setups (z. B. WireGuard + VPS-nginx).
- **`TESLA_AUTH_BASE` ergänzt** — Variable wird von `setup-wizard.sh` automatisch in die `.env` geschrieben und ist in `.env.example` dokumentiert. `telemetryConfig.js` hat jetzt einen Fallback-Wert für Bestandsinstallationen.

### CI / Infrastruktur
- **Docker-Images in CI vorgefertigt (GHCR)** — Backend- und Frontend-Images werden jetzt als Multi-Arch-Build (amd64/arm64/arm/v7) in GitHub Actions gebaut und nach `ghcr.io/knevs/tesla-carview` gepusht. Der Server führt nur noch `docker pull + up` aus — keine lokale Kompilierung (node-gyp / better-sqlite3) mehr. Deploy-Dauer: ~3 min statt 10–37 min.
- **Deploy via `workflow_run`** — Deploy startet erst nach erfolgreichem CI-Abschluss; garantiert, dass die GHCR-Images existieren, bevor der Server sie zieht.
- **GitHub Actions auf Node.js 24 aktualisiert** — `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `docker/build-push-action` auf aktuelle Hauptversionen gehoben; Deprecation-Warnungen für Node.js 20 entfernt.

---

## [v3.1.2] — 2026-05-17

### Neu
- **SMTP / E-Mail-Konfiguration im Wizard und Admin-UI** — E-Mail-Versand (Nodemailer) wird direkt in Admin → System oder im Monitoring-Schritt des Setup-Wizards konfiguriert. Kein serverseitiges `msmtp` mehr nötig; alle SMTP-Parameter (Host, Port, Benutzer, Passwort, Absenderadresse) werden in der Tenant-Datenbank gespeichert. Ein Test-Mail-Button bestätigt den Versand sofort.
- **Anthropic-API-Key im Wizard und Admin-UI** — Der Key für das KI-gestützte autonome Monitoring (autofix-ai / Claude Haiku) kann jetzt in Admin → System → Monitoring oder im Monitoring-Schritt des Wizards eingetragen werden. Vorher war direkter Serverzugriff nötig.

### Sicherheit
- **Git-Historie bereinigt** — Instanzspezifische Betreiber-Identität, Firmenname aus Demo-Fixtures und interne Betriebsdokumentation wurden aus beiden Repository-Historien via `git filter-repo` entfernt. Alle instanzspezifischen Werte (Domain, Repo-Namen, E-Mail-Adressen, Docker-Volume-Name) liegen jetzt ausschließlich in der gitignorierten `heal.conf` — das öffentliche Repo enthält in keinem Commit persönliche Daten.

---

## [v3.1.1] — 2026-05-16

### Neu
- **Einheitenpräferenzen in allen Views** — `useUnits()` greift jetzt in allen 9 Ansichten (Dashboard, Fahrten, Fahrtdetail, Batterie, Energy-Report, Steuerung, Telemetry, Fahrtenbuch, Routenplaner); Distanz (km/mi), Temperatur (°C/°F) und Effizienz (kWh/100km, Wh/km, mi/kWh) richten sich nach den Nutzereinstellungen. Ausnahme: Fahrtenbuch-Odometerwerte bleiben aus rechtlichen Gründen (BMF/§31a EStG) immer in km.
- **Griechische Wiki-Seiten vervollständigt** — `EL-First-Login.md` neu erstellt (vollständige Übersetzung inkl. 16-Schritt-Wizard-Tabelle, MFA, QR-SSO-Tipp); `EL-Features.md` um Tarif-Widget-Abschnitt ergänzt; Sidebar und Home aktualisiert.

### Verbessert
- **Dynamische System-Hygiene (heal.sh + host-watch.sh)** — Selbstheilung übernimmt jetzt vollautomatische Betriebspflege: Swappiness wird proportional zur RAM-Größe berechnet und bei jedem Lauf geprüft/korrigiert; Swap-Flush wenn sicher (20%-Puffer); Container-Speicherlimits via `docker update` (Backend 30% RAM, Frontend/Nginx je 5% RAM); stündlich: Docker-Cleanup (dangling Images, Build-Cache > 24 h, anonyme Volumes), Journal-Vacuum (2% Disk), /tmp-Bereinigung (> 7 Tage). Alle Schwellwerte werden zur Laufzeit aus Host-Eigenschaften berechnet — kein hardcodierter Wert.
- **Host-Alerts privat** — Monitoring-Alerts werden per E-Mail versandt statt als öffentliche GitHub-Issues (verhindert Leakage privater Serverdaten).

---

## [v3.1.0] — 2026-05-16

### Neu
- **Vollständiger Onboarding-Wizard** — der In-App-Einstellungs-Assistent wurde von 8 Präferenz-Schritten auf 17 vollständige Setup-Schritte erweitert (Admins erhalten 6 kritische neue Schritte)
- **Tesla OAuth im Wizard** — Button öffnet Tesla-Login in Popup; PostMessage-Listener schließt das Fenster und aktualisiert den Status automatisch
- **Fahrzeug-Sync im Wizard** — Fahrzeuge werden direkt aus dem Assistenten heraus synchronisiert, mit Echtzeit-Feedback
- **Virtual-Key-Schritt** — Status aus `/telemetry/status`, Registrierungs-URL kopierbar + direkt öffnbar, Status-Refresh-Button
- **Fleet-Telemetry-Schritt** — pro Fahrzeug: farbige Status-Badges (live / idle / not_registered / approval_missing / error) + direkter Konfigurieren-Button
- **Strompreis-Schritt** — pro Fahrzeug konfigurierbar, wird beim finalen Confirm gespeichert
- **Legal-Check-Schritt** — scannt automatisch alle 18 Scope×Locale-Kombinationen auf `<<Platzhalter>>`; Link zum Editor bei offenen Punkten
- **i18n vollständig** — alle 6 Sprachen (DE/EN/FR/ES/TR/EL) mit je 63 neuen Schlüsseln für die Wizard-Schritte

### Schritt-Reihenfolge (Admin)
`Sprache → Tesla OAuth → Fahrzeuge → Virtual Key → Fleet Telemetry → Strompreis → Legal → Externe APIs → Monitoring → Design → Farbe → Einheiten → Dashboard → Navigation → Benachrichtigungen → Zusammenfassung`

---

## [v3.0.0] — 2026-05-15

### Major Milestone — Car Usability Management

Tesla Carview wächst mit v3.0 zum vollständigen **Car Usability Management**-System:
weit mehr als ein Datenlogger — eine ganzheitliche Plattform für Fahrzeugnutzung,
Betriebsführung, Kostenmanagement und Reiseplanung.

### Neu in v3.0
- **Plattform-Rebranding** — Tesla Carview wird zum Car Usability Management System; neue Beschreibung in allen Dokumenten und Sprachen
- **Demo-Sandbox** — öffentliche Testumgebung mit echtem UI und synthetischen Fahrzeugdaten; 2-Tage-Testaccount; erreichbar über `demo.teslaview.krische.com`
- **Benutzerverwaltung** — Self-Delete-Guard (eigener Account nicht löschbar), Löschen-Button klar als destruktive Aktion gekennzeichnet
- **Deploy-Pipeline** — Private-Overlay-Dateien werden vor `git pull` zurückgesetzt und danach automatisch wieder eingespielt; kein manueller Eingriff nötig

### Vollständig: alle Features aus v2.0–v2.4
Multi-Tenancy, Routenplaner mit SoC-aware Ladeplanung, Routenvermeidung (Valhalla), Passkey/WebAuthn + QR-SSO für Tesla-Browser, Einstellungs-Wizard, dynamisches Dashboard, Legal-Layer (Imprint/Datenschutz/AGB mit Akzept-Tracking), 6 Sprachen (DE/EN/FR/ES/TR/EL), Monitoring & Selbstheilung, OCM-Ladestation-Overlay, HERE Maps Verkehr, Sleep Monitor, Energy Report, Automationen, Betriebsbuch, Fahrtenbuch (BMF-konform), Kostenabrechnung, Web-Push, Verschlüsselung at rest.

---

## [v2.4.0] — 2026-05-15

### Neu
- **Routenvermeidung** — Routenplaner kann Autobahnen, Mautstraßen und Fähren meiden; Routing über Valhalla public API (OSRM unterstützt das nicht); Einstellung wird persistent im Browser gespeichert; bei Valhalla-Ausfall automatischer Fallback auf OSRM mit Hinweis
- **OpenChargeMap API-Key-Verwaltung** — OCM-Schlüssel direkt in Admin → System eintragen, einsehen (maskiert) und löschen; kein SSH-Zugang nötig; Toast-Hinweis bei fehlendem Key enthält Direkt-Link zu den Einstellungen; Registrierungs-Links direkt in der UI
- **Monitoring & Selbstheilung** — Cron-Job `heal.sh` prüft alle 15 min Container-Status und `/api/health`; bei Ausfall automatischer Neustart; optionaler E-Mail-Alert; Konfiguration (Alert-E-Mail, Selbstheilung an/aus) über Admin → System; Heal- und Security-Logs direkt in der Admin-UI einsehbar

### Verbessert
- **System-Health** — 8 Checks statt 5; OCM- und HERE-Maps-Status mit Live-HTTP-Probe; optionale Services erscheinen als `info`-Eintrag (gedimmt, kein Fehler wenn nicht konfiguriert), mit Direkt-Link „Einrichten →" zum API-Schlüssel-Abschnitt
- **update.sh** — stabiler Deploy-Ablauf: explizit Stop → Prune → Up statt `up --build` allein (verhindert Container-Name-Konflikte bei schnellen Redeploys)

---

## [v2.3.0] — 2026-05-14

### Neu
- **SoC-aware Ladeplanung** — Routenplaner plant intelligente Ladestopps mit Zeitschätzung; Abfahrts-SoC auto-befüllt aus Live-Fahrzeugdaten (Ad-hoc) oder manuell eingebar (geplante Abfahrt); konfigurierbarer Ziel-SoC am Zielort und Ladeziel je Ladestopp
- **Routenplaner-Layout** — linke Spalte scrollbar + sticky, Map bleibt immer sichtbar; Sektionsreihenfolge optimiert (Timing / Laden vor Wegpunkten)
- **Einstellungen kollabierbar** — alle 17 Sektionen der Einstellungsseite per Klick ein-/ausklappbar via SortableSection
- **Demo-Dienstfahrzeug** — Demo-Mandanten erhalten automatisch ein zweites Fahrzeug (category=company, Model 3) mit 15 Tagen Geschäftsreisen für die Abrechungs-Demo
- **Fahrzeugtechnik Demo-Daten** — DEMO-Fahrzeuge liefern plausible Fake-Telemetrie ohne Tesla-API-Aufruf
- **Standort-Heatmaps** — Leaflet-Kacheln laufen jetzt über den Backend-Tile-Proxy (kein CSP-Block mehr)
- **Abschnitte standardmäßig ausgeklappt** — neues localStorage-Profil: alle Sections auf allen Seiten initial expanded

### Verbessert
- **i18n** — neue SoC-Schlüssel (departureSocLabel, minArrivalSocLabel, chargeToLabel, chargeToTip) in allen 6 Sprachen (de/en/fr/es/tr/el)
- **SortableSection** — neues sortable-Prop versteckt Drag-Handle, wenn Sektion nicht umsortierbar ist

---

## [v2.2.0] — 2026-05-14

### Neu
- **QR-SSO-Login für Tesla-Browser** — Tesla-Display-Browser zeigt QR-Code; Nutzer scannt mit Smartphone, authentifiziert per Passkey/Face ID → Session wird automatisch auf den Tesla-Browser übertragen. Kein WebAuthn nötig im Tesla-Browser.
- **Routenplaner** — Kartenansicht korrigiert (Leaflet CSS jetzt statisch importiert), OSRM-Routing (echte Straßenrouten, kostenlos), Ladestation-Overlay via OpenChargeMap, Ankunfts-SoC-Schätzung aus eigenen Fahrtdaten, ABRP nur noch als optionaler Link
- **Einstellungs-Wizard** — 8-stufiger Wizard (Sprache, Design, Farbe, Einheiten, Dashboard-Karten, Navigation, Benachrichtigungen, Zusammenfassung), re-launchbar aus Einstellungen, Draft-Modus bis zur finalen Bestätigung
- **Dynamisches Dashboard** — Karten-Sichtbarkeit und -Reihenfolge aus Benutzerpräferenzen; serverseitig gespeichert (cross-device sync)
- **Präferenzen-API** — `GET/PATCH /api/users/me/preferences` (Partial-Merge), `users.preferences` JSON-Spalte pro Tenant, 800ms Debounce-Sync im Store

### Verbessert
- **Passkey-Login** — `/api/passkey/login-options` akzeptiert jetzt sowohl `tenantSlug` als auch `tenantId`
- **Neue Icons** — `qr-code`, `warning`, `fingerprint` in AppIcon-Bibliothek

---

## [v2.1.0] — 2026-05-14

### Neu
- **GitHub Wiki** — umfangreiches, laienverständliches Wiki mit 16 Seiten (Installation, Netzwerkzugang, Raspberry-Pi-Speicher, Sicherheit, Backup, Troubleshooting u.v.m.) Automatische Synchronisation aus dem Repo bei jedem Push
- **Tesla Model Y Favicon** — Seitenprofilsilhouette als App-Icon in allen Browsern, als PWA-Icon und iOS-Home-Screen-Icon (ersetzt Blitz-Platzhalter)
- **Netzwerk-Anleitung für Laien** (`docs/14-network-access`) — DynDNS, Cloudflare Tunnel, FritzBox-Setup, CG-NAT-Erkennung, VPS-Optionen mit Entscheidungsbaum
- **Raspberry-Pi-Speicher-Anleitung** (`docs/15-raspberry-pi-storage`) — USB-SSD, NVMe M.2 HAT+, PXE-Boot, Samsung-T7-Quirk-Fix, Migrationsleitfaden von SD-Karte
- **InfoTip-Komponente** — globale `<InfoTip text="…" />`-Komponente für Inline-Erläuterungen (ⓘ-Icon mit Hover-Tooltip)
- **Benutzerhandbuch Wiki-Hinweis** — alle 6 Sprachversionen des In-App-Handbuchs verweisen auf das GitHub Wiki
- **Eingeloggt-bleiben-Option** — „Remember me"-Checkbox im Login setzt 90-Tage-Session (statt 7 Tage Standard)

### Verbessert
- **Usability** — umfassende Tooltip-Abdeckung in Fahrtdetail, GrokChat, Fahrtenbuch, Logbuch, Benutzerverwaltung und weiteren Ansichten
- **Login-Seite** — für Tesla-Touchscreen optimiert (größere Eingabefelder, kein QR-Code-Umweg)
- **Favicon** — Ersetzte Lightning-Bolt-Platzhalter durch Tesla Model Y Silhouette

### Entfernt
- **QR-Pair-Login** — Komplettes Entfernen des QR-Code-basierten Geräte-Logins (technisch nicht sinnvoll; Tesla-Browser hat Touchscreen-Tastatur)

---

## [v2.0.0] — 2026-05-12

### Neu
- **Multi-Mandanten-Architektur** — vollständige Datenisolierung, eigene SQLite-DB pro Mandant
- **Einladungslinks** — neuer Mandant nur per Einladungslink (7 Tage, einmalig, mit optionaler Notiz)
- **Mandanten-Pseudonym** — datenschutzkonformer Login-Identifier statt Klarname, Admin-regenerierbar
- **Passwortloses sudo via SSH-Agent** — `pam_ssh_agent_auth` für deploy-sicheres Rechtekonzept
- **AES-256-GCM Encryption at rest** — Tesla-OAuth-Token, TOTP-Secrets, Virtual-Key per AES-GCM verschlüsselt
- **Audit-Log** — Admin-Viewer für sicherheitsrelevante Ereignisse (CSV-Export, DSGVO-konform)
- **Fleet Telemetry Primär** — WebSocket-Streaming als bevorzugte Datenquelle, spart >95 % API-Budget
- **Vollbackup + Restore** — JSON-Export aller Tabellen, sicherheits-aware Restore mit Vor-Backup
- **GitHub Actions CI/CD** — gitleaks, OWASP-Dependency-Check, Auto-Deploy via SSH

### Verbessert
- Poller schaltet bei aktivem Fleet-Telemetry auf 1×/h-Heartbeat
- Automatische Nacht-Wartung (WAL-Checkpoint, VACUUM, Auto-Update)
- Service-Worker + PWA-Auto-Update — kein manueller Browser-Reload mehr

---

## [v1.x] — Frühere Versionen

Die initiale Einzelmandanten-Version enthielt:
- Dashboard, Fahrten, Laden, Batterie, Technik-Telemetrie
- Fahrtenbuch (BMF-konform) inkl. PDF-Export
- Steuerung (Klima, Türen, Laden, Sentry, Navigation)
- Wartungsintervalle + Betriebsbuch
- Push-Benachrichtigungen (Web Push)
- Mehrsprachigkeit (DE/EN/FR/ES/TR/EL)
- aWattar + Tibber-Integration (Dynamischer Tarif)
- Installierbare PWA (iOS, Android, Tesla-Browser)

---

*Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/). Breaking changes → Major, neue Features → Minor, Bugfixes → Patch.*

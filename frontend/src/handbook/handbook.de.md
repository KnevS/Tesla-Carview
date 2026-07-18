# 📖 Tesla Carview Handbuch

Self-Hosted · Multi-Tenant

> ℹ️ **Hinweis für Administratoren und Self-Hoster:** Dieses Handbuch beschreibt die App aus Benutzersicht. Themen wie Installation, ENV-Variablen, Backup/Restore-Workflows, nächtliche Wartung oder das Aktivieren des Demo-Modus sind in der **technischen Dokumentation** im [`docs/`](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.md)-Ordner des Repositorys zu finden — insbesondere [10-configuration](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.md) (alle ENV-Optionen) und [11-operations](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.md) (Backup, Wartung, Demo).
>
> 📚 **Neu bei Tesla Carview?** Das **[GitHub Wiki](https://github.com/KnevS/Tesla-Carview/wiki)** bietet einen geführten Einstieg: Schritt-für-Schritt-Anleitungen für Installation, Netzwerkzugang ohne statische IP (DynDNS, Cloudflare Tunnel, FritzBox), Raspberry-Pi-Speicher-Setup (SSD statt SD-Karte) und mehr — verständlich für Nicht-IT-Experten.

## 🌟 Überblick {#overview}

Tesla Carview ist eine **selbst gehostete** Datenlogger-App für Tesla-Fahrzeuge. Alle Daten bleiben ausschließlich auf deinem eigenen Server – keine Cloud, keine Datenweitergabe. Die App ist vollständig **responsive** und läuft auf **iPhone/iPad (Safari)**, Android-Smartphones sowie Desktop-Browsern.

**Funktionen im Überblick:**

- 🚗 **Fahrtenbuch** — GPS-Tracks, Verbrauch, Fahrttyp-Kategorisierung
- ⚡ **Laden** — Ladesessions mit Kosten, GPS-Standort-Erkennung
- 🔋 **Batterie** — Degradations-Tracking, Reichweiten-Verlauf, Ladekurve, Effizienz vs. Temperatur, Phantom-Drain, Anomalie-Erkennung (Companion Phase 1, rein statistisch, lokal)
- 📊 **Dashboard** — Statistiken, monatliche Übersicht, letzte Aktivitäten
- 🗓️ **Wochen-Insights** — Dashboard-Karte „Deine Woche" mit Klartext-Hinweisen zu Fahrleistung, Verbrauch vs. 90-Tage-Schnitt (inkl. Kälte-Begründung), Ladekosten und offenen Auffälligkeiten (v3.30, reine Statistik; optional lokale LLM-Veredelung mit Ollama)
- 🛞 **Reifendruck-Trend** — erkennt langsamen, temperaturbereinigten Druckverlust je Reifen und warnt früh (v3.33)
- 🍃 **Fahrstil-Score** — bewertet die Effizienz deiner Fahrweise gegen den eigenen Schnitt, mit datenbelegten Spartipps (v3.34, reine Statistik)
- 🔌 **Live-Ladekurve** — laufende Ladesession in Echtzeit mit Leistung, Ladestand und Erwartungskurve (v3.35)
- 🎮 **Steuerung** — Klimaanlage, Türen, Licht – direkt aus der App
- 📝 **Betriebsbuch** — Wartungen, Reparaturen, Kosten mit Datum
- 📤 **Export** — CSV/JSON/**PDF** für Fahrten, CSV für Ladungen, Vollbackup als ZIP; PDF-Fahrtenbuch druckfertig mit Datum, Strecke, Verbrauch und SoC
- 🔔 **Benachrichtigungen** — über drei Kanäle parallel: Web Push (Browser/PWA), Telegram-Bot und **E-Mail** (SMTP). Trigger: Ladeende, Wächter-Alarm, niedriger Akku, Wartungsfälligkeit, Geofence u. a. Push mit Action-Buttons (Klima starten, Ladestation finden, später erinnern), Tag-Grouping und Spiegelung auf iPhone/Apple Watch
- 📊 **Wöchentlicher Fahr-Report** — Jeden Montag 07:00 Uhr automatisch per Push/Telegram/E-Mail: km der Woche, Verbrauch, Ladekosten und Trend gegenüber Vorwoche
- 🌱 **CO₂-Bilanz** — eigene Seite, die das eingesparte CO₂ vs. fiktiver Verbrenner berechnet (DE-Strommix vs. 6,5 l/100 km Benzin); Vergleichswerte in Bäumen/Jahr und Flügen Frankfurt–Mallorca
- 📱 **Mobile-optimiert** — Vollständig nutzbar auf iPhone/iPad (Safari), Android und Desktop

## 🔀 Sortierreihenfolge {#sort-order}

In allen Listen mit chronologischen Einträgen (Fahrten, Lade-Sessions, Betriebsbuch-Einträge, Kostenabrechnung, Audit-Events, Benutzer-Liste, Rechtstexte-Versionen) befindet sich oben rechts ein **Sortier-Toggle**. Ein Klick wechselt zwischen:

- ↓ **Neueste zuerst** (Standard)
- ↑ **Älteste zuerst**

Die gewählte Reihenfolge wird **pro Ansicht im Browser gespeichert** (`localStorage`) und überdauert Neuladen und Schließen des Tabs — du kannst sie pro Liste unterschiedlich einstellen (z. B. Fahrtenbuch „neueste oben", Benutzerliste „letzter Login zuletzt").

## ⚠️ Tesla-API-Anbindung Stand 2026 {#tesla-api-2026}

Tesla hat im Mai/Juni 2026 die inoffizielle Owner API für Fahrzeug-Endpoints geschlossen. Wer vorher mit dem Community-Workaround (Refresh-Token aus dem Tesla-Account) lief, bekommt jetzt **HTTP 401 „invalid bearer token"** statt Fahrzeugdaten. Tesla Carview hat daraus zwei klare Konsequenzen gezogen:

### Drei Datenquellen im Überblick

| Quelle | Was du bekommst | Setup-Aufwand | Kosten |
| --- | --- | --- | --- |
| **Tesla Fleet API** | Akku, Klima, GPS-Live, TPMS, Befehle | App-Approval bei [developer.tesla.com](https://developer.tesla.com), Wartezeit Wochen–Monate | meist 0 €/Monat — Tesla gewährt $10 Freikontingent/Account, deckt typischen Privat-Use mit einem Auto + Streaming-Telemetrie. Darüber pay-per-use. |
| **OwnTracks** (Smartphone) | GPS-Track, Trip-Erkennung, Distanz | ~5 Min im Wizard + App-Install | kostenlos |
| **Manuelle Anlage** | Stammdaten ohne API (Fahrtenbuch funktioniert) | < 1 Min im Wizard | kostenlos |

**Wichtig:** alle drei Wege können parallel laufen — OwnTracks gibt dir sofort ein lückenloses GPS-Fahrtenbuch, manuelle Anlage spart das Warten auf den Tesla-Sync, Fleet API ergänzt später Akku- und Klimadaten.

### OwnTracks-Setup (empfohlen, sofort verfügbar) {#owntracks-setup}

1. **Admin-Wizard** → Schritt „Smartphone-GPS (OwnTracks)" → „Neues Gerät anlegen" → Bezeichnung, Fahrzeug, Fahrer wählen.
2. **QR-Code scannen**: nach dem Anlegen wird ein QR-Code angezeigt. Den **mit der nativen iPhone-Kamera** (NICHT mit der OwnTracks-App!) scannen → „In OwnTracks öffnen" → Konfiguration importieren bestätigen.
3. **Standortzugriff auf „Immer"** in den iOS-Einstellungen → OwnTracks. Sonst kein Background-GPS.
4. Sobald der Fahrer schneller als 5 km/h fährt, startet automatisch eine Fahrt. 5 Minuten Stillstand beendet sie wieder.

**Für Endnutzer ohne Admin-Rechte**: jeder Fahrer hat unter „📱 Mein GPS" eine eigene Seite zum Anlegen + QR-Code-Scan — keine Admin-Hilfe nötig.

### Manuelle Fahrzeug-Anlage {#manual-vehicle}

Im Wizard-Schritt „Fahrzeuge" stehen zwei Karten nebeneinander: „☁ Tesla-Sync (Cloud)" und „✍ Manuell anlegen". Die manuelle Variante:

- Funktioniert ohne Tesla-API-Zugriff
- Felder: Bezeichnung (Pflicht), Kennzeichen, VIN (optional — sonst synthetische „MANUAL…"-VIN), Modell, Initial-Kilometerstand
- Anlegender User wird automatisch als Fahrer eingetragen → kann sofort OwnTracks-Device drauf registrieren
- Initial-Kilometerstand landet auch im aktuellen Stand — TCO-Berechnung läuft ab Tag 1

### TCO-Cockpit (Total Cost of Ownership) {#tco-cockpit}

Unter `/tco` siehst du pro Fahrzeug die echten Gesamtkosten und einen ehrlichen €/km-Wert. Vier KPI-Karten:

- **Kosten pro km** — Gesamtkosten ÷ gefahrene km
- **Gesamtkosten** — Summe aller Posten
- **Wertverlust** — Anschaffung − Verkaufspreis (oder geschätzter Restwert: 8 Jahre lineare Abschreibung auf 25 %)
- **Stromkosten** — aus den Lade-Sessions

Detail-Aufschlüsselung darunter mit Anteilen + Service-Records-CRUD (Inspektion, Reifen, Reparatur, HU/AU, Zubehör, sonstiges) + Stammdaten-Form (Anschaffungspreis/-datum, Verkauf, Versicherung, Steuer, Initial-km).

### KI-Assistent: Ollama oder Grok {#ai-provider}

Im Admin-Wizard → „Externe APIs" → KI-Provider:

- **🏠 Ollama** (Default, datensouverän): lokales LLM, läuft auf eigener Hardware. Modell-Empfehlungen je Hardware-Klasse (Pi 4: `llama3.2:1b`, Pi 5: `qwen2.5:3b`, VPS: `llama3:8b`). Modell-Installation aus dem Wizard via SSE-Progress-Bar. **Daten verlassen die Instanz NIE.**
- **☁ Grok** (Cloud): xAI Grok API — schneller, aber jede Anfrage geht an US-Server. xAI-API-Key erforderlich, Tagesbudget-Wächter eingebaut.
- **⊝ Aus**: KI-Chat komplett deaktiviert.

Auf Hosts mit < 4 GB RAM Ollama deaktivieren via `docker-compose.override.yml` mit `services.ollama.profiles: [disabled]`.

### Mein GPS — Self-Service für Fahrer {#mein-gps}

Jeder eingeloggte Nutzer hat unter `/my-tracking` („📱 Mein GPS" in der Navigation) eine eigene Seite:

- Liste der **eigenen** OwnTracks-Geräte (Fahrer sieht nur seine, Admin alle)
- QR-Code für Direkt-Setup, jederzeit erneut abrufbar (kein Verlust-Problem mehr)
- Fahrzeug-Auswahl gefiltert auf Fahrzeuge mit Zugriffsrechten — kein versehentliches GPS-Pushen auf fremde Autos

## 📊 Fahrtwerte & Heatmap {#fahrtwerte-heatmap}

**Fahrtwerte** (Navigation → *Fahrtwerte*, oder Button in der Fahrtenliste) zeigt eine sortierbare Tabelle über alle Fahrten: Datum, Route, Dauer, Strecke, Verbrauch sowie Geschwindigkeit und Leistung jeweils als Minimum / Maximum / Durchschnitt und den Ladestand (Start → Ziel). Klick auf eine Spaltenüberschrift sortiert, Klick auf die Zeile öffnet die Fahrt. Oben stehen Summen-Kacheln (Fahrten, Gesamtstrecke, Gesamtenergie, Gesamtfahrzeit); **CSV-Export** liefert die Werte für Excel/Buchhaltung. Alle Angaben folgen deinen Einheiten-Einstellungen. Leistungswerte stammen aus der Telemetrie — fehlt sie (z. B. reine OwnTracks-Fahrt), steht „—".

**Heatmap** (Navigation → *Heatmap*) zeigt auf einer Karte, *wo* du unterwegs bist — mit vier einzeln ein-/ausblendbaren Ebenen: **Fahrten** (Dichte der Start-/Zielpunkte), **Ladevorgänge**, deine definierten **Ladeorte** und **Fahrwege** (die GPS-Routen der Fahrten als Linien, max. die 300 jüngsten Fahrten im Zeitraum). Zeitraum (30/90/365 Tage/alles) wählbar; die Karte zoomt automatisch auf die sichtbaren Punkte. Die **Farbe jeder Ebene** ist über den Farbpunkt neben der Option frei anpassbar (wird im Browser gespeichert, „↺ Standardfarben" setzt zurück).

**Zonen-Analyse im Fahrtdetail** (Fahrt öffnen → Karte „Zonen-Analyse"): wertet eine einzelne Fahrt nach Zonen aus, jeweils tabellarisch und mit Hervorhebung auf der Karte. Drei Modi: **Tempo-Zonen** (Geschwindigkeits-Bereiche mit Strecke, Zeit, Ø-Leistung und Netto-Energie je Bereich — Häkchen färbt die zugehörigen Streckenabschnitte, Abgewähltes wird ausgegraut), **Meine Zonen** (welche deiner Geofences/Ladeorte die Fahrt berührt, mit Ein-/Ausfahrtszeit, Dauer und Strecke in der Zone — Zonen-Kreise einblendbar) und **Abschnitt** (frei wählbarer Bereich per Von/Bis-Regler mit allen Kennzahlen). Zusätzlich blendet die Checkbox **📍 Hinweise** an der GPS-Karte Marker für Vmax, höchste Leistung, stärkste Rekuperation und Stopps (≥ 1 min) ein.


## 🔋 Battery-Health-Dashboard (Companion Phase 1) {#battery-health}

Unter `/battery` findest du seit v3.6.0 sechs Sektionen, die dir ehrliche Antworten auf die wichtigsten Akku-Fragen geben — **rein statistisch, ohne KI, ohne Datenabfluss**:

1. **Reichweite (Verlauf)** — gleitender Verlauf der maximalen rated_range über Zeit.
2. **Degradation** — Differenz zwischen erster und letzter Messung, farbcodiert (grün <5 %, gelb <10 %, rot ≥10 %).
3. **Ladekurve** — durchschnittliche Spitzenleistung gruppiert in vier SOC-Bändern (0–20 %, 20–50 %, 50–80 %, 80–100 %) sowie Scatter-Plot kW vs. Start-SOC. Tiefe Werte oberhalb 80 % sind normal (Tapering); Auffälligkeiten in 20–50 % können auf BMS-Probleme deuten.
4. **Effizienz vs. Außentemperatur** — kWh/100 km in 5-°C-Buckets aus deinen Trip-Daten. Macht den Kältewinter-Mehrverbrauch sichtbar.
5. **Phantom-Drain** — SOC-Verlust pro Stunde im Stillstand. Filtert Lade- und Trip-Intervalle heraus. Median und Mittelwert oben, Top-10-Ereignisse als Tabelle. >1 %/h ist auffällig (Sentry-Mode, Updates, Vorklimatisierung). **Trend-Warnung (v3.28):** Liegt der Median der letzten 7 Tage anhaltend über den 30 Tagen davor (bzw. dauerhaft >0,8 %/h), erscheint ein Hinweis-Banner.
6. **Gesundheit & Prognose (v3.27)** — Lineare Hochrechnung der auf 100 % SoC normierten Reichweite mit 95-%-Konfidenzband: Degradationsrate (%/Jahr und km/Jahr), prognostizierte Reichweite in 3 Jahren und geschätzte Zeit bis 80 % des Startwerts. Erscheint ab 14 Messtagen. Reine Statistik, keine KI.
6. **Anomalien** — SOC-Sprünge >10 % ohne Trip/Lade, Range-Sprünge >30 km, Effizienz-Ausreißer (>35 oder <7 kWh/100km).

**Datenquellen**: `battery_snapshots`, `trips`, `charging_sessions` — alles aus deiner eigenen SQLite. Kein externer Aufruf, keine Cloud, kein Modell. Die Berechnung läuft serverseitig in `backend/src/routes/battery.js`.

**Vehicle-Selector**: alle Sektionen reagieren auf den aktuell gewählten Wagen.

### SoH-Zertifikat (v3.46.0) {#soh-certificate}

In der Batterie-Ansicht unter „Prognose" erzeugt der Knopf **SoH-Zertifikat (PDF)** ein Batterie-Gesundheitszertifikat für Leasingrückgabe, Wiederverkauf oder Garantie: Fahrzeugdaten (FIN, Kennzeichen, Kilometerstand), aktuelle Reichweite bei 100 % Ladung, Degradationsrate, Datengüte (R²), Datenbasis und die Prognose (Reichweite in 3 Jahren, Zeit bis 80 %). Optional die WLTP-Neu-Reichweite eintragen, dann wird die Gesundheit als **SoH in %** ausgewiesen. Rein statistische Schätzung aus den erfassten Fahrzeugdaten — keine Gewährleistung.

### Companion Phase 2 (ab v3.7.0) {#companion-phase-2}

Zwei neue Sektionen auf `/battery`, beide aus den vorhandenen Daten:

- **Companion-Alerts**: Persistierte Anomalien. Der Companion-Engine läuft nightly (in der `nightlyMaintenance`-Hygiene) und alle 6 Stunden — neue Anomalien werden 1× pro Vorfall via Push (Web-Push + Telegram falls verknüpft) gemeldet. Pro Alert hast du „✓ Als gesehen markieren" und „✕ Verwerfen".
- **Vorklimatisierungs-Empfehlung**: Wenn morgen zur typischen Abfahrtszeit (aus den letzten 30 Tagen gelernt) eine Temperatur <5 °C oder >30 °C erwartet wird, gibt es eine Push-Empfehlung mit konkretem Grund. Wetterquelle: [Open-Meteo](https://open-meteo.com/) — kostenlos, ohne Account.

**Datenfluss vollständig lokal**: Wetter-Abruf ist der einzige externe Call (nur lat/lon, kein Account). Anomalien und Empfehlungen landen in zwei neuen Tabellen `battery_anomalies` und `precondition_suggestions` (idempotent durch UNIQUE-Constraint).

**Phase 3 (Roadmap)**: tiefer Companion-Chat über Ollama — alles weiterhin lokal.

## 📋 Voraussetzungen {#requirements}

### Server

- Linux-Server (x86_64, ARM64 oder ARMv7) mit min. 1 GB RAM
- Docker + Docker Compose (wird vom Setup-Script installiert)
- Öffentlich erreichbare Domain + TLS-Zertifikat (für Tesla API erforderlich)
- Port 443 (HTTPS) muss von außen erreichbar sein

### Tesla Developer Account

- Registrierung auf `developer.tesla.com`
- App anlegen → Client ID und Client Secret notieren
- Callback-URL: `https://<deine-domain>/api/auth/callback`
- Für Fahrzeugbefehle: Fleet API Access beantragen (kostenlos, 1–3 Werktage)
- **Die einmalige Partner-Registrierung bei Tesla übernimmt der Wizard automatisch** (seit v3.23.5) — du trägst nur Client ID + Secret ein, kein manueller `curl`-Aufruf mehr nötig.

## 🚀 Installation {#installation}

Das Setup-Script installiert alles automatisch: Docker, nginx, TLS, tesla-http-proxy.

```bash
# Als root auf dem Zielserver:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash

# Das Script fragt interaktiv ab:
# → Domain (z.B. carview.meinserver.de)
# → Tesla Client ID und Client Secret
# → Tesla Redirect URI
# → JWT Secret (wird automatisch generiert)
```

> **Alternative: Manuelle Konfiguration**
>
> Kopiere `.env.example` → `.env` und passe alle Werte an. Dann: `docker compose -f docker-compose.prod.yml up -d`

## ⚙️ Erst-Setup im Browser {#first-setup}

1. **Browser öffnen** — Öffne `https://<deine-domain>/setup` — du wirst automatisch weitergeleitet.
2. **Mandanten anlegen** — Wähle einen Mandantennamen (z.B. „Familie Muster") und ein Kürzel (z.B. „muster"). Das Kürzel wird beim Login benötigt – notiere es dir.
3. **Admin-Konto erstellen** — Lege Benutzername und Passwort fest. Das Passwort muss mindestens 12 Zeichen lang sein. Empfehlung: eine Passphrase aus 4 Wörtern.
4. **Einstellungs-Assistent** — Nach dem ersten Login startet der Assistent automatisch und führt dich durch alle kritischen Einrichtungsschritte (siehe unten).

## 🧙 Einstellungs-Assistent {#settings-wizard}

Nach dem ersten Login öffnet sich automatisch der **Einstellungs-Assistent**. Er kann jederzeit über **Einstellungen → Assistent starten** erneut geöffnet werden.

**Für Admins** führt der Assistent durch 16 Schritte in der richtigen Abhängigkeits-Reihenfolge:

| Schritt | Was passiert |
|---------|-------------|
| **Sprache** | App-Sprache wählen |
| **Tesla Zugangsdaten** | Client ID + Secret eintragen — TeslaView **registriert die App dann automatisch bei Tesla** (1-Klick, kein `curl`); die erkannte Domain wird einmal bestätigt |
| **Tesla OAuth** | Tesla-Konto verbinden — Button öffnet ein Popup, das sich nach dem Login automatisch schließt |
| **Fahrzeuge** | Fahrzeuge aus dem Tesla-Konto synchronisieren |
| **Virtual Key** | Registrierungs-Link anzeigen und für das Smartphone kopieren |
| **Fleet Telemetry** | GPS-Tracking pro Fahrzeug aktivieren |
| **Strompreis** | Heimlade-Preis (€/kWh) pro Fahrzeug für die Kostenberechnung |
| **Legal-Check** | Automatische Prüfung ob noch Pflicht-Platzhalter (`<<NAME>>` etc.) in Impressum/Datenschutz/AGB offen sind |
| **Externe APIs** | OCM (Ladestationen), HERE Maps (Verkehr), Grok/xAI (KI-Chat) |
| **Monitoring** | Selbstheilung + Alert-E-Mail |
| **Design → Zusammenfassung** | Präferenzen; alle Änderungen werden erst beim letzten Schritt gespeichert |

> **Tipp:** Alle Schritte können übersprungen werden — der Assistent kann jederzeit erneut gestartet werden.

> **🌐 Sprachschalter:** Jeder Wizard zeigt oben rechts einen kompakten Sprachschalter. Die im Profil oder Mandanten-Default gespeicherte Sprache wird automatisch beim Login angewendet; über den Schalter kann mid-Wizard sofort umgeschaltet werden, ohne den Wizard zu verlassen.

## 🔑 Virtual Key einrichten {#virtual-key}

Für Fahrzeugbefehle (Türen öffnen, Klimaanlage etc.) muss ein Virtual Key am Fahrzeug registriert werden. Dies ist nur für neuere Fahrzeuge erforderlich (`vehicle_command_protocol_required: true`).

1. Stelle sicher, dass **tesla-http-proxy** läuft:

   ```bash
   systemctl status tesla-http-proxy
   ```

2. Öffne auf dem iPhone in Safari: `https://tesla.com/_ak/<deine-domain>`
3. Die Tesla-App fragt „App zulassen?" → bestätigen
4. In Bluetooth-Reichweite des Fahrzeugs bleiben — der Key wird innerhalb von 30 Sekunden akzeptiert
5. Verifizieren unter **Einstellungen → Fahrzeugverbindung → Virtual Key Status**

## ⚡ Ladeorte & Kosten {#charging-locations}

Ladeorte werden per GPS automatisch erkannt und mit einem Preis pro kWh verknüpft.

**Automatische GPS-Erkennung** — Wenn ein Ladeort mit GPS-Koordinaten und Radius (Standard 200m) hinterlegt ist, wird beim Ladestart automatisch der passende Ort erkannt und der hinterlegte Preis/kWh angewendet.

**Ladeort anlegen** — Unter `/charging-locations` (Nav „Ladeorte"): Name, Typ (Zuhause/Büro/Öffentlich), Preis/kWh, GPS-Koordinaten, Erkennungsradius und **automatisches Ladelimit** in % eingeben.

**Automatisches Ladelimit (ab v3.12.0)** — Pro Ort lässt sich ein Wunsch-Ladelimit (z. B. 80 %) hinterlegen. Beim Trip-Ende prüft TeslaView, ob die Position innerhalb des Radius liegt. Wenn ja:
- Mit aktiver Fleet-API → `set_charge_limit`-Befehl wird sofort ans Auto gesendet
- Ohne Fleet-API → Push-Notification mit Vorschlag, das Limit manuell zu setzen

Der „🔋 Jetzt setzen"-Button löst den Befehl auch manuell aus. Tesla empfiehlt 70-80 % für täglich, 50-60 % für lange Standzeiten, 100 % nur für Langstrecken.

**Kosten manuell anpassen** — In der Ladeliste: Klick auf eine Session → Kosten bearbeiten. Kosten können auch auf 0 gesetzt werden (z.B. Gratis-Laden).

**✕ Ladung als kostenlos markieren** — In der **Ladehistorie** hat jede Session einen kleinen Button *„✕ kostenlos"*. Damit markierte Ladungen erscheinen ausgegraut mit dem Badge *„kostenlos"* und werden **automatisch aus der Heimladen-Abrechnung ausgeschlossen** — sowohl aus den Monatszusammenfassungen als auch aus der Einzelauswertung.

Typischer Anwendungsfall: Laden am Arbeitsplatz, das vom Arbeitgeber gestellt wird und nicht in die private Abrechnung einfließen soll. Mit dem Button *„↩ kostenpflichtig"* lässt sich die Markierung jederzeit rückgängig machen.

**Ladeverlauf, Kosten nach Ort & günstige Ladefenster (v3.24–v3.26)** — In der Laden-Ansicht öffnet jede Session über *„📈 Verlauf ansehen"* ihren **Ladeverlauf**: Leistungs- und Ladestandskurve über die Zeit plus Eckdaten (Dauer, geladene kWh, Ø-/Spitzenleistung, Kosten) und eine klar gekennzeichnete Schätzung von Netzentnahme und Ladeverlust (Wirkungsgrad je Ladetyp). Die Sektion **„Kosten nach Ort"** fasst je Ladeort Anzahl, kWh, Gesamtkosten und Ø €/kWh zusammen — mit Heim-/Auswärts-Kennzeichnung. Ist unter Einstellungen → Tarif ein Strompreis-Anbieter (aWattar/Tibber) verbunden, zeigt **„Günstige Ladefenster"** den aktuellen Preis sowie das günstigste 4- und 8-Stunden-Fenster der nächsten 24 Stunden samt Stundenraster.

## 💶 Dienstlich/Privat-Erstattung {#reimbursement-split}

Für **Dienstwagen** (Fahrzeug-Kategorie „Dienstwagen") teilt die **Kostenabrechnung → Dienstlich / Privat — Erstattung** die Heimladekosten auf und erzeugt ein unterschriftsreifes Erstattungs-PDF nach einer von zwei Methoden:

- **Pauschale** — fester steuerfreier Monatsbetrag nach § 3 Nr. 50 EStG: **30 €** mit Lademöglichkeit beim Arbeitgeber, **70 €** ohne. Kein Einzelnachweis nötig; der Betrag wird mit der Anzahl der abgerechneten Monate multipliziert.
- **Fahranteil** — datenbasiert: der dienstliche km-Anteil (geschäftlich + Arbeitsweg aus den klassifizierten Fahrten) mal die tatsächlichen Heimladekosten des Zeitraums. Setzt voraus, dass Fahrten im Fahrtenbuch als dienstlich/privat klassifiziert sind.

Beide Methoden sind rein deutschsprachig (deutsches Steuerthema) und nur für Dienstwagen verfügbar.

## 🧾 Dienstwagen-Versteuerung {#company-car-tax}

Für **Dienstwagen** stellt der Versteuerungs-Assistent (Nav „Auswertungen → Dienstwagen-Steuer", `/dienstwagen-steuer`) die **1-%-Regel** der **Fahrtenbuchmethode** gegenüber und rechnet den monatlichen geldwerten Vorteil.

**Datumsabhängiger E-Fahrzeug-Satz** — Bei Elektro- und Hybridfahrzeugen hängt der Satz vom **Anschaffungs-/Überlassungsdatum** ab. Der Assistent fragt dieses Datum ab und wendet die dann geltende Bruttolistenpreis-Grenze an:
- Reines Elektro: **0,25 %** (Viertelung), wenn der Bruttolistenpreis die Grenze zum Anschaffungsdatum nicht übersteigt — **60.000 €** bis 2023, **70.000 €** ab 2024, **100.000 €** ab 01.07.2025; darüber **0,5 %**. Die Sonderregelung läuft Ende 2030 aus.
- Plug-in-Hybrid: **0,5 %** nur bei höchstens 50 g/km CO₂ oder E-Mindestreichweite (≥ 40 km bis 2021, ≥ 60 km 2022–2024, ≥ 80 km ab 2025), sonst **1 %**.

**Eingaben** — Bruttolistenpreis, Anschaffungsdatum (aus dem TCO-Cockpit vorbelegt), Fahrzeugtyp und einfache Entfernung Wohnung–Arbeit. Die Kosten (Fahrtenbuchmethode) kommen aus dem TCO-Cockpit, der Privatanteil aus den als privat/dienstlich klassifizierten Fahrten.

**Ergebnis** — Beide Methoden mit monatlichem und jährlichem geldwerten Vorteil, die günstigere ist hervorgehoben, plus die jährliche Differenz. Reine Orientierungsrechnung nach § 6 Abs. 1 Nr. 4 EStG — **keine Steuerberatung**.

## 📅 Ladeplaner {#charge-planner}

Der **Ladeplaner** (Nav „Planung → Ladeplaner", `/ladeplan`) beantwortet die Frage „Wann soll ich laden?" für einen dynamischen Stromtarif. Er wählt aus der Preiskurve die **günstigsten Stunden bis zur Abfahrt** — auch nicht zusammenhängend — statt einfach das nächste zusammenhängende Fenster.

**Voraussetzung** — Unter Einstellungen → Tarif muss ein dynamischer Anbieter (aWattar oder Tibber) verbunden sein. Ohne Tarif zeigt der Ladeplaner einen Hinweis mit Link zur Konfiguration.

**Eingaben** — Aktueller Ladestand, Ziel-Ladestand, Akkukapazität (kWh), Ladeleistung (kW) und Abfahrtszeit. Die Werte werden lokal im Browser gemerkt.

**Ergebnis** — Vier Kennzahlen: nachzuladende Energie (inkl. erreichtem Ladestand), reine Ladedauer, optimale Kosten (nur günstigste Stunden) und die Ersparnis gegenüber sofortigem Durchladen (absolut und in %). Darunter zeigt ein Balkendiagramm das Planungsfenster bis zur Abfahrt; die vom Planer gewählten Ladestunden sind grün hervorgehoben.

**Reicht die Zeit nicht** — Ist das Fenster bis zur Abfahrt zu kurz für den Ziel-Ladestand, weist der Planer darauf hin und nennt den maximal erreichbaren Ladestand.

Der Ladeplaner rechnet ausschließlich auf der Tarifkurve — es wird **kein Befehl ans Fahrzeug gesendet** und keine Fleet-API benötigt. Ladeverluste (AC typischerweise ~10 %) sind in Energie und Kosten eingerechnet.

## ☀️ PV-Überschussladen {#pv-solar}

**PV-Überschussladen** (Nav „Planung → PV-Überschuss", `/pv-solar`) lädt nur mit Solarüberschuss. TeslaView liest den aktuellen Überschuss aus einem **Home-Assistant-Sensor** (lokale REST-API) und leitet daraus die empfohlene Ladestromstärke ab — rein lokal, ohne Cloud.

**Einrichtung (Admin)** — Home-Assistant-URL, ein Long-Lived Access Token (HA → Profil → Sicherheit) und die Entity-ID des Überschuss-Sensors (Watt) hinterlegen. Dazu Anlagenparameter: Mindest-Überschuss, Phasen (1/3), Spannung und maximaler Ladestrom.

**Status & Anwenden** — Die Ansicht zeigt den aktuellen Überschuss, die empfohlene Ladestromstärke (`Überschuss ÷ (Spannung × Phasen)`, gedeckelt) und ob genug Überschuss vorhanden ist. „Jetzt anwenden" setzt den Ladestrom und startet bzw. stoppt das Laden am Fahrzeug — dafür ist die **Fleet-API mit Virtual Key** nötig. Unter der Tesla-Mindeststromstärke (5 A) wird nicht geladen.

## 🔐 Sicherheit {#security}

- 🔑 **Passkey / WebAuthn** — Passwortloser Login mit Fingerabdruck, Face ID oder Hardware-Key
- 📱 **QR-Code-Login fürs Auto** — Einmal-Token (60 s) erzeugt aus den Einstellungen, scannbar mit dem Tesla-Browser oder einem zweiten Gerät — keine Passworteingabe im Auto nötig
- 📱 **TOTP-MFA** — Zwei-Faktor-Authentifizierung mit Authenticator-App
- 🛡️ **Account-Lockout** — Konto wird nach 5 Fehlversuchen für 15 min gesperrt
- 🍪 **Refresh-Token** — httpOnly-Cookie, 7 Tage gültig, automatische Rotation
- 📋 **Audit-Log** — Alle Logins, Änderungen und Sicherheitsereignisse protokolliert
- 🔒 **HTTPS + HSTS** — TLS 1.2/1.3, HSTS, OCSP-Stapling, sichere Headers

**Empfohlene Sicherheitseinstellungen:**

- MFA (TOTP) nach dem ersten Login aktivieren
- Passkey einrichten für passwortlosen Login
- Regelmäßig Datensicherung erstellen (Export)
- Starkes Passwort: min. 16 Zeichen oder 4-Wort-Passphrase

**Erzwungene MFA für neue Benutzer.** Neue Konten werden standardmäßig mit `MFA-Pflicht` angelegt — beim ersten Login leitet die App den Benutzer automatisch nach **`/mfa/setup`** weiter und entlässt ihn erst nach erfolgreicher TOTP-Einrichtung in die App. Administratoren können die Pflicht im Benutzer-Eintrag (**Admin → Benutzer**) deaktivieren oder reaktivieren. Admins selbst sind nicht zwingend MFA-pflichtig (aber dringend empfohlen).

## 🏢 Multi-Mandanten {#multitenancy}

Tesla Carview unterstützt mehrere vollständig isolierte Mandanten auf einer Instanz. Jeder Mandant hat seine eigene Datenbank – ein Mandant kann niemals Daten eines anderen sehen.

**Mandanten anlegen (Einladungslink)** — Neue Mandanten können nur über einen **Einladungslink** registriert werden. Ein Administrator generiert den Link unter **Admin → Benutzer → Einladungslink erstellen** und kann optional eine **Notiz** hinterlegen (z.B. „für Max Mustermann, Firma XY"), um die Einladung später wiederzuerkennen. Der Link ist 7 Tage gültig und kann nur einmal verwendet werden. Ohne gültigen Link ist `/register` gesperrt. Bestehende Einladungen lassen sich pro Eintrag **erneut** ausstellen (gleiche Notiz, neuer Token), **sperren** (bleibt sichtbar, kann aber nicht mehr verwendet werden) oder endgültig **löschen**.

**Mehrere Fahrzeuge pro Mandant** — Alle Fahrzeuge eines Tesla-Accounts werden beim Synchronisieren automatisch importiert. Unter **Einstellungen → Tesla-Verbindung → 🔄 Fahrzeuge synchronisieren** lässt sich der Sync jederzeit manuell anstoßen — nützlich wenn ein neues Fahrzeug zum Account hinzugefügt wurde. Zwischen Fahrzeugen wechselst du oben rechts in der Navigationsleiste.

**Login mit Mandanten-Kürzel** — Bei mehreren Mandanten erscheint beim Login ein Mandanten-Feld. Bei nur einem Mandanten wird er automatisch erkannt.

**Benutzerverwaltung** — Administratoren können innerhalb ihres Mandanten weitere Benutzer anlegen und Fahrzeuge zuweisen unter **Admin → Benutzer**. Pro Benutzer lassen sich drei Rechte feinjustieren:

- **Fahrzeuge bearbeiten** — Erlaubt das Ändern der Fahrzeug-Grunddaten (Name, Kennzeichen, Farbe, Strompreis, Monta-Konfiguration). Standard für neue Benutzer: aus.
- **Fahrzeuge anlegen** — Erlaubt das Synchronisieren neuer Fahrzeuge vom Tesla-Account. Standard: aus.
- **MFA-Pflicht** — Erzwingt die TOTP-Einrichtung beim ersten Login (siehe Sicherheit oben). Standard für neue Benutzer: an.

Administratoren haben diese Rechte implizit — die Häkchen sind bei Admin-Konten ausgeblendet. Im Kopfbereich der Benutzerverwaltung erscheint zudem eine orangefarbene **Aufgabenkarte**, sobald ein aktiver Benutzer noch keinem Fahrzeug zugewiesen ist — mit Direkt-Buttons zum Zuweisen oder zum Erteilen des Rechts „Fahrzeuge anlegen".

**Mandanten-Pseudonym (Datenschutz-Layer)** — Auf der öffentlichen Login-Seite erscheint dein Mandant **nicht mit Klarnamen**, sondern mit einem zufälligen `adjektiv-substantiv`-Pseudonym im Stil `brave-eagle`, `quiet-otter`. So sieht niemand von außen, welche Person oder Firma den Self-Hoster nutzt.

- Der Pseudonym wird **automatisch beim Anlegen** des Mandanten vergeben.
- Du findest ihn unter **Einstellungen → 🔐 Mandanten-Pseudonym**.
- Mit dem Button **„Neu generieren"** vergibt das System einen neuen Pseudonym; der alte wandert in eine History und wird nicht zufällig wieder vorgeschlagen.
- **Wichtig zu merken:** Beim Login mit mehreren Mandanten ist der Pseudonym dein einziges Auswahlmerkmal — schreibe ihn neben dem Passwort in deinen Passwort-Manager. Bei Verlust ohne Backup ist nur Neu-Aufsetzen einer leeren Mandantenumgebung möglich.
- Der **interne Slug** und Klarname bleiben in der Datenbank erhalten und sind im Admin-Bereich sichtbar — nur die Login-Seite ist anonymisiert.

## 💾 Datensicherung {#backup}

**Manueller Export** — Unter **Export**: CSV, JSON oder **PDF** für Fahrten (PDF-Fahrtenbuch mit Tabelle, Verbrauchssumme und Seitenumbrüchen), CSV für Ladesessions, sowie Vollbackup als ZIP.

**Automatisches Backup (Server)** — Die SQLite-Datenbanken liegen im Bind-Mount-Verzeichnis `./data` (relativ zum Compose-File, standardmäßig `/opt/tesla-carview/data`). Für automatische Backups auf dem Server:

```bash
# Tägliches Backup um 3 Uhr (crontab -e):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /backup/
```

Das **App-interne Vollbackup** (Admin → Datenverwaltung → „Backup erstellen") exportiert alle 26 Tabellen als JSON — inklusive Passkey-Credentials. Nach einem Restore auf demselben Server sind registrierte Passkeys sofort wieder nutzbar.

> ⚠️ **Wichtig vor dem Löschen**
>
> Immer zuerst einen Export erstellen, bevor du Daten löschst. Gelöschte Daten können nicht wiederhergestellt werden.

## ⚡ Tesla Developer API einrichten {#tesla-api}

Tesla Carview kommuniziert über die offizielle **Tesla Fleet API**. Dazu brauchst du einen kostenlosen Tesla Developer Account und eine registrierte App.

### Schritt 1 – Developer Account anlegen

1. Rufe `developer.tesla.com` auf und melde dich mit deinem Tesla-Account an.
2. Akzeptiere die Developer Terms of Service.
3. Klicke auf **Create Application**.

### Schritt 2 – App konfigurieren

1. **Application Name:** beliebiger Name, z. B. *Tesla Carview*
2. **Description:** kurze Beschreibung (Pflichtfeld)
3. **Allowed Origin:** deine öffentliche App-URL, z. B.

   ```
   https://carview.example.com
   ```

4. **Redirect URI:** Callback-URL der App:

   ```
   https://carview.example.com/api/auth/callback
   ```

5. **Scopes (erforderlich):** `vehicle_device_data`, `vehicle_cmds`, `vehicle_charging_cmds`, `vehicle_location`, `openid`, `offline_access`
6. ⚠ `vehicle_location` ist für GPS-Tracking (Fleet Telemetry) zwingend erforderlich

### Schritt 3 – Zugangsdaten notieren

Nach dem Erstellen erhältst du:

- **Client ID** – eine UUID-artige Zeichenkette
- **Client Secret** – einmalig sichtbar, sofort kopieren und sicher speichern

```env
TESLA_CLIENT_ID=abc123def456...
TESLA_CLIENT_SECRET=tsl_secret_...
```

Diese Werte trägst du in die `.env`-Datei ein oder gibst sie beim interaktiven Setup-Wizard an.

### Schritt 4 – Fleet API Access beantragen (für Befehle)

Damit Fahrzeugbefehle (Klima, Türen, Laden) funktionieren, muss deine App als *Partner* bei Tesla registriert sein. Das geht einmalig über:

```
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts
```

Das Setup-Script führt diesen Schritt automatisch aus, wenn `FRONTEND_URL` gesetzt ist. Sonst manuell via Postman oder curl. Dauert 1–3 Werktage bis zur Aktivierung.

### Schritt 5 – In Tesla Carview verbinden

1. Nach dem Login: **Einstellungen → Tesla-Verbindung → Tesla neu verbinden**
2. Du wirst zu Tesla weitergeleitet und musst dich dort anmelden und der App Zugriff erlauben.
3. Nach der Weiterleitung: **Einstellungen → 🔄 Fahrzeuge synchronisieren**
4. Alle Fahrzeuge des Tesla-Accounts erscheinen in der App.

### Schritt 6 – Fleet Telemetrie aktivieren (GPS-Tracking)

GPS-Daten kommen bei neueren Fahrzeugen (z. B. Model Y ab 2024, XP7-VIN) ausschließlich über **Fleet Telemetry** — nicht über die REST-API. Dafür sind zwei Einmal-Schritte nötig:

1. **App bei Tesla registrieren** — Einstellungen → Fleet Telemetrie → *„🔑 App bei Tesla registrieren"* klicken. Einmalig nötig.
2. **Fleet Telemetry Access beantragen** — Wenn der nächste Schritt mit „HTTP 404" scheitert, hat Tesla den Endpoint noch nicht freigeschaltet. Dann den Tesla Developer Support kontaktieren (siehe unten).
3. **Telemetrie aktivieren** — Einstellungen → Fleet Telemetrie → *„📡 Telemetrie aktivieren"* klicken. Konfiguriert das Fahrzeug so, dass es GPS, Geschwindigkeit und Batterie-Daten streamt.

**Fleet Telemetry Access beim Tesla Support beantragen**

Falls Schritt 2 mit 404 scheitert, schicke folgende Anfrage ans Tesla Developer Support-Formular (`developer.tesla.com/dashboard → Support Inquiry`):

```
Subject: Fleet Telemetry Access Request – Self-Hosted App for Personal Use

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

Thank you
```

⚠ Client ID und VIN durch eigene Werte ersetzen. Tesla antwortet erfahrungsgemäß innerhalb weniger Tage.

### API-Kosten verstehen

**Wichtig zuerst:** Tesla gewährt **$10 Freikontingent pro Account und Monat** (Stand 2026, [developer.tesla.com](https://developer.tesla.com)) — das reicht für **einen Wagen mit Fleet-Telemetry + ein paar Commands/Wakes pro Tag**. Im typischen Privat-Use liegt die Fleet-API-Rechnung damit bei **0 €**.

Darüber hinaus pay-per-use (alle Preise in USD, $1 ≈ 0,92 €):

| Aktion | Preis |
|--------|-------|
| Streaming Signals | 150.000 Signale = $1 |
| Commands (Klima, Türen, Schlüssel) | 1.000 = $1 |
| Vehicle-Data-Polling | 500 Requests = $1 |
| **Wake-Up** (teuerste Aktion) | 50 = $1 (= $0,02/Wake) |
| Fleet Telemetry (Streaming) | ~$0,0067/Std/Auto |
| Vehicle Data (Polling) | ~$0,12/Std/Auto (≈ 18× teurer als Streaming) |

Deshalb: **Fleet Telemetry konfigurieren** statt zu pollen — drastischer Kostenunterschied bei gleichem Datenumfang. Ohne Fleet Telemetry pollt die App im Hintergrund:

| Zustand | Intervall | Calls/Tag |
|---------|-----------|-----------|
| Fährt aktiv | 30 s | bis 2.880 |
| Online, steht | 10 min | bis 144 |
| Offline/schläft | 45 min | bis 32 |
| Mit Fleet Telemetry | 1 h Heartbeat | 24 |

**Tages-Cap:** Standardmäßig max. 30 Calls/Fahrzeug/Tag (konfigurierbar via `TESLA_DAILY_CAP`), danach Pause bis Mitternacht. **Monats-Cap:** Standardmäßig max. 400 Calls/Fahrzeug/Monat (konfigurierbar via `TESLA_MONTHLY_CAP`). Beide Caps sind DB-persistent und werden durch Container-Neustarts nicht zurückgesetzt.

**Kosten senken (falls nötig):**
- Fleet Telemetry einrichten → Streaming statt Polling, ~$5/Monat ohne Free-Tier, $0 mit Free-Tier
- In Einstellungen → Tesla-Verbindung: Monatslimit + Hard-Stop aktivieren
- Daily/Monthly Caps in `TESLA_DAILY_CAP` und `TESLA_MONTHLY_CAP` belassen

**Fazit:** Bei einem Auto + Streaming-Telemetry + maßvollen Commands kostet die Fleet-API faktisch nichts. Erst Multi-Auto-Setups oder aggressives Polling können den Free-Tier sprengen.

## 🔌 Monta-Integration (Heimladen & Abrechnung) {#monta}

Tesla Carview kann Ladedaten direkt aus deiner **Monta-Wallbox** abrufen. Die Integration steht für **alle Fahrzeuge** zur Verfügung:

- **Privatfahrzeuge**: Monta-Ladesessions werden als Lade-Information angezeigt (🏠-Badge in der Ladehistorie, Sync mit Heim-Wallbox-Erkennung).
- **Dienstwagen**: Zusätzlich steht die vollständige Kostenabrechnung zur Verfügung – monatliche Übersicht, PDF-Erstattungsblatt und Abrechnungsvorlage für den Arbeitgeber.

> ℹ️ Die Kostenabrechnung (PDF, Erstattungsvorlage) ist Fahrzeugen der Kategorie **Dienstwagen** vorbehalten. Monta-Ladedaten können für alle Fahrzeuge genutzt werden.

### Schritt 1 – Monta API-Key erstellen

1. Melde dich bei **Monta** an (App oder Web: `portal.monta.com`).
2. Gehe zu **Einstellungen → API**.
3. Klicke auf **API Key erstellen** und kopiere den Schlüssel (er beginnt mit `monta_`).

Der Key ist nur einmal sichtbar – sofort in Tesla Carview eintragen.

### Schritt 2 – Charge-Point-ID herausfinden

1. Im Monta-Portal: **Ladepunkte → Meine Geräte** auswählen.
2. Die **Charge-Point-ID** steht in der Detailansicht (Format: `cp_12345`).
3. Alternativ: API-Aufruf `GET /api/v1/charge-points` liefert alle Ladepunkte mit IDs.

### Schritt 3 – In Tesla Carview eintragen

1. Gehe zu **Einstellungen → Fahrzeugprofil**.
2. Trage **Strompreis Wallbox (€/kWh)** ein – z. B. `0.34` (für Dienstwagen Abrechnungsgrundlage).
3. Füge **Monta Charge-Point-ID** und **Monta API-Key** ein.
4. Klicke **Speichern**.

### Heim-Wallbox-Erkennung

Wenn du in der Fahrzeug-Konfiguration eine **Monta Charge-Point-ID** hinterlegst, sind alle vom Sync zurückgelieferten Sessions per Definition Ladevorgänge an dieser Heim-Wallbox. Die App markiert die zugehörigen lokalen Sessions automatisch als **Heim-Ladung** und zeigt sie in der Liste mit einem 🏠-Badge sowie in der Kostenabrechnung mit einem 🏠-Marker. Die Markierung wird auch zur Heim-/Auswärts-Unterscheidung in der monatlichen Abrechnung verwendet — vom GPS-basierten Match unabhängig, sodass eine Session auch dann korrekt zugeordnet wird, wenn das Fahrzeug während des Ladens keine GPS-Position liefert.

### Abrechnung nutzen

- Gehe zu **Abrechnung** in der Navigation.
- Wähle den gewünschten Monat – alle Heim-Ladevorgänge werden aufgelistet.
- Ladungen, die kostenlos waren (z. B. beim Arbeitgeber), kannst du in der Ladehistorie mit **✕ kostenlos** markieren – sie werden dann aus der Abrechnung ausgeschlossen.
- Mit **PDF exportieren** erhältst du ein unterschriftsreifes Abrechnungsblatt.

## 📝 Betriebsbuch {#logbook}

Im **Betriebsbuch** dokumentierst du alles rund um den Fahrzeugbetrieb: Wartung, Reparatur, Reifenwechsel, Inspektion, Unfälle und freie Notizen. Jeder Eintrag bekommt automatisch:

- **Datum & Uhrzeit** — beim Anlegen voreingestellt auf „jetzt"; rückwirkende und geplante Einträge sind möglich.
- **Ersteller** — der eingeloggte Benutzer wird als Verfasser des Eintrags gespeichert und neben jedem Eintrag mit **👤 Benutzername** angezeigt. Historische Einträge aus der Zeit vor diesem Feature erscheinen als „👤 unbekannt".
- **Kategorie & optionale Felder** — Kilometerstand zum Zeitpunkt, Kosten, freie Beschreibung.

Damit lässt sich später nachvollziehen, wer welche Notiz oder Wartung dokumentiert hat — wichtig in Mandanten mit mehreren aktiven Benutzern.

## 🔵 OwnTracks-Validation (ab v3.11.0) {#owntracks-validation}

**Problem das wir lösen:** OwnTracks pushed GPS-Daten von deinem Smartphone an TeslaView. Wenn du aber mit einem Fremdauto fährst oder als Beifahrer mitfährst, würden falsche Trips als Tesla-Fahrten erscheinen. Bei mehreren Personen mit OwnTracks im selben Tesla gäbe es Doppelerfassung.

TeslaView hat drei Schutzlinien:

### A) Bluetooth-Validierung (automatisch, empfohlen)

Dein iPhone weiß, ob es gerade mit dem Tesla-Bluetooth verbunden ist. Per iOS-Kurzbefehl meldet das Phone „eingestiegen" / „ausgestiegen" an TeslaView.

**Setup (einmalig, ~3 Minuten):**

1. **Tesla-Bluetooth-Name notieren**: iOS → Einstellungen → Bluetooth → der Eintrag deines Tesla (z. B. „Tesla 7SA5..."). Den exakten Namen merken.
2. **In TeslaView**: `/my-tracking` → bei deinem Device „🔵 Bluetooth-Validierung" aufklappen → den Namen eintragen → speichern.
3. **iOS-Kurzbefehle-App** öffnen → „Automation" → „+ Neue Automation":
   - „Wenn Bluetooth-Gerät verbunden" → den Tesla wählen
   - Aktion „Inhalte aus URL abrufen" hinzufügen → die in TeslaView angezeigte **Verbinden-URL** einfügen, **HTTP-Methode = POST**
   - Speichern und „Sofort ausführen, ohne Nachfrage" aktivieren
4. **Zweite Automation analog** für „Bluetooth-Gerät getrennt" → **Trennen-URL**.

Sobald die Bluetooth-Konfiguration gespeichert ist, ignoriert TeslaView jede OwnTracks-Position, bei der das Phone **nicht** mit dem Tesla verbunden ist.

### B) Trip-Lock (automatisch)

Wenn zwei Personen mit OwnTracks-Devices im selben Tesla sitzen, würde ohne Schutz beide Trips doppelt erfasst. TeslaView setzt deshalb pro Fahrzeug einen **Trip-Lock auf das erste Device**, das losfährt — alle anderen werden für die Trip-Dauer ignoriert (Auto-Release nach 15 min Inaktivität). Kein User-Setup nötig.

### C) Manueller Pause-Toggle (Notbremse)

In `/my-tracking` hat jedes Device einen ⏸-Knopf. Wenn du weißt, dass du die nächsten Stunden NICHT mit dem Tesla fährst (Urlaub mit Mietwagen, Fahrradtour), kannst du dein Device manuell pausieren. Beim Wieder-Einsteigen reaktivierst du es.

### Setup auf Android (statt iOS)

Android hat keinen nativen 1:1-Ersatz für iOS-Kurzbefehle. Drei Wege:

**Empfohlen: MacroDroid** (kostenlose Version reicht, ~10 Mio Downloads, sicher)
1. Aus dem Play Store installieren
2. „+ Neues Makro" → Trigger „Bluetooth" → „Verbunden mit Gerät" → Tesla auswählen
3. Aktion „HTTP-Request" → Methode GET → Verbinden-URL aus TeslaView einfügen
4. Speichern als „Tesla connected"
5. Zweites Makro analog für „Bluetooth getrennt" mit Disconnect-URL

**Alternativen:**
- **Automate (Llamalab)** — kostenlos bis 30 Blöcke, visueller Flow (sauberer aber Lernkurve)
- **Tasker** — 3,49 € einmalig, Goldstandard für Android-Automation

⚠ **Hinweis zur Verifikation:** Diese Anleitung wurde nicht auf einem Android-Gerät live verifiziert (Entwickler-Setup nur iOS). Bei Problemen bitte GitHub-Issue öffnen — wir verbessern die Anleitung iterativ.

### Status-Anzeige

In `/my-tracking` zeigt jedes Device einen klaren Status:

- 🟢 **Im Tesla** — alles aktiv, Trips werden erfasst
- 🟡 **Nicht im Tesla** — Bluetooth getrennt, Trips werden ignoriert
- ⏸ **Pausiert** — manuell deaktiviert
- 🔵 **Im-Tesla-Status unbekannt** — wartet auf erstes Bluetooth-Event nach Setup
- 🔵 **Ohne Bluetooth-Validierung aktiv** — Legacy-Modus, kein Bluetooth-Name hinterlegt

## 📍 In der Nähe (ab v3.13.0) {#nearby}

`/nearby` zeigt POIs (Points of Interest) im Umfeld deines Autos, deiner aktiven Lade-Session oder des letzten Trip-Endpunkts. Sinnvoll bei Schnelllade-Stopps („Wo ist die nächste Toilette?", „Café um die Ecke?").

**Kategorien:** Café, Restaurant, Fast Food, Bäckerei, Supermarkt, WC, Trinkwasser, Spielplatz, Park, Picknick, Aussichtspunkt, Geldautomat, Apotheke, **Geocaches**.

**Datenquelle**: [OpenStreetMap Overpass-API](https://overpass-api.de) — kostenlos, kein Account, kein API-Key. Anfragen laufen serverseitig, das Ergebnis wird 24 Stunden im `poi_cache` zwischengespeichert (auf 4 Dezimalstellen gerundet → ~11 m). Damit bleibt der Datenfluss zu OSM minimal.

**Radius wählbar**: 500 m / 1.5 km / 3 km. Klick auf einen POI öffnet OpenStreetMap im Browser.

**Filter**: jede Kategorie als Toggle — z. B. nur Geocaches anzeigen für eine Schatzsuche während des Ladens.

## 🚀 App-Hub (ab v3.9.0) {#app-hub}

Unter `/launcher` findest du eine **kuratierte Liste von Web-Apps**, die im Tesla-Browser laufen und die Tesla nativ NICHT anbietet:

- **Audio (ÖR)** — ARD Audiothek, Deutschlandfunk Live
- **EV-Welt** — GoingElectric, electrive, OpenChargeMap, A Better Routeplanner
- **Messaging** — Telegram Web, Signal (Tesla hat keinen nativen Chat)
- **Wissen** — Wikipedia

**Aufnahme-Kriterien:** kostenfrei, sicher (HTTPS), keine zwingende App-Store-Installation, datenschutzfreundlich, **kein Tesla-Native-Duplikat** (Spotify, Apple Music, Spiele, Karten, Streaming-Dienste sind bewusst NICHT enthalten — die hat Tesla bereits).

**Audio im Tesla-Lautsprecher:** läuft wie immer via Bluetooth vom Smartphone — keine Konfiguration nötig.

**Admin-Whitelist:** unter `/admin?tab=launcher` kannst du als Admin einzelne Apps pro Mandant ausblenden, z.B. wenn du Telegram Web nicht anzeigen willst. Die Liste wird in `tenant_settings` unter `launcher.disabled_slugs` persistiert.

**Eigene Apps (ab v3.40.0):** In der App-Hub-Verwaltung kannst du als Admin zusätzlich **eigene Web-Apps anlegen, ändern und löschen** (Emoji, Name, URL, optionale Notiz; nur http/https-Adressen). Eigene Apps erscheinen für alle Nutzer unter der Kategorie „Eigene" und werden pro Mandant gespeichert; Anlegen, Ändern und Löschen landen im Audit-Log.

## 📍 Ort manuell eintragen (ohne GPS) {#manual-location}

Liefert dein Tesla keine GPS-Daten (typisch bei XP7-VIN ohne aktive Fleet Telemetry oder bei Verbindungs-Aussetzern), kannst du den Ladeort und Trip-Adressen manuell pflegen:

- **Ladeort** in der Ladeliste auf den Ortsnamen klicken → Inline-Editor öffnet sich. Drei Wege: aus den definierten Ladeorten wählen (Tarif/Position werden übernommen), freier Anzeigename, oder GPS-Koordinaten manuell eingeben (löst Auto-Match gegen die definierten Ladeorte aus, Standardradius 200 m).
- **Fahrt-Adressen** unter `Fahrtdetail → ✎ Bearbeiten`: Start- und Ziel-Adresse als Freitext, optional GPS-Koordinaten dazu für die Karte.

Jedes Eingabefeld trägt einen Mouse-over-Hinweis mit Kontext (was tut das Feld, wann brauche ich es, was passiert beim Speichern).

### Automatische Adress-Auflösung ab v3.8.0 {#auto-geocode}

**Adresse vor Koordinaten ab v3.10.0**: In allen Listen (Fahrtenbuch, Trips, Lade-Sessions) und Detail-Ansichten wird die Adresse bevorzugt angezeigt. Nur wenn keine Adresse hinterlegt ist (oder das Backfill noch nicht durch war), erscheinen lat/lon als Fallback — auf 4 Dezimalstellen formatiert (~11 m). Wo möglich wird also der Klartext-Ort gezeigt, nicht „54.1234, 9.5678".

Wenn ein Trip oder eine Lade-Session **GPS-Koordinaten aber keinen Adress-Text** hat, holt TeslaView die Adresse automatisch im Hintergrund:

- **Live-Trigger**: Direkt nach jedem OwnTracks-Trip-Close und jedem Charging-Insert läuft ein fire-and-forget Reverse-Lookup.
- **Nightly-Backfill**: Pro Nacht werden bis zu 60 ältere Datensätze pro Mandant nachgeholt.
- **Admin-Sofort-Lauf**: `POST /api/system/geocode-backfill` (im Admin-Bereich) löst einen sofortigen Lauf mit konfigurierbarem `limit` aus.

**Quelle**: [Nominatim/OpenStreetMap](https://nominatim.openstreetmap.org) — kostenlos, kein Account, kein API-Key. Datensouverän (OSM-Foundation, EU).

**Lokaler Cache**: Jeder Lookup landet in `geocode_cache` (auf 4 Dezimalstellen ~11 m gerundet) und steht damit allen weiteren Trips/Sessions am selben Ort ohne erneuten externen Call zur Verfügung. Der Nominatim-Rate-Limit von 1 Request/Sekunde wird strikt eingehalten.

## 🎮 Erweiterte Fahrzeugsteuerung {#control-extended}

Unter **Steuerung** ist die App mittlerweile sehr nah am Funktionsumfang der Tesla-Mobile-App:

| Bereich | Funktionen |
|---|---|
| Klima | Ein/Aus, Solltemperatur, Vorklim-Max-Defrost, **Climate-Keeper-Modi** (Aus / Halten / 🐶 Hund / ⛺ Camp), Lenkradheizung |
| Sitze | 5 Sitze (Fahrer, Beifahrer, hinten links/Mitte/rechts) × 4 Heizstufen |
| Karosserie | Türen, Sentry-Mode, Frunk- & Heckklappen-Aktor, Fenster lüften/schließen, Lichter & Hupe |
| Laden | Start/Stop, Ladelimit-Slider, **Ladestrom-Slider (5–48 A)**, Ladeklappe auf/zu |
| Boombox | 9 vorinstallierte Tesla-Sounds über die externen Lautsprecher (nur Modelle mit Boombox-Hardware, Fahrzeug muss stehen) |
| Vorklim-Zeitplan | Tägliche Abfahrtszeit, optional nur Mo–Fr — Tesla startet Vorklim ca. 20–30 min vorher; Fahrzeug muss am Strom hängen |
| Off-Peak laden | Fester Lade-Start für dynamische Tarife (Tibber, aWattar, Nachtstrom). Anders als der Vorklim-Zeitplan rechnet das Auto **nicht** zurück — die Uhrzeit ist der Start, nicht das Fertig-Soll. Ladevorgang läuft, bis das Ladelimit erreicht ist. |
| Software-Update | Status (verfügbar / Download / Install / geplant), „Jetzt installieren" plant Update mit 1 Min Versatz, „Abbrechen" löscht eine geplante Installation |

Hinweise:
- Befehle benötigen einen aktiven **Virtual Key** und einen laufenden `tesla-http-proxy` (siehe Schnellstart).
- Bei schlafendem Fahrzeug werden Befehle abgelehnt → erst „☀️ Aufwecken" drücken (~30 s).
- Climate-Keeper läuft nur, wenn die Klimaanlage zuvor eingeschaltet wurde und der Fahrer das Auto verlässt.

## 📜 Rechtliche Inhalte verwalten {#legal-admin}

Unter **Admin → Rechtliche Inhalte** pflegt der Administrator Impressum, Datenschutz und Nutzungsbedingungen. Drei Punkte sind dabei wichtig:

- **Default-Sprache pflegen, andere mitziehen** — Standardmäßig ist der Sync-Modus aktiv: du editierst die deutsche Variante, die anderen fünf Locales übernehmen byte-identisch denselben Text. Im Frontend erscheint dann ein blauer Hinweisbanner („derzeit nur auf Deutsch gepflegt"). Sync-Modus lässt sich pro Edit deaktivieren, um eine Locale individuell zu pflegen.
- **Versionsbump aktualisiert das Datum automatisch** — Wenn du beim Speichern „Version erhöhen" anhakst, schreibt das Backend zunächst das heutige Datum in die „Stand:"-Zeile des Bodys (oder das Locale-spezifische Pendant „Last updated:" / „Dernière mise à jour" usw.) und führt erst danach den Versions-Increment aus. So trägt jede Major-Version automatisch das richtige Datum, ohne dass du die Zeile manuell pflegen musst. Reine Body-Korrekturen ohne Bump lassen das Datum unverändert.
- **Akzeptanz-Tracking** — Bei jedem Bump müssen alle aktiven Benutzer Datenschutz und Nutzungsbedingungen erneut akzeptieren — das Akzept-Modal blockt den Login bis dahin. Akzeptanzen werden DSGVO-konform pro User+Version+IP+Zeitstempel in der Tenant-DB gespeichert.

## 🔧 Wartungsintervalle {#service-intervals}

Unter **Betriebsbuch** findest du oberhalb der Eintrags-Liste die Karte „🔧 Wartungsintervalle". Dort definierst du pro Fahrzeug wiederkehrende Service-Aufgaben (TÜV, Inspektion, Bremsflüssigkeit, Reifenwechsel, Innenraumfilter, Wischblätter, Klimaservice). Pro Eintrag wählst du ein **Zeitintervall** (Monate), ein **km-Intervall**, oder beides. „Standards anlegen" füllt eine Tesla-typische Default-Liste vor. Die Intervalle sind eng mit den darunter angezeigten Betriebsbuch-Einträgen (Wartung, Reifen, Inspektion) verzahnt — beides am selben Ort gehört zusammen.

**Vorausschau (v3.31):** Bei km-Intervallen rechnet TeslaView aus deiner tatsächlichen Fahrleistung (Ø km/Tag der letzten 90 Tage) hoch, wann das Intervall voraussichtlich fällig wird („≈ in ~6 Wochen"). Der HU/TÜV-Termin läuft als reguläres Zeit-Intervall mit Countdown mit. Im TCO-Cockpit zeigt ein **12-Monats-Kostenausblick** die erwarteten Wartungs-, Strom-, Versicherungs- und Steuerkosten der nächsten 12 Monate (fortgeschrieben aus den letzten 12 Monaten). Reine Statistik.

Die App rechnet daraus „fällig in X Tagen / Y km" und zeigt überfällige bzw. bald-fällige Einträge oben auf dem Dashboard. Ein **täglicher Push-Reminder** (Web-Push) springt an, sobald ein Intervall < 30 Tage oder < 1.000 km Restweg übrig hat. Anti-Spam: pro Push wird der Eintrag markiert; eine erneute Erinnerung kommt erst nach „Erledigt"-Stempel oder einer 30-Tage-„Aufschieben"-Aktion. Mark-as-done setzt automatisch das heutige Datum und den aktuellen Kilometerstand.

## 📋 Audit-Log {#audit-log}

Unter **Admin → Audit-Log** sieht der Administrator alle sicherheitsrelevanten Ereignisse: Logins (Erfolg + Fehlversuche), Konto-Sperren, MFA-Setup, Berechtigungs-Änderungen, Tesla-Befehle, Datenschutz-Akzeptanzen, Benutzer-Anlage. Filterbar nach Aktion, User-ID und Zeitraum. Aktionen sind farb-codiert (rot = Fehlversuch, blau = Auth, violett = Admin-Aktion). Details-Block expandiert das JSON. **CSV-Export** liefert das gefilterte Set Excel-tauglich (Semikolon, BOM) — geeignet für DSGVO-Auskunftsanfragen oder Forensik. Daten sind pro Mandant isoliert.

## 📄 PDF-Abrechnung {#pdf-billing}

In der **Kostenabrechnung** erzeugt der Button **„📄 PDF erzeugen"** ein unterschriftsreifes A4-Blatt: Briefkopf (Firma, Fahrzeug, Zeitraum), Sessions-Tabelle inkl. 🏠-Marker für per Monta erkannte Heim-Ladungen, Summen (Sessions/kWh/Betrag) und Unterschriftsfeld unten. Generierung läuft komplett im Browser via `jsPDF` — keine Lade-Daten verlassen den eigenen Rechner. Das Ergebnis ist direkt beim Arbeitgeber einreichbar.

## 💸 Dynamischer Strompreis {#dynamic-tariff}

Wenn du einen dynamischen Stromtarif hast (Tibber, aWattar HOURLY, EPEX-Spot), kannst du unter **Einstellungen → Strompreis-API** einen Anbieter konfigurieren:

| Anbieter | API-Token | Preis-Basis |
|---|---|---|
| **aWattar** (DE/AT) | nicht nötig — öffentlich | EPEX-Spotpreis, optional + Aufschlag in ct/kWh |
| **Tibber** (DE/SE/NO/NL/…) | Token von developer.tibber.com | Persönlicher Endpreis inkl. Steuern |

Im Dashboard erscheint dann ein **Tarif-Widget** mit aktuellem Preis, einer 24h-Balkenkurve und der Empfehlung „günstigstes 4h-Fenster". Ein Klick auf **„🚗 Lade-Plan auf günstigstes Fenster"** schreibt den Beginn des Fensters direkt in `set_scheduled_charging` des Autos — das Auto wartet bis dahin und lädt dann bis zum Ladelimit. Preise werden 30 min lang gecacht. Wenn kein Anbieter konfiguriert ist, ist das Widget unsichtbar; es geht dann kein Outbound-Call raus.

## 📒 Fahrtenbuch für das Finanzamt {#fahrtenbuch-bmf}

Das Fahrtenbuch ist so ausgestaltet, dass der erzeugte **PDF-Export von deutschen Finanzämtern als elektronisches Fahrtenbuch nach BMF-Schreiben** anerkannt werden kann.

**So nutzt du es Schritt für Schritt:**

1. **Fahrten klassifizieren** — pro Fahrt einen Klick auf den Typ-Badge: wechselt durch Privat → Dienst → Arbeitsweg.
2. **Bei Dienstfahrten zwei Felder ausfüllen** (BMF-Pflicht):
   - **Geschäftspartner** — wen hast du besucht? (z.B. „Müller GmbH, Stuttgart")
   - **Reisezweck** — geschäftlicher Anlass (z.B. „Vertragsverhandlung Projekt X")
3. **Monat wählen** im Filter oben.
4. **„📄 Finanzamt-PDF" klicken** — ein A4-Querformat-Dokument wird erzeugt mit lückenloser Nummerierung, Kilometerständen am Anfang/Ende jeder Fahrt, Strecken, Reiseziel (Von → Nach), Geschäftspartner und Reisezweck pro Eintrag. Seitennummerierung und „Erstellt am"-Stempel auf jeder Seite.

**Manipulationsschutz** — nach dem Export werden die enthaltenen Fahrten automatisch gegen Änderungen gesperrt (BMF verlangt, dass nachträgliche Manipulationen entweder ausgeschlossen oder dokumentiert sind). Im Fahrtenbuch erscheinen gesperrte Fahrten mit einem 🔒-Symbol; Klassifikation, Geschäftspartner und Adressen lassen sich nicht mehr ändern. Bis zum Export erfolgte Korrekturen werden in einer **Änderungs-Historie** pro Fahrt protokolliert.

**Manuelle Fahrt nachtragen** — falls eine Fahrt fehlt (z.B. weil Tesla keine GPS-Daten lieferte oder eine Verbindung kurz aus war), kannst du sie via **„+ Manuell"** komplett selbst eintragen. Pflichtangaben: Start- und Endzeit. Empfohlen: Kilometerstände Start/Ende oder die Strecke. Manuelle Einträge erscheinen mit einem ✍-Symbol.

**Mehrere Fahrten zusammenführen** — wenn die Telemetrie eine Fahrt versehentlich in zwei Teile zerlegt hat (kurzer Halt an der Ampel, GPS-Aussetzer), klicke bei der ersten Fahrt auf **„Mit nächster zusammenführen"**. Die Endwerte werden vom späteren Trip übernommen, die Distanz summiert, GPS-Punkte verschmolzen.

## 🗓️ Aktivitäts-Heatmap {#trips-heatmap}

Im Fahrtenbuch findest du oberhalb der Monatsübersicht eine **Heatmap aller Fahrten** im klassischen Kalender-Stil:

- **Filter oben**: Granularität wählen — `Jahr`, `Monat`, `Woche` oder `Alle`. Bei `Jahr/Monat/Woche` erscheint ein zweiter Selektor für den konkreten Zeitraum.
- **Farbintensität** pro Tag entspricht den gefahrenen Kilometern; dunkler Block = kein Fahrtag, hellgrün = viel.
- **Hover** über einen Tag zeigt Datum + Anzahl Fahrten + Gesamt-km in einem Tooltip.
- **Klick** auf einen nicht-leeren Tag navigiert direkt zur Fahrtenliste mit Datumsfilter — schnelle Antwort auf „was war an dem Tag?".
- Footer zeigt die Skala-Legende sowie das Gesamt-Total des aktuellen Filters.

Datenbasis: dieselben Trips wie das BMF-Fahrtenbuch — die Heatmap ist eine reine Visualisierung, sie schreibt nichts.

## 📱 Auf Smartphone und im Tesla nutzen (PWA-Install) {#mobile-tesla-install}

Tesla Carview ist eine **PWA** (Progressive Web App) — du kannst sie wie eine native App installieren, ohne Apple-/Google-Store. Funktioniert auf iPhone, iPad, Android, im Tesla-Fahrzeug-Browser und auf jedem Desktop-Chromium.

**Smartphone Android / Tesla / Chrome / Edge:**
1. App im Browser öffnen, einloggen.
2. Es erscheint unten ein Banner „Carview als App installieren" → **Installieren** tippen.
3. Symbol erscheint auf dem Home-Bildschirm. Tippen öffnet die App im Vollbild, ohne Browser-Leiste.

**iPhone / iPad (Safari):**
1. App im Safari öffnen, einloggen.
2. **Teilen-Knopf** → **„Zum Home-Bildschirm"** → Hinzufügen.
3. Symbol erscheint auf dem Home-Bildschirm wie bei nativen Apps.

**Im Tesla-Display:**
- Im Auto: Browser öffnen, deine Carview-URL eingeben.
- Die App passt sich an die Tesla-Bildschirmgröße an. Bei schmaler Darstellung (Hochformat) wechselt das Fahrtenbuch automatisch in eine Karten-Ansicht mit großen Tap-Zielen.
- Tipp: **„◫ Karten"-Schalter** oben im Fahrtenbuch erzwingt die kompakte Ansicht auch auf größeren Displays.

**Empfehlung:** Lass dir Carview auf dem Tesla-Display als Lesezeichen ablegen — Tesla zeigt eingestellte Lesezeichen direkt im Browser-Schnellzugriff. Für das Eintragen von Fahrt-Notizen während einer kurzen Pause ist das schneller als die URL jedes Mal zu tippen.

### 🔒 Manipulationssicheres Fahrtenbuch (v3.47.0) {#tamper-proof}

Jede Änderung an einer Fahrt (Klassifizierung, Geschäftspartner, Fahrer, Ort, Anlegen, Zusammenführen/Teilen, Löschen) wird in eine **HMAC-signierte, verkettete Hash-Chain** geschrieben. Jeder Eintrag hängt am HMAC des Vorgängers und ist mit einem serverseitigen Schlüssel signiert — dadurch lässt sich die Änderungshistorie nicht unbemerkt nachträglich verändern oder lückenhaft machen, auch nicht durch den Betreiber (GoBD-Grundsätze Nachvollziehbarkeit + Unveränderbarkeit).

Über der Fahrtenliste zeigt ein **Integritäts-Status**, ob die Kette lückenlos verifiziert ist (grün) oder ein Bruch erkannt wurde (rot, mit Eintragsnummer). Das Finanzamt-PDF trägt zusätzlich eine entsprechende Aussage. Bestandsfahrten erhalten beim ersten Start einmalig einen Basis-Eintrag.

**Wichtig:** Der Signatur-Schlüssel liegt in `data/.ledger-key` — zusammen mit dem `data/`-Verzeichnis sichern; geht er verloren, lässt sich die Kette nicht mehr verifizieren.

### 🚗 Fahrtenbuch direkt im Tesla-Browser öffnen {#tesla-direkt}

Der Button **„🚗 Im Tesla öffnen"** oben im Fahrtenbuch macht den Tesla-Browser-Zugriff kinderleicht:

1. Öffne in Carview auf deinem Handy oder Desktop **Auswertungen → Fahrtenbuch**.
2. Klicke auf **„🚗 Im Tesla öffnen"**.
3. Ein Modal erscheint mit einem **QR-Code** und einer **direkten URL** (z. B. `https://deine-app.example.com/pair/abc123…`).
4. Öffne im Tesla den Browser und gib die URL ein — oder scanne den QR mit einer Kamera, falls vorhanden.
5. Der Tesla-Browser öffnet eine Passkey-Authentifizierungsseite. Tippe auf **„Per Passkey bestätigen"** und authentifiziere dich mit dem biometrischen Verfahren des Geräts.
6. Nach erfolgreicher Authentifizierung ist der Tesla-Browser angemeldet und navigiert direkt ins Fahrtenbuch — ohne weitere Schritte.

Die Pair-Session ist **5 Minuten** gültig. Der dabei gesetzte Refresh-Token-Cookie hält den Tesla-Browser **7 Tage** eingeloggt (wird bei jedem Aufruf automatisch erneuert). Die Fahrtenbuch-URL lässt sich in Teslas Browser-Schnellzugriff als Lesezeichen speichern — nach der Ersteinrichtung reicht ein Tipp.

**Funktioniert für jedes Fahrzeug** — Fahrtenbuch und manuelle Fahrtenerfassung benötigen keine Tesla-API-Verbindung. Auch Fahrer anderer Automarken können die manuelle Eingabe („+ Manuell") nutzen und ein BMF-konformes PDF exportieren.

### 📲 iPhone-Navigation: Tab Bar

Auf dem iPhone und anderen Smartphones zeigt Tesla Carview eine **native iOS-style Tab Bar** am unteren Bildschirmrand:

- **4 Schnell-Tabs** — Dashboard, Fahrten, Laden, Steuerung immer direkt erreichbar
- **„Mehr"-Taste** → öffnet ein Bottom Sheet mit allen anderen Bereichen (Fahrtenbuch, Batterie, Grok, Admin …)
- **Dynamic Island / Home Indicator** werden korrekt ausgespart
- Der aktive Tab wird mit einem kleinen Indikator-Strich markiert

Im **Nevs-Edition**-Design wechselt die Tab Bar zur Petrol-Farbgebung.

## 🗺️ Routenplaner {#route-planner}

Der Routenplaner unter **Routenplaner** berechnet Fahrrouten und zeigt Schnellladestationen entlang der Strecke an.

**Persönliche Reichweite statt WLTP (v3.29):** Der prognostizierte Ankunfts-Ladestand kommt aus deinem **eigenen, temperatur-abhängigen Verbrauch** (aus der Trip-Historie), nicht aus der WLTP-Reichweite. Ist die Ziel-Temperatur aus dem Wetter bekannt, werden nur Fahrten aus einem ±7-°C-Fenster herangezogen. Angezeigt werden zusätzlich ein Vertrauensband (erwartete Schwankung einzelner Fahrten), die Datenbasis (Verbrauch bei der Zieltemperatur bzw. dein Schnitt) und eine „Könnte knapp werden"-Warnung, wenn das Band ins Kritische reicht. Reine Statistik, keine KI; ohne genügend Trips greift die bisherige WLTP-Schätzung.

**Route berechnen** — Gib Start- und Zieladresse ein. Über „+ Zwischenstopp" lassen sich beliebig viele Wegpunkte einfügen und per Drag-and-drop umsortieren.

**Vermeiden-Optionen** — Drei Toggle-Chips direkt am Zielfeld:
- **Autobahnen** — Strecke meidet Schnellstraßen, wird über Bundes- und Landstraßen geführt
- **Mautstraßen** — mautpflichtige Streckenabschnitte werden umgangen
- **Fähren** — keine Fährverbindungen in der Route

Die gewählten Optionen werden im Browser gespeichert und gelten für alle folgenden Routenberechnungen bis zur nächsten Änderung. Das Routing nutzt intern die Valhalla-Engine (openstreetmap.de); bei kurzfristiger Nichterreichbarkeit wird automatisch auf OSRM umgestellt (Hinweis erscheint als Toast).

**Schnellladestationen** — Die Karte zeigt Supercharger und CCS-Schnelllader entlang der Route. Voraussetzung: ein kostenloser OpenChargeMap-API-Key muss in **Admin → System → Externe API-Schlüssel** hinterlegt sein. Fehlt der Key, erscheint ein Toast mit Direkt-Link zu den Einstellungen. Die Suche verwendet den gewählten Radius (5/10/25/50 km) korrekt, zeigt Stationsnamen und Adressen, filtert nach DC-only und liefert Informationen zu Steckertypen, Anzahl der Ladepunkte und Tesla-Kompatibilität.

**Echtzeit-Verkehr** — Wenn ein HERE Maps API-Key konfiguriert ist (ebenfalls unter Admin → System), wird der aktuelle Verkehrsfluss berücksichtigt und in der Reisezeit-Schätzung abgebildet.

**Ladeplanung** — Bei aktivierter SoC-Planung (Akkustand eingeben) berechnet der Planer intelligente Ladestopps mit Zeitschätzung und prüft, ob die Reichweite für jeden Abschnitt ausreicht.

## 🔌 Ladestationen-Suche {#charger-finder}

Unter **Planung → Ladestationen** lassen sich Schnellladestationen in der Nähe eines beliebigen Ortes suchen.

**Voraussetzung** — Ein kostenloser [OpenChargeMap-API-Key](https://openchargemap.org/site/develop/api) muss in **Admin → System → Externe API-Schlüssel** hinterlegt sein. Fehlt der Key, erscheint ein Hinweis-Banner mit direktem Link zur Konfigurationsseite.

**Suche starten:**
1. Adresse oder Ort eingeben → **Suchen** (oder Enter drücken)
2. Alternativ: **📍 Mein Standort** — nutzt die Browser-Geolokalisierung
3. Radius (5/10/25/50 km) und DC-only-Filter nach Bedarf anpassen

**Ergebnisse** zeigen Name, Adresse, Betreiber, maximale Leistung (kW), Anschlussanzahl und Steckertypen. „In Maps öffnen" startet Google Maps Navigation zur Station.

> **Tipp:** Im Routenplaner sind Schnellladestationen direkt auf der Karte entlang der Route sichtbar — ohne separaten Suchschritt.

## 💬 Telegram-Bot {#telegram}

Tesla Carview hat einen voll integrierten Telegram-Bot — Fahrzeugstatus, Befehle und Push-Benachrichtigungen direkt aufs Handy.

**Einrichtung:**

1. **Admin**: Bot-Token in den Tenant-Einstellungen unter *Telegram* hinterlegen (`telegram.bot_token`)
2. **Nutzer**: In Carview unter *Einstellungen → Benachrichtigungen → Telegram verknüpfen* einen 6-stelligen Code generieren
3. **Im Telegram**: an den Bot `/start <Code>` schicken — fertig

**Befehle (alle im `/`-Menü und Menü-Button sichtbar):**

| Befehl | Was |
|---|---|
| `/status` | Fahrzeugstatus + 9 Inline-Buttons (Lock, Unlock mit Confirm, Klima, Sentry, Laden, Aktualisieren) |
| `/battery` | Akkustand + letzte Ladung |
| `/range` | Restreichweite (rated + ideal) |
| `/location` | Aktueller Standort + Google-Maps-Link |
| `/today` | Tagesbilanz: Fahrten, km, kWh, Kosten (€) |
| `/trips` | Letzte 5 Fahrten |
| `/classify` | Letzte Fahrt als privat/geschäftlich/pendel markieren (Dienstwagen-Fahrtenbuch) |
| `/service` | Nächste fällige Wartung |
| `/firmware` | Aktuelle Software-Version |
| `/clean` | Bot-Nachrichten aufräumen (`/clean all` für aggressiveren Scan) |
| `/help` | Befehlsliste |
| `/unlink` | Verknüpfung aufheben |

**Inline-Buttons unter `/status`:**

Statt Befehle zu tippen, ein Tap genügt: 🔒 Lock / 🔓 Unlock (mit Bestätigungs-Schritt), ❄️ Klima an/aus, 🛡 Sentry an/aus, ⚡ Laden start/stop, ⟳ Aktualisieren. Jede Aktion wird im Audit-Log als `telegram_command` mit `vehicle_id`, `command`, `body` und `result/error` festgehalten.

**Proaktive Push (parallel zu Web Push):**

- ⚡ Ladung abgeschlossen (mit kWh und Kosten)
- 🚨 Sentry-Alarm (Wachmodus erkennt Bewegung)
- 🔧 Wartungsfälligkeit (täglicher Scheduler)
- 💾 Neue Firmware-Version installiert

Wer keinen Telegram-Account verknüpft hat, sieht weiterhin nur die Web Push. Beide Channels laufen parallel.

**Sicherheit:**

`door_unlock` ist die einzige sicherheitskritische Aktion und braucht eine zweite Bestätigung im Chat. Alle anderen Aktionen (Lock, Klima, Sentry, Laden) sind direkt ausgeführt. Bei einem fremden Zugriff auf den Telegram-Account können maximal Fahrzeug-Aktionen ausgeführt werden, die der verknüpfte App-User auch in Carview hätte — der Audit-Log macht das nachvollziehbar.

Mockups + komplette Übersicht: [www.teslaview.krische.com/#telegram](https://www.teslaview.krische.com/#telegram).

## ⚡ Automationen {#automations}

Unter **Planung → Automationen** lassen sich Push-Alarme und automatische Aktionen einrichten — ohne Programmierung.

**Beispiele:**
- Lade-Alarm bei Akkustand < 20 %
- Benachrichtigung wenn Laden abgeschlossen
- Geofence-Aktion wenn Fahrzeug Heimbereich verlässt oder betritt

Automationen werden serverseitig ausgeführt und senden Browser-Push-Benachrichtigungen (erfordert erteilte Push-Berechtigung im Browser).

## 🟢 System-Status (Admin) {#system-health}

Ganz oben unter **System** liegt der **🛡️ Betriebs-Selbsttest** (v3.32): Auf „Jetzt prüfen" — und automatisch wöchentlich im nächtlichen Wartungslauf — prüft TeslaView Sicherheit und Backup-Integrität: MFA-Abdeckung, Verschlüsselungsschlüssel, kritische Secrets, Audit-Log-Aktivität, SQLite-Datenbank-Integrität sowie Aktualität und Inhalt des letzten Backups (Datei lesbar, alle Tabellen enthalten). Ergebnis ist eine Ampel je Prüfung; Auffälligkeiten landen zusätzlich im Audit-Log. Reine Diagnostik.

Darunter sieht der Admin eine farbige Ampel-Karte mit acht Checks:

- **Tesla OAuth-Token** — verbunden? Wann läuft er ab?
- **Virtual Key** — erzeugt? (Pflicht für Fahrzeugbefehle)
- **Fleet Telemetry** — wann kam zuletzt ein Datenpunkt an?
- **Tesla-Poller** — wann hat die App zuletzt Fahrzeugdaten abgefragt?
- **Tenant-DB** — Größe der Datenbank
- **Nachtwarung** — Zeitpunkt des letzten automatischen Wartungslaufs
- **OpenChargeMap** — Live-Probe des OCM-API-Endpunkts (gedimmt/info wenn kein Key konfiguriert)
- **HERE Maps** — Live-Probe der HERE-Routing-API (gedimmt/info wenn kein Key konfiguriert)

Die Karte ist grün (alles ok), gelb (Aufmerksamkeit, z.B. Token läuft bald ab) oder rot (Aktion nötig, z.B. Token abgelaufen) — auf einen Blick erkennbar, ob die Selbsthosting-Instanz gesund ist. Optionale Services (OCM, HERE) werden nur als Fehler gewertet, wenn ein Key konfiguriert ist, die Gegenstelle aber nicht antwortet.

**Monitoring & Selbstheilung** — Darunter erscheint die Monitoring-Karte mit zwei Einstellungen:
- **Selbstheilung an/aus** — Ein automatischer Cron-Job prüft alle 15 Minuten, ob alle Container laufen und `/api/health` antwortet. Ausgefallene Services werden automatisch neu gestartet.
- **Alert-E-Mail** — Wird nach einem Neustart eine E-Mail-Adresse gefunden, erhält sie eine Benachrichtigung mit Zeitstempel und Anzahl der neu gestarteten Services.

Heal-Log und Security-Check-Log der letzten 50 Einträge sind direkt in dieser Karte einsehbar und per „Log aktualisieren" jederzeit frisch abrufbar.

## 💬 Grok Chat {#grok}

Der **Grok Chat** bringt xAI-gestützte Konversation direkt in Tesla Carview. Du kannst in natürlicher Sprache Fragen zu deinen Fahrten, Ladedaten und Fahrzeugstatistiken stellen.

**Kontext**: Wenn der Fahrzeugdaten-Toggle (Tachometer-Symbol) aktiv ist, sendet der Chat letzten Trip, letzte Ladung und Kilometerstand als Kontext mit. Deaktiviere ihn für allgemeine Fragen.

**Neuer Chat**: Klicke auf **+ Neuer Chat** in der Sidebar. Gib deine Frage ein und drücke Enter oder Senden. Der Text erscheint gestreamt — der Cursor zeigt an, dass Grok noch tippt.

**Tesla-Browser**: Im Tesla-Browser (< 768 px) klappt die Sidebar oben ein. Spracheingabe nutzt die Web Speech API (Tesla-Browser V12+).

**Tagesbudget**: Standardmäßig **100 Cent/Tag**. Die aktuelle Nutzung wird oben in der Sidebar angezeigt. Bei Überschreitung ist der Chat bis Mitternacht gesperrt.

**Datenschutz**: Anfragen laufen über das Backend — nie direkt vom Browser zu xAI. Keine Klardaten (vollständige VIN, exakte Adressen).

## 🌍 CO₂-Vergleich {#co2}

Der **CO₂-Vergleich** im Energiebericht zeigt, wie umweltfreundlich du fährst:

- **Tesla-CO₂** — Hochrechnung deines Verbrauchs auf den deutschen Strommix (0,38 kg CO₂/kWh). Realer Wert ist niedriger, wenn du Solar- oder Ökostrom lädst.
- **Diesel-Äquivalent** — Wie viel CO₂ ein vergleichbares Fahrzeug mit 7 l/100 km (2,65 kg CO₂/l) verursacht hätte.
- **Eingesparte Tonnen** — Der Unterschied zwischen Tesla und Diesel. Zeigt, wie viel CO₂ du tatsächlich gespart hast.

Die Werte werden für den gewählten Zeitraum (4/8/12 Wochen) berechnet und auch pro Woche im Trend-Chart als grüner Balken angezeigt.

## 🌡️ Wetter-Verbrauch {#weather-consumption}

Die **Wetter-Verbrauchskorrelation** zeigt, wie Außentemperatur deinen Verbrauch beeinflusst. Das Balkendiagramm im Energiebericht gruppiert alle Fahrten in 6 Temperatur-Buckets:

| Bereich | Typisches Verhalten |
|---|---|
| < −10 °C | Sehr hoher Verbrauch (Heizung, Akku-Kälte) |
| −10 bis 0 °C | Hoher Verbrauch |
| 0 bis 10 °C | Erhöhter Verbrauch |
| 10 bis 20 °C | Optimaler Bereich |
| 20 bis 30 °C | Minimal erhöht (Klimaanlage) |
| > 30 °C | Erhöhter Verbrauch (Klimaanlage) |

Balken mit weniger als 2 Fahrten werden nicht angezeigt. Die Farbe der Balken wechselt von Grün (günstig) über Gelb zu Rot (ungünstig).

## ❄️ Klimastatistiken {#climate-stats}

Die **Klimastatistiken**-Seite (`/climate`) zeigt die tägliche Nutzung des Klimasystems deines Fahrzeugs:

- **Klimaanlage** — Stunden pro Zeitraum (gezählt aus dem Polling-Intervall, hochgerechnet)
- **Sitzheizung Fahrer/Beifahrer** — Anzahl Tage, an denen Sitzheizungen aktiv waren
- **Vorklimatisierungen** — Wie oft die App/ein Zeitplan die Klimaanlage eingeschaltet hat
- **Kältester/wärmster Tag** — Außen- bzw. Innentemperatur-Extremwerte

Die Daten werden **automatisch bei jedem Fahrzeug-Sync** erfasst. Wähle den Zeitraum oben (30 / 90 / 365 Tage). Im täglichen Diagramm bedeutet 🪑 = Sitzheizung aktiv, 🔄 = Vorklimatisierung.

## 📦 Firmware-Update-Tracker {#firmware}

Der **Firmware-Tracker** in Admin → System zeigt alle bisher installierten Softwareversionen deines Fahrzeugs:

- **Aktuelle Version** — oben hervorgehoben
- **Verlauf** — Datum der Erkennung, Vorgänger-Version, Tage installiert
- **Gesamtanzahl Updates** — wie oft das Fahrzeug eine neue Version erhalten hat

Die Erkennung erfolgt automatisch: Jedes Mal wenn der Backend-Sync eine neue `car_version` feststellt, wird sie in `firmware_versions` gespeichert. Es wird nur eine Zeile pro Version gespeichert (kein Duplikat).

## 🌍 Community Benchmark {#community-benchmark}

Der **Community Benchmark** (im Energiebericht) ermöglicht anonymen Verbrauchsvergleich mit anderen Tesla-Fahrern desselben Modells.

**Datenschutz-Prinzipien:**
- Nur aggregierte Werte (kWh/100 km) — keine Rohdaten, keine GPS-Koordinaten
- Deine Instanz wird als SHA-256-Hash gespeichert, nicht als Name oder E-Mail
- Mindestens **3 Teilnehmer** nötig, bevor Statistiken angezeigt werden (k-Anonymität)
- Widerruf jederzeit: Toggle ausschalten → Daten werden sofort gelöscht

**Mitmachen:**
1. Toggle „Mitmachen" aktivieren
2. Auf „Daten beitragen" klicken — dein aktueller Durchschnittsverbrauch wird übermittelt
3. Sobald ≥ 3 Teilnehmer für dein Modell vorhanden sind, siehst du Ø, P25, P75 und deine Position

## 🎨 Design & Themes {#design-themes}

Tesla Carview bietet **5 Design-Stile** und **6 Akzentfarben** — alle lokal gespeichert, kein Server-Reload nötig.

### Design-Stile

| Design | Charakter |
|---|---|
| ✨ **Premium Glass** | Weich, edel, Glasmorphismus mit Backdrop-Blur |
| ⚡ **Cyberpunk-Tesla** | Neon-Glow, scharfe Linien, monospace-lastig |
| ◻ **Minimal Swiss** | Viel Weißraum, reduziert, Zahlen im Fokus |
| ▰ **Sport / Performance** | Kantig, mutig, Tachometer-Anmutung |
| ◈ **Nevs-Edition** | Tech-Editorial, Petrol-Akzent, Bricolage Grotesque Typographie |

**Nevs-Edition** ist der einzige Stil mit eigener Typographie-Suite: *Bricolage Grotesque* für Headlines, *Manrope* als Body-Font und *JetBrains Mono* für Labels. Dazu kommt ein schmaler **Status-Streifen** über der NavBar mit Live-Fahrzeugdaten (Akkustand, Gang, Kilometerstand, letztes Sync-Signal).

### Akzentfarben

6 Farben: Tesla Rot, Elektro Blau, Energie Grün, Lila, Sonnenuntergang, Eisblau — frei kombinierbar mit jedem Design-Stil.

Wechseln: **Einstellungen → Design & Farben**.

## 🔧 Fehlerbehebung {#troubleshooting}

**Das Fahrzeug gibt keine GPS-Daten zurück**
Neuere Tesla-Modelle (XP7-VIN, z.B. Model Y Juniper) liefern keinen drive_state via REST-API. GPS-Tracking erfolgt über Fleet Telemetry. Stelle sicher, dass tesla-http-proxy läuft und der Virtual Key registriert ist.

**Login funktioniert nicht nach dem Update**
Bei einem Update auf v2.0 (Multi-Tenant) wird beim Login ein Mandanten-Kürzel benötigt. Das Kürzel für die migrierte Datenbank ist „default". Gib es im Login-Feld ein oder klicke auf „Mandant auswählen".

**Tesla-Verbindung schlägt fehl (401)**
Der Tesla OAuth-Token ist abgelaufen. Gehe zu Einstellungen → Tesla-Verbindung und verbinde dein Tesla-Konto erneut. Stelle sicher, dass `TESLA_CLIENT_ID` und `TESLA_CLIENT_SECRET` in der `.env` korrekt sind.

**Fahrzeugbefehle schlagen fehl**
Prüfe: 1) tesla-http-proxy läuft (`systemctl status tesla-http-proxy`) 2) Virtual Key ist am Fahrzeug registriert (Einstellungen → Fahrzeugverbindung) 3) Das Fahrzeug ist online (nicht schlafen).

**Keine Telemetrie-Daten / GPS fehlt**
Fleet Telemetry erfordert zwei Schritte: (1) App bei Tesla registrieren (Einstellungen → „🔑 App registrieren"), (2) Telemetrie aktivieren (Einstellungen → „📡 Telemetrie aktivieren"). Falls Schritt 2 mit HTTP 404 scheitert, muss der `fleet_telemetry_config`-Zugang beim Tesla Developer Support beantragt werden – Vorlage steht im Handbuch unter „Schritt 6". Außerdem muss `vehicle_location` in den App-Scopes auf `developer.tesla.com` aktiviert sein.

**Backend startet nicht**
Prüfe die Logs: `docker logs tesla-carview-backend`. Häufige Ursachen: fehlende `.env`-Variablen (`JWT_SECRET`, `TESLA_CLIENT_ID`), Datenbank-Migrationsfehler.

## ❤️ Wenn dir die App etwas wert ist {#donations}

Tesla Carview ist **für die private, selbst gehostete Nutzung** kostenlos und werbefrei (Lizenz: PolyForm Noncommercial 1.0.0 — kommerzieller Verkauf oder SaaS-Hosting für Dritte sind nicht gestattet). Falls du etwas zurückgeben möchtest, freuen sich diese Organisationen über deine Unterstützung.

- **[Aktion Deutschland Hilft](https://www.aktion-deutschland-hilft.de/de/spenden/)** — Bündnis von Hilfsorganisationen für schnelle und wirkungsvolle Katastrophenhilfe weltweit.
- **[Lebenshilfe Rems-Murr](https://www.lebenshilfe-rems-murr.de/)** — Unterstützung, Begleitung und Teilhabe für Menschen mit Behinderung im Rems-Murr-Kreis.
- **[Radio 7 Drachenkinder](https://www.radio7.de/aktionen/drachenkinder)** — Hilfe für schwer kranke Kinder in der Region – finanziert Therapien, Ausflüge und Wünsche.

100 % deiner Spende geht direkt an die Einrichtung. Wir sehen weder den Betrag noch deine Daten.

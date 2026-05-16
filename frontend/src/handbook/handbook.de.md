# 📖 Tesla Carview Handbuch

Version 2.1 · Self-Hosted · Multi-Tenant

> ℹ️ **Hinweis für Administratoren und Self-Hoster:** Dieses Handbuch beschreibt die App aus Benutzersicht. Themen wie Installation, ENV-Variablen, Backup/Restore-Workflows, nächtliche Wartung oder das Aktivieren des Demo-Modus sind in der **technischen Dokumentation** im [`docs/`](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.md)-Ordner des Repositorys zu finden — insbesondere [10-configuration](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.md) (alle ENV-Optionen) und [11-operations](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.md) (Backup, Wartung, Demo).
>
> 📚 **Neu bei Tesla Carview?** Das **[GitHub Wiki](https://github.com/KnevS/Tesla-Carview/wiki)** bietet einen geführten Einstieg: Schritt-für-Schritt-Anleitungen für Installation, Netzwerkzugang ohne statische IP (DynDNS, Cloudflare Tunnel, FritzBox), Raspberry-Pi-Speicher-Setup (SSD statt SD-Karte) und mehr — verständlich für Nicht-IT-Experten.

## 🌟 Überblick {#overview}

Tesla Carview ist eine **selbst gehostete** Datenlogger-App für Tesla-Fahrzeuge. Alle Daten bleiben ausschließlich auf deinem eigenen Server – keine Cloud, keine Datenweitergabe. Die App ist vollständig **responsive** und läuft auf **iPhone/iPad (Safari)**, Android-Smartphones sowie Desktop-Browsern.

**Funktionen im Überblick:**

- 🚗 **Fahrtenbuch** — GPS-Tracks, Verbrauch, Fahrttyp-Kategorisierung
- ⚡ **Laden** — Ladesessions mit Kosten, GPS-Standort-Erkennung
- 🔋 **Batterie** — Degradations-Tracking, Reichweiten-Verlauf
- 📊 **Dashboard** — Statistiken, monatliche Übersicht, letzte Aktivitäten
- 🎮 **Steuerung** — Klimaanlage, Türen, Licht – direkt aus der App
- 📝 **Betriebsbuch** — Wartungen, Reparaturen, Kosten mit Datum
- 📤 **Export** — CSV/JSON für alle Daten, Vollbackup als ZIP
- 🔔 **Push-Nachrichten** — Browser-Benachrichtigung bei Ladeende
- 📱 **Mobile-optimiert** — Vollständig nutzbar auf iPhone/iPad (Safari), Android und Desktop

## 🔀 Sortierreihenfolge {#sort-order}

In allen Listen mit chronologischen Einträgen (Fahrten, Lade-Sessions, Betriebsbuch-Einträge, Kostenabrechnung, Audit-Events, Benutzer-Liste, Rechtstexte-Versionen) befindet sich oben rechts ein **Sortier-Toggle**. Ein Klick wechselt zwischen:

- ↓ **Neueste zuerst** (Standard)
- ↑ **Älteste zuerst**

Die gewählte Reihenfolge wird **pro Ansicht im Browser gespeichert** (`localStorage`) und überdauert Neuladen und Schließen des Tabs — du kannst sie pro Liste unterschiedlich einstellen (z. B. Fahrtenbuch „neueste oben", Benutzerliste „letzter Login zuletzt").

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

**Ladeort anlegen** — Unter **Laden → Ladeorte**: Name, Typ (Zuhause/Büro/Öffentlich), Preis/kWh, GPS-Koordinaten und Erkennungsradius eingeben.

**Kosten manuell anpassen** — In der Ladeliste: Klick auf eine Session → Kosten bearbeiten. Kosten können auch auf 0 gesetzt werden (z.B. Gratis-Laden).

**✕ Ladung als kostenlos markieren** — In der **Ladehistorie** hat jede Session einen kleinen Button *„✕ kostenlos"*. Damit markierte Ladungen erscheinen ausgegraut mit dem Badge *„kostenlos"* und werden **automatisch aus der Heimladen-Abrechnung ausgeschlossen** — sowohl aus den Monatszusammenfassungen als auch aus der Einzelauswertung.

Typischer Anwendungsfall: Laden am Arbeitsplatz, das vom Arbeitgeber gestellt wird und nicht in die private Abrechnung einfließen soll. Mit dem Button *„↩ kostenpflichtig"* lässt sich die Markierung jederzeit rückgängig machen.

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

**Manueller Export** — Unter **Export**: CSV oder JSON für Fahrten und Ladesessions, sowie Vollbackup als ZIP.

**Automatisches Backup (Server)** — Die SQLite-Datenbanken liegen im Docker-Volume `tesla_data`. Für automatische Backups auf dem Server:

```bash
# Tägliches Backup um 3 Uhr (crontab -e):
0 3 * * * cp /var/lib/docker/volumes/tesla_data/_data/*.db /backup/
```

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

Tesla rechnet jeden `/vehicle_data`-Call ab (≈ 0,005 €/Aufruf). Ohne Fleet Telemetry pollt die App im Hintergrund:

| Zustand | Intervall | Calls/Tag |
|---------|-----------|-----------|
| Fährt aktiv | 30 s | bis 2.880 |
| Online, steht | 10 min | bis 144 |
| Offline/schläft | 45 min | bis 32 |
| Mit Fleet Telemetry | 1 h Heartbeat | 24 |

**Tages-Cap:** Standardmäßig max. 80 Calls/Fahrzeug/Tag, danach Pause bis Mitternacht.

**Kosten senken:**
- Fleet Telemetry einrichten → reduziert auf ~24 Calls/Tag (~3,60 €/Monat)
- In Einstellungen → Tesla-Verbindung: Monatslimit + Hard-Stop aktivieren
- Deployments bündeln (jeder Neustart setzt den In-Memory-Cap zurück)

## 🔌 Monta-Integration (Abrechnung) {#monta}

Für Dienstwagen-Fahrer: Tesla Carview kann Ladedaten direkt aus deiner **Monta-Wallbox** abrufen und daraus eine monatliche Kostenabrechnung für deinen Arbeitgeber erstellen.

> ⚠️ Monta-Integration ist nur für Fahrzeuge der Kategorie **Dienstwagen** verfügbar (Einstellungen → Fahrzeugprofil → Kategorie).

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
2. Wähle Kategorie **💼 Dienstwagen**.
3. Trage **Strompreis Wallbox (€/kWh)** ein – z. B. `0.34`.
4. Füge **Monta Charge-Point-ID** und **Monta API-Key** ein.
5. Klicke **Speichern**.

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

## 📍 Ort manuell eintragen (ohne GPS) {#manual-location}

Liefert dein Tesla keine GPS-Daten (typisch bei XP7-VIN ohne aktive Fleet Telemetry oder bei Verbindungs-Aussetzern), kannst du den Ladeort und Trip-Adressen manuell pflegen:

- **Ladeort** in der Ladeliste auf den Ortsnamen klicken → Inline-Editor öffnet sich. Drei Wege: aus den definierten Ladeorten wählen (Tarif/Position werden übernommen), freier Anzeigename, oder GPS-Koordinaten manuell eingeben (löst Auto-Match gegen die definierten Ladeorte aus, Standardradius 200 m).
- **Fahrt-Adressen** unter `Fahrtdetail → ✎ Bearbeiten`: Start- und Ziel-Adresse als Freitext, optional GPS-Koordinaten dazu für die Karte.

Jedes Eingabefeld trägt einen Mouse-over-Hinweis mit Kontext (was tut das Feld, wann brauche ich es, was passiert beim Speichern).

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

## 🗺️ Routenplaner {#route-planner}

Der Routenplaner unter **Routenplaner** berechnet Fahrrouten und zeigt Schnellladestationen entlang der Strecke an.

**Route berechnen** — Gib Start- und Zieladresse ein. Über „+ Zwischenstopp" lassen sich beliebig viele Wegpunkte einfügen und per Drag-and-drop umsortieren.

**Vermeiden-Optionen** — Drei Toggle-Chips direkt am Zielfeld:
- **Autobahnen** — Strecke meidet Schnellstraßen, wird über Bundes- und Landstraßen geführt
- **Mautstraßen** — mautpflichtige Streckenabschnitte werden umgangen
- **Fähren** — keine Fährverbindungen in der Route

Die gewählten Optionen werden im Browser gespeichert und gelten für alle folgenden Routenberechnungen bis zur nächsten Änderung. Das Routing nutzt intern die Valhalla-Engine (openstreetmap.de); bei kurzfristiger Nichterreichbarkeit wird automatisch auf OSRM umgestellt (Hinweis erscheint als Toast).

**Schnellladestationen** — Die Karte zeigt Supercharger und CCS-Schnelllader entlang der Route. Voraussetzung: ein kostenloser OpenChargeMap-API-Key muss in **Admin → System → Externe API-Schlüssel** hinterlegt sein. Fehlt der Key, erscheint ein Toast mit Direkt-Link zu den Einstellungen.

**Echtzeit-Verkehr** — Wenn ein HERE Maps API-Key konfiguriert ist (ebenfalls unter Admin → System), wird der aktuelle Verkehrsfluss berücksichtigt und in der Reisezeit-Schätzung abgebildet.

**Ladeplanung** — Bei aktivierter SoC-Planung (Akkustand eingeben) berechnet der Planer intelligente Ladestopps mit Zeitschätzung und prüft, ob die Reichweite für jeden Abschnitt ausreicht.

## 🟢 System-Status (Admin) {#system-health}

Unter **System** sieht der Admin oben eine farbige Ampel-Karte mit acht Checks:

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

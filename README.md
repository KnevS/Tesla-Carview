# ⚡ Tesla Carview

[![Version](https://img.shields.io/badge/version-v3.1.0-E31937?style=flat-square)](CHANGELOG.md)
[![Lizenz](https://img.shields.io/badge/Lizenz-PolyForm_Noncommercial-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry_Pi_%7C_Linux_%7C_VPS-lightgrey?style=flat-square)](docs/02-deployment.md)

> 🇬🇧 [Read in English](README.en.md) · 📋 [Changelog](CHANGELOG.md) · 📚 [Dokumentation](docs/README.md)

> **© 2026 Sven Krische** · Lizenz: [PolyForm Noncommercial 1.0.0](LICENSE) · [AUTHORS](AUTHORS) · [NOTICE](NOTICE.md)
> Original-Entwurf, Architektur und Implementierung von Sven Krische ([@KnevS](https://github.com/KnevS)).

**Car Usability Management** — selbst gehostet, keine Cloud, keine Drittparteien.
Von GPS-Track und Fahrtenbuch über Routenplanung mit Ladeplanung bis zur Betriebsbuchführung:
alle Fahrzeugdaten bleiben auf deinem eigenen Server.

Läuft auf: **Linux-Server** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), lokale Entwicklung.

<!-- Operator-Hinweis im Footer / Footer note for operators:
     Wer Tesla Carview selbst hostet, kann die eigenen Kontaktdaten
     ueber frontend/.env (siehe frontend/.env.example) einsetzen.
     Self-hosters can configure their own footer contact via the .env. -->


---

## Features

| Bereich | Beschreibung |
|---|---|
| **Dashboard** | Gesamtstatistiken, letzte Fahrt, monatliches Kilometerdiagramm |
| **Fahrten** | GPS-Track auf Karte, Verbrauch, Geschwindigkeit, SoC-Verlauf |
| **Laden** | Ladesessions mit Kosten, GPS-basierter Ladeort-Zuordnung, kostenlose Ladungen markierbar |
| **Ladeorte** | Definierbare Standorte mit GPS-Radius, Preis/kWh, Auto-Erkennung |
| **Batterie** | Degradations-Tracking, Reichweiten-Verlauf über Zeit |
| **Technik** | Live-Telemetrie: TPMS, Leistungsfluss, Klimaanlage, Ladestatus; Fake-Daten für Demo-Fahrzeuge |
| **Routenplaner** | Interaktiver Routenplaner mit SoC-aware Ladeplanung: automatische Ladestopps inkl. Ladezeit-Schätzung; Abfahrts-SoC (live oder manuell), Ziel-SoC und Ladeziel konfigurierbar; Wetter (Open-Meteo), Verkehr (HERE Maps), Blitzer (OpenStreetMap) entlang der Route; Kartendarstellung mit Tile-Proxy |
| **Steuerung** | Fahrzeugbefehle: Klima, Climate-Keeper (Hund/Camp), Sitzheizung (5 Plätze × 4 Stufen), Lenkradheizung, Türen, Frunk/Heckklappe, Fenster, Sentry-Mode, Laden inkl. Ampere-Slider und Ladeklappe, Vorklim-Zeitplan, Boombox, Software-Update, Navigation (Virtual Key erforderlich) |
| **Fahrtenbuch** | Finanzamt-konform nach BMF-Schreiben: Klassifikation, Geschäftspartner, Reisezweck, Kilometerstände, lückenlose Nummerierung im PDF, Lock nach Export, manuelle Nachträge, Trip-Merge/Split |
| **Abrechnung** | Heimladen-Kostenabrechnung für Dienstwagen (Monta-Integration optional) |
| **Betriebsbuch** | Wartungen, Reparaturen, Reifen, Inspektionen mit Kosten |
| **Export** | CSV/JSON-Export für Fahrten & Laden, Vollbackup |
| **Wartungsintervalle** | Pro Fahrzeug konfigurierbare Service-Aufgaben (TÜV, Reifen, Bremsflüssigkeit, …) mit Zeit- und km-Intervall + tägliche Push-Erinnerung |
| **Audit-Log** | Admin-Viewer für sicherheitsrelevante Ereignisse mit Filter und CSV-Export (DSGVO-konform) |
| **Dynamischer Stromtarif** | aWattar (DE/AT) und Tibber-Integration: 24h-Preiskurve im Dashboard, Auto-Set des günstigsten 4h-Lade-Fensters |
| **PDF-Abrechnung** | Unterschriftsreife PDF für Heimladen-Erstattung (clientseitig, keine Cloud) |
| **Benachrichtigungen** | Web Push bei Ladeende, plus Wartungserinnerungen |
| **Benutzerhandbuch** | Vollständige Anleitung direkt in der App lesbar |
| **Farbschema** | Anpassbares Farbprofil (6 Akzentfarben, lokal gespeichert) |
| **Einstellungen** | Alle Sektionen per Klick ein-/ausklappbar (SortableSection), Reihenfolge persönlich sortierbar |
| **Navigation** | Individuell sortierbare und ein-/ausblendbare Navigationspunkte |
| **Mobile / Tesla** | Installierbare PWA für iPhone/iPad (Safari), Android, Tesla-Fahrzeug-Browser und Desktop. Kompakte Karten-Ansicht im Fahrtenbuch für schmale Bildschirme. |
| **System-Status** | Ampel-Karte (Tesla-Token, Virtual Key, Fleet Telemetry, Poller, DB) — grün/gelb/rot auf einen Blick |
| **Aktivitäts-Heatmap** | Kalender-Heatmap aller Fahrten (Jahr/Monat/Woche/Alle) im Fahrtenbuch, Klick führt zur Fahrtenliste des Tages |
| **Mandanten-Pseudonym** | Datenschutz: Login-Seite zeigt zufälligen `adjective-noun`-Pseudonym statt Klarnamen, vom Admin neu generierbar |
| **Fleet Telemetry primär** | WebSocket-Streaming als bevorzugte Datenquelle (Tesla-Approval-pflichtig). Wenn aktiv → Poller schaltet auf 1×/h-Heartbeat, spart >95 % API-Budget. Sonst API-Polling als Fallback |
| **Encryption at rest** | AES-256-GCM für Tesla-OAuth-Tokens, TOTP MFA-Secret, Virtual-Key Private-Key. Hash + timing-safe Compare für Password-Reset-Tokens. Auto-generierter Key in `data/.encryption-key` |
| **Auto-Update PWA** | Service-Worker erkennt Deploys und reloaded automatisch — kein `Strg+Shift+R` mehr nötig, auch iOS-PWA |

---

## Multi-Mandanten-Architektur (seit v2.0)

Seit v2.0 unterstützt Tesla Carview **mehrere Mandanten** mit vollständiger Datenisolierung:

- Jeder Mandant hat seine eigene SQLite-Datenbank
- Neue Mandanten nur per **Einladungslink** mit optionaler **Notiz** (Admin → Benutzer → Einladungslink erstellen, 7 Tage, einmalig); Einladungen lassen sich erneut ausstellen, sperren oder löschen
- **Mehrere Fahrzeuge** pro Mandant: Sync über Einstellungen → 🔄 Fahrzeuge synchronisieren
- **Benutzerverwaltung** pro Mandant (Rollen, Fahrzeugzuweisung, Sperren) mit feingranularen Permissions: `Fahrzeuge bearbeiten`, `Fahrzeuge anlegen`, `MFA-Pflicht` pro Benutzer
- **Erzwungene MFA für neue Konten** — Router-Guard leitet zur TOTP-Einrichtung um, bis MFA aktiv ist
- **Admin-Aufgabenkarte** zeigt aktive Benutzer ohne zugewiesenes Fahrzeug mit Direkt-Aktionen
- **Eintrag-Ersteller im Betriebsbuch** wird automatisch mitgeführt und angezeigt
- **Passkey-Authentifizierung** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Passwort-Reset** via Admin-generiertem Link
- **Heim-Wallbox-Erkennung über Monta** (Charge-Point-ID-Match → 🏠-Marker in Lade-Liste und Abrechnung)
- **Kostenlose Ladungen**: in der Ladehistorie markierbar, werden aus der Abrechnung ausgeschlossen
- **Versionsbump auf Legal-Seiten** schreibt automatisch das aktuelle Datum in die „Stand:"-Zeile, bevor versioniert wird

---

## Schnellstart

### Raspberry Pi / Linux-Server (empfohlen)

```bash
# Als root auf dem Zielgerät:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Das Script erkennt automatisch die Architektur (x86_64, ARM64, ARMv7) und installiert alles.

### Lokale Entwicklung

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# Backend
cd backend
cp .env.example .env
# .env anpassen (JWT_SECRET ist Pflicht!)
npm install && npm run dev

# Frontend (zweites Terminal)
cd frontend && npm install && npm run dev
```

→ Browser öffnen: **http://localhost:5173**
→ Beim ersten Start automatisch zum Setup-Wizard weitergeleitet

### Nur Konfiguration einrichten

```bash
bash deploy/setup-wizard.sh
```

Interaktiver Assistent für: Domain, Tesla-API-Zugangsdaten, E-Mail, Web-Push.

---

## Erstkonfiguration (Web-Wizard)

Beim ersten Start wird automatisch auf **/setup** weitergeleitet.
Dort kannst du im Browser Mandantenname und Administrator-Account anlegen.

Empfohlene Schritte nach dem Login:
1. Tesla-Fahrzeug verbinden (Einstellungen → Tesla)
2. Virtual Key am Fahrzeug registrieren (Einstellungen → Virtual Key)
3. MFA aktivieren (Einstellungen → Zwei-Faktor-Authentifizierung)
4. Ladeorte konfigurieren

Das **Benutzerhandbuch** ist direkt in der App unter `/handbook` verfügbar.

---

## Fahrzeugbefehle & Virtual Key

Für Fahrzeugbefehle (Klimaanlage, Türen, Hupen etc.) ist ein **Virtual Key** notwendig.
Der Virtual Key erlaubt der App, signierte Befehle direkt ans Fahrzeug zu senden.

**Voraussetzung**: Ein laufender [`tesla-http-proxy`](https://github.com/teslamotors/vehicle-command) auf dem Server.

```bash
# Proxy starten (Beispiel – Pfade anpassen):
tesla-http-proxy -port 4443 -host 0.0.0.0 \
  -tls-key /etc/tesla-proxy/server.key \
  -cert /etc/tesla-proxy/server.crt \
  -key-file /etc/tesla-proxy/tesla_priv.pem
```

Der öffentliche Schlüssel muss unter `/.well-known/appspecific/com.tesla.3p.public-key.pem`
der App-Domain erreichbar sein, damit das Fahrzeug den Key verifizieren kann.


---

## Monta-Integration (optional)

Die Abrechnung unterstützt optionale Synchronisation mit [Monta](https://monta.com) –
einem EV-Lademanagement-Dienst.

Konfiguration pro Fahrzeug in den Einstellungen:
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (optional, filtert Sessions auf einen bestimmten Ladepunkt)

Die Synchronisation läuft manuell über **Abrechnung → Monta Sync**.


---

## Sicherheit

- JWT (Access-Token 15 min, Refresh-Token 7 Tage als httpOnly-Cookie)
- **TOTP-MFA** (Google Authenticator, Authy, 1Password etc.)
- **Passkeys** (WebAuthn, passwortloser Login)
- **10 Backup-Codes** (bcrypt-gehasht, einmalig verwendbar)
- **Account-Lockout** nach 5 Fehlversuchen (15 min)
- **fail2ban** IP-Sperre nach 3 fehlgeschlagenen Logins (10 min)
- **HTTPS** mit TLS 1.2/1.3, HSTS, OCSP-Stapling
- **CSP, X-Frame-Options, Permissions-Policy** Header
- **Rate-Limiting** auf Login- und API-Endpunkten
- **Audit-Log** aller sicherheitsrelevanten Aktionen
- **Datenlöschung** mit Backup-Warnung und Bestätigungstext

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) + WebAuthn (@simplewebauthn) |
| Tesla-Daten | Tesla Fleet API (OAuth2) + Fleet Telemetry (WebSocket) |
| Multi-Tenancy | Separate SQLite-Datenbanken pro Mandant, Master-DB für globale Daten |
| Deployment | Docker Compose + Nginx + Let's Encrypt |
| Plattformen | linux/amd64 · linux/arm64 · linux/arm/v7 |

---

## Projektstruktur

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # Schema + DB-Initialisierung (master-schema.sql)
│   │   ├── middleware/    # auth.js (multi-tenant JWT), security.js, validate.js
│   │   ├── routes/        # auth, setup, register, passkey, password-reset,
│   │   │                  # users, vehicles, trips, charging, data-management, …
│   │   └── services/      # teslaApi, poller (multi-tenant), dataSync (GPS), …
│   └── .env.example       # Konfigurationsvorlage
├── frontend/
│   └── src/
│       ├── views/         # Login, Register, Setup, Dashboard, Trips,
│       │                  # Settings (Passkey), UserManagement, DataManagement,
│       │                  # Handbook, PasswordReset, …
│       ├── components/    # NavBar (Admin-Links, Handbuch), StatCard
│       ├── store/         # auth.js (Passkey, Mandant), index.js
│       └── router/        # Routen mit Admin-Guard
├── deploy/
│   ├── setup.sh                  # Vollautomatisches Server-Setup
│   ├── setup-wizard.sh           # Interaktiver Konfigurations-Assistent
│   ├── nginx-host.conf.template  # Nginx-Config (HTTPS, TLS-Hardening)
│   └── update.sh                 # Zero-Downtime-Update
├── docs/                  # Detaillierte Anleitungen
├── docker-compose.yml          # Entwicklung
└── docker-compose.prod.yml     # Produktion
```

---

## Wichtige Umgebungsvariablen (.env)

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `JWT_SECRET` | Geheimer Schlüssel für JWT (mind. 32 Zeichen, zufällig) | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Tesla Developer App Client-ID | `abc123…` |
| `TESLA_CLIENT_SECRET` | Tesla Developer App Secret | `secret…` |
| `FRONTEND_URL` | Öffentliche URL der App (für OAuth-Callback + Passkeys) | `https://carview.example.com` |
| `RP_NAME` | Anzeigename für Passkey-Dialoge | `Tesla Carview` |
| `RP_ID` | Domain für WebAuthn (ohne Protokoll) | `carview.example.com` |

---

## Dokumentation

Tesla Carview hat zwei getrennte Dokumentations-Ebenen:

### 👤 Für Benutzer der App

In-App-Handbuch unter `/handbook` in der laufenden App — oder direkt in [`frontend/src/handbook/handbook.de.md`](frontend/src/handbook/handbook.de.md) (deutsch) bzw. [`handbook.en.md`](frontend/src/handbook/handbook.en.md) lesbar. Themen: Dashboard, Fahrten, Laden, Fahrtenbuch (BMF), Steuerung, Wartungsintervalle, Demo-Modus, mobile Installation, Fehlerbehebung aus User-Sicht.

### 🛠 Für Self-Hoster und Administratoren

Technische Dokumentation im [`docs/`](docs/README.md)-Ordner:

| Dokument | Inhalt |
|---|---|
| [📚 Doku-Übersicht](docs/README.md) | Wegweiser durch alle Tech-Dokumente |
| [Quickstart](docs/01-quickstart.md) | Lokale Entwicklungsumgebung |
| [Deployment](docs/02-deployment.md) | Server-Deployment + Raspberry Pi |
| [Authentifizierung & MFA](docs/03-authentication.md) | Login-System, MFA, Passkeys |
| [Tesla Fleet API](docs/04-tesla-api.md) | Tesla Developer Account einrichten |
| [Sicherheitsarchitektur](docs/05-security-architecture.md) | Threat-Model, alle Maßnahmen |
| [fail2ban](docs/06-fail2ban.md) | Brute-Force-Schutz konfigurieren |
| [Setup-Wizard](docs/07-setup-wizard.md) | Interaktiver Konfigurations-Assistent |
| [Dokploy-Deployment](docs/08-dokploy.md) | Alternative Deployment-Plattform |
| [Tesla-API-Quota](docs/09-tesla-api-usage.md) | API-Kosten und Tracking |
| **[🔧 Konfiguration (ENV)](docs/10-configuration.md)** | Alle Umgebungsvariablen — Pflicht, Optional, Demo, Auto-Update |
| **[🛠 Betrieb & Operationen](docs/11-operations.md)** | Backup/Restore, nächtliche Wartung, Demo-Modus, Auto-Update, Logs |
| **[🛡️ Hochverfügbarkeit (HA)](docs/12-high-availability.md)** | Architektur-Optionen für SLA-kritische Setups (Teaser, auf Anfrage) |

---

## Updates

```bash
bash deploy/update.sh
```

---

## Mitmachen

Beiträge sind willkommen! Lies zuerst die [Contribution Guidelines](CONTRIBUTING.de.md), dann such dir ein [good first issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue) aus oder öffne direkt einen Pull Request.

---

## Lizenz

[**PolyForm Noncommercial 1.0.0**](LICENSE) — nicht-kommerzielle Software-Lizenz von [polyformproject.org](https://polyformproject.org).

**Erlaubt:** Privatnutzung, Self-Hosting (auch für Familie/Haushalt), Modifikationen, kostenlose Weitergabe unter denselben Bedingungen, Nutzung durch gemeinnützige Organisationen, Bildungs- und Forschungseinrichtungen.

**Verboten:** Verkauf der Software, kostenpflichtiger Betrieb als Dienst (SaaS) für Dritte, kommerzielle Nutzung in jeglicher Form, Unterlizenzierung.

Bei Weitergabe muss der vollständige Lizenztext und der Copyright-`Required Notice` mitgeliefert werden. Software wird „wie sie ist" bereitgestellt, ohne Gewährleistung — Details siehe [LICENSE](LICENSE).

---

## ❤️ Unterstützen

Tesla Carview ist **für die private, selbst gehostete Nutzung im eigenen Haushalt** kostenlos und werbefrei (siehe [LICENSE](LICENSE) und [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)). Kommerzieller Verkauf, SaaS-Angebote für Dritte oder die Einbettung in kommerzielle Produkte sind nicht gestattet.

Wenn dir das Programm etwas wert ist, freuen sich folgende gemeinnützige
Organisationen über deine direkte Unterstützung:

| Organisation | Beschreibung |
|---|---|
| **Aktion Deutschland Hilft** | Bündnis von Hilfsorganisationen für schnelle und wirkungsvolle Katastrophenhilfe weltweit |
| **Lebenshilfe Rems-Murr** | Unterstützung, Begleitung und Teilhabe für Menschen mit Behinderung im Rems-Murr-Kreis |
| **Radio 7 Drachenkinder** | Hilfe für schwer kranke Kinder in der Region – finanziert Therapien und Wünsche |

> **100 % deiner Spende geht direkt an die Einrichtung. Wir sehen weder den Betrag noch deine Daten.**

In der App erreichbar über den **❤ Unterstützen**-Link im Footer am unteren Seitenrand oder direkt unter `/support`.

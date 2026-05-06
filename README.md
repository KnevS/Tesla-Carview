# ⚡ Tesla Carview

Eine **selbst gehostete** Tesla-Datenlogger-Applikation.
Keine Cloud, keine Datenweitergabe an Dritte – alle Fahrzeugdaten bleiben auf deinem eigenen Server.

Läuft auf: **Linux-Server** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), lokale Entwicklung.

## Features

| Bereich | Beschreibung |
|---|---|
| **Dashboard** | Gesamtstatistiken, letzte Fahrt, monatliches Kilometerdiagramm |
| **Fahrten** | GPS-Track auf Karte, Verbrauch, Geschwindigkeit, SoC-Verlauf |
| **Laden** | Ladesessions, Ladekurven, Kosten, Aufschlüsselung nach Ladertyp |
| **Batterie** | Degradations-Tracking, Reichweiten-Verlauf über Zeit |
| **Technik** | Live-Telemetrie: TPMS, Leistungsfluss, Klimaanlage, Ladestatus |
| **System** | Server-Monitor: CPU, RAM, DB-Größe, Prozess-Uptime |
| **Betriebsbuch** | Notizen, Wartungen, Reparaturen, Reifen, Inspektionen mit Kosten |
| **Export** | CSV/JSON-Export für Fahrten & Laden, Vollbackup |
| **Benachrichtigungen** | Web Push bei Ladeende |

## Schnellstart

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

### Raspberry Pi / Linux-Server

```bash
# Als root auf dem Zielgerät:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Das Script erkennt automatisch die Architektur (x86_64, ARM64, ARMv7) und installiert alles.

### Nur Konfiguration einrichten

```bash
bash deploy/setup-wizard.sh
```

Interaktiver Assistent für: Domain, Tesla-API-Zugangsdaten, E-Mail, Web-Push.

## Erstkonfiguration (Web-Wizard)

Beim ersten Start wird automatisch auf **/setup** weitergeleitet.
Dort kannst du im Browser deinen Administrator-Account anlegen.

Alternativ über den Terminal-Wizard: `bash deploy/setup-wizard.sh`

## Sicherheit

- JWT (Access-Token 15 min, Refresh-Token 7 Tage als httpOnly-Cookie)
- **TOTP-MFA** (Google Authenticator, Authy, 1Password etc.)
- **10 Backup-Codes** (bcrypt-gehasht, einmalig verwendbar)
- **Account-Lockout** nach 5 Fehlversuchen (15 min)
- **fail2ban** IP-Sperre nach 3 fehlgeschlagenen Logins (10 min)
- **HTTPS** mit TLS 1.2/1.3, HSTS, OCSP-Stapling
- **CSP, X-Frame-Options, Permissions-Policy** Header
- **Rate-Limiting** auf Login- und API-Endpunkten
- **Audit-Log** aller sicherheitsrelevanten Aktionen

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) |
| Tesla-Daten | Tesla Fleet API (OAuth2) |
| Deployment | Docker Compose + Nginx + Let's Encrypt |
| Plattformen | linux/amd64 · linux/arm64 · linux/arm/v7 |

## Projektstruktur

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # Schema + DB-Initialisierung
│   │   ├── middleware/    # auth.js, security.js, validate.js
│   │   ├── routes/        # auth, setup, mfa, users, vehicles, trips, …
│   │   └── services/      # teslaApi, poller, dataSync, userService, …
│   └── .env.example       # Konfigurationsvorlage
├── frontend/
│   └── src/
│       ├── views/         # Setup, Login, Dashboard, Trips, Telemetry, …
│       ├── components/    # NavBar, StatCard
│       ├── store/         # auth.js, index.js
│       └── router/
├── deploy/
│   ├── setup.sh                  # Vollautomatisches Server-Setup
│   ├── setup-wizard.sh           # Interaktiver Konfigurations-Assistent
│   ├── nginx-host.conf.template  # Nginx-Config (HTTPS, TLS-Hardening)
│   └── update.sh                 # Zero-Downtime-Update
├── docs/                  # Detaillierte Anleitungen
├── docker-compose.yml          # Entwicklung
└── docker-compose.prod.yml     # Produktion
```

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [Quickstart](docs/01-quickstart.md) | Lokale Entwicklungsumgebung |
| [Deployment](docs/02-deployment.md) | Server-Deployment + Raspberry Pi |
| [Authentifizierung & MFA](docs/03-authentication.md) | Login-System, MFA |
| [Tesla Fleet API](docs/04-tesla-api.md) | Tesla Developer Account einrichten |
| [Sicherheitsarchitektur](docs/05-security-architecture.md) | Threat-Model, alle Maßnahmen |
| [fail2ban](docs/06-fail2ban.md) | Brute-Force-Schutz konfigurieren |

## Updates

```bash
bash deploy/update.sh
```

## Lizenz

MIT – freie Nutzung, Modifikation und Weitergabe erlaubt.

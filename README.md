# ⚡ Tesla Carview

Eine **selbst gehostete** Tesla-Datenlogger-Applikation, betrieben auf deinem eigenen Server.
Keine Cloud, keine Datenweitergabe an Dritte – alle Fahrzeugdaten bleiben bei dir.

## Features

| Bereich | Beschreibung |
|---|---|
| **Dashboard** | Gesamtstatistiken, letzte Fahrt, monatliches Kilometerdiagramm |
| **Fahrten** | GPS-Track auf Karte, Verbrauch, Geschwindigkeit, SoC-Verlauf |
| **Laden** | Ladesessions, Ladekurven, Kosten, Aufschlüsselung nach Ladertyp |
| **Batterie** | Degradations-Tracking, Reichweiten-Verlauf über Zeit |
| **Betriebsbuch** | Notizen, Wartungen, Reparaturen, Reifen, Inspektionen mit Kosten |
| **Export** | CSV/JSON-Export für Fahrten & Laden, Vollbackup |
| **Benachrichtigungen** | Web Push bei Ladeende |

## Sicherheit

- Benutzer-Login mit **JWT** (Access-Token 15 min, Refresh-Token 7 Tage als httpOnly-Cookie)
- **TOTP-MFA** kompatibel mit Google Authenticator, Authy, 1Password etc.
- **10 Backup-Codes** (bcrypt-gehasht, einmalig verwendbar)
- **Account-Lockout** nach 5 Fehlversuchen
- **HTTPS** mit TLS 1.2/1.3, HSTS, OCSP-Stapling
- **CSP, X-Frame-Options, Permissions-Policy** und weitere Security-Header
- **Rate-Limiting** auf Login- und API-Endpunkten
- **Audit-Log** aller sicherheitsrelevanten Aktionen

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js + Express |
| Datenbank | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) |
| Tesla-Daten | Tesla Fleet API (OAuth2) |
| Deployment | Docker Compose + Nginx + Let’s Encrypt |

## Schnellstart (Entwicklung)

```bash
# 1. Repository klonen
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# 2. Backend starten
cd backend && cp .env.example .env   # .env befüllen!
npm install && npm run dev

# 3. Frontend starten (neues Terminal)
cd frontend && npm install && npm run dev
```

App unter http://localhost:5173 – beim ersten Start wird das Admin-Passwort in der Backend-Konsole ausgegeben.

## Produktiv-Deployment (tesla.iland.krische.com)

```bash
# Auf dem Server als root:
bash deploy/setup.sh

# Tesla-API-Zugangsdaten eintragen:
nano /opt/tesla-carview/backend/.env

# Container neu starten:
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d

# Admin-Passwort aus Log lesen:
docker logs tesla-carview-backend | grep -A3 'ERSTER START'
```

Detaillierte Anleitungen in [`docs/`](./docs/).

## Projektstruktur

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # Schema + DB-Init
│   │   ├── middleware/    # auth.js, security.js, validate.js
│   │   ├── routes/        # auth, mfa, users, trips, charging, battery, logbook, export
│   │   └── services/      # teslaApi, poller, dataSync, userService, mfaService, auditService
│   └── .env.example
├── frontend/
│   └── src/
│       ├── views/         # Login, MfaVerify, MfaSetup, Settings, Dashboard, Trips, ...
│       ├── components/    # NavBar, StatCard
│       ├── store/         # auth.js, index.js
│       └── router/
├── deploy/
│   ├── nginx-host.conf  # Produktiv-Nginx mit TLS-Hardening
│   ├── setup.sh         # Vollautomatisches Server-Setup
│   └── update.sh        # Zero-Downtime-Update
├── docs/              # Detaillierte Anleitungen
├── docker-compose.yml      # Entwicklung
└── docker-compose.prod.yml # Produktion
```

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [Quickstart](docs/01-quickstart.md) | Lokale Entwicklungsumgebung einrichten |
| [Deployment](docs/02-deployment.md) | Produktiv-Deployment auf dem Netcup-Server |
| [Authentifizierung & MFA](docs/03-authentication.md) | Login-System, MFA einrichten und verwalten |
| [Tesla Fleet API](docs/04-tesla-api.md) | Tesla Developer Account + API-Schlüssel einrichten |
| [Sicherheitsarchitektur](docs/05-security-architecture.md) | Threat-Model, alle Sicherheitsmassnahmen im Detail |

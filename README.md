# ⚡ Tesla Carview

Eine **selbst gehostete** Tesla-Datenlogger-Applikation.
Keine Cloud, keine Datenweitergabe an Dritte – alle Fahrzeugdaten bleiben auf deinem eigenen Server.

Läuft auf: **Linux-Server** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), lokale Entwicklung.

> **🏠 Live-Instanz**: Eine produktive Instanz dieser App läuft unter [teslaview.krische.com](https://teslaview.krische.com) – geschlossen, nur für den Betreiber. Die Instanz bildet die Referenz für alle Features in dieser Dokumentation.

---

## Features

| Bereich | Beschreibung |
|---|---|
| **Dashboard** | Gesamtstatistiken, letzte Fahrt, monatliches Kilometerdiagramm |
| **Fahrten** | GPS-Track auf Karte, Verbrauch, Geschwindigkeit, SoC-Verlauf |
| **Laden** | Ladesessions mit Kosten, GPS-basierter Ladeort-Zuordnung, kostenlose Ladungen markierbar |
| **Ladeorte** | Definierbare Standorte mit GPS-Radius, Preis/kWh, Auto-Erkennung |
| **Batterie** | Degradations-Tracking, Reichweiten-Verlauf über Zeit |
| **Technik** | Live-Telemetrie: TPMS, Leistungsfluss, Klimaanlage, Ladestatus |
| **Steuerung** | Fahrzeugbefehle: Klima, Türen, Laden, Navigation (Virtual Key erforderlich) |
| **Fahrtenbuch** | Dienstwagen-Fahrtenbuch, Klassifikation Privat/Dienst/Arbeitsweg |
| **Abrechnung** | Heimladen-Kostenabrechnung für Dienstwagen (Monta-Integration optional) |
| **Betriebsbuch** | Wartungen, Reparaturen, Reifen, Inspektionen mit Kosten |
| **Export** | CSV/JSON-Export für Fahrten & Laden, Vollbackup |
| **Benachrichtigungen** | Web Push bei Ladeende |
| **Benutzerhandbuch** | Vollständige Anleitung direkt in der App lesbar |
| **Farbschema** | Anpassbares Farbprofil (6 Akzentfarben, lokal gespeichert) |
| **Navigation** | Individuell sortierbare und ein-/ausblendbare Navigationspunkte |
| **Mobile** | Vollständig nutzbar auf iPhone/iPad (Safari), Android und Desktop |

---

## Multi-Mandanten-Architektur (v2.0)

Seit v2.0 unterstützt Tesla Carview **mehrere Mandanten** mit vollständiger Datenisolierung:

- Jeder Mandant hat seine eigene SQLite-Datenbank
- Neue Mandanten nur per **Einladungslink** (Admin → Benutzer → Einladungslink erstellen, 7 Tage, einmalig)
- **Mehrere Fahrzeuge** pro Mandant: Sync über Einstellungen → 🔄 Fahrzeuge synchronisieren
- **Benutzerverwaltung** pro Mandant (Rollen, Fahrzeugzuweisung, Sperren)
- **Passkey-Authentifizierung** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Passwort-Reset** via Admin-generiertem Link
- **Kostenlose Ladungen**: in der Ladehistorie markierbar, werden aus der Abrechnung ausgeschlossen

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

> **🏠 Meine Installation**: Virtual Key ist eingerichtet und Fahrzeugbefehle sind aktiv.
> Der Proxy läuft als systemd-Dienst auf Port 4443.

---

## Monta-Integration (optional)

Die Abrechnung unterstützt optionale Synchronisation mit [Monta](https://monta.com) –
einem EV-Lademanagement-Dienst.

Konfiguration pro Fahrzeug in den Einstellungen:
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (optional, filtert Sessions auf einen bestimmten Ladepunkt)

Die Synchronisation läuft manuell über **Abrechnung → Monta Sync**.

> **🏠 Meine Installation**: Monta ist konfiguriert und wird für die Heimladen-Abrechnung genutzt.

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

| Dokument | Inhalt |
|---|---|
| [Quickstart](docs/01-quickstart.md) | Lokale Entwicklungsumgebung |
| [Deployment](docs/02-deployment.md) | Server-Deployment + Raspberry Pi |
| [Authentifizierung & MFA](docs/03-authentication.md) | Login-System, MFA, Passkeys |
| [Tesla Fleet API](docs/04-tesla-api.md) | Tesla Developer Account einrichten |
| [Sicherheitsarchitektur](docs/05-security-architecture.md) | Threat-Model, alle Maßnahmen |
| [fail2ban](docs/06-fail2ban.md) | Brute-Force-Schutz konfigurieren |
| In-App Handbuch | `/handbook` in der laufenden App |

---

## Updates

```bash
bash deploy/update.sh
```

---

## Lizenz

MIT – freie Nutzung, Modifikation und Weitergabe erlaubt.

---

## ❤️ Unterstützen

Tesla Carview ist kostenlos und werbefrei. Wenn dir das Programm etwas wert ist,
freuen sich folgende gemeinnützige Organisationen über deine direkte Unterstützung:

| Organisation | Beschreibung |
|---|---|
| **Aktion Deutschland Hilft** | Bündnis von Hilfsorganisationen für schnelle und wirkungsvolle Katastrophenhilfe weltweit |
| **Lebenshilfe Rems-Murr** | Unterstützung, Begleitung und Teilhabe für Menschen mit Behinderung im Rems-Murr-Kreis |
| **Radio 7 Drachenkinder** | Hilfe für schwer kranke Kinder in der Region – finanziert Therapien und Wünsche |

> **100 % deiner Spende geht direkt an die Einrichtung. Wir sehen weder den Betrag noch deine Daten.**

In der App erreichbar über das ❤️-Symbol in der Navigationsleiste (oben rechts).

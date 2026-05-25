# 🔧 Konfiguration

> 🇬🇧 [Read in English](10-configuration.en.md) · 👤 [Benutzer-Handbuch](../frontend/src/handbook/handbook.de.md) · 🏠 [Doku-Übersicht](.)

Alle Umgebungsvariablen, mit denen Tesla Carview gesteuert wird. Die meisten landen in `backend/.env` (siehe `backend/.env.example` als Vorlage). Die mit **(Pflicht)** markierten **müssen** gesetzt sein, alle anderen haben sinnvolle Defaults.

---

## 🔐 Pflicht-Variablen

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `JWT_SECRET` | Geheimer Schlüssel für JSON Web Tokens. **≥ 32 Zeichen, kryptografisch zufällig.** | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client-ID aus dem [Tesla Developer Portal](https://developer.tesla.com) | `abc123…` |
| `TESLA_CLIENT_SECRET` | Client-Secret aus dem Tesla Developer Portal | `secret…` |
| `FRONTEND_URL` | Öffentliche HTTPS-URL der App — wird für OAuth-Callback und Passkey-Registrierung benötigt | `https://carview.example.com` |
| `RP_NAME` | Anzeigename in Passkey-Dialogen | `Tesla Carview` |
| `RP_ID` | Domain für WebAuthn (ohne Protokoll, **muss zu** `FRONTEND_URL` **passen**) | `carview.example.com` |

> ⚠️ `JWT_SECRET` darf sich **nicht ändern** im laufenden Betrieb, sonst werden alle Sessions ungültig. `RP_ID`-Wechsel macht bestehende Passkeys nutzlos — Benutzer müssen neu registrieren.

---

## ⚡ Tesla Fleet API

| Variable | Default | Beschreibung |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | OAuth-Redirect-URI. Muss exakt im Tesla Developer Portal eingetragen sein. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Region-spezifischer Tesla-API-Endpoint (NA: `…na.vn.cloud.tesla.com`). |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | Adresse des `tesla-http-proxy` für signierte Fahrzeugbefehle. |

Detaillierte Setup-Schritte: [04-tesla-api.md](04-tesla-api.md) (Developer-Account, App registrieren, Scopes) und [09-tesla-api-usage.md](09-tesla-api-usage.md) (Kosten/Quota).

---

## 🔔 Web Push (Benachrichtigungen)

VAPID-Keys werden für „Laden abgeschlossen"- und Wartungs-Push-Notifications gebraucht. Ohne diese Variablen funktionieren Pushes nicht, der Rest der App läuft normal.

| Variable | Default | Beschreibung |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Public Key, generierbar mit `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Private Key (gleich erzeugt) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | Kontakt-URI für Push-Service (idealerweise eigene E-Mail) |

---

## 🧪 Demo-Sandbox

| Variable | Default | Beschreibung |
|---|---|---|
| `DEMO_ENABLED` | `false` | Wenn `true`: ein separater Demo-Mandant mit slug `demo` wird beim Start angelegt. Login-Seite zeigt einen „🚀 Demo starten"-Button. Pro IP max. 1 Signup/24h, max. 10 aktive Tester gleichzeitig, jeder Account lebt 14 Tage. |

Bedienung + Sicherheits-Aspekte: [11-operations.md → Demo-Modus](11-operations.md#demo-modus). Tester sehen automatisch einen Datenschutz-/Nutzungsbedingungen-Zusatz, der die rückstandslose Löschung dokumentiert (siehe `frontend/src/views/legal/LegalDoc.vue`).

---

## ⬆️ Auto-Update

| Variable | Default | Beschreibung |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Wenn `true`: nächtlicher Cron um ~03:30 Europe/Berlin macht `git fetch origin main` und führt bei neuem Commit `deploy/update.sh` aus. Bedeutet kurzen Container-Restart — das Maintenance-Overlay deckt das im UI ab. |
| `UPDATE_REPO_DIR` | `/opt/tesla-carview` | Pfad zum Git-Working-Tree, das der Auto-Updater nutzt. |

Empfehlung: erst manuell ein paar Updates über `deploy/update.sh` machen, vertraut werden, dann aktivieren.

---

## ⚙️ Betrieb & Performance

| Variable | Default | Beschreibung |
|---|---|---|
| `PORT` | `3000` | TCP-Port des Backend-HTTP-Servers (innen im Container). |
| `DB_PATH` | `/app/data/tesla-carview.db` | Pfad zur Legacy-Datenbank — wird beim ersten Start als „default"-Mandant migriert, danach nicht mehr genutzt. |
| `ENABLE_POLLER` | `true` | Wenn `false`: kein zyklisches Tesla-API-Polling (für dedizierte Lese-Replicas). |
| `TESLA_DAILY_CAP` | `30` | Maximale `vehicle_data`-Calls pro Fahrzeug und Tag. DB-persistent — überlebt Container-Neustarts. |
| `TESLA_MONTHLY_CAP` | `400` | Maximale `vehicle_data`-Calls pro Fahrzeug und Monat. Polling stoppt automatisch wenn Limit erreicht. |
| `NODE_ENV` | `production` | Standard-Produktiv-Setup. `development` aktiviert dev-Server-Verhalten. |

---

## 🌐 Frontend (`frontend/.env`)

Wird zur **Build-Zeit** in das Bundle eingeflochten. Werte ändern erfordert Re-Build.

| Variable | Default | Beschreibung |
|---|---|---|
| `VITE_FOOTER_EMAIL` | `''` | Kontakt-E-Mail im Footer. Leer = Block ausgeblendet. |
| `VITE_FOOTER_ABOUT_DE` | `''` | URL zur „Über mich"-Seite (deutsche Variante). |
| `VITE_FOOTER_ABOUT_EN` | `''` | URL zur „About me"-Seite (englische Variante). |
| `VITE_FOOTER_LINKEDIN_URL` | `''` | LinkedIn-Profil des Betreibers. |

Die Datei ist `.gitignored`. `frontend/.env.example` ist die im Repo committete Vorlage.

---

## 🖥️ Konfiguration via Admin-UI (ab v3.4.0)

Ab v3.4.0 müssen die meisten Secrets **nicht mehr** manuell in `.env` eingetragen werden. Der **Admin-Setup-Assistent** (Admin-Hub → 🛠️) führt durch alle Schritte.

**Technischer Hintergrund — DB-vor-env-Muster:**
`configService.js` liest für jeden Wert zuerst aus `tenant_settings` (SQLite-DB des Mandanten), dann als Fallback aus der `.env`. Bestehende `.env`-Konfigurationen funktionieren unverändert weiter; sobald ein Wert über die UI gesetzt wird, hat der DB-Wert Vorrang.

| Einstellung | UI-Pfad | `.env`-Fallback-Variable |
|-------------|---------|--------------------------|
| Tesla Client-ID | Admin-Hub → 🛠️ → Tesla-Zugangsdaten | `TESLA_CLIENT_ID` |
| Tesla Client-Secret | Admin-Hub → 🛠️ → Tesla-Zugangsdaten | `TESLA_CLIENT_SECRET` |
| Tesla Audience | Admin-Hub → 🛠️ → Tesla-Zugangsdaten | `TESLA_AUDIENCE` |
| VAPID Public Key | Admin-Hub → 🛠️ → Web Push | `VAPID_PUBLIC_KEY` |
| VAPID Private Key | Admin-Hub → 🛠️ → Web Push | `VAPID_PRIVATE_KEY` |
| VAPID Contact | Admin-Hub → 🛠️ → Web Push | `VAPID_CONTACT` |
| Telegram Bot Token | Admin-Hub → 🛠️ → Telegram | `TELEGRAM_BOT_TOKEN` |
| xAI / Grok API Key | Admin-Hub → 🛠️ → Externe APIs | `XAI_API_KEY` |
| ABRP Global App Key | Admin-Hub → 🛠️ → Externe APIs | `ABRP_API_KEY` |

> **VAPID-Keys generieren:** Im Admin-Setup-Assistenten auf „🔑 Neu generieren" klicken — kein `docker exec` mehr nötig.

> **Telegram-Bot:** Erfordert nach dem ersten Setzen des Tokens einen Container-Neustart (`docker compose … up -d --build backend`). Der Assistent zeigt einen entsprechenden Hinweis.

---

## Quick-Reference: Minimal-Setup

```bash
# backend/.env (Pflicht)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://carview.example.com
RP_NAME="Tesla Carview"
RP_ID=carview.example.com

# Optional, aber empfohlen
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public | awk '{print $3}')
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:du@example.com

# Demo nur, wenn du Tester einladen willst
# DEMO_ENABLED=true

# Auto-Update nur wenn du den Update-Loop verstanden hast
# AUTO_UPDATE_ENABLED=true
```

Nach dem Speichern: `docker compose -f docker-compose.prod.yml up -d --build backend` — Backend liest `.env` beim Start neu.

---

## Siehe auch

- [02-deployment.md](02-deployment.md) — Erstmaliges Deployment + nginx + Let's Encrypt
- [07-setup-wizard.md](07-setup-wizard.md) — Interaktiver Konfigurations-Assistent
- [11-operations.md](11-operations.md) — Tagesgeschäft: Backup, Restore, Wartung, Demo aktivieren

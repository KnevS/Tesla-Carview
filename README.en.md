# ⚡ Tesla Carview

[![Version](https://img.shields.io/badge/version-v3.6.0-E31937?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-PolyForm_Noncommercial-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry_Pi_%7C_Linux_%7C_VPS-lightgrey?style=flat-square)](docs/02-deployment.en.md)

> 🇩🇪 [Auf Deutsch lesen](README.md) · 📋 [Changelog](CHANGELOG.md) · 📚 [Documentation](docs/README.en.md)

> **© 2026 Sven Krische** · Licensed under [PolyForm Noncommercial 1.0.0](LICENSE) · [AUTHORS](AUTHORS) · [NOTICE](NOTICE.md)
> Original design, architecture and implementation by Sven Krische ([@KnevS](https://github.com/KnevS)).

**Car Usability Management** — self-hosted, no cloud, no third parties.
From GPS tracks and the logbook to route planning with charging schedules and maintenance records:
all vehicle data stays on your own server.

Runs on: **Linux servers** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), local development.

<!-- Operator-Hinweis im Footer / Footer note for operators:
     Wer Tesla Carview selbst hostet, kann die eigenen Kontaktdaten
     ueber frontend/.env (siehe frontend/.env.example) einsetzen.
     Self-hosters can configure their own footer contact via the .env. -->


---

## ⚠ Important — Tesla API status as of 2026

Tesla closed the **unofficial Owner API** for vehicle endpoints between May and June 2026. The previously common community workaround (signing in with a Tesla account refresh token, calling `/api/1/vehicles/{id}/vehicle_data`) now returns **HTTP 401 "invalid bearer token"** — the workaround is dead and no patch can revive it.

For live vehicle data (battery, climate, TPMS, telemetry stream) there is **only one official path**: the Tesla **Fleet API** with app approval via [developer.tesla.com](https://developer.tesla.com/). Current waiting time is **weeks to months**, ~€10/month running cost.

**What TeslaView still delivers without Fleet API approval:**

| Connection | Data source | What you get | Setup |
|---|---|---|---|
| **OwnTracks** (recommended, immediate) | Driver's smartphone | Trips, GPS track, distance, speed | Wizard step 5, ~5 min |
| **Tesla Fleet OAuth** | Tesla cloud | Battery, climate, TPMS, all via polling | Fleet API approval required |
| **Tesla Fleet Telemetry** | Tesla → push WebSocket | Live stream | Fleet API + Virtual Key + Tesla registration |
| **Tesla Owner API** | Tesla cloud | ❌ **blocked in 2026** | — |
| **Monta integration** | Monta cloud | Home-charging cost for company-car billing | API key in wizard |

**Concretely for new installs without Fleet approval:** enable OwnTracks — you get a legally compliant GPS-based logbook, trip heatmap, distance tracking, automatic driver assignment. The missing battery/climate values are not strictly required for a classic business logbook.

---

## Features

| Area | Description |
|---|---|
| **Dashboard** | Overall statistics, latest trip, monthly distance chart |
| **Trips** | GPS track on map, consumption, speed, SoC over time |
| **Charging** | Charging sessions with cost, GPS-based charging-location matching, free sessions can be flagged |
| **Charging locations** | Definable spots with GPS radius, price/kWh, auto-detection |
| **Battery** | Degradation tracking, range history over time |
| **Tech** | Live telemetry: TPMS, power flow, climate, charging status |
| **Controls** | Vehicle commands: climate, climate-keeper (dog/camp), seat heaters (5 seats × 4 levels), steering-wheel heater, doors, frunk/tailgate, windows, sentry mode, charging incl. amps slider and charge port, departure schedule, boombox, software update, navigation (Virtual Key required) |
| **Route planner** | Interactive route planner with SoC-aware charging stops incl. charge time estimate; departure SoC (live or manual), target SoC and charging target configurable; weather (Open-Meteo), traffic (HERE Maps), speed cameras (OpenStreetMap) along the route; map view with tile proxy |
| **Logbook** | BMF-compliant electronic Fahrtenbuch: classification, business partner, purpose, odometer columns, consecutive numbering in PDF, post-export lock, manual entry, trip merge/split |
| **Billing** | Home-charging sessions & Monta integration for all vehicles; cost statement (PDF, reimbursement template) for company cars |
| **Service log** | Maintenance, repairs, tires, inspections with cost |
| **Export** | CSV/JSON export for trips & charging, full backup |
| **Service intervals** | Per-vehicle recurring service tasks (MOT, tyres, brake fluid, …) with time- and km-intervals + daily push reminders |
| **Audit log** | Admin viewer for security events with filters and CSV export (GDPR-friendly) |
| **Dynamic tariff** | aWattar (DE/AT) and Tibber integration: 24h price curve on the dashboard, one-click schedule charging at the cheapest 4h window |
| **PDF reimbursement** | Signable PDF for home-charging reimbursement (client-side, no cloud) |
| **Notifications** | Web Push when charging finishes, plus maintenance reminders — fan-out to Telegram in parallel when linked |
| **Telegram bot** | Full 1:1 bot with inline buttons: `/status` (with lock/climate/sentry/charge buttons + unlock confirm), `/battery`, `/range`, `/location` (Maps link), `/today`, `/trips`, `/classify` (label a trip), `/service`, `/firmware`, `/clean` — plus proactive push for charging-complete, sentry alerts, service reminders and new firmware versions. Audit log for every vehicle action |
| **User handbook** | Complete guide readable directly inside the app |
| **Design & themes** | 5 design styles (Glass, Cyber, Minimal, Sport, **Nevs-Edition**) + 6 accent colors, all stored locally; Nevs-Edition with its own Bricolage Grotesque typography and live status bar |
| **Settings** | All sections collapsible and individually reorderable (drag-to-sort) |
| **Navigation** | Sortable, individually hideable navigation entries |
| **Mobile / Tesla** | Installable PWA for iPhone/iPad (Safari), Android, the Tesla in-car browser and desktop. iOS-style bottom tab bar (4 quick tabs + "More" bottom sheet). Compact card view in the logbook on narrow screens. |
| **CO₂ comparison** | Tesla CO₂ vs. diesel equivalent, tonnes saved, grid-mix factor (0.38 kg/kWh DE) — per week in the Energy Report |
| **Weather consumption** | Consumption correlation by temperature bucket (< −10 °C to > 30 °C) in the Energy Report — shows how cold and heat affect range |
| **Climate statistics** | Daily AC usage (hours), seat heating, preconditioning count, coldest/hottest day |
| **Firmware tracker** | Automatically records every new vehicle software version with history and days installed |
| **Community Benchmark** | Opt-in anonymous consumption comparison with other drivers of the same model; k-anonymity, SHA-256 hash, GDPR-compliant |
| **System status** | Traffic-light card (Tesla token, Virtual Key, Fleet Telemetry, poller, DB) — green/yellow/red at a glance |
| **Activity heatmap** | Calendar heatmap of all trips (Year/Month/Week/All), click navigates to that day's trip list |
| **Tenant pseudonym** | Privacy: login page shows a random `adjective-noun` pseudonym instead of the real tenant name, regeneratable by admin |
| **Fleet Telemetry first** | WebSocket streaming as the preferred data source (Tesla approval required). When active → poller falls back to 1×/h heartbeat, saving >95 % of API budget. Otherwise API polling as fallback |
| **Encryption at rest** | AES-256-GCM for Tesla OAuth tokens, TOTP MFA secret, Virtual-Key private key. Hash + timing-safe compare for password-reset tokens. Auto-generated key at `data/.encryption-key` |
| **Auto-updating PWA** | Service worker detects deploys and auto-reloads — no `Ctrl+Shift+R` required, including iOS PWA |

---

## Preview

Live screenshots from the demo instance, refreshed daily at 04:45:

<table>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/dashboard.png" alt="Dashboard" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/trips.png" alt="Trips" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/charging.png" alt="Charging" /></td>
  </tr>
  <tr>
    <td align="center"><em>Dashboard</em></td>
    <td align="center"><em>Trips</em></td>
    <td align="center"><em>Charging</em></td>
  </tr>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/routes.png" alt="Route planner" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/telemetry.png" alt="Telemetry" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/settings.png" alt="Settings" /></td>
  </tr>
  <tr>
    <td align="center"><em>Route planner</em></td>
    <td align="center"><em>Telemetry</em></td>
    <td align="center"><em>Settings</em></td>
  </tr>
</table>

📸 Live demo: **[demo.teslaview.krische.com](https://demo.teslaview.krische.com)** · [Mobile view](https://www.teslaview.krische.com/shots/mobile/dashboard.png) · [All screenshots](https://www.teslaview.krische.com/#screens)

### Telegram bot

Link your account under *Settings → Telegram* and use the bot directly on iPhone/Android:

<table>
  <tr>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-status.png" alt="/status with inline buttons" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-notification.png" alt="Push notification" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-classify.png" alt="Classify a trip" /></td>
  </tr>
  <tr>
    <td align="center"><em>/status with inline buttons</em></td>
    <td align="center"><em>Push notification</em></td>
    <td align="center"><em>Classify a trip</em></td>
  </tr>
</table>

Commands: `/status`, `/battery`, `/range`, `/location`, `/today`, `/trips`, `/classify`, `/service`, `/firmware`, `/clean`, `/help`, `/unlink`. Inline buttons under `/status` for lock/unlock (with confirm), climate, sentry, charging. Push notifications for charging-complete, sentry alerts, service reminders and software updates — in parallel with Web Push.

[See all Telegram mockups ↗](https://www.teslaview.krische.com/#telegram)

---

## Multi-tenant architecture (since v2.0)

Since v2.0 Tesla Carview supports **multiple tenants** with full data isolation:

- Every tenant has its own SQLite database
- New tenants only via **invite link** with optional **note** (Admin → Users → Create invite link, valid 7 days, single-use); invites can be re-issued, soft-revoked or deleted
- **Multiple vehicles** per tenant: sync via Settings → 🔄 Sync vehicles
- **User management** per tenant (roles, vehicle assignment, locking) with fine-grained permissions: `Edit vehicles`, `Add vehicles`, `MFA required` per user
- **Forced MFA for new accounts** — router guard redirects to TOTP setup until MFA is active
- **Admin task card** lists active users without an assigned vehicle with one-click actions
- **Logbook entries track their author** and show it next to every entry
- **Passkey authentication** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Password reset** via admin-generated link
- **Home wallbox detection via Monta** (charge-point-ID match → 🏠 marker in charging list and billing)
- **Free charging sessions**: markable in the charging history, excluded from billing
- **Version bump on legal pages** automatically writes today's date into the "Stand:" line before incrementing

---

## System requirements

| Component | Minimum | Recommended | Note |
|---|---|---|---|
| **CPU** | 1 core | 2+ cores | Pi 5 / VPS / x86 — ARM64 + AMD64 supported |
| **RAM** | 2 GB | 4+ GB | with Ollama: 4+ GB required (1B model), 8+ GB for 3B models |
| **Disk** | 2 GB | 10+ GB | with Ollama: extra 1–20 GB per model |
| **OS** | Docker-capable | Debian/Ubuntu/Pi OS | systemd-based recommended |
| **Internet** | no | DSL+ | for Tesla API + GHCR image pulls + Ollama model downloads |

### AI-mode hardware table (Ollama local)

If you want to use the data-sovereign local AI chat (Ollama, on by default):

| Hardware | Recommended model | RAM | tok/s (inference) | Usable for |
|---|---|---|---|---|
| Pi 4 (4 GB) | `llama3.2:1b` | ~1.5 GB | 4–6 | simple Q&A, latency noticeable |
| Pi 4 (8 GB) | `qwen2.5:1.5b` | ~1.8 GB | 3–5 | better, still slow |
| Pi 5 (8 GB) | `qwen2.5:3b` | ~3 GB | 4–6 | recommended default |
| VPS (4 vCPU / 8 GB) | `qwen2.5:3b` | ~3 GB | 8–12 | comfortable |
| VPS / workstation (16 GB+) | `llama3:8b` | ~6.5 GB | 5–8 | very good, a bit slower |
| GPU (8+ GB VRAM) | `llama3:8b` or similar | per model | 30–80+ | enterprise-grade |

**Disable Ollama** if your hardware can't run it — create a `docker-compose.override.yml` with:
```yaml
services:
  ollama:
    profiles: [disabled]
```
Then `docker compose up -d` without Ollama. Or simpler: in the wizard set `AI provider = Off`. Cloud alternative: `AI provider = Grok` (xAI API key required, data goes to the cloud).

## Quickstart

> **⏳ Tesla-side preparation (can run in parallel with setup):**
> Using the Tesla Fleet API means registering an application at [developer.tesla.com](https://developer.tesla.com/). **Tesla approval can take 1–3 weeks.** The installation itself works without it — every non-Tesla feature is immediately available, and you can add the Tesla credentials later via `bash deploy/setup-wizard.sh`. See [docs/04-tesla-api.en.md](docs/04-tesla-api.en.md) for steps and the Virtual Key setup.

### Raspberry Pi / Linux server (recommended)

```bash
# As root on the target machine:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

The script auto-detects the architecture (x86_64, ARM64, ARMv7) and installs everything.

### Local development

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# Backend
cd backend
cp .env.example .env
# adjust .env (JWT_SECRET is mandatory!)
npm install && npm run dev

# Frontend (second terminal)
cd frontend && npm install && npm run dev
```

→ open browser: **http://localhost:5173**
→ on first start you are automatically redirected to the setup wizard

### Just configure (no install)

```bash
bash deploy/setup-wizard.sh
```

Interactive assistant for: domain, Tesla API credentials, e-mail, Web Push.

---

## Initial configuration (web wizard)

On first start the app redirects to **/setup** automatically.
There you can create the tenant name and the administrator account in the browser.

Recommended steps after login:
1. Connect Tesla vehicle (Settings → Tesla)
2. Register Virtual Key on the vehicle (Settings → Virtual Key)
3. Enable MFA (Settings → Two-factor authentication)
4. Configure charging locations

The **user handbook** is available directly inside the app at `/handbook`.

---

## Vehicle commands & Virtual Key

A **Virtual Key** is required for vehicle commands (climate, doors, horn, etc.).
The Virtual Key allows the app to send signed commands directly to the vehicle.

**Prerequisite**: a running [`tesla-http-proxy`](https://github.com/teslamotors/vehicle-command) on the server.

```bash
# start the proxy (example — adjust paths):
tesla-http-proxy -port 4443 -host 0.0.0.0 \
  -tls-key /etc/tesla-proxy/server.key \
  -cert /etc/tesla-proxy/server.crt \
  -key-file /etc/tesla-proxy/tesla_priv.pem
```

The public key must be reachable at `/.well-known/appspecific/com.tesla.3p.public-key.pem`
on the app domain so the vehicle can verify the key.


---

## Monta integration (optional)

Tesla Carview supports optional sync with [Monta](https://monta.com) — an EV charge-management service. The integration is available for **all vehicles**:

- **Private vehicles**: Monta charging sessions are shown in the billing view as home charges (🏠 badge, automatic home-wallbox detection).
- **Company cars**: Additionally, full cost billing — monthly overview, signable PDF reimbursement sheet, billing template for the employer.

Per-vehicle configuration in the settings (Vehicle profile → Home charging):
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (filters sessions to a specific charge point)
- **Wallbox electricity price** (€/kWh, billing basis for company cars)

Sync runs manually via **Billing → Monta Sync**.


---

## Security

- JWT (access token 15 min, refresh token 7 days as httpOnly cookie)
- **TOTP MFA** (Google Authenticator, Authy, 1Password, etc.)
- **Passkeys** (WebAuthn, passwordless login)
- **10 backup codes** (bcrypt-hashed, single-use)
- **Account lockout** after 5 failed attempts (15 min)
- **fail2ban** IP block after 3 failed logins (10 min)
- **HTTPS** with TLS 1.2/1.3, HSTS, OCSP stapling
- **CSP, X-Frame-Options, Permissions-Policy** headers
- **Rate limiting** on login and API endpoints
- **Audit log** of all security-relevant actions
- **Data deletion** with backup warning and confirmation text

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) + WebAuthn (@simplewebauthn) |
| Tesla data | Tesla Fleet API (OAuth2) + Fleet Telemetry (WebSocket) |
| Multi-tenancy | Separate SQLite databases per tenant, master DB for global data |
| Deployment | Docker Compose + nginx + Let's Encrypt |
| Platforms | linux/amd64 · linux/arm64 · linux/arm/v7 |

---

## Project structure

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # schema + DB initialisation (master-schema.sql)
│   │   ├── middleware/    # auth.js (multi-tenant JWT), security.js, validate.js
│   │   ├── routes/        # auth, setup, register, passkey, password-reset,
│   │   │                  # users, vehicles, trips, charging, data-management, …
│   │   └── services/      # teslaApi, poller (multi-tenant), dataSync (GPS), …
│   └── .env.example       # configuration template
├── frontend/
│   └── src/
│       ├── views/         # Login, Register, Setup, Dashboard, Trips,
│       │                  # Settings (Passkey), UserManagement, DataManagement,
│       │                  # Handbook, PasswordReset, …
│       ├── components/    # NavBar (admin links, handbook), StatCard
│       ├── store/         # auth.js (passkey, tenant), index.js
│       └── router/        # routes with admin guard
├── deploy/
│   ├── setup.sh                  # fully automated server setup
│   ├── setup-wizard.sh           # interactive configuration assistant
│   ├── nginx-host.conf.template  # nginx config (HTTPS, TLS hardening)
│   └── update.sh                 # zero-downtime update
├── docs/                  # detailed guides
├── docker-compose.yml          # development
└── docker-compose.prod.yml     # production
```

---

## Important environment variables (.env)

| Variable | Description | Example |
|---|---|---|
| `JWT_SECRET` | Secret key for JWT (≥ 32 chars, random) | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Tesla Developer app client ID | `abc123…` |
| `TESLA_CLIENT_SECRET` | Tesla Developer app secret | `secret…` |
| `FRONTEND_URL` | Public URL of the app (for OAuth callback + passkeys) | `https://carview.example.com` |
| `RP_NAME` | Display name for passkey dialogs | `Tesla Carview` |
| `RP_ID` | Domain for WebAuthn (without protocol) | `carview.example.com` |

---

## Documentation

Tesla Carview ships two separate documentation tiers:

### 👤 For users of the app

In-app handbook at `/handbook` in the running app — or read it directly at [`frontend/src/handbook/handbook.en.md`](frontend/src/handbook/handbook.en.md). Topics: dashboard, trips, charging, BMF-compliant logbook, vehicle controls, service intervals, demo mode, mobile install, user-side troubleshooting.

### 🛠 For self-hosters and administrators

Technical documentation in the [`docs/`](docs/README.en.md) folder:

| Document | Content |
|---|---|
| [📚 Docs index](docs/README.en.md) | Map of every technical document |
| [Quickstart](docs/01-quickstart.en.md) | Local development environment |
| [Deployment](docs/02-deployment.en.md) | Server deployment + Raspberry Pi |
| [Authentication & MFA](docs/03-authentication.en.md) | Login system, MFA, passkeys |
| [Tesla Fleet API](docs/04-tesla-api.en.md) | Set up Tesla Developer account |
| [Security architecture](docs/05-security-architecture.en.md) | Threat model, all measures |
| [fail2ban](docs/06-fail2ban.en.md) | Configure brute-force protection |
| [Setup wizard](docs/07-setup-wizard.en.md) | Interactive configuration assistant |
| [Dokploy deployment](docs/08-dokploy.en.md) | Alternative deployment platform |
| [Tesla API quota](docs/09-tesla-api-usage.en.md) | API cost and tracking |
| **[🔧 Configuration (ENV)](docs/10-configuration.en.md)** | Every environment variable — required, optional, demo, auto-update |
| **[🛠 Operations](docs/11-operations.en.md)** | Backup/restore, nightly maintenance, demo mode, auto-update, logs |
| **[🛡️ High availability (HA)](docs/12-high-availability.en.md)** | Architecture options for SLA-critical setups (teaser, on request) |

---

## Updates

```bash
bash deploy/update.sh
```

---

## Contributing

Contributions are welcome! Read the [Contribution Guidelines](CONTRIBUTING.md) first, then pick a [good first issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue) or open a pull request directly.

---

## License

[**PolyForm Noncommercial 1.0.0**](LICENSE) — noncommercial software license from [polyformproject.org](https://polyformproject.org).

**Permitted:** personal use, self-hosting (including for family/household), modifications, free redistribution under the same terms, use by charitable organisations, educational and public-research institutions.

**Prohibited:** selling the software, running it as a paid service (SaaS) for third parties, commercial use of any kind, sublicensing.

Any redistribution must include the full license text and the copyright `Required Notice`. The software is provided "as is", without warranty — details see [LICENSE](LICENSE).

---

## ❤️ Support

Tesla Carview is free and ad-free **for private, self-hosted use in your own household** (see [LICENSE](LICENSE) and [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)). Commercial resale, third-party SaaS hosting, or embedding into commercial products is **not** permitted.

If the program is worth something to you, the following non-profit
organizations are happy about your direct support:

| Organization | Description |
|---|---|
| **Aktion Deutschland Hilft** | Alliance of relief organisations for fast and effective disaster aid worldwide |
| **Lebenshilfe Rems-Murr** | Support, accompaniment and inclusion for people with disabilities in the Rems-Murr region |
| **Radio 7 Drachenkinder** | Help for seriously ill children in the region — funds therapies and wishes |

> **100 % of your donation goes directly to the organisation. We see neither the amount nor your data.**

Reachable in the app via the **❤ Support** link in the footer at the bottom of every page, or directly at `/support`.

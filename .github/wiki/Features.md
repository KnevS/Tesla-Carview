# Features Overview

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | You are here |
| 🇩🇪 **[Deutsch](DE-Features)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Features)** | Version française |
| 🇪🇸 **[Español](ES-Features)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Features)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Features)** | Ελληνική έκδοση |

---

Tesla Carview covers the full lifecycle of your Tesla — from tracking every trip to controlling the car, planning routes, and managing charging costs. Everything runs on your own server.

---

## What does Tesla Carview offer?

| Module | Summary |
|---|---|
| 📊 Dashboard | Live status, stats, tariff widget, health overview |
| 🚗 Trip Logbook | Auto-recorded drives, BMF-compliant PDF export |
| ⚡ Charging | Sessions, locations, Monta sync, cost invoices |
| 🔋 Battery | Health tracking, degradation, range history |
| 🗺️ Route Planner | OSRM routing, charger overlay, send to Tesla |
| 🎮 Vehicle Control | Climate, locks, charging, OTA, scheduled charging |
| 📝 Service Logbook | Maintenance records, intervals, push reminders |
| 💬 Grok Chat | xAI-powered AI assistant with vehicle context |
| 📤 Export | CSV, JSON, PDF invoices, full backup |
| 🔐 Security | Passkeys, MFA (TOTP), QR-SSO for Tesla browser |
| 🌍 Multi-Language | DE · EN · FR · ES · TR · EL |
| 📱 PWA | Installable on home screen, offline shell |

---

## 📊 Dashboard

The dashboard is your central overview, showing:
- **Live vehicle status** — battery level, range, location, charging state
- **Recent trips** — last 5 trips with distance and consumption
- **Monthly statistics** — distance, energy used, charging cost
- **Dynamic tariff widget** — current electricity price (aWATTar DE/AT, Tibber) with 24 h price chart and auto-set charging window
- **Service intervals** — upcoming maintenance reminders (TÜV, oil, brake fluid, etc.)
- **System health** — Tesla API connection status, Fleet Telemetry, database size

The dashboard is fully customisable: show, hide, and reorder cards in **Settings → Setup Wizard**.

---

## 🚗 Trips (Trip Logbook)

Every drive is automatically recorded with:
- Start and end location (address + GPS coordinates)
- Distance, duration, average speed
- Energy consumption (kWh and kWh/100 km)
- Battery level at start/end
- Trip type classification (private / commute / business)

### BMF-compliant logbook
The trip logbook meets German tax office (Finanzamt/BMF) requirements:
- Business partner and trip purpose fields
- Sequential trip numbering
- "Lock" function for finalising the logbook
- **PDF export** in A4 landscape format with all legally required fields
- Trip merging and splitting for multi-stop journeys
- Manual trip creation for forgotten entries

### GPS location editing
If a trip has a missing or wrong address, edit it directly in the trip detail view.

---

## ⚡ Charging

All charging sessions are logged automatically:
- Location (GPS-matched to saved charging locations)
- Energy added (kWh) and estimated cost
- Charging speed and duration
- Home charging flag (🏠) via Monta integration

### Charging locations
Define home and regular charging spots in **Settings → Charging Locations** — sessions are tagged automatically, and a per-kWh rate is applied for cost calculation.

### Monta integration
Enter your Monta API key in Settings. Sessions sync automatically with correct kWh and cost data, and the home flag is set.

### Cost calculation & PDF invoice
Generate PDF invoices for reimbursement (**Billing → Generate Invoice**). Select date range, include/exclude sessions — fully client-side.

---

## 🔋 Battery

Track your battery health over time:
- Degradation curve (estimated vs. rated range)
- Charge cycle counter
- Historical charge level data
- Range comparison across temperatures

---

## 🗺️ Route Planner

Plan routes before you drive and send them directly to your Tesla's navigation:

- **Start location** — auto-set from vehicle GPS, browser GPS, or manual entry
- **Destination search** — geocoded via Nominatim (backend proxy, no CSP issues)
- **Up to 5 waypoints** — add intermediate stops
- **OSRM routing** — open-source routing engine, no account needed
- **Estimated arrival SoC** — calculates battery level at destination based on your real consumption history
- **Charger overlay** — shows fast-charging stations (CCS, CHAdeMO, Tesla) along the route via OpenChargeMap
- **Send to Tesla** — one tap sends the destination to the car's navigation
- **Save & reload routes** — store favourite routes for quick access
- **ABRP fallback** — optional link to A Better Route Planner with pre-filled destination

---

## 🎮 Vehicle Control

Control your Tesla directly from the app:
- 🌡️ **Climate** — start/stop, set temperature, seat heating, steering wheel heating, keeper modes (Camp/Dog/Keep)
- 🔓 **Locks** — lock/unlock doors
- 💡 **Lights** — flash lights, horn
- 🚪 **Trunk/frunk** — open trunk and frunk
- 🪟 **Windows** — open/close windows
- 🔌 **Charging** — open/close charge port, set charging amps, start/stop
- ⏰ **Scheduled charging** — set off-peak charging windows
- 🔄 **Software updates** — trigger and monitor OTA updates
- 🎵 **Boombox** — trigger boombox sounds (where supported)

> Commands require the **Virtual Key** to be paired. See [Tesla API Setup](Tesla-API-Setup#step-3-set-up-the-virtual-key-for-commands).

---

## 📝 Service Logbook

Log all maintenance events:
- Date, category (maintenance / repair / tire / inspection / note)
- Cost, mileage, workshop name
- Description

### Service intervals & reminders
Configure recurring intervals (**Settings → Service Intervals**). The app sends Web Push notifications 30 days before and 1 000 km before each interval. The dashboard shows upcoming services as a preview card.

---

## 💬 Grok Chat (AI Assistant)

Ask questions about your Tesla data in natural language, powered by xAI Grok:
- **Context-aware** — Grok sees your recent trips, charging sessions, and vehicle stats
- **Streaming** — answers appear word by word like a real chat
- **Multi-chat history** — conversations are saved and searchable in the sidebar
- **Budget control** — set a daily token budget in Settings to cap costs
- **Privacy** — requests route through your backend, never directly from the browser to xAI; no raw VINs or exact addresses are sent

> Requires an xAI API key (`XAI_API_KEY` in `.env`). Get one at [console.x.ai](https://console.x.ai).

---

## 🔐 Security & Authentication

### Passkeys (WebAuthn)
Log in with Face ID, Touch ID, or a hardware key instead of a password. Manage passkeys in **Settings → Passkeys**.

### MFA (TOTP)
Enable two-factor authentication with any authenticator app. Backup codes are generated at setup.

### QR-SSO for Tesla browser
The Tesla in-car browser cannot use Face ID or hardware keys. The QR login flow solves this:
1. The Tesla browser shows a QR code (5-minute TTL)
2. Scan with your phone
3. Authenticate with your phone's passkey/Face ID
4. The Tesla browser session is unlocked automatically

### Password
Standard username/password authentication with bcrypt hashing. Admins can generate reset tokens for users.

---

## 🧙 Setup Wizard

A step-by-step wizard guides you through the initial configuration and can be relaunched anytime from **Settings → Launch Wizard**:
1. Interface language
2. Design style (Glass / Cyber / Minimal / Sport)
3. Accent colour
4. Units (km/mi, °C/°F, kWh/mi)
5. Dashboard card visibility and order
6. Navigation tabs
7. Push notifications
8. Summary & confirm

---

## 🌡️ Dynamic Tariff (aWATTar / Tibber)

Connect aWATTar (DE/AT, no API key) or Tibber (API key in Settings):
- Dashboard shows current price and 24 h price chart
- **Auto-set charging window** — one click sets scheduled charging to the cheapest 4 h window in the next 24 h

---

## 🌍 Multi-Language

Fully translated into: 🇩🇪 German · 🇬🇧 English · 🇫🇷 French · 🇪🇸 Spanish · 🇹🇷 Turkish · 🇬🇷 Greek

Language resolution order:
1. User profile setting (overrides everything)
2. Tenant's default language
3. Browser language

---

## 📱 PWA (Progressive Web App)

Install Tesla Carview on your home screen:
- **Android/Desktop Chrome:** Install icon in address bar
- **iOS Safari:** Share → "Add to Home Screen"
- **Tesla browser:** Menu → "Add to home screen"

The installed PWA caches the app shell, works offline for cached pages, and receives push notifications like a native app.

---

## 🔔 Push Notifications

Get notified when:
- Charging is complete
- A service interval is approaching
- A software update is available

**Setup:** Settings → Push Notifications → Enable.

---

## 👥 Multi-Tenant & Users

- Each tenant has a fully isolated SQLite database
- Admins invite users via one-time links
- Per-user permissions: can edit vehicles, can add vehicles, MFA required
- Tenant default language and settings

See [Multi-Tenant & Users](Multi-Tenant) for full details.

---

## 🧪 Demo Mode

Enable a demo sandbox with `DEMO_ENABLED=true` in `.env`:
- Fake trips and charging history are generated automatically
- Demo accounts expire after 14 days
- IP-based rate limiting prevents abuse

---

## 📤 Export & Backup

- **Trips** — CSV or JSON
- **Charging sessions** — CSV or JSON
- **Service logbook** — CSV
- **Full backup** — JSON (all tables), importable for restore via **Admin → Data Management**

---

## 🌙 Maintenance Mode

When the backend restarts after an update, the app shows an overlay with Tesla quotes, a countdown, and auto-reconnects as soon as the backend is back.

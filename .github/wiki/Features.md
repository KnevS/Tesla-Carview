# Features Overview

Tesla Carview covers the full lifecycle of your Tesla — from tracking every trip to controlling the car and managing charging costs.

---

## 📊 Dashboard

The dashboard is your central overview, showing:
- **Live vehicle status** — battery level, range, location, charging state
- **Recent trips** — last 5 trips with distance and consumption
- **Monthly statistics** — distance, energy used, charging cost
- **Dynamic tariff widget** — current electricity price (aWATTar DE/AT, Tibber)
- **Service intervals** — upcoming maintenance reminders (TÜV, oil, brake fluid, etc.)
- **System health** — Tesla API connection status, Fleet Telemetry, database size

The dashboard refreshes automatically every 60 seconds when you have the tab open.

---

## 🚗 Trips (Fahrtenbuch)

Every drive is automatically recorded with:
- Start and end location (address + GPS coordinates)
- Distance, duration, average speed
- Energy consumption (kWh and kWh/100km)
- Battery level at start/end
- Trip type classification (private / commute / business)

### Trip logbook (BMF-compliant)
The trip logbook meets German tax office (Finanzamt/BMF) requirements:
- Business partner and trip purpose fields
- Sequential trip numbering
- "Lock" function for finalizing the logbook
- **PDF export** in A4 landscape format with all legally required fields
- Trip merging and splitting for multi-stop journeys
- Manual trip creation for forgotten entries

### GPS location editing
If a trip has a missing or wrong address, you can edit it directly:
- Click any trip → Edit location
- Enter address manually or drag a map pin

---

## ⚡ Charging

All charging sessions are logged automatically:
- Location (GPS-matched to saved charging locations)
- Energy added (kWh) and estimated cost
- Charging speed and duration
- Home charging flag (🏠) via Monta integration

### Charging locations
Define your home and regular charging spots:
- **Settings → Charging Locations** → Add with address + GPS + radius
- Sessions at that location are automatically tagged
- Set a per-kWh rate per location for cost calculation

### Monta integration
If you use Monta for home charging:
- Enter your Monta API key in Settings
- Monta sessions sync automatically with correct kWh and cost data
- Home charging flag is set automatically

### Cost calculation & PDF invoice
Generate PDF invoices for reimbursement (e.g., for your employer):
- **Billing → Generate Invoice**
- Select date range and include/exclude specific sessions
- PDF with letterhead, table, totals, and signature field
- Generated completely client-side — no data leaves your server

---

## 🔋 Battery

Track your battery health over time:
- Degradation curve (estimated vs. rated range)
- Charge cycles counter
- Historical charge level data
- Range at different temperatures (winter vs. summer comparison)

---

## 🎮 Vehicle Control

Control your Tesla directly from the app:
- 🌡️ **Climate** — start/stop, set temperature, seat heating, steering wheel heating
- 🔓 **Locks** — lock/unlock doors
- 💡 **Lights** — flash lights, horn
- 🚪 **Trunk/frunk** — open trunk and frunk
- 🔌 **Charging** — open/close charge port, set charging amps, start/stop
- 🔄 **Software updates** — trigger and monitor OTA updates
- ⏰ **Scheduled charging** — set off-peak charging windows
- 🎵 **Remote boombox** — trigger boombox sounds (where supported)
- 🌬️ **Climate keeper** — set camp/dog/keep mode
- 🪟 **Windows** — open/close windows

> Commands require the **Virtual Key** to be paired. See [Tesla API Setup](Tesla-API-Setup#step-3-set-up-the-virtual-key-for-commands).

---

## 📝 Service Logbook (Betriebsbuch)

Log all maintenance events:
- Date, category (maintenance / repair / tire / inspection / note)
- Cost, mileage
- Description and attachments
- Who performed the work (workshop name)

### Service intervals & reminders
Set up recurring maintenance reminders:
- **Settings → Service Intervals** → Add interval (e.g., "TÜV in 2 years", "Brake fluid every 2 years")
- Push notifications 30 days before and 1000 km before each interval
- Dashboard shows upcoming services as a preview card

---

## 📤 Export

Export all your data:
- **Trips** — CSV or JSON
- **Charging sessions** — CSV or JSON
- **Service logbook** — CSV
- **Full backup** — JSON (all tables), importable for restore

---

## 🔔 Push Notifications

Get notified in your browser when:
- Charging is complete
- A service interval is approaching
- Software update available

Notifications work on desktop (Chrome, Firefox, Edge) and mobile (Android Chrome, iOS Safari with Home Screen shortcut).

**Setup:** Settings → Push Notifications → Enable notifications

---

## 📱 PWA (Progressive Web App)

Tesla Carview works as a PWA — you can install it on your home screen:

- **Android/Desktop Chrome:** Tap the install icon in the address bar
- **iOS Safari:** Tap Share → "Add to Home Screen"
- **Tesla browser:** Tap the menu → "Add to home screen"

Installed PWA works offline for cached pages and gets notifications like a native app.

---

## 🌡️ Dynamic Tariff (aWATTar / Tibber)

If you have a dynamic electricity tariff:
- Connect aWATTar (DE/AT, no API key needed) or Tibber (API key in Settings)
- Dashboard shows current price and 24-hour price chart
- **Auto-set charging window** — one click sets scheduled charging to the cheapest 4-hour window in the next 24 hours

---

## 🌍 Multi-Language

The app is fully translated into:
🇩🇪 German · 🇬🇧 English · 🇫🇷 French · 🇪🇸 Spanish · 🇹🇷 Turkish · 🇬🇷 Greek

Language is determined by:
1. Your user profile setting (overrides everything)
2. The tenant's default language
3. Your browser language

---

## 🌙 Maintenance Mode

The app shows a "maintenance" overlay automatically when the backend is unreachable (restarting after updates). It shows Tesla quotes in German/English, a countdown timer, and polls every 3 seconds until the backend is back — then disappears.

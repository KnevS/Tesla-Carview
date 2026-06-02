# 📖 Tesla Carview Handbook

> ℹ️ **Note for administrators and self-hosters:** This handbook covers the app from a user perspective. Installation, environment variables, backup/restore workflows, nightly maintenance and enabling demo mode are documented in the **technical docs** in the repository's [`docs/`](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) folder — in particular [10-configuration](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) (every env variable) and [11-operations](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md) (backup, maintenance, demo).
>
> 📚 **New to Tesla Carview?** The **[GitHub Wiki](https://github.com/KnevS/Tesla-Carview/wiki)** offers a guided introduction: step-by-step instructions for installation, network access without a static IP (DynDNS, Cloudflare Tunnel, router setup), Raspberry Pi storage (SSD instead of SD card) and more — written for non-IT-experts.

Version 2.1 · Self-Hosted · Multi-Tenant

## 🌟 Overview {#overview}

Tesla Carview is a **self-hosted** data-logger app for Tesla vehicles. All data stays exclusively on your own server — no cloud, no data sharing. The app is fully **responsive** and runs on **iPhone/iPad (Safari)**, Android phones and desktop browsers.

**Features at a glance:**

- 🚗 **Trip log** — GPS tracks, energy consumption, trip-type categorisation
- ⚡ **Charging** — Charging sessions with costs, GPS-based location detection
- 🔋 **Battery** — Degradation tracking, range history
- 📊 **Dashboard** — Statistics, monthly overview, recent activity
- 🎮 **Controls** — Climate, doors, lights — directly from the app
- 📝 **Service log** — Maintenance, repairs, costs with date
- 📤 **Export** — CSV/JSON for all data, full backup as ZIP
- 🔔 **Push notifications** — Browser notifications for charging done, sentry alerts, low battery and more; with action buttons (start climate, find charger, snooze), tag grouping (repeated charging updates replace each other) and automatic mirroring to iPhone/Apple Watch
- 📱 **Mobile-optimised** — Fully usable on iPhone/iPad (Safari), Android and desktop

## 🔀 Sort order {#sort-order}

Every list with chronological entries (trips, charging sessions, service-log entries, billing statements, audit events, user list, legal-content versions) has a **sort toggle** in the top-right corner. One click switches between:

- ↓ **Newest first** (default)
- ↑ **Oldest first**

The chosen order is **stored per view in your browser** (`localStorage`) and survives reloads and tab closing — you can set it differently for each list (e.g. trip log "newest first", user list "oldest login last").

## 📋 Requirements {#requirements}

### Server

- Linux server (x86_64, ARM64 or ARMv7) with at least 1 GB RAM
- Docker + Docker Compose (installed by the setup script)
- Publicly reachable domain + TLS certificate (required by the Tesla API)
- Port 443 (HTTPS) must be reachable from the outside

### Tesla Developer Account

- Sign up at `developer.tesla.com`
- Create an app → note the Client ID and Client Secret
- Callback URL: `https://<your-domain>/api/auth/callback`
- For vehicle commands: request Fleet API access (free, 1–3 business days)

## 🚀 Installation {#installation}

The setup script installs everything automatically: Docker, nginx, TLS, tesla-http-proxy.

```bash
# As root on the target server:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash

# The script asks interactively for:
# → Domain (e.g. carview.myserver.com)
# → Tesla Client ID and Client Secret
# → Tesla Redirect URI
# → JWT Secret (generated automatically)
```

> **Alternative: Manual configuration**
>
> Copy `.env.example` → `.env` and adjust all values. Then: `docker compose -f docker-compose.prod.yml up -d`

## ⚙️ Initial setup in the browser {#first-setup}

1. **Open browser** — Open `https://<your-domain>/setup` — you will be redirected automatically.
2. **Create tenant** — Pick a tenant name (e.g. "Smith Family") and a short slug (e.g. "smith"). The slug is required at login — write it down.
3. **Create admin account** — Set a username and password. The password must be at least 12 characters long. Recommended: a 4-word passphrase.
4. **Settings assistant** — After first login the assistant launches automatically and guides you through all critical setup steps (see below).

## 🧙 Settings assistant {#settings-wizard}

After the first login the **settings assistant** opens automatically. It can be re-launched at any time via **Settings → Launch assistant**.

**For admins** the assistant guides through 16 steps in the correct dependency order:

| Step | What happens |
|------|-------------|
| **Language** | Choose app language |
| **Tesla OAuth** | Connect Tesla account — button opens a popup that closes automatically after login |
| **Vehicles** | Sync vehicles from the Tesla account |
| **Virtual Key** | Display and copy the registration link for your smartphone |
| **Fleet Telemetry** | Activate GPS tracking per vehicle |
| **Electricity price** | Home charging price (€/kWh) per vehicle for cost calculation |
| **Legal check** | Automatic scan for open mandatory placeholders (`<<NAME>>` etc.) in imprint/privacy/terms |
| **External APIs** | OCM (charging stations), HERE Maps (traffic), Grok/xAI (AI chat) |
| **Monitoring** | Self-healing + alert email |
| **Design → Summary** | Preferences; all changes are saved only at the final step |

> **Tip:** Every step can be skipped — the assistant can be re-launched at any time.

> **🌐 Language switcher:** Every wizard shows a compact language switcher in the top-right. The language stored in the user profile or tenant default is applied automatically on login; the switcher lets you change the language mid-wizard without leaving it.

## 🔑 Setting up a Virtual Key {#virtual-key}

For vehicle commands (unlocking doors, climate, etc.) a Virtual Key must be registered on the vehicle. This is only required for newer vehicles (`vehicle_command_protocol_required: true`).

1. Make sure **tesla-http-proxy** is running:

   ```bash
   systemctl status tesla-http-proxy
   ```

2. On the iPhone, open in Safari: `https://tesla.com/_ak/<your-domain>`
3. The Tesla app asks "Allow this app?" → confirm
4. Stay within Bluetooth range of the vehicle — the key is accepted within 30 seconds
5. Verify under **Settings → Vehicle connection → Virtual Key status**

## ⚡ Charging locations & costs {#charging-locations}

Charging locations are detected automatically via GPS and linked to a price per kWh.

**Automatic GPS detection** — If a charging location is configured with GPS coordinates and a radius (default 200 m), the matching location is detected automatically when charging starts and the stored price/kWh is applied.

**Create a charging location** — Under **Charging → Locations**: enter name, type (Home/Office/Public), price/kWh, GPS coordinates and detection radius.

**Adjust costs manually** — In the charging list: click a session → edit costs. Costs can also be set to 0 (e.g. free charging).

**✕ Mark a charge as free** — In the **charging history**, every session has a small *"✕ free"* button. Charges marked this way appear greyed-out with a *"free"* badge and are **automatically excluded from the home-charging billing** — both from monthly summaries and individual analyses.

Typical use case: charging at the workplace, paid by the employer, that should not be part of your private bill. The *"↩ paid"* button reverses the marking at any time.

## 🔐 Security {#security}

- 🔑 **Passkey / WebAuthn** — Passwordless login with fingerprint, Face ID or hardware key
- 📱 **QR code login for the car** — One-time token (60 s) created in settings, scannable with the Tesla browser or a second device — no password typing required in the car
- 📱 **TOTP MFA** — Two-factor authentication with an authenticator app
- 🛡️ **Account lockout** — Account is locked for 15 min after 5 failed attempts
- 🍪 **Refresh token** — httpOnly cookie, valid for 7 days, automatic rotation
- 📋 **Audit log** — All logins, changes and security events are logged
- 🔒 **HTTPS + HSTS** — TLS 1.2/1.3, HSTS, OCSP stapling, secure headers

**Recommended security settings:**

- Activate MFA (TOTP) after the first login
- Set up a passkey for passwordless login
- Create regular backups (export)
- Strong password: at least 16 characters or a 4-word passphrase

**Forced MFA for new users.** New accounts are created with the `MFA-required` flag by default — on first login the app redirects the user to **`/mfa/setup`** and only releases them once TOTP is configured. Administrators can flip the flag in the user record (**Admin → Users**). Admin accounts are not forced to enable MFA but it is strongly recommended.

## 🏢 Multi-tenancy {#multitenancy}

Tesla Carview supports multiple fully isolated tenants on a single instance. Each tenant has its own database — one tenant can never see another tenant's data.

**Create tenants (invitation link)** — New tenants can only register via an **invitation link**. An administrator generates the link under **Admin → Users → Create invitation link** and can attach an optional **note** (e.g. "for John Doe, ACME Corp.") so the invite stays identifiable later. The link is valid for 7 days and can be used only once. Without a valid link, `/register` is locked. Existing invites can be **re-issued** (same note, fresh token), **revoked** (stays visible but no longer usable) or **deleted** outright.

**Multiple vehicles per tenant** — All vehicles of a Tesla account are imported automatically when syncing. Under **Settings → Tesla connection → 🔄 Sync vehicles** you can trigger the sync at any time — handy when a new vehicle has been added to the account. Switch between vehicles in the top-right of the navigation bar.

**Login with a tenant slug** — With multiple tenants, a tenant field appears at login. With a single tenant it is detected automatically.

**User management** — Administrators can create additional users within their tenant and assign vehicles under **Admin → Users**. Three permission flags can be tuned per user:

- **Edit vehicles** — Allows the user to change the vehicle base data (name, license plate, color, electricity rate, Monta config). Default for new users: off.
- **Add vehicles** — Allows the user to sync new vehicles from the Tesla account. Default: off.
- **MFA required** — Forces TOTP setup on first login (see Security above). Default for new users: on.

Administrators implicitly hold all three rights — the checkboxes are hidden for admin accounts. The header of the user-management page also shows an orange **task card** whenever an active non-admin user has no assigned vehicle, with one-click shortcuts to assign a vehicle or grant the "Add vehicle" right.

**Tenant pseudonym (privacy layer)** — The public login page does **not** display your real tenant name; instead it shows a random `adjective-noun` pseudonym such as `brave-eagle` or `quiet-otter`. That way no outsider can tell which person or company is using this self-hosted instance.

- The pseudonym is **assigned automatically** when the tenant is created.
- Review it under **Settings → 🔐 Tenant pseudonym**.
- The **"Regenerate"** button assigns a new one; the previous pseudonym moves into history and won't be picked again by chance.
- **Memorise it.** With multiple tenants the pseudonym is your only login identifier — keep it next to the password in your password manager. Losing it without a backup means starting from a blank tenant environment.
- The **internal slug** and the real name remain in the database and stay visible to admins — only the login page is anonymised.

## 💾 Backup {#backup}

**Manual export** — Under **Export**: CSV or JSON for trips and charging sessions, plus a full backup as ZIP.

**Automatic backup (server)** — The SQLite databases live in the bind-mount directory `./data` (relative to the Compose file, normally `/opt/tesla-carview/data`). For automatic server-side backups:

```bash
# Daily backup at 3 AM (crontab -e):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /backup/
```

The **built-in full backup** (Admin → Data management → "Backup erstellen") exports all 26 tables as JSON — passkey credentials included. After a restore to the same server, registered passkeys work immediately.

> ⚠️ **Important before deletion**
>
> Always create an export first before deleting data. Deleted data cannot be recovered.

## ⚡ Setting up the Tesla Developer API {#tesla-api}

Tesla Carview talks to the official **Tesla Fleet API**. You need a free Tesla Developer Account and a registered app for that.

### Step 1 – Create a Developer Account

1. Go to `developer.tesla.com` and sign in with your Tesla account.
2. Accept the Developer Terms of Service.
3. Click **Create Application**.

### Step 2 – Configure the app

1. **Application Name:** any name, e.g. *Tesla Carview*
2. **Description:** short description (required)
3. **Allowed Origin:** your public app URL, e.g.

   ```
   https://carview.example.com
   ```

4. **Redirect URI:** the app's callback URL:

   ```
   https://carview.example.com/api/auth/callback
   ```

5. **Scopes (required):** `vehicle_device_data`, `vehicle_cmds`, `vehicle_charging_cmds`, `vehicle_location`, `openid`, `offline_access`
6. ⚠ `vehicle_location` is mandatory for GPS tracking (Fleet Telemetry)

### Step 3 – Note your credentials

After creation you'll receive:

- **Client ID** — a UUID-style string
- **Client Secret** — shown only once, copy and store securely immediately

```env
TESLA_CLIENT_ID=abc123def456...
TESLA_CLIENT_SECRET=tsl_secret_...
```

Enter these values in the `.env` file or provide them in the interactive setup wizard.

### Step 4 – Request Fleet API access (for commands)

For vehicle commands (climate, doors, charging) to work, your app must be registered as a *partner* with Tesla. This is done once via:

```
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts
```

The setup script performs this step automatically if `FRONTEND_URL` is set. Otherwise do it manually via Postman or curl. Activation takes 1–3 business days.

### Step 5 – Connect inside Tesla Carview

1. After login: **Settings → Tesla connection → Reconnect Tesla**
2. You'll be redirected to Tesla and have to sign in and grant access there.
3. After redirect: **Settings → 🔄 Sync vehicles**
4. All vehicles of the Tesla account appear in the app.

### Step 6 – Activate Fleet Telemetry (GPS tracking)

For newer vehicles (e.g. Model Y from 2024, XP7 VIN), GPS data only comes via **Fleet Telemetry** — not via the REST API. Two one-off steps are needed:

1. **Register the app with Tesla** — Settings → Fleet Telemetry → click *"🔑 Register app with Tesla"*. Required once.
2. **Request Fleet Telemetry access** — If the next step fails with "HTTP 404", Tesla has not yet whitelisted the endpoint. In that case contact Tesla Developer Support (see below).
3. **Activate telemetry** — Settings → Fleet Telemetry → click *"📡 Activate telemetry"*. Configures the vehicle to stream GPS, speed and battery data.

**Requesting Fleet Telemetry access from Tesla Support**

If step 2 fails with 404, send the following request to the Tesla Developer Support form (`developer.tesla.com/dashboard → Support Inquiry`):

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

⚠ Replace Client ID and VIN with your own values. Tesla typically replies within a few days.

### Understanding API costs

Tesla bills every `/vehicle_data` call (≈ €0.005/call). Without Fleet Telemetry the app polls in the background:

| State | Interval | Calls/day |
|-------|----------|-----------|
| Actively driving | 30 s | up to 2,880 |
| Online, stationary | 10 min | up to 144 |
| Offline / sleeping | 45 min | up to 32 |
| With Fleet Telemetry | 1 h heartbeat | 24 |

**Daily cap:** By default max. 30 calls/vehicle/day (configurable via `TESLA_DAILY_CAP`), then paused until midnight. **Monthly cap:** By default max. 400 calls/vehicle/month (configurable via `TESLA_MONTHLY_CAP`). Both caps are DB-persistent and survive container restarts.

**Reducing costs:**
- Set up Fleet Telemetry → drops to ~24 calls/day (~€3.60/month)
- In Settings → Tesla connection: set a monthly limit and enable hard stop

## 🔌 Monta integration (Home charging & Billing) {#monta}

Tesla Carview can pull charging data directly from your **Monta wallbox**. The integration is available for **all vehicles**:

- **Private vehicles**: Monta charging sessions are displayed as charge information (🏠 badge in charging history, home-wallbox detection).
- **Company cars**: In addition, full cost billing is available — monthly overview, PDF reimbursement sheet, and billing template for your employer.

> ℹ️ Billing features (PDF, reimbursement template) are reserved for vehicles in the **Company car** category. Monta charging data is available for all vehicles.

### Step 1 – Create a Monta API key

1. Sign in to **Monta** (app or web: `portal.monta.com`).
2. Go to **Settings → API**.
3. Click **Create API Key** and copy the key (it starts with `monta_`).

The key is shown only once — enter it in Tesla Carview right away.

### Step 2 – Find the Charge-Point ID

1. In the Monta portal: select **Charge points → My devices**.
2. The **Charge-Point ID** is shown in the detail view (format: `cp_12345`).
3. Alternatively: API call `GET /api/v1/charge-points` returns all charge points with IDs.

### Step 3 – Enter in Tesla Carview

1. Go to **Settings → Vehicle profile**.
2. Enter **Wallbox electricity price (€/kWh)** — e.g. `0.34` (used as billing basis for company cars).
3. Add the **Monta Charge-Point ID** and **Monta API key**.
4. Click **Save**.

### Home wallbox detection

When a **Monta Charge-Point ID** is configured on the vehicle, every session returned by the sync is by definition a home-wallbox session. The app marks the matched local sessions automatically as **home charging** and shows a 🏠 badge in the charging list and a 🏠 marker in the billing view. The flag is also used as a strong home/away signal in the monthly statement — independent of the GPS-based location match, so a session is still classified correctly when the vehicle does not deliver a GPS position during charging.

### Using the billing

- Go to **Billing** in the navigation.
- Pick the desired month — all home charging sessions are listed.
- Charges that were free (e.g. at the employer) can be marked in the charging history with **✕ free** — they will then be excluded from the bill.
- With **Export PDF** you get a print-ready statement.

## 📝 Service log {#logbook}

Use the **service log** to document everything around vehicle operation: maintenance, repairs, tire changes, inspections, accidents and free-form notes. Each entry automatically gets:

- **Date & time** — pre-set to "now" when creating; backdated and forward-dated entries are possible.
- **Author** — the logged-in user is recorded as the author and shown next to every entry as **👤 username**. Entries from before this feature appear as "👤 unknown".
- **Category & optional fields** — odometer reading at the time, cost, free-form description.

This makes it possible to trace later who recorded which note or maintenance — important in tenants with multiple active users.

## 📍 Manual location entry (no GPS) {#manual-location}

If your Tesla doesn't deliver GPS (typical for XP7-VIN cars without active Fleet Telemetry, or during connection drops), you can keep the charging location and trip addresses by hand:

- **Charging location** — click the location name in the charging list to open the inline editor. Three paths: pick a defined charging location (rate / position are inherited), enter a free-form name, or type lat/lon coordinates (auto-matches against defined locations within the configured radius, default 200 m).
- **Trip addresses** — under `Trip detail → ✎ Edit`: start and end address as free text, plus optional lat/lon for the map.

Every editable field carries a mouse-over hint explaining what it does, when you need it and what happens on save.

## 🎮 Extended vehicle control {#control-extended}

The **Control** view is now close to feature parity with the Tesla mobile app:

| Area | Features |
|---|---|
| Climate | On/off, target temperature, precondition max-defrost, **climate keeper modes** (off / keep / 🐶 dog / ⛺ camp), steering-wheel heater |
| Seats | 5 seats (driver, passenger, rear L/M/R) × 4 heat levels |
| Body | Doors, sentry mode, frunk + tailgate actuator, vent / close all windows, lights & horn |
| Charging | Start/stop, charge-limit slider, **charging-amps slider (5–48 A)**, charge-port door open/close |
| Boombox | 9 pre-installed Tesla sounds via the external speakers (only on cars with Boombox hardware; vehicle must be stationary) |
| Departure schedule | Daily wake-and-condition time, optional weekdays only — Tesla starts preconditioning ~20–30 min before; the car must be plugged in |
| Off-peak charging | Fixed charge-start time for dynamic tariffs (Tibber, aWattar, night-rate plans). Unlike the departure schedule the car does **not** count backwards — the time is the start, not the ready-by deadline. Charging continues until the charge limit is reached. |
| Software update | Status (available / downloading / installing / scheduled), "Install now" schedules with a 1-min offset, "Cancel" clears a scheduled install |

Notes:
- Commands require an active **Virtual Key** and a running `tesla-http-proxy` (see Quickstart).
- When the car is asleep commands are rejected — press "☀️ Wake" first (~30 s).
- Climate keeper only runs if climate was on when the driver leaves the car.

## 📜 Managing legal content {#legal-admin}

Under **Admin → Legal content** the administrator maintains the imprint, privacy policy and terms of service. Three points are important here:

- **Maintain the default language, others follow** — Sync mode is on by default: you edit the German variant and the other five locales mirror it byte-identically. The frontend then shows a blue notice ("currently maintained in German only"). Sync mode can be turned off per edit to maintain a single locale individually.
- **Bumping the version updates the date automatically** — When you tick "Bump version" on save, the backend first writes today's date into the "Stand:" / "Last updated:" / "Dernière mise à jour" line of the body and only then increments the version. That way every major version carries the correct date without you having to maintain the line by hand. Plain body corrections without a bump leave the date alone.
- **Acceptance tracking** — Every bump forces all active users to accept privacy and terms again — the acceptance modal blocks login until they do. Acceptances are stored in the tenant DB per user + version + IP + timestamp in a GDPR-compliant manner.

## 🔧 Service intervals {#service-intervals}

Under **Service log** you'll find the "🔧 Service intervals" card right above the entry list. There you define recurring service tasks per vehicle (MOT/TÜV, inspection, brake fluid, seasonal tyre change, cabin filter, wiper blades, A/C service). Each entry can have a **time interval** (months), a **km interval**, or both. "Seed defaults" pre-fills a Tesla-typical list. The intervals sit next to the actual log entries (maintenance, tyres, inspection) on purpose — they belong together.

The app derives "due in X days / Y km" and surfaces overdue and soon-due items at the top of the dashboard. A **daily push reminder** (Web-Push) fires when an interval has < 30 days or < 1,000 km left. Anti-spam: each push marks the entry as notified; another reminder only fires after a "Done" stamp or a 30-day snooze. "Done" automatically sets today's date and the current odometer.

## 📋 Audit log {#audit-log}

Under **Admin → Audit log** administrators can browse every security-relevant event: logins (success + failed), account lockouts, MFA setup, permission changes, Tesla commands, privacy acceptances, user creation. Filterable by action, user-id and date range. Actions are colour-coded (red for failures, blue for auth, purple for admin ops). The details block expands the JSON payload. **CSV export** ships the filtered set Excel-ready (semicolon, BOM) — suitable for GDPR-subject access requests or forensic review. Data is fully tenant-isolated.

## 📄 PDF reimbursement statement {#pdf-billing}

The **"📄 PDF erzeugen"** button in **Billing** produces a signable A4 sheet: header with company, vehicle and period; sessions table including the 🏠 marker for Monta-detected home charging; totals (sessions / kWh / amount); signature lines at the bottom. Generation runs entirely in the browser via `jsPDF` — charging data never leaves your machine. The output is ready to hand to the employer.

## 💸 Dynamic electricity price {#dynamic-tariff}

If you're on a dynamic electricity tariff (Tibber, aWattar HOURLY, EPEX spot), configure a provider under **Settings → Electricity-price API**:

| Provider | API token | Price basis |
|---|---|---|
| **aWattar** (DE/AT) | not required — public | EPEX spot price, optional + surcharge in ct/kWh |
| **Tibber** (DE/SE/NO/NL/…) | token from developer.tibber.com | Personal end-customer price incl. taxes |

The dashboard then shows a **tariff widget** with current price, a 24h sparkline and the recommendation "cheapest 4h window". Clicking **"🚗 Schedule charging at cheapest window"** writes the start of that window directly into `set_scheduled_charging` on the active vehicle — the car waits until then and charges to the configured limit. Prices are cached for 30 minutes. With no provider configured the widget stays hidden and no outbound request is made.

## 📒 Logbook for the tax office (BMF-compliant) {#fahrtenbuch-bmf}

The German logbook view is designed so the generated PDF is **accepted by German tax offices as an electronic Fahrtenbuch** under the BMF rules. The same flow is useful in any country where you need to separate private/business mileage for tax purposes.

**Step-by-step:**

1. **Classify each trip** — one click on the type badge cycles private → business → commute.
2. **For business trips fill both fields** (BMF mandatory):
   - **Geschäftspartner** — who did you visit? (e.g. "Müller GmbH, Stuttgart")
   - **Purpose** — business reason (e.g. "contract negotiation project X")
3. **Pick the month** in the filter at the top.
4. **Click "📄 Finanzamt-PDF"** — produces an A4 landscape document with consecutive numbering, odometer at start and end of every trip, distances, origin → destination, partner and purpose, plus per-page numbering and "created at" stamp.

**Manipulation protection** — after export the included trips are automatically locked against changes (BMF requires that subsequent manipulation is either prevented or documented). Locked trips show a 🔒 icon; classification, partner and addresses become read-only. Corrections made before the export are recorded in a **change history** per trip.

**Manual entry** — if a trip is missing (Tesla didn't deliver GPS, connection dropped, …) use **"+ Manuell"** to enter it from scratch. Required: start and end time. Recommended: start/end odometer or distance. Manual entries carry a ✍ badge.

**Merge consecutive trips** — when telemetry split a single drive into two (brief stop at a traffic light, GPS gap), click **"Mit nächster zusammenführen"** on the first trip. End values come from the later trip, distance is summed, GPS points are merged.

## 🗓️ Activity heatmap {#trips-heatmap}

Above the monthly overview in the Logbook view you'll find a **calendar-style heatmap of all trips**:

- **Top filter**: pick the granularity — `Year`, `Month`, `Week` or `All`. For `Year/Month/Week` a second selector picks the concrete period.
- **Cell brightness** corresponds to the kilometres driven that day; dark cell = no trip, bright green = a lot.
- **Hover** over a cell to see date + trip count + total km in a tooltip.
- **Click** on a non-empty cell to jump to the trip list filtered by that date — quickly answers "what did I do that day?".
- The footer shows the colour-scale legend plus the grand total of the active filter.

Data source: the same trips the BMF-compliant logbook uses — the heatmap is a pure visualisation and never writes anything.

## 📱 Use on smartphone and inside the Tesla (PWA install) {#mobile-tesla-install}

Tesla Carview is a **PWA** (Progressive Web App) — you can install it like a native app without the Apple/Google store. Works on iPhone, iPad, Android, in the Tesla in-car browser and on any Chromium-based desktop.

**Smartphone Android / Tesla / Chrome / Edge:**
1. Open the app in the browser, log in.
2. A banner "Carview als App installieren" appears at the bottom → tap **Installieren**.
3. The icon lands on the home screen. Tap it to open Carview full-screen, without browser chrome.

**iPhone / iPad (Safari):**
1. Open the app in Safari, log in.
2. **Share** → **"Add to Home Screen"** → Add.
3. Icon appears on the home screen like a native app.

**On the Tesla display:**
- In the car: open the browser, enter your Carview URL.
- The layout adapts to the Tesla screen size. In narrow portrait views the logbook automatically switches to a card layout with large tap targets.
- Tip: the **"◫ Karten" toggle** at the top of the logbook forces the compact view on bigger displays too.

**Recommended:** bookmark Carview on the Tesla display — Tesla shows saved bookmarks in the browser quick access. For jotting down a trip purpose during a short stop that's much faster than typing the URL again.

### 🚗 Open the logbook directly in the Tesla browser {#tesla-direct}

The **"🚗 Open in Tesla"** button at the top of the Logbook view makes accessing the logbook from the Tesla browser effortless:

1. In Carview on your phone or desktop, open **Analytics → Logbook**.
2. Click **"🚗 Open in Tesla"**.
3. A modal appears with a **QR code** and a **direct URL** (e.g. `https://yourapp.example.com/pair/abc123…`).
4. In the Tesla, open the browser and enter the URL — or scan the QR with a secondary camera if available.
5. The Tesla browser opens a Passkey-authentication page. Tap **"Confirm with Passkey"** and authenticate using the biometric or security method registered on that device.
6. After successful authentication, the Tesla browser is logged in and navigates **directly to the Logbook** — no further steps needed.

The pair session is valid for **5 minutes**. The refresh-token cookie set during this flow keeps the Tesla browser logged in for **7 days** (auto-refreshes on each visit). The logbook URL is bookmarkable in Tesla's browser quick access — after initial setup, one tap is all it takes.

**Works for any vehicle** — the logbook and manual trip entry work without a Tesla API connection. Non-Tesla drivers can use manual entry ("+ Manuell") to log every trip and still export a BMF-compliant PDF.

### 📲 iPhone Navigation: Tab Bar

On iPhone and other smartphones, Tesla Carview shows a **native iOS-style tab bar** at the bottom:

- **4 quick tabs** — Dashboard, Trips, Charging, Control always one tap away
- **"More" button** → opens a bottom sheet with all other sections (Logbook, Battery, Grok, Admin …)
- **Dynamic Island / Home Indicator** are properly respected
- The active tab is marked with a small indicator pill

In **Nevs-Edition** design, the tab bar switches to petrol color.

## 🗺️ Route Planner {#route-planner}

The Route Planner calculates driving routes and shows fast-charging stations along the way.

**Calculate a route** — Enter start and destination. Use "+ Add stop" to insert as many waypoints as you like; drag to reorder them.

**Avoidance options** — Three toggle chips next to the destination field:
- **Motorways** — route avoids motorways and uses A/B roads instead
- **Toll roads** — toll sections are bypassed
- **Ferries** — no ferry crossings in the route

The selected options are saved in the browser and apply to all subsequent calculations until changed. Routing uses the Valhalla engine (openstreetmap.de); if Valhalla is temporarily unavailable the app falls back to OSRM and shows a toast.

**Fast-charging stations** — The map shows Superchargers and CCS fast-chargers along the route. Requires a free OpenChargeMap API key set in **Admin → System → External API keys**. If the key is missing a toast appears with a direct link to settings. The search correctly uses the selected radius (5/10/25/50 km), displays station names and addresses, supports DC-only filtering, and shows connector types, number of charge points and Tesla compatibility.

**Live traffic** — When a HERE Maps API key is configured (also under Admin → System), current traffic flow is factored into the travel-time estimate.

**Charge planning** — With SoC planning enabled (enter current battery level) the planner calculates smart charging stops with time estimates and verifies whether range is sufficient for each leg.

## 🔌 Charging station finder {#charger-finder}

Under **Planning → Charging stations** you can search for fast-charging stations near any location.

**Prerequisite** — A free [OpenChargeMap API key](https://openchargemap.org/site/develop/api) must be saved in **Admin → System → External API keys**. If the key is missing, a banner appears with a direct link to the configuration page.

**Start a search:**
1. Type an address or place → **Search** (or press Enter)
2. Alternatively: **📍 My location** — uses browser geolocation
3. Adjust radius (5/10/25/50 km) and the DC-only filter as needed

**Results** show name, address, operator, maximum power (kW), number of connectors, and connector types. "Open in Maps" launches Google Maps navigation to the station.

> **Tip:** In the Route Planner, fast-charging stations are shown directly on the map along the route — without a separate search step.

## 💬 Telegram bot {#telegram}

Tesla Carview ships with a fully integrated Telegram bot — vehicle status, commands and push notifications straight on your phone.

**Setup:**

1. **Admin**: store the bot token in the tenant settings under *Telegram* (`telegram.bot_token`)
2. **User**: in Carview under *Settings → Notifications → Link Telegram* generate a 6-digit code
3. **In Telegram**: send `/start <code>` to the bot — done

**Commands (all visible in the `/` suggestion list and via the menu button):**

| Command | What |
|---|---|
| `/status` | Vehicle status + 9 inline buttons (lock, unlock with confirm, climate, sentry, charge, refresh) |
| `/battery` | Battery level + last charging session |
| `/range` | Remaining range (rated + ideal) |
| `/location` | Current location + Google Maps link |
| `/today` | Today's stats: trips, km, kWh, cost (€) |
| `/trips` | Last 5 trips |
| `/classify` | Label the latest trip as private / business / commute (company-car log) |
| `/service` | Next due maintenance |
| `/firmware` | Current software version |
| `/clean` | Clean up bot messages (`/clean all` for aggressive scan) |
| `/help` | Command list |
| `/unlink` | Remove the Carview link |

**Inline buttons under `/status`:**

Instead of typing commands, one tap is enough: 🔒 Lock / 🔓 Unlock (with a confirmation step), ❄️ Climate on/off, 🛡 Sentry on/off, ⚡ Charge start/stop, ⟳ Refresh. Every action is recorded in the audit log as `telegram_command` with `vehicle_id`, `command`, `body` and `result/error`.

**Proactive push (in parallel with Web Push):**

- ⚡ Charging complete (with kWh and cost)
- 🚨 Sentry alert (Sentry mode detects motion)
- 🔧 Maintenance due (daily scheduler)
- 💾 New firmware version installed

Users without a linked Telegram account continue to see only Web Push. Both channels run side by side.

**Security:**

`door_unlock` is the only safety-critical action and requires a second confirmation in the chat. All other actions (lock, climate, sentry, charge) are executed immediately. If someone gains access to the Telegram account, the worst they can do is execute vehicle actions the linked Carview user could perform anyway — the audit log makes that fully traceable.

Mockups + full overview: [www.teslaview.krische.com/#telegram](https://www.teslaview.krische.com/#telegram).

## ⚡ Automations {#automations}

Under **Planning → Automations** you can set up push alerts and automated actions — no coding required.

**Examples:**
- Charge alert when battery level drops below 20 %
- Notification when charging is complete
- Geofence action when the vehicle leaves or enters the home area

Automations run server-side and send browser push notifications (requires push permission to be granted in your browser).

## 🟢 System status (admin) {#system-health}

Under **System** admins see a coloured traffic-light card at the top with eight checks:

- **Tesla OAuth token** — connected? when does it expire?
- **Virtual Key** — created? (required for signed commands)
- **Fleet Telemetry** — when did the last data point arrive?
- **Tesla poller** — when did the app last poll vehicle data?
- **Tenant DB** — database size
- **Nightly maintenance** — timestamp of the last automatic maintenance run
- **OpenChargeMap** — live probe of the OCM API endpoint (dimmed/info when no key is configured)
- **HERE Maps** — live probe of the HERE Routing API (dimmed/info when no key is configured)

The card is green (all good), yellow (attention, e.g. token expiring soon) or red (action required, e.g. token expired). Optional services (OCM, HERE) are only counted as errors when a key is configured but the endpoint does not respond.

**Monitoring & self-healing** — Below the health card sits the Monitoring card with two settings:
- **Self-healing on/off** — A cron job checks every 15 minutes whether all containers are running and `/api/health` responds. Services that have gone down are restarted automatically.
- **Alert email** — After an automatic restart, a notification email is sent to the configured address with a timestamp and the number of restarted services.

The last 50 entries from the heal log and security-check log are shown directly in this card and can be refreshed at any time with the "Refresh log" button.

## 💬 Grok Chat {#grok}

**Grok Chat** brings xAI-powered conversation directly into Tesla Carview. Ask questions in natural language about your trips, charging data and vehicle statistics.

**Context**: When the vehicle-data toggle (speedometer icon) is active, the chat sends your last trip, last charge and odometer as context. Disable it for general questions without vehicle context.

**New chat**: Click **+ New Chat** in the sidebar. Type your question and press Enter or Send. Text appears streamed — the cursor shows Grok is still typing.

**Tesla browser**: On small screens (< 768 px) the sidebar collapses to the top. Voice input uses the Web Speech API (Tesla browser V12+).

**Daily budget**: Default **100 cents/day**. Current usage is shown at the top of the sidebar. When exceeded, chat is locked until midnight.

**Privacy**: Requests are routed through the backend — never directly from your browser to xAI. No raw data (full VIN, exact addresses) is transmitted.

## 🌍 CO₂ Comparison {#co2}

The **CO₂ comparison** in the Energy Report shows how eco-friendly your driving is:

- **Tesla CO₂** — Calculated from your consumption against the German grid mix (0.38 kg CO₂/kWh). The real value is lower if you charge with solar or green energy.
- **Diesel equivalent** — How much CO₂ a comparable car with 7 l/100 km (2.65 kg CO₂/l) would have produced.
- **Tonnes saved** — The difference between Tesla and diesel. Shows how much CO₂ you have actually saved.

Values are calculated for the selected period (4/8/12 weeks) and shown per-week in the trend chart as a green bar.

## 🌡️ Weather Consumption {#weather-consumption}

The **weather consumption correlation** shows how outside temperature affects your consumption. The bar chart in the Energy Report groups all trips into 6 temperature buckets:

| Range | Typical behaviour |
|---|---|
| < −10 °C | Very high consumption (heating, cold battery) |
| −10 to 0 °C | High consumption |
| 0 to 10 °C | Elevated consumption |
| 10 to 20 °C | Optimal range |
| 20 to 30 °C | Slightly elevated (AC) |
| > 30 °C | Elevated consumption (AC) |

Buckets with fewer than 2 trips are not shown. Bar colour transitions from green (efficient) through yellow to red (inefficient).

## ❄️ Climate Statistics {#climate-stats}

The **Climate Statistics** page (`/climate`) shows daily usage of your vehicle's climate system:

- **Air conditioning** — Hours per period (extrapolated from the polling interval)
- **Seat heating driver/passenger** — Number of days seat heaters were active
- **Preconditioning count** — How often the app or a schedule switched on climate
- **Coldest/hottest day** — Outside resp. interior temperature extremes

Data is collected **automatically at every vehicle sync**. Select the time range at the top (30 / 90 / 365 days). In the daily chart 🪑 = seat heating active, 🔄 = preconditioning.

## 📦 Firmware Update Tracker {#firmware}

The **Firmware Tracker** in Admin → System shows all software versions ever detected on your vehicle:

- **Current version** — highlighted at the top
- **History** — detection date, previous version, days installed
- **Total updates** — how many times the vehicle received a new software version

Detection is automatic: every time the backend sync detects a new `car_version`, it is stored in `firmware_versions`. Only one row per version is stored (no duplicates).

## 🌍 Community Benchmark {#community-benchmark}

The **Community Benchmark** (in the Energy Report) enables anonymous consumption comparison with other Tesla drivers of the same model.

**Privacy principles:**
- Aggregated values only (kWh/100 km) — no raw data, no GPS coordinates
- Your instance is stored as a SHA-256 hash, not as a name or email
- Minimum **3 contributors** required before statistics are shown (k-anonymity)
- Revocable at any time: switch off the toggle → data is deleted immediately

**Participating:**
1. Enable the "Participate" toggle
2. Click "Contribute data" — your current average consumption is submitted
3. Once ≥ 3 contributors exist for your model, you see average, P25, P75 and your position

## 🎨 Design & Themes {#design-themes}

Tesla Carview offers **5 design styles** and **6 accent colors** — all stored locally, no server reload needed.

### Design Styles

| Design | Character |
|---|---|
| ✨ **Premium Glass** | Soft, elegant, glassmorphism with backdrop blur |
| ⚡ **Cyberpunk-Tesla** | Neon glow, sharp lines, monospace-heavy |
| ◻ **Minimal Swiss** | Lots of space, reduced, numbers in focus |
| ▰ **Sport / Performance** | Angular, bold, tachometer aesthetic |
| ◈ **Nevs-Edition** | Tech-editorial, petrol accent, Bricolage Grotesque typography |

**Nevs-Edition** is the only style with its own typography suite: *Bricolage Grotesque* for headlines, *Manrope* as body font and *JetBrains Mono* for labels. It also includes a slim **status bar** above the NavBar showing live vehicle data (battery level, gear, odometer, last sync signal).

### Accent Colors

6 colors: Tesla Red, Electric Blue, Energy Green, Purple, Sunset, Ice Blue — freely combinable with any design style.

Switch in: **Settings → Design & Colors**.

## 🔧 Troubleshooting {#troubleshooting}

**The vehicle does not return GPS data**
Newer Tesla models (XP7 VIN, e.g. Model Y Juniper) do not deliver `drive_state` via the REST API. GPS tracking happens via Fleet Telemetry. Make sure tesla-http-proxy is running and the Virtual Key is registered.

**Login does not work after the update**
After an update to v2.0 (multi-tenant) a tenant slug is required at login. The slug for the migrated database is "default". Enter it in the login field or click "Choose tenant".

**Tesla connection fails (401)**
The Tesla OAuth token has expired. Go to Settings → Tesla connection and reconnect your Tesla account. Make sure `TESLA_CLIENT_ID` and `TESLA_CLIENT_SECRET` are correct in `.env`.

**Vehicle commands fail**
Check: 1) tesla-http-proxy is running (`systemctl status tesla-http-proxy`) 2) The Virtual Key is registered on the vehicle (Settings → Vehicle connection) 3) The vehicle is online (not asleep).

**No telemetry data / GPS missing**
Fleet Telemetry needs two steps: (1) register the app with Tesla (Settings → "🔑 Register app"), (2) activate telemetry (Settings → "📡 Activate telemetry"). If step 2 fails with HTTP 404, request `fleet_telemetry_config` access from Tesla Developer Support — there is a template in the handbook under "Step 6". Also make sure `vehicle_location` is enabled in the app scopes on `developer.tesla.com`.

**Backend does not start**
Check the logs: `docker logs tesla-carview-backend`. Common causes: missing `.env` variables (`JWT_SECRET`, `TESLA_CLIENT_ID`), database migration errors.

## ❤️ If the app is worth something to you {#donations}

Tesla Carview is free and ad-free **for private, self-hosted use** (license: PolyForm Noncommercial 1.0.0 — commercial resale or SaaS hosting for third parties is not permitted). If you would like to give something back, these organisations would appreciate your support.

- **[Aktion Deutschland Hilft](https://www.aktion-deutschland-hilft.de/de/spenden/)** — Alliance of relief organisations for fast, effective disaster relief worldwide.
- **[Lebenshilfe Rems-Murr](https://www.lebenshilfe-rems-murr.de/)** — Support, assistance and inclusion for people with disabilities in the Rems-Murr district.
- **[Radio 7 Drachenkinder](https://www.radio7.de/aktionen/drachenkinder)** — Help for seriously ill children in the region — funds therapies, trips and wishes.

100 % of your donation goes directly to the organisation. We see neither the amount nor your data.

# Setup wizard — initial configuration

> 🇩🇪 [Auf Deutsch lesen](07-setup-wizard.md)

Tesla Carview provides two paths for the **initial installation** and an in-app assistant for **ongoing configuration**.

---

## In-app assistants {#settings-wizard}

As of v3.4.0 there are **two separate assistants**:

### 1. Personal settings wizard (`SettingsWizard.vue`)

Appears automatically after the first login and can be re-opened at any time via **Settings → 🧙 Start wizard**. Available to **all users**.

| # | Step | Description |
|---|------|-------------|
| 1 | **Welcome** | Overview |
| 2 | **Language** | Select app language |
| 3 | **Design** | Choose design style (Glass, Cyberpunk, Minimal, Sport, Nevs-Edition) |
| 4 | **Accent color** | Accent color for buttons and navigation |
| 5 | **Units** | km/mi, °C/°F, kWh/100km etc. |
| 6 | **Dashboard** | Card visibility and order |
| 7 | **Navigation** | Sort and hide navigation items |
| 8 | **Notifications** | Subscribe to Web Push, select event types |
| 9 | **Done** | All settings are saved |

### 2. Admin Setup Assistant (`AdminSetupWizard.vue`)

Accessible via **Admin Hub → 🛠️ Setup Assistant**. **Admins only.** Guides through all system configuration — no SSH or `.env` editing required.

| Step | Description |
|------|-------------|
| **Tesla credentials** | Set Client-ID, Client-Secret, Audience via UI (stored in DB) |
| **Tesla OAuth** | Connect Tesla account (popup → PostMessage callback → auto-refresh) |
| **Vehicles** | Sync vehicles from Tesla account |
| **Virtual Key** | Show/copy registration URL; check status |
| **Fleet Telemetry** | Configure per VIN; status display |
| **Web Push (VAPID)** | Generate VAPID keys directly in the browser or enter manually |
| **Telegram Bot** | Configure bot token (requires server restart) |
| **Electricity price** | Set home charging rate (€/kWh) per vehicle |
| **External APIs** | Configure ABRP, Grok/xAI key |
| **Monitoring** | Self-healing + alert email |
| **Summary** | Status overview; restart notice if Telegram was configured |

### Notes

- **Draft mode** (personal wizard): changes are saved only at the last step
- **Immediate save** (admin assistant): credentials are saved step-by-step into `tenant_settings` (DB)
- **Tesla OAuth**: popup window; closes automatically after sign-in
- **VAPID generation**: directly in the browser — no `docker exec` needed
- **Language switcher in header** (every wizard): each wizard renders a compact 🌐 switcher in the top-right. Picking a language applies instantly to all wizard texts; for logged-in users the choice is persisted to the profile. On login the language stored in the profile or tenant default is applied automatically.
- **Auto-init on backend boot**: VAPID keys are generated automatically per tenant whenever neither `tenant_settings` nor the `.env` provides them. Push notifications therefore work right after the first login — the corresponding wizard step shows “✓ already configured (Auto)”.
- **Wizard prefill** (`GET /api/system/wizard-prefill`): when the wizard opens it asks the backend for defaults (Fleet API audience from Geo-IP, alert email = admin email, electricity rate by country) plus a status per step. Completed steps are marked with a green banner and can be skipped directly; the welcome screen shows “X of Y steps already done”.
---

Tesla Carview offers two paths for the initial configuration.

## Web wizard (recommended)

On first start the app detects automatically that no administrator account exists yet
and redirects the browser to **/setup**.

### Steps

1. **Welcome** — system overview
2. **Create administrator account** — pick a username and a strong password
3. **Done** — redirect to the login page

The web wizard at `/setup` is reachable only while no admin exists.
Afterwards the page is locked automatically.

## Terminal wizard

```bash
bash deploy/setup-wizard.sh
```

Asks interactively:

| Parameter | Description | Example |
|---|---|---|
| Public URL | Full URL of the application | `https://tesla.example.com` |
| Tesla Client-ID | From the Tesla Developer portal | `abc123...` |
| Tesla Client-Secret | From the Tesla Developer portal | `xyz456...` |
| Database path | SQLite file | `./data/tesla-carview.db` |
| E-mail | For Let's Encrypt | `admin@example.com` |
| VAPID keys | For Web Push (optional) | leave empty = disabled |

The script writes everything to `backend/.env` and sets the file permissions to `600` (owner-readable only).

## Change the configuration later

```bash
# run the terminal wizard again (overwrites .env):
bash deploy/setup-wizard.sh

# or edit directly:
nano /opt/tesla-carview/backend/.env

# then restart the containers:
docker compose -f docker-compose.prod.yml up -d
```

## All parameters

Full list of environment variables in `backend/.env.example`:

| Variable | Required | Description |
|---|---|---|
| `PORT` | – | Backend port (default: 3000) |
| `JWT_SECRET` | ✓ | Random string ≥ 64 characters |
| `FRONTEND_URL` | ✓ | Public URL of the app |
| `TESLA_CLIENT_ID` | ✓* | Tesla Fleet API client ID |
| `TESLA_CLIENT_SECRET` | ✓* | Tesla Fleet API client secret |
| `TESLA_REDIRECT_URI` | ✓* | OAuth callback URL |
| `TESLA_AUDIENCE` | – | Tesla API region (default: NA) |
| `DB_PATH` | – | Path to the SQLite file |
| `ENABLE_POLLER` | – | Vehicle-data poller on/off |
| `ADMIN_EMAIL` | – | E-mail for Let's Encrypt |
| `VAPID_PUBLIC_KEY` | – | Web Push public key |
| `VAPID_PRIVATE_KEY` | – | Web Push private key |

*Only required when a Tesla vehicle is to be connected.

## Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

# 🔧 Configuration

> 🇩🇪 [Auf Deutsch lesen](10-configuration.md) · 👤 [User handbook](../frontend/src/handbook/handbook.en.md) · 🏠 [Docs index](.)

Every environment variable that controls Tesla Carview. Most live in `backend/.env` (see `backend/.env.example` as a template). Entries marked **(required)** must be set; everything else has a sensible default.

---

## 🔐 Required

| Variable | Description | Example |
|---|---|---|
| `JWT_SECRET` | Secret key for JSON Web Tokens. **≥ 32 chars, cryptographically random.** | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client ID from the [Tesla Developer Portal](https://developer.tesla.com) | `abc123…` |
| `TESLA_CLIENT_SECRET` | Client secret from the Tesla Developer Portal | `secret…` |
| `FRONTEND_URL` | Public HTTPS URL of the app — used for the OAuth callback and passkey registration | `https://carview.example.com` |
| `RP_NAME` | Display name in passkey dialogs | `Tesla Carview` |
| `RP_ID` | Domain for WebAuthn (without protocol, **must match** `FRONTEND_URL`) | `carview.example.com` |

> ⚠️ `JWT_SECRET` must **not change** at runtime or all sessions become invalid. Changing `RP_ID` invalidates every existing passkey — users have to re-register.

---

## ⚡ Tesla Fleet API

| Variable | Default | Description |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | OAuth redirect URI. Must be entered exactly into the Tesla Developer Portal. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Region-specific Tesla API endpoint (NA: `…na.vn.cloud.tesla.com`). |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | Address of `tesla-http-proxy` for signed vehicle commands. |

Detailed setup steps: [04-tesla-api.en.md](04-tesla-api.en.md) (developer account, app registration, scopes) and [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) (cost / quota).

---

## 🔔 Web Push (notifications)

VAPID keys are required for "charging finished" and maintenance reminder pushes. Without them push notifications won't work — everything else still does.

| Variable | Default | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Public key, generate via `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Private key (same generator) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | Contact URI for the push service (ideally your own email) |

---

## 🧪 Demo sandbox

| Variable | Default | Description |
|---|---|---|
| `DEMO_ENABLED` | `false` | When `true`: a separate demo tenant with slug `demo` is created on boot. The login page shows a "🚀 Demo starten" button. Hard limits: 1 signup per IP per 24 h, max. 10 concurrent testers, every account lives 14 days. |

Operation + security details: [11-operations.en.md → Demo mode](11-operations.en.md#demo-mode). Testers automatically see an addendum to the privacy / terms pages documenting the unconditional deletion after 14 days.

---

## ⬆️ Auto-update

| Variable | Default | Description |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | When `true`: nightly cron at ~03:30 Europe/Berlin runs `git fetch origin main` and on a new commit executes `deploy/update.sh`. Causes a brief container restart — the maintenance overlay covers that in the UI. |
| `UPDATE_REPO_DIR` | `/opt/tesla-carview` | Path to the git working tree the auto-updater operates on. |

Recommended: run `deploy/update.sh` manually a few times, get comfortable, then enable.

---

## ⚙️ Operations & performance

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | TCP port of the backend HTTP server (inside the container). |
| `DB_PATH` | `/app/data/tesla-carview.db` | Path to the legacy database — migrated as the `default` tenant on first boot, then unused. |
| `ENABLE_POLLER` | `true` | When `false`: no cyclic Tesla API polling (e.g. for dedicated read replicas). |
| `TESLA_DAILY_CAP` | `30` | Maximum `vehicle_data` calls per vehicle per day. DB-persistent — survives container restarts. |
| `TESLA_MONTHLY_CAP` | `400` | Maximum `vehicle_data` calls per vehicle per month. Polling stops automatically when limit is reached. |
| `NODE_ENV` | `production` | Standard production setup. `development` enables dev-server behaviour. |

---

## 🌐 Frontend (`frontend/.env`)

Baked into the bundle at **build time**. Changing values requires a rebuild.

| Variable | Default | Description |
|---|---|---|
| `VITE_FOOTER_EMAIL` | `''` | Contact email in the footer. Empty = block hidden. |
| `VITE_FOOTER_ABOUT_DE` | `''` | URL of the "about me" page (German variant). |
| `VITE_FOOTER_ABOUT_EN` | `''` | URL of the "about me" page (English variant). |
| `VITE_FOOTER_LINKEDIN_URL` | `''` | Operator's LinkedIn profile. |

The file is `.gitignored`. `frontend/.env.example` is the template committed in the repo.

---

## Quick-reference: minimal setup

```bash
# backend/.env (required)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://carview.example.com
RP_NAME="Tesla Carview"
RP_ID=carview.example.com

# Optional but recommended
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public | awk '{print $3}')
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:you@example.com

# Demo only when you want to invite testers
# DEMO_ENABLED=true

# Auto-update only after you've understood the update flow
# AUTO_UPDATE_ENABLED=true
```

After saving: `docker compose -f docker-compose.prod.yml up -d --build backend` — backend reads `.env` on boot.

---

## See also

- [02-deployment.en.md](02-deployment.en.md) — first deployment + nginx + Let's Encrypt
- [07-setup-wizard.en.md](07-setup-wizard.en.md) — interactive configuration assistant
- [11-operations.en.md](11-operations.en.md) — day-to-day: backup, restore, maintenance, demo

# Setup wizard — initial configuration

> 🇩🇪 [Auf Deutsch lesen](07-setup-wizard.md)

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

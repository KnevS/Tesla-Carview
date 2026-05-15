# Configuration — Environment Variables

🌐 **Language:** **EN** · [DE](DE-Configuration) · [FR](FR-Configuration) · [ES](ES-Configuration) · [TR](TR-Configuration) · [EL](EL-Home)

All Tesla Carview settings are configured via the `.env` file at `/opt/tesla-carview/backend/.env`.

After any change to `.env`, restart the backend:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Required settings (must be set for the app to work)

| Variable | Example | Description |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Secret key for signing login tokens. Generate with: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | From Tesla Developer Portal |
| `TESLA_CLIENT_SECRET` | `xyz789...` | From Tesla Developer Portal |
| `FRONTEND_URL` | `https://tesla.yourdomain.com` | The public URL of your installation |
| `DATABASE_PATH` | `/app/data` | Where databases are stored (don't change in Docker) |

---

## Optional but recommended

| Variable | Default | Description |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Set to `true` to auto-update nightly |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Force MFA setup for all new user accounts |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Require an invite code to register a new tenant |
| `POLL_INTERVAL_MS` | `60000` | How often to poll Tesla API when car is active (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Polling interval when car is sleeping (ms) |

---

## Dynamic tariff (electricity pricing)

| Variable | Description |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — enable aWATTar (DE/AT, free) |
| `TIBBER_TOKEN` | Your Tibber API token (get at [developer.tibber.com](https://developer.tibber.com)) |

---

## Demo mode

| Variable | Default | Description |
|---|---|---|
| `DEMO_ENABLED` | `false` | Enable public demo tenant with fake data |
| `DEMO_MAX_CONCURRENT` | `10` | Max simultaneous demo users |
| `DEMO_LIFETIME_DAYS` | `14` | How long demo accounts last |

---

## Advanced / Fleet Telemetry

| Variable | Description |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — enable real-time GPS via Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Port for Fleet Telemetry server (default: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Path to Virtual Key private key file |

---

## How to generate a secure JWT_SECRET

```bash
openssl rand -hex 32
# Output: something like a8f3e9b2c1d4...
# Copy this into your .env file
```

---

## Checking your current configuration

```bash
# View current .env (careful with sharing output — contains secrets):
cat /opt/tesla-carview/backend/.env

# Check which environment variables the running container sees:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Full reference

For a complete list of every environment variable with detailed descriptions, see the technical documentation:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)

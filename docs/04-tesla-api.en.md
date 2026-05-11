# Set up the Tesla Fleet API

> 🇩🇪 [Auf Deutsch lesen](04-tesla-api.md)

## Data-source strategy (Telemetry-first, polling as fallback)

Since the hybrid-poller switch (2026-05) Tesla Carview prefers
**Fleet Telemetry (push)** over polling. Both paths are active, but
the poller automatically falls back to heartbeat mode as soon as
Telemetry streams for a vehicle:

| Path | Latency | Cost | Prerequisite |
|---|---|---|---|
| **1. Fleet Telemetry (WebSocket push)** | 1–5 sec live | free | Approved virtual key + HTTPS endpoint + Tesla whitelisting per VIN |
| **2. Fleet API polling (pull)** | 30s online / 5min idle | $ budget per call | OAuth token only |
| **3. Heartbeat polling** | 1×/h | minimal | Auto-engaged when Telemetry is active for a VIN |

Implementation: `backend/src/services/poller.js`, streaming server in
`backend/src/services/fleetTelemetry.js`, per-VIN status indicator in
Settings → ⚡ Tesla connection → 📡 Fleet Telemetry.

> Fleet Telemetry requires Tesla approval per **application client ID**
> in the Developer Portal. Without approval the configuration API
> returns HTTP 404 — the fallback polling path keeps working.

## Create a Tesla Developer account

1. Create an account at https://developer.tesla.com
2. Create a new application:
   - **Name**: Tesla Carview (or anything you like)
   - **Allowed Origins**: `https://your-domain.com`
   - **Allowed Redirect URIs**: `https://your-domain.com/api/auth/callback`
3. Note the **Client ID** and **Client Secret**


---

## Configure .env

```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your-domain.com/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Regions**:
> - North America: `fleet-api.prd.na.vn.cloud.tesla.com`
> - Europe: `fleet-api.prd.eu.vn.cloud.tesla.com`
>
> Pick the region that matches the location of your vehicle.

---

## Connect a Tesla vehicle

After signing in to the app, click the **"Connect Tesla"** link
(or directly: `https://your-domain.com/api/auth/tesla/login`).

You are forwarded to the Tesla login page. After granting access, the vehicle
is detected automatically and synchronisation starts.

---

## Permissions (OAuth scopes)

| Scope | Purpose |
|---|---|
| `openid` | Tesla identity |
| `offline_access` | Refresh token (no repeated sign-in) |
| `vehicle_device_data` | Read trip data, charging state, battery |
| `vehicle_cmds` | Vehicle commands (only with Virtual Key) |
| `vehicle_charging_cmds` | Charging commands |
| `vehicle_location` | GPS position |

---

## Vehicle commands (Virtual Key)

For commands like climate, horn or doors a **Virtual Key** is required in addition.
The proxy `tesla-http-proxy` signs the commands cryptographically — Tesla only accepts
commands that are signed with the paired key.

### Setup steps

1. **Generate a key pair**:
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out tesla_priv.pem
   openssl ec -in tesla_priv.pem -pubout -out tesla_pub.pem
   ```

2. **Serve the public key** at:
   `https://your-domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. **Install `tesla-http-proxy`** and start it:
   ```bash
   # download the binary from https://github.com/teslamotors/vehicle-command
   tesla-http-proxy -port 4443 -host 0.0.0.0 \
     -tls-key server.key -cert server.crt \
     -key-file tesla_priv.pem
   ```

4. **Register the Virtual Key on the vehicle** via the app (Settings → Virtual Key).

> **Important**: the private key (`tesla_priv.pem`) and the public key
> (`.well-known/…`) must stay matched. A new private key requires another
> pairing action at the vehicle.


---

## Polling interval

The built-in poller queries the Tesla API:
- **Every 30 seconds** when the vehicle is active (driving or charging)
- **Every 5 minutes** when the vehicle is asleep (status 408)

The poller **does not wake the vehicle** — the sleep state is respected to preserve the battery.

Disable the poller (e.g. for testing): `ENABLE_POLLER=false` in the `.env`.

---

## XP7 VIN specificity

Vehicles with the VIN prefix `XP7` (e.g. Model Y Juniper) do not support the
`?endpoints=…` parameter on `/vehicle_data`.

**Workaround**: call `/vehicle_data` without the `endpoints` parameter — it
returns `charge_state`, `climate_state` and `vehicle_state`.

GPS via `drive_state` is not available for these vehicles through the REST API;
GPS instead comes from Fleet Telemetry.

# 🛠 Operations

> 🇩🇪 [Auf Deutsch lesen](11-operations.md) · 👤 [User handbook](../frontend/src/handbook/handbook.en.md) · 🏠 [Docs index](.)

Day-to-day operations for self-hosters: backup, restore, maintenance, demo mode, update. Every action is **admin-only** and audit-logged.

---

## 💾 Backup & restore

### Create a backup

**Via the web UI (recommended):**

1. Log in as admin → **Admin → Data management**
2. "💾 Full backup & restore" card → **"⬇ Backup erstellen"** button
3. A JSON file is downloaded — filename `tesla-carview-backup-<slug>-YYYY-MM-DD.json`

Contents: all 26 tables of the active tenant DB (vehicles, trips + GPS points, charging sessions, telemetry, logbook, service intervals, users, passkey credentials, audit logs, settings, Tesla OAuth tokens, Virtual Key, legal acceptances, trip change history). Deliberately excluded: `push_subscriptions` (browser-specific) and `refresh_tokens` (those live in `master.db`).

> **Passkeys**: `passkey_credentials` is included in the backup. After restoring to the **same server**, registered passkeys work immediately — the `credential_id` is stored server-side and the `user_id` is preserved by the restore. Restoring to a different server or domain requires re-registering passkeys (WebAuthn is domain-bound).

**Via CLI / cron** (for external backup strategies):

```bash
# Backs up the SQLite files directly — atomic, no service stop
docker compose -f docker-compose.prod.yml exec backend sh -c \
  "sqlite3 /app/data/master.db '.backup /app/data/backup-$(date +%F).db'"
docker cp tesla-carview-backend:/app/data/. /path/to/backup/
```

Recommended: also store the UI backup on an external disk — a single JSON file per tenant is portable and versionable.

### Restore from a backup

**Use case:** new system installed, or the old one got tangled. Bring back the previous state:

1. Run at least the setup wizard once (create admin account)
2. Log in as admin → **Admin → Data management → "⬆ Backup wiederherstellen…"**
3. Pick the JSON file + type the confirmation `WIEDERHERSTELLEN`
4. "Jetzt wiederherstellen" → server first creates a **safety backup of the current `.db`** (path returned in the success message), then empties all tables and re-fills them from the JSON, all inside **a single transaction**, rolled back on error
5. Log out + back in, done

### Security layers on restore

- `requireAdmin` middleware
- Confirmation phrase `WIEDERHERSTELLEN` must be typed exactly
- Pre-restore file-level backup (`<dbname>_pre_restore_<timestamp>.db`)
- Column intersection: when the live schema has a renamed column, that column is skipped instead of killing the whole import
- Audit log entry for every backup and every restore

---

## 🌙 Nightly maintenance

Runs daily between **03:30 and 03:40 Europe/Berlin** (DST-safe via `Intl.DateTimeFormat`). Stops on every backend restart, comes back with 2 min backoff.

### What it does

| Where | Task |
|---|---|
| `master.db` | Delete expired `refresh_tokens` |
| `master.db` | Delete `oauth_pkce` states > 24 h old |
| `master.db` | Delete soft-revoked tenant invites > 30 d old |
| `master.db` | `VACUUM` + `wal_checkpoint(TRUNCATE)` |
| each `tenant.db` | Delete `audit_logs` > 180 d old |
| each `tenant.db` | Delete used/expired `user_invites` > 30 d old |
| each `tenant.db` | `wal_checkpoint(TRUNCATE)` |
| each `tenant.db` | `VACUUM` only when DB > 50 MB |
| each `tenant.db` | Audit entry `system_maintenance` with counts |

### Trigger manually

**UI:** System → System status → "🌙 Nächtliche Wartung" → **"Jetzt ausführen"**.

**API:**
```bash
curl -X POST https://carview.example.com/api/system/maintenance-now \
  -H "Authorization: Bearer $ADMIN_JWT"
```

### Inspect last run

```bash
curl https://carview.example.com/api/system/maintenance-log \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

Shows the last up to 50 runs with counts, duration and error status.

---

## ⬆️ Auto-update (opt-in)

> ⚠️ **Off by default.** Enabling means your system pulls new commits from `main` nightly and rebuilds the container. Verify `deploy/update.sh` runs cleanly on your setup first.

### Enable

```bash
# backend/.env
AUTO_UPDATE_ENABLED=true
UPDATE_REPO_DIR=/opt/tesla-carview   # default is exactly this, only override if different
```

Then restart backend:
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### What happens at night

1. `git fetch origin main` in the configured repo path
2. Compares `git rev-parse HEAD` to `origin/main`
3. If different: `bash deploy/update.sh` (10 min timeout)
4. During the rebuild the frontend automatically shows the **maintenance overlay** (see `frontend/src/components/MaintenanceOverlay.vue`) with Tesla quips — users barely notice
5. Status (local hash, remote hash, update outcome) lands in the maintenance log

### Manual update any time

```bash
cd /opt/tesla-carview
bash deploy/update.sh
```

---

## 🧪 Demo mode

For **testers without a Tesla**. If you only run this for yourself, leave it off.

### Enable

```bash
# backend/.env
DEMO_ENABLED=true
```

Restart backend. An additional tenant with slug `demo` and DB file `data/tenants/<uuid>.db` is created on first boot.

### Hard limits (encoded in `routes/demo.js`)

| Constant | Default | ENV variable | Meaning |
|---|---|---|---|
| `MAX_ACTIVE_DEMO_USERS` | `200` | `MAX_ACTIVE_DEMO_USERS` | Concurrent testers. HTTP 503 when full. |
| `DEMO_SIGNUPS_PER_IP` | `2` / 24 h | `DEMO_SIGNUPS_PER_IP` | At most 2 signups per IP per 24h window |
| `DEMO_LIFETIME_DAYS` | `2` | `DEMO_LIFETIME_DAYS` | Account + all its data deleted after 2 d, no remnants |

All three are overridable via environment variable — for a private instance with `DEMO_ENABLED=true`, consider setting `MAX_ACTIVE_DEMO_USERS=5` and `DEMO_LIFETIME_DAYS=1`.

### What testers see

- Login page shows a blue "🧪 Tesla Carview ausprobieren — ohne Tesla" card with free slots
- One click → user `tester-<hex>` is created, logged in, fake vehicle + 3 weeks history seeded
- Banner at the top of the app: "Demo-Modus — Konto und Daten werden am DD.MM.YYYY automatisch gelöscht (X Tage übrig)"
- Privacy and terms pages automatically show a **tester addendum** (no SLA, no support, fake data, deletion after `DEMO_LIFETIME_DAYS` days)
- Every 30 min: a new fake trip per demo vehicle — so the demo feels alive

### Cleanup

- Every 6 h the demo lifecycle runs: users with `expires_at < now` are deleted in one transaction, together with every dependent table (vehicles, trips, GPS points, charging, battery, telemetry, logbook, MFA codes, audit logs, charging locations, service intervals)
- The demo tenant itself stays — only the tester data is wiped
- **Isolation**: the demo slug is **never** written to `localStorage` — a tester who closes the browser tab and reopens the production URL will not accidentally end up in the demo tenant

---

## 🛡️ Monitoring & self-healing

A cron job (`/opt/monitoring/bin/heal.sh`) runs every 15 minutes and watches the core services:

1. **Container status** — inspects `docker inspect` for `tesla-carview-backend`, `-frontend` and `-nginx`; if a container is not in `running` state it is restarted via `docker compose up -d <service>`.
2. **Health endpoint** — when all containers are running, it checks `GET /api/health`; if the response is not `{"status":"ok"}` the backend container is restarted.
3. **Email alert** — after each automatic restart a notification email is sent to the configured address (if set).
4. **Log rotation** — `/var/log/tcv-heal.log` is automatically trimmed to the last 500 lines when it exceeds 1 MB.

**Configuration** (Admin → System → Monitoring & self-healing):

| Setting | Description |
|---|---|
| Self-healing on/off | DB key `monitoring.heal_enabled`; set to `false` and the cron job exits immediately |
| Alert email | DB key `monitoring.alert_email`; empty = no alert |

**API endpoints** (admin-only):
- `GET /api/system/monitoring-config` — reads current configuration
- `PUT /api/system/monitoring-config` — saves configuration
- `GET /api/system/monitoring-log?lines=50` — returns the last N lines from the heal and security logs

**Manually inspect logs:**
```bash
tail -50 /var/log/tcv-heal.log
tail -50 /var/log/security-check.log
```

**Cron entry** (`/etc/cron.d/tesla-carview-monitoring`):
```
*/15 * * * * root /opt/monitoring/bin/heal.sh >/dev/null 2>&1
```

---

## 📊 System health at a glance

UI: **Admin → System** → admin sees a coloured traffic-light card at the top. Backend endpoint: `GET /api/system/health` (admin-only). Checks:

| Check | Green | Yellow | Red | Info (dimmed) |
|---|---|---|---|---|
| Tesla OAuth token | valid, > 7d remaining | < 7d left | expired or missing | — |
| Virtual Key | created | — | not created | — |
| Fleet Telemetry | last data point < 24 h | < 7 d | nothing or > 7 d | — |
| Tesla poller | last poll < 60 min | < 1 d | — | — |
| Tenant DB | informational — size in MB | — | — | — |
| Nightly maintenance | last run < 25 h | — | — | — |
| OpenChargeMap | live probe OK | — | probe failed (key set) | no key configured |
| HERE Maps | live probe OK | — | probe failed (key set) | no key configured |

Optional services (OCM, HERE) are only counted as errors when a key is configured but the endpoint does not respond. Without a key: `info` status, dimmed, no effect on the overall traffic-light colour.

---

## 🔍 Looking at logs

**Container logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f --tail 200 backend
```

**Audit log** (security-relevant events per tenant):
- UI: **Admin → Audit log** with filters (action, user-id, date) and CSV export
- API: `GET /api/audit` (admin-only)

**Maintenance log** (last nightly runs):
- UI: System → "🌙 Nächtliche Wartung" → details
- API: `GET /api/system/maintenance-log` (admin-only)

---

## 🚨 Emergency: database reset

When everything is on fire and only a clean restart will do:

```bash
# 1. Take a backup FIRST (see above)
# 2. Stop containers
docker compose -f docker-compose.prod.yml down

# 3. Wipe the data directory — ALL DATA GONE
# Data lives in the bind-mount ./data (not in a Docker named volume!)
rm -rf ./data/master.db ./data/tenants/

# 4. Start fresh — setup wizard appears automatically
docker compose -f docker-compose.prod.yml up -d
```

> Since v2.0 the SQLite databases live under `./data` as a bind-mount (relative to the Compose file), **not** in a Docker named volume. `docker volume rm` has no effect on this setup.

To restore a backup afterwards, complete the setup wizard with a temporary admin account, log in, and use the UI restore flow.

---

## See also

- [01-quickstart.en.md](01-quickstart.en.md) — initial setup
- [02-deployment.en.md](02-deployment.en.md) — production deployment
- [10-configuration.en.md](10-configuration.en.md) — all environment variables
- [05-security-architecture.en.md](05-security-architecture.en.md) — security model

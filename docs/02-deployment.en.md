# Deployment — Linux server & Raspberry Pi

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md)

Tesla Carview runs on **all common Linux platforms**:

| Platform | Architecture | Tested |
|---|---|---|
| Linux server (VPS, dedicated) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 | ARMv7 | ✓ |
| Local development (Mac/Windows/Linux) | all | ✓ |


---

## Prerequisites

- Debian/Ubuntu (or Raspberry Pi OS)
- Root access
- Optional: own domain with A record pointing to the server IP (for HTTPS)
- Tesla Developer account ([04-tesla-api.en.md](./04-tesla-api.en.md))

> **Using a Raspberry Pi?** Read [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) first — SD cards fail under sustained write load. Setting up a USB SSD or NVMe takes 20 minutes and saves a lot of trouble later.
>
> **No static IP?** [14-network-access.en.md](14-network-access.en.md) explains DynDNS, Cloudflare Tunnel, and VPS options step by step.
>
> **Recommended entry-level VPS:** The [netcup VPS nano G11s](https://www.netcup.com/en/server/vps-lite) (2 vCore, 2 GB RAM, 60 GB SSD, ~€3.08/month) is the cheapest tested VPS that meets all Tesla Carview requirements — including enough storage for several years of telemetry data. Discount code available on request: [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com).

---

## 📦 Automatic setup (for everyone)

```bash
# As root on the target machine:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Or manually:
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

The script auto-detects the architecture and handles:
1. Install system packages (nginx, certbot, docker, ufw, fail2ban)
2. Configure the firewall (SSH, HTTP, HTTPS)
3. fail2ban for SSH protection
4. Launch the configuration wizard
5. Let's Encrypt SSL (if an HTTPS domain is given)
6. nginx with TLS hardening
7. Start Docker containers (multi-arch)

---

## Run the configuration wizard

```bash
bash /opt/tesla-carview/deploy/setup-wizard.sh
```

The wizard asks interactively:
- Public URL (e.g. `https://tesla.example.com` or `http://192.168.1.100:8080`)
- Tesla API Client-ID and Client-Secret
- Database path
- E-mail address for SSL certificates
- Web Push VAPID keys (optional)

---

## Raspberry Pi — specifics

```bash
# prepare Raspberry Pi OS (if needed):
sudo apt-get update && sudo apt-get upgrade -y

# install Docker for ARM (done automatically by setup.sh):
curl -fsSL https://get.docker.com | sh
```

On a Raspberry Pi inside a home network, no nginx/SSL is needed — the app container is reachable directly on port 8080.
Set `FRONTEND_URL=http://192.168.1.100:8080` in the `.env`.

---

## Configure Tesla API

```bash
nano /opt/tesla-carview/backend/.env
```

Required fields:
```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your.domain.com/api/auth/callback
```

Restart the containers:
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

---

## Initial configuration (web wizard)

On first start the app automatically opens **/setup** in the browser.
That is where the first administrator account is created.

---

## Apply updates

```bash
bash /opt/tesla-carview/deploy/update.sh
```

---

## Automatic deployment

There are two paths for automatic deployment on every push to `main`:

| Method | Best for | Guide |
|---|---|---|
| **GitHub Actions + SSH** | Single app, existing server, full control | See below |
| **Dokploy** | Multiple apps, web UI desired, easier SSL | [08-dokploy.en.md](./08-dokploy.en.md) |

---

## GitHub Actions auto-deploy

Automatic deployment on every push to `main`.

### Prerequisite: create an SSH deploy key

```bash
# on the server:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""

# authorise the public key for the SSH user:
cat ~/.ssh/tesla_deploy.pub >> /home/YOUR_USER/.ssh/authorized_keys
```

> **Note**: the deploy user needs passwordless sudo for `docker` and `git`:
> ```bash
> echo 'YOUR_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/git' \
>   > /etc/sudoers.d/tesla-deploy
> ```

### Set GitHub secrets

GitHub → repository → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Description | Example |
|---|---|---|
| `DEPLOY_HOST` | Server hostname or IP | `123.456.789.0` |
| `DEPLOY_USER` | SSH user name | `deploy` |
| `DEPLOY_SSH_KEY` | Contents of `~/.ssh/tesla_deploy` (private key) | `-----BEGIN OPENSSH…` |
| `DEPLOY_APP_DIR` | Installation path on the server | `/opt/tesla-carview` |


---

## Database backup

```bash
# create a backup:
cp /opt/tesla-carview/data/master.db /opt/backups/master-$(date +%Y%m%d-%H%M).db
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/

# automatic daily at 3 a.m. (crontab -e as root):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

> **Note:** Tesla Carview uses a bind-mount (`./data:/app/data`), not a named Docker volume. All database files reside directly under `/opt/tesla-carview/data/` on the host. Alternatively, the built-in auto-backup can be configured in the app's system settings (local, path, S3, or SFTP).

---

## Post-install health check

After the initial setup (and at any time afterwards) you can run the built-in hygiene check:

```bash
bash /opt/tesla-carview/scripts/hygiene-check.sh
```

The script checks 7 areas and prints a colour-coded summary:

| # | Check | Auto-fix |
|---|---|---|
| 1 | System environment — Docker version, Node.js ≥ 20, disk usage | — |
| 2 | Dependency security — `npm audit` for frontend + backend | `--fix` runs `npm audit fix` |
| 3 | Bundle size — main JS chunk vs. thresholds (warn > 1.2 MB, fail > 1.5 MB) | — |
| 4 | `.env` completeness — all required keys present? | — |
| 5 | Docker health — unhealthy/exited containers, dangling images + volumes | `--fix` prunes images |
| 6 | Database integrity — SQLite `PRAGMA integrity_check` per tenant | — |
| 7 | SSL certificate — days until expiry for your configured domain | — |

```bash
# CI mode (no colours, exit 1 on failures — used by setup.sh and GitHub Actions):
bash scripts/hygiene-check.sh --ci

# Auto-fix mode (runs npm audit fix, prunes Docker images):
bash scripts/hygiene-check.sh --fix
```

The nightly maintenance job (`backend/src/services/nightlyMaintenance.js`) runs a subset of these checks automatically every night at 03:30 Europe/Berlin and writes results to the admin health log (`Admin → System → Maintenance`).

---

## View logs

```bash
# backend logs:
docker compose -f docker-compose.prod.yml logs -f backend

# nginx logs:
tail -f /var/log/nginx/tesla-carview.access.log
```

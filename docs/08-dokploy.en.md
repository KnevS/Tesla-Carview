# Deployment with Dokploy

> 🇩🇪 [Auf Deutsch lesen](08-dokploy.md)

[Dokploy](https://dokploy.com) is a self-hosted open-source PaaS platform
(comparable to Coolify or Railway). It handles routing, SSL (via Let's Encrypt + Traefik),
logs and GitHub webhooks for automatic deployment — without the overhead of a full
CI/CD pipeline.

**When it makes sense:**
- You want a web UI instead of SSH commands to manage deployments
- Multiple apps run on the same server
- You don't want a separate GitHub Actions workflow

---

## 1. Install Dokploy on the server

```bash
# as root on a fresh VPS (Debian/Ubuntu recommended):
curl -sSL https://dokploy.com/install.sh | sh
```

Dokploy then starts on port **3000**. Open `http://YOUR-SERVER-IP:3000` in the browser
and create the admin account.

> Firewall note: port 3000 must be reachable temporarily. After signing in, Dokploy
> can set up its own domain + SSL for the dashboard. After that you can close port 3000 again.

---

## 2. Add Tesla Carview as an app

In the Dokploy dashboard:

1. **Projects** → **Create Project** (e.g. `tesla-carview`)
2. Inside the project: **Create Service** → **Application**
3. Name: `tesla-carview`
4. Build type: **Docker Compose**
5. Compose file: `docker-compose.prod.yml`

---

## 3. Connect the GitHub repository

### Option A — GitHub App (recommended)

1. Dokploy dashboard → **Settings** → **Git Providers** → **GitHub App** → **Install**
2. Grant permission for the `Tesla-Carview` repository
3. In the app config: **Source** → select repository, branch: `main`

### Option B — public repository (no auth)

Just enter the HTTPS URL under **Source**:
```
https://github.com/YOUR-GITHUB-USER/Tesla-Carview.git
```
Branch: `main`

---

## 4. Set environment variables

In the **Environment** tab of the app, enter all variables from the `.env` file.
Minimum required fields:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Long random value (`openssl rand -hex 64`) |
| `TESLA_CLIENT_ID` | Tesla Developer app client ID |
| `TESLA_CLIENT_SECRET` | Tesla Developer app secret |
| `TESLA_REDIRECT_URI` | `https://your.domain.com/api/auth/callback` |
| `FRONTEND_URL` | `https://your.domain.com` |
| `NODE_ENV` | `production` |

> All other variables from `backend/.env.example` can be added as needed.

---

## 5. Configure domain & SSL

In the **Domains** tab:

1. **Add Domain** → `your.domain.com`
2. SSL provider: **Let's Encrypt** (automatic via Traefik)
3. Target port: **80** (the nginx frontend container handles internal routing)

The domain's A record must point to the server IP.

---

## 6. Persistent data (volumes)

Tesla Carview stores all data in the Docker volume `tesla_data`.
Dokploy manages this volume automatically when it is defined in `docker-compose.prod.yml` —
no extra configuration needed.

Recommended host mount path (for backups):

```bash
# in the Dokploy dashboard → Volumes → add Host Path:
host path:      /opt/tesla-carview-data
container path: /app/data
```

---

## 7. Trigger the first deployment

In the app tab, top right: **Deploy** → Dokploy fetches the code from GitHub,
builds the Docker images and starts the containers.

Logs during the build:
- **Deployments** tab → click the current deployment → real-time log output

---

## 8. Automatic deployment on GitHub push

### Prerequisite: GitHub App integration (step 3A)

With the GitHub App integration Dokploy registers a webhook automatically.
Every push to `main` triggers a new deployment — no further configuration.

### Manual webhook (option B / without GitHub App)

1. Dokploy → app → **General** tab → copy **Webhook URL**
   (format: `https://dokploy.your.domain.com/api/deploy/XXXXX`)
2. GitHub → repository → Settings → Webhooks → **Add webhook**
   - Payload URL: the copied webhook URL
   - Content type: `application/json`
   - Secret: leave empty (or set in Dokploy)
   - Trigger: **Just the push event**

From now on: push to `main` → Dokploy builds and deploys automatically.

---

## 9. Logs & monitoring

```
Dokploy dashboard → App → Logs
```

Or directly via Docker on the server:

```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs -f backend
```

---

## Comparison: Dokploy vs. GitHub Actions SSH

| Criterion | GitHub Actions + SSH | Dokploy |
|---|---|---|
| Web UI for logs/status | ✗ (only the GitHub UI) | ✓ |
| SSL automation | Manual (Certbot) | ✓ (Traefik) |
| Multiple apps on one server | Complex | ✓ |
| Custom CI/CD logic | ✓ (flexible) | ✗ (build + start only) |
| Resource cost (Dokploy itself) | none | ~200 MB RAM |
| GitHub dependency | ✓ (Actions) | Optional (webhook is enough) |

---

## Further reading

- [Dokploy documentation](https://docs.dokploy.com)
- [Tesla Carview — GitHub Actions SSH deploy](./02-deployment.en.md#github-actions-auto-deploy)
- [Configure the Tesla API](./04-tesla-api.en.md)

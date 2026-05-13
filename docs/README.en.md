# 📚 Tesla Carview — Technical documentation

> 🇩🇪 [Auf Deutsch lesen](README.md) · 👤 [User handbook (EN)](../frontend/src/handbook/handbook.en.md)

This documentation is aimed at **self-hosters, administrators and developers**. It covers installation, configuration, operations and architecture.

> **Users of the running app** (login, logbook, controls, permissions, demo, …) find everything in the **in-app handbook** at `/handbook` or directly at [`frontend/src/handbook/handbook.en.md`](../frontend/src/handbook/handbook.en.md). The two documents overlap on a few topics on purpose, but always cross-reference each other.

---

## Index

### 🚀 Initial setup

| Doc | Topic |
|---|---|
| [01-quickstart.en.md](01-quickstart.en.md) | Quickstart: clone the repo, run backend + frontend locally |
| [02-deployment.en.md](02-deployment.en.md) | Production deployment on a Linux server / Raspberry Pi with Docker + nginx + Let's Encrypt |
| [14-network-access.en.md](14-network-access.en.md) | **Accessible from anywhere** without a static IP — DynDNS, FritzBox, Cloudflare Tunnel, VPS, own domain |
| [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) | **Raspberry Pi storage** — replace SD card with USB SSD, NVMe HAT+, PXE network boot |
| [07-setup-wizard.en.md](07-setup-wizard.en.md) | Interactive configuration assistant (`deploy/setup-wizard.sh`) |
| [08-dokploy.en.md](08-dokploy.en.md) | Alternative: deployment via Dokploy |

### ⚙️ Configuration

| Doc | Topic |
|---|---|
| [10-configuration.en.md](10-configuration.en.md) | **Every environment variable** — required, optional, demo, auto-update |
| [04-tesla-api.en.md](04-tesla-api.en.md) | Create a Tesla developer account, register the app, pick scopes |
| [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) | Tesla API cost, quota, tracking |

### 🛠 Operations

| Doc | Topic |
|---|---|
| [11-operations.en.md](11-operations.en.md) | **Backup & restore**, **nightly maintenance**, **demo mode**, auto-update, system health, logs |
| [12-high-availability.en.md](12-high-availability.en.md) | **HA architecture** (teaser) — warm standby, active-active, geo-redundant, K8s. Delivered per project on request. |

### 🔐 Security

| Doc | Topic |
|---|---|
| [03-authentication.en.md](03-authentication.en.md) | Authentication flow: JWT, refresh token, MFA, passkeys |
| [05-security-architecture.en.md](05-security-architecture.en.md) | Threat model and every security measure |
| [06-fail2ban.en.md](06-fail2ban.en.md) | Brute-force protection with fail2ban |

---

## Where does each piece of information live?

| Question | Answer |
|---|---|
| "How do I install Tesla Carview on my server?" | [02-deployment.en.md](02-deployment.en.md) |
| "Which env variable controls X?" | [10-configuration.en.md](10-configuration.en.md) |
| "How do I create a backup?" | [11-operations.en.md](11-operations.en.md) |
| "My Tesla doesn't show up — what now?" | [User handbook → Troubleshooting](../frontend/src/handbook/handbook.en.md#-troubleshooting) |
| "How do I use the logbook for the tax office?" | [User handbook → BMF logbook](../frontend/src/handbook/handbook.en.md#-logbook-for-the-tax-office-bmf-compliant-fahrtenbuch-bmf) |
| "How do I enable MFA for my account?" | [User handbook → Security](../frontend/src/handbook/handbook.en.md#-security) |
| "Why do new accounts require MFA?" | [03-authentication.en.md](03-authentication.en.md) (architecture) and [User handbook → Security](../frontend/src/handbook/handbook.en.md#-security) (user side) |
| "How does demo mode work under the hood?" | [11-operations.en.md → Demo mode](11-operations.en.md#-demo-mode) |
| "What gets recorded in the audit log?" | [05-security-architecture.en.md](05-security-architecture.en.md) and the UI at `/admin/audit` |

---

## Related content outside the docs

- **`backend/.env.example`** — commented template for the backend configuration
- **`frontend/.env.example`** — template for the footer contact (build-time)
- **`deploy/setup.sh`** — fully automated server setup
- **`deploy/setup-wizard.sh`** — interactive assistant
- **`deploy/update.sh`** — zero-downtime update
- **`docker-compose.prod.yml`** — production stack with backend + frontend + nginx

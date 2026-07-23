# Installation Guide

🌐 **Language:** **EN** · [DE](DE-Installation) · [FR](FR-Installation) · [ES](ES-Installation) · [TR](TR-Installation) · [EL](EL-Home)

> **Time needed:** ~30 minutes | **Difficulty:** Beginner-friendly

This guide walks you through a complete Tesla Carview installation from scratch.

---

## What you need before you start

Before touching any commands, make sure you have:

- [ ] A Linux server, VPS, or Raspberry Pi (see [hardware options](#hardware-options) below)
- [ ] A domain name pointing to your server — OR plan to use DynDNS / Cloudflare Tunnel ([→ Network Access](Network-Access))
- [ ] A Tesla Developer account ([→ Tesla API Setup](Tesla-API-Setup))
- [ ] SSH access to your server (or a keyboard + screen on the Pi)

---

## Hardware options

### Option 1: Raspberry Pi (home server)
Best for: personal use at home, low cost (~€60–120 total)

| Model | RAM | Recommended storage |
|---|---|---|
| Raspberry Pi 5 (recommended) | 4 GB or 8 GB | NVMe SSD via M.2 HAT+ |
| Raspberry Pi 4 | 4 GB | USB SSD |
| Raspberry Pi 3 | 1 GB | no longer supported ¹ |

¹ Raspberry Pi 3 and older (32-bit ARM) are no longer supported as of v3.51.0: Node.js ships no ARMv7 images from version 24 onwards.

> ⚠️ **Important:** Do not use an SD card for permanent operation. It will fail within months under Tesla Carview's write load. See [Raspberry Pi Storage](Raspberry-Pi-Storage) for a 20-minute fix.

### Option 2: VPS at a hosting provider
Best for: 24/7 availability, no hardware to manage, easy setup

| Provider | Monthly cost | Notes |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~€4.35 | Recommended, very reliable |
| [netcup](https://www.netcup.eu) VPS 1000 | ~€4.44 | German data centres |
| [Contabo](https://contabo.com) VPS S | ~€5.99 | Lots of storage |

A VPS has a **fixed public IP address** — no DynDNS setup needed.

---

## Step 1: Prepare the server

Connect to your server via SSH (or open a terminal on the Pi):

```bash
ssh root@YOUR-SERVER-IP
```

Make sure the system is up to date:

```bash
apt update && apt upgrade -y
```

---

## Step 2: Get a domain pointing to your server

Tesla Carview **requires HTTPS** (Tesla's API only works over secure connections). That means you need a domain with a valid SSL certificate.

**I have a VPS with a fixed IP:**
→ Go to your domain registrar and create an A record:
```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP
```
Wait 5–30 minutes for DNS to propagate, then continue.

**I'm at home without a fixed IP:**
→ See [Network Access](Network-Access) — set up DynDNS or Cloudflare Tunnel first, then come back here.

**I have no domain at all:**
→ Get a free subdomain at [DuckDNS.org](https://www.duckdns.org) (e.g. `my-tesla.duckdns.org`) — it's free and works with Let's Encrypt.

---

## Step 3: Run the setup script

This single command downloads and runs the interactive setup wizard:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

The wizard asks you a series of questions:

| Question | What to enter |
|---|---|
| Domain name | `tesla.yourdomain.com` or `my-tesla.duckdns.org` |
| Admin username | Any name (e.g. your first name, `admin`) |
| Admin password | A strong password (min. 12 characters) |
| Tenant name | What to call your installation (e.g. "My Tesla") |
| Enable HTTPS | Yes (always — required for Tesla API) |

The script asks for the **deployment mode** before doing anything:

| Mode | When to use |
|---|---|
| **1 — Direct** | Dedicated VM or VPS without an existing proxy — nginx + certbot are installed and configured automatically |
| **2 — Proxy** | Already running nginx, Caddy, Traefik, or WireGuard+VPS setup — nginx installation is skipped entirely |

In **Proxy mode**, add this to your existing proxy config:
```nginx
proxy_pass http://127.0.0.1:8080;
```

The script then automatically (Direct mode):
1. Installs Docker, nginx, certbot, fail2ban
2. Gets a Let's Encrypt SSL certificate for your domain
3. Configures nginx with security headers
4. Starts all Docker containers
5. Sets up the database

**This takes 5–10 minutes.**

---

## Step 4: First login

Open your browser and go to `https://tesla.yourdomain.com`

You should see the Tesla Carview login page. Enter the admin username and password you set in Step 3.

> 💡 **Tip:** Check "Stay signed in (90 days)" on the login page so you don't have to type your password every time — especially useful when accessing from the Tesla browser.

---

## Step 5: Connect your Tesla account

After logging in, you'll see a setup prompt to connect your Tesla account. Follow the instructions in [Tesla API Setup](Tesla-API-Setup).

---

## Step 6: Done!

Your Tesla Carview installation is running. The app will start polling your vehicle's data automatically.

What to do next:
- **Set up your vehicle** → Dashboard → Add Vehicle
- **Configure notifications** → Settings → Push Notifications
- **Invite family members** → Admin → Users → Invite
- **Set up a charging location** → Settings → Charging Locations

---

## Updating

Tesla Carview can update itself automatically. Enable it in the settings:

```bash
# In /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

Or update manually:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting installation issues

**"Permission denied" when running the script**
→ Make sure you're running as `root`. Run `sudo su` first.

**"Domain not found" during certbot**
→ Your DNS hasn't propagated yet. Wait 10–30 minutes and try again. Check with: `nslookup tesla.yourdomain.com`

**Containers won't start**
→ Check logs: `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**More help** → [Troubleshooting](Troubleshooting) | [Open an Issue](https://github.com/KnevS/Tesla-Carview/issues)

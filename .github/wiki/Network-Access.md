# Network Access — Without a Static IP

🌐 **Language:** **EN** · [DE](DE-Network-Access) · [FR](FR-Network-Access) · [ES](ES-Network-Access) · [TR](TR-Network-Access) · [EL](EL-Home)

Tesla Carview runs on your own server — but for it to be reachable from the internet (including from your Tesla), you need a stable, publicly accessible address. This page walks you through every option, step by step.

> **Not an IT expert?** Follow this page from top to bottom. Every option includes precise instructions with no assumed knowledge.

---

## Which option is right for me?

| Your situation | Best option |
|---|---|
| Home internet (IP changes daily) | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended) or [Option B: DynDNS + Router](#option-b-dyndns--home-router) |
| Cable / fibre — **can't open ports** (CG-NAT) | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended) |
| VPS / server at a hosting provider | [Option C: VPS with static IP](#option-c-vps-at-a-hosting-provider) |
| You own a domain | [Option D: Own domain + DNS record](#option-d-own-domain-with-dns-record) |

---

## The problem with home internet

Your home internet connection gets a **new IP address every day** (or more often). This means the address you enter today is wrong tomorrow.

**Dynamic DNS** solves this:
- You reserve a fixed hostname (e.g. `my-tesla.duckdns.org`)
- A small program on your router or server automatically reports each new IP
- Your hostname always points to the current IP — no manual updates needed

---

## Are you behind CG-NAT?

Many cable providers (Vodafone, Virgin Media, and others) no longer give each customer their own public IPv4. Multiple customers share one IP — this is **Carrier-Grade NAT (CG-NAT)**.

**How to check:**
1. Visit [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — note the IP shown
2. Open your router's status page — note the WAN IP there
3. If the two IPs are **different** → you are behind CG-NAT

With CG-NAT, port forwarding does **not work**. Use Option A (Cloudflare Tunnel) — it doesn't need open ports.

---

## Option A: Cloudflare Tunnel (Recommended)

Cloudflare Tunnel creates an encrypted outbound connection from your server to Cloudflare's global network. No port forwarding needed. Free. Works behind CG-NAT.

**Requirements:** A domain, or a free subdomain (instructions below).

### Step 1: Get a free domain (if you don't have one)

Go to [duckdns.org](https://www.duckdns.org), sign in with Google or GitHub, choose a name → you get e.g. `my-tesla.duckdns.org` for free.

Or buy a cheap domain (~$1/year) at [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com), or [inwx.de](https://www.inwx.de).

### Step 2: Add your domain to Cloudflare

1. Register at [dash.cloudflare.com](https://dash.cloudflare.com) — free
2. Click **"Add a Site"** → enter your domain → **Free plan**
3. Cloudflare shows you two nameserver addresses, e.g.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Go to your domain registrar and enter these as the nameservers
5. Wait 10–30 minutes → Cloudflare confirms "Nameservers updated"

### Step 3: Install and configure `cloudflared`

On your server (via SSH):

```bash
# Download and install
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Log in (a browser link is shown — open it)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create tesla-carview
# Note the Tunnel ID shown!
```

Create config file:

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Content (replace `YOUR_TUNNEL_ID` and `yourdomain.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Create DNS entry automatically:

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Step 4: Install as a system service

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Done.** Tesla Carview is now accessible at `https://tesla.yourdomain.com` — with automatic HTTPS, no open ports, no static IP needed.

---

## Option B: DynDNS + Home Router

> **Important:** Only works if you have a real public IPv4 address. [Check for CG-NAT first](#are-you-behind-cg-nat).

### Step 1: Register with a DynDNS service

**Dynu** (free, no monthly confirmation required):
1. Go to [dynu.com](https://www.dynu.com) → create account → DDNS → Add
2. Enter a name, e.g. `my-tesla` → you get `my-tesla.freeddns.org`
3. Note your hostname, username, and password (Control Panel → API Credentials)

**DuckDNS** (even simpler):
1. [duckdns.org](https://www.duckdns.org) → sign in → choose subdomain → note your token

### Step 2: Configure your router

**FritzBox:**
1. Open [http://fritz.box](http://fritz.box) → **Internet → Sharing → DynDNS**
2. Check **"Use DynDNS"** and fill in:

   | Field | Dynu | DuckDNS |
   |---|---|---|
   | Provider | User-defined | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
   | Domain | `my-tesla.freeddns.org` | `my-tesla.duckdns.org` |
   | Username | Dynu username | — |
   | Password | Dynu password | — |

3. Click **Apply** → green checkmark = working

**Other routers:** Look for "Dynamic DNS" or "DDNS" in the internet/WAN settings.

### Step 3: Port forwarding

So incoming traffic reaches your server:

**FritzBox:** Internet → Sharing → Port Sharing → New Port Sharing → Other Application

| Field | Value |
|---|---|
| Name | Tesla Carview |
| Protocol | TCP |
| External port | 443 |
| To device | Your server's local IP (e.g. `192.168.1.100`) |
| Internal port | 443 |

> **Tip:** Give your server a fixed local IP. On FritzBox: Home Network → Network → your device → Always assign this IP.

### Step 4: SSL certificate and Tesla Carview config

```bash
# Set FRONTEND_URL in /opt/tesla-carview/backend/.env:
FRONTEND_URL=https://my-tesla.freeddns.org

# Get SSL certificate:
certbot --nginx -d my-tesla.freeddns.org
```

---

## Option C: VPS at a Hosting Provider

A VPS (Virtual Private Server) is a small rented Linux server with a **fixed, permanent public IP**. No DynDNS, no port forwarding needed.

**Price comparison (2025):**

| Provider | Product | Price/month |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 |

**Setup (example: Hetzner):**
1. Register → create server → choose Ubuntu 24.04 → note the public IP
2. SSH in: `ssh root@YOUR-SERVER-IP`
3. Run the setup script:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

The script asks for your domain name and configures nginx + Let's Encrypt automatically.

Then point a domain at it → [Option D](#option-d-own-domain-with-dns-record)

---

## Option D: Own Domain with DNS Record

If you have your own domain and a server with a fixed IP, create an **A record**:

**What is an A record?** It's a phone-book entry: `tesla.yourdomain.com → 123.456.789.0`

**At Cloudflare DNS:**
DNS → Add record → Type: A, Name: `tesla`, IPv4: your server IP → Save

**At Namecheap:**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host: `tesla`, Value: your IP

**At IONOS:**
Domains → your domain → DNS → Add record → A, Hostname: `tesla`, Destination: your IP

**At Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)):**
Select zone → Records → Add Record → A, Name: `tesla`, Value: your IP

> **TTL:** Set 300 (5 minutes) initially — makes it easy to correct errors. Increase to 3600 later.

### Verify propagation

```bash
nslookup tesla.yourdomain.com
# or online: https://dnschecker.org
```

### Dynamic IP with your own domain

If your domain but no fixed IP:

**CNAME → DuckDNS** (router keeps DuckDNS updated):
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

---

## Decision Tree

```
Is your router IP different from what https://api4.my-ip.io/ip shows?
  YES (CG-NAT) → Option A: Cloudflare Tunnel
  NO:
    Do you have a server in a data centre?
      YES → Option C + D (VPS + DNS record)
      NO (home network):
        Do you have your own domain?
          YES → Option B (DynDNS) + Option D (DNS record)
          NO  → Option B with free subdomain (DuckDNS/Dynu)
```

---

## Common Problems

### "Site not reachable" right after setup

DNS takes 5–30 minutes to propagate. Test locally first:
```bash
curl -I http://localhost
```

### "Certificate invalid" / HTTPS errors

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### Router DynDNS update URL not working

Your router replaces `<ipaddr>` automatically — don't fill it in manually. Test the URL in a browser by replacing `<ipaddr>` with your actual current IP.

### "My WAN IP starts with 100. or 10."

That's CG-NAT → use [Option A (Cloudflare Tunnel)](#option-a-cloudflare-tunnel-recommended).

### IPv6 / no IPv4

Newer fibre connections use IPv6. It works the same — use a **AAAA** record instead of **A** in DNS. Your router keeps a fixed IPv6 prefix (no DynDNS needed for IPv6 on most connections).

---

## Useful Links

- [Cloudflare Tunnel docs](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — free dynamic DNS
- [Dynu DDNS](https://www.dynu.com/) — free, no monthly confirmation
- [dnschecker.org](https://dnschecker.org) — verify DNS propagation worldwide
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — check your public IP

---

*→ [[Installation]] | [[Raspberry-Pi-Storage]] | [[Home]]*

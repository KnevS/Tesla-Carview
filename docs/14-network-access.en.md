# Accessible from anywhere — without a static IP

> 🇩🇪 [Auf Deutsch lesen](14-network-access.md)

This chapter explains **step by step** how to make Tesla Carview accessible from anywhere — even without a fixed public IP address, even behind a home router, even on a residential internet connection.

> **Not an IT expert? No problem.** Every option includes precise step-by-step instructions that you can follow without prior knowledge.

---

## Which option is right for me?

| Situation | Best option |
|---|---|
| Home internet (router), IP changes daily | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended-for-home-use) or [Option B: DynDNS + Router](#option-b-dyndns--home-router) |
| Cable or fibre internet — **cannot open ports** (CG-NAT) | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended-for-home-use) |
| Own server / VPS at a hosting provider (netcup, Hetzner) | [Option C: VPS with static IP](#option-c-vps-at-a-hosting-provider-netcup-hetzner-contabo) |
| Own domain available | [Option D: Own domain + DNS record](#option-d-own-domain-with-dns-record) |

---

## The problem with dynamic IP addresses

Your home internet connection does **not have a fixed IP address** — the router receives a new one daily (or more often). This means: if you enter `192.0.2.47` in the app today, it will be wrong tomorrow.

The solution is called **Dynamic DNS (DynDNS or DDNS)**:
- You reserve a fixed domain name (e.g. `my-tesla.duckdns.org`)
- A small program (running automatically on your router or server) reports the new IP address every time it changes
- Your domain name always points to the current IP — you never have to change anything manually

---

## Another problem: No public IPv4 (CG-NAT)

Many cable internet connections (e.g. Vodafone, Virgin Media, certain mobile providers) no longer provide their own public IPv4 address. Multiple customers share one IP. This is called Carrier-Grade NAT (CG-NAT).

**Detection test:** Go to [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) and compare the displayed IP with the IP your router shows in its status page. If the IPs are **different** → you are behind CG-NAT. Option B will **not work**.

With CG-NAT, **Option A (Cloudflare Tunnel)** is the only solution without an additional server.

---

## Option A: Cloudflare Tunnel (recommended for home use)

**What is it?** Cloudflare Tunnel establishes an encrypted outbound connection from your server to the internet — without opening any port in your router. Your Tesla Carview instance becomes accessible through Cloudflare's global network.

**Cost:** Free.

**Requirements:**
- A domain (e.g. `mydomain.com`) **or** a free subdomain (instructions below)
- The domain must be managed by Cloudflare (free step)

### Step 1: Get a free domain (if you don't have one)

Without your own domain, use DuckDNS:
1. Go to [https://www.duckdns.org](https://www.duckdns.org) and sign in with Google or GitHub
2. Choose a name, e.g. `my-tesla` → you get `my-tesla.duckdns.org`
3. Note your **token** (the long alphanumeric string shown under your profile)

Alternatively: Get a cheap domain from ~$1/year at [Namecheap](https://www.namecheap.com), [Porkbun](https://www.porkbun.com) or [inwx.de](https://www.inwx.de).

### Step 2: Cloudflare account + add domain

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) → register for free
2. Click **"Add a Site"** and enter your domain
3. Choose the **Free plan** (€0)
4. Cloudflare shows you two nameserver addresses, e.g.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Go to your domain registrar (Namecheap, IONOS etc.) and enter these **as nameservers**
   - At Namecheap: Domain List → Manage → Nameservers → Custom DNS
   - At IONOS: Domains → your domain → Nameservers → Custom nameservers
6. Wait 10–30 minutes until Cloudflare confirms: **"Nameservers updated"**

### Step 3: Create the tunnel

On your server (via SSH or terminal):

```bash
# Install cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Log in to your Cloudflare account (a browser window opens)
cloudflared tunnel login

# Create the tunnel (choose any name)
cloudflared tunnel create tesla-carview

# This shows: Tunnel ID (e.g. "abc123-...") — note it down!
```

### Step 4: Configure the tunnel

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

Create DNS record (Cloudflare does this automatically):
```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Step 5: Install as a service (starts automatically after reboot)

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Done!** Tesla Carview is now accessible at `https://tesla.yourdomain.com` — with automatic HTTPS, no port forwarding, no static IP.

---

## Option B: DynDNS + Home Router

> **Important:** Only works if you have your **own public IPv4** address (no CG-NAT). Test this first — [see above](#another-problem-no-public-ipv4-cg-nat).

**What is it?** Your router automatically reports its new IP address to a DynDNS service. You can always reach Tesla Carview under the same domain name.

### Step 1: Choose a DynDNS service and register

**Recommended: Dynu** (completely free, no monthly confirmation required)

1. Go to [https://www.dynu.com](https://www.dynu.com) → create an account
2. DDNS → Add → enter a name, e.g. `my-tesla` → you get `my-tesla.freeddns.org`
3. Note: **hostname**, **username**, **password** (under Control Panel → API Credentials)

**Alternative: DuckDNS** (even simpler, but requires manual router configuration)

1. [https://www.duckdns.org](https://www.duckdns.org) → sign in → choose subdomain
2. Update URL: `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=`

### Step 2: Configure your router

For **FritzBox:**
1. Open the FritzBox interface: [http://fritz.box](http://fritz.box)
2. **Internet → Sharing → DynDNS**
3. Check **"Use DynDNS"**
4. Fill in:

   | Field | Dynu value |
   |---|---|
   | DynDNS provider | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` |
   | Domain name | `my-tesla.freeddns.org` |
   | Username | Dynu username |
   | Password | Dynu password |

5. **Apply** → FritzBox tests the connection → green checkmark = working

For **other routers:** Look for "Dynamic DNS" or "DDNS" in the router settings — most modern routers support it with similar fields.

### Step 3: Port forwarding

So that traffic from outside reaches your server:

1. **Internet → Sharing → Port Sharing** (FritzBox)
2. **New Port Sharing** → **Other Application**
3. Fill in:

   | Field | Value |
   |---|---|
   | Name | Tesla Carview HTTPS |
   | Protocol | TCP |
   | External port | 443 |
   | To device | IP of your server on the local network (e.g. `192.168.1.100`) |
   | Internal port | 443 |

4. **Apply** and enable

> **Tip:** Give your server a **fixed (static) local IP** so the port forwarding doesn't "drift". On FritzBox: Home Network → Network → your device → Always assign this IP.

### Step 4: Configure Tesla Carview

Open `/opt/tesla-carview/backend/.env` and set:

```bash
FRONTEND_URL=https://my-tesla.freeddns.org
```

Get an SSL certificate via Let's Encrypt:
```bash
certbot --nginx -d my-tesla.freeddns.org
```

**Done!** Accessible at `https://my-tesla.freeddns.org`.

---

## Option C: VPS at a hosting provider (netcup, Hetzner, Contabo)

A VPS (Virtual Private Server) is a small rented Linux server in a data centre. It always has a **fixed, public IPv4 address** — no DynDNS tricks needed.

**Price comparison (2025):**

| Provider | Product | Price/month | Notes |
|---|---|---|---|
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 | German data centres, good community |
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 | Very reliable, Nuremberg/Falkenstein |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 | Lots of storage |
| [IONOS](https://www.ionos.com) | VPS S | ~€1.00 | First month cheap, then higher |

### Setup at netcup (example)

1. Register at [netcup.eu](https://www.netcup.eu)
2. **Server Control Panel (SCP)** → order VPS → choose Ubuntu 24.04
3. Copy the root password from the confirmation email
4. Open a terminal and log in:
   ```bash
   ssh root@YOUR-SERVER-IP
   ```
5. Install Tesla Carview:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

The setup script asks for a domain name. Enter your domain (e.g. `tesla.yourdomain.com`) — Let's Encrypt and nginx are configured automatically.

### Point a domain at the VPS

If you have your own domain, create an **A record**:

```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP  →  TTL 300
```

How to do this: [→ Option D below](#option-d-own-domain-with-dns-record)

---

## Option D: Own domain with DNS record

If you have your own domain (e.g. `yourdomain.com`) and a server with a **fixed IP** (VPS or static home IP), a DNS record is all you need.

### What is an A record?

An **A record** works like a phone book entry:
- On the left is the name: `tesla.yourdomain.com`
- On the right is the address: `123.456.789.0` (your server IP)
- Every browser that visits `tesla.yourdomain.com` is told: "The IP is `123.456.789.0`"

### How to create an A record

**At Namecheap:**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Type: **A Record**, Host: `tesla`, Value: your server IP
3. Save All Changes

**At IONOS:**
1. Domains → your domain → DNS → Add record
2. Type: **A**, Hostname: `tesla`, Destination: your server IP
3. Save

**At inwx.de:**
1. Domain management → DNS → Add record
2. Type: **A**, Name: `tesla`, Content: your server IP, TTL: 300
3. Save

**At Hetzner DNS Console ([dns.hetzner.com](https://dns.hetzner.com)):**
1. Select zone → Records → Add Record
2. Type: **A**, Name: `tesla`, Value: your server IP
3. Add record

> **TTL** (Time to Live) determines how long DNS entries are cached. Set 300 (5 minutes) during initial setup so errors can be corrected quickly. You can increase it to 3600 later.

### Verify: Has the DNS record propagated?

```bash
# Test from your home computer:
nslookup tesla.yourdomain.com
# or
dig tesla.yourdomain.com
```

Or online: [https://dnschecker.org](https://dnschecker.org) — shows whether the record is visible worldwide.

### Dynamic IP with your own domain

If you have your own domain but no fixed IP, combine both approaches:

**Variant 1: CNAME pointing to DuckDNS** (router keeps DuckDNS updated automatically)
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

**Variant 2: Update script + cron job**
```bash
# Cron job that updates the IP every 5 minutes:
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=my-tesla&token=YOURTOKEN&ip=$(curl -s https://api4.my-ip.io/ip)"
```

---

## Common problems and solutions

### "Site not reachable" after setup

1. **Wait 5–30 minutes** — DNS entries take time to propagate
2. **Test locally first:** Is Tesla Carview reachable on the server?
   ```bash
   curl -I http://localhost
   ```
3. **Router port forwarding:** Click **Test** next to the port sharing rule

### "Certificate invalid" / HTTPS errors

```bash
# Re-issue Let's Encrypt certificate:
certbot renew --force-renewal
systemctl restart nginx
```

### Router update URL not working

- Your router replaces `<ipaddr>` with the current IP — don't fill it in manually
- Test the URL manually in your browser (replace `<ipaddr>` temporarily with your actual IP)
- Check: does your router status show a public IP? An address starting with `10.x.x.x` or `100.x.x.x` means CG-NAT

### "My IP starts with 100." or "10."

That is **CG-NAT** — see [Option A (Cloudflare Tunnel)](#option-a-cloudflare-tunnel-recommended-for-home-use), that is the only solution without an additional server.

### IPv6 instead of IPv4

Newer internet connections (especially fibre) work with **IPv6**. This works the same way — your router has a fixed IPv6 address and doesn't need DynDNS. In the DNS record, use type **AAAA** (IPv6) instead of **A** (IPv4).

---

## Decision tree

```
Are you behind CG-NAT?  (IP starts with 100. or your router shows a different IP than ipify.org)
  → YES:  Option A (Cloudflare Tunnel)
  → NO:
      Do you have a server in a data centre?
        → YES:  Option C + D (VPS + DNS record)
        → NO (home network):  Option B (DynDNS + router)
```

---

## Useful links

- [Cloudflare Tunnel documentation](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu DDNS](https://www.dynu.com/)
- [netcup Community Tutorial: nginx Reverse Proxy](https://community.netcup.com/en/tutorials/how-to-setup-nginx-reverse-proxy)
- [Hetzner DNS Console](https://dns.hetzner.com)
- [dnschecker.org — verify DNS propagation](https://dnschecker.org)
- [ipify.org — check your public IP](https://api4.my-ip.io/ip)

---

*→ Back to [02-deployment.en.md](02-deployment.en.md) | [All docs](README.en.md)*

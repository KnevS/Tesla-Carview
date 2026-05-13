# Welcome to Tesla Carview Wiki

**Tesla Carview** is a self-hosted data logger and control app for Tesla vehicles. Your data stays on your own server — no cloud, no third-party access.

> 🇩🇪 **Deutschsprachige Nutzer:** Die technische Dokumentation ist auch auf Deutsch verfügbar. Alle `docs/*.md`-Dateien im [Repository](https://github.com/KnevS/Tesla-Carview/tree/main/docs) existieren als deutsche und englische Version.

---

## ⚖️ License — please read first

Tesla Carview is licensed for **non-commercial, private use only**.

You may:
- ✅ Run your own instance for personal use
- ✅ Modify the code for your own private installation
- ✅ Share the project with others (with attribution)

You may **not**:
- ❌ Run Tesla Carview as a paid service for others
- ❌ Use it commercially (charging customers, SaaS, fleet management for hire)
- ❌ Remove copyright notices or attribution

Full license details: [License & Usage Rights](License-and-Usage)

---

## 🗺️ Where do you want to go?

### I'm brand new — where do I start?

→ **[Installation Guide](Installation)** — Step-by-step setup in 30 minutes

### I have Tesla Carview running but can't reach it from outside

→ **[Network Access](Network-Access)** — DynDNS, Cloudflare Tunnel, FritzBox, VPS

### My Raspberry Pi SD card keeps dying

→ **[Raspberry Pi Storage](Raspberry-Pi-Storage)** — USB SSD, NVMe, PXE boot

### I want to connect my Tesla account

→ **[Tesla API Setup](Tesla-API-Setup)** — Developer account, tokens, Virtual Key

### I want to understand all the features

→ **[Features Overview](Features)** — Dashboard, trips, charging, controls, and more

### I have multiple users or want to set up for a family

→ **[Multi-Tenant & Users](Multi-Tenant)** — Tenants, user invites, permissions

### Something isn't working

→ **[Troubleshooting](Troubleshooting)** — Common problems and solutions

---

## 🔑 At a glance

| Feature | Details |
|---|---|
| **Platform** | Linux server, Raspberry Pi, VPS |
| **Storage** | SQLite (per tenant, no external DB needed) |
| **Auth** | Username/password, Passkeys, MFA (TOTP) |
| **API** | Tesla Fleet API (official), Virtual Key for commands |
| **Languages** | DE, EN, FR, ES, TR, EL |
| **License** | Non-commercial private use |

---

## 📂 For IT experts

This Wiki is the guided entry point. If you prefer reading raw Markdown with full technical detail, everything is in the repository:

| Resource | Link |
|---|---|
| Technical docs index | [docs/README.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) |
| All environment variables | [docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) |
| Security architecture | [docs/05-security-architecture.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/05-security-architecture.en.md) |
| Backup & operations | [docs/11-operations.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md) |

---

*This wiki is automatically generated from the repository. Last updated: see [commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

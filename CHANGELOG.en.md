# Changelog

All notable changes are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> 🇩🇪 [Auf Deutsch lesen](CHANGELOG.md)

---

## [v2.2.0] — 2026-05-14

### Added
- **QR SSO login for Tesla browser** — Tesla display browser shows a QR code; user scans with smartphone, authenticates via Passkey/Face ID → session is automatically transferred to the Tesla browser. No WebAuthn required in the Tesla browser.
- **Route Planner** — map rendering fixed (Leaflet CSS now statically imported), OSRM road routing (real streets, free), charging station overlay via OpenChargeMap, arrival SoC estimation from own trip data, ABRP demoted to optional link
- **Settings Wizard** — 8-step wizard (language, design, color, units, dashboard cards, navigation, notifications, summary), re-launchable from Settings, draft mode until final confirmation
- **Dynamic Dashboard** — card visibility and order from user preferences; stored server-side for cross-device sync
- **Preferences API** — `GET/PATCH /api/users/me/preferences` (partial merge), `users.preferences` JSON column per tenant, 800ms debounce sync in store

### Improved
- **Passkey login** — `/api/passkey/login-options` now accepts both `tenantSlug` and `tenantId`
- **New icons** — `qr-code`, `warning`, `fingerprint` added to AppIcon library

---

## [v2.1.0] — 2026-05-14

### Added
- **GitHub Wiki** — comprehensive, layperson-friendly wiki with 16 pages (installation, network access, Raspberry Pi storage, security, backup, troubleshooting and more). Automatically synced from the repo on every push
- **Tesla Model Y favicon** — side-profile silhouette as app icon in all browsers, as PWA icon and iOS home screen icon (replaces lightning-bolt placeholder)
- **Network access guide** (`docs/14-network-access`) — DynDNS, Cloudflare Tunnel, FritzBox setup, CG-NAT detection, VPS options with decision tree
- **Raspberry Pi storage guide** (`docs/15-raspberry-pi-storage`) — USB SSD, NVMe M.2 HAT+, PXE boot, Samsung T7 quirk fix, SD card migration guide
- **InfoTip component** — global `<InfoTip text="…" />` component for inline explanations (ⓘ icon with hover tooltip)
- **Handbook wiki link** — all 6 language versions of the in-app handbook now point to the GitHub Wiki
- **Remember me option** — "Stay logged in" checkbox in login sets a 90-day session (vs. 7-day default)

### Improved
- **Usability** — comprehensive tooltip coverage across trip detail, GrokChat, logbook, maintenance log, user management and more views
- **Login page** — optimised for Tesla touchscreen (larger inputs, no QR code detour)
- **Favicon** — replaced lightning bolt placeholder with Tesla Model Y silhouette

### Removed
- **QR-pair login** — removed the QR-code-based device login flow (technically flawed; Tesla browser has a touchscreen keyboard)

---

## [v2.0.0] — 2026-05-12

### Added
- **Multi-tenant architecture** — full data isolation, dedicated SQLite DB per tenant
- **Invite links** — new tenant only via invite link (7 days, single-use, with optional note)
- **Tenant pseudonym** — privacy-compliant login identifier instead of real name, admin-regenerable
- **AES-256-GCM encryption at rest** — Tesla OAuth tokens, TOTP secrets, Virtual Key encrypted with AES-GCM
- **Audit log** — admin viewer for security-relevant events (CSV export, GDPR-compliant)
- **Fleet Telemetry primary** — WebSocket streaming as preferred data source, saves >95% API budget
- **Full backup + restore** — JSON export of all 25 tables, safety pre-backup before restore
- **GitHub Actions CI/CD** — gitleaks, OWASP dependency check, auto-deploy via SSH

### Improved
- Poller switches to 1×/h heartbeat when Fleet Telemetry is active
- Automatic nightly maintenance (WAL checkpoint, VACUUM, auto-update)
- Service Worker + PWA auto-update — no manual browser reload needed

---

## [v1.x] — Earlier versions

The initial single-tenant version included:
- Dashboard, trips, charging, battery, live telemetry
- Trip logbook (German tax authority compliant) incl. PDF export
- Vehicle controls (climate, doors, charging, Sentry, navigation)
- Service intervals + maintenance log
- Push notifications (Web Push)
- Multi-language (DE/EN/FR/ES/TR/EL)
- aWattar + Tibber integration (dynamic tariff)
- Installable PWA (iOS, Android, Tesla browser)

---

*Versioning follows [Semantic Versioning](https://semver.org/). Breaking changes → Major, new features → Minor, bugfixes → Patch.*

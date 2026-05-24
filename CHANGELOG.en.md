# Changelog

All notable changes are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> 🇩🇪 [Auf Deutsch lesen](CHANGELOG.md)

---

## [v3.3.1] — 2026-05-24

### Fixed
- **Charging station search — silent failures resolved** — All error states (address not found, missing OpenChargeMap API key, network error) now show a visible, descriptive banner instead of an empty result list. A missing API key shows a direct link to Admin → System for configuration.
- **Geolocation error handling** — If the browser denies location access, a visible error state is shown instead of silently doing nothing.

### Navigation restructure
- **"Overview" → "Vehicle"** — The first nav group is renamed to clearly reflect its content (live vehicle status).
- **"Analytics" cleaned up** — Automations and Charging Stations removed; only data analysis views remain: Trips, Trip log, Charging, Energy report, Sleep monitor, Climate stats, Service log, Billing, Export.
- **New "Planning" group** — Route planner, Charging stations, Automations, and Grok AI moved here. These are all action- and future-oriented tools.
- **"AI" group removed** — Grok is now logically at home in Planning.
- All 6 locales updated with new group labels (`group_vehicle`, `group_plan`).
- Handbook updated in all 6 languages: new desktop navigation table, updated mobile Tab Bar description, new standalone sections for Charging station finder and Automations.

---

## [v3.3.0] — 2026-05-24

### Improved
- **Mobile UX — iPhone / Android** — NavBar is hidden on small screens; the existing MobileTabBar now covers Settings, Handbook, vehicle selector, and Logout in an iOS-style bottom sheet ("More"). Safe-area insets (`env(safe-area-inset-*)`) prevent content from hiding behind notch and home indicator. Settings sections default to collapsed on mobile to avoid excessive scrolling.
- **Touch targets meet HIG** — Climate Keeper buttons, seat heater pads, and temperature ±buttons enlarged to at least 44 × 44 px on mobile via responsive Tailwind classes. iOS form inputs forced to `font-size: 16px` to suppress the automatic zoom.
- **Bundle size −57 %** — All 25+ view imports converted to lazy `() => import()`. Heavy vendor libraries (Leaflet, Chart.js, jsPDF, vue-i18n, marked, DOMPurify) split into separate cached chunks via Vite `manualChunks`. Result: 2.3 MB → 1.0 MB raw, ~670 KB → ~257 KB gzip.
- **Leaflet CSS loaded lazily** — `leaflet/dist/leaflet.css` is no longer part of the global bundle; it is dynamically imported inside `LocationHeatmap.vue` only when the map view is first visited.

### New
- **Hygiene check script** (`scripts/hygiene-check.sh`) — 7-section health check: Docker, Node, disk, npm audit (frontend + backend), bundle size, `.env` completeness, Docker container health, SQLite integrity, and SSL certificate expiry. Flags: `--fix` (auto-prune images, run `npm audit fix`), `--ci` (no colour output, exit 1 on failures). Automatically invoked at the end of `deploy/setup.sh`.
- **Nightly hygiene automation** — `nightlyMaintenance.js` now runs Docker image pruning, npm audit (critical findings written to the tenant audit log), and bundle-size checks every night at 03:30 Europe/Berlin. Results visible in Admin → System → Maintenance.
- **CI security gates** — GitHub Actions now runs `npm audit --audit-level=high` for both frontend and backend as a blocking merge gate. Bundle size is measured after every build (warn > 800 KB, block > 1.5 MB); results appear in the PR step summary.
- **Dependabot** — Automatic weekly npm dependency PRs for `/frontend` and `/backend`; monthly GitHub Actions updates. Patch/minor updates grouped; major updates as individual PRs for manual review.

### CI / Infrastructure
- **`chunkSizeWarningLimit: 800`** added to `vite.config.js` — Vite now warns locally when any chunk exceeds 800 KB, matching the CI threshold.

---

## [v3.2.0] — 2026-05-22

### New
- **CO₂ comparison in Energy Report** — New section shows Tesla CO₂ consumption vs. diesel equivalent, tonnes of CO₂ saved, and the German grid mix factor (0.38 kg/kWh). Per-week CO₂ savings are shown in the trend chart.
- **Weather consumption correlation** — Temperature bar chart in the Energy Report: average consumption across 6 temperature buckets (< −10 °C to > 30 °C). Shows how cold and heat affect range. New backend endpoint `GET /api/trips/weather-consumption`.
- **Firmware update tracker** — New `firmware_versions` table automatically records each new software version detected during sync. Full update history (date, version, days installed) visible in Admin → System.
- **Climate statistics** — New page `/climate` with daily breakdown: AC usage (hours), seat heating driver/passenger, preconditioning count, coldest/hottest day. Data is collected automatically at every vehicle sync via `hvac_daily_stats` table.
- **Community Benchmark** (opt-in) — Anonymous consumption comparison with other Tesla drivers of the same model. Opt-in via toggle; contributions are stored as a SHA-256-hashed instance UUID, never as plain data. k-anonymity: minimum 3 contributors required. P25–P75 range visible. Revocable at any time.

### Improved
- **Bundle cache-busting fixed** — The Vite entry bundle was always named `index-local.js` (no `.git` in Docker build context), which was frozen by nginx's `immutable` cache for one year. CI now passes `GIT_HASH` as `--build-arg`; each deploy produces `index-<7charHash>.js` as a unique filename.

---

## [v3.1.5] — 2026-05-18

### Security
- **Argon2id replaces bcrypt for password hashes** — New passwords and password changes now use Argon2id (t=3, m=64 MB, p=4 — OWASP 2024 recommendation). Existing bcrypt hashes remain valid and are transparently migrated on the next successful login. No manual action required.
- **Encryption key can be separated from database files** — The AES-256-GCM key can now be supplied via `ENCRYPTION_KEY_B64` (environment variable, outside `data/`) or as a Docker secret. Existing `data/.encryption-key` installations continue to work unchanged.
- **Refresh tokens invalidated on password change** — After a password change all active sessions for that user are immediately terminated. A previously stolen refresh token no longer survives a password reset.
- **Refresh tokens invalidated on user deletion / deactivation** — When an admin deletes or deactivates a user, their active sessions are terminated immediately.
- **`Permissions-Policy` header added** — The browser is now explicitly instructed to block camera, microphone, geolocation, payment, USB, and Bluetooth access for the app.

---

## [v3.1.4] — 2026-05-18

### Fixed
- **Passkey login broken after upgrading to simplewebauthn v10** — Four breaking API changes were corrected: challenge is now stored as a base64url string instead of a Uint8Array blob; `excludeCredentials[].id` must be a string (not a Buffer); `credentialID` from `registrationInfo` is a Uint8Array and is now properly converted; the `authenticator` parameter in `verifyAuthenticationResponse` was renamed to `credential` (with `publicKey` replacing `credentialPublicKey`). Passkeys could neither be registered nor used since the v10 upgrade.
- **Legal page placeholder rendering** — `<<NAME>>` and similar unfilled placeholders in imprint / privacy policy were mangled by the HTML parser to `<>`. Fix: the `<<` characters are now HTML-encoded (`&lt;&lt;NAME&gt;&gt;`) before the markdown render.

### Changed
- **Full backup now includes `passkey_credentials`** — The table was missing from `BACKUP_TABLES`. Passkeys now survive a JSON restore to the same server (WebAuthn is domain-bound; restoring to a different domain still requires re-registering passkeys).

---

## [v3.1.3] — 2026-05-17

### Added
- **ICS calendar export in route planner** — Planned routes can be downloaded as an `.ics` file and imported into any calendar app. The export includes departure, arrival, intermediate charging stops, and a note recommending the calendar "Private" setting for shared calendars. `CLASS:PRIVATE` is set automatically.
- **Improved tire pressure view (TireMap)** — New SVG top-down car silhouette with color-coded tires (green / yellow / red) and a glow effect based on pressure level. Legend and per-tire tooltip with full position label.
- **Layout toggle in vehicle control** — Users can switch between tile layout and compact list view. Preference is persisted via `localStorage`.
- **Recuperation statistics in trip detail** — Shows recovered kWh, recuperation share in %, and net consumption after recuperation. Calculated via SQLite `LEAD()` window function on `trip_points.power_kw < 0`.

### Improved
- **Touch dropdowns in Tesla in-car browser** — `e.stopPropagation()` on trigger click prevents immediate close by the document listener; `touch-action: manipulation` eliminates 300 ms tap delay in NavGroup and LangSwitcher.
- **Setup: nginx now optional** — `deploy/setup.sh` prompts for deployment mode (Direct / Proxy) at startup. Mode 2 skips nginx/certbot installation and configuration entirely — no more conflicts with existing reverse-proxy setups (e.g. WireGuard + VPS nginx).
- **`TESLA_AUTH_BASE` added** — Variable is now written automatically by `setup-wizard.sh` and documented in `.env.example`. `telemetryConfig.js` includes a fallback value for existing installations.

### CI / Infrastructure
- **Docker images pre-built in CI (GHCR)** — Backend and frontend images are now built as multi-arch (amd64/arm64/arm/v7) in GitHub Actions and pushed to `ghcr.io/knevs/tesla-carview`. The server only runs `docker pull + up` — no local compilation (node-gyp / better-sqlite3) anymore. Deploy time: ~3 min instead of 10–37 min.
- **Deploy via `workflow_run`** — Deploy only starts after CI completes successfully; guarantees GHCR images exist before the server pulls them.
- **GitHub Actions updated to Node.js 24** — `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `docker/build-push-action` bumped to current major versions; Node.js 20 deprecation warnings eliminated.

---

## [v3.1.2] — 2026-05-17

### Added
- **SMTP / e-mail configuration in wizard and admin UI** — Mail delivery (Nodemailer) is configured directly in Admin → System or during the setup wizard's Monitoring step. No server-side `msmtp` installation required; all SMTP parameters (host, port, user, password, sender address) are stored in the tenant database. A test-mail button confirms delivery immediately.
- **Anthropic API key in wizard and admin UI** — The key for AI-powered autonomous monitoring (autofix-ai / Claude Haiku) can now be entered in Admin → System → Monitoring or during the wizard's Monitoring step. Previously required direct server access.

### Security
- **Git history cleaned** — Instance-specific operator identity, company name from demo fixtures, and internal operational documentation removed from both repository histories via `git filter-repo`. All instance-specific values (domain, repo names, email addresses, Docker volume name) are now stored exclusively in the gitignored `heal.conf` — the public repo contains no personal data in any commit.

---

## [v3.1.1] — 2026-05-16

### Added
- **Unit preferences applied to all views** — `useUnits()` now active in all 9 views (Dashboard, Trips, TripDetail, Battery, EnergyReport, Control, Telemetry, Fahrtenbuch, RoutePlanner); distance (km/mi), temperature (°C/°F) and efficiency (kWh/100km, Wh/km, mi/kWh) respect user settings. Exception: Fahrtenbuch odometer values remain in km for legal reasons (German BMF/§31a EStG).
- **Greek wiki pages completed** — `EL-First-Login.md` created (full translation incl. 16-step wizard table, MFA, QR-SSO tip); `EL-Features.md` updated with dynamic tariff section; sidebar and home updated.

### Improved
- **Dynamic system hygiene (heal.sh + host-watch.sh)** — Self-healing now handles full automatic system maintenance: swappiness calculated proportionally to RAM size and corrected on every run; swap flush when safe (20% safety buffer); container memory limits via `docker update` (backend 30% RAM, frontend/nginx 5% RAM each); hourly: Docker cleanup (dangling images, build cache >24h, anonymous volumes), journal vacuum (2% of disk), /tmp cleanup (>7 days). All thresholds computed at runtime from host facts — no hardcoded values.
- **Private host alerts** — Monitoring alerts now sent via email instead of public GitHub issues (prevents private server data leakage).

---

## [v3.1.0] — 2026-05-16

### New
- **Full onboarding wizard** — the in-app settings assistant has been extended from 8 preference steps to 17 complete setup steps (admins get 6 critical new steps)
- **Tesla OAuth in wizard** — button opens Tesla login in a popup; PostMessage listener closes the window and refreshes status automatically
- **Vehicle sync in wizard** — vehicles can be synced directly from the assistant with real-time feedback
- **Virtual Key step** — status from `/telemetry/status`, registration URL copyable + directly openable, status refresh button
- **Fleet Telemetry step** — per vehicle: color-coded status badges (live / idle / not_registered / approval_missing / error) + direct configure button
- **Electricity price step** — configurable per vehicle, saved on final confirm
- **Legal check step** — automatically scans all 18 scope×locale combinations for `<<placeholders>>`; link to editor for open items
- **Full i18n** — all 6 languages (DE/EN/FR/ES/TR/EL) with 63 new keys each for the wizard steps

### Step order (admin)
`Language → Tesla OAuth → Vehicles → Virtual Key → Fleet Telemetry → Electricity Price → Legal → External APIs → Monitoring → Design → Color → Units → Dashboard → Navigation → Notifications → Summary`

---

## [v3.0.0] — 2026-05-15

### Major Milestone — Car Usability Management

With v3.0, Tesla Carview becomes a full **Car Usability Management** platform:
far more than a data logger — a holistic system for vehicle usage, operations, cost management and trip planning.

### New in v3.0
- **Platform rebrand** — Tesla Carview becomes a Car Usability Management System; new description across all documents and languages
- **Demo sandbox** — public test environment with real UI and synthetic vehicle data; 2-day test account; accessible at `demo.teslaview.krische.com`
- **User management** — self-delete guard (own account cannot be deleted), delete button clearly styled as a destructive action
- **Deploy pipeline** — private overlay files are restored before `git pull` and re-applied afterwards; no manual intervention needed

### Complete: all features from v2.0–v2.4
Multi-tenancy, route planner with SoC-aware charging stops, route avoidance (Valhalla), Passkey/WebAuthn + QR-SSO for Tesla browser, settings wizard, dynamic dashboard, legal layer (imprint/privacy/terms with acceptance tracking), 6 languages (DE/EN/FR/ES/TR/EL), monitoring & self-healing, OCM charger overlay, HERE Maps traffic, sleep monitor, energy report, automations, maintenance log, logbook (tax-compliant), billing, web push, encryption at rest.

---

## [v2.4.0] — 2026-05-15

### Added
- **Route avoidance** — Route Planner can now avoid motorways, toll roads and ferries; routing via Valhalla public API (OSRM does not support this); setting is persisted in the browser; automatic fallback to OSRM with a warning toast if Valhalla is unreachable
- **OpenChargeMap API key management** — OCM key can be entered, viewed (masked) and deleted directly in Admin → System, no SSH access required; missing-key toast includes a direct link to settings; registration links shown in the UI
- **Monitoring & self-healing** — Cron job `heal.sh` checks container status and `/api/health` every 15 min; restarts services automatically on failure; optional email alert; heal toggle and alert address configurable in Admin → System; heal and security logs viewable in admin UI

### Improved
- **System health** — 8 checks instead of 5; live HTTP probes for OCM and HERE Maps; optional services appear as `info` entries (dimmed, not counted as error when not configured), with "Set up →" link to the API key section
- **update.sh** — more robust deploy flow: explicit stop → prune → up instead of plain `up --build` (prevents container name conflicts on quick redeploys)

---

## [v2.3.0] — 2026-05-14

### Added
- **SoC-aware charging plan** — Route Planner plans intelligent charging stops with time estimates; departure SoC auto-filled from live vehicle data (ad-hoc) or manually entered (scheduled departure); configurable target SoC at destination and charge-to SoC per stop
- **Route Planner layout** — left column scrollable+sticky so map stays visible; section order optimised
- **Collapsible Settings** — all 17 Settings sections collapsible\/expandable via SortableSection
- **Demo company vehicle** — demo tenants get a 2nd vehicle (category=company, Model 3) with business trips for billing demo
- **Fahrzeugtechnik demo data** — DEMO vehicles return plausible fake telemetry without Tesla API calls
- **Location heatmaps fixed** — Leaflet tiles now routed through backend tile proxy (no more CSP block)
- **Sections expanded by default** — all sections initially expanded for new users

### Improved
- **i18n** — SoC UI keys in all 6 languages (de\/en\/fr\/es\/tr\/el)
- **SortableSection** — sortable prop hides drag handle when not reorderable

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
- **Full backup + restore** — JSON export of all tables, safety pre-backup before restore
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

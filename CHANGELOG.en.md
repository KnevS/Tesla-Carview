# Changelog

All notable changes are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> 🇩🇪 [Auf Deutsch lesen](CHANGELOG.md)

---

## [v3.32.2] - 2026-06-21

### Changed

- **Deploy health check**: after bringing containers up, the deploy workflow now actively probes `http://localhost:8080/api/health` (up to 12× over ~36 s) and fails if the backend doesn't answer via the host-nginx port — printing the last backend logs and the nginx port mapping. Lesson from the 2026-06-21 502 outage that previously passed silently as "success".

---

## [v3.32.1] - 2026-06-21

### Changed

- **i18n catch-up for `TariffWidget` and `ServiceIntervalsCard`**: both components were hard-coded German and are now fully localised (electricity-price widget + service intervals incl. status labels, due/forecast texts, modal, buttons, alerts) — in all seven languages. Date, number and price formatting now follows the active language. Pure improvement, no behaviour change.

---

## [v3.32.0] - 2026-06-21

### Added

- **Operational self-check (roadmap drop 06 — completes the value-drop roadmap)**: a new admin self-check under **System** verifies security and backup integrity on demand (and automatically every week in the nightly maintenance run): MFA coverage, encryption key, critical secrets, audit-log activity, **SQLite integrity check**, plus recency and **integrity of the last backup** (file present, size, valid JSON, all tables included) — as a traffic-light report. New service `backend/src/services/selfCheck.js` + routes `GET/POST /api/system/self-check[/run]` (requireAdmin), weekly run in `nightlyMaintenance`. Persisted via `tenant_settings` (no DB migration). Pure diagnostics, no AI. The existing system-health banner (Tesla API budget, poller latency, circuit breaker) stays alongside as the live operations overview.

---

## [v3.31.0] - 2026-06-21

### Added

- **Predictive maintenance & 12-month cost outlook (roadmap drop 05)**: service intervals now show a **time forecast** alongside the "X km left" figure — based on your actual mileage (avg km/day over the last 90 days) it projects when a km-based interval will be due ("≈ in ~6 weeks"). The TCO cockpit gains a **12-month cost outlook** (maintenance + electricity from the last 12 months projected forward, plus insurance/tax). The HU/TÜV date runs as a regular interval with its countdown. Backend: `computeStatus` extended with `predicted_days`/`km_per_day`, new route `GET /api/tco/vehicles/:id/forecast`. Pure statistics, no AI, no DB migration. Localised in all seven languages.

---

## [v3.30.0] - 2026-06-21

### Added

- **Proactive weekly insights (roadmap drop 04)**: new dashboard card "Your week" — the assistant speaks up on its own with short plain-text hints from the last 7 days: mileage, consumption vs. your 90-day average (incl. a data-driven "… likely due to cold" reason based on the week's temperature), charging cost and open anomalies. New service `backend/src/services/insightEngine.js` + route `GET /api/insights/weekly` (user-scoped via `vehicle_users`). **Pure statistics, no AI** — an optional LLM polish (locally via Ollama) can be added later once an AI provider is active; the card works without any provider. Localised in all seven languages.

---

## [v3.29.0] - 2026-06-21

### Added

- **Personal range instead of WLTP (roadmap drop 03)**: the route planner now estimates the arrival state of charge from your **own, temperature-dependent consumption** instead of the WLTP range. New service `backend/src/services/consumptionModel.js` derives the expected kWh/100 km from your trip history; when the destination temperature is known, only trips within a ±7 °C window are used (cold/heat extra consumption, data-driven). The planner also shows a **confidence band** (expected single-trip variation), the data basis (consumption at X °C or personal average) and a **"could get tight" warning** when the band reaches into the critical zone. New route `GET /api/routing/consumption-model` (scoped per vehicle; also estimates usable capacity from rated range + WLTP model consumption). Pure statistics, no AI; falls back cleanly to the previous WLTP estimate without enough data. Localised in all seven languages.

---

## [v3.28.0] - 2026-06-21

### Added

- **Standby-drain trend warning (roadmap drop 02, part 2 — drop 02 complete)**: the phantom-drain section no longer warns only on individual spikes but detects a **sustained** elevated standby drain: the last 7 days' median is compared against the 30 days before. At sustained >0.8 %/h (elevated) or >1.5 %/h (high) a coloured hint banner with guidance appears (sentry mode, always-connected apps, have the BMS checked). `GET /api/battery/phantom-drain` now returns an `assessment` block (recent/baseline median, trend, severity). Pure statistics, no AI. Localised in all seven languages; README + handbook (DE/EN) updated for drop 02.

---

## [v3.27.0] - 2026-06-21

### Added

- **Battery health with forecast (roadmap drop 02, part 1)**: a new "Health & forecast" section in the battery view. From the existing `battery_snapshots` it derives the daily range normalised to 100 % SoC, runs a least-squares regression on it and projects it into the future — with a 95 % confidence band. Shows the degradation rate (%/year and km/year), today's range at 100 %, the projected range in 3 years (incl. spread) and the estimated time until 80 % of the starting value; chart with measured points, 7-day smoothing, forecast line and band. **Pure statistics, no AI** — deliberately without an external maths library (supply-chain hygiene). New route `GET /api/battery/forecast` (scoped per vehicle/tenant via `vehicle_users`, admins see all) + service `backend/src/services/batteryForecast.js`. Localised in all seven languages.

### Notes

- Second roadmap drop (see `docs/roadmap.md`). The forecast appears only from ≥ 14 measurement days — until then an explanatory hint instead of an empty chart. The "100 %" reference is the starting value of each series (consistent with the existing degradation overview).

---

## [v3.26.0] - 2026-06-21

### Added

- **Cheapest charging windows (roadmap drop 01, completes the charging trilogy)**: a new "Cheapest charging windows" section in the charging view. Shows the current electricity price, the cheapest **4-hour and 8-hour window** in the next 24 hours (start/end/avg price) and a labelled hourly grid with price-band colouring (green < 10 ct, yellow < 25 ct, red above; the cheapest 4h window highlighted green). Data comes from the existing `GET /api/tariff/prices` route (aWattar/Tibber). If no tariff provider is set up, an explanatory hint is shown instead of an error. New component `frontend/src/components/ChargingTariffWindows.vue` — unlike the compact dashboard `TariffWidget` it is fully localised in all seven languages.

---

## [v3.25.0] - 2026-06-21

### Added

- **Cost breakdown by charging location (roadmap drop 01)**: a new "Cost by location" section in the charging view shows, per location, the number of charges, kWh added, total cost and the average €/kWh price — with a home/away marker. Charges marked as free count as €0. Backend: new aggregating route `GET /api/charging/cost-by-location` (pure SQL aggregation, scoped per tenant/vehicle, mounted before `/:id`). Localised in all seven languages.

---

## [v3.24.0] - 2026-06-21

### Added

- **Per-session charge timeline (roadmap drop 01)**: in the charging list, "📈 View timeline" opens a detail view for the individual session. It shows the **power and state-of-charge curve over time** (dual axis kW/%, from the already-recorded `charging_points`), plus key figures: duration, state-of-charge progression incl. delta, energy added, average and peak power, and cost and rate. It also reports **grid draw and charging loss as a clearly labelled estimate** — Tesla only reports the energy added to the battery, so this is scaled up with an efficiency assumed per charger type (AC ~88%, DC/Tesla ~94%). New component `frontend/src/components/ChargingSessionDetail.vue`, fed by the existing `GET /api/charging/:id`; fully localised in all seven languages.

### Notes

- First of six bi-weekly value-drops — the planned order lives in `docs/roadmap.md`. The aggregated charging curve in "Battery" (avg peak power per SOC band across all sessions) is untouched; this view deliberately shows the timeline of a **single** session.

---

## [v3.23.8] - 2026-06-21

### Changed

- **Browser language now takes precedence over the tenant default**: the language resolution order was reworked. New order (highest priority first): explicit user preference (`user.lang`) → browser language (`navigator.language`, persisted to `localStorage` on first visit) → `localStorage` → tenant default (`tenantDefaultLocale`, only on the very first visit with no browser match) → `de`. Previously the tenant default overrode the browser-detected language after login. `applyFromUser()` now applies **only an explicitly set `user.lang`** and otherwise leaves the detected browser language untouched (`frontend/src/store/lang.js`).

### Fixed

- **Geo language detection now also updates the Pinia store**: when the geo response returns a different language, the language store (`useLangStore().current`) is now updated alongside `i18n.global.locale` and `localStorage`, so the language selector in the UI reflects the choice immediately — done via dynamic import to avoid a circular dependency (`frontend/src/plugins/i18n.js`).

---

## [v3.23.7] - 2026-06-21

### Fixed

- **CI: version badge no longer gets stuck out of date**: The "Update Version Badge" workflow pushed straight to `main` via `git push` after every version bump — which fails against branch protection (9 required checks must pass on any new commit), so the README badge was stuck at `v3.22.0` while the code was already at `v3.23.6`. The workflow has been **removed entirely**; the badge in `README.md`/`README.en.md` now reads the version through a dynamic [shields.io](https://shields.io) endpoint (`github/package-json/v`) directly from `backend/package.json` — it updates itself, with no commit, push or PAT.
- **CI: Dependabot auto-merge labels major bumps correctly again**: The "Label major bumps" step called `gh label create` without repo context and failed with `fatal: not a git repository` (the job deliberately has no checkout). Fixed with a job-level `GH_REPO: ${{ github.repository }}` that gives every `gh` call its repo context. Patch/minor bumps kept merging fine (their `gh pr merge` derives the repo from the full PR URL).

---

## [v3.23.6] - 2026-06-20

### Security

- **Partner registration & telemetry config hardened against unauthenticated access**: `backend/src/routes/telemetryConfig.js` is mounted twice in `index.js` — publicly under `/.well-known/appspecific` (before `app.use(requireAuth)`, so Tesla can fetch the public key) and under `/api/fleet` (behind auth). As a result `POST /partner/register`, `POST /telemetry/configure[/:vin]` and `GET /telemetry/status` were reachable **without authentication** via the public mount; since `getTenantSetting` falls back to `.env` when no tenant DB is present, an unauthenticated caller could have triggered a Tesla partner registration using the operator's credentials. Fix: the write routes now require `requireAuth + requireAdmin`, the status route requires `requireAuth`; only the public-key GET stays open.
- **Registration domain no longer client-controllable**: in v3.23.5 `POST /partner/register` accepted an optional `domain` from the request body as a fallback. That body value is no longer read — the domain is determined entirely server-side (`FRONTEND_URL`, otherwise the server-observed `Host` header). Tesla verifies the domain via the public-key path anyway, so no divergent value can be registered.

---

## [v3.23.5] - 2026-06-20

### Added

- **Tesla app registration directly in the wizard ("flagship")**: Previously the one-time partner registration with Tesla (`POST /api/1/partner_accounts`) — a prerequisite for unlocking Fleet Telemetry (live GPS) at all — had to be done by hand with `curl`. Now the setup wizard (Admin hub → 🛠️) does it for you: enter Client ID + Secret, confirm the detected domain once, one click on "🔑 Register with Tesla now" (or simply "Next") — TeslaView fetches a `client_credentials` token in the background and registers the app with Tesla. Success is remembered and a re-registration is offered after a domain change. New fields in `GET /api/system/tesla-credentials` (`domain`, `partner_registered_domain`); `POST /api/fleet/partner/register` now accepts an optional `domain` (fallback when `FRONTEND_URL` is unset) and persists success in `tenant_settings`.

### Security

- **Security hygiene of the auto-registration**: The client secret never leaves the server (encrypted in `tenant_settings`, read server-side, sent only to Tesla's token endpoint — never to the browser). The registered domain is not freely choosable: `FRONTEND_URL` (the operating domain) is authoritative, a value sent by the client is only a fallback. This prevents a divergent browser value from registering a wrong domain; Tesla verifies the domain anyway via the public key at `/.well-known/appspecific/com.tesla.3p.public-key.pem`. Input is validated as a hostname; the route is admin-only.

---

## [v3.23.4] - 2026-06-20

### Fixed

- **Fleet login stayed stuck in paused owner mode (`OWNER_API_PAUSED`)**: Once a Tesla account had been connected in owner-API mode (`tesla.auth_mode='owner'`) and the owner API was later paused, even a correct Fleet OAuth login left the tenant trapped in that state — because `exchangeCode()` never reset the mode. As a result every Fleet API call (including `fleet_telemetry_config`) internally threw the `OWNER_API_PAUSED` sentinel despite valid fleet tokens, and per-vehicle telemetry setup failed with "last attempt failed". Fix: a successful fleet login in `backend/src/services/teslaApi.js` now mirrors `exchangeOwnerCode()` by setting `tesla.auth_mode='fleet'` and clearing `tesla.owner_api_paused`.

---

## [v3.23.3] - 2026-06-15

### Security

- **IDOR read paths in battery companion (anomalies-persisted, precondition-suggestions) closed**: `GET /api/battery/anomalies-persisted` and `GET /api/battery/precondition-suggestions` previously filtered only on an optional `vehicle_id` query parameter. A driver account could therefore read full lists of battery anomalies and preconditioning suggestions across the tenant (including display names and details JSON of other vehicles) and enumerate them by varying `vehicle_id`. Fix: for non-admins the WHERE clause is extended with `vehicle_id IN (SELECT vehicle_id FROM vehicle_users WHERE user_id=?)`, so drivers only see rows for vehicles assigned to them; admin view unchanged. Complements the write-path IDOR fix from v3.23.2.
- **Known remaining IDORs in `backend/src/routes/battery.js`**: `GET /snapshots`, `GET /degradation`, `GET /charging-curve`, `GET /efficiency-by-temp`, `GET /phantom-drain`, `GET /anomalies`, `GET /health-summary` and `POST /snapshot` still filter on a user-supplied `vehicle_id` without an ownership check. They will be addressed in a separate sweep using an ESLint rule or middleware pattern once the frontend call sites are audited.

---

## [v3.23.2] - 2026-06-15

### Security

- **IDOR (authorization) on TCO read paths closed**: `GET /api/tco/vehicles/:id` and `GET /api/tco/vehicles/:id/service-records` returned data to any authenticated user who knew the `vehicle_id` — no ownership check. A driver account could therefore enumerate TCO figures and service history of other vehicles in the same tenant. Fix: new helper `assertVehicleAccess(req, vehicleId)` in `backend/src/routes/tco.js` with an admin bypass plus `SELECT 1 FROM vehicle_users WHERE vehicle_id=? AND user_id=?` for drivers; responds `403 'Kein Zugriff auf dieses Fahrzeug'` when not assigned. Pattern taken from `routes/owntracks.js`. The TCO write endpoints stay admin-only and were not affected.
- **IDOR (authorization) on battery-anomaly mutations closed**: `POST /api/battery/anomalies-persisted/:id/seen`, `…/dismiss` and `POST /api/battery/precondition-suggestions/:id/dismiss` ran their `UPDATE` based only on the row `id`. A driver account could therefore mark foreign battery anomalies and preconditioning suggestions as seen/dismissed. Fix: each of the three `UPDATE` statements gets an additional `vehicle_id IN (SELECT vehicle_id FROM vehicle_users WHERE user_id=?)` clause with an admin bypass (`? = 1 OR …`); when `r.changes === 0` the endpoint responds with `404`, so neither the existence nor the access state of the foreign row is leaked.

---

## [v3.23.1] - 2026-06-15

### Fixed

- **Restart banner in admin settings was hidden during the restart it announced**: The "Server is restarting…" banner in `AdminSettings.vue` used `sticky top-2 z-50`, but `MaintenanceOverlay` (which covers the screen while the backend restarts) is `fixed inset-0 z-index:100`. The banner therefore disappeared exactly when it was needed — after clicking "Restart now" the admin only saw the maintenance page, no progress or success indication. Fix: banner switched to `fixed top-2 left-1/2 -translate-x-1/2 z-[200]` with responsive `w-[min(640px,calc(100vw-1rem))]`, so it floats centered above the overlay and the green success banner stays visible once the `app-up` event fires.

---

## [v3.23.0] - 2026-06-11

### Security — supply-chain hardening

An external security review on 2026-06-11 flagged two main risks for AI-assisted development: AI-slop in PII/auth/crypto code paths, and blind addition of NPM dependencies. This release closes the remaining gaps in the CI pipeline:

**CI workflows extended** (`.github/workflows/`):
- `security.yml` → new jobs:
  - **`semgrep` (SAST)** with OWASP-Top-10 + JS/TS + Secrets rule packs, `--metrics=off` for data minimization. **Currently informational** (`continue-on-error: true`) — today's baseline produces 17 findings (Dockerfile-USER, nginx host-header, GCM-no-tag-length, express-traversal, tls-verification, h2c-smuggling). These will be triaged in follow-up PRs; the job will then flip to blocking.
  - **`sbom` (CycloneDX)** for backend and frontend as build artifact, 90-day retention. Generated ad-hoc via `npx @cyclonedx/cyclonedx-npm` — no new runtime dependency.
- `ci.yml` → `npm ci` replaced with `npm ci --ignore-scripts` (backend + frontend). Blocks blind execution of `postinstall` hooks of external packages in the CI runner. Lint/build don't need native code; production Dockerfiles build native deps (`argon2`, `better-sqlite3`) in a separate step.

**What was already in place and stays unchanged:** gitleaks (full-history secret scan), trivy fs (lockfiles + Dockerfile base images), npm audit (backend + frontend, prod-only blocking, weekly Mon 06:00 UTC), CODEOWNERS for sensitive paths (auth, crypto, DB, audit, external APIs, lockfiles).

**Auto-update (NEW):**
- `dependabot.yml` extended with `package-ecosystem: docker` for the backend and frontend Dockerfiles. GitHub-Actions schedule synchronised to weekly Mon 06:00 Europe/Berlin; every ecosystem groups minor+patch.
- **`.github/workflows/dependabot-auto-merge.yml`** — new workflow that auto-merges Dependabot PRs for `patch` and `minor` once all CI gates are green (`gh pr merge --auto --squash`). Major bumps are labelled `major-bump` + `needs-review`.
- **Prerequisite in the GitHub repo settings**: enable "Allow auto-merge" at repo level; branch protection on `main` must not require reviews from `dependabot[bot]` (required checks stay enabled).

**Scope:** no code-path changes in backend or frontend, no production deploy risk. CI-only expansion.


## [v3.22.0] - 2026-06-08

### Added — GPS setup wizard for end users

New 5-step wizard `GpsSetupWizard.vue` guiding non-admin users through OwnTracks setup. Until now users had to either open the AdminSetupWizard (admin-only, lots of irrelevant fields) or click through MyTracking manually — neither was great for first-run.

**Steps:**
1. **Welcome** — why OwnTracks (Owner API is dead), what you get, privacy note
2. **Install app** — platform toggle (iOS/Android, initial via UA), store links (App Store, Play Store, F-Droid recommended), background-location hint
3. **Create device** — label + vehicle + default trip type, then QR-code display + .otrc file download
4. **Test recording** — live check whether first ping arrived, with "Check now" button and troubleshooting tips
5. **Bluetooth validation (optional)** — iOS Shortcut hint or Android Tasker hint, with skip note

**Trigger:**
- "🧭 Setup wizard" button top-right on MyTracking.vue (visible to all users)
- After wizard finish: `load()` of the devices list so the new device appears immediately

**i18n:** New `gpsSetup` section with ~50 keys in all 7 languages (DE/EN/FR/ES/TR/EL/UK).

Follows the usability rule: every first-run install should be doable without external docs.

---

## [v3.21.0] - 2026-06-08

### Added — Service-log entries are editable (with audit log)

Until now, service-log entries could only be created and deleted. Corrections required "delete + recreate", losing the audit trail. Now:

- **Edit button (✎)** next to every entry in the list
- The form is reused (POST or PUT depending on `editingId`)
- Header switches to "Edit entry" instead of "New entry"
- A small blue `✎ edited` badge with tooltip "Last edited: …" appears when `updated_at > created_at`

**Audit log for ALL logbook mutations:**
- `logbook.create` → `{id, vehicle_id, title, category, entry_date, cost}`
- `logbook.update` → `{id, vehicle_id, changes: {field: {before, after}}}` — only the actually changed fields, no spam on no-op save
- `logbook.delete` → `{id, vehicle_id, snapshot: {…full entry data…}}` — allows manual restore from the log

**Backend hardening:**
- PUT checks existence (404 instead of silent no-op)
- DELETE checks existence and writes a snapshot to the audit for restore
- PUT returns the updated row (incl. `created_by_username`)

**i18n (all 7 languages):**
- New keys `maintenanceLog.editEntry`, `editTooltip`, `editedLabel`, `editedTooltip`

Follows the consistency rule: every backend mutation audited, frontend invalidates immediately.

---

## [v3.20.0] - 2026-06-08

### Added — TCO cockpit leasing extension

Until now the TCO cockpit only modeled purchased vehicles cleanly. It now also supports leasing contracts with full cost breakdown.

**Schema (vehicles table, new columns):**
- `is_leasing` (0/1) — financing type
- `leasing_down_payment_eur` — down payment
- `leasing_monthly_rate_eur` — monthly rate
- `leasing_term_months` — contract term
- `leasing_buyback_eur` — residual/buyback price (counted only after term ends or on early buyback)
- `leasing_included_km` — total included km
- `leasing_extra_km_rate_eur` — €/km for extra distance

**TCO computation under leasing:**
- Depreciation cost = down payment + (months elapsed × monthly rate) + buyback (if term ended)
- Extra-km cost = max(0, driven_km − prorated_expected_km) × rate
- Purchase logic unchanged (`depreciation_kind: 'purchase' | 'leasing'`)

**Tco.vue frontend:**
- "💶 Purchase" / "📄 Leasing" toggle at the top of the master-data form
- Under leasing: down payment, monthly rate, term, buyback, included km, extra-km rate (instead of purchase/sale price)
- Read mode shows the financing type as a badge
- Extra-km cost is shown in read mode as an amber warning once > 0

**i18n (all 7 languages):**
- New keys `tco.base.purchaseType.purchase` + `tco.base.purchaseType.leasing`
- New subsection `tco.base.leasing.*` with 12 keys (startDate, termMonths, downPayment, monthlyRate, buyback, includedKm, extraKmRate, etc. + tooltips)

### Fixed — Marketing site: bento cards 9-12 missing grid classes

The cards App-Hub, Nearby, Charging-locations-with-auto-limit and OwnTracks-validation were only marked as `.b-card` without a `.b-N` class. That meant they fell out of the `repeat(12, 1fr)` grid and rendered "naked" stacked below each other. Fix: `.b-9` span 8, `.b-10` span 4, `.b-11` span 7, `.b-12` span 5; plus responsive steps for tablet and mobile.

---

## [v3.19.0] - 2026-06-08

### Added — Full multilingual coverage (sprint "Complete 7-language coverage")

All parts of TeslaView now exist **in full** across all 7 languages:

**App frontend (`frontend/src/locales/`):**
- `uk.json` expanded from 523 keys (24 % coverage) to **2176 keys (100 % coverage)** — 35 missing sections filled in (adminSetup, wizard, control, settings, routes, handbook, system, setup, maintenanceLog, telemetry, energy, register, automations, mfa, users, billing, legal, chargers, sleep, webhooks, chargingLocations, annualReport, pair, climate, community, grok, invite, teslaUsage, exportPage, data, launcherAdmin, chargingHeatmap, logbook, locationHeatmap, drivers)
- Other AI languages (fr, es, tr, el): already at 100 % coverage, confirmed via audit
- Translated by 8 parallel AI subagents in one sprint

**README (7 languages):**
- New: `README.fr.md`, `README.es.md`, `README.tr.md`, `README.el.md`, `README.uk.md`
- Cross-language header in DE+EN extended to all 7 languages
- AI disclaimer in every language under the header

**docs/* (16 files × 7 languages = 112 files):**
- New in FR/ES/TR/EL/UK, 16 files each: README, 01-quickstart, 02-deployment, 03-authentication, 04-tesla-api, 05-security-architecture, 06-fail2ban, 07-setup-wizard, 08-dokploy, 09-tesla-api-usage, 10-configuration, 11-operations, 12-high-availability, 13-roadmap-ideas, 14-network-access, 15-raspberry-pi-storage
- AI disclaimer as banner right under the H1

**Wiki (`.github/wiki/`, 14 pages × 7 languages = 98 files):**
- New in UK: all 14 wiki pages
- EL completed from 2 to 14 pages (12 new)
- Wiki sync workflow triggers automatically on `.github/wiki/**` push

**Marketing site (separate repo, already in v3.18.0):**
- Slide-dropdown language switcher with all 7 languages
- 160 marketing keys translated to 7 languages

**Setup wizards (AdminSetupWizard + Wizard section):**
- Fully translated to UK (208 + 168 keys), consistent with the other 6 languages

### Roadmap

- **v3.20.0**: TCO cockpit leasing extension
- **v3.21.0**: GPS setup wizard

---

## [v3.18.0] - 2026-06-08

### Changed — Marketing site: language switcher as slide dropdown + UK replaces ZH

The 7-button language toggle on the marketing site took too much space in the top nav. Now: compact single button with current flag + code that opens a slide dropdown with all 7 languages on click (outside-click and Escape close it).

- **Slide dropdown** instead of a 7-button row — opacity + translateY transition (180 ms), chevron rotates 180° when open
- Active language is subtly highlighted in red (`rgba(227,25,55,.14)` + `--r-300`)
- ARIA: `role="listbox"`, `aria-haspopup`, `aria-expanded`, `data-open` attribute for CSS state
- Outside-click + Escape key close the menu reliably

### Changed — App + marketing: Chinese (zh) replaced with Ukrainian (uk)

Chinese was withdrawn after reflection — Ukrainian fits TeslaView's self-hosted/open-source profile better (higher per-capita Tesla affinity in the Ukrainian diaspora plus a solidarity aspect).

- **App frontend**: `frontend/src/locales/zh.json` replaced with `uk.json`. `SUPPORTED_LOCALES` and `AI_TRANSLATED_LOCALES` now contain `uk` instead of `zh`. `fallbackLocale: { uk: ['en', 'de'] }`. `LANGS` entry with flag 🇺🇦 and label `Українська`
- **Marketing site**: `i18n.js` `zh:` block fully replaced with `uk:` block (160 keys translated). Browser auto-detect now reacts to `uk-*` instead of `zh-*`
- AI disclaimer updated in all 7 languages: `FR/ES/TR/EL/UK` → `FR/ES/TR/EL/UK`
- Locale map for `screens_updated` date formatting extended with `uk: "uk-UA"`
- Stat sub for the language KPI: `DE · EN · FR · ES · TR · EL · UK`

---

## [v3.17.0] - 2026-06-08

### Added — Marketing site in 7 languages + AI disclaimer

The marketing site teslaview-web was DE+EN only. Now 7 languages matching the app: **DE + EN + FR + ES + TR + EL + UK**.

- Language toggle extended from 2 to 7 buttons (DE/EN/FR/ES/TR/EL/中)
- Browser auto-detect now reacts to `zh-*`, `fr-*`, `es-*`, `tr-*`, `el-*`
- AI disclaimer prominent in the footer: "🤖 Translations for FR/ES/TR/EL/UK are AI-assisted from DE/EN. Corrections welcome via GitHub." shown in each native language
- 155 marketing keys × 5 new languages = 775 new translations
- Translations generated in parallel by 5 subagents in one sprint

### Changed — MyTracking nav moved

Previously in "Analytics" — logically wrong, MyTracking is setup/config. Now in "Planning" (`plan` group) next to charging locations and automations.

### Up next

- **v3.18.0** = TCO cockpit leasing extension (down payment, monthly rate, term, residual value/buyback, included km)
- **v3.18.x** = GPS setup wizard for MyTracking
- **v3.19.x** = App zh.json filled out completely (from 10 % → 100 %)

---

## [v3.16.1] - 2026-06-08

### Fixed — TCO cockpit: direct link to master data

When the TCO cockpit banner "Master data incomplete" appeared, the user had to find the master-data section manually. Now:

- The banner has a clickable **"✎ Open master data now →"** button
- Click opens the master-data form **and** smooth-scrolls to it (anchor `#tco-base-form`)
- i18n key `tco.jumpToBase` in all 7 languages
- Follows the usability rule: every warning must reach the actionable area in one click

---

## [v3.16.0] - 2026-06-08

### Added — Chinese (zh) as 7th language + AI-translation transparency

**Languages extended from 6 to 7:** Chinese (Simplified, zh) added — China is one of the biggest EV/Tesla markets, this keeps multilingual coverage consistent.

- `frontend/src/locales/zh.json` with ~220 core strings (10% of the ~2174 DE keys). Key sections fully translated: `common`, `nav`, `dashboard`, `trips`, `charging`, `battery`, `myTracking`, `footer`, `auth`, `notices`, `tripDetail`, `poi`, `nearby`, `launcher`, `lang`
- Remaining strings fall back via `fallbackLocale: { zh: ['en', 'de'] }` to English (secondary) then German (tertiary)
- `SUPPORTED_LOCALES = [..., 'zh']` + `LANGS` array extended (flag 🇨🇳, label `中文`)
- Language switcher in `LangSwitcher.vue` automatically lists all 7 languages
- Auto-detection via `navigator.language` now triggers on `zh-*` too

### Added — AI translation transparency

- New constant `AI_TRANSLATED_LOCALES = ['fr', 'es', 'tr', 'el', 'zh']`
- **AppFooter** shows a discreet disclaimer for these locales: "🤖 Translations for FR/ES/TR/EL/UK are AI-assisted from DE/EN. Corrections welcome via GitHub."
- i18n key `footer.aiTranslation` in all 7 languages — every native speaker sees it in their own language
- Memory pattern captured in `feedback_ai_translation_transparency.md` for all future multilingual projects

### Data concept

Disclaimer is a passive UI marker, no tracking, no phone-home. Native speakers can submit corrections via GitHub issues.

### Roadmap

- **v3.17.0**: GPS setup wizard (analog to `AdminSetupWizard`) — step-by-step through OwnTracks device creation + Bluetooth setup
- **Marketing site separate sprint**: `teslaview-web/i18n.js` to 7 languages (~159 keys × 5 new = ~795 strings, own push)

---

## [v3.15.2] - 2026-06-08

### Added — App hub: TFF-Forum

[**TFF-Forum**](https://tff-forum.de) joined the app hub — the largest German-speaking Tesla community with daily posts about range, charging, Tesla software updates, tips & tricks. No forced account, privacy-friendly, runs in the Tesla browser.

Region: DE-tagged (visible to German-region tenants when the regional filter is on).

---

## [v3.15.1] - 2026-06-08

### Changed — Hygiene catch-up for v3.15.0

- **Handbook in all 6 languages** extended with `### Setup on Android (instead of iOS)` block inside the `{#owntracks-validation}` section — matches the in-app UI (MacroDroid/Automate/Tasker)
- **Wiki Features (FR/ES/TR/EL)** got the messenger FAQ block (DE/EN already had it in v3.15.0)
- Pure docs, no code change

---

## [v3.15.0] - 2026-06-08

### Added — Android setup for Bluetooth validation

Bluetooth setup tab in MyTracking now has a platform picker 📱 iOS / 🤖 Android. Auto-detected from the user agent, switchable manually.

**Android walkthrough** for three apps:
- **MacroDroid** (recommended, free version): Bluetooth trigger + HTTP GET request — step-by-step
- **Automate** (Llamalab, free up to 30 blocks): visual flow
- **Tasker** (€3.49 one-off): Android power-user gold standard

Honest disclaimer: the guide has not been live-verified on Android — there is no Android device on the development side. Open a GitHub issue for fixes; we iterate.

### Changed — iOS hint sharper

`iosFindHint` adds a concrete pointer to where "Get Contents of URL" actually lives (search field "URL", globe icon) + reminder to pick "Create blank automation" instead of Apple's suggestions.

### Changed — Performance (companion engine + location actions)

Three push loops switched from sequential to parallel via `Promise.allSettled` — per anomaly / preconditioning suggestion / location action the Web Push round-trips to all eligible users now run in parallel. With 2-3 driver accounts that's ~200-600 ms saved per notification.

### Changed — Database indexes

Two new hot-path indexes:
- `idx_battery_anomalies_status` — speeds up `notifyNewAnomalies` (`WHERE status='new'`)
- `idx_precondition_status` — speeds up `notifyOpenSuggestions`

Auto-migration in `runTenantMigrations`.

### Docs

- README + README.en gained a FAQ block "Why Telegram, not WhatsApp / Signal?" — table with per-messenger reasoning, made traceable
- Wiki Features (DE + EN) carries the same explanation
- Android setup walkthrough in all 6 i18n languages (`amd1`-`amd5`, `androidApp1/2/3`, `automateDesc`, `taskerDesc`, `androidFeedback`, `androidUntested`, `androidAlternatives`)

---

## [v3.14.0] - 2026-06-08

### Changed — Bluetooth setup radically simplified

Previously fiddly setup (note Bluetooth name in iOS, fill into TeslaView, configure POST method) → now **5-step process with copy-URL + QR code**:

- **GET endpoints in addition** to POST: `/api/owntracks/in-vehicle/start|end/:token` now also reacts to GET. iOS Shortcuts action "Get contents of URL" works without method configuration.
- **Bluetooth pairing name no longer required**: setup counts as active as soon as the first `in-vehicle/start` ping arrives. New column `owntracks_devices.bluetooth_first_seen_at` marks it. Before the first ping the device runs in legacy mode (no filter), after that strictly.
- **Quick-setup UI in MyTracking** with copy buttons + QR codes per URL (for desktop→iPhone transfer) + live status badge "✓ active" after first ping.

### Added — IP protection

Three passive markers against commercial code takeover. **No telemetry**, no phone-home, no server call — only static watermarks:

- **A) Copyright header** in all 198 first-party `.js`/`.vue` files under `backend/src` and `frontend/src`: `© 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0`
- **B) Canary marker**: demo VIN prefix from `DEMO` → `DEMOKRSC` — a GitHub code search for `DEMOKRSC` reveals every fork. (Subtle, hard to remove without source refactoring.)
- **D) Brand footer** in `AppFooter.vue`: "Powered by [TeslaView](github.com/KnevS/Tesla-Carview) · © Sven Krische · PolyForm Noncommercial" — visible on every page.
- **F) Prior-art disclosure** in README.md + README.en.md: all technical procedures are explicitly declared as "prior art" as of the commit date. Prevents later patent filings by third parties on the same procedures.

Privacy guarantee: third-party installations send **nothing** to anyone. Markers become visible only when YOU actively search GitHub for `DEMOKRSC`, the footer text, or a source snippet.

### Backend

- `owntracks_devices.bluetooth_first_seen_at` column + auto-migration in `runMasterMigrations`
- `/qr.png` endpoint now supports `?text=` parameter for arbitrary URLs (in addition to the OwnTracks deep link)
- Webhook filter logic: Bluetooth validation now kicks in after the first `in-vehicle/start` (instead of relying on the pairing name being set)

### Frontend

- `MyTracking.vue` Bluetooth section reworked: two large URL boxes with copy button + QR code per URL, 5-step iOS walkthrough, live status badge
- 13 new i18n keys × 6 languages (setup walkthrough)

### Docs

- README + README.en gained a prior-art disclosure block
- Setup description in the frontend itself (quick-setup disclosure widget)

---

## [v3.13.1] - 2026-06-08

### Changed — Marketing & main-repo docs refresh

Today's seven highlights were already documented in CHANGELOG + handbook, but the **marketing bento** and the **README feature table** still showed the old stack. Caught up:

**README.md + README.en.md** — feature table extended with:
- Battery-Health Companion (Phase 1 + 2 combined)
- App hub (v3.9.0)
- Nearby (v3.13.0)
- Charging locations with auto charge limit (v3.12.0)
- OwnTracks validation (v3.11.0)
- Address before coordinates (v3.10.0)
- Auto-geocoding (v3.8.0)

**Marketing site teslaview-web** — new bento cards:
- bento8 reworked: "Energy & climate" → "Battery-Health Companion"
- bento9: 🚀 App hub
- bento10: 📍 Nearby (POIs & geocaches)
- bento11: 🏠 Charging spots with auto charge limit
- bento12: 🔵 OwnTracks validation
- Stat number 50+ → 60+ features

**Wiki (.github/wiki + wiki repo)** — Features page (DE+EN) extended with the five new sections: App hub, Nearby, Charging locations + auto limit, OwnTracks validation, Address-first + auto-geocoding.

---

## [v3.13.0] - 2026-06-08

### Added — Phase 4: Nearby (POIs + geocaches)

New view `/nearby` shows points of interest around your car, your active charging session or your last trip end. Handy during fast-charge stops — "where's the next toilet / café / playground?".

**Categories:** café · restaurant · fast food · bakery · supermarket · toilets · drinking water · playground · park · picnic · viewpoint · ATM · pharmacy · **geocaches**.

**Data source**: OpenStreetMap Overpass API (free, no account, no API key). Server-side call, locally cached in `poi_cache` for 24 hours. Data-sovereign, no cloud third-party.

**Radius**: 500 m / 1.5 km / 3 km. Clicking a POI opens OpenStreetMap.

**Filter**: every category as a toggle — e.g. show only geocaches for a treasure hunt while charging.

### Backend

- New service `backend/src/services/poiService.js` with Overpass binding, distance sort and cache
- Schema `poi_cache` (lat_key, lon_key, radius_m, types_key) — auto-migration in `runTenantMigrations`
- Routes in `backend/src/routes/poi.js`:
  - `GET /api/poi/types` — available types
  - `GET /api/poi/nearby?lat&lon&radius&types`
  - `GET /api/poi/nearby/charging/:sessionId` — POIs at a charging session
- 15 Overpass filters (amenity/shop/leisure/tourism)
- User-Agent per Overpass ToS, 15 s timeout, fail-soft (stale cache as fallback)

### Frontend

- New component `NearbyPOIs.vue` (reusable)
- New view `Nearby.vue` with a source picker (vehicle / active charging session / last trip end)
- Nav entry "📍 Nearby" in the planning group
- Touch-optimized tile layout, per-category filter toggles

### Docs

- Handbook section `{#nearby}` in all 6 languages
- 25 new i18n keys × 6 languages (POI types, sources, headings)
- Nav label + tooltip in all 6 languages

### Data concept

Overpass calls happen server-side; the frontend only sees aggregated POI lists. 24-h cache TTL is generous — POI data rarely changes. Max one Overpass call per position per day.

---

## [v3.12.0] - 2026-06-08

### Added — Location actions: automatic charge limit on arrival

Each charging location (in `charging_locations`) can now carry a **default_charge_limit** in %. When your Tesla arrives within the radius (detected at OwnTracks trip end), TeslaView applies the limit automatically:

- **Fleet API active**: TeslaView sends the `set_charge_limit` command to the car immediately → confirmation push "charge limit X% applied".
- **Without Fleet API**: push notification "set limit X% manually" with deep link to the charging view.
- **Manual trigger**: "🔋 Apply now" button per location.

### Added — Frontend view for charging locations (`/charging-locations`)

Locations could only be managed via the API before — no UI. Now:

- **Table view** with every location (name, address, GPS, radius, rate, limit)
- **Inline edit form** per location
- **New-location form**
- **Nav entry** "🏠 Charging locations" in the planning group

### Backend

New service `backend/src/services/locationActions.js`:
- `applyLocationActionsOnArrival(db, tenantId, vehicleId, lat, lon)` — Haversine match against all vehicle locations, dispatches the Tesla command or a push
- Called fire-and-forget by the OwnTracks webhook on trip close

Routes extended in `backend/src/routes/charging-locations.js`:
- `POST /charging-locations/:id/apply-charge-limit` — manual trigger

Schema migration in `runTenantMigrations`: `charging_locations.default_charge_limit INTEGER` is added automatically.

### Docs

- Handbook section `{#charging-locations}` extended with charge-limit block in all 6 languages
- 30 new i18n keys × 6 languages
- Nav label "Charging locations" + tooltip in all 6 languages

### Data concept

Match logic stays local. The Tesla API call only fires when Fleet API is active, otherwise falls back to push. No external services involved.

---

## [v3.11.0] - 2026-06-08

### Added — OwnTracks validation (3 lines of defense)

**Problem solved**: OwnTracks pushes phone GPS data to TeslaView. Driving a different car or riding as a passenger would create false Tesla trips. Multiple OwnTracks devices in the same Tesla would record duplicate trips.

Three combined defenses:

**A) Bluetooth validation (automatic, recommended)**
- iOS Shortcut calls `POST /api/owntracks/in-vehicle/start|end/:token` when the phone connects to or disconnects from the Tesla Bluetooth
- TeslaView drops every OwnTracks position outside that window
- Opt-in: only active when `bluetooth_pairing_name` is set on the device

**B) Trip lock (automatic)**
- The first OwnTracks device that starts moving claims the trip for that vehicle
- Other devices are ignored for the trip duration
- Auto-release after 15 min idle
- New columns `vehicles.active_trip_owntracks_device_id` + `active_trip_locked_until`

**C) Manual pause toggle (emergency brake)**
- ⏸ button per device in `/my-tracking`
- Persisted in `owntracks_devices.active_paused`
- Endpoints `POST /devices/:id/pause|resume`

### Backend

- New columns in `owntracks_devices` (master.db): `bluetooth_pairing_name`, `in_vehicle`, `in_vehicle_since`, `active_paused`
- New columns in `vehicles` (tenant DB): `active_trip_owntracks_device_id`, `active_trip_locked_until`
- Migrations in `runMasterMigrations` + `runTenantMigrations` — existing databases get the fields automatically
- `POST /api/owntracks/in-vehicle/start|end/:token` (token auth for iOS Shortcut)
- `POST /api/owntracks/devices/:id/pause|resume` (cookie auth)
- `PATCH /api/owntracks/devices/:id/bluetooth` (set Bluetooth pairing name)
- Webhook filter checks all three gates before recording a trip

### Frontend

- `MyTracking.vue`: per-device status indicator (🟢🟡🔵⏸), pause toggle, Bluetooth setup disclosure with step-by-step iOS Shortcut instructions including copyable URLs

### Docs

- Handbook section `{#owntracks-validation}` in all 6 languages with detailed iOS Shortcut walkthrough
- Wiki Features (DE/EN/FR/ES/TR/EL) — short entry with handbook reference
- 24 new i18n keys × 6 languages

### Data concept

Everything stays local — the iOS Shortcut talks directly to your TeslaView backend. No external service.

---

## [v3.10.0] - 2026-06-08

### Changed — Address before coordinates (everywhere)

Wherever a place is shown, the **address takes precedence** over GPS coordinates. Only when no address is stored (or the geocoding backfill has not run yet) do lat/lon appear as a properly formatted fallback (4 decimal places, ~11 m).

Specifically refactored:

- **Trip list** (`/trips`): start → destination now show addresses or coordinates instead of just "start" / "destination"
- **Trip detail** (`/trips/:id`): consistent i18n fallback string instead of raw coordinates
- **Charging sessions** (`/charging`): location name or coordinates instead of just "Unknown location"
- **Logbook** (`/fahrtenbuch`): `coordStr` helper now backed by the central `formatCoords`

New helper `frontend/src/lib/location.js`:
- `formatLocation({ address, lat, lon, fallback })` — address first, coordinates as fallback
- `formatCoords(lat, lon)` — 4-decimal-place format
- `coordTooltip(lat, lon)` — hover tooltip when an address is being shown
- `hasAddress(address)` — predicate

### Added

- `tripDetail.noData` i18n key in 6 languages (centralizes the former hard-coded "— no data —")
- Handbook note in 6 languages, appended to the `{#auto-geocode}` section

### Foundation

This consolidation is the foundation for **v3.11.0** (location-based actions such as per-location charge limit).

---

## [v3.9.1] - 2026-06-08

> Note: the first deploy run lost the race against the running backend container; an empty re-trigger commit recovered.

### Fixed

- **Signal removed from the app-hub catalog**: Signal has no web app, `signal.org` is just the marketing page — useless inside the Tesla browser. The entry has been dropped from the catalog entirely.
- **Admin link led nowhere**: the "Manage apps (admin)" link in `/launcher` pointed to `/admin?tab=launcher`, a route that did not exist. Now:
  - New `LauncherAdmin.vue` under `/admin/launcher`
  - AdminHub card "🚀 App hub" added
  - Per-app toggle buttons (Active/Off) writing directly to the existing `/api/launcher/admin/*` endpoints
  - 18 new i18n keys × 6 languages for `launcherAdmin.*`

---

## [v3.9.0] - 2026-06-08

### Added — App hub (`/launcher`)

New view with a **curated catalog of web apps** that run in the Tesla browser and that Tesla does NOT offer natively:

- **Audio (public broadcasters)**: ARD Audiothek, Deutschlandfunk live
- **EV world**: GoingElectric, electrive, OpenChargeMap, A Better Routeplanner
- **Messaging**: Telegram Web, Signal
- **Knowledge**: Wikipedia

Strict inclusion criteria: free, secure (HTTPS), no forced app-store install, privacy-friendly, **no Tesla-native duplicates** — Spotify, Apple Music, games, maps and streaming services are intentionally excluded because Tesla already ships them.

### Backend

- New service `launcherCatalog.js` with a static catalog + tenant whitelist via `tenant_settings['launcher.disabled_slugs']`
- Routes:
  - `GET  /api/launcher/apps` — filtered catalog for the tenant
  - `GET  /api/launcher/admin` — full catalog with `enabled` flag (admin only)
  - `POST /api/launcher/admin/disable/:slug` — hide app
  - `POST /api/launcher/admin/enable/:slug` — show app again
- Both mutations write an audit-log entry

### Frontend

- New `Launcher.vue` with a touch-friendly tile grid (Tesla-browser friendly: large buttons, dark mode, no Bluetooth or microphone needed)
- Category filter (audio/EV/messaging/knowledge)
- Nav entry "App hub" 🚀 in the planning group
- Hint section explains why Spotify/Apple Music/games are intentionally absent (Tesla-native)

### Docs

- `{#app-hub}` section added in all 6 languages
- 33 new i18n keys × 6 languages (app labels, notes, categories, help text)
- Nav label + tooltip in all 6 languages

### Data concept

Apps open in a new tab — no proxy, no TeslaView backend traffic. Audio still goes via Bluetooth into the Tesla speakers as always (no software intervention).

---

## [v3.8.0] - 2026-06-08

### Added — Automatic address resolution from GPS

Trips and charging sessions that have GPS coordinates but no address text are now resolved automatically via reverse geocoding:

- **Live hooks**:
  - OwnTracks trip close → `start_address` + `end_address` fill in the background
  - Charging session insert → `location_name` fills when empty
- **Nightly backfill** in the `nightlyMaintenance` run: up to 60 lookups per tenant
- **Admin on-demand**: `POST /api/system/geocode-backfill` (admin only), e.g. for an initial backfill of historic data

**Data source**: Nominatim (OpenStreetMap Foundation, EU) — free, no account, no API key, strictly enforcing the 1-request-per-second rate limit.

**Persistent cache**: new table `geocode_cache` stores every lookup rounded to 4 decimal places (~11 m). Subsequent trips/sessions at the same location hit the cache — no second external call. Data-sovereign, all in the tenant SQLite.

### Changed

- Schema migration for existing tenants: `geocode_cache` table auto-added in `runTenantMigrations`.
- Nightly maintenance report now includes `tasks.geocode` with lookup/update counts per tenant.

---

## [v3.7.0] - 2026-06-07

### Added — Companion Phase 2: persistent anomalies + preconditioning suggestions

Two new sections on `/battery`, everything from existing data plus a single external weather lookup:

- **Companion alerts** — persistent anomalies (`battery_anomalies` table). The detection engine (`backend/src/services/companionEngine.js`) runs nightly (hooked into `nightlyMaintenance`) and every 6 hours (`companionScheduler.js`). Each new anomaly is pushed **once** via Web Push + Telegram. UI exposes "✓ Mark as seen" and "✕ Dismiss". Anomaly types: SOC jump, range jump, phantom-drain spike, efficiency outlier. Deduped via UNIQUE(vehicle_id, hash).
- **Preconditioning suggestion** — `precondition_suggestions` table. From Open-Meteo forecast + the most-frequent departure-time buckets of the last 30 days. Push when tomorrow's expected temperature is <5 °C or >30 °C. UNIQUE(vehicle_id, for_date) prevents duplicates.

### Backend

New endpoints in `backend/src/routes/battery.js`:
- `GET  /battery/anomalies-persisted` (with status filter)
- `POST /battery/anomalies-persisted/:id/seen`
- `POST /battery/anomalies-persisted/:id/dismiss`
- `GET  /battery/precondition-suggestions`
- `POST /battery/precondition-suggestions/:id/dismiss`

New services:
- `companionEngine.js` — detection logic + persistence + push dispatch
- `companionScheduler.js` — 6 h cycle for anomalies (no weather calls)

Migrations: `battery_anomalies` and `precondition_suggestions` are added automatically to existing tenant DBs (see `runTenantMigrations`).

### Frontend

`Battery.vue` extended with 2 sortable sections (`companionAlerts`, `precondition`). Action buttons with tooltip. `usePageLayout` appends them to existing layouts.

### Docs

- Handbook gained `{#companion-phase-2}` section in all 6 languages
- Wiki Features page (DE/EN/FR/ES/TR/EL) extended: Phase 1+2 overview
- 14 new i18n keys × 6 languages
- i18n hygiene: dropped orphan `routes.chargeToTip` from EN/FR/ES/TR/EL

### Data concept

All companion computation runs locally in the tenant SQLite. **Only external call**: Open-Meteo forecast (lat/lon only, no account, no API key). Data sovereignty preserved.

---

## [v3.6.2] - 2026-06-07

### Fixed

- **OwnTracks device creation via "My GPS" failed for admins**: backend required an explicit `user_id` in the request, but the `MyTracking.vue` frontend doesn't send one (it's self-service — the logged-in user creates a device for themselves). Error "✗ vehicle_id, user_id, label required". **Fix:** when an admin doesn't send `user_id`, their own user is used as fallback. With an explicit `user_id` (AdminSetupWizard) the behavior is unchanged.

---

## [v3.6.1] - 2026-06-07

### Fixed — Docs: Fleet API cost statement

Handbook and marketing site previously stated `~€10/month` as Fleet API cost — that was the old worst-case guess and scared off many users. **Reality:** Tesla grants **$10 free credit per account per month** (as of 2026), which fully covers a typical private use case (1 vehicle + streaming telemetry + everyday commands) → **€0/month**.

Clarified in:
- Three-data-sources table (all 6 handbooks)
- API cost section with real Tesla prices: Streaming 150,000 signals = $1, Commands 1,000 = $1, polling 500 requests = $1, Wake-Ups 50 = $1
- Streaming telemetry costs ~$0.0067/h, polling ~$0.12/h — preference for streaming now justified
- Marketing site `api_fleet_p` and `api_fleet_caveat` (DE+EN) reworded
- Marketing site `index.html` defaults kept in sync

Source: [Tesla Developer — Billing and Limits](https://developer.tesla.com/docs/fleet-api/billing-and-limits).

---

## [v3.6.0] - 2026-06-07

### Added — Companion Phase 1: Battery health dashboard

Four new sections on `/battery`, **statistics only**, no AI, no cloud — everything from your own data:

- **Charging curve** — aggregate across SOC bands (0-20 %, 20-50 %, 50-80 %, 80-100 %) + scatter kW vs start SOC. Makes tapering above 80 % visible and surfaces BMS quirks in the middle zone.
- **Efficiency vs outside temp** — kWh/100 km in 5-°C buckets from your trips. The winter penalty is finally tangible.
- **Phantom drain** — SOC loss per hour while parked, properly filtered to exclude trip and charge windows. Median, average, and top-10 events as a table.
- **Anomalies** — SOC jumps ≥10 % without trip/charge, range jumps ≥30 km, efficiency outliers (>35 or <7 kWh/100km).

### Backend

New endpoints in `backend/src/routes/battery.js`:
- `GET /battery/charging-curve` — sessions + band aggregate
- `GET /battery/efficiency-by-temp` — temperature buckets
- `GET /battery/phantom-drain` — idle events with median/avg
- `GET /battery/anomalies` — outliers by type
- `GET /battery/health-summary` — data volume + core KPIs

All robust against empty/partial data, all filterable per vehicle.

### Frontend

`Battery.vue` extended with 4 sortable sections. `usePageLayout` automatically appends the new sections to existing user layouts. Charts: Line (existing), Scatter (charging curve), Bar (temp efficiency). Tooltips + info text on every new KPI (usability requirement).

### Docs

- Handbook gained the `{#battery-health}` section in all 6 languages (DE/EN/FR/ES/TR/EL)
- Bullet refresh in every handbook overview
- 33 new i18n keys × 6 languages

### Data concept

Sources: `battery_snapshots`, `trips`, `charging_sessions` — all from your own SQLite. No external calls, no cloud, no model. Fully data-sovereign.

### Roadmap

- **Phase 2** (planned): push notifications for anomalies, preconditioning suggestions
- **Phase 3** (planned): deep companion chat via Ollama — stays local

---

## [v3.5.8] - 2026-06-07

### Changed

- **i18n completeness reached in 6 languages**: FR/ES/TR/EL were missing exactly 99 sub-keys relative to DE (in the areas `adminSetup.oauth.*`, `adminSetup.owntracks.*`, `adminSetup.external.*` for Ollama, `adminSetup.vehicles.*` for manual entry, `adminSetup.virtualKey.ownerSkipBody`, `adminSetup.telemetry.ownerSkipBody`, `adminSetup.done.ownerSkipBanner`, `wizard.sOauth.*`, `telemetry.refresh*`, `common.copy/optional`). These fell back to German via `fallbackLocale='de'` — functionally OK, but a hygiene smell. Now: fully translated in FR, ES, TR, EL. **All 6 languages are now 100 % parallel to the German reference** (1991 keys, 0 missing).

---

## [v3.5.7] - 2026-06-06

### Added

- **In-app handbook updated in 6 languages**: New section "⚠️ Tesla API status as of 2026" with five sub-sections (`#tesla-api-2026`, `#owntracks-setup`, `#manual-vehicle`, `#tco-cockpit`, `#ai-provider`, `#my-gps`). Explains the Owner API closure, compares the three data sources (Fleet API / OwnTracks / Manual) in a table, describes the OwnTracks setup via QR code step by step, and clearly states what runs where and when. Full translations in DE, EN, FR, ES, TR, EL (all 6 in-app languages). Inserted after "Sort order", before "Requirements" — so new self-hosters find the information early in the handbook.

---

## [v3.5.6] - 2026-06-06

### Changed

- **i18n hygiene: three new top-level blocks in all languages**: `myTracking` (smartphone GPS self-service page), `tco` (TCO cockpit) and `notices` (system update banner) had been maintained only in DE+EN — the four other languages (FR, ES, TR, EL) fell back via `fallbackLocale: 'de'` to the German text. Now: full translations for FR + ES + TR + EL. Three blocks with ~30 strings each × 4 languages = 360 new i18n strings.
- **Handbook update (`handbook.*.md` in all 6 languages) still pending**: OwnTracks, Owner-API status, TCO cockpit and Ollama mode are not yet described in the in-app handbook — deliberately parked as a separate task because translating markdown in 6 languages is its own sweep.

---

## [v3.5.5] - 2026-06-06

### Fixed

- **Wizard steps 5 + 6 (Virtual Key, Telemetry) honest in owner mode**: Previously both steps showed either "Loading…" or an empty setup form in Owner-API mode — both useless because without Fleet API nothing is activatable anyway. Now in owner mode the step content is replaced with an honest explanation box ("Virtual Key/Telemetry are part of the Fleet API — not available in owner mode — skip or switch mode after Fleet API approval"). The done-banner at the top no longer says "configured" but "requires Tesla Fleet API — can be skipped". Telemetry step also gets `done: true` from the backend `wizard-prefill` in owner mode (analogous to virtualkey).

### Added

- **System notices: one-shot banner for update hints**: New mechanism for "since your last update something important changed" notifications. At every login, undismissed notices are shown as expandable/collapsible banners directly below the navbar. Default notice as of this version: **tesla_api_2026** — explains what the Owner API closure means, names OwnTracks + manual entry as escape routes, links to the wizard.
  - Backend: hard-coded `NOTICES` list in `routes/notices.js`, dismissal persisted per tenant via `tenant_settings.notices.<id>.dismissed_at`. Admin click on "Got it" hides the notice for the whole tenant. Non-admin users see the notice but can't dismiss.
  - Frontend: new component `NoticesBanner.vue` right after `DemoBanner` in `App.vue` → visible on every route if a pending notice exists. Initial state expanded (users should see the content immediately). Severity levels (info/warn/critical) with different colors.
  - Extensibility: more notices by adding entries to the `NOTICES` array — no UI changes needed.

---

## [v3.5.4] - 2026-06-06

### Fixed

- **Wizard step 5 "Virtual Key" stuck on "Loading…"**: Both wizard components (AdminSetupWizard, SettingsWizard) called `GET /api/telemetry/status` and `POST /api/telemetry/configure/:vin` — but the backend mounts those routes under `/api/fleet/telemetry/...` (telemetryConfigRoutes is registered under `/api/fleet`, not `/api/telemetry`). Other views (Settings.vue, AdminSettings.vue) already used the correct path — the wizards were missed during the path migration. Fixed the frontend calls in both wizards to `/fleet/telemetry/...`. Result: "Loading…" hang gone, step 5 correctly shows virtual key status and the telemetry setup button.

---

## [v3.5.3] - 2026-06-06

### Added

- **Manual vehicle creation without Tesla API**: The previous wizard step "Vehicles" called `POST /api/vehicles/sync` exclusively, which required a working Tesla connection. Without Fleet API approval the wizard got stuck here. As of v3.5.3 the step offers two equal paths side by side: "☁ Tesla sync (cloud)" as before AND "✍ Manual entry" with a form for label, license plate, optional VIN (synthetic if empty), model, initial odometer.
  - New endpoint `POST /api/vehicles/manual` (admin or `can_add_vehicles`): creates a vehicle row with `tesla_id="manual-<uuid>"` and an optional synthetic VIN `MANUAL<...>`. Adds the creating user to `vehicle_users` so the new vehicle is immediately visible in `/vehicles` for them and they can register an OwnTracks device against it.
  - Initial odometer is written both to `vehicles.initial_odometer_km` (for TCO calculation) and `vehicles.odometer_km` (for display) — so odometer values make sense from day one.
  - Wizard intro banner explains openly: Tesla sync requires approval, manual entry works immediately. Existing vehicles now show a "· manual" indicator if created via synthetic ID.

---

## [v3.5.2] - 2026-06-06

### Added

- **OwnTracks self-service for every driver**: Until now only admins could create devices. Starting now every signed-in user has a dedicated `/my-tracking` page → "My GPS" in the navigation, where they can create a device for their own smartphone and see the QR code for direct scan. Vehicle selection is filtered to vehicles assigned to them via `vehicle_users` — they can't accidentally push GPS to someone else's car. Existing admin functionality in the wizard remains unchanged (admins can still prepare devices for other drivers and hand them the QR code).
  - Backend permission model: `GET /api/owntracks/devices` returns only own devices for drivers, all for admins. `POST /devices` forces `user_id = req.user.sub` for drivers and validates `vehicle_users` assignment — admins can choose freely. `PATCH/DELETE` analogously with owner check.
  - New endpoint `GET /api/owntracks/devices/:id/token` lets admin and driver fetch the token (and thus the QR code) of an existing device again — not only once at create time. Useful when an admin sets up a device for a driver and sends the QR later via chat, or when a driver has lost/swapped their phone.

---

## [v3.5.1] - 2026-06-06

### Added

- **OwnTracks app setup via QR code**: Instead of manually typing URL/DeviceID/TrackerID into the app, the end user scans a QR code with the native iPhone camera. Workflow: Camera app → QR code → "Open in OwnTracks" → confirm configuration import → done. After device creation in the wizard, the QR is shown directly (420×420 px); the manual fallback (webhook URL + .otrc download) is collapsed below.
  - New routes (token-based, no JWT — token in URL is the auth, same model as the webhook):
    - `GET /api/owntracks/config.otrc?token=<device_token>` — returns the `_type: configuration` JSON for the OwnTracks app
    - `GET /api/owntracks/qr.png?token=<device_token>` — PNG with an `owntracks:///config?url=…` deep link, scannable by iOS/Android camera
  - Configuration is pre-populated with sensible defaults: `mode: 3` (HTTP), `monitoring: 1` (significant changes — battery-friendly), `locatorDisplacement: 200` (one point every 200 m), `ignoreInaccurateLocations: 100` (drop GPS spikes >100 m), `pubExtendedData: true` (send speed/heading too).

### Changed

- **Telemetry view "no data yet" banner is now honest**: The Telemetry page used to say "Telemetry will start once the poller gets its first response from Tesla" — which was a false hope in owner-API mode after Tesla's 2026 lockdown (the response never comes). New banner for owner-mode instances: explains the Tesla change, names both escape routes (OwnTracks immediately, Fleet API long-term), links directly to the setup wizard and developer.tesla.com.

- **README with Tesla API status section**: New top-level block (DE+EN) is upfront about the 2026 state: Owner API dead, Fleet API the only official path (waiting time + cost), OwnTracks as a free immediate alternative for the logbook use case. Table with all connection options and what they deliver. No more false expectations for new self-hosters.

---

## [v3.5.0] - 2026-06-06

### Added — Major: Data-sovereign AI chat by default

- **Ollama bundled as a service in the compose stack**: Starting with v3.5.0 every TeslaView installation automatically ships a local LLM runtime — the AI chat works fully offline, data NEVER leaves the instance. No external cloud account required.
  - New `ollama` service (`ollama/ollama:latest`) in `docker-compose.prod.yml` + `docker-compose.yml`. No host port mapping — only backend-internal via `tesla-net`.
  - Persistent named volume `ollama_models` (1–20 GB per pulled model).
  - Conservative memory limit **2 GB default** (override via `OLLAMA_MEMORY_LIMIT` ENV), CPU 1.5 cores (`OLLAMA_CPU_LIMIT`). Models unload after 5 min idle (`OLLAMA_KEEP_ALIVE=5m`) to free RAM on small hosts.
  - Backend gets `OLLAMA_URL=http://ollama:11434` as ENV default — wizard tenant_setting `ai.ollama_url` takes precedence if external Ollama is preferred.
  - **Disable** on hosts with too little RAM (< 4 GB): `COMPOSE_PROFILES=lite docker compose up -d` — service stays off, stack stays lean. Or in the wizard `AI provider = Off`.

- **Wizard integration: one-click model install**: In the "External APIs" step → Ollama card, a new "Install model" section appears after a successful connection test. Admin picks from a curated list with per-entry hardware hints (RAM, disk, speed, hardware class), clicks "⬇ Install", and sees a **live progress bar with MB/MB + percent** while the pull runs. Pull is SSE-streamed — works even for multi-GB models on slow connections (1h timeout).
  - New routes: `GET /api/grok/ollama-recommended` (curated list), `POST /api/grok/ollama-pull` (SSE pull with progress).
  - Curated models: `llama3.2:1b` (Pi 4 4 GB), `qwen2.5:1.5b` (Pi 4 8 GB), `qwen2.5:3b` (Pi 5/VPS — recommended), `phi3:3.8b`, `llama3:8b`, `qwen2.5:7b`.

- **README with honest hardware table**: New "System requirements" section with minimum/recommended hardware PLUS a separate "AI-mode hardware table" for Ollama with realistic tok/s expectations per hardware class (Pi 4/5, VPS, GPU). Clear instructions on how to disable Ollama if the hardware can't handle it. DE+EN.

### Background

Until v3.4.27 AI chat was only possible via xAI Grok — cloud, every question goes to US servers. Violates TeslaView's data-sovereignty principle. With v3.5.0 AI runs **locally by default**, cloud mode (Grok) remains an optional alternative for power users with performance demands.

---

## [v3.4.27] - 2026-06-06

### Added

- **Ollama as AI provider — data-sovereign alternative to Grok**: AI chat used to run exclusively via xAI Grok (cloud, every question goes to US servers). Starting with this version, admins can pick between three providers in the setup wizard:
  - 🏠 **Ollama** (local): LLM runs on your own hardware via [Ollama](https://ollama.com). Model recommendations per hardware: Pi 4 → `llama3.2:1b`, Pi 5 → `qwen2.5:3b`, VPS → `llama3:8b`. Data NEVER leaves the instance. Free (except electricity).
  - ☁ **Grok / xAI** (cloud): as before, questions go to api.x.ai, billed per token with daily-budget guard.
  - ⊝ **Off**: AI chat fully disabled.
  - New provider abstraction `services/aiService.js` dispatches based on the `ai.provider` tenant setting. `services/ollamaService.js` mirrors the `streamChat` signature of `grokService.js` so routes can delegate blindly — the frontend chat works identically for any provider.
  - Backward compatible: existing installations with `xai.api_key` configured stay on Grok automatically until the admin actively switches (migration default without explicit setting).
  - New routes: `GET /api/grok/ai-config`, `PUT /api/grok/ai-config`, `GET /api/grok/ai-health`, `GET /api/grok/ollama-health`. Existing `/api/grok/*` URLs unchanged.
  - Admin wizard step "External APIs" now shows the AI provider selection before the Grok API key card with a 3-card chooser, Ollama URL/model inputs, connection test with live model list, and hardware-specific recommendations.
  - New tenant settings: `ai.provider`, `ai.ollama_url` (default `http://localhost:11434`), `ai.ollama_model` (default `qwen2.5:3b`).
  - i18n DE+EN.

---

## [v3.4.26] - 2026-06-06

### Added

- **TeslaView Mesh — Phase 1: Foundation**: First step of a federated, privacy-preserving swarm-intelligence infrastructure between self-hosted TeslaView instances. Phase 1 is pure infrastructure with no active data transmission — user-visible swarm features arrive in Phase 2.
  - New `mesh_contributions` table in master.db (instance_uuid, topic, dimensions_key, metrics_json, sample_count, contributed_at). Generic schema for multiple topics + dimensions — not bound to a specific data type.
  - New tenant_settings keys: `mesh.enabled`, `mesh.optin.<topic>`, `mesh.hub_url`, `mesh.instance_uuid`. Default OFF everywhere — no implicit data transmission.
  - New admin routes under `/api/mesh/`: `status`, `optin`, `hub-url`, `contributions` (delete stub). Hub-side routes (POST contributions, GET aggregates) arrive in Phase 2 together with the first concrete topic (range_curve).
  - Privacy guarantees documented in the schema comment: min-group-size ≥ 5 on read, instance_uuid without personal link, no location, no VIN, opt-in per topic, deletable at any time.
  - **Principle: federated ≠ external.** Hub URL is configurable; in typical operation the hub runs on one of your own TeslaView instances (P2P-capable). No data ever goes to commercial third parties (OpenAI, Anthropic, Google, Tesla, ChargeMap…).

### Changed

- **`EditorialStatusBar.vue` comment cleanup**: Reference to an external design inspiration removed from the source comment — TeslaView is self-contained and no longer references external projects in source.

---

## [v3.4.25] - 2026-06-06

### Added

- **TCO cockpit (Total Cost of Ownership)**: New page `/tco` shows the real total cost per vehicle and an honest €/km value — unlike pure consumption or charging stats, the TCO cockpit includes *all* items:
  - **Depreciation** = purchase price − (sale price if sold, else estimated residual via 8-year linear depreciation to 25%)
  - **Insurance & vehicle tax** = annual amount × years owned
  - **Electricity** = sum of `charging_sessions.cost` (already populated by home-charging billing or Monta sync)
  - **Service, tires, repairs** = new `service_records` table with individual entries (date, category, cost, vendor, notes, optional odometer)
  4 KPI cards (€/km, total, depreciation, electricity) + cost breakdown with shares + service-records CRUD + base-data form (purchase, sale, insurance, tax, initial odometer). Admin-only writes, read access for any signed-in user.
  - New columns on `vehicles`: `purchase_price_eur`, `purchase_date`, `sale_price_eur`, `sale_date`, `insurance_eur_year`, `tax_eur_year`, `initial_odometer_km` — all nullable.
  - New `service_records` table with categories `service|tires|repair|inspection|tuv|accessories|other`.
  - New routes under `/api/tco/vehicles/:id` (+ `/service-records[/:rid]`).
  - Navigation: "📊 TCO Cockpit" entry between Billing and Export.
  - i18n in DE+EN.

### Fixed

- **Deploy script: `Container ... Error when allocating new name: Conflict`**: The previous `docker compose up -d --pull always backend frontend` intermittently failed to stop the running container before recreate — Docker complained "cannot remove container: container is running" and created a random-prefix container instead. The deploy still reported `success`, but the new image never ran. New sequence: `pull → stop → rm → up` plus auto-cleanup for stray random-prefix containers from previous deploys. Downtime increases by ~10 seconds (clean stop before recreate), in exchange for no more broken deploys.

---

## [v3.4.24] - 2026-06-06

### Added

- **OwnTracks integration (smartphone GPS as a Fleet-API alternative)**: Since 2026 Tesla blocks Owner API tokens at Fleet API with HTTP 401 and closes vehicle endpoints on owner-api.teslamotors.com with HTTP 412 — without Fleet API approval there is no way left to get vehicle GPS data. OwnTracks (https://owntracks.org) is an open-source iOS+Android app that pushes location directly to a self-hosted webhook — no third party, no cloud account. Implementation:
  - New table `owntracks_devices` in master.db (analogous to telegram_links — pre-auth token lookup required). Fields: tenant_id, vehicle_id, user_id, device_token (32-byte base64url), label, default_trip_type, is_active, current_trip_id, stationary_since, last_ping_at.
  - Webhook `POST /api/owntracks/webhook?token=<token>` (no JWT, token in URL). Auto-trip state machine: speed >5 km/h without open trip → new trip with `source='owntracks'` and virtual start odometer (from last trip or vehicles.odometer_km). Speed >5 km/h with open trip → append point to trip_points, reset stationary timer. Speed ≤5 km/h for more than 5 minutes → close trip, recompute distance via Haversine over all points, end_odometer_km = start_odometer + distance.
  - Admin CRUD `GET/POST/PATCH/DELETE /api/owntracks/devices`. POST returns the token + full webhook URL one time only.
  - New wizard step "Smartphone GPS (OwnTracks)" right after the Vehicles step in admin setup. Device list with pause/resume/delete buttons, form for new device (label, vehicle, driver, default trip type), clear explanatory text describing what OwnTracks is and why it's needed.
  - Full i18n in DE+EN.

---

## [v3.4.23] - 2026-06-06

### Fixed

- **Honest Owner API status in the UI**: Post-deploy verification of v3.4.22 showed: Tesla does issue tokens correctly with `audience: <fleet-api-url>` (refresh OK), but the Fleet API rejects those tokens with `HTTP 401 "invalid bearer token"`. The two API ecosystems have been fully separated since 2026 — the community workaround "ownerapi → Fleet API URL" no longer works. UI consequence: the green "✅ Owner API connected — connection active" is replaced by an honest "⚠️ Owner API connected, but Tesla blocks vehicle data" with explanation. The system-health banner now surfaces a new `tesla_api_mode` check that makes the state visible.

### Added

- **Owner API pause/resume toggle**: The admin wizard and settings wizard now have a button to pause the Owner API connection without deleting the tokens. Rationale: in case Tesla re-opens the Owner API for vehicle data later — or in case Fleet OAuth gets set up in parallel — the stored configuration can be reactivated with a single click. New endpoints: `POST /api/auth/tesla/owner-api/pause`, `POST /api/auth/tesla/owner-api/resume`. New tenant_setting: `tesla.owner_api_paused` (default `false`). While paused, `getAccessToken()` throws an `OWNER_API_PAUSED` error so the poller and API routes bail out cleanly instead of pointlessly contacting Tesla.

---

## [v3.4.22] - 2026-06-05

### Fixed

- **Owner API vehicle endpoints returned HTTP 412**: Tesla disabled `owner-api.teslamotors.com` for vehicle endpoints (`/api/1/vehicles`, `/vehicle_data`) — responses are now "Endpoint is only available on fleetapi". Owner-mode tokens (issued via `client_id=ownerapi`) remain valid and are accepted by the Fleet API. Fix: `getApiBase()` now routes all vehicle calls to the Fleet API URL (`fleet-api.prd.eu.vn.cloud.tesla.com`) regardless of auth mode. In addition, `connectOwnerToken()`, `exchangeOwnerCode()` and the owner-mode branch of `refreshTokens()` now explicitly include `audience: <fleet-api-url>` in the token exchange so Tesla issues the token for Fleet API from the start. Existing owner-mode tokens keep working after the deploy without a re-connect — they get re-issued with the correct audience on the next refresh.

---

## [v3.4.21] - 2026-06-05

### Security

- **Security dependency updates (#107)**: Nightly security routine. 0 open Dependabot alerts, 0 vulnerabilities reported by `npm audit` (frontend 292 + backend 386 packages). Lock-file-only updates (semver ranges unchanged): `marked` 18.0.4 → 18.0.5 (patch, frontend), `@aws-sdk/client-s3` 3.1061.0 → 3.1062.0 (patch, backend), `protobufjs` 8.5.0 → 8.6.0 (minor, backend). Held back for manual review: `express` 4 → 5 (breaking), `geoip-lite` (Node 24 engine mismatch).

---

## [v3.4.20] - 2026-06-04

### Fixed

- **QR-code login on the Tesla center display looped on "code expired"**: In the cross-device pair flow (Tesla display generates QR, already-logged-in phone scans and confirms), a race condition fired: after the passkey confirm the phone frontend in `PairLogin.vue` also performed a `GET /api/pair/poll/{token}` — the "self-auth" block intended for the same-device flow. The phone got the JWT and the backend marked the session as consumed (`used_at`). The display's parallel poll then saw `used_at != null` and got `status: 'expired'` back → frontend renders "expired", user generates a fresh QR, race repeats. Fix: the phone only runs the self-auth poll when `authStore.accessToken` is empty (i.e. this browser has no login yet). On an already-logged-in phone we leave the JWT claim for the original polling device. Same-device flow (one browser doing init+confirm+poll) keeps working because there `accessToken` is empty at that point.

---

## [v3.4.19] - 2026-06-04

### Fixed

- **Installer broke for third-party clones**: `deploy/setup.sh` hard-required `docker compose pull` from `ghcr.io/knevs/tesla-carview/{backend,frontend}:main`. The GHCR packages are currently published with visibility=`private` — an anonymous downloader without a GitHub OAuth token got HTTP 404 ("not found" as the anon-facing response) and container startup aborted. Two robust fallbacks:
  - **`docker-compose.prod.yml`**: backend and frontend gain a `build:` block (`context: ./backend` / `./frontend`) alongside the `image:` reference. If the GHCR pull fails, Docker builds from the cloned source instead.
  - **`deploy/setup.sh`**: the pull step is now tolerant (`pull || echo …`) followed by an explicit `docker compose build --pull`. The install works without public GHCR.
  - Side-effect: first install on a Raspberry Pi 3 (ARMv7) takes 5–10 min longer now (Vite build + `npm ci`). x86_64/arm64 hosts with public GHCR still pull in seconds.

---

## [v3.4.18] - 2026-06-04

### Maintenance

- **Frontend and backend lockfiles synced with current `main`** (PR #106): Patch/minor bumps from the nightly security routine. Frontend: `axios` 1.16.1 → 1.17.0, `dompurify` 3.4.7 → 3.4.8. Backend: `axios` 1.16.1 → 1.17.0, `@aws-sdk/client-s3` 3.1057.0 → 3.1061.0 plus patch bumps for the `@aws-sdk/*` sub-packages. `npm audit` reports zero vulnerabilities before and after; no major bumps, no source under `src/` touched. Deliberately deferred for manual review: `express` 4.22.2 → 5.x (breaking changes) and `geoip-lite@2.0.2` (requires Node ≥ 24, container runs Node 22 — cosmetic warning, not a build failure).

---

## [v3.4.17] - 2026-06-03

### Fixed

- **Tooltips stuck open in the Tesla in-car browser**: The global `v-tooltip` directive (`frontend/src/directives/tooltip.js`) used `mouseenter`/`mouseleave` to show and hide. On touch devices (the Tesla center display is touch-only), `mouseleave` doesn't fire reliably after a tap, so the tooltip stayed visible and overlapped other UI. Switched to `pointerType`-aware pointer events:
  - **Mouse/pen** (`pointerType === 'mouse' | 'pen'`): unchanged — `pointerenter` shows, `pointerleave` hides
  - **Touch** (`pointerType === 'touch'`): tap on the owner element toggles the tooltip; a second tap or any tap outside dismisses it; plus a 4-second auto-hide as a safety net
  - **Keyboard**: `focus`/`blur` unchanged
  - The document-level `pointerdown` listener runs in capture phase so the tooltip dismisses before other handlers see the event

---

## [v3.4.16] - 2026-06-03

### Updated

- **Backend Docker image `node:20-alpine` → `node:22-alpine`** (PR #105): Node 22 (Active LTS) ships more prebuilt binaries for musl arm64, so `better-sqlite3@12` and `argon2@0.44` fall back to `node-gyp` less often — the source build crashed with SIGILL (exit 132) under QEMU arm64 and blocked two consecutive `main` deploys (CI run [26806992094](https://github.com/KnevS/Tesla-Carview/actions/runs/26806992094)). Production (amd64) was never affected; the change only touches the arm64 image build for Raspberry Pi 4/5 setups. The `.github/workflows/ci.yml` comment was updated so it stays clear why `arm/v7` remains excluded and what conditions can still trigger SIGILLs under `arm64`. Side note: the cosmetic `geoip-lite@2.0.2` `EBADENGINE` warning (requires Node ≥ 24, advisory only) is unaffected — still cosmetic, still builds fine.

### Maintenance

- **Frontend lockfile synced with current `main`** (PR #104): Pure `npm update` patch/minor bumps in `frontend/package-lock.json` (Babel tools to 7.29.7, `@typescript-eslint/*` 8.59.4 → 8.60.1, `@rollup/pluginutils` 5.3.0 → 5.4.0). `npm audit` reports zero vulnerabilities before and after; no major bumps, no source under `frontend/` touched. The reverse-routine CI `build` step confirmed the Vite build stays green.

---

## [v3.4.15] - 2026-06-02

### Updated (major dependencies)

- **`vue-router` 4.6.4 → 5.1.0** (PR #87): Frontend router moved to the latest major. Composition-API calls (`useRouter`, `useRoute`, `router.push/replace`, `beforeEach` guards) remain API-stable — no code changes required. Local build verified, every Vue file (Login, NavBar, MobileTabBar, Settings, PasswordReset, MfaVerify, Profile, Pair, Demo, TripsHeatmap) builds without warnings.
- **`@simplewebauthn/server` 10.0.1 → 13.3.1** (PR #88): WebAuthn library three majors forward. Three call sites migrated:
  - `routes/passkey.js` register-verify — `verification.registrationInfo` now nests `credential: {id, publicKey, counter}` instead of top-level `credentialID/credentialPublicKey/counter`
  - `routes/passkey.js` login-verify + `routes/pair.js` confirm — parameter `authenticator: {credentialID, credentialPublicKey, ...}` renamed to `credential: {id, publicKey, counter, transports}`
  - `generateRegistrationOptions().excludeCredentials[].id` stays as a string — no change

### Docs

- **Handbook DE + EN**: new section `## 💬 Telegram bot` with setup steps, full command list, inline-button overview, push sources and the `door_unlock` security note. Gap had existed since v3.3.3 (bot introduction). Other handbook languages (fr, es, el, tr) will follow in a dedicated i18n PR.

---

## [v3.4.14] - 2026-06-02

### New

- **Telegram command menu visible in the client**: On bot init, `setMyCommands` is now called so all 12 commands appear directly in the Telegram client — as a suggestion list when you type `/` and via the menu button (▤) next to the input field. Previously you had to know `/help` to see the commands. Now you see them all with a short description and emoji. Set once per bot init (no runtime overhead); errors are swallowed so a transient Telegram API hiccup doesn't block the bot. The menu button type is explicitly set to `commands` (instead of default webapp) so tapping it opens the command list.

---

## [v3.4.13] - 2026-06-02

### Improved

- **Onboarding preflight in the setup wizard**: Before the wizard asks for Tesla values, a yellow-highlighted block now lists the three Tesla-specific prerequisites: (1) Developer Account registration (approval may take 1–3 weeks — leaving the fields blank is fine; they can be added later via `setup-wizard.sh`), (2) Region NA/EU/Asia, (3) Virtual Key setup with a pointer to `docs/04-tesla-api.en.md`.
- **README quickstart**: Both language versions get a blockquote at the very top of the quickstart section explaining that Tesla approval is external and time-consuming, but installation can run in parallel. Links straight to `docs/04-tesla-api.en.md` for the detail steps.

Why: new users often only realised at wizard step 2 that Tesla approval takes weeks — the setup time then felt mis-quoted. The preflight makes it clear from the start: the app setup is not the bottleneck.

---

## [v3.4.12] - 2026-06-02

### New

- **Telegram `/clean all` — aggressive chat cleanup**: Pass `all` (or `alle`) to extend the scan range from 200 to up to 1500 message IDs backwards and disable the consecutive-failure brake. Useful for chats with long user-message blocks back-to-back where default mode would have stopped after 25 failures. The confirmation text now mentions that own user messages can't be deleted via the Bot API, with a hint to clear the history manually via the profile menu.

---

## [v3.4.11] - 2026-06-02

### Fixed

- **Telegram "Refresh" button replied with "Error: Bad Request: message is not modified"**: When nothing had changed since the last `/status` render, Telegram refused the `editMessageText` (identical text + identical buttons). The catch block forwarded that verbatim as a CallbackQuery answer. This specific case is now detected and silently answered as "Already current" — all other errors stay visible.

### New

- **Telegram `/clean`**: Removes all bot messages from the chat (last ~48 hours). Handy after a lot of back-and-forth with `/status`, `/classify` or notifications. The bot first deletes the `/clean` message itself, then iterates 200 message IDs backwards and removes its own entries (user messages stay untouched — the Telegram API only allows bots to delete their own anyway). The confirmation popup self-destructs after 4 seconds so the chat ends up truly empty. Documented in `/help`.

---

## [v3.4.10] - 2026-06-01

### New

- **User invite with name + e-mail delivery**: The admin form under `Users → Create invite link` now accepts an optional display name and an optional e-mail address. Tick the “Send link by e-mail" checkbox and — if SMTP is configured for the tenant (`tenant_settings.smtp.*`) — the backend sends the invite link directly via `nodemailer`. Sent invites show a `✉ sent` badge in the list. Missing SMTP yields a clear warning; the link still stays visible for manual copy.
- **Accept flow inherits e-mail**: `POST /api/user-invites/:token/accept` passes the invite's e-mail to `createUser()` so the new user already has a contact address without extra clicks.

### Technical

- Schema: `user_invites` extended with `display_name`, `email`, `email_sent_at` (migration + fresh CREATE TABLE).
- `routes/users.js POST /invite` validates `display_name` (≤80), `email` (RFC) and `send_email` (boolean) via zod. Audit log includes `email`, `email_sent`, `email_error`.
- `routes/userInvites.js` (public): `validate` returns `displayName` + `email`; `accept` forwards `email` to `createUser()`.

---

## [v3.4.9] - 2026-06-01

### New

- **Telegram `/classify` — classify a trip directly in the chat**: New bot command shows the latest completed trip with date, distance and current label. Inline buttons 🏠 Private / 💼 Business / 🏢 Commute set `trips.trip_type` instantly and suggest the next-older trip, so several trips can be classified in a row. Tax-locked trips (`locked_at IS NOT NULL`) are skipped. Every change is recorded as `telegram_classify_trip` in `audit_logs` with `trip_id`, old and new label. Added to the `/help` menu.

---

## [v3.4.8] - 2026-06-01

### New

- **Telegram push for proactive events**: Charging-complete, service reminders, notification rules (SOC alerts, geofence events) and new software versions now also reach the Telegram bot, in addition to Web Push. Both channels are dispatched through `notifyService.notifyAllInTenant()` — users without Telegram only see Web Push, users with both get both. Sentry alerts already ran through this pipeline (since v3.3.3), but it was the only trigger.
- **Software update detection with push**: On first sync after a firmware upgrade, the data sync detects the new `car_version` and sends a notification. The very first vehicle tracking is suppressed (otherwise every existing version would generate a reminder).

### Refactored

- **Notification pipeline consolidated**: The old `services/notifications.js` (Web-Push-only, vehicle-based via `push_subscriptions`) was removed. `dataSync.js` and `serviceReminders.js` now uniformly use `notifyService.notifyAllInTenant()`. Benefit: every mutation that historically only triggered Web Push automatically covers all configured channels. Audit-consistency for the multi-channel strategy.

---

## [v3.4.7] - 2026-06-01

### New

- **Telegram inline buttons under `/status`**: Nine quick actions in the chat instead of typing commands — 🔒 Lock / 🔓 Unlock, ❄️ Climate on / off, 🛡 Sentry on / off, ⚡ Charge start / stop, ⟳ Refresh. Each click fires the matching Tesla command via `apiProxyPost` (same pipeline as the frontend Control view). After each action the status is re-rendered so the effect is immediately visible.
- **Confirm step for Unlock**: 🔓 Unlock is the only security-critical action — it first asks "⚠️ Really unlock?" with two buttons (✅ Yes / ✖ Cancel). No command is sent to Tesla without confirmation.
- **Audit log per action**: Every Telegram vehicle action (including failures) is written to `audit_logs` as `telegram_command` with `vehicle_id`, `command`, `body` and `result/error`. Honors the mutations-must-be-audited policy.
- **`/help` extended**: Pointer to the inline buttons under `/status`.

---

## [v3.4.6] - 2026-06-01

### New

- **Telegram info commands**: Five new read-only bot commands — `/location` (current position with Google Maps link from the latest telemetry point), `/range` (remaining range + SOC + timestamp from `battery_snapshots`), `/today` (today's stats: trip count, km, charge count, kWh, cost — day boundary in Europe/Berlin), `/service` (next due maintenance intervals, with overdue flag), `/firmware` (current software version + previous from `firmware_versions`). All commands use the MarkdownV2-escape pattern from v3.4.3.
- **Help text expanded**: `/help` now lists all nine commands including the new ones.

### Fixed

- **`/battery` showed "Last charge: –"**: The column in `charging_sessions` is `energy_added_kwh`, not `charge_energy_added`. Silent bug (no crash, just empty value). Now uses the correct column; `/today` also reads it correctly.

---

## [v3.4.5] - 2026-06-01

### Fixed

- **OFFLINE display after auto-deploy**: Each backend restart killed the persistent Tesla→backend FleetTelemetry WebSocket. The Tesla only rebuilds the connection on the next state event (drive, wake, charging). Until then the poller still considered `vehicle.telemetry_last_signal_at` fresh and skipped the polling fallback — the vehicle card showed "OFFLINE · no signal", drive and sleep monitor data aged unnoticed. On boot, `telemetry_last_signal_at` is now reset to `NULL`; the polling loop takes over immediately until the stream is re-established.

### New

- **Refresh button in EditorialStatusBar**: Emergency override for the OFFLINE state. When the user clicks "⟳ Refresh" a one-off `vehicle_data` force-poll is triggered (uses 1 of today's poll budget). The response carries the remaining cap; the frontend shows "Refreshed ({day}/{dayMax} today)" or, if exhausted, "Daily cap reached — paused until tomorrow". Backend: new endpoint `POST /api/commands/:vehicleId/refresh`, internally via new `forcePollVehicle()` export from `poller.js`.

---

## [v3.4.4] - 2026-06-01

### Fixed

- **Telegram commands fail with `no such column: is_active`**: `/status` and `/battery` read vehicles via `SELECT * FROM vehicles WHERE is_active=1 LIMIT 3`, but the `vehicles` table has no `is_active` column (the flag only exists on `users`). The bot replied with `❌ Error: no such column: is_active`. Both queries now use `ORDER BY id LIMIT 3`. The `bot.catch()` from v3.4.3 still prevents a single command from silencing the whole bot — but the `is_active` error was user-visible per command.

---

## [v3.4.3] - 2026-06-01

### Fixed

- **Telegram bot unresponsive to commands**: `/status`, `/battery` and `/trips` produced messages with unescaped `.` characters from `toLocaleString('de-DE')` (thousand-separator in odometer), `toFixed()` (decimal point in kWh/km) and `toLocaleDateString('de-DE')` (date separator). MarkdownV2 treats `.` as reserved, Telegram replies with `400 Bad Request: can't parse entities`. The polling loop crashes on the first attempt and stops responding. All three places now escape dynamic values through `esc()`. A global `bot.catch()` additionally absorbs single-handler errors so a bug in one command no longer silences the whole bot.

---

## [v3.4.2] - 2026-05-30

### Fixed

- **Telegram bot silent behind reverse proxy**: `initTelegramBot()` registered a webhook on `FRONTEND_URL/api/telegram/webhook` whenever no dedicated `TELEGRAM_WEBHOOK_URL` was set. If an auth middleware (e.g. Authelia) sits in front of the route, it responds with 401 — Telegram could not reach the bot and long-polling stayed disabled. Removed the `FRONTEND_URL` fallback: without an explicit `TELEGRAM_WEBHOOK_URL` the bot now runs in polling mode.

---

## [v3.4.1] - 2026-05-26

### New

- **Monta for all vehicles**: Monta integration is no longer limited to company cars. Private vehicles now see home-charging sessions (🏠 badge, Monta sync); billing features (PDF, reimbursement template, cost columns) remain exclusive to company cars.
- **Wizard restart button**: The Admin Setup Wizard summary page now offers an in-app button to restart the backend container after Telegram configuration, with a 12-second countdown and automatic page reload.
- **Admin settings consolidation**: Monitoring, backup, and external API sections (OCM, HERE Maps) moved from the System page to Admin Settings (where they logically belong).

### Fixed

- **Profile page blank**: missing `usePrefsStore` import caused an empty profile view (regression from v3.4.0).
- **VAPID error message**: technical message `VAPID key not configured (Admin: set .env)` replaced with user-friendly text in Profile and Settings.
- **Telegram error message**: same fix for unconfigured Telegram bot.
- **`generateVAPIDKeys is not a function`**: `web-push` ESM exports the function on the `default` export, not as a named export — fallback pattern fixes key generation in the Admin UI.

### Technical

- `POST /api/system/container-restart` — new endpoint (admin only, audit-logged); sends 200 before calling `process.exit(0)` after 400 ms; Docker `restart: unless-stopped` brings the container back up.
- `docker-compose.prod.yml`: `backend/src/routes/system.js` added as a volume mount (prevents overwrite by image updates, same pattern as `demo.js`).

---

## [v3.4.0] - 2026-05-25

### New — Admin configuration via UI

- Tesla Fleet API credentials configurable via Admin UI (no more `.env` editing required)
- VAPID keys for Web Push can be generated directly in the browser
- Telegram Bot token configurable via UI
- Grok/xAI API key configurable via UI
- ABRP global app key configurable via UI
- New `configService.js`: reads from `tenant_settings` (DB), falls back to `.env`

### New — Admin Setup Assistant

- `AdminSetupWizard.vue`: guided through all system configuration steps
- Wizard split: Admin Setup Assistant (system config, admins only) vs. personal wizard (all users)

### Changed

- Driver management moved from Profile to Admin Settings
- Geofences moved from Profile to Admin Settings

### Technical

- `teslaApi.js`, `telemetryConfig.js`: DB before `.env` for Tesla credentials
- `notifications.js`, `serviceReminders.js`: DB before `.env` for VAPID keys
- `grokService.js`: DB before `.env` for xAI key
- `abrpService.js`: DB before `.env` for ABRP key
- `telegramBot.js`: reads token from `tenant_settings` on startup

### Fixed

- Design style and accent color selections in Profile now persist across page reloads (PR #70)

---

## [v3.3.3] — 2026-05-24

### New — Notifications: Web Push + Telegram Bot

- **Unified notification dispatcher** (`services/notifyService.js`) — single `notify()` call sends to all configured channels simultaneously (Web Push + Telegram). Each channel fails independently without blocking the other.
- **Telegram Bot integration** (`services/telegramBot.js`, `routes/telegram.js`):
  - Create your bot via `@BotFather` → set `TELEGRAM_BOT_TOKEN` in `.env`
  - **Linking flow**: Settings → Notifications → Generate code → `/start <CODE>` in Telegram — link completed in seconds
  - **Commands**: `/status` (battery, km, locked state), `/battery` (detailed SoC), `/trips` (last 5 trips), `/unlink`, `/help`
  - **Webhook + polling**: uses webhook mode if `TELEGRAM_WEBHOOK_URL` is set (recommended for production); falls back to long-polling automatically
  - Cross-tenant design: one bot serves all tenants; `chat_id → tenant_id + user_id` lookup via master DB
- **Web Push** (`routes/notifications.js`, service worker already built):
  - User-based subscriptions replace the vehicle-based legacy approach (both coexist)
  - Generate VAPID keys once: `docker exec <backend> npx web-push generate-vapid-keys`
  - Subscribe/unsubscribe per device; test button sends immediate notification
  - iPhone/iPad: notifications are automatically mirrored to **Apple Watch**
- **Sentry mode alert** — when the Tesla activates Sentry mode (wakes from parking due to a threat) while no user is present, a real-time alert is sent via all configured channels: `🚨 Sentry alert — vehicle may have been touched`
- **Notification preferences** — per-user toggles for each event type: charging complete, battery low, sentry alert, trip recorded, logbook reminder. Stored in `tenant_settings`.
- **Settings UI** (`Settings.vue`) — new "🔔 Notifications" section with Web Push management (subscribe/unsubscribe/test), Telegram linking wizard, and event-type checkboxes.
- **DB** (`master-schema.sql`): new tables `telegram_links`, `telegram_link_codes`, `user_push_subscriptions`
- **`.env.example`** updated with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_URL` instructions

---

## [v3.3.2] — 2026-05-24

### New
- **Logbook — Open in Tesla browser** (`Fahrtenbuch.vue`) — New "Open in Tesla" button creates a QR-pair session with `redirect=/fahrtenbuch`. Clicking it shows a modal with a QR image and a direct URL. The Tesla browser opens the URL, the user authenticates via Passkey directly in the Tesla browser (WebAuthn/FIDO2), and lands straight on the logbook — no separate QR-scanning device needed. The modal on the originating device polls for confirmation and shows a success state when the Tesla browser is logged in.
- **Pair self-authentication** (`PairLogin.vue`) — After a successful passkey confirmation, the confirming browser (e.g. Tesla browser) immediately calls `/pair/poll/:token` to receive its own JWT and refresh-token cookie, then navigates to the configured `redirectPath`. Previously, `/pair/<token>` only confirmed the session for a different polling device.
- **Pair sessions with redirect path** (`backend/routes/pair.js`) — `/pair/init` now accepts an optional `?redirect=<path>` query parameter (validated: must start with `/`, not `//`, max 200 chars). Stored in `pair_sessions.redirect_path` (column added via `ALTER TABLE … ADD COLUMN`); returned by `/pair/info/:token` and `/pair/poll/:token`.
- **Copy icon** (`lib/icons.js`) — New SVG icon `copy` (clipboard) available across all `AppIcon` usages.

### Improved
- **PairLogin.vue** — Shows the configured redirect destination before authentication so users know where they will land. After successful self-auth, a pulsing "Redirecting…" message appears before navigation.

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

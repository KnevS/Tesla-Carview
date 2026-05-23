# 09 — Tesla Fleet API Usage Tracker + Budget Guard

> 🇩🇪 [Auf Deutsch lesen](09-tesla-api-usage.md)

Since Tesla started charging for the Fleet API, the app counts every outgoing call,
estimates the expected cost using the rates configured in the tariff panel, and
optionally blocks further calls past a threshold (hard stop).

## Architecture

```
backend/src/services/teslaApi.js   ← apiGet/apiPost/apiProxyPost
        │   (wrapper: assertWithinBudget + recordCall)
        ▼
backend/src/services/teslaUsage.js ← UsageTracker, BudgetGuard, config store, classification
        │
        ▼
backend/src/db/database.js         ← tables tesla_api_usage + tesla_usage_events,
                                     default tariffs in tenant_settings
backend/src/routes/teslaUsage.js   ← REST API: /api/tesla-usage/...
backend/src/index.js               ← routes wired up, webhook before requireAuth,
                                     error handler forwards statusCode
backend/src/services/fleetTelemetry.js ← streaming signals are counted

frontend/src/components/TeslaUsageWidget.vue ← live display (30 s refresh)
frontend/src/views/Dashboard.vue   ← widget embedded
frontend/src/views/Settings.vue    ← admin panel: tariffs + limit + hard stop
frontend/src/locales/*.json        ← translations (all 6 languages)
```

## Data model (per tenant DB)

`tesla_api_usage` — counter per `(period, category, endpoint)`:

| Column | Type | Description |
| --- | --- | --- |
| `period` | TEXT | "YYYY-MM" |
| `category` | TEXT | `vehicle_data` \| `wake` \| `command` \| `streaming_signal` \| `other` |
| `endpoint` | TEXT | normalised path with `:id`/`:vin` masking |
| `count` | INTEGER | call count |
| `cost_usd` | REAL | accumulated cost in USD |
| `last_call_at` | INTEGER | Unix timestamp |

`tesla_usage_events` — incoming Tesla validation e-mails delivered through the webhook.

Default tariffs live in `tenant_settings` under the `tesla_usage.*` keys. They are set to
conservative defaults on creation / migration and can be adjusted by the admin
at any time once Tesla changes prices.

## Classification

`categorize(method, path)` checks the path in this order:

1. contains `/oauth2/` or `/oauth/` → `null` (does not count)
2. contains `/wake_up`               → `wake`
3. contains `/command/`              → `command`
4. contains `/vehicle_data` or matches `/api/1/vehicles[/:id]` or `/fleet_telemetry_config` → `vehicle_data`
5. any other `/api/1/` paths         → `other`

`normalizeEndpoint` replaces numeric IDs with `:id` and 17-character VINs with `:vin`,
so the counter aggregates per logical endpoint.

## REST endpoints

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET  | `/api/tesla-usage/current`        | Summary for the current month + recent events | User |
| GET  | `/api/tesla-usage/details`        | Endpoint list sorted by cost                  | User |
| GET  | `/api/tesla-usage/history?months=` | Last N months (max 36)                       | User |
| GET  | `/api/tesla-usage/events?limit=`  | Latest webhook events                          | User |
| GET  | `/api/tesla-usage/config`         | Current tariffs / limit / hard stop           | Admin |
| PUT  | `/api/tesla-usage/config`         | Write tariffs / limit / hard stop             | Admin |
| POST | `/api/tesla-usage/reset`          | Reset counters for the current month          | Admin |
| POST | `/api/tesla-usage/webhook/email`  | Deliver a Tesla validation e-mail             | webhook secret |

## Webhook for Tesla validation e-mails

Tesla sends a notification e-mail when individual thresholds are reached (50 %, 75 %, 100 %).
Anyone able to forward those (e.g. with a Microsoft Graph subscription, a Mailgun route, etc.)
posts them to `/api/tesla-usage/webhook/email`.

```
POST /api/tesla-usage/webhook/email
X-Webhook-Secret: <value of TESLA_USAGE_WEBHOOK_SECRET>
Content-Type: application/json

{
  "subject":     "Your Tesla Fleet API spend reached 75 %",
  "body":        "...full body of the mail...",
  "tenantSlug":  "default",        // optional, otherwise all tenants
  "spend_usd":   37.50,            // optional, if extracted
  "threshold":   "75 %",           // optional
  "period":      "2026-05"         // optional
}
```

Response: `{ "stored": <n> }` with the number of tenants whose event table received the entry.

## Hard stop

When `hard_stop_enabled = 1`, `assertWithinBudget(db)` throws a `TeslaBudgetExceededError`
(HTTP 429) before every Tesla call as soon as the billable spend (gross cost − free credit)
reaches `monthly_limit_usd × hard_stop_pct/100`. The global error handler in `index.js`
forwards the `statusCode` and returns a structured JSON response with
`code: "TeslaBudgetExceededError"` and `detail.billable / detail.hardStopAt`.

Default is hard stop **off** — nobody should run into a function freeze without conscious
opt-in.

## Frontend

The widget `TeslaUsageWidget.vue` loads `/api/tesla-usage/current` every 30 seconds:

* large bar showing percentage usage against `monthly_limit_usd`
* a vertical red line marks the hard-stop threshold
* category breakdown as small tiles (vehicle data / wake / commands / streaming / other)
* note about free-credit deduction and the most recent webhook event
* red banner row when hard stop kicks in

The admin panel in `Settings.vue` shows:

* currency, monthly limit, free credit, hard-stop % + toggle
* five tariff fields (USD per call resp. per streaming signal)
* two buttons: **Save tariffs** and **Reset current month**

## Understanding and reducing polling costs

### Why do costs occur at all?

Without active Fleet Telemetry the background poller periodically calls `/vehicle_data`.
Tesla bills **every** such call (0.005 USD/call ≈ 0.005 EUR).

### Polling modes (without Fleet Telemetry)

| Mode | Interval | Calls/day | Cost/month |
|------|----------|-----------|------------|
| DRIVING — actively driving (D/R/N) | 30 s | up to 2,880 | up to ~€43 |
| PARKED — online but stationary | 10 min | up to 144 | up to ~€21 |
| IDLE — offline / sleeping | 45 min | up to 32 | up to ~€4.50 |
| Fleet Telemetry heartbeat | 1 h | 24 | ~€3.60 |

**Typical scenario** (8 h online/parked, 16 h sleeping):
8 × 6 + 16 × 1.3 ≈ **69 calls/day** = roughly **€1/month**

### Daily cap and monthly cap

There is a built-in daily cap per vehicle per day (default: 30 calls, configurable via `TESLA_DAILY_CAP`).
Once reached the poller pauses until UTC midnight.

There is also a monthly cap (default: 400 calls, configurable via `TESLA_MONTHLY_CAP`).
When the monthly limit is reached, polling stops automatically until the next month.

> **Important:** Both cap counters are now **DB-persistent** — they are stored in the
> `tesla_api_usage` table and survive container restarts. Multiple deployments per day
> therefore no longer cause the cap to reset, reliably preventing unexpected costs even
> with frequent container restarts.

### Why can a bill still be high?

- **Vehicle online for a long time** — PARKED interval (10 min) fires continuously
- **Fleet Telemetry not active** — no heartbeat mode, poller works blind
- **Debugging / manual API calls** also count towards the monthly bill

> **Note on container restarts:** The daily and monthly caps are now DB-persistent
> and are no longer reset by restarts. Multiple deployments per day therefore no
> longer accumulate unexpected costs.

### Recommendations

1. **Set up Fleet Telemetry** — reduces to ~24 heartbeat calls/day (~€3.60/month)
2. **Enable hard stop** in Settings → Tesla API → set a monthly limit
3. **Bundle deployments** rather than many small rollouts per day
4. **Set ENABLE_POLLER=false** when no real Tesla is connected (e.g. demo-only instance)

## Uncertainties / TODOs

* The default tariffs (0.005 USD/call, 0.000005 USD/streaming signal) are rough assumptions —
  exact values depend on the Tesla tier you have and should be reconciled against the first
  validation e-mail.
* Streaming signals are counted per datum in the payload, not per topic — if Tesla bills
  differently (e.g. per subscription per day), `recordCall(... 'streaming_signal' ...)` in
  `fleetTelemetry.js` must be adjusted.
* The webhook expects the mail forwarder to deliver structured JSON; the mail → JSON
  mapping lives outside this repo (e.g. inside a Power Automate flow definition).

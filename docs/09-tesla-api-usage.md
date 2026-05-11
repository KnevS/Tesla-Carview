# 09 — Tesla Fleet API Usage Tracker + Budget Guard

> 🇬🇧 [Read in English](09-tesla-api-usage.en.md)

Seit Tesla die Fleet API kostenpflichtig betreibt, zählt die App jeden ausgehenden Call,
errechnet die voraussichtlichen Kosten nach den im Tarif-Panel hinterlegten Sätzen und
kann optional weitere Calls ab einer Schwelle blockieren (Hard-Stop).

## Architektur

```
backend/src/services/teslaApi.js   ← apiGet/apiPost/apiProxyPost
        │   (Wrapper: assertWithinBudget + recordCall)
        ▼
backend/src/services/teslaUsage.js ← UsageTracker, BudgetGuard, Config-Store, Klassifizierung
        │
        ▼
backend/src/db/database.js         ← Tabellen tesla_api_usage + tesla_usage_events,
                                     Default-Tarife in tenant_settings
backend/src/routes/teslaUsage.js   ← REST-API: /api/tesla-usage/...
backend/src/index.js               ← Routes verdrahtet, Webhook vor requireAuth,
                                     Error-Handler reicht statusCode durch
backend/src/services/fleetTelemetry.js ← Streaming-Signale werden gezählt

frontend/src/components/TeslaUsageWidget.vue ← Live-Anzeige (30-s-Refresh)
frontend/src/views/Dashboard.vue   ← Widget eingebunden
frontend/src/views/Settings.vue    ← Admin-Panel: Tarife + Limit + Hard-Stop
frontend/src/locales/*.json        ← Übersetzungen (alle 6 Sprachen)
```

## Datenmodell (pro Tenant-DB)

`tesla_api_usage` — Zähler je `(period, category, endpoint)`:

| Spalte | Typ | Erklärung |
| --- | --- | --- |
| `period` | TEXT | "YYYY-MM" |
| `category` | TEXT | `vehicle_data` \| `wake` \| `command` \| `streaming_signal` \| `other` |
| `endpoint` | TEXT | normalisierter Pfad mit `:id`/`:vin`-Maskierung |
| `count` | INTEGER | Anzahl Aufrufe |
| `cost_usd` | REAL | aufsummierte Kosten in USD |
| `last_call_at` | INTEGER | Unix-Timestamp |

`tesla_usage_events` — eingehende Tesla-Validierungs-Mails über den Webhook.

Default-Tarife stehen in `tenant_settings` unter den Keys `tesla_usage.*`. Sie sind beim
Anlegen / bei Migration auf konservative Standardwerte gesetzt und können vom Admin
jederzeit angepasst werden, sobald Tesla die Preise ändert.

## Klassifizierung

`categorize(method, path)` prüft den Pfad in dieser Reihenfolge:

1. enthält `/oauth2/` oder `/oauth/` → `null` (zählt nicht)
2. enthält `/wake_up`               → `wake`
3. enthält `/command/`              → `command`
4. enthält `/vehicle_data` oder ist `/api/1/vehicles[/:id]` oder `/fleet_telemetry_config` → `vehicle_data`
5. sonstige `/api/1/`-Pfade         → `other`

`normalizeEndpoint` ersetzt numerische IDs durch `:id` und 17-stellige VINs durch `:vin`,
damit der Counter pro logischem Endpunkt aggregiert.

## REST-Endpunkte

| Methode | Pfad | Zweck | Auth |
| --- | --- | --- | --- |
| GET  | `/api/tesla-usage/current`        | Summary für aktuellen Monat + Letzte Events     | User |
| GET  | `/api/tesla-usage/details`        | Endpoint-Liste sortiert nach Kosten             | User |
| GET  | `/api/tesla-usage/history?months=` | Letzte N Monate (max 36)                       | User |
| GET  | `/api/tesla-usage/events?limit=`  | Letzte Webhook-Events                           | User |
| GET  | `/api/tesla-usage/config`         | Aktuelle Tarife / Limit / Hard-Stop             | Admin |
| PUT  | `/api/tesla-usage/config`         | Tarife / Limit / Hard-Stop schreiben            | Admin |
| POST | `/api/tesla-usage/reset`          | Zähler des aktuellen Monats löschen             | Admin |
| POST | `/api/tesla-usage/webhook/email`  | Tesla-Validierungs-Mail einliefern              | Webhook-Secret |

## Webhook für Tesla-Validierungs-Mails

Tesla schickt bei Erreichen einzelner Schwellen (50 %, 75 %, 100 %) eine Notification-Mail.
Wer die mit einem Microsoft-Graph-Subscriber, einer Mailgun-Route o. ä. weiterleiten kann,
postet sie nach `/api/tesla-usage/webhook/email`.

```
POST /api/tesla-usage/webhook/email
X-Webhook-Secret: <Wert aus TESLA_USAGE_WEBHOOK_SECRET>
Content-Type: application/json

{
  "subject":     "Your Tesla Fleet API spend reached 75 %",
  "body":        "...volltext der mail...",
  "tenantSlug":  "default",        // optional, sonst alle Mandanten
  "spend_usd":   37.50,            // optional, falls extrahiert
  "threshold":   "75 %",           // optional
  "period":      "2026-05"         // optional
}
```

Antwort: `{ "stored": <n> }` mit der Anzahl der Mandanten, in deren Event-Tabelle
geschrieben wurde.

## Hard-Stop

Wenn `hard_stop_enabled = 1`, wirft `assertWithinBudget(db)` vor jedem Tesla-Call eine
`TeslaBudgetExceededError` (HTTP 429), sobald der abrechenbare Spend (= Brutto-Kosten −
Free-Credit) die Schwelle `monthly_limit_usd × hard_stop_pct/100` erreicht. Der globale
Error-Handler in `index.js` reicht den `statusCode` durch und liefert eine strukturierte
JSON-Antwort mit `code: "TeslaBudgetExceededError"` und `detail.billable / detail.hardStopAt`.

Default ist Hard-Stop **aus** — niemand soll ohne bewusste Aktivierung in einen
Funktions-Stop laufen.

## Frontend

Das Widget `TeslaUsageWidget.vue` lädt `/api/tesla-usage/current` alle 30 Sekunden:

* großer Balken mit der prozentualen Auslastung gegen `monthly_limit_usd`
* eine senkrechte rote Linie markiert die Hard-Stop-Schwelle
* Kategorien-Breakdown als Mini-Kacheln (Vehicle-Data / Wake / Commands / Streaming / Sonstige)
* Hinweis auf Free-Credit-Abzug und das jüngste Webhook-Event
* rote Banner-Zeile, wenn Hard-Stop greift

Das Admin-Panel in `Settings.vue` zeigt:

* Währung, Monatslimit, Free-Credit, Hard-Stop-% + Toggle
* fünf Tarif-Felder (USD pro Aufruf bzw. pro Streaming-Signal)
* zwei Buttons: **Tarife speichern** und **Aktuellen Monat zurücksetzen**

## Unsicherheiten / TODOs

* Die Default-Tarife (0,005 USD/Call, 0,000005 USD/Streaming-Signal) sind grobe Annahmen –
  exakte Werte hängen von der vereinbarten Tesla-Stufe ab und sollten mit der ersten
  Validierungs-Mail abgeglichen werden.
* Streaming-Signale werden pro Datum im Payload gezählt, nicht pro Topic – wenn Tesla
  anders abrechnet (z. B. pro Subscription pro Tag), muss `recordCall(... 'streaming_signal' ...)`
  in `fleetTelemetry.js` angepasst werden.
* Der Webhook erwartet vom Mail-Forwarder strukturiertes JSON; das Mapping
  Mail → JSON liegt außerhalb dieses Repos (z. B. in einer Power-Automate-Flow-Definition).

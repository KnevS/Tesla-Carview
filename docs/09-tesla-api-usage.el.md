# 09 — Tesla Fleet API Usage Tracker + Budget Guard

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](09-tesla-api-usage.md)

Από τότε που η Tesla άρχισε να χρεώνει για το Fleet API, η εφαρμογή μετρά κάθε εξερχόμενη κλήση,
εκτιμά το αναμενόμενο κόστος χρησιμοποιώντας τις τιμές που διαμορφώνονται στο tariff panel, και
προαιρετικά μπλοκάρει περαιτέρω κλήσεις πέρα από ένα όριο (hard stop).

## Αρχιτεκτονική

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

## Μοντέλο δεδομένων (ανά tenant DB)

`tesla_api_usage` — μετρητής ανά `(period, category, endpoint)`:

| Στήλη | Τύπος | Περιγραφή |
| --- | --- | --- |
| `period` | TEXT | "YYYY-MM" |
| `category` | TEXT | `vehicle_data` \| `wake` \| `command` \| `streaming_signal` \| `other` |
| `endpoint` | TEXT | κανονικοποιημένο path με `:id`/`:vin` masking |
| `count` | INTEGER | αριθμός κλήσεων |
| `cost_usd` | REAL | συσσωρευμένο κόστος σε USD |
| `last_call_at` | INTEGER | Unix timestamp |

`tesla_usage_events` — εισερχόμενα e-mail επαλήθευσης Tesla που παραδίδονται μέσω webhook.

Τα default tariffs ζουν στο `tenant_settings` κάτω από τα keys `tesla_usage.*`. Τίθενται σε
συντηρητικές προεπιλογές κατά τη δημιουργία / μετάβαση και μπορούν να ρυθμιστούν από τον admin
ανά πάσα στιγμή όταν η Tesla αλλάζει τιμές.

## Ταξινόμηση

Η `categorize(method, path)` ελέγχει το path με αυτή τη σειρά:

1. περιέχει `/oauth2/` ή `/oauth/` → `null` (δεν μετρά)
2. περιέχει `/wake_up`               → `wake`
3. περιέχει `/command/`              → `command`
4. περιέχει `/vehicle_data` ή ταιριάζει σε `/api/1/vehicles[/:id]` ή `/fleet_telemetry_config` → `vehicle_data`
5. οποιοδήποτε άλλο path `/api/1/`  → `other`

Η `normalizeEndpoint` αντικαθιστά τα αριθμητικά IDs με `:id` και τα 17-χαρακτήρων VINs με `:vin`,
έτσι ώστε ο μετρητής να συναθροίζει ανά λογικό endpoint.

## REST endpoints

| Μέθοδος | Path | Σκοπός | Auth |
| --- | --- | --- | --- |
| GET  | `/api/tesla-usage/current`        | Σύνοψη για τον τρέχοντα μήνα + πρόσφατα events | User |
| GET  | `/api/tesla-usage/details`        | Λίστα endpoints ταξινομημένη ανά κόστος       | User |
| GET  | `/api/tesla-usage/history?months=` | Τελευταίοι N μήνες (μέγ. 36)                 | User |
| GET  | `/api/tesla-usage/events?limit=`  | Τελευταία webhook events                       | User |
| GET  | `/api/tesla-usage/config`         | Τρέχοντα tariffs / limit / hard stop          | Admin |
| PUT  | `/api/tesla-usage/config`         | Εγγραφή tariffs / limit / hard stop           | Admin |
| POST | `/api/tesla-usage/reset`          | Επαναφορά μετρητών για τον τρέχοντα μήνα      | Admin |
| POST | `/api/tesla-usage/webhook/email`  | Παράδοση e-mail επαλήθευσης Tesla             | webhook secret |

## Webhook για e-mail επαλήθευσης Tesla

Η Tesla στέλνει e-mail ειδοποίησης όταν φτάνουν συγκεκριμένα όρια (50 %, 75 %, 100 %).
Όποιος μπορεί να τα προωθήσει (π.χ. με συνδρομή Microsoft Graph, route του Mailgun κ.λπ.)
τα κάνει POST στο `/api/tesla-usage/webhook/email`.

```
POST /api/tesla-usage/webhook/email
X-Webhook-Secret: <τιμή του TESLA_USAGE_WEBHOOK_SECRET>
Content-Type: application/json

{
  "subject":     "Your Tesla Fleet API spend reached 75 %",
  "body":        "...full body of the mail...",
  "tenantSlug":  "default",        // προαιρετικό, αλλιώς όλοι οι tenants
  "spend_usd":   37.50,            // προαιρετικό, αν εξαχθεί
  "threshold":   "75 %",           // προαιρετικό
  "period":      "2026-05"         // προαιρετικό
}
```

Απόκριση: `{ "stored": <n> }` με τον αριθμό των tenants των οποίων ο πίνακας events δέχθηκε την εγγραφή.

## Hard stop

Όταν `hard_stop_enabled = 1`, η `assertWithinBudget(db)` ρίχνει `TeslaBudgetExceededError`
(HTTP 429) πριν από κάθε κλήση Tesla μόλις η χρεώσιμη δαπάνη (gross cost − free credit)
φτάσει το `monthly_limit_usd × hard_stop_pct/100`. Ο global error handler στο `index.js`
προωθεί το `statusCode` και επιστρέφει δομημένη απόκριση JSON με
`code: "TeslaBudgetExceededError"` και `detail.billable / detail.hardStopAt`.

Η προεπιλογή είναι hard stop **off** — κανείς δεν θα έπρεπε να μπει σε function freeze χωρίς συνειδητή
επιλογή opt-in.

## Frontend

Το widget `TeslaUsageWidget.vue` φορτώνει `/api/tesla-usage/current` κάθε 30 δευτερόλεπτα:

* μεγάλη μπάρα που δείχνει το ποσοστό χρήσης έναντι του `monthly_limit_usd`
* μια κατακόρυφη κόκκινη γραμμή σημειώνει το όριο hard-stop
* ανάλυση κατηγορίας ως μικρά πλακίδια (vehicle data / wake / commands / streaming / other)
* σημείωση για αφαίρεση free-credit και το πιο πρόσφατο webhook event
* κόκκινη γραμμή banner όταν ενεργοποιείται το hard stop

Το admin panel στο `Settings.vue` δείχνει:

* νόμισμα, μηνιαίο όριο, free credit, % hard-stop + toggle
* πέντε πεδία tariff (USD ανά κλήση ή ανά streaming signal)
* δύο κουμπιά: **Αποθήκευση tariffs** και **Επαναφορά τρέχοντος μήνα**

## Κατανόηση και μείωση κόστους polling

### Γιατί προκύπτουν καθόλου κόστη;

Χωρίς ενεργό Fleet Telemetry ο background poller καλεί περιοδικά το `/vehicle_data`.
Η Tesla χρεώνει **κάθε** τέτοια κλήση (0,005 USD/κλήση ≈ 0,005 EUR).

### Λειτουργίες polling (χωρίς Fleet Telemetry)

| Λειτουργία | Διάστημα | Κλήσεις/ημέρα | Κόστος/μήνα |
|------|----------|-----------|------------|
| DRIVING — ενεργή οδήγηση (D/R/N) | 30 s | έως 2.880 | έως ~43€ |
| PARKED — online αλλά σταθερό | 10 min | έως 144 | έως ~21€ |
| IDLE — offline / κοιμάται | 45 min | έως 32 | έως ~4,50€ |
| Fleet Telemetry heartbeat | 1 h | 24 | ~3,60€ |

**Τυπικό σενάριο** (8 ώρες online/parked, 16 ώρες κοιμάται):
8 × 6 + 16 × 1,3 ≈ **69 κλήσεις/ημέρα** = περίπου **1€/μήνα**

### Ημερήσιο cap και μηνιαίο cap

Υπάρχει ενσωματωμένο ημερήσιο cap ανά όχημα ανά ημέρα (default: 30 κλήσεις, διαμορφώσιμο μέσω `TESLA_DAILY_CAP`).
Μόλις επιτευχθεί ο poller σταματά μέχρι τα μεσάνυχτα UTC.

Υπάρχει επίσης ένα μηνιαίο cap (default: 400 κλήσεις, διαμορφώσιμο μέσω `TESLA_MONTHLY_CAP`).
Όταν επιτευχθεί το μηνιαίο όριο, το polling σταματά αυτόματα μέχρι τον επόμενο μήνα.

> **Σημαντικό:** Και οι δύο μετρητές cap είναι πλέον **DB-persistent** — αποθηκεύονται στον
> πίνακα `tesla_api_usage` και επιβιώνουν επανεκκινήσεων container. Πολλαπλά deployments την ίδια μέρα
> επομένως δεν επαναφέρουν πλέον το cap, αποτρέποντας αξιόπιστα απρόσμενα κόστη ακόμα
> και με συχνές επανεκκινήσεις container.

### Γιατί μπορεί ωστόσο να είναι υψηλός ο λογαριασμός;

- **Όχημα online για μεγάλο διάστημα** — το διάστημα PARKED (10 min) ενεργοποιείται συνεχώς
- **Fleet Telemetry δεν είναι ενεργό** — χωρίς λειτουργία heartbeat, ο poller δουλεύει τυφλά
- **Debugging / χειροκίνητες κλήσεις API** μετρούν επίσης στον μηνιαίο λογαριασμό

> **Σημείωση για επανεκκινήσεις container:** Τα ημερήσια και μηνιαία caps είναι πλέον DB-persistent
> και δεν επαναφέρονται από επανεκκινήσεις. Πολλαπλά deployments την ίδια μέρα επομένως δεν
> συσσωρεύουν πλέον απρόσμενα κόστη.

### Συστάσεις

1. **Ρυθμίστε Fleet Telemetry** — μειώνει σε ~24 heartbeat κλήσεις/ημέρα (~3,60€/μήνα)
2. **Ενεργοποιήστε hard stop** στο Settings → Tesla API → ορίστε μηνιαίο όριο
3. **Συγκεντρώστε deployments** αντί για πολλά μικρά rollouts την ίδια μέρα
4. **Ορίστε ENABLE_POLLER=false** όταν δεν είναι συνδεδεμένο πραγματικό Tesla (π.χ. demo-only instance)

## Αβεβαιότητες / TODOs

* Τα default tariffs (0,005 USD/κλήση, 0,000005 USD/streaming signal) είναι χονδρικές υποθέσεις —
  οι ακριβείς τιμές εξαρτώνται από το επίπεδο Tesla που έχετε και θα πρέπει να συμφιλιωθούν με το πρώτο
  e-mail επαλήθευσης.
* Τα streaming signals μετρώνται ανά datum στο payload, όχι ανά topic — αν η Tesla χρεώνει
  διαφορετικά (π.χ. ανά συνδρομή ανά ημέρα), η `recordCall(... 'streaming_signal' ...)` στο
  `fleetTelemetry.js` πρέπει να προσαρμοστεί.
* Το webhook περιμένει ότι ο mail forwarder θα παραδώσει δομημένο JSON· η αντιστοίχιση mail → JSON
  ζει εκτός αυτού του repo (π.χ. μέσα σε ορισμό ροής Power Automate).

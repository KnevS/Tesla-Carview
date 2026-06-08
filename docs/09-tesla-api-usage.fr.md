# 09 — Tesla Fleet API : tracker d'usage + garde-fou budget

> 🤖 *Cette traduction française est assistée par IA depuis [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](09-tesla-api-usage.md)

Depuis que Tesla a commencé à facturer la Fleet API, l'app comptabilise chaque appel sortant,
estime le coût attendu d'après les tarifs configurés dans le panneau, et
bloque éventuellement les appels suivants au-delà d'un seuil (hard stop).

## Architecture

```
backend/src/services/teslaApi.js   ← apiGet/apiPost/apiProxyPost
        │   (wrapper : assertWithinBudget + recordCall)
        ▼
backend/src/services/teslaUsage.js ← UsageTracker, BudgetGuard, config store, classification
        │
        ▼
backend/src/db/database.js         ← tables tesla_api_usage + tesla_usage_events,
                                     tarifs par défaut dans tenant_settings
backend/src/routes/teslaUsage.js   ← REST API : /api/tesla-usage/...
backend/src/index.js               ← routes câblées, webhook avant requireAuth,
                                     gestionnaire d'erreur propage statusCode
backend/src/services/fleetTelemetry.js ← les signaux de streaming sont comptés

frontend/src/components/TeslaUsageWidget.vue ← affichage live (rafraîchissement 30 s)
frontend/src/views/Dashboard.vue   ← widget intégré
frontend/src/views/Settings.vue    ← panneau admin : tarifs + limite + hard stop
frontend/src/locales/*.json        ← traductions (les 6 langues)
```

## Modèle de données (par DB tenant)

`tesla_api_usage` — compteur par `(period, category, endpoint)` :

| Colonne | Type | Description |
| --- | --- | --- |
| `period` | TEXT | "YYYY-MM" |
| `category` | TEXT | `vehicle_data` \| `wake` \| `command` \| `streaming_signal` \| `other` |
| `endpoint` | TEXT | chemin normalisé avec masquage `:id`/`:vin` |
| `count` | INTEGER | nombre d'appels |
| `cost_usd` | REAL | coût cumulé en USD |
| `last_call_at` | INTEGER | horodatage Unix |

`tesla_usage_events` — e-mails de validation Tesla entrants reçus via le webhook.

Les tarifs par défaut résident dans `tenant_settings` sous les clés `tesla_usage.*`. Ils sont définis à
des valeurs conservatrices à la création / migration et peuvent être ajustés par l'admin
à tout moment lorsque Tesla modifie les prix.

## Classification

`categorize(method, path)` examine le chemin dans cet ordre :

1. contient `/oauth2/` ou `/oauth/` → `null` (n'est pas compté)
2. contient `/wake_up`               → `wake`
3. contient `/command/`              → `command`
4. contient `/vehicle_data` ou correspond à `/api/1/vehicles[/:id]` ou `/fleet_telemetry_config` → `vehicle_data`
5. tout autre chemin `/api/1/`       → `other`

`normalizeEndpoint` remplace les IDs numériques par `:id` et les VIN de 17 caractères par `:vin`,
de sorte que le compteur agrège par endpoint logique.

## Endpoints REST

| Méthode | Chemin | Usage | Auth |
| --- | --- | --- | --- |
| GET  | `/api/tesla-usage/current`        | Résumé du mois en cours + événements récents | Utilisateur |
| GET  | `/api/tesla-usage/details`        | Liste d'endpoints triée par coût              | Utilisateur |
| GET  | `/api/tesla-usage/history?months=` | Les N derniers mois (max 36)                 | Utilisateur |
| GET  | `/api/tesla-usage/events?limit=`  | Derniers événements webhook                    | Utilisateur |
| GET  | `/api/tesla-usage/config`         | Tarifs / limite / hard stop actuels           | Admin |
| PUT  | `/api/tesla-usage/config`         | Écrire tarifs / limite / hard stop            | Admin |
| POST | `/api/tesla-usage/reset`          | Réinitialiser les compteurs du mois en cours  | Admin |
| POST | `/api/tesla-usage/webhook/email`  | Livrer un e-mail de validation Tesla          | secret webhook |

## Webhook pour les e-mails de validation Tesla

Tesla envoie un e-mail de notification lorsque des seuils individuels sont atteints (50 %, 75 %, 100 %).
Quiconque peut les faire suivre (par ex. avec un abonnement Microsoft Graph, une route Mailgun, etc.)
les poste sur `/api/tesla-usage/webhook/email`.

```
POST /api/tesla-usage/webhook/email
X-Webhook-Secret: <valeur de TESLA_USAGE_WEBHOOK_SECRET>
Content-Type: application/json

{
  "subject":     "Your Tesla Fleet API spend reached 75 %",
  "body":        "...corps complet du mail...",
  "tenantSlug":  "default",        // optionnel, sinon tous les tenants
  "spend_usd":   37.50,            // optionnel, si extrait
  "threshold":   "75 %",           // optionnel
  "period":      "2026-05"         // optionnel
}
```

Réponse : `{ "stored": <n> }` avec le nombre de tenants dont la table d'événements a reçu l'entrée.

## Hard stop

Quand `hard_stop_enabled = 1`, `assertWithinBudget(db)` lève un `TeslaBudgetExceededError`
(HTTP 429) avant chaque appel Tesla dès que la dépense facturable (coût brut − crédit gratuit)
atteint `monthly_limit_usd × hard_stop_pct/100`. Le gestionnaire d'erreur global dans `index.js`
propage le `statusCode` et retourne une réponse JSON structurée avec
`code: "TeslaBudgetExceededError"` et `detail.billable / detail.hardStopAt`.

Par défaut, hard stop **désactivé** — personne ne devrait subir un gel de fonctionnalité sans
opt-in conscient.

## Frontend

Le widget `TeslaUsageWidget.vue` charge `/api/tesla-usage/current` toutes les 30 secondes :

* grande barre montrant le pourcentage d'usage par rapport à `monthly_limit_usd`
* une ligne rouge verticale marque le seuil de hard stop
* répartition par catégorie en petites tuiles (données véhicule / wake / commandes / streaming / other)
* note sur la déduction du crédit gratuit et le dernier événement webhook
* bandeau rouge quand le hard stop se déclenche

Le panneau admin dans `Settings.vue` montre :

* devise, limite mensuelle, crédit gratuit, % hard-stop + bascule
* cinq champs de tarifs (USD par appel resp. par signal de streaming)
* deux boutons : **Enregistrer les tarifs** et **Réinitialiser le mois en cours**

## Comprendre et réduire les coûts de polling

### Pourquoi des coûts apparaissent-ils ?

Sans Fleet Telemetry actif, le poller en arrière-plan appelle périodiquement `/vehicle_data`.
Tesla facture **chacun** de ces appels (0,005 USD/appel ≈ 0,005 EUR).

### Modes de polling (sans Fleet Telemetry)

| Mode | Intervalle | Appels/jour | Coût/mois |
|------|----------|-----------|------------|
| DRIVING — en roulage actif (D/R/N) | 30 s | jusqu'à 2 880 | jusqu'à ~43 € |
| PARKED — en ligne mais stationné | 10 min | jusqu'à 144 | jusqu'à ~21 € |
| IDLE — hors ligne / endormi | 45 min | jusqu'à 32 | jusqu'à ~4,50 € |
| Heartbeat Fleet Telemetry | 1 h | 24 | ~3,60 € |

**Scénario typique** (8 h en ligne/stationné, 16 h endormi) :
8 × 6 + 16 × 1,3 ≈ **69 appels/jour** = environ **1 €/mois**

### Plafond quotidien et plafond mensuel

Il existe un plafond quotidien intégré par véhicule par jour (par défaut : 30 appels, configurable via `TESLA_DAILY_CAP`).
Une fois atteint, le poller se met en pause jusqu'à minuit UTC.

Il existe aussi un plafond mensuel (par défaut : 400 appels, configurable via `TESLA_MONTHLY_CAP`).
Quand la limite mensuelle est atteinte, le polling s'arrête automatiquement jusqu'au mois suivant.

> **Important :** Les deux compteurs de plafond sont désormais **persistés en DB** — ils sont stockés dans la
> table `tesla_api_usage` et survivent aux redémarrages de conteneur. Plusieurs déploiements par jour
> ne réinitialisent donc plus le plafond, ce qui évite de manière fiable des coûts inattendus même
> avec des redémarrages fréquents de conteneur.

### Pourquoi une facture peut-elle néanmoins être élevée ?

- **Véhicule en ligne pendant longtemps** — l'intervalle PARKED (10 min) se déclenche en continu
- **Fleet Telemetry pas actif** — pas de mode heartbeat, le poller travaille à l'aveugle
- **Debug / appels API manuels** comptent aussi dans la facture mensuelle

> **Remarque sur les redémarrages de conteneur :** Les plafonds quotidien et mensuel sont désormais
> persistés en DB et ne sont plus réinitialisés par les redémarrages. Plusieurs déploiements par jour
> n'accumulent donc plus de coûts inattendus.

### Recommandations

1. **Configurez Fleet Telemetry** — réduit à ~24 appels heartbeat/jour (~3,60 €/mois)
2. **Activez le hard stop** dans Paramètres → Tesla API → définissez une limite mensuelle
3. **Groupez les déploiements** plutôt que de multiples petits rollouts par jour
4. **Mettez ENABLE_POLLER=false** quand aucune vraie Tesla n'est connectée (par ex. instance démo uniquement)

## Incertitudes / TODOs

* Les tarifs par défaut (0,005 USD/appel, 0,000005 USD/signal de streaming) sont des suppositions approximatives —
  les valeurs exactes dépendent du palier Tesla dont vous disposez et devraient être réconciliées avec le premier
  e-mail de validation.
* Les signaux de streaming sont comptés par donnée dans le payload, pas par topic — si Tesla facture
  différemment (par ex. par abonnement par jour), `recordCall(... 'streaming_signal' ...)` dans
  `fleetTelemetry.js` doit être ajusté.
* Le webhook s'attend à ce que le redirecteur d'e-mail livre du JSON structuré ; le mapping mail → JSON
  vit en dehors de ce dépôt (par ex. dans une définition de flux Power Automate).

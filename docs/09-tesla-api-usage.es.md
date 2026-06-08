# 09 — Rastreador de uso de Tesla Fleet API + Budget Guard

> 🤖 *Esta traducción al español es asistida por IA desde [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](09-tesla-api-usage.md)

Desde que Tesla empezó a cobrar por la Fleet API, la app cuenta cada llamada saliente,
estima el coste previsto usando las tarifas configuradas en el panel de tarifas y,
opcionalmente, bloquea más llamadas a partir de un umbral (hard stop).

## Arquitectura

```
backend/src/services/teslaApi.js   ← apiGet/apiPost/apiProxyPost
        │   (wrapper: assertWithinBudget + recordCall)
        ▼
backend/src/services/teslaUsage.js ← UsageTracker, BudgetGuard, almacén de configuración, clasificación
        │
        ▼
backend/src/db/database.js         ← tablas tesla_api_usage + tesla_usage_events,
                                     tarifas por defecto en tenant_settings
backend/src/routes/teslaUsage.js   ← REST API: /api/tesla-usage/...
backend/src/index.js               ← rutas cableadas, webhook antes de requireAuth,
                                     manejador de errores reenvía statusCode
backend/src/services/fleetTelemetry.js ← se cuentan las señales de streaming

frontend/src/components/TeslaUsageWidget.vue ← visualización en vivo (refresco cada 30 s)
frontend/src/views/Dashboard.vue   ← widget embebido
frontend/src/views/Settings.vue    ← panel admin: tarifas + límite + hard stop
frontend/src/locales/*.json        ← traducciones (los 6 idiomas)
```

## Modelo de datos (por BD de tenant)

`tesla_api_usage` — contador por `(period, category, endpoint)`:

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `period` | TEXT | "YYYY-MM" |
| `category` | TEXT | `vehicle_data` \| `wake` \| `command` \| `streaming_signal` \| `other` |
| `endpoint` | TEXT | ruta normalizada con `:id`/`:vin` enmascarados |
| `count` | INTEGER | número de llamadas |
| `cost_usd` | REAL | coste acumulado en USD |
| `last_call_at` | INTEGER | timestamp Unix |

`tesla_usage_events` — e-mails entrantes de validación de Tesla entregados a través del webhook.

Las tarifas por defecto viven en `tenant_settings` bajo las claves `tesla_usage.*`. Se fijan con
valores conservadores en la creación / migración y pueden ser ajustadas por el admin
en cualquier momento cuando Tesla cambie los precios.

## Clasificación

`categorize(method, path)` comprueba la ruta en este orden:

1. contiene `/oauth2/` o `/oauth/` → `null` (no cuenta)
2. contiene `/wake_up`               → `wake`
3. contiene `/command/`              → `command`
4. contiene `/vehicle_data` o coincide con `/api/1/vehicles[/:id]` o `/fleet_telemetry_config` → `vehicle_data`
5. cualquier otra ruta `/api/1/`     → `other`

`normalizeEndpoint` sustituye los IDs numéricos por `:id` y los VIN de 17 caracteres por `:vin`,
de modo que el contador agregue por endpoint lógico.

## Endpoints REST

| Método | Ruta | Finalidad | Auth |
| --- | --- | --- | --- |
| GET  | `/api/tesla-usage/current`        | Resumen del mes actual + eventos recientes | User |
| GET  | `/api/tesla-usage/details`        | Lista de endpoints ordenada por coste      | User |
| GET  | `/api/tesla-usage/history?months=` | Últimos N meses (máx. 36)                  | User |
| GET  | `/api/tesla-usage/events?limit=`  | Últimos eventos del webhook                 | User |
| GET  | `/api/tesla-usage/config`         | Tarifas / límite / hard stop actuales       | Admin |
| PUT  | `/api/tesla-usage/config`         | Escribir tarifas / límite / hard stop       | Admin |
| POST | `/api/tesla-usage/reset`          | Resetear contadores del mes actual          | Admin |
| POST | `/api/tesla-usage/webhook/email`  | Entregar un e-mail de validación de Tesla   | webhook secret |

## Webhook para e-mails de validación de Tesla

Tesla envía un e-mail de notificación cuando se alcanzan umbrales individuales (50 %, 75 %, 100 %).
Quien sea capaz de reenviarlos (p. ej. con una suscripción de Microsoft Graph, una ruta de Mailgun, etc.)
los publica en `/api/tesla-usage/webhook/email`.

```
POST /api/tesla-usage/webhook/email
X-Webhook-Secret: <valor de TESLA_USAGE_WEBHOOK_SECRET>
Content-Type: application/json

{
  "subject":     "Your Tesla Fleet API spend reached 75 %",
  "body":        "...cuerpo completo del e-mail...",
  "tenantSlug":  "default",        // opcional, si no se aplica a todos los tenants
  "spend_usd":   37.50,            // opcional, si se ha extraído
  "threshold":   "75 %",           // opcional
  "period":      "2026-05"         // opcional
}
```

Respuesta: `{ "stored": <n> }` con el número de tenants cuya tabla de eventos recibió la entrada.

## Hard stop

Cuando `hard_stop_enabled = 1`, `assertWithinBudget(db)` lanza un `TeslaBudgetExceededError`
(HTTP 429) antes de cada llamada a Tesla en cuanto el gasto facturable (coste bruto − crédito gratuito)
alcanza `monthly_limit_usd × hard_stop_pct/100`. El manejador global de errores en `index.js`
reenvía el `statusCode` y devuelve una respuesta JSON estructurada con
`code: "TeslaBudgetExceededError"` y `detail.billable / detail.hardStopAt`.

Por defecto el hard stop está **desactivado** — nadie debería encontrarse con un congelamiento
funcional sin haberlo activado conscientemente.

## Frontend

El widget `TeslaUsageWidget.vue` carga `/api/tesla-usage/current` cada 30 segundos:

* barra grande mostrando el porcentaje de uso frente a `monthly_limit_usd`
* una línea roja vertical marca el umbral del hard stop
* desglose por categoría como pequeños mosaicos (vehicle data / wake / commands / streaming / other)
* nota sobre la deducción del crédito gratuito y el evento de webhook más reciente
* fila con banner rojo cuando se activa el hard stop

El panel de admin en `Settings.vue` muestra:

* moneda, límite mensual, crédito gratuito, % de hard stop + interruptor
* cinco campos de tarifa (USD por llamada o por señal de streaming)
* dos botones: **Guardar tarifas** y **Resetear mes actual**

## Entender y reducir los costes de polling

### ¿Por qué se producen costes?

Sin Fleet Telemetry activa, el poller en segundo plano llama periódicamente a `/vehicle_data`.
Tesla factura **cada** una de esas llamadas (0,005 USD/llamada ≈ 0,005 EUR).

### Modos de polling (sin Fleet Telemetry)

| Modo | Intervalo | Llamadas/día | Coste/mes |
|------|----------|-----------|------------|
| DRIVING — conduciendo activamente (D/R/N) | 30 s | hasta 2.880 | hasta ~43 € |
| PARKED — online pero detenido | 10 min | hasta 144 | hasta ~21 € |
| IDLE — offline / dormido | 45 min | hasta 32 | hasta ~4,50 € |
| Fleet Telemetry heartbeat | 1 h | 24 | ~3,60 € |

**Escenario típico** (8 h online/parked, 16 h durmiendo):
8 × 6 + 16 × 1,3 ≈ **69 llamadas/día** = aproximadamente **1 €/mes**

### Tope diario y tope mensual

Hay un tope diario por vehículo por día integrado (por defecto: 30 llamadas, configurable vía `TESLA_DAILY_CAP`).
Una vez alcanzado, el poller se pausa hasta medianoche UTC.

También hay un tope mensual (por defecto: 400 llamadas, configurable vía `TESLA_MONTHLY_CAP`).
Cuando se alcanza el límite mensual, el polling se detiene automáticamente hasta el mes siguiente.

> **Importante:** Ambos contadores de tope son ahora **persistentes en BD** — se almacenan en la tabla
> `tesla_api_usage` y sobreviven a reinicios del contenedor. Por tanto, varios despliegues por día
> ya no causan reset del tope, lo que previene de forma fiable costes inesperados incluso
> con reinicios frecuentes del contenedor.

### ¿Por qué puede ser igualmente alta una factura?

- **Vehículo online durante mucho tiempo** — el intervalo PARKED (10 min) se dispara continuamente
- **Fleet Telemetry no activa** — sin modo heartbeat, el poller trabaja a ciegas
- **Depuración / llamadas manuales a la API** también cuentan para la factura mensual

> **Nota sobre los reinicios de contenedor:** Los topes diario y mensual son ahora persistentes en BD
> y ya no se resetean con reinicios. Por tanto, varios despliegues por día ya no acumulan costes
> inesperados.

### Recomendaciones

1. **Configurar Fleet Telemetry** — reduce a ~24 llamadas heartbeat/día (~3,60 €/mes)
2. **Activar hard stop** en Ajustes → Tesla API → fijar un límite mensual
3. **Agrupar despliegues** en lugar de hacer muchos pequeños rollouts por día
4. **Definir ENABLE_POLLER=false** cuando no haya un Tesla real conectado (p. ej. instancia sólo demo)

## Incertidumbres / TODOs

* Las tarifas por defecto (0,005 USD/llamada, 0,000005 USD/señal de streaming) son suposiciones aproximadas —
  los valores exactos dependen del tier de Tesla que tengas y deben conciliarse con el primer
  e-mail de validación.
* Las señales de streaming se cuentan por dato en el payload, no por topic — si Tesla factura
  de otra forma (p. ej. por suscripción por día), hay que ajustar `recordCall(... 'streaming_signal' ...)`
  en `fleetTelemetry.js`.
* El webhook espera que el reenviador de correo entregue JSON estructurado; el mapeo mail → JSON
  vive fuera de este repo (p. ej. dentro de una definición de flujo de Power Automate).

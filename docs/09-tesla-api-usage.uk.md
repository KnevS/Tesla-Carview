# 09 — Tesla Fleet API Usage Tracker + Budget Guard

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](09-tesla-api-usage.md) · 🇬🇧 [Read in English](09-tesla-api-usage.en.md)

З тих пір як Tesla почала стягувати плату за Fleet API, застосунок підраховує кожен вихідний виклик,
оцінює очікувану вартість за тарифами, налаштованими в панелі тарифів, і
опціонально блокує подальші виклики за порогом (hard stop).

## Архітектура

```
backend/src/services/teslaApi.js   ← apiGet/apiPost/apiProxyPost
        │   (wrapper: assertWithinBudget + recordCall)
        ▼
backend/src/services/teslaUsage.js ← UsageTracker, BudgetGuard, сховище конфігурації, класифікація
        │
        ▼
backend/src/db/database.js         ← таблиці tesla_api_usage + tesla_usage_events,
                                     стандартні тарифи в tenant_settings
backend/src/routes/teslaUsage.js   ← REST API: /api/tesla-usage/...
backend/src/index.js               ← підключені роути, webhook перед requireAuth,
                                     error handler пересилає statusCode
backend/src/services/fleetTelemetry.js ← стрімінгові сигнали підраховуються

frontend/src/components/TeslaUsageWidget.vue ← live-відображення (оновлення 30 с)
frontend/src/views/Dashboard.vue   ← віджет вбудовано
frontend/src/views/Settings.vue    ← адмін-панель: тарифи + ліміт + hard stop
frontend/src/locales/*.json        ← переклади (усі 6 мов)
```

## Модель даних (per tenant DB)

`tesla_api_usage` — лічильник per `(period, category, endpoint)`:

| Колонка | Тип | Опис |
| --- | --- | --- |
| `period` | TEXT | "YYYY-MM" |
| `category` | TEXT | `vehicle_data` \| `wake` \| `command` \| `streaming_signal` \| `other` |
| `endpoint` | TEXT | нормалізований шлях з маскуванням `:id`/`:vin` |
| `count` | INTEGER | кількість викликів |
| `cost_usd` | REAL | накопичена вартість у USD |
| `last_call_at` | INTEGER | Unix timestamp |

`tesla_usage_events` — вхідні email-листи валідації Tesla, отримані через webhook.

Стандартні тарифи живуть у `tenant_settings` під ключами `tesla_usage.*`. Вони встановлюються на
консервативні значення при створенні / міграції і можуть бути скориговані адміном
у будь-який час, коли Tesla змінить ціни.

## Класифікація

`categorize(method, path)` перевіряє шлях у такому порядку:

1. містить `/oauth2/` або `/oauth/` → `null` (не рахується)
2. містить `/wake_up`               → `wake`
3. містить `/command/`              → `command`
4. містить `/vehicle_data` або відповідає `/api/1/vehicles[/:id]` або `/fleet_telemetry_config` → `vehicle_data`
5. будь-які інші шляхи `/api/1/`    → `other`

`normalizeEndpoint` замінює числові ID на `:id` і 17-символьні VIN на `:vin`,
щоб лічильник агрегував per логічний endpoint.

## REST endpoints

| Метод | Шлях | Призначення | Auth |
| --- | --- | --- | --- |
| GET  | `/api/tesla-usage/current`        | Зведення за поточний місяць + останні події | User |
| GET  | `/api/tesla-usage/details`        | Список endpoints, сортований за вартістю    | User |
| GET  | `/api/tesla-usage/history?months=` | Останні N місяців (макс. 36)               | User |
| GET  | `/api/tesla-usage/events?limit=`  | Останні webhook-події                        | User |
| GET  | `/api/tesla-usage/config`         | Поточні тарифи / ліміт / hard stop          | Admin |
| PUT  | `/api/tesla-usage/config`         | Записати тарифи / ліміт / hard stop         | Admin |
| POST | `/api/tesla-usage/reset`          | Скинути лічильники за поточний місяць       | Admin |
| POST | `/api/tesla-usage/webhook/email`  | Доставити email-валідацію Tesla             | webhook secret |

## Webhook для email-валідацій Tesla

Tesla надсилає email-сповіщення при досягненні окремих порогів (50 %, 75 %, 100 %).
Будь-хто, хто може їх переслати (наприклад, з Microsoft Graph subscription, Mailgun route тощо),
надсилає їх на `/api/tesla-usage/webhook/email`.

```
POST /api/tesla-usage/webhook/email
X-Webhook-Secret: <значення TESLA_USAGE_WEBHOOK_SECRET>
Content-Type: application/json

{
  "subject":     "Your Tesla Fleet API spend reached 75 %",
  "body":        "...повний текст листа...",
  "tenantSlug":  "default",        // опціонально, інакше всі tenants
  "spend_usd":   37.50,            // опціонально, якщо вилучено
  "threshold":   "75 %",           // опціонально
  "period":      "2026-05"         // опціонально
}
```

Відповідь: `{ "stored": <n> }` з кількістю tenants, до таблиці подій яких внесено запис.

## Hard stop

Коли `hard_stop_enabled = 1`, `assertWithinBudget(db)` кидає `TeslaBudgetExceededError`
(HTTP 429) перед кожним викликом Tesla, як тільки billable spend (gross cost − free credit)
досягає `monthly_limit_usd × hard_stop_pct/100`. Глобальний error handler в `index.js`
пересилає `statusCode` і повертає структуровану JSON-відповідь з
`code: "TeslaBudgetExceededError"` та `detail.billable / detail.hardStopAt`.

За замовчуванням hard stop **вимкнено** — ніхто не повинен опинитися перед заморожуванням функціональності без свідомого
opt-in.

## Frontend

Віджет `TeslaUsageWidget.vue` завантажує `/api/tesla-usage/current` кожні 30 секунд:

* велика смуга, що показує відсоток використання відносно `monthly_limit_usd`
* вертикальна червона лінія позначає поріг hard-stop
* розбивка за категоріями як невеликі плитки (vehicle data / wake / commands / streaming / other)
* примітка про віднімання free credit та найостанніша webhook-подія
* червоний банер, коли hard stop спрацював

Адмін-панель у `Settings.vue` показує:

* валюту, місячний ліміт, free credit, hard-stop % + перемикач
* п'ять полів тарифів (USD за виклик відповідно за streaming-сигнал)
* дві кнопки: **Save tariffs** та **Reset current month**

## Розуміння та зменшення витрат на polling

### Чому взагалі виникають витрати?

Без активної Fleet Telemetry фоновий poller періодично викликає `/vehicle_data`.
Tesla тарифікує **кожен** такий виклик (0.005 USD/виклик ≈ 0.005 EUR).

### Режими polling (без Fleet Telemetry)

| Режим | Інтервал | Викликів/день | Вартість/місяць |
|------|----------|-----------|------------|
| DRIVING — активне водіння (D/R/N) | 30 с | до 2 880 | до ~€43 |
| PARKED — online але припарковане | 10 хв | до 144 | до ~€21 |
| IDLE — offline / спить | 45 хв | до 32 | до ~€4.50 |
| Fleet Telemetry heartbeat | 1 год | 24 | ~€3.60 |

**Типовий сценарій** (8 год online/parked, 16 год сну):
8 × 6 + 16 × 1.3 ≈ **69 викликів/день** = приблизно **€1/місяць**

### Денний та місячний cap

Існує вбудований денний cap per авто per день (за замовчуванням: 30 викликів, налаштовується через `TESLA_DAILY_CAP`).
Після досягнення poller призупиняється до півночі UTC.

Також існує місячний cap (за замовчуванням: 400 викликів, налаштовується через `TESLA_MONTHLY_CAP`).
При досягненні місячного ліміту polling зупиняється автоматично до наступного місяця.

> **Важливо:** Обидва лічильники cap тепер **зберігаються в DB** — вони зберігаються в
> таблиці `tesla_api_usage` і переживають перезапуски контейнерів. Кілька розгортань на день
> більше не призводять до скидання cap, надійно запобігаючи несподіваним витратам навіть
> при частих перезапусках контейнерів.

### Чому рахунок все ж може бути високим?

- **Авто online довго** — інтервал PARKED (10 хв) спрацьовує постійно
- **Fleet Telemetry неактивна** — немає heartbeat-режиму, poller працює всліпу
- **Дебаг / ручні API-виклики** також враховуються в місячному рахунку

> **Примітка щодо перезапусків контейнерів:** Денний та місячний cap тепер зберігаються в DB
> і більше не скидаються при перезапусках. Кілька розгортань на день тому
> більше не накопичують несподіваних витрат.

### Рекомендації

1. **Налаштуйте Fleet Telemetry** — зменшує до ~24 heartbeat-викликів/день (~€3.60/місяць)
2. **Увімкніть hard stop** у Налаштування → Tesla API → встановіть місячний ліміт
3. **Об'єднуйте розгортання** замість багатьох дрібних rollouts на день
4. **Встановіть ENABLE_POLLER=false**, коли не підключено справжню Tesla (наприклад, demo-only інстанс)

## Невизначеності / TODO

* Стандартні тарифи (0.005 USD/виклик, 0.000005 USD/streaming-сигнал) — грубі припущення —
  точні значення залежать від Tesla tier, який ви маєте, і повинні бути звірені з першим
  email-валідації.
* Streaming-сигнали підраховуються per datum у payload, не per topic — якщо Tesla тарифікує
  інакше (наприклад, per subscription per day), `recordCall(... 'streaming_signal' ...)` в
  `fleetTelemetry.js` має бути скоригований.
* Webhook очікує, що mail forwarder доставить структурований JSON; mapping mail → JSON
  живе поза цим репо (наприклад, в Power Automate flow definition).

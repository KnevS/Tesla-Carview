# Налаштування Tesla Fleet API

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](04-tesla-api.md) · 🇬🇧 [Read in English](04-tesla-api.en.md)

## Стратегія джерел даних (Telemetry-first, polling як fallback)

Починаючи з переходу на гібридний poller (2026-05) Tesla Carview надає перевагу
**Fleet Telemetry (push)** перед polling. Обидва шляхи активні, але
poller автоматично переходить у режим heartbeat, як тільки
Telemetry почне передавати дані для авто:

| Шлях | Затримка | Вартість | Передумова |
|---|---|---|---|
| **1. Fleet Telemetry (WebSocket push)** | 1–5 сек live | безкоштовно | Затверджений virtual key + HTTPS endpoint + whitelisting Tesla за VIN |
| **2. Fleet API polling (pull)** | 30с online / 5хв idle | $ бюджет за виклик | Лише OAuth-токен |
| **3. Heartbeat polling** | 1×/год | мінімально | Активується автоматично, коли Telemetry активна для VIN |

Реалізація: `backend/src/services/poller.js`, стрімінговий сервер у
`backend/src/services/fleetTelemetry.js`, індикатор стану per-VIN в
Налаштування → ⚡ Підключення Tesla → 📡 Fleet Telemetry.

> Fleet Telemetry потребує схвалення Tesla per **application client ID**
> в Developer Portal. Без схвалення API налаштування повертає
> HTTP 404 — fallback на polling продовжує працювати.

## Створення облікового запису Tesla Developer

1. Створіть обліковий запис на https://developer.tesla.com
2. Створіть новий застосунок:
   - **Name**: Tesla Carview (або будь-яке інше)
   - **Allowed Origins**: `https://your-domain.com`
   - **Allowed Redirect URIs**: `https://your-domain.com/api/auth/callback`
3. Запишіть **Client ID** та **Client Secret**


---

## Реєстрація партнера — автоматично через майстер (рекомендовано)

Починаючи з **v3.23.5**, вам **більше не потрібно реєструвати застосунок у
Tesla вручну через `curl`**. Майстер налаштування (Хаб адміністратора →
🛠️) робить це сам:

1. На кроці **«Облікові дані Tesla Fleet API»** введіть Client ID + Client
   Secret (з [порталу розробників Tesla](https://developer.tesla.com)).
2. TeslaView показує нижче **виявлений домен** вашого екземпляра для
   одноразового підтвердження.
3. Натисніть **«🔑 Зареєструвати в Tesla зараз»** — або просто «Далі», і
   майстер зареєструє автоматично.

У фоновому режимі сервер отримує токен `client_credentials` і викликає
`POST /api/1/partner_accounts` з вашим доменом — саме те, що зробив би
ручний виклик `curl`. Успіх запам'ятовується (`✓ Зареєстровано для
<домен>`); після зміни домену майстер пропонує повторну реєстрацію.

> Endpoint: `POST /api/fleet/partner/register`. Також доступний з
> Налаштування адміністратора → ⚡ З'єднання Tesla.

### Гігієна безпеки

Автоматизацію навмисно побудовано так, щоб не витікали секрети й не
виникало хибних конфігурацій:

- **Client Secret ніколи не залишає сервер.** Він зберігається зашифрованим
  у `tenant_settings` (ключ: `data/.encryption-key`), читається на боці
  сервера й надсилається лише до кінцевої точки токенів Tesla — ніколи не
  повертається у браузер.
- **Домен не можна вибрати довільно.** Завжди реєструється робочий домен
  (`FRONTEND_URL`); значення, надіслане з браузера, є лише резервним, якщо
  `FRONTEND_URL` відсутній. Це запобігає випадковій реєстрації хибного
  домену — Tesla все одно перевіряє його, отримуючи відкритий ключ за
  адресою
  `https://<домен>/.well-known/appspecific/com.tesla.3p.public-key.pem`.
- **Лише адміністратори** можуть запустити реєстрацію.
- **Ідемпотентно.** Повторний виклик безпечний — Tesla просто оновлює
  наявний запис.

> Якщо ви віддаєте перевагу `.env`, ви можете й далі задавати облікові дані
> там (див. нижче) — майстер підхоплює їх автоматично.

---

## Налаштування .env

```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your-domain.com/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Регіони**:
> - Північна Америка: `fleet-api.prd.na.vn.cloud.tesla.com`
> - Європа: `fleet-api.prd.eu.vn.cloud.tesla.com`
>
> Виберіть регіон, що відповідає розташуванню вашого автомобіля.

---

## Підключення автомобіля Tesla

Після входу в застосунок натисніть посилання **"Connect Tesla"**
(або безпосередньо: `https://your-domain.com/api/auth/tesla/login`).

Вас перенаправить на сторінку входу Tesla. Після надання доступу автомобіль
буде автоматично виявлено, і почнеться синхронізація.

---

## Дозволи (OAuth scopes)

| Scope | Призначення |
|---|---|
| `openid` | Ідентичність Tesla |
| `offline_access` | Refresh token (без повторного входу) |
| `vehicle_device_data` | Читання даних поїздок, стану заряду, батареї |
| `vehicle_cmds` | Команди до авто (лише з Virtual Key) |
| `vehicle_charging_cmds` | Команди зарядки |
| `vehicle_location` | GPS-позиція |

---

## Команди до автомобіля (Virtual Key)

Для команд на кшталт клімату, сигналу або дверей додатково потрібен **Virtual Key**.
Проксі `tesla-http-proxy` криптографічно підписує команди — Tesla приймає
лише команди, підписані парованим ключем.

### Кроки налаштування

1. **Згенерувати пару ключів**:
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out tesla_priv.pem
   openssl ec -in tesla_priv.pem -pubout -out tesla_pub.pem
   ```

2. **Опублікувати публічний ключ** за адресою:
   `https://your-domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. **Встановити `tesla-http-proxy`** і запустити його:
   ```bash
   # завантажте бінарник з https://github.com/teslamotors/vehicle-command
   tesla-http-proxy -port 4443 -host 0.0.0.0 \
     -tls-key server.key -cert server.crt \
     -key-file tesla_priv.pem
   ```

4. **Зареєструвати Virtual Key в авто** через застосунок (Налаштування → Virtual Key).

> **Важливо**: приватний ключ (`tesla_priv.pem`) та публічний ключ
> (`.well-known/…`) мають залишатися узгодженими. Новий приватний ключ потребує
> повторного парування в авто.


---

## Інтервал polling

Вбудований poller опитує Tesla API:
- **Кожні 30 секунд**, коли авто активне (їде або заряджається)
- **Кожні 5 хвилин**, коли авто спить (статус 408)

Poller **не будить автомобіль** — стан сну поважається для збереження батареї.

Вимкнути poller (наприклад, для тестування): `ENABLE_POLLER=false` в `.env`.

---

## Особливість XP7 VIN

Автомобілі з префіксом VIN `XP7` (наприклад, Model Y Juniper) не підтримують
параметр `?endpoints=…` на `/vehicle_data`.

**Обхідне рішення**: викликати `/vehicle_data` без параметра `endpoints` — він
повертає `charge_state`, `climate_state` та `vehicle_state`.

GPS через `drive_state` для цих авто недоступний через REST API;
GPS натомість надходить з Fleet Telemetry.

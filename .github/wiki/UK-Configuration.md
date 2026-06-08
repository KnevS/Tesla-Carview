# Конфігурація — Змінні середовища

> 🤖 *Цей український переклад створений з AI-підтримкою з [англійського оригіналу](Home). Виправлення приймаються на GitHub.*

🌐 **Мова:** [EN](Configuration) · [DE](DE-Configuration) · [FR](FR-Configuration) · [ES](ES-Configuration) · [TR](TR-Configuration) · [EL](EL-Home) · **UK**

Усі налаштування Tesla Carview конфігуруються через файл `.env` за адресою `/opt/tesla-carview/backend/.env`.

Після будь-якої зміни `.env` перезапустіть backend:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Обов'язкові налаштування (мають бути встановлені, щоб застосунок працював)

| Змінна | Приклад | Опис |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Секретний ключ для підпису токенів входу. Згенеруйте за допомогою: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | З Tesla Developer Portal |
| `TESLA_CLIENT_SECRET` | `xyz789...` | З Tesla Developer Portal |
| `TESLA_AUTH_BASE` | `https://auth.tesla.com/oauth2/v3` | Базова URL Tesla OAuth — попередньо заповнюється майстром налаштувань; змінюйте, лише якщо Tesla оновить свій кінцевий пункт автентифікації |
| `FRONTEND_URL` | `https://tesla.yourdomain.com` | Публічна URL вашої інсталяції |
| `DATABASE_PATH` | `/app/data` | Де зберігаються бази даних (не змінюйте в Docker) |

---

## Необов'язкові, але рекомендовані

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Встановіть `true` для автооновлення вночі |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Примусове налаштування MFA для всіх нових облікових записів |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Вимагати код запрошення для реєстрації нового орендаря |
| `POLL_INTERVAL_MS` | `60000` | Як часто опитувати Tesla API, коли авто активне (мс) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Інтервал опитування, коли авто спить (мс) |

---

## Динамічний тариф (ціна на електроенергію)

| Змінна | Опис |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — увімкнути aWATTar (DE/AT, безкоштовно) |
| `TIBBER_TOKEN` | Ваш Tibber API-токен (отримайте на [developer.tibber.com](https://developer.tibber.com)) |

---

## Демо-режим

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `DEMO_ENABLED` | `false` | Увімкнути публічного демо-орендаря з фейковими даними |
| `DEMO_MAX_CONCURRENT` | `10` | Максимальна кількість одночасних демо-користувачів |
| `DEMO_LIFETIME_DAYS` | `14` | Скільки тривають демо-акаунти |

---

## Web Push (сповіщення)

VAPID-ключі потрібні для push-сповіщень ("Заряджання завершено", "Настав час технічного обслуговування"). Без них push не працює — решта застосунку працює нормально.

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Публічний ключ — згенерувати за допомогою `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Приватний ключ (генерується одночасно) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | Контактний URI для push-сервісу — ідеально ваш власний email |

Згенеруйте обидва ключі однією командою:
```bash
npx web-push generate-vapid-keys
```

---

## Розширені налаштування / Fleet Telemetry

Fleet Telemetry надає **GPS і телеметрію в реальному часі**, які надсилаються безпосередньо з автомобіля на ваш сервер — замість опитування Tesla API щохвилини. Це необов'язково для більшості інсталяцій, але рекомендовано (або потрібно) для новіших моделей Tesla.

**Коли важлива Fleet Telemetry:**
- Новіші моделі (наприклад, Model Y Juniper, VIN, що починаються з XP7) більше не повертають GPS-дані через стандартне API опитування — тоді Fleet Telemetry є єдиним способом отримати дані про місцеперебування в реальному часі.
- Для старіших моделей це необов'язкове оновлення: нижче навантаження на API, швидші дані та оновлення позиції в реальному часі.

**Передумови:**
1. Спочатку має бути спарений Virtual Key (див. [Налаштування Tesla API](UK-Tesla-API-Setup#step-3-set-up-the-virtual-key-for-commands))
2. Fleet Telemetry має бути **схвалена для вашого Client-ID** в [Tesla Developer Portal](https://developer.tesla.com) — це окремий крок схвалення поза базовим API-доступом. Запросіть це в налаштуваннях вашого застосунку.

| Змінна | Опис |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — увімкнути GPS у реальному часі через Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Порт для сервера Fleet Telemetry (за замовчуванням: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Шлях до файлу приватного ключа Virtual Key |

---

## Як згенерувати безпечний JWT_SECRET

```bash
openssl rand -hex 32
# Вивід: щось на кшталт a8f3e9b2c1d4...
# Скопіюйте це у ваш .env файл
```

---

## Перевірка вашої поточної конфігурації

```bash
# Переглянути поточний .env (обережно з ділянням виводу — містить секрети):
cat /opt/tesla-carview/backend/.env

# Перевірити, які змінні середовища бачить запущений контейнер:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Конфігурація в застосунку (Admin → Admin Settings)

Деякі налаштування не потребують змін у `.env` — вони конфігуруються безпосередньо в адміністративному інтерфейсі та зберігаються в базі даних. Ці налаштування переживають оновлення і не потребують перезапуску контейнера.

| Налаштування | Розташування | Примітки |
|---|---|---|
| SMTP / доставка електронної пошти | Admin → Admin Settings → E-Mail | Хост, порт, користувач, пароль, відправник — включає кнопку send-test |
| OpenChargeMap API-ключ | Admin → Admin Settings → External APIs | Шар зарядних станцій у плануванні маршруту — безкоштовно, реєструйтеся на [openchargemap.io/site/develop](https://openchargemap.io/site/develop#api) |
| HERE Maps API-ключ | Admin → Admin Settings → External APIs | Трафік у реальному часі в плануванні маршруту — безкоштовний рівень (250 тис. запитів/місяць), реєструйтеся на [developer.here.com](https://developer.here.com) |
| xAI API-ключ | Admin → Admin Settings → External APIs | AI-асистент Grok Chat — отримайте на [console.x.ai](https://console.x.ai) |
| Anthropic API-ключ | Admin → Admin Settings → Monitoring | AI-кероване автовиправлення (Claude Haiku) — див. нижче |
| Перемикач самовідновлення | Admin → Admin Settings → Monitoring | Увімкнути/вимкнути автоматичний перезапуск контейнерів |
| Email-адреса для оповіщень | Admin → Admin Settings → Monitoring | Куди надсилаються оповіщення моніторингу |
| Облікові дані Monta | Settings → Vehicle profile → Home charging | На кожен автомобіль: Client ID, Client Secret, Charge-Point ID — доступно для всіх категорій транспортних засобів |
| Ціна електроенергії за кВт·год | Settings → Vehicle profile або майстер налаштувань | Вартість енергії на кожен автомобіль для розрахунків заряджання |

Усе вище також можна налаштувати під час **майстра налаштувань** — прямий доступ до сервера не потрібен.

### Для чого потрібен Anthropic API-ключ?

Tesla Carview включає дворівневу систему моніторингу самовідновлення, яка працює автоматично на сервері:

- **Tier 1 — Автовиправлення на основі правил** (запускається кожні 20 хвилин): Обробляє відомі, детерміновані проблеми — перезапуск зупинених контейнерів, очищення повних дисків, виправлення дозволів файлів. AI не потрібен, завжди активне.
- **Tier 2 — AI-автовиправлення** *(необов'язково)*: Запускається, коли Tier 1 не може виправити проблему. Надсилає журнал помилок до Claude Haiku (Anthropic) і просить запропонувати та опційно застосувати виправлення — потужніший резерв для незвичайних проблем.

> **Tier 2 повністю необов'язковий і його можна просто пропустити.** Система самовідновлюється надійно лише з Tier 1 — для більшості інсталяцій цього більш ніж достатньо. Без ключа Anthropic нерозв'язні проблеми замість цього викликають email-оповіщення.

Отримайте ключ на [console.anthropic.com](https://console.anthropic.com) (оплата за використання, Claude Haiku дуже дешевий — зазвичай кілька центів на місяць за випадкові виклики автовиправлення).

---

## Повний довідник

Для повного списку кожної змінної середовища з детальними описами див. технічну документацію:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)

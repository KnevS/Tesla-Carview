# 🔧 Конфігурація

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](10-configuration.md) · 🇬🇧 [Read in English](10-configuration.en.md) · 👤 [Посібник користувача](../frontend/src/handbook/handbook.en.md) · 🏠 [Індекс документації](.)

Кожна змінна середовища, що керує Tesla Carview. Більшість живуть у `backend/.env` (див. `backend/.env.example` як шаблон). Записи, позначені **(обов'язково)**, мають бути встановлені; усе інше має розумне значення за замовчуванням.

---

## 🔐 Обов'язкові

| Змінна | Опис | Приклад |
|---|---|---|
| `JWT_SECRET` | Секретний ключ для JSON Web Tokens. **≥ 32 символи, криптографічно випадковий.** | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client ID з [Tesla Developer Portal](https://developer.tesla.com) | `abc123…` |
| `TESLA_CLIENT_SECRET` | Client secret з Tesla Developer Portal | `secret…` |
| `FRONTEND_URL` | Публічна HTTPS-URL застосунку — використовується для OAuth-callback та реєстрації passkey | `https://carview.example.com` |
| `RP_NAME` | Відображувана назва у діалогах passkey | `Tesla Carview` |
| `RP_ID` | Домен для WebAuthn (без протоколу, **має збігатися** з `FRONTEND_URL`) | `carview.example.com` |

> ⚠️ `JWT_SECRET` **не повинен змінюватися** під час роботи, інакше всі сесії стануть недійсними. Зміна `RP_ID` робить недійсними всі існуючі passkeys — користувачі мусять переєструватися.

---

## ⚡ Tesla Fleet API

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | OAuth redirect URI. Має бути введено точно в Tesla Developer Portal. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Регіонально-специфічний endpoint Tesla API (NA: `…na.vn.cloud.tesla.com`). |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | Адреса `tesla-http-proxy` для підписаних команд авто. |

Детальні кроки налаштування: [04-tesla-api.en.md](04-tesla-api.en.md) (обліковий запис розробника, реєстрація застосунку, scopes) та [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) (вартість / квоти).

---

## 🔔 Web Push (сповіщення)

VAPID-ключі потрібні для push-сповіщень "зарядка завершена" та нагадувань про обслуговування. Без них push-сповіщення не працюватимуть — усе інше працює.

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Публічний ключ, згенерувати через `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Приватний ключ (той самий генератор) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | Контактний URI для push-сервісу (ідеально ваш власний email) |

---

## 🧪 Демо-пісочниця

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `DEMO_ENABLED` | `false` | Якщо `true`: при старті створюється окремий демо-tenant зі slug `demo`. Сторінка входу показує кнопку "🚀 Demo starten". Жорсткі ліміти: 1 реєстрація per IP per 24 год, макс. 10 одночасних тестерів, кожен обліковий запис живе 14 днів. |

Деталі експлуатації + безпеки: [11-operations.en.md → Demo mode](11-operations.en.md#demo-mode). Тестери автоматично бачать доповнення до сторінок приватності / умов, що документує безумовне видалення через 14 днів.

---

## ⬆️ Авто-оновлення

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Якщо `true`: щонічний cron приблизно о 03:30 Europe/Berlin запускає `git fetch origin main` і при новому коміті виконує `deploy/update.sh`. Спричиняє короткий перезапуск контейнера — maintenance-overlay прикриває це в UI. |
| `UPDATE_REPO_DIR` | `/opt/tesla-carview` | Шлях до git working tree, з яким працює авто-апдейтер. |

Рекомендовано: запустити `deploy/update.sh` вручну кілька разів, освоїтися, потім увімкнути.

---

## ⚙️ Експлуатація та продуктивність

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `PORT` | `3000` | TCP-порт HTTP-сервера backend (всередині контейнера). |
| `DB_PATH` | `/app/data/tesla-carview.db` | Шлях до легасі-бази — мігрується як tenant `default` при першому старті, потім не використовується. |
| `ENABLE_POLLER` | `true` | Якщо `false`: без циклічного polling Tesla API (наприклад, для виділених read-replicas). |
| `TESLA_DAILY_CAP` | `30` | Максимум викликів `vehicle_data` per авто per день. DB-persistent — переживає перезапуски контейнера. |
| `TESLA_MONTHLY_CAP` | `400` | Максимум викликів `vehicle_data` per авто per місяць. Polling зупиняється автоматично при досягненні ліміту. |
| `NODE_ENV` | `production` | Стандартний продакшн-режим. `development` вмикає поведінку dev-server. |

---

## 🌐 Frontend (`frontend/.env`)

Запікається в bundle на **етапі збірки**. Зміна значень потребує пере-білду.

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `VITE_FOOTER_EMAIL` | `''` | Контактний email у футері. Порожній = блок прихований. |
| `VITE_FOOTER_ABOUT_DE` | `''` | URL сторінки "про мене" (німецький варіант). |
| `VITE_FOOTER_ABOUT_EN` | `''` | URL сторінки "про мене" (англійський варіант). |
| `VITE_FOOTER_LINKEDIN_URL` | `''` | LinkedIn-профіль оператора. |

Файл — `.gitignored`. `frontend/.env.example` — шаблон, закомічений у репо.

---

## 🖥️ Конфігурація через Admin UI (з v3.4.0)

З v3.4.0 більшість секретів більше не потрібно вручну додавати в `.env`. **Адмін-майстер налаштування** (Admin Hub → 🛠️) проводить вас через кожен крок.

**Технічний контекст — DB-before-env pattern:**
`configService.js` спершу читає кожне значення з `tenant_settings` (SQLite DB tenant), потім падає на `.env`. Існуючі `.env`-конфігурації продовжують працювати без змін; як тільки значення встановлено через UI, значення з DB має пріоритет.

| Налаштування | Шлях у UI | `.env` fallback-змінна |
|---------|---------|--------------------------|
| Tesla Client-ID | Admin Hub → 🛠️ → Tesla credentials | `TESLA_CLIENT_ID` |
| Tesla Client-Secret | Admin Hub → 🛠️ → Tesla credentials | `TESLA_CLIENT_SECRET` |
| Tesla Audience | Admin Hub → 🛠️ → Tesla credentials | `TESLA_AUDIENCE` |
| VAPID Public Key | Admin Hub → 🛠️ → Web Push | `VAPID_PUBLIC_KEY` |
| VAPID Private Key | Admin Hub → 🛠️ → Web Push | `VAPID_PRIVATE_KEY` |
| VAPID Contact | Admin Hub → 🛠️ → Web Push | `VAPID_CONTACT` |
| Telegram Bot Token | Admin Hub → 🛠️ → Telegram | `TELEGRAM_BOT_TOKEN` |
| xAI / Grok API Key | Admin Hub → 🛠️ → External APIs | `XAI_API_KEY` |
| ABRP Global App Key | Admin Hub → 🛠️ → External APIs | `ABRP_API_KEY` |

> **Згенерувати VAPID-ключі:** Натисніть "🔑 Generate new" в адмін-майстрі — `docker exec` не потрібен.

> **Telegram Bot:** Потребує перезапуску контейнера після першого встановлення токену (`docker compose … up -d --build backend`). Майстер показує сповіщення.

---

## Швидкий довідник: мінімальне налаштування

```bash
# backend/.env (обов'язково)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://carview.example.com
RP_NAME="Tesla Carview"
RP_ID=carview.example.com

# Опціонально, але рекомендовано
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public | awk '{print $3}')
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:you@example.com

# Demo лише коли ви хочете запросити тестерів
# DEMO_ENABLED=true

# Авто-оновлення лише після того, як ви зрозуміли процес оновлення
# AUTO_UPDATE_ENABLED=true
```

Після збереження: `docker compose -f docker-compose.prod.yml up -d --build backend` — backend читає `.env` при старті.

---

## Дивіться також

- [02-deployment.en.md](02-deployment.en.md) — перше розгортання + nginx + Let's Encrypt
- [07-setup-wizard.en.md](07-setup-wizard.en.md) — інтерактивний майстер налаштування
- [11-operations.en.md](11-operations.en.md) — повсякденне: резервне копіювання, відновлення, обслуговування, демо

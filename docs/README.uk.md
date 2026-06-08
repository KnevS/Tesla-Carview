# 📚 Tesla Carview — Технічна документація

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](README.md) · 🇬🇧 [Read in English](README.en.md) · 👤 [Посібник користувача (EN)](../frontend/src/handbook/handbook.en.md)

Ця документація призначена для **самохостерів, адміністраторів та розробників**. Вона охоплює інсталяцію, налаштування, експлуатацію та архітектуру.

> **Користувачі запущеного застосунку** (вхід, журнал поїздок, керування, права, демо, …) знайдуть усе в **посібнику всередині застосунку** за адресою `/handbook` або безпосередньо у файлі [`frontend/src/handbook/handbook.en.md`](../frontend/src/handbook/handbook.en.md). Обидва документи свідомо перетинаються в кількох темах, але завжди посилаються один на одного.

---

## Зміст

### 🚀 Початкове налаштування

| Документ | Тема |
|---|---|
| [01-quickstart.en.md](01-quickstart.en.md) | Швидкий старт: клонувати репозиторій, запустити backend + frontend локально |
| [02-deployment.en.md](02-deployment.en.md) | Продакшн-розгортання на сервері Linux / Raspberry Pi з Docker + nginx + Let's Encrypt |
| [14-network-access.en.md](14-network-access.en.md) | **Доступ звідусіль** без статичної IP — DynDNS, FritzBox, Cloudflare Tunnel, VPS, власний домен |
| [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) | **Сховище Raspberry Pi** — замінити SD-карту на USB SSD, NVMe HAT+, мережеве завантаження PXE |
| [07-setup-wizard.en.md](07-setup-wizard.en.md) | Інтерактивний майстер налаштування (`deploy/setup-wizard.sh`) |
| [08-dokploy.en.md](08-dokploy.en.md) | Альтернатива: розгортання через Dokploy |

### ⚙️ Конфігурація

| Документ | Тема |
|---|---|
| [10-configuration.en.md](10-configuration.en.md) | **Кожна змінна середовища** — обов'язкові, опціональні, демо, авто-оновлення |
| [04-tesla-api.en.md](04-tesla-api.en.md) | Створення облікового запису розробника Tesla, реєстрація застосунку, вибір scope |
| [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) | Tesla API: вартість, квоти, моніторинг |

### 🛠 Експлуатація

| Документ | Тема |
|---|---|
| [11-operations.en.md](11-operations.en.md) | **Резервне копіювання та відновлення**, **нічне обслуговування**, **демо-режим**, авто-оновлення, стан системи, журнали |
| [12-high-availability.en.md](12-high-availability.en.md) | **HA-архітектура** (огляд) — warm standby, active-active, гео-резервування, K8s. Поставляється індивідуально на запит. |

### 🔐 Безпека

| Документ | Тема |
|---|---|
| [03-authentication.en.md](03-authentication.en.md) | Процес автентифікації: JWT, refresh token, MFA, passkeys |
| [05-security-architecture.en.md](05-security-architecture.en.md) | Модель загроз та всі заходи безпеки |
| [06-fail2ban.en.md](06-fail2ban.en.md) | Захист від брутфорсу з fail2ban |

---

## Де знаходиться кожна одиниця інформації?

| Питання | Відповідь |
|---|---|
| "Як встановити Tesla Carview на сервер?" | [02-deployment.en.md](02-deployment.en.md) |
| "Яка змінна ENV відповідає за X?" | [10-configuration.en.md](10-configuration.en.md) |
| "Як створити резервну копію?" | [11-operations.en.md](11-operations.en.md) |
| "Моя Tesla не з'являється — що тепер?" | [Посібник користувача → Troubleshooting](../frontend/src/handbook/handbook.en.md#-troubleshooting) |
| "Як використовувати журнал поїздок для податкової?" | [Посібник користувача → BMF logbook](../frontend/src/handbook/handbook.en.md#-logbook-for-the-tax-office-bmf-compliant-fahrtenbuch-bmf) |
| "Як увімкнути MFA для свого облікового запису?" | [Посібник користувача → Security](../frontend/src/handbook/handbook.en.md#-security) |
| "Чому нові облікові записи потребують MFA?" | [03-authentication.en.md](03-authentication.en.md) (архітектура) та [Посібник користувача → Security](../frontend/src/handbook/handbook.en.md#-security) (з боку користувача) |
| "Як працює демо-режим зсередини?" | [11-operations.en.md → Demo mode](11-operations.en.md#-demo-mode) |
| "Що записується в журнал аудиту?" | [05-security-architecture.en.md](05-security-architecture.en.md) та інтерфейс `/admin/audit` |

---

## Пов'язані матеріали поза документацією

- **`backend/.env.example`** — прокоментований шаблон конфігурації backend
- **`frontend/.env.example`** — шаблон контактів для футера (на момент білду)
- **`deploy/setup.sh`** — повністю автоматизоване налаштування сервера
- **`deploy/setup-wizard.sh`** — інтерактивний майстер
- **`deploy/update.sh`** — оновлення без простою
- **`docker-compose.prod.yml`** — продакшн-стек з backend + frontend + nginx

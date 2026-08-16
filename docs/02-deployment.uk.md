# Розгортання — сервер Linux та Raspberry Pi

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md) · 🇬🇧 [Read in English](02-deployment.en.md)

Tesla Carview працює на **усіх поширених платформах**:

| Платформа | Архітектура | Перевірено |
|---|---|---|
| Сервер Linux (VPS, виділений) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (і старіші) | ARMv7 | ✗ ¹ |
| Windows (Docker Desktop + WSL2) | x86_64 | ✓ ² |
| Локальна розробка (Mac/Windows/Linux) | усі | ✓ |

¹ **Raspberry Pi 3 і старіші (32-бітний ARM) більше не підтримуються, починаючи з v3.51.0.** Node.js не публікує образи ARMv7 з версії 24 — ані alpine, ані Debian —, тому образ бекенду там більше не збирається. `deploy/setup.sh` на таких системах зупиняється з поясненням, замість того щоб впасти пізніше під час завантаження образу.

² **Windows працює, але не перевіряється в CI.** Застосунок повністю живе в Linux-контейнерах; Windows — лише хост. Подробиці й два обмеження: розділ «Windows (Docker Desktop)» у кінці цієї сторінки.


---

## Передумови

- Debian/Ubuntu (або Raspberry Pi OS)
- Доступ root
- Опціонально: власний домен з A-записом, що вказує на IP сервера (для HTTPS)
- Обліковий запис Tesla Developer ([04-tesla-api.en.md](./04-tesla-api.en.md))

> **Використовуєте Raspberry Pi?** Спершу прочитайте [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) — SD-карти не витримують постійного запису. Налаштування USB SSD або NVMe займає 20 хвилин і позбавляє багатьох проблем у майбутньому.
>
> **Немає статичної IP?** [14-network-access.en.md](14-network-access.en.md) покроково пояснює DynDNS, Cloudflare Tunnel та варіанти з VPS.
>
> **Рекомендований початковий VPS:** [netcup VPS nano G11s](https://www.netcup.com/en/server/vps-lite) (2 vCore, 2 GB RAM, 60 GB SSD, ~€3.08/місяць) — найдешевший перевірений VPS, який відповідає всім вимогам Tesla Carview, включно з достатнім місцем для кількох років даних телеметрії. Промокод доступний на запит: [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com).

---

## 📦 Автоматичне налаштування (для всіх)

```bash
# Від root на цільовій машині:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Або вручну:
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

Скрипт автоматично визначає архітектуру і виконує:
1. Встановлення системних пакетів (nginx, certbot, docker, ufw, fail2ban)
2. Налаштування firewall (SSH, HTTP, HTTPS)
3. fail2ban для захисту SSH
4. Запуск майстра налаштування
5. SSL від Let's Encrypt (якщо вказано HTTPS-домен)
6. nginx з посиленим TLS
7. Запуск Docker-контейнерів (multi-arch)

---

## Запуск майстра налаштування

```bash
bash /opt/tesla-carview/deploy/setup-wizard.sh
```

Майстер запитує інтерактивно:
- Публічну URL (наприклад, `https://tesla.example.com` або `http://192.168.1.100:8080`)
- Tesla API Client-ID та Client-Secret
- Шлях до бази даних
- Email для SSL-сертифікатів
- VAPID-ключі для Web Push (опціонально)

---

## Raspberry Pi — особливості

```bash
# підготовка Raspberry Pi OS (якщо потрібно):
sudo apt-get update && sudo apt-get upgrade -y

# встановити Docker для ARM (виконується автоматично через setup.sh):
curl -fsSL https://get.docker.com | sh
```

На Raspberry Pi всередині домашньої мережі nginx/SSL не потрібен — контейнер застосунку доступний прямо на порту 8080.
Встановіть `FRONTEND_URL=http://192.168.1.100:8080` в `.env`.

---

## Налаштування Tesla API

```bash
nano /opt/tesla-carview/backend/.env
```

Обов'язкові поля:
```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your.domain.com/api/auth/callback
```

Перезапустіть контейнери:
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

---

## Початкова конфігурація (веб-майстер)

При першому запуску застосунок автоматично відкриває **/setup** у браузері.
Саме там створюється перший обліковий запис адміністратора.

---

## Застосування оновлень

```bash
bash /opt/tesla-carview/deploy/update.sh
```

---

## Автоматичне розгортання

Існує два шляхи для автоматичного розгортання при кожному push до `main`:

| Метод | Найкраще для | Інструкція |
|---|---|---|
| **GitHub Actions + SSH** | Один застосунок, наявний сервер, повний контроль | Дивіться нижче |
| **Dokploy** | Кілька застосунків, потрібен веб-інтерфейс, простіший SSL | [08-dokploy.en.md](./08-dokploy.en.md) |

---

## GitHub Actions auto-deploy

Автоматичне розгортання при кожному push до `main`.

### Передумова: створити SSH-ключ для розгортання

```bash
# на сервері:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""

# авторизувати публічний ключ для SSH-користувача:
cat ~/.ssh/tesla_deploy.pub >> /home/YOUR_USER/.ssh/authorized_keys
```

> **Примітка**: користувач для deploy потребує passwordless sudo для `docker` та `git`:
> ```bash
> echo 'YOUR_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/git' \
>   > /etc/sudoers.d/tesla-deploy
> ```

### Встановити GitHub secrets

GitHub → репозиторій → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Опис | Приклад |
|---|---|---|
| `DEPLOY_HOST` | Хост або IP сервера | `123.456.789.0` |
| `DEPLOY_USER` | Ім'я SSH-користувача | `deploy` |
| `DEPLOY_SSH_KEY` | Вміст `~/.ssh/tesla_deploy` (приватний ключ) | `-----BEGIN OPENSSH…` |
| `DEPLOY_APP_DIR` | Шлях встановлення на сервері | `/opt/tesla-carview` |


---

## Резервне копіювання бази даних

```bash
# створити резервну копію:
cp /opt/tesla-carview/data/master.db /opt/backups/master-$(date +%Y%m%d-%H%M).db
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/

# автоматично щодня о 3 ранку (crontab -e від root):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

> **Примітка:** Tesla Carview використовує bind-mount (`./data:/app/data`), а не іменований Docker volume. Усі файли бази даних знаходяться безпосередньо в `/opt/tesla-carview/data/` на хості. Альтернативно, можна налаштувати вбудоване авто-резервне копіювання в системних налаштуваннях застосунку (локально, шлях, S3 або SFTP).

---

## Перевірка стану після встановлення

Після початкового налаштування (і у будь-який момент пізніше) ви можете запустити вбудовану перевірку гігієни:

```bash
bash /opt/tesla-carview/scripts/hygiene-check.sh
```

Скрипт перевіряє 7 областей та виводить кольорову зведену таблицю:

| # | Перевірка | Авто-виправлення |
|---|---|---|
| 1 | Системне оточення — версія Docker, Node.js ≥ 20, використання диска | — |
| 2 | Безпека залежностей — `npm audit` для frontend + backend | `--fix` запускає `npm audit fix` |
| 3 | Розмір bundle — основний JS chunk vs. пороги (warn > 1.2 MB, fail > 1.5 MB) | — |
| 4 | Повнота `.env` — чи присутні всі обов'язкові ключі? | — |
| 5 | Стан Docker — нездорові/зупинені контейнери, dangling образи + volumes | `--fix` чистить образи |
| 6 | Цілісність бази даних — SQLite `PRAGMA integrity_check` для кожного tenant | — |
| 7 | SSL-сертифікат — кількість днів до закінчення для вашого домену | — |

```bash
# Режим CI (без кольорів, exit 1 при помилках — використовується setup.sh та GitHub Actions):
bash scripts/hygiene-check.sh --ci

# Режим авто-виправлення (запускає npm audit fix, чистить образи Docker):
bash scripts/hygiene-check.sh --fix
```

Завдання нічного обслуговування (`backend/src/services/nightlyMaintenance.js`) запускає підмножину цих перевірок щоночі автоматично о 03:30 за Europe/Berlin і записує результати в журнал стану адміністратора (`Admin → System → Maintenance`).

---

## Перегляд журналів

```bash
# журнали backend:
docker compose -f docker-compose.prod.yml logs -f backend

# журнали nginx:
tail -f /var/log/nginx/tesla-carview.access.log
```

---

## Робота за власним зворотним проксі

Якщо ви встановлюєте `setup.sh` у **режимі проксі** (nginx, Caddy або Traefik уже є), конфігурація nginx не створюється і ліміти запитів потрібно налаштувати самостійно. Якщо їх немає або вони надто жорсткі, застосунок отримує HTTP 429 і виглядає зламаним: сторінки завантажуються наполовину, і здається, що допомагає лише перезавантаження.

| Шлях | Рекомендація | Чому |
|---|---|---|
| `/api/auth/login` | 10/хв, burst 3 | Захист від перебору паролів |
| `/api/tiles/` | 1200/хв, burst 300 | Одне масштабування карти завантажує 50–150 тайлів одразу |
| `/api/` (решта) | 120/хв, **burst ≥ 60** | Одна зміна сторінки надсилає 15–26 запитів |

Специфічніший шлях має вигравати: якщо `/api/tiles/` потрапляє під загальний ліміт API, одне масштабування карти блокує весь API. Критичне значення — не стала швидкість, а burst.

Готові шаблони є в репозиторії: [`deploy/nginx-host.conf.template`](../deploy/nginx-host.conf.template) та [`deploy/traefik-dynamic.example.yml`](../deploy/traefik-dynamic.example.yml).

Звідки прийшов 429, видно з самої відповіді:

- Заголовок `x-retry-in` → **Traefik**
- HTML-сторінка помилки без додаткових заголовків → **nginx** (`limit_req`)
- `ratelimit-limit` / `ratelimit-remaining` → **застосунок** (express-rate-limit)

---

## Windows (Docker Desktop)

Застосунок повністю працює в Linux-контейнерах — Windows лише хост. З **Docker Desktop у режимі WSL2** запускається той самий стек, що й на Linux-сервері. `setup.sh` там не працює (bash, apt, systemd, certbot); замість нього є `deploy/setup-windows.ps1`.

```powershell
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
powershell -ExecutionPolicy Bypass -File .\deploy\setup-windows.ps1
```

Скрипт створює `backend\.env` з випадковим `JWT_SECRET`, записує `docker-compose.override.yml` для Windows і запускає стек. Далі відкрийте `http://localhost:8080`.

### Два обмеження — обидва виміряні, жодного не обійти

1. **Жодних команд до автомобіля.** Підписані команди йдуть через `tesla-http-proxy`, якому потрібні bind-mount `/etc/tesla-proxy` і фіксований UID 988 — нічого з цього в Windows немає. Тому сервіс лишається вимкненим; бекенд усе одно стартує, бо його `depends_on` має `required: false`. Усе, що на читання — поїздки, зарядки, аналітика, журнал, планувальник маршруту — працює повністю.
2. **`host.docker.internal` вказує в інше місце.** Docker Desktop сам додає це ім’я до `/etc/hosts` кожного контейнера, і цей запис перемагає мережевий alias із compose-файлу. Виміряно: ім’я тоді резолвиться на шлюз хоста (172.17.0.1) замість контейнера проксі — команди тихо йшли не туди. Хто все ж запускає проксі, ставить у `backend\.env` значення `TESLA_PROXY_BASE=https://tesla-carview-proxy:4443`.

### Не плутайте два файли `.env`

Застосунок читає `backend\.env` (передається в контейнер як `env_file`). Сам Compose читає `.env` у **корені проєкту** і підставляє з нього `${...}` у compose-файлах (`TESLA_PROXY_CONFIG_DIR`, `TESLA_PROXY_UID`, `OLLAMA_MEMORY_LIMIT`). Виміряно, бо природним здається протилежне: запис у `backend/.env` на цю підстановку **не** впливає. Шаблон: `.env.example` у корені проєкту.

### HTTPS — не специфіка Windows

Tesla вимагає публічно доступну HTTPS-адресу — для входу, партнерської реєстрації та Fleet Telemetry. Це однаково стосується будь-якої домашньої інсталяції, незалежно від операційної системи. Варіанти (DynDNS, Cloudflare Tunnel, VPS) описані в [14-network-access.uk.md](14-network-access.uk.md).

### Оновлення

`deploy/update.sh` — bash-скрипт і в Windows не виконується. Натомість:

```powershell
git pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
```

### Що означає «не перевіряється в CI»

Docker build gate збирає Linux-образи для amd64 і arm64; жодного Windows-хоста ніде не перевіряють автоматично. Шлях описано, а пастки вище виміряно на справжньому Docker-демоні — але постійно перевіряють його лише ті, хто ним іде.

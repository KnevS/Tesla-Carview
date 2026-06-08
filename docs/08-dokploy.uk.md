# Розгортання з Dokploy

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](08-dokploy.md) · 🇬🇧 [Read in English](08-dokploy.en.md)

[Dokploy](https://dokploy.com) — це self-hosted open-source PaaS-платформа
(порівнянна з Coolify або Railway). Вона займається маршрутизацією, SSL (через Let's Encrypt + Traefik),
журналами та GitHub webhooks для автоматичного розгортання — без надмірності повноцінного
CI/CD-пайплайна.

**Коли це має сенс:**
- Ви хочете веб-інтерфейс замість SSH-команд для керування розгортанням
- Кілька застосунків працюють на одному сервері
- Ви не хочете окремий workflow GitHub Actions

---

## 1. Встановити Dokploy на сервер

```bash
# від root на свіжому VPS (рекомендовано Debian/Ubuntu):
curl -sSL https://dokploy.com/install.sh | sh
```

Після цього Dokploy запускається на порту **3000**. Відкрийте `http://YOUR-SERVER-IP:3000` у браузері
і створіть обліковий запис адміна.

> Примітка щодо firewall: порт 3000 має бути тимчасово доступний. Після входу Dokploy
> може налаштувати власний домен + SSL для dashboard. Після цього порт 3000 можна закрити.

---

## 2. Додати Tesla Carview як застосунок

У dashboard Dokploy:

1. **Projects** → **Create Project** (наприклад, `tesla-carview`)
2. Усередині проєкту: **Create Service** → **Application**
3. Назва: `tesla-carview`
4. Тип збірки: **Docker Compose**
5. Compose-файл: `docker-compose.prod.yml`

---

## 3. Підключити репозиторій GitHub

### Варіант A — GitHub App (рекомендовано)

1. Dashboard Dokploy → **Settings** → **Git Providers** → **GitHub App** → **Install**
2. Надати дозвіл для репозиторію `Tesla-Carview`
3. У конфігурації застосунку: **Source** → виберіть репозиторій, гілка: `main`

### Варіант B — публічний репозиторій (без auth)

Просто введіть HTTPS URL у **Source**:
```
https://github.com/YOUR-GITHUB-USER/Tesla-Carview.git
```
Гілка: `main`

---

## 4. Встановити змінні середовища

На вкладці **Environment** застосунку введіть усі змінні з `.env`-файлу.
Мінімальний набір обов'язкових полів:

| Змінна | Опис |
|---|---|
| `JWT_SECRET` | Довге випадкове значення (`openssl rand -hex 64`) |
| `TESLA_CLIENT_ID` | Client ID застосунку Tesla Developer |
| `TESLA_CLIENT_SECRET` | Secret застосунку Tesla Developer |
| `TESLA_REDIRECT_URI` | `https://your.domain.com/api/auth/callback` |
| `FRONTEND_URL` | `https://your.domain.com` |
| `NODE_ENV` | `production` |

> Усі інші змінні з `backend/.env.example` можна додавати за потребою.

---

## 5. Налаштувати домен та SSL

На вкладці **Domains**:

1. **Add Domain** → `your.domain.com`
2. SSL-провайдер: **Let's Encrypt** (автоматично через Traefik)
3. Цільовий порт: **80** (контейнер nginx frontend займається внутрішньою маршрутизацією)

A-запис домену має вказувати на IP сервера.

---

## 6. Постійні дані (bind-mount)

Tesla Carview використовує **bind-mount** (`./data:/app/data`), а не іменований Docker volume.
Усі файли БД (`master.db`, `tenants/*.db`) знаходяться безпосередньо в піддиректорії `data/`
директорії застосунку на хості — за замовчуванням `/opt/tesla-carview/data/`.

Простого `cp` достатньо для резервної копії:

```bash
# ручна резервна копія:
cp /opt/tesla-carview/data/master.db /opt/backups/
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

Вбудоване авто-резервне копіювання (Системні налаштування → Автоматичне резервування) альтернативно може відправляти резервні копії
в S3 або через SFTP — cron-завдання на стороні хоста не потрібне.

---

## 7. Запустити перше розгортання

На вкладці застосунку, праворуч угорі: **Deploy** → Dokploy отримує код з GitHub,
збирає Docker-образи та запускає контейнери.

Журнали під час збірки:
- Вкладка **Deployments** → клацніть поточне розгортання → виведення журналу в реальному часі

---

## 8. Автоматичне розгортання при push до GitHub

### Передумова: інтеграція GitHub App (крок 3A)

З інтеграцією GitHub App Dokploy реєструє webhook автоматично.
Кожен push до `main` запускає нове розгортання — без додаткової конфігурації.

### Ручний webhook (варіант B / без GitHub App)

1. Dokploy → застосунок → вкладка **General** → скопіюйте **Webhook URL**
   (формат: `https://dokploy.your.domain.com/api/deploy/XXXXX`)
2. GitHub → репозиторій → Settings → Webhooks → **Add webhook**
   - Payload URL: скопійований webhook URL
   - Content type: `application/json`
   - Secret: залиште порожнім (або встановіть у Dokploy)
   - Trigger: **Just the push event**

Відтепер: push до `main` → Dokploy збирає та розгортає автоматично.

---

## 9. Журнали та моніторинг

```
Dashboard Dokploy → App → Logs
```

Або безпосередньо через Docker на сервері:

```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs -f backend
```

---

## Порівняння: Dokploy vs. GitHub Actions SSH

| Критерій | GitHub Actions + SSH | Dokploy |
|---|---|---|
| Веб-інтерфейс для журналів/статусу | ✗ (лише GitHub UI) | ✓ |
| Автоматизація SSL | Вручну (Certbot) | ✓ (Traefik) |
| Кілька застосунків на одному сервері | Складно | ✓ |
| Власна логіка CI/CD | ✓ (гнучко) | ✗ (лише збірка + старт) |
| Витрати ресурсів (сам Dokploy) | немає | ~200 MB RAM |
| Залежність від GitHub | ✓ (Actions) | Опціонально (webhook достатньо) |

---

## Подальше читання

- [Документація Dokploy](https://docs.dokploy.com)
- [Tesla Carview — GitHub Actions SSH deploy](./02-deployment.en.md#github-actions-auto-deploy)
- [Налаштувати Tesla API](./04-tesla-api.en.md)

# Усунення несправностей

> 🤖 *Цей український переклад створений з AI-підтримкою з [англійського оригіналу](Home). Виправлення приймаються на GitHub.*

🌐 **Мова:** [EN](Troubleshooting) · [DE](DE-Troubleshooting) · [FR](FR-Troubleshooting) · [ES](ES-Troubleshooting) · [TR](TR-Troubleshooting) · [EL](EL-Home) · **UK**

Рішення для найпоширеніших проблем. Почніть з найімовірнішої причини і працюйте вниз.

---

## 🚫 Не вдається взагалі дістатися до застосунку

### Перевірка: Чи запущений сервер?

```bash
# Перевірити статус контейнерів:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Має показати всі контейнери як "Up":
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Якщо будь-який контейнер показує "Exit" або "Restarting":
```bash
# Переглянути журнали для проблемного контейнера:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Перезапустити все:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Перевірка: Чи правильно резолвиться домен?

```bash
nslookup tesla.yourdomain.com
# Має показати IP-адресу вашого сервера

# Або з вашого браузера: відвідайте https://dnschecker.org
```

Якщо DNS не резолвиться → зачекайте 10–30 хвилин після зміни записів DNS.

### Перевірка: Чи блокує доступ фаєрвол?

```bash
ufw status
# Порти 80 і 443 мають показати ALLOW
```

Якщо їх немає:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" або "503 Service Unavailable"

Це означає, що nginx працює, але backend не відповідає.

```bash
# Перевірити backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Поширена причина: backend впав через помилку запуску. Часто відсутня змінна `.env` або проблема з дозволами бази даних.

Виправити дозволи бази даних:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 Помилки SSL/HTTPS ("Certificate not valid", "NET::ERR_CERT_EXPIRED")

Сертифікат Let's Encrypt закінчився або не був виданий правильно.

```bash
# Перевірити статус сертифіката:
certbot certificates

# Поновити вручну:
certbot renew --force-renewal
systemctl restart nginx
```

Якщо certbot не може поновити (DNS не резолвиться, порт 80 заблокований):
1. Перевірте, що порт 80 відкритий у вашому фаєрволі ТА на вашому роутері (перенаправлення портів)
2. Перевірте, що DNS вашого домену вказує на IP вашого сервера

---

## 🚗 Автомобіль не показує дані / показує "offline"

### Tesla API не підключений
→ Перевірте **Admin → System → System Health** — розділ "Tesla Token" показує статус підключення.

Якщо закінчився: **Admin → System → Reconnect Tesla Account**

### Автомобіль спить
Автомобілі Tesla засинають після 15–30 хвилин бездіяльності. Застосунок чекає, поки автомобіль прокинеться. Ви можете розбудити його вручну:
1. Відкрийте офіційний застосунок Tesla на вашому телефоні
2. Натисніть будь-яку функцію (клімат, сигнал), щоб розбудити автомобіль
3. Tesla Carview має оновитися протягом 60 секунд

### XP7 VIN (Model Y Juniper) — GPS не оновлюється
Деякі новіші автомобілі не повертають GPS-дані через стандартний REST API. Це обмеження Tesla. Fleet Telemetry надає GPS-дані для цих автомобілів — зверніться до [Tesla Fleet Telemetry Access](https://developer.tesla.com), якщо це потрібно.

---

## 🔑 "Tesla API повернув 403 Forbidden"

Усі виклики Tesla API повертають 403? Це зазвичай означає, що ваш **обліковий запис розробника Tesla призупинено або має білингову проблему**.

1. Увійдіть до [developer.tesla.com](https://developer.tesla.com)
2. Перевірте на будь-які попередження про обліковий запис, білингові повідомлення або повідомлення про призупинення
3. Завершіть будь-яку потрібну білингову інформацію (навіть для безкоштовного рівня може знадобитися кредитна картка)
4. Після вирішення: **Admin → System → Reconnect Tesla Account**

---

## 🧭 Майстер налаштування завершується помилкою під час створення адміністратора

**Симптом:** Під час нової інсталяції крок 2 майстра (створення облікового запису адміністратора) завершується помилкою `Transaction function cannot return a promise`. Стосується версій до v3.32.5 включно.

**Причина та вирішення:** Помилка в `/api/setup/init` ([#170](https://github.com/KnevS/Tesla-Carview/issues/170)) — **виправлено у v3.32.6**. Оновіться до останньої версії та знову відкрийте майстер:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Після цього обліковий запис адміністратора можна створити знову. Наявні інсталяції не зачіпаються.

---

## 🔐 Проблеми з входом

### "Invalid username or password" — але я впевнений, що правильно

- Перевірте Caps Lock
- Якщо ви нещодавно змінили паролі, спробуйте старий (браузер міг закешувати старий)
- Адмін-облікові записи можуть скинути паролі користувачів: **Admin → Users → ваш обліковий запис → Reset Password**

### "Account locked"

Після 5 невдалих спроб входу обліковий запис блокується на 15 хвилин. Зачекайте або попросіть адміна розблокувати.

Адміністратори можуть розблокувати через:
```bash
# У контейнері:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Забув пароль адміна

Якщо ви не можете увійти як адмін:
```bash
# Отримати shell у backend-контейнері:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Скинути пароль (замініть значення):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Вам потрібен ID орендаря — знайдіть його в master.db:
// getDb викликається з UUID орендаря
"
```

Або простіше: відновіть з резервної копії, яку ви зробили, коли знали пароль.

---

## 📱 Push-сповіщення не працюють

### Desktop
1. Перевірте дозволи сповіщень браузера: натисніть значок замка в адресному рядку → Notifications → Allow
2. Перевірте, що застосунок використовує HTTPS (потрібно для push)
3. Спробуйте: Settings → Push Notifications → Test Notification

### iOS (iPhone/iPad)
Push-сповіщення на iOS працюють лише з **ярлика Home Screen** (PWA), а не з вкладки браузера.
1. Відкрийте Tesla Carview у Safari
2. Натисніть Share → "Add to Home Screen"
3. Відкрийте зі значка Home Screen → сповіщення тепер працюють

---

## 🐛 Команди не працюють (клімат, замки тощо)

Команди вимагають спарювання Virtual Key:
1. Перевірте: **Settings → Virtual Key** — статус має показати "Paired"
2. Якщо не спарено: відкрийте URL спарювання в **браузері автомобіля Tesla** (не на телефоні)
3. Підтвердьте в застосунку Tesla на вашому телефоні

Також перевірте: **Admin → System → Virtual Key Status**

---

## 🗄️ Помилки бази даних ("disk I/O error", "database is locked")

Зазвичай викликано несправною SD-картою на Raspberry Pi. Перевірте:

```bash
# Перевірити файлову систему на помилки:
dmesg | grep -i "error\|fail\|corrupt"

# Перевірити здоров'я SD-карти:
df -h
```

Якщо ви бачите помилки I/O → ваша SD-карта виходить з ладу. **Негайно зробіть резервну копію** і переключіться на USB SSD: [→ Сховище Raspberry Pi](UK-Raspberry-Pi-Storage)

---

## 📋 Перегляд журналів

```bash
# Журнали застосунку backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# Журнал доступу nginx:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Системний журнал (fail2ban тощо):
journalctl -u fail2ban --since "1 hour ago"

# Бани fail2ban:
fail2ban-client status sshd
```

---

## Все ще застрягли?

1. Перевірте [GitHub Issues](https://github.com/KnevS/Tesla-Carview/issues) — можливо, у когось була та сама проблема
2. Відкрийте нове issue з:
   - Що ви спробували
   - Що сталося (повідомлення про помилки, скріншоти)
   - Ваше налаштування (модель Pi, провайдер VPS, версія OS)
   - Відповідний вивід журналу (відредагуйте будь-які паролі чи секрети)

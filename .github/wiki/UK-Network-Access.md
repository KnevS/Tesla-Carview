# Доступ через мережу — без статичного IP

> 🤖 *Цей український переклад створений з AI-підтримкою з [англійського оригіналу](Home). Виправлення приймаються на GitHub.*

🌐 **Мова:** [EN](Network-Access) · [DE](DE-Network-Access) · [FR](FR-Network-Access) · [ES](ES-Network-Access) · [TR](TR-Network-Access) · [EL](EL-Home) · **UK**

Tesla Carview працює на вашому власному сервері — але щоб до нього можна було дістатися з інтернету (включно з вашої Tesla), вам потрібна стабільна, публічно доступна адреса. Ця сторінка проводить вас через кожну опцію крок за кроком.

> **Не IT-експерт?** Дотримуйтесь цієї сторінки зверху донизу. Кожна опція включає точні інструкції без припущень про знання.

---

## Яка опція мені підходить?

| Ваша ситуація | Найкраща опція |
|---|---|
| Домашній інтернет (IP змінюється щодня) | [Опція A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended) або [Опція B: DynDNS + Router](#option-b-dyndns--home-router) |
| Кабель / оптоволокно — **не можна відкривати порти** (CG-NAT) | [Опція A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended) |
| VPS / сервер у хостинг-провайдера | [Опція C: VPS зі статичним IP](#option-c-vps-at-a-hosting-provider) |
| Ви володієте доменом | [Опція D: Власний домен + DNS-запис](#option-d-own-domain-with-dns-record) |

---

## Проблема з домашнім інтернетом

Ваше домашнє інтернет-з'єднання отримує **нову IP-адресу щодня** (або частіше). Це означає, що адреса, яку ви вводите сьогодні, завтра вже неправильна.

**Dynamic DNS** вирішує це:
- Ви резервуєте фіксоване ім'я хоста (напр. `my-tesla.duckdns.org`)
- Маленька програма на вашому роутері або сервері автоматично повідомляє кожен новий IP
- Ваше ім'я хоста завжди вказує на поточний IP — без ручних оновлень

---

## Ви за CG-NAT?

Багато кабельних провайдерів (Vodafone, Virgin Media та інші) більше не дають кожному клієнту власний публічний IPv4. Кілька клієнтів ділять один IP — це **Carrier-Grade NAT (CG-NAT)**.

**Як перевірити:**
1. Відвідайте [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — запам'ятайте показаний IP
2. Відкрийте сторінку статусу вашого роутера — запам'ятайте WAN IP там
3. Якщо два IP **різні** → ви за CG-NAT

З CG-NAT перенаправлення портів **не працює**. Використовуйте Опцію A (Cloudflare Tunnel) — вона не потребує відкритих портів.

---

## Опція A: Cloudflare Tunnel (Рекомендовано)

Cloudflare Tunnel створює зашифроване вихідне з'єднання з вашого сервера до глобальної мережі Cloudflare. Перенаправлення портів не потрібне. Безкоштовно. Працює за CG-NAT.

**Вимоги:** Домен або безкоштовний піддомен (інструкції нижче).

### Крок 1: Отримайте безкоштовний домен (якщо у вас його немає)

Перейдіть на [duckdns.org](https://www.duckdns.org), увійдіть через Google або GitHub, виберіть назву → ви отримаєте напр. `my-tesla.duckdns.org` безкоштовно.

Або купіть дешевий домен (~$1/рік) на [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) або [inwx.de](https://www.inwx.de).

### Крок 2: Додайте ваш домен до Cloudflare

1. Зареєструйтеся на [dash.cloudflare.com](https://dash.cloudflare.com) — безкоштовно
2. Натисніть **"Add a Site"** → введіть ваш домен → **Free plan**
3. Cloudflare показує вам дві адреси nameserver, напр.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Перейдіть до вашого реєстратора домену та введіть їх як nameserver
5. Зачекайте 10–30 хвилин → Cloudflare підтверджує "Nameservers updated"

### Крок 3: Встановіть і налаштуйте `cloudflared`

На вашому сервері (через SSH):

```bash
# Завантажити та встановити
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Увійти (показано посилання на браузер — відкрийте його)
cloudflared tunnel login

# Створити тунель
cloudflared tunnel create tesla-carview
# Запам'ятайте показаний Tunnel ID!
```

Створіть файл конфігурації:

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Вміст (замініть `YOUR_TUNNEL_ID` та `yourdomain.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Створити DNS-запис автоматично:

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Крок 4: Встановіть як системний сервіс

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Готово.** Tesla Carview тепер доступний за `https://tesla.yourdomain.com` — з автоматичним HTTPS, без відкритих портів, без статичного IP.

---

## Опція B: DynDNS + домашній роутер

> **Важливо:** Працює лише, якщо у вас справжня публічна IPv4-адреса. [Спочатку перевірте на CG-NAT](#ви-за-cg-nat).

### Крок 1: Зареєструйтеся в DynDNS-сервісі

**Dynu** (безкоштовно, без щомісячного підтвердження):
1. Перейдіть на [dynu.com](https://www.dynu.com) → створіть обліковий запис → DDNS → Add
2. Введіть назву, напр. `my-tesla` → ви отримаєте `my-tesla.freeddns.org`
3. Запам'ятайте ваше ім'я хоста, ім'я користувача та пароль (Control Panel → API Credentials)

**DuckDNS** (ще простіше):
1. [duckdns.org](https://www.duckdns.org) → увійдіть → виберіть піддомен → запам'ятайте свій токен

### Крок 2: Налаштуйте ваш роутер

**FritzBox:**
1. Відкрийте [http://fritz.box](http://fritz.box) → **Internet → Sharing → DynDNS**
2. Поставте галочку **"Use DynDNS"** і заповніть:

   | Поле | Dynu | DuckDNS |
   |---|---|---|
   | Provider | User-defined | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
   | Domain | `my-tesla.freeddns.org` | `my-tesla.duckdns.org` |
   | Username | Dynu username | — |
   | Password | Dynu password | — |

3. Натисніть **Apply** → зелена галочка = працює

**Інші роутери:** Шукайте "Dynamic DNS" або "DDNS" у налаштуваннях internet/WAN.

### Крок 3: Перенаправлення портів

Щоб вхідний трафік досягав вашого сервера:

**FritzBox:** Internet → Sharing → Port Sharing → New Port Sharing → Other Application

| Поле | Значення |
|---|---|
| Назва | Tesla Carview |
| Протокол | TCP |
| Зовнішній порт | 443 |
| До пристрою | Локальний IP вашого сервера (напр. `192.168.1.100`) |
| Внутрішній порт | 443 |

> **Підказка:** Дайте вашому серверу фіксований локальний IP. На FritzBox: Home Network → Network → ваш пристрій → Always assign this IP.

### Крок 4: SSL-сертифікат і конфігурація Tesla Carview

```bash
# Встановити FRONTEND_URL у /opt/tesla-carview/backend/.env:
FRONTEND_URL=https://my-tesla.freeddns.org

# Отримати SSL-сертифікат:
certbot --nginx -d my-tesla.freeddns.org
```

---

## Опція C: VPS у хостинг-провайдера

VPS (Virtual Private Server) — це маленький орендований Linux-сервер з **фіксованим, постійним публічним IP**. DynDNS не потрібен, перенаправлення портів не потрібне.

**Порівняння цін (2025):**

| Провайдер | Продукт | Ціна/місяць |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 |

**Налаштування (приклад: Hetzner):**
1. Зареєструйтеся → створіть сервер → виберіть Ubuntu 24.04 → запам'ятайте публічний IP
2. SSH-увійдіть: `ssh root@YOUR-SERVER-IP`
3. Запустіть скрипт налаштування:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Скрипт запитує ваше доменне ім'я і автоматично налаштовує nginx + Let's Encrypt.

Потім спрямуйте на нього домен → [Опція D](#option-d-own-domain-with-dns-record)

---

## Опція D: Власний домен з DNS-записом

Якщо у вас є власний домен і сервер з фіксованим IP, створіть **запис A**:

**Що таке запис A?** Це запис у телефонній книзі: `tesla.yourdomain.com → 123.456.789.0`

**У Cloudflare DNS:**
DNS → Add record → Type: A, Name: `tesla`, IPv4: IP вашого сервера → Save

**У Namecheap:**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host: `tesla`, Value: ваш IP

**У IONOS:**
Domains → ваш домен → DNS → Add record → A, Hostname: `tesla`, Destination: ваш IP

**У Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)):**
Виберіть зону → Records → Add Record → A, Name: `tesla`, Value: ваш IP

> **TTL:** Спочатку встановіть 300 (5 хвилин) — спрощує виправлення помилок. Пізніше підвищіть до 3600.

### Перевірте розповсюдження

```bash
nslookup tesla.yourdomain.com
# або онлайн: https://dnschecker.org
```

### Динамічний IP із власним доменом

Якщо у вас домен, але немає фіксованого IP:

**CNAME → DuckDNS** (роутер оновлює DuckDNS):
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

---

## Дерево рішень

```
Чи IP вашого роутера відрізняється від того, що показує https://api4.my-ip.io/ip?
  ТАК (CG-NAT) → Опція A: Cloudflare Tunnel
  НІ:
    Чи є у вас сервер у дата-центрі?
      ТАК → Опція C + D (VPS + DNS-запис)
      НІ (домашня мережа):
        Чи є у вас власний домен?
          ТАК → Опція B (DynDNS) + Опція D (DNS-запис)
          НІ  → Опція B з безкоштовним піддоменом (DuckDNS/Dynu)
```

---

## Поширені проблеми

### "Сайт недосяжний" одразу після налаштування

DNS потребує 5–30 хвилин на розповсюдження. Спочатку протестуйте локально:
```bash
curl -I http://localhost
```

### "Сертифікат недійсний" / помилки HTTPS

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### URL оновлення DynDNS роутера не працює

Ваш роутер автоматично замінює `<ipaddr>` — не заповнюйте його вручну. Протестуйте URL у браузері, замінивши `<ipaddr>` на ваш фактичний поточний IP.

### "Мій WAN IP починається з 100. або 10."

Це CG-NAT → використовуйте [Опцію A (Cloudflare Tunnel)](#option-a-cloudflare-tunnel-recommended).

### IPv6 / немає IPv4

Новіші оптоволоконні з'єднання використовують IPv6. Це працює так само — використовуйте запис **AAAA** замість **A** у DNS. Ваш роутер зберігає фіксований префікс IPv6 (DynDNS не потрібен для IPv6 на більшості з'єднань).

---

## Корисні посилання

- [Cloudflare Tunnel docs](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — безкоштовний динамічний DNS
- [Dynu DDNS](https://www.dynu.com/) — безкоштовно, без щомісячного підтвердження
- [dnschecker.org](https://dnschecker.org) — перевірка розповсюдження DNS по всьому світу
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — перевірте ваш публічний IP

---

*→ [[UK-Installation]] | [[UK-Raspberry-Pi-Storage]] | [[UK-Home]]*

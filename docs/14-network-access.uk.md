# Доступ звідусіль — без статичної IP

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](14-network-access.md) · 🇬🇧 [Read in English](14-network-access.en.md)

Цей розділ **покроково** пояснює, як зробити Tesla Carview доступним звідусіль — навіть без фіксованої публічної IP-адреси, навіть за домашнім роутером, навіть на побутовому інтернет-з'єднанні.

> **Не ІТ-експерт? Без проблем.** Кожен варіант містить точні покрокові інструкції, які можна виконувати без попередніх знань.

---

## Який варіант для мене?

| Ситуація | Найкращий варіант |
|---|---|
| Домашній інтернет (роутер), IP змінюється щодня | [Варіант A: Cloudflare Tunnel](#варіант-a-cloudflare-tunnel-рекомендовано-для-домашнього-використання) або [Варіант B: DynDNS + роутер](#варіант-b-dyndns--домашній-роутер) |
| Кабельний або оптичний інтернет — **не можна відкривати порти** (CG-NAT) | [Варіант A: Cloudflare Tunnel](#варіант-a-cloudflare-tunnel-рекомендовано-для-домашнього-використання) |
| Власний сервер / VPS у хостинг-провайдера (netcup, Hetzner) | [Варіант C: VPS зі статичною IP](#варіант-c-vps-у-хостинг-провайдера-netcup-hetzner-contabo) |
| Доступний власний домен | [Варіант D: Власний домен + DNS-запис](#варіант-d-власний-домен-з-dns-записом) |

---

## Проблема з динамічними IP-адресами

Ваше домашнє інтернет-з'єднання **не має фіксованої IP-адреси** — роутер отримує нову щодня (або частіше). Це означає: якщо ви введете `192.0.2.47` в застосунок сьогодні, завтра воно буде неправильним.

Рішення називається **Dynamic DNS (DynDNS або DDNS)**:
- Ви резервуєте фіксоване доменне ім'я (наприклад, `my-tesla.duckdns.org`)
- Невелика програма (що автоматично працює на вашому роутері або сервері) повідомляє нову IP-адресу щоразу при її зміні
- Ваше доменне ім'я завжди вказує на поточну IP — вам ніколи не потрібно змінювати щось вручну

---

## Ще одна проблема: немає публічної IPv4 (CG-NAT)

Багато кабельних інтернет-з'єднань (наприклад, Vodafone, Virgin Media, певні мобільні провайдери) більше не надають власної публічної IPv4-адреси. Кілька клієнтів ділять одну IP. Це називається Carrier-Grade NAT (CG-NAT).

**Тест на виявлення:** Перейдіть на [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) і порівняйте показану IP з IP, яку ваш роутер показує на сторінці статусу. Якщо IP **різні** → ви за CG-NAT. Варіант B **не працюватиме**.

З CG-NAT **Варіант A (Cloudflare Tunnel)** — єдине рішення без додаткового сервера.

---

## Варіант A: Cloudflare Tunnel (рекомендовано для домашнього використання)

**Що це?** Cloudflare Tunnel встановлює зашифроване вихідне з'єднання з вашого сервера до інтернету — без відкриття жодного порту в роутері. Ваш інстанс Tesla Carview стає доступним через глобальну мережу Cloudflare.

**Вартість:** Безкоштовно.

**Вимоги:**
- Домен (наприклад, `mydomain.com`) **або** безкоштовний субдомен (інструкції нижче)
- Домен має керуватися Cloudflare (безкоштовний крок)

### Крок 1: Отримати безкоштовний домен (якщо у вас його немає)

Без власного домену використовуйте DuckDNS:
1. Перейдіть на [https://www.duckdns.org](https://www.duckdns.org) і увійдіть через Google або GitHub
2. Виберіть ім'я, наприклад, `my-tesla` → ви отримаєте `my-tesla.duckdns.org`
3. Запишіть свій **token** (довгий буквено-цифровий рядок під вашим профілем)

Альтернативно: купіть дешевий домен від ~$1/рік на [Namecheap](https://www.namecheap.com), [Porkbun](https://www.porkbun.com) або [inwx.de](https://www.inwx.de).

### Крок 2: Обліковий запис Cloudflare + додати домен

1. Перейдіть на [https://dash.cloudflare.com](https://dash.cloudflare.com) → зареєструйтеся безкоштовно
2. Натисніть **"Add a Site"** і введіть свій домен
3. Виберіть **Free plan** (€0)
4. Cloudflare показує дві адреси nameserver, наприклад:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Перейдіть до реєстратора домену (Namecheap, IONOS тощо) і введіть їх **як nameservers**
   - У Namecheap: Domain List → Manage → Nameservers → Custom DNS
   - У IONOS: Domains → ваш домен → Nameservers → Custom nameservers
6. Зачекайте 10–30 хвилин, поки Cloudflare підтвердить: **"Nameservers updated"**

### Крок 3: Створити тунель

На вашому сервері (через SSH або термінал):

```bash
# Встановити cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Увійти в обліковий запис Cloudflare (відкриється вікно браузера)
cloudflared tunnel login

# Створити тунель (виберіть будь-яке ім'я)
cloudflared tunnel create tesla-carview

# Це показує: Tunnel ID (наприклад, "abc123-...") — запишіть його!
```

### Крок 4: Налаштувати тунель

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Вміст (замініть `YOUR_TUNNEL_ID` і `yourdomain.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Створити DNS-запис (Cloudflare робить це автоматично):
```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Крок 5: Встановити як сервіс (автоматичний старт після перезавантаження)

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Готово!** Tesla Carview тепер доступний за адресою `https://tesla.yourdomain.com` — з автоматичним HTTPS, без port forwarding, без статичної IP.

---

## Варіант B: DynDNS + домашній роутер

> **Важливо:** Працює лише якщо у вас є **власна публічна IPv4**-адреса (без CG-NAT). Перевірте це спершу — [див. вище](#ще-одна-проблема-немає-публічної-ipv4-cg-nat).

**Що це?** Ваш роутер автоматично повідомляє свою нову IP-адресу DynDNS-сервісу. Ви завжди можете досягти Tesla Carview за тим самим доменним ім'ям.

### Крок 1: Виберіть DynDNS-сервіс і зареєструйтеся

**Рекомендовано: Dynu** (повністю безкоштовно, не потрібне щомісячне підтвердження)

1. Перейдіть на [https://www.dynu.com](https://www.dynu.com) → створіть обліковий запис
2. DDNS → Add → введіть ім'я, наприклад, `my-tesla` → ви отримаєте `my-tesla.freeddns.org`
3. Запишіть: **hostname**, **username**, **password** (у Control Panel → API Credentials)

**Альтернатива: DuckDNS** (ще простіше, але вимагає ручної конфігурації роутера)

1. [https://www.duckdns.org](https://www.duckdns.org) → увійти → виберіть субдомен
2. Update URL: `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=`

### Крок 2: Налаштуйте роутер

Для **FritzBox:**
1. Відкрийте інтерфейс FritzBox: [http://fritz.box](http://fritz.box)
2. **Internet → Sharing → DynDNS**
3. Поставте галочку **"Use DynDNS"**
4. Заповніть:

   | Поле | Значення Dynu |
   |---|---|
   | DynDNS provider | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` |
   | Domain name | `my-tesla.freeddns.org` |
   | Username | Ім'я користувача Dynu |
   | Password | Пароль Dynu |

5. **Apply** → FritzBox тестує з'єднання → зелений значок = працює

Для **інших роутерів:** Шукайте "Dynamic DNS" або "DDNS" у налаштуваннях роутера — більшість сучасних роутерів підтримують це з аналогічними полями.

### Крок 3: Port forwarding

Щоб трафік ззовні досягав вашого сервера:

1. **Internet → Sharing → Port Sharing** (FritzBox)
2. **New Port Sharing** → **Other Application**
3. Заповніть:

   | Поле | Значення |
   |---|---|
   | Name | Tesla Carview HTTPS |
   | Protocol | TCP |
   | External port | 443 |
   | To device | IP вашого сервера в локальній мережі (наприклад, `192.168.1.100`) |
   | Internal port | 443 |

4. **Apply** і увімкнути

> **Порада:** Дайте серверу **фіксовану (статичну) локальну IP**, щоб port forwarding не "дрейфувало". На FritzBox: Home Network → Network → ваш пристрій → Always assign this IP.

### Крок 4: Налаштувати Tesla Carview

Відкрийте `/opt/tesla-carview/backend/.env` і встановіть:

```bash
FRONTEND_URL=https://my-tesla.freeddns.org
```

Отримайте SSL-сертифікат через Let's Encrypt:
```bash
certbot --nginx -d my-tesla.freeddns.org
```

**Готово!** Доступно за `https://my-tesla.freeddns.org`.

---

## Варіант C: VPS у хостинг-провайдера (netcup, Hetzner, Contabo)

VPS (Virtual Private Server) — це невеликий орендований Linux-сервер у дата-центрі. Він завжди має **фіксовану публічну IPv4-адресу** — без трюків з DynDNS.

**Порівняння цін (2026):**

| Провайдер | Продукт | Ціна/місяць | Характеристики | Примітки |
|---|---|---|---|---|
| [netcup](https://www.netcup.com/en/server/vps-lite) | **VPS nano G11s** ⭐ | **~€3.08** | 2 vCore · 2 GB RAM · 60 GB SSD | Найдешевший вхід, німецький ЦОД, безлімітний трафік — **рекомендовано для TeslaView** |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 | 2 vCore · 2 GB RAM · 40 GB SSD | Трохи більше запасу продуктивності |
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 | 2 vCPU · 4 GB RAM · 40 GB | Дуже надійно, Нюрнберг/Фалькенштайн |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 | 4 vCPU · 8 GB RAM · 100 GB | Багато сховища для multi-tenant |
| [IONOS](https://www.ionos.com) | VPS S | ~€1.00 | 1 vCore · 1 GB RAM · 10 GB | Перший місяць дешевий, потім дорожче |

> 💡 **Промокод для netcup:** Ми можемо надіслати вам персональний промокод для netcup на запит. Просто надішліть короткий email на [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com) з темою "netcup TeslaView".

> **Чому VPS nano G11s для TeslaView?** Tesla Carview використовує ~150–200 MB RAM в idle (backend + nginx + proxy). 2 GB RAM дає достатньо запасу. 60 GB SSD має місце для багатьох років даних телеметрії (SQLite зростає ~500 MB/рік для активного авто). 2 vCores гарантують, що запити експорту і міграції не блокують poller.

### Налаштування на netcup (приклад)

1. Зареєструйтеся на [netcup.eu](https://www.netcup.eu)
2. **Server Control Panel (SCP)** → замовте VPS → виберіть Ubuntu 24.04
3. Скопіюйте root-пароль з листа підтвердження
4. Відкрийте термінал і увійдіть:
   ```bash
   ssh root@YOUR-SERVER-IP
   ```
5. Встановіть Tesla Carview:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Скрипт налаштування запитує доменне ім'я. Введіть свій домен (наприклад, `tesla.yourdomain.com`) — Let's Encrypt і nginx налаштовуються автоматично.

### Спрямувати домен на VPS

Якщо у вас є власний домен, створіть **A-запис**:

```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP  →  TTL 300
```

Як це зробити: [→ Варіант D нижче](#варіант-d-власний-домен-з-dns-записом)

---

## Варіант D: Власний домен з DNS-записом

Якщо у вас є власний домен (наприклад, `yourdomain.com`) і сервер з **фіксованою IP** (VPS або статична домашня IP), потрібен лише DNS-запис.

### Що таке A-запис?

**A-запис** працює як запис у телефонній книзі:
- Зліва — ім'я: `tesla.yourdomain.com`
- Справа — адреса: `123.456.789.0` (IP вашого сервера)
- Кожен браузер, який відвідує `tesla.yourdomain.com`, отримує: "IP — це `123.456.789.0`"

### Як створити A-запис

**У Namecheap:**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Type: **A Record**, Host: `tesla`, Value: IP вашого сервера
3. Save All Changes

**У IONOS:**
1. Domains → ваш домен → DNS → Add record
2. Type: **A**, Hostname: `tesla`, Destination: IP вашого сервера
3. Save

**У inwx.de:**
1. Domain management → DNS → Add record
2. Type: **A**, Name: `tesla`, Content: IP вашого сервера, TTL: 300
3. Save

**У Hetzner DNS Console ([dns.hetzner.com](https://dns.hetzner.com)):**
1. Виберіть зону → Records → Add Record
2. Type: **A**, Name: `tesla`, Value: IP вашого сервера
3. Add record

> **TTL** (Time to Live) визначає, як довго DNS-записи кешуються. Встановіть 300 (5 хвилин) при початковому налаштуванні, щоб помилки можна було швидко виправити. Пізніше можна збільшити до 3600.

### Перевірити: чи поширився DNS-запис?

```bash
# Тест з домашнього комп'ютера:
nslookup tesla.yourdomain.com
# або
dig tesla.yourdomain.com
```

Або онлайн: [https://dnschecker.org](https://dnschecker.org) — показує, чи запис видно по всьому світу.

### Динамічна IP з власним доменом

Якщо у вас є власний домен, але немає фіксованої IP, скомбінуйте обидва підходи:

**Варіант 1: CNAME на DuckDNS** (роутер автоматично оновлює DuckDNS)
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

**Варіант 2: Update-скрипт + cron-завдання**
```bash
# Cron-завдання, що оновлює IP кожні 5 хвилин:
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=my-tesla&token=YOURTOKEN&ip=$(curl -s https://api4.my-ip.io/ip)"
```

---

## Поширені проблеми та рішення

### "Сайт недоступний" після налаштування

1. **Зачекайте 5–30 хвилин** — DNS-записи потребують часу на поширення
2. **Тестуйте спершу локально:** чи доступний Tesla Carview на сервері?
   ```bash
   curl -I http://localhost
   ```
3. **Port forwarding роутера:** натисніть **Test** поруч з правилом port sharing

### "Сертифікат недійсний" / помилки HTTPS

```bash
# Перевипустити сертифікат Let's Encrypt:
certbot renew --force-renewal
systemctl restart nginx
```

### Update URL роутера не працює

- Ваш роутер замінює `<ipaddr>` на поточну IP — не заповнюйте її вручну
- Перевірте URL вручну в браузері (тимчасово замініть `<ipaddr>` на вашу реальну IP)
- Перевірте: чи показує статус роутера публічну IP? Адреса, що починається з `10.x.x.x` або `100.x.x.x`, означає CG-NAT

### "Моя IP починається з 100." або "10."

Це **CG-NAT** — див. [Варіант A (Cloudflare Tunnel)](#варіант-a-cloudflare-tunnel-рекомендовано-для-домашнього-використання), це єдине рішення без додаткового сервера.

### IPv6 замість IPv4

Новіші інтернет-з'єднання (особливо оптика) працюють з **IPv6**. Це працює так само — ваш роутер має фіксовану IPv6-адресу і не потребує DynDNS. У DNS-записі використовуйте тип **AAAA** (IPv6) замість **A** (IPv4).

---

## Дерево рішень

```
Чи ви за CG-NAT?  (IP починається з 100. або ваш роутер показує інакшу IP, ніж ipify.org)
  → ТАК:  Варіант A (Cloudflare Tunnel)
  → НІ:
      Чи у вас є сервер у дата-центрі?
        → ТАК:  Варіант C + D (VPS + DNS-запис)
        → НІ (домашня мережа):  Варіант B (DynDNS + роутер)
```

---

## Корисні посилання

- [Документація Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu DDNS](https://www.dynu.com/)
- [netcup Community Tutorial: nginx Reverse Proxy](https://community.netcup.com/en/tutorials/how-to-setup-nginx-reverse-proxy)
- [Hetzner DNS Console](https://dns.hetzner.com)
- [dnschecker.org — перевірка поширення DNS](https://dnschecker.org)
- [ipify.org — перевірте свою публічну IP](https://api4.my-ip.io/ip)

---

*→ Назад до [02-deployment.en.md](02-deployment.en.md) | [Вся документація](README.en.md)*

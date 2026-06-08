# fail2ban — захист від брутфорсу

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](06-fail2ban.md) · 🇬🇧 [Read in English](06-fail2ban.en.md)

Tesla Carview використовує fail2ban для автоматичного блокування зловмисників, які підбирають облікові дані або демонструють іншу підозрілу активність.

## Як це працює

fail2ban читає журнали nginx і блокує IP через iptables/nftables при перевищенні порогів.

## Перевірка встановлення

```bash
systemctl status fail2ban
fail2ban-client status
```

## Рекомендована конфігурація для Tesla Carview

### `/etc/fail2ban/jail.d/tesla-carview.conf`

```ini
[DEFAULT]
bantime  = 180        # блокувати IP на 3 хвилини
findtime = 60         # вікно спостереження: 1 хвилина
maxretry = 3          # 3 невдалі спроби → заблоковано

[nginx-limit-req]
# спрацьовує на помилках rate-limit nginx (відповіді 429)
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 3
findtime = 60
bantime  = 180

[nginx-tesla-login]
# спеціально для endpoint входу — суворіше
enabled  = true
port     = http,https
filter   = nginx-tesla-login
logpath  = /var/log/nginx/access.log
maxretry = 3
findtime = 60
bantime  = 600        # 10 хвилин при невдачах входу
```

### `/etc/fail2ban/filter.d/nginx-tesla-login.conf`

```ini
[Definition]
# відповідає відповідям 401 на endpoint входу
failregex = ^<HOST> .* "POST /api/auth/login HTTP/\d" 401
ignoreregex =
```

### `/etc/fail2ban/filter.d/nginx-limit-req.conf`

```ini
[Definition]
# стандартний фільтр для перевищень rate-limit nginx
failregex = ^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\] .+limiting requests, excess:.+by zone.+client: <HOST>
ignoreregex =
```

## Активація конфігурації

```bash
# створіть конфігураційні файли (як вище)
sudo systemctl reload fail2ban

# перевірка статусу
sudo fail2ban-client status nginx-tesla-login
sudo fail2ban-client status nginx-limit-req

# вручну розблокувати IP
sudo fail2ban-client set nginx-tesla-login unbanip 1.2.3.4

# журнал fail2ban у реальному часі
tail -f /var/log/fail2ban.log
```

## Час блокування за суворістю

| Сценарій | maxretry | findtime | bantime |
|---|---|---|---|
| Вхід 401 (3 невдалі спроби) | 3 | 60 с | 600 с (10 хв) |
| Перевищено rate limit | 3 | 60 с | 180 с (3 хв) |
| SSH brute force | 5 | 600 с | 3600 с (1 год) |

## Email-сповіщення при блокуванні (опціонально)

```ini
# у /etc/fail2ban/jail.local
[DEFAULT]
destemail = your@email.com
sender    = fail2ban@your-domain.com
action    = %(action_mwl)s   # ban + mail + whois lookup
```

## Взаємодія з блокуванням на рівні застосунку

Tesla Carview блокує облікові записи після 5 невдалих спроб **на рівні застосунку** (15 хв).

fail2ban захищає **на мережевому рівні**: IP блокується ще до того, як запит досягне процесу Node.js.

| Рівень | Механізм | Тригер | Тривалість |
|---|---|---|---|
| Мережа | fail2ban | 3× HTTP 401 за 60 с | 10 хв |
| Застосунок | блокування облікового запису | 5× неправильний пароль | 15 хв |

Ці два механізми доповнюють один одного: fail2ban захищає від брутфорсу через багато облікових записів, блокування на рівні застосунку захищає окремі облікові записи.

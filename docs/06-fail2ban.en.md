# fail2ban — brute-force protection

> 🇩🇪 [Auf Deutsch lesen](06-fail2ban.md)

Tesla Carview uses fail2ban to automatically ban attackers that guess login credentials or show other suspicious activity.

## How it works

fail2ban reads nginx logs and bans IPs via iptables/nftables when thresholds are exceeded.

## Installation check

```bash
systemctl status fail2ban
fail2ban-client status
```

## Recommended configuration for Tesla Carview

### `/etc/fail2ban/jail.d/tesla-carview.conf`

```ini
[DEFAULT]
bantime  = 180        # ban IP for 3 minutes
findtime = 60         # observation window: 1 minute
maxretry = 3          # 3 failed attempts → banned

[nginx-limit-req]
# triggers on nginx rate-limit errors (429 responses)
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 3
findtime = 60
bantime  = 180

[nginx-tesla-login]
# specifically for the login endpoint — stricter
enabled  = true
port     = http,https
filter   = nginx-tesla-login
logpath  = /var/log/nginx/access.log
maxretry = 3
findtime = 60
bantime  = 600        # 10 minutes on login failures
```

### `/etc/fail2ban/filter.d/nginx-tesla-login.conf`

```ini
[Definition]
# matches 401 responses on the login endpoint
failregex = ^<HOST> .* "POST /api/auth/login HTTP/\d" 401
ignoreregex =
```

### `/etc/fail2ban/filter.d/nginx-limit-req.conf`

```ini
[Definition]
# standard filter for nginx rate-limit exceedances
failregex = ^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\] .+limiting requests, excess:.+by zone.+client: <HOST>
ignoreregex =
```

## Activate the configuration

```bash
# create the config files (as above)
sudo systemctl reload fail2ban

# check status
sudo fail2ban-client status nginx-tesla-login
sudo fail2ban-client status nginx-limit-req

# manually unban an IP
sudo fail2ban-client set nginx-tesla-login unbanip 1.2.3.4

# fail2ban log in real time
tail -f /var/log/fail2ban.log
```

## Ban times by severity

| Scenario | maxretry | findtime | bantime |
|---|---|---|---|
| Login 401 (3 failed attempts) | 3 | 60 s | 600 s (10 min) |
| Rate limit exceeded | 3 | 60 s | 180 s (3 min) |
| SSH brute force | 5 | 600 s | 3600 s (1 h) |

## E-mail notification on ban (optional)

```ini
# in /etc/fail2ban/jail.local
[DEFAULT]
destemail = your@email.com
sender    = fail2ban@your-domain.com
action    = %(action_mwl)s   # ban + mail + whois lookup
```

## Interaction with app-level lockout

Tesla Carview locks accounts after 5 failed attempts **at the application layer** (15 min).

fail2ban protects **at the network layer**: the IP is banned before the request even reaches the Node.js process.

| Layer | Mechanism | Trigger | Duration |
|---|---|---|---|
| Network | fail2ban | 3× HTTP 401 in 60 s | 10 min |
| Application | account lockout | 5× wrong password | 15 min |

The two mechanisms complement each other: fail2ban protects against brute-force across many accounts, the app-level lockout protects individual accounts.

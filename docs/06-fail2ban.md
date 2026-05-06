# fail2ban – Brute-Force-Schutz

Tesla Carview verwendet fail2ban, um Angreifer automatisch zu sperren, die Login-Credentials raten oder andere verdächtige Aktivitäten zeigen.

## Funktionsweise

fail2ban liest Nginx-Logs und sperrt IPs per iptables/nftables, wenn Schwellenwerte überschritten werden.

## Installationscheck

```bash
systemctl status fail2ban
fail2ban-client status
```

## Empfohlene Konfiguration für Tesla Carview

### `/etc/fail2ban/jail.d/tesla-carview.conf`

```ini
[DEFAULT]
bantime  = 180        # IP für 3 Minuten sperren
findtime = 60         # Beobachtungszeitraum: 1 Minute
maxretry = 3          # 3 Fehlversuche → gesperrt

[nginx-limit-req]
# Greift bei Nginx rate-limit-Fehlern (429-Antworten)
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 3
findtime = 60
bantime  = 180

[nginx-tesla-login]
# Speziell für den Login-Endpunkt – noch strenger
enabled  = true
port     = http,https
filter   = nginx-tesla-login
logpath  = /var/log/nginx/access.log
maxretry = 3
findtime = 60
bantime  = 600        # 10 Minuten bei Login-Fehlschlägen
```

### `/etc/fail2ban/filter.d/nginx-tesla-login.conf`

```ini
[Definition]
# Trifft auf 401-Antworten auf den Login-Endpunkt
failregex = ^<HOST> .* "POST /api/auth/login HTTP/\d" 401
ignoreregex =
```

### `/etc/fail2ban/filter.d/nginx-limit-req.conf`

```ini
[Definition]
# Standard-Filter für Nginx rate-limit-Überschreitungen
failregex = ^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\] .+limiting requests, excess:.+by zone.+client: <HOST>
ignoreregex =
```

## Konfiguration aktivieren

```bash
# Konfigurationsdateien erstellen (wie oben)
sudo systemctl reload fail2ban

# Status prüfen
sudo fail2ban-client status nginx-tesla-login
sudo fail2ban-client status nginx-limit-req

# IP manuell entsperren
sudo fail2ban-client set nginx-tesla-login unbanip 1.2.3.4

# fail2ban-Log in Echtzeit
tail -f /var/log/fail2ban.log
```

## Sperrzeiten nach Schweregrad

| Szenario | maxretry | findtime | bantime |
|---|---|---|---|
| Login 401 (3 Fehlversuche) | 3 | 60 s | 600 s (10 min) |
| Rate-Limit überschritten | 3 | 60 s | 180 s (3 min) |
| SSH-Brute-Force | 5 | 600 s | 3600 s (1 h) |

## E-Mail-Benachrichtigung bei Ban (optional)

```ini
# In /etc/fail2ban/jail.local
[DEFAULT]
destemail = deine@email.de
sender    = fail2ban@deine-domain.de
action    = %(action_mwl)s   # ban + Mail + whois-Lookup
```

## Zusammenspiel mit App-seitiger Sperrung

Tesla Carview sperrt Konten nach 5 Fehlversuchen **auf Anwendungsebene** (15 min).

fail2ban schützt **auf Netzwerkebene**: Die IP wird gesperrt, bevor die Anfrage den Node.js-Prozess erreicht.

| Schicht | Mechanismus | Auslöser | Dauer |
|---|---|---|---|
| Netzwerk | fail2ban | 3× HTTP 401 in 60s | 10 min |
| Anwendung | Account-Lockout | 5× falsches Passwort | 15 min |

Beide Mechanismen ergänzen sich: fail2ban schützt vor Brute-Force gegen viele Accounts, der App-Lockout schützt einzelne Konten.

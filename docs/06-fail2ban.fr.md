# fail2ban — protection contre les attaques par force brute

> 🤖 *Cette traduction française est assistée par IA depuis [06-fail2ban.en.md](06-fail2ban.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](06-fail2ban.md)

Tesla Carview utilise fail2ban pour bannir automatiquement les attaquants qui tentent de deviner les identifiants de connexion ou présentent une activité suspecte.

## Comment ça marche

fail2ban lit les journaux nginx et bannit les IP via iptables/nftables lorsque les seuils sont dépassés.

## Vérification d'installation

```bash
systemctl status fail2ban
fail2ban-client status
```

## Configuration recommandée pour Tesla Carview

### `/etc/fail2ban/jail.d/tesla-carview.conf`

```ini
[DEFAULT]
bantime  = 180        # bannir l'IP pendant 3 minutes
findtime = 60         # fenêtre d'observation : 1 minute
maxretry = 3          # 3 tentatives échouées → bannie

[nginx-limit-req]
# se déclenche sur les erreurs rate-limit nginx (réponses 429)
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 3
findtime = 60
bantime  = 180

[nginx-tesla-login]
# spécifique à l'endpoint de connexion — plus strict
enabled  = true
port     = http,https
filter   = nginx-tesla-login
logpath  = /var/log/nginx/access.log
maxretry = 3
findtime = 60
bantime  = 600        # 10 minutes en cas d'échecs de connexion
```

### `/etc/fail2ban/filter.d/nginx-tesla-login.conf`

```ini
[Definition]
# correspond aux réponses 401 sur l'endpoint de connexion
failregex = ^<HOST> .* "POST /api/auth/login HTTP/\d" 401
ignoreregex =
```

### `/etc/fail2ban/filter.d/nginx-limit-req.conf`

```ini
[Definition]
# filtre standard pour les dépassements de rate-limit nginx
failregex = ^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\] .+limiting requests, excess:.+by zone.+client: <HOST>
ignoreregex =
```

## Activer la configuration

```bash
# créer les fichiers de config (comme ci-dessus)
sudo systemctl reload fail2ban

# vérifier le statut
sudo fail2ban-client status nginx-tesla-login
sudo fail2ban-client status nginx-limit-req

# débannir une IP manuellement
sudo fail2ban-client set nginx-tesla-login unbanip 1.2.3.4

# journal fail2ban en temps réel
tail -f /var/log/fail2ban.log
```

## Temps de bannissement par sévérité

| Scénario | maxretry | findtime | bantime |
|---|---|---|---|
| Login 401 (3 tentatives échouées) | 3 | 60 s | 600 s (10 min) |
| Rate limit dépassé | 3 | 60 s | 180 s (3 min) |
| Force brute SSH | 5 | 600 s | 3600 s (1 h) |

## Notification par e-mail en cas de bannissement (optionnel)

```ini
# dans /etc/fail2ban/jail.local
[DEFAULT]
destemail = your@email.com
sender    = fail2ban@your-domain.com
action    = %(action_mwl)s   # ban + mail + lookup whois
```

## Interaction avec le verrouillage applicatif

Tesla Carview verrouille les comptes après 5 tentatives échouées **au niveau applicatif** (15 min).

fail2ban protège **au niveau réseau** : l'IP est bannie avant même que la requête atteigne le processus Node.js.

| Couche | Mécanisme | Déclencheur | Durée |
|---|---|---|---|
| Réseau | fail2ban | 3× HTTP 401 en 60 s | 10 min |
| Application | verrouillage de compte | 5× mot de passe erroné | 15 min |

Les deux mécanismes se complètent : fail2ban protège contre la force brute sur de nombreux comptes, le verrouillage applicatif protège les comptes individuels.

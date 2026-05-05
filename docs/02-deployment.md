# Deployment auf iland.krische.com (Netcup)

## Voraussetzungen

- Linux-Server (Debian/Ubuntu) mit Root-Zugriff
- Domain `tesla.iland.krische.com` zeigt per A-Record auf die Server-IP
- Tesla Developer Account (siehe [04-tesla-api.md](./04-tesla-api.md))

## Automatisches Setup

```bash
# Als root auf dem Server:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Oder manuell:
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

Das Script erledigt automatisch:
1. System-Pakete (nginx, certbot, docker, ufw, fail2ban)
2. Firewall (nur SSH, HTTP, HTTPS erlaubt)
3. fail2ban (SSH-Brute-Force-Schutz)
4. Let’s Encrypt SSL-Zertifikat
5. Nginx mit TLS-Hardening
6. Docker-Container starten

## Tesla-API konfigurieren

```bash
nano /opt/tesla-carview/backend/.env
```

Diese Felder ausfüllen:
```env
TESLA_CLIENT_ID=deine-client-id
TESLA_CLIENT_SECRET=dein-client-secret
TESLA_REDIRECT_URI=https://tesla.iland.krische.com/api/auth/callback
```

Danach Container neu starten:
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

## Admin-Passwort lesen

```bash
docker logs tesla-carview-backend 2>&1 | grep -A5 'ERSTER START'
```

## Updates einspielen

```bash
bash /opt/tesla-carview/deploy/update.sh
```

## GitHub Actions Auto-Deploy

Für automatisches Deployment bei Push auf `main`, folgende Secrets im GitHub-Repository setzen
(Settings → Secrets and variables → Actions):

| Secret | Beschreibung |
|---|---|
| `DEPLOY_HOST` | Hostname oder IP des Servers |
| `DEPLOY_USER` | SSH-Benutzername |
| `DEPLOY_SSH_KEY` | Privater SSH-Key (ohne Passwort) |

SSH-Key erstellen:
```bash
# Lokal:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""
# Public Key auf Server eintragen:
ssh-copy-id -i ~/.ssh/tesla_deploy.pub user@iland.krische.com
# Inhalt von ~/.ssh/tesla_deploy als DEPLOY_SSH_KEY-Secret eintragen
```

## Datenbank-Backup

```bash
# Backup erstellen:
docker run --rm \
  -v tesla-carview_tesla_data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/tesla-db-$(date +%Y%m%d-%H%M).tar.gz /data

# Automatisches Backup jeden Tag um 3 Uhr (crontab -e):
0 3 * * * docker run --rm -v tesla-carview_tesla_data:/data -v /opt/backups:/backup alpine tar czf /backup/tesla-db-$(date +%%Y%%m%%d).tar.gz /data
```

## Logs ansehen

```bash
# Backend-Logs:
docker compose -f docker-compose.prod.yml logs -f backend

# Nginx-Logs:
tail -f /var/log/nginx/tesla-carview.access.log
tail -f /var/log/nginx/tesla-carview.error.log
```

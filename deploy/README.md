# Deployment auf iland.krische.com

## Voraussetzungen

- Linux-Server (Netcup) mit Root-Zugriff
- Domain `tesla.iland.krische.com` zeigt auf die Server-IP
- Tesla Developer Account mit Fleet API Zugang

## Erstmaliges Setup

```bash
# 1. Setup-Script ausführen (als root)
bash deploy/setup.sh

# 2. .env befüllen
nano /opt/tesla-carview/backend/.env

# 3. App starten
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d --build
```

## Updates einspielen

```bash
bash /opt/tesla-carview/deploy/update.sh
```

## GitHub Actions Auto-Deploy

Für automatisches Deployment bei jedem Push auf `main` folgende
Repository Secrets in GitHub setzen:

| Secret | Wert |
|---|---|
| `DEPLOY_HOST` | IP oder Hostname des Servers |
| `DEPLOY_USER` | SSH-Benutzername (z.B. `root` oder `tesla`) |
| `DEPLOY_SSH_KEY` | Privater SSH-Key (ohne Passwort) |

```bash
# SSH-Key generieren (lokal):
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy
# Public Key auf Server kopieren:
ssh-copy-id -i ~/.ssh/tesla_deploy.pub user@iland.krische.com
# Private Key als DEPLOY_SSH_KEY Secret in GitHub eintragen
```

## Dienst-URLs

- **App**: https://tesla.iland.krische.com
- **Tesla Login**: https://tesla.iland.krische.com/api/auth/login
- **Health Check**: https://tesla.iland.krische.com/api/health

## Logs ansehen

```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Backup der Datenbank

```bash
# Datenbank sichern
docker run --rm -v tesla-carview_tesla_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/tesla-db-$(date +%Y%m%d).tar.gz /data
```

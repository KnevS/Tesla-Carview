# Deployment

## Erstmaliges Setup

```bash
# Als root auf dem Zielgerät:
bash deploy/setup.sh
```

Das Script führt den Konfigurations-Wizard automatisch aus.

## Updates einspielen

```bash
bash /opt/tesla-carview/deploy/update.sh
```

## GitHub Actions Auto-Deploy

Für automatisches Deployment bei jedem Push auf `main`, folgende Secrets im GitHub-Repository setzen:

| Secret | Wert |
|---|---|
| `DEPLOY_HOST` | IP oder Hostname des Servers |
| `DEPLOY_USER` | SSH-Benutzername (z.B. `root` oder `deploy`) |
| `DEPLOY_SSH_KEY` | Privater SSH-Key (ohne Passwort) |
| `DEPLOY_APP_DIR` | Pfad auf dem Server (Standard: `/opt/tesla-carview`) |

```bash
# SSH-Key generieren (lokal):
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy
# Public Key auf Server kopieren:
ssh-copy-id -i ~/.ssh/tesla_deploy.pub user@dein-server.de
# Private Key als DEPLOY_SSH_KEY Secret in GitHub eintragen
```

## Dienst-URLs (Beispiele)

- App:          `https://deine-domain.de`
- Health Check: `https://deine-domain.de/api/health`

## Logs ansehen

```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Datenbank-Backup

```bash
docker run --rm -v tesla-carview_tesla_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/tesla-db-$(date +%Y%m%d).tar.gz /data
```

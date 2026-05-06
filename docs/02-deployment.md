# Deployment – Linux-Server & Raspberry Pi

Tesla Carview läuft auf **allen gängigen Linux-Plattformen**:

| Plattform | Architektur | Getestet |
|---|---|---|
| Linux-Server (VPS, Dedicated) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 | ARMv7 | ✓ |
| Lokale Entwicklung (Mac/Windows/Linux) | alle | ✓ |

## Voraussetzungen

- Debian/Ubuntu (oder Raspberry Pi OS)
- Root-Zugriff
- Optional: eigene Domain mit A-Record auf die Server-IP (für HTTPS)
- Tesla Developer Account ([04-tesla-api.md](./04-tesla-api.md))

## Automatisches Setup

```bash
# Als root auf dem Zielgerät:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Oder manuell:
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

Das Script erkennt die Architektur automatisch und erledigt:
1. System-Pakete installieren (nginx, certbot, docker, ufw, fail2ban)
2. Firewall konfigurieren (SSH, HTTP, HTTPS)
3. fail2ban für SSH-Schutz
4. Konfigurations-Wizard starten
5. Let's Encrypt SSL (wenn HTTPS-Domain angegeben)
6. Nginx mit TLS-Hardening
7. Docker-Container starten (multi-arch)

## Konfiguration einrichten

```bash
bash /opt/tesla-carview/deploy/setup-wizard.sh
```

Der Wizard fragt interaktiv:
- Öffentliche URL (z.B. `https://tesla.example.com` oder `http://192.168.1.100:8080`)
- Tesla API Client-ID und Client-Secret
- Datenbank-Pfad
- E-Mail für SSL-Zertifikate
- Web-Push VAPID-Keys (optional)

## Raspberry Pi – Besonderheiten

```bash
# Raspberry Pi OS vorbereiten (falls nötig):
sudo apt-get update && sudo apt-get upgrade -y

# Docker für ARM installieren (automatisch via setup.sh):
curl -fsSL https://get.docker.com | sh

# Im Heimnetz ohne eigene Domain (Port 8080):
# FRONTEND_URL=http://192.168.1.100:8080 in .env setzen
```

Beim Raspberry Pi im Heimnetz kein Nginx/SSL nötig – der App-Container ist direkt auf Port 8080 erreichbar.

## Tesla-API konfigurieren

```bash
nano /opt/tesla-carview/backend/.env
```

Pflichtfelder:
```env
TESLA_CLIENT_ID=deine-client-id
TESLA_CLIENT_SECRET=dein-client-secret
TESLA_REDIRECT_URI=https://deine.domain.de/api/auth/callback
```

Container neu starten:
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

## Erstkonfiguration (Web-Wizard)

Beim ersten Start öffnet die App automatisch **/setup** im Browser.
Dort wird der erste Administrator-Account angelegt.

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
| `DEPLOY_APP_DIR` | Pfad auf dem Server (Standard: `/opt/tesla-carview`) |

SSH-Key erstellen:
```bash
# Lokal:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""
# Public Key auf Server eintragen:
ssh-copy-id -i ~/.ssh/tesla_deploy.pub user@dein-server.de
# Inhalt von ~/.ssh/tesla_deploy als DEPLOY_SSH_KEY-Secret eintragen
```

## Datenbank-Backup

```bash
# Backup erstellen:
docker run --rm \
  -v tesla-carview_tesla_data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/tesla-db-$(date +%Y%m%d-%H%M).tar.gz /data

# Automatisch täglich um 3 Uhr (crontab -e):
0 3 * * * docker run --rm -v tesla-carview_tesla_data:/data -v /opt/backups:/backup alpine tar czf /backup/tesla-db-$(date +\%Y\%m\%d).tar.gz /data
```

## Logs ansehen

```bash
# Backend-Logs:
docker compose -f docker-compose.prod.yml logs -f backend

# Nginx-Logs (wenn installiert):
tail -f /var/log/nginx/tesla-carview.access.log
```

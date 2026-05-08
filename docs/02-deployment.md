# Deployment – Linux-Server & Raspberry Pi

Tesla Carview läuft auf **allen gängigen Linux-Plattformen**:

| Plattform | Architektur | Getestet |
|---|---|---|
| Linux-Server (VPS, Dedicated) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 | ARMv7 | ✓ |
| Lokale Entwicklung (Mac/Windows/Linux) | alle | ✓ |

> **🏠 Meine Installation**: Läuft auf einem Linux-VPS (x86_64) hinter Nginx mit Let's Encrypt.
> Domain: [teslaview.krische.com](https://teslaview.krische.com) — geschlossen, nur für den Betreiber.

---

## Voraussetzungen

- Debian/Ubuntu (oder Raspberry Pi OS)
- Root-Zugriff
- Optional: eigene Domain mit A-Record auf die Server-IP (für HTTPS)
- Tesla Developer Account ([04-tesla-api.md](./04-tesla-api.md))

---

## 📦 Automatisches Setup (für alle)

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

---

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

---

## Raspberry Pi – Besonderheiten

```bash
# Raspberry Pi OS vorbereiten (falls nötig):
sudo apt-get update && sudo apt-get upgrade -y

# Docker für ARM installieren (automatisch via setup.sh):
curl -fsSL https://get.docker.com | sh
```

Beim Raspberry Pi im Heimnetz kein Nginx/SSL nötig – der App-Container ist direkt auf Port 8080 erreichbar.
`FRONTEND_URL=http://192.168.1.100:8080` in der `.env` setzen.

---

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

---

## Erstkonfiguration (Web-Wizard)

Beim ersten Start öffnet die App automatisch **/setup** im Browser.
Dort wird der erste Administrator-Account angelegt.

---

## Updates einspielen

```bash
bash /opt/tesla-carview/deploy/update.sh
```

---

## Automatisches Deployment

Es gibt zwei Wege für automatisches Deployment bei jedem Push auf `main`:

| Methode | Geeignet für | Anleitung |
|---|---|---|
| **GitHub Actions + SSH** | Einzelne App, vorhandener Server, volle Kontrolle | Siehe unten |
| **Dokploy** | Mehrere Apps, Web-UI gewünscht, einfacheres SSL | [08-dokploy.md](./08-dokploy.md) |

---

## GitHub Actions Auto-Deploy

Für automatisches Deployment bei jedem Push auf `main`.

### Voraussetzung: SSH-Deploy-Key erstellen

```bash
# Auf dem Server:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""

# Public Key für den SSH-User autorisieren:
cat ~/.ssh/tesla_deploy.pub >> /home/DEIN_USER/.ssh/authorized_keys
```

> **Hinweis**: Der Deploy-User benötigt passwordless sudo für `docker` und `git`:
> ```bash
> echo 'DEIN_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/git' \
>   > /etc/sudoers.d/tesla-deploy
> ```

### Secrets in GitHub setzen

GitHub → Repository → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Beschreibung | Beispiel |
|---|---|---|
| `DEPLOY_HOST` | Hostname oder IP des Servers | `123.456.789.0` |
| `DEPLOY_USER` | SSH-Benutzername | `deploy` |
| `DEPLOY_SSH_KEY` | Inhalt von `~/.ssh/tesla_deploy` (Private Key) | `-----BEGIN OPENSSH…` |
| `DEPLOY_APP_DIR` | Installationspfad auf dem Server | `/opt/tesla-carview` |

> **🏠 Meine Installation**: Auto-Deploy ist aktiv. Bei jedem Push auf `main` wird der Server
> automatisch per SSH aktualisiert und die Docker-Container werden neu gebaut.

---

## Datenbank-Backup

```bash
# Backup erstellen:
docker run --rm \
  -v tesla-carview_tesla_data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/tesla-db-$(date +%Y%m%d-%H%M).tar.gz /data

# Automatisch täglich um 3 Uhr (crontab -e als root):
0 3 * * * docker run --rm -v tesla-carview_tesla_data:/data -v /opt/backups:/backup alpine tar czf /backup/tesla-db-$(date +\%Y\%m\%d).tar.gz /data
```

---

## Logs ansehen

```bash
# Backend-Logs:
docker compose -f docker-compose.prod.yml logs -f backend

# Nginx-Logs:
tail -f /var/log/nginx/tesla-carview.access.log
```

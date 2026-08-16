# Deployment – Linux-Server & Raspberry Pi

> 🇬🇧 [Read in English](02-deployment.en.md)

Tesla Carview läuft auf **allen gängigen Plattformen**:

| Plattform | Architektur | Getestet |
|---|---|---|
| Linux-Server (VPS, Dedicated) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (und älter) | ARMv7 | ✗ ¹ |
| Windows (Docker Desktop + WSL2) | x86_64 | ✓ ² |
| Lokale Entwicklung (Mac/Windows/Linux) | alle | ✓ |

¹ **Raspberry Pi 3 und älter (32-Bit-ARM) werden seit v3.51.0 nicht mehr unterstützt.** Node.js veröffentlicht ab Version 24 keine ARMv7-Images mehr — weder alpine noch Debian —, deshalb lässt sich das Backend-Image dort nicht mehr bauen. `deploy/setup.sh` bricht auf solchen Systemen mit einer Erklärung ab, statt erst beim Image-Pull zu scheitern.

² **Windows läuft, ist aber nicht CI-getestet.** Die Anwendung steckt vollständig in Linux-Containern; Windows ist nur der Host. Details und die zwei Einschränkungen: Abschnitt „Windows (Docker Desktop)" am Ende dieser Seite.


---

## Voraussetzungen

- Debian/Ubuntu (oder Raspberry Pi OS)
- Root-Zugriff
- Optional: eigene Domain mit A-Record auf die Server-IP (für HTTPS)
- Tesla Developer Account ([04-tesla-api.md](./04-tesla-api.md))

> **Raspberry Pi?** Lies zuerst [15-raspberry-pi-storage.md](15-raspberry-pi-storage.md) — SD-Karten sterben unter Dauerlast. USB-SSD oder NVMe einrichten dauert 20 Minuten und spart viel Ärger.
>
> **Keine statische IP?** [14-network-access.md](14-network-access.md) erklärt DynDNS, Cloudflare Tunnel und VPS-Optionen Schritt für Schritt.
>
> **Empfohlener Einstiegs-VPS:** Der [netcup VPS nano G11s](https://www.netcup.com/de/server/vps-lite) (2 vCore, 2 GB RAM, 60 GB SSD, ~3,08€/Monat) ist der günstigste getestete VPS, der alle Anforderungen von Tesla Carview erfüllt — inklusive genug Speicher für mehrere Jahre Telemetrie-Daten. Rabattcode auf Anfrage: [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com).

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


---

## Datenbank-Backup

```bash
# Backup erstellen:
cp /opt/tesla-carview/data/master.db /opt/backups/master-$(date +%Y%m%d-%H%M).db
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/

# Automatisch täglich um 3 Uhr (crontab -e als root):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

> **Hinweis:** Tesla Carview verwendet ein Bind-Mount (`./data:/app/data`), kein benanntes Docker-Volume. Alle Datenbankdateien liegen direkt unter `/opt/tesla-carview/data/` auf dem Host. Alternativ kann der integrierte Auto-Backup in den System-Einstellungen der App konfiguriert werden (Lokal, Pfad, S3 oder SFTP).

---

## Post-Install Systemcheck

Nach dem ersten Setup (und jederzeit danach) kann der eingebaute Hygiene-Check ausgeführt werden:

```bash
bash /opt/tesla-carview/scripts/hygiene-check.sh
```

Das Skript prüft 7 Bereiche und zeigt eine farbkodierte Zusammenfassung:

| # | Prüfung | Auto-Fix |
|---|---|---|
| 1 | System-Environment — Docker-Version, Node.js ≥ 20, Disk-Auslastung | — |
| 2 | Dependency-Sicherheit — `npm audit` für Frontend + Backend | `--fix` führt `npm audit fix` aus |
| 3 | Bundle-Größe — Haupt-JS-Chunk vs. Schwellen (Warnung > 1,2 MB, Fehler > 1,5 MB) | — |
| 4 | `.env`-Vollständigkeit — alle Pflicht-Schlüssel vorhanden? | — |
| 5 | Docker-Gesundheit — unhealthy/exited Container, dangling Images + Volumes | `--fix` bereinigt Images |
| 6 | Datenbank-Integrität — SQLite `PRAGMA integrity_check` pro Tenant | — |
| 7 | SSL-Zertifikat — verbleibende Gültigkeitstage für die konfigurierte Domain | — |

```bash
# CI-Modus (keine Farbe, Exit 1 bei Fehlern — von setup.sh und GitHub Actions genutzt):
bash scripts/hygiene-check.sh --ci

# Auto-Fix-Modus (npm audit fix, Docker-Images bereinigen):
bash scripts/hygiene-check.sh --fix
```

Der nächtliche Wartungsjob (`backend/src/services/nightlyMaintenance.js`) führt eine Teilmenge dieser Prüfungen automatisch jede Nacht um 03:30 Europe/Berlin durch und schreibt die Ergebnisse in das Admin-Health-Log (`Admin → System → Wartung`).

---

## Logs ansehen

```bash
# Backend-Logs:
docker compose -f docker-compose.prod.yml logs -f backend

# Nginx-Logs:
tail -f /var/log/nginx/tesla-carview.access.log
```

---

## Betrieb hinter einem eigenen Reverse-Proxy

Wer `setup.sh` im **Proxy-Modus** installiert (nginx, Caddy oder Traefik ist bereits vorhanden), bekommt keine nginx-Konfiguration angelegt und muss die Rate-Limits selbst nachbauen. Fehlen sie oder sind sie zu eng, läuft die App in HTTP 429 und wirkt kaputt: halb geladene Seiten, die scheinbar nur ein Neuladen repariert.

| Pfad | Empfehlung | Warum |
|---|---|---|
| `/api/auth/login` | 10/min, Burst 3 | Brute-Force-Schutz |
| `/api/tiles/` | 1200/min, Burst 300 | Ein Karten-Zoom lädt 50–150 Kacheln auf einmal |
| `/api/` (Rest) | 120/min, **Burst ≥ 60** | Ein Seitenwechsel feuert 15–26 Anfragen |

Der spezifischere Pfad muss gewinnen: Fällt `/api/tiles/` unter das allgemeine API-Limit, sperrt ein einziger Karten-Zoom die gesamte API aus. Nicht die Dauerrate ist dabei der kritische Wert, sondern der Burst.

Fertige Vorlagen liegen im Repository: [`deploy/nginx-host.conf.template`](../deploy/nginx-host.conf.template) und [`deploy/traefik-dynamic.example.yml`](../deploy/traefik-dynamic.example.yml).

Woher ein 429 kommt, verrät die Antwort selbst:

- `x-retry-in`-Header → **Traefik**
- HTML-Fehlerseite ohne Zusatz-Header → **nginx** (`limit_req`)
- `ratelimit-limit` / `ratelimit-remaining` → **die App** (express-rate-limit)

---

## Windows (Docker Desktop)

Die Anwendung läuft vollständig in Linux-Containern — Windows ist nur der Host. Mit **Docker Desktop im WSL2-Modus** startet derselbe Stack wie auf einem Linux-Server. `setup.sh` funktioniert dort nicht (bash, apt, systemd, certbot); an seiner Stelle steht `deploy/setup-windows.ps1`.

```powershell
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
powershell -ExecutionPolicy Bypass -File .\deploy\setup-windows.ps1
```

Das Skript erzeugt `backend\.env` samt zufälligem `JWT_SECRET`, legt eine `docker-compose.override.yml` für Windows an und startet den Stack. Danach im Browser: `http://localhost:8080`.

### Zwei Einschränkungen — beide gemessen, keine davon umgehbar

1. **Keine Fahrzeugbefehle.** Signed Commands laufen über den `tesla-http-proxy`. Der braucht den Bind-Mount `/etc/tesla-proxy` und die feste UID 988 — beides gibt es unter Windows nicht. Der Service bleibt deshalb aus; das Backend startet trotzdem, weil sein `depends_on` auf `required: false` steht. Alles Lesende — Fahrten, Ladevorgänge, Auswertungen, Fahrtenbuch, Routenplaner — ist vollständig nutzbar.
2. **`host.docker.internal` zeigt woanders hin.** Docker Desktop trägt diesen Namen selbst in die `/etc/hosts` jedes Containers ein, und der Eintrag gewinnt gegen den Netzwerk-Alias aus der Compose-Datei. Gemessen: Der Name löst dann auf das Host-Gateway (172.17.0.1) auf statt auf den Proxy-Container — Fahrzeugbefehle gingen still ans falsche Ziel. Wer den Proxy trotzdem betreibt, setzt in `backend\.env` deshalb `TESLA_PROXY_BASE=https://tesla-carview-proxy:4443`.

### Zwei `.env`-Dateien nicht verwechseln

Die Anwendung liest `backend\.env` (als `env_file` in den Container gereicht). Compose selbst liest eine `.env` in der **Projektwurzel** und ersetzt damit die `${...}`-Platzhalter in den Compose-Dateien (`TESLA_PROXY_CONFIG_DIR`, `TESLA_PROXY_UID`, `OLLAMA_MEMORY_LIMIT`). Nachgemessen, weil es genau anders herum naheliegt: Ein Eintrag in `backend/.env` hat auf die Interpolation **keine** Wirkung. Vorlage: `.env.example` in der Projektwurzel.

### HTTPS ist nicht Windows-spezifisch

Tesla verlangt eine öffentlich erreichbare HTTPS-Adresse — für die Anmeldung, die Partner-Registrierung und Fleet Telemetry. Das gilt für jede Heiminstallation gleichermaßen, unabhängig vom Betriebssystem. Die Wege (DynDNS, Cloudflare Tunnel, VPS) stehen in [14-network-access.md](14-network-access.md).

### Updates

`deploy/update.sh` ist ein Bash-Skript und läuft unter Windows nicht. Stattdessen:

```powershell
git pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
```

### Was „nicht CI-getestet" heißt

Das Docker Build Gate baut Linux-Images für amd64 und arm64; ein Windows-Host wird nirgends automatisiert geprüft. Der Weg ist beschrieben und die Fallstricke oben sind an einem echten Docker-Daemon gemessen — laufend verifiziert wird er aber nur von denen, die ihn gehen.

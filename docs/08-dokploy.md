# Deployment mit Dokploy

> 🇬🇧 [Read in English](08-dokploy.en.md)

[Dokploy](https://dokploy.com) ist eine selbst gehostete Open-Source-PaaS-Plattform
(vergleichbar mit Coolify oder Railway). Sie übernimmt Routing, SSL (via Let's Encrypt + Traefik),
Logs und GitHub-Webhooks für automatisches Deployment – ohne den Overhead einer vollständigen
CI/CD-Pipeline.

**Wann sinnvoll:**
- Du willst ein Web-UI statt SSH-Kommandos zum Verwalten von Deployments
- Mehrere Apps laufen auf demselben Server
- Kein separater GitHub-Actions-Workflow gewünscht

---

## 1. Dokploy auf dem Server installieren

```bash
# Als root auf einem frischen VPS (Debian/Ubuntu empfohlen):
curl -sSL https://dokploy.com/install.sh | sh
```

Dokploy startet danach auf Port **3000**. Öffne `http://DEINE-SERVER-IP:3000` im Browser
und lege den Admin-Account an.

> Firewall-Hinweis: Port 3000 muss temporär erreichbar sein. Nach dem Login kann Dokploy
> selbst eine Domain + SSL für das Dashboard einrichten. Danach Port 3000 wieder sperren.

---

## 2. Tesla Carview als App anlegen

Im Dokploy-Dashboard:

1. **Projects** → **Create Project** (z.B. `tesla-carview`)
2. Innerhalb des Projekts: **Create Service** → **Application**
3. Name: `tesla-carview`
4. Build Type: **Docker Compose**
5. Compose-Datei: `docker-compose.prod.yml`

---

## 3. GitHub-Repository verbinden

### Option A – GitHub App (empfohlen)

1. Dokploy Dashboard → **Settings** → **Git Providers** → **GitHub App** → **Install**
2. Berechtigung für das Repository `Tesla-Carview` erteilen
3. In der App-Konfiguration: **Source** → Repository auswählen, Branch: `main`

### Option B – öffentliches Repository (ohne Auth)

Unter **Source** einfach die HTTPS-URL eintragen:
```
https://github.com/DEIN-GITHUB-USER/Tesla-Carview.git
```
Branch: `main`

---

## 4. Umgebungsvariablen setzen

Im App-Tab **Environment** alle Variablen aus der `.env`-Datei eintragen.
Mindestpflichtfelder:

| Variable | Beschreibung |
|---|---|
| `JWT_SECRET` | Langer Zufallswert (`openssl rand -hex 64`) |
| `TESLA_CLIENT_ID` | Tesla Developer App Client-ID |
| `TESLA_CLIENT_SECRET` | Tesla Developer App Secret |
| `TESLA_REDIRECT_URI` | `https://deine.domain.de/api/auth/callback` |
| `FRONTEND_URL` | `https://deine.domain.de` |
| `NODE_ENV` | `production` |

> Alle weiteren Variablen aus `backend/.env.example` können bei Bedarf ergänzt werden.

---

## 5. Domain & SSL konfigurieren

Im Tab **Domains**:

1. **Add Domain** → `deine.domain.de`
2. SSL-Provider: **Let's Encrypt** (automatisch via Traefik)
3. Ziel-Port: **80** (Nginx im Frontend-Container übernimmt das interne Routing)

Der A-Record der Domain muss auf die Server-IP zeigen.

---

## 6. Persistente Daten (Bind-Mount)

Tesla Carview verwendet ein **Bind-Mount** (`./data:/app/data`), kein benanntes Docker-Volume.
Alle Datenbankdateien (`master.db`, `tenants/*.db`) liegen direkt im Verzeichnis
`data/` unterhalb des App-Verzeichnisses auf dem Host — standardmäßig `/opt/tesla-carview/data/`.

Für Backups genügt ein einfaches `cp`:

```bash
# Manuelles Backup:
cp /opt/tesla-carview/data/master.db /opt/backups/
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

Der integrierte Auto-Backup (System-Einstellungen → Automatisches Backup) kann Backups
alternativ auf S3 oder per SFTP ablegen – ohne Cron-Job auf dem Host.

---

## 7. Erstes Deployment auslösen

Im App-Tab oben rechts: **Deploy** → Dokploy lädt den Code von GitHub,
baut die Docker-Images und startet die Container.

Logs während des Builds:
- Tab **Deployments** → aktuelles Deployment anklicken → Log-Ausgabe in Echtzeit

---

## 8. Automatisches Deployment bei GitHub-Push

### Voraussetzung: GitHub App-Integration (Schritt 3A)

Mit der GitHub App-Integration registriert Dokploy automatisch einen Webhook.
Jeder Push auf `main` löst ein neues Deployment aus – ohne weitere Konfiguration.

### Manueller Webhook (Option B / ohne GitHub App)

1. Dokploy → App → Tab **General** → **Webhook URL** kopieren
   (Format: `https://dokploy.deine.domain.de/api/deploy/XXXXX`)
2. GitHub → Repository → Settings → Webhooks → **Add webhook**
   - Payload URL: die kopierte Webhook-URL
   - Content type: `application/json`
   - Secret: leer lassen (oder in Dokploy setzen)
   - Trigger: **Just the push event**

Ab sofort: Push auf `main` → Dokploy baut und deployed automatisch.

---

## 9. Logs & Monitoring

```
Dokploy Dashboard → App → Logs
```

Oder direkt per Docker auf dem Server:

```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs -f backend
```

---

## Vergleich: Dokploy vs. GitHub Actions SSH

| Kriterium | GitHub Actions + SSH | Dokploy |
|---|---|---|
| Web-UI für Logs/Status | ✗ (nur GitHub UI) | ✓ |
| SSL-Automatisierung | Manuell (Certbot) | ✓ (Traefik) |
| Mehrere Apps auf einem Server | Komplex | ✓ |
| Eigene CI/CD-Logik | ✓ (flexibel) | ✗ (nur Build + Start) |
| Ressourcenbedarf (Dokploy selbst) | keiner | ~200 MB RAM |
| GitHub-Abhängigkeit | ✓ (Actions) | Optional (Webhook genügt) |

---

## Weiterführend

- [Dokploy Dokumentation](https://docs.dokploy.com)
- [Tesla Carview – GitHub Actions SSH-Deploy](./02-deployment.md#github-actions-auto-deploy)
- [Tesla API konfigurieren](./04-tesla-api.md)

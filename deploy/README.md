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

## Automatisches Deployment

Zwei Optionen – wähle was zu deiner Infrastruktur passt:

| Methode | Beschreibung | Doku |
|---|---|---|
| **GitHub Actions + SSH** | Klassisch, volle Kontrolle | Siehe unten |
| **Dokploy** | Web-UI, SSL automatisch, mehrere Apps | [docs/08-dokploy.md](../docs/08-dokploy.md) |

---

## GitHub Actions + SSH

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

## Reverse-Proxy und Rate-Limits

`setup.sh` erzeugt aus `nginx-host.conf.template` eine passende nginx-Config.
Wer stattdessen Traefik, Caddy oder einen vorhandenen Proxy davorsetzt, muss
die beiden Limits selbst nachbauen — sonst laeuft die App in 429er und wirkt
kaputt (halb geladene Seiten, „hilft nur Neuladen"). Fertiges Traefik-Beispiel:
[`traefik-dynamic.example.yml`](traefik-dynamic.example.yml).

| Pfad | Empfehlung | Warum |
| --- | --- | --- |
| `/api/auth/login` | 10/min, Burst 3 | Brute-Force-Schutz |
| `/api/tiles/` | 1200/min, Burst 300 | Ein Karten-Zoom laedt 50–150 Kacheln in einem Rutsch |
| `/api/` (Rest) | 120/min, **Burst ≥ 60** | Ein Seitenwechsel feuert 15–26 Requests |

Die beiden haeufigsten Fehler:

1. **`/api/tiles/` faellt unter das allgemeine API-Limit.** Nach einem
   Karten-Zoom ist der Burst leer und jeder weitere API-Call bekommt 429.
   Der spezifischere Pfad braucht hoehere Prioritaet als `/api/`.
2. **Burst zu klein.** Nicht die Dauerrate ist das Problem, sondern der
   Eimer: 20 reicht fuer keinen Seitenwechsel dieser App.

Woher kommt ein 429? Die Antwort verraet die Instanz:

- `x-retry-in`-Header → **Traefik**
- HTML-Fehlerseite ohne Zusatz-Header → **nginx** (`limit_req`)
- `ratelimit-limit` / `ratelimit-remaining` → **App** (express-rate-limit)

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

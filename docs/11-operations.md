# 🛠 Betrieb & Operationen

> 🇬🇧 [Read in English](11-operations.en.md) · 👤 [Benutzer-Handbuch](../frontend/src/handbook/handbook.de.md) · 🏠 [Doku-Übersicht](.)

Was Self-Hoster im Tagesgeschäft brauchen: Backup, Restore, Wartung, Update. Alle Aktionen sind **Admin-only** und audit-geloggt.

---

## 💾 Backup & Restore

### Backup erstellen

**Über die Web-UI (empfohlen):**

1. Als Admin einloggen → **Admin → Datenverwaltung**
2. Karte „💾 Vollständiges Backup & Restore" → Button **„⬇ Backup erstellen"**
3. Eine JSON-Datei wird heruntergeladen — Name: `tesla-carview-backup-<slug>-YYYY-MM-DD.json`

Inhalt: alle 25 Tabellen der aktiven Tenant-DB (Fahrzeuge, Fahrten + GPS-Punkte, Ladesessions, Telemetrie, Logbuch, Wartungsintervalle, Benutzer, Audit-Logs, Einstellungen, Tesla-OAuth-Token, Virtual Key, Legal-Akzeptanzen, Trip-Änderungshistorie). Bewusst ausgeschlossen: `push_subscriptions` (browser-spezifisch) und `refresh_tokens` (liegen in `master.db`).

**Per CLI / Cron** (für externe Backup-Strategien):

```bash
# Sichert direkt die SQLite-Dateien — atomar, ohne Service-Stop
docker compose -f docker-compose.prod.yml exec backend sh -c \
  "sqlite3 /app/data/master.db '.backup /app/data/backup-$(date +%F).db'"
docker cp tesla-carview-backend:/app/data/. /pfad/zu/backup/
```

Empfehlung: Web-UI-Backup zusätzlich auf eine externe Platte legen — eine einzige JSON-Datei pro Mandant ist portabel und versionierbar.

### Backup wiederherstellen

**Use-Case:** neues System aufgesetzt, oder das alte System hat sich verheddert. So bringst du den vorherigen Stand zurück:

1. Mindestens den Setup-Wizard durchlaufen (Admin-Konto anlegen)
2. Als Admin einloggen → **Admin → Datenverwaltung → „⬆ Backup wiederherstellen…"**
3. JSON-Datei auswählen + Bestätigungstext `WIEDERHERSTELLEN` eingeben
4. „Jetzt wiederherstellen" → Server legt zuerst ein **Sicherheits-Backup der aktuellen `.db`** an (Pfad steht in der Erfolgsmeldung), dann werden alle Tabellen geleert und aus der JSON neu befüllt — in **einer Transaktion**, bei Fehler Rollback
5. Abmelden + neu anmelden, fertig

### Sicherheits-Schichten beim Restore

- `requireAdmin`-Middleware
- Bestätigungstext „WIEDERHERSTELLEN" muss exakt eingetippt werden
- Pre-Restore-Datei-Backup (`<dbname>_pre_restore_<timestamp>.db`)
- Spalten-Intersection: wenn das aktuelle Schema eine umbenannte Spalte hat, fällt sie raus statt die ganze Aktion zu killen
- Audit-Log-Eintrag bei jedem Backup und Restore

---

## 🌙 Nächtliche Wartung

Läuft täglich zwischen **03:30 und 03:40 Europe/Berlin** (DST-sicher via `Intl.DateTimeFormat`). Stops bei jedem Backend-Restart, startet nach 2 Min Backoff neu.

### Was passiert

| Wo | Aufgabe |
|---|---|
| `master.db` | Abgelaufene `refresh_tokens` löschen |
| `master.db` | `oauth_pkce`-States > 24 h löschen |
| `master.db` | Soft-revoked Tenant-Invites > 30 d löschen |
| `master.db` | `VACUUM` + `wal_checkpoint(TRUNCATE)` |
| jede `tenant.db` | `audit_logs` > 180 d löschen |
| jede `tenant.db` | Used/expired `user_invites` > 30 d löschen |
| jede `tenant.db` | `wal_checkpoint(TRUNCATE)` |
| jede `tenant.db` | `VACUUM` nur wenn DB > 50 MB |
| jede `tenant.db` | Audit-Eintrag `system_maintenance` mit Counts |

### Manuell auslösen

**UI:** System → System-Status → „🌙 Nächtliche Wartung" → **„Jetzt ausführen"**.

**API:**
```bash
curl -X POST https://carview.example.com/api/system/maintenance-now \
  -H "Authorization: Bearer $ADMIN_JWT"
```

### Letzten Lauf prüfen

```bash
curl https://carview.example.com/api/system/maintenance-log \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

Zeigt die letzten bis zu 50 Läufe mit Counts, Dauer und Fehlerstatus.

---

## ⬆️ Auto-Update (opt-in)

> ⚠️ **Standard ist aus.** Aktivieren bedeutet, dass dein System nachts automatisch neue Commits aus `main` zieht und einen Container-Rebuild macht. Vorher prüfen, dass `deploy/update.sh` auf deinem Setup sauber durchläuft.

### Aktivieren

```bash
# backend/.env
AUTO_UPDATE_ENABLED=true
UPDATE_REPO_DIR=/opt/tesla-carview   # Default ist genau das, nur überschreiben wenn anders
```

Dann Backend neustarten:
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Was passiert in der Nacht

1. `git fetch origin main` im konfigurierten Repo-Pfad
2. Vergleich von `git rev-parse HEAD` mit `origin/main`
3. Bei Unterschied: `bash deploy/update.sh` (max. 10 min Timeout)
4. Während des Rebuilds zeigt das Frontend automatisch das **Maintenance-Overlay** (siehe `frontend/src/components/MaintenanceOverlay.vue`) mit Tesla-Sprüchen — User merken kaum etwas
5. Status (Local-Hash, Remote-Hash, Update-Ergebnis) landet im Maintenance-Log

### Manuelles Update jederzeit

```bash
cd /opt/tesla-carview
bash deploy/update.sh
```

---

## 📊 System-Health auf einen Blick

UI: **Admin → System** → oben sieht der Admin eine farbige Ampel-Karte. Backend-Endpoint: `GET /api/system/health` (admin-only). Checks:

| Check | Grün | Gelb | Rot |
|---|---|---|---|
| Tesla OAuth-Token | gültig, > 7d Restlaufzeit | < 7d Rest | abgelaufen oder fehlt |
| Virtual Key | erzeugt | — | nicht erzeugt |
| Fleet Telemetry | letzter Datenpunkt < 24 h | < 7 d | nichts oder > 7 d |
| Tesla-Poller | letzter Lauf < 60 min | < 1 d | — |
| Tenant-DB | informativ — Größe in MB | — | — |

---

## 🔍 Logs einsehen

**Container-Logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f --tail 200 backend
```

**Audit-Log** (sicherheitsrelevante Ereignisse pro Tenant):
- UI: **Admin → Audit-Log** mit Filter (Aktion, User-ID, Datum) und CSV-Export
- API: `GET /api/audit` (admin-only)

**Maintenance-Log** (letzte nächtliche Läufe):
- UI: System → „🌙 Nächtliche Wartung" → Details
- API: `GET /api/system/maintenance-log` (admin-only)

---

## 🚨 Notfall: Datenbank-Reset

Wenn alles schiefläuft und ein sauberer Neustart nötig ist:

```bash
# 1. Backup VORHER ziehen (siehe oben)
# 2. Container stoppen
docker compose -f docker-compose.prod.yml down

# 3. Volume entfernen — ALLE DATEN WEG
docker volume rm tesla-carview_tesla_data

# 4. Neu starten — Setup-Wizard kommt automatisch
docker compose -f docker-compose.prod.yml up -d --build
```

Falls du das Backup wiederherstellen willst, durchläufst du den Setup-Wizard mit einem temporären Admin-Konto, loggst dich ein und nutzt dann die UI-Restore-Funktion.

---

## Siehe auch

- [01-quickstart.md](01-quickstart.md) — Erstmaliges Setup
- [02-deployment.md](02-deployment.md) — Produktiv-Deployment
- [10-configuration.md](10-configuration.md) — Alle ENV-Variablen
- [05-security-architecture.md](05-security-architecture.md) — Sicherheits-Modell

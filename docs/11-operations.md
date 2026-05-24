# 🛠 Betrieb & Operationen

> 🇬🇧 [Read in English](11-operations.en.md) · 👤 [Benutzer-Handbuch](../frontend/src/handbook/handbook.de.md) · 🏠 [Doku-Übersicht](.)

Was Self-Hoster im Tagesgeschäft brauchen: Backup, Restore, Wartung, Demo-Modus, Update. Alle Aktionen sind **Admin-only** und audit-geloggt.

---

## 💾 Backup & Restore

### Backup erstellen

**Über die Web-UI (empfohlen):**

1. Als Admin einloggen → **Admin → Datenverwaltung**
2. Karte „💾 Vollständiges Backup & Restore" → Button **„⬇ Backup erstellen"**
3. Eine JSON-Datei wird heruntergeladen — Name: `tesla-carview-backup-<slug>-YYYY-MM-DD.json`

Inhalt: alle 26 Tabellen der aktiven Tenant-DB (Fahrzeuge, Fahrten + GPS-Punkte, Ladesessions, Telemetrie, Logbuch, Wartungsintervalle, Benutzer, Passkey-Credentials, Audit-Logs, Einstellungen, Tesla-OAuth-Token, Virtual Key, Legal-Akzeptanzen, Trip-Änderungshistorie). Bewusst ausgeschlossen: `push_subscriptions` (browser-spezifisch) und `refresh_tokens` (liegen in `master.db`).

> **Passkeys**: `passkey_credentials` ist im Backup enthalten. Nach einem Restore auf **denselben Server** funktionieren registrierte Passkeys sofort weiter — die `credential_id` liegt serverseitig vor und die `user_id` bleibt durch den Restore erhalten. Restore auf einen anderen Server oder eine andere Domain erfordert eine neue Passkey-Registrierung (WebAuthn ist domain-gebunden).

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

### In-App Deployment (optional)

Admins können das Update direkt aus der Web-UI heraus starten (**System → In-App Deployment**). Dafür läuft ein kleiner Webhook-Daemon auf dem Host, der vom Backend-Container erreichbar ist.

**Einrichten (einmalig):**

```bash
# 1. Secret generieren
openssl rand -hex 24   # Ausgabe merken

# 2. Env-Datei anlegen (wird nie committed)
cp /opt/tesla-carview/deploy/update-webhook.env.example \
   /opt/tesla-carview/deploy/update-webhook.env
# UPDATE_WEBHOOK_SECRET=<erzeugten Wert eintragen>

# 3. Systemd-Service installieren
sudo cp /opt/tesla-carview/deploy/tesla-carview-update-webhook.service \
        /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tesla-carview-update-webhook

# 4. URL in backend/.env eintragen
# DEPLOY_WEBHOOK_URL=http://172.18.0.1:7071/deploy?token=<secret>
# (172.18.0.1 = Docker-Bridge-Gateway; ggf. anpassen mit: docker network inspect tesla-carview_tesla-net)

# 5. Firewall (falls ufw aktiv)
sudo ufw allow from 172.18.0.0/16 to any port 7071

# 6. Backend neustarten
docker compose -f docker-compose.prod.yml up -d backend
```

**Health-Check:**
```bash
curl http://172.18.0.1:7071/health
# → {"ok":true}
```

Der Daemon lauscht ausschließlich auf der Docker-Bridge (`172.18.0.1`) und ist damit nicht aus dem Internet erreichbar.

---

## 🧪 Demo-Modus aktivieren

Für **Tester ohne Tesla**. Wer es nur bei sich selbst spielen will, lässt es aus.

### Aktivieren

```bash
# backend/.env
DEMO_ENABLED=true
```

Backend neustarten. Beim ersten Start wird automatisch ein zusätzlicher Mandant mit slug `demo` und der DB-Datei `data/tenants/<uuid>.db` angelegt.

### Hard-Limits (encoded in `routes/demo.js`)

| Konstante | Default | ENV-Variable | Bedeutung |
|---|---|---|---|
| `MAX_ACTIVE_DEMO_USERS` | `200` | `MAX_ACTIVE_DEMO_USERS` | Gleichzeitig aktive Tester. HTTP 503 wenn voll. |
| `DEMO_SIGNUPS_PER_IP` | `2` / 24 h | `DEMO_SIGNUPS_PER_IP` | Pro IP maximal 2 Signups pro 24h-Fenster |
| `DEMO_LIFETIME_DAYS` | `2` | `DEMO_LIFETIME_DAYS` | Account inkl. aller Daten wird nach 2 d rückstandslos gelöscht |

Alle drei Werte sind per ENV-Variable überschreibbar — für eine private Instanz mit `DEMO_ENABLED=true` bietet es sich an, `MAX_ACTIVE_DEMO_USERS=5` und `DEMO_LIFETIME_DAYS=1` zu setzen.

### Was die Tester sehen

- Login-Seite zeigt eine blaue Karte „🧪 Tesla Carview ausprobieren — ohne Tesla" mit freien Slots
- Klick → User `tester-<hex>` wird erzeugt, eingeloggt, Fake-Fahrzeug + 3 Wochen Historie geseedet
- Banner oben in der App: „Demo-Modus — Konto und Daten werden am DD.MM.YYYY automatisch gelöscht (X Tage übrig)"
- Privacy- und Terms-Seiten zeigen automatisch einen **Tester-Zusatz** (kein Anspruch auf Verfügbarkeit, kein SLA, Fake-Daten, Löschung nach `DEMO_LIFETIME_DAYS` Tagen)
- Alle 30 min: eine neue Fake-Fahrt pro Demo-Fahrzeug — damit die Demo „lebendig" wirkt

### Cleanup

- Alle 6 h läuft der Demo-Lifecycle: User mit `expires_at < now` werden in einer Transaktion komplett gelöscht (User-Row + alle abhängigen Tabellen: Fahrzeuge, Trips, GPS-Punkte, Charging, Battery, Telemetrie, Logbuch, MFA-Codes, Audit-Logs, Charging-Locations, Service-Intervalle)
- Der Demo-Mandant selbst bleibt persistent — nur die Tester-Daten werden gelöscht
- **Isolation**: Der Demo-Slug wird **nie** in `localStorage` geschrieben — ein Tester, der das Browser-Tab schließt und die Produktiv-URL neu öffnet, landet nicht versehentlich im Demo-Mandanten

---

## 🛡️ Monitoring & Selbstheilung

Ein Cron-Job (`/opt/monitoring/bin/heal.sh`) läuft alle 15 Minuten und überwacht die Kernservices:

1. **Container-Status** — prüft `docker inspect` für `tesla-carview-backend`, `-frontend` und `-nginx`; ist ein Container nicht im Zustand `running`, wird er per `docker compose up -d <service>` neu gestartet.
2. **Health-Endpoint** — wenn alle Container laufen, prüft er `GET /api/health`; antwortet der Endpunkt nicht mit `{"status":"ok"}`, wird der Backend-Container neu gestartet.
3. **E-Mail-Alert** — nach jedem automatischen Neustart wird (wenn konfiguriert) eine Benachrichtigungsmail verschickt.
4. **Log-Rotation** — Das Log `/var/log/tcv-heal.log` wird bei > 1 MB automatisch auf die letzten 500 Zeilen gekürzt.

**Konfiguration** (Admin → System → Monitoring & Selbstheilung):

| Einstellung | Beschreibung |
|---|---|
| Selbstheilung an/aus | DB-Schlüssel `monitoring.heal_enabled`; auf `false` = Cron-Job beendet sich sofort |
| Alert-E-Mail | DB-Schlüssel `monitoring.alert_email`; leer = kein Alert |

**API-Endpunkte** (admin-only):
- `GET /api/system/monitoring-config` — liest aktuelle Konfiguration
- `PUT /api/system/monitoring-config` — speichert Konfiguration
- `GET /api/system/monitoring-log?lines=50` — liefert letzte N Zeilen aus Heal- und Security-Log

**Logs manuell prüfen:**
```bash
tail -50 /var/log/tcv-heal.log
tail -50 /var/log/security-check.log
```

**Cron-Eintrag** (`/etc/cron.d/tesla-carview-monitoring`):
```
*/15 * * * * root /opt/monitoring/bin/heal.sh >/dev/null 2>&1
```

---

## 📊 System-Health auf einen Blick

UI: **Admin → System** → oben sieht der Admin eine farbige Ampel-Karte. Backend-Endpoint: `GET /api/system/health` (admin-only). Checks:

| Check | Grün | Gelb | Rot | Info (gedimmt) |
|---|---|---|---|---|
| Tesla OAuth-Token | gültig, > 7d Restlaufzeit | < 7d Rest | abgelaufen oder fehlt | — |
| Virtual Key | erzeugt | — | nicht erzeugt | — |
| Fleet Telemetry | letzter Datenpunkt < 24 h | < 7 d | nichts oder > 7 d | — |
| Tesla-Poller | letzter Lauf < 60 min | < 1 d | — | — |
| Tenant-DB | informativ — Größe in MB | — | — | — |
| Nachtwarung | letzter Lauf < 25 h | — | — | — |
| OpenChargeMap | Live-Probe OK | — | Probe fehlgeschlagen (Key gesetzt) | Kein Key konfiguriert |
| HERE Maps | Live-Probe OK | — | Probe fehlgeschlagen (Key gesetzt) | Kein Key konfiguriert |

Optionale Services (OCM, HERE) werden nur als Fehler gewertet, wenn ein Key gesetzt ist, die Gegenstelle aber nicht antwortet. Ohne Key: `info`-Status, gedimmt, kein Einfluss auf die Gesamtampel.

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

# 3. Daten-Verzeichnis leeren — ALLE DATEN WEG
# Die DBs liegen im Bind-Mount ./data (nicht in einem Docker-Volume!)
rm -rf ./data/master.db ./data/tenants/

# 4. Neu starten — Setup-Wizard kommt automatisch
docker compose -f docker-compose.prod.yml up -d
```

> Die SQLite-Daten liegen seit v2.0 als Bind-Mount unter `./data` (relativ zum Compose-File), **nicht** in einem Docker Named Volume. `docker volume rm` ist für dieses Setup wirkungslos.

Falls du das Backup wiederherstellen willst, durchläufst du den Setup-Wizard mit einem temporären Admin-Konto, loggst dich ein und nutzt dann die UI-Restore-Funktion.

---

## Siehe auch

- [01-quickstart.md](01-quickstart.md) — Erstmaliges Setup
- [02-deployment.md](02-deployment.md) — Produktiv-Deployment
- [10-configuration.md](10-configuration.md) — Alle ENV-Variablen
- [05-security-architecture.md](05-security-architecture.md) — Sicherheits-Modell

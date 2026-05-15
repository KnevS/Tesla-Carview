# Backup & Wiederherstellung

🌐 **Sprache / Language:** [EN](Backup-and-Restore) · [FR](FR-Backup-and-Restore) · [ES](ES-Backup-and-Restore) · [TR](TR-Backup-and-Restore) · [EL](EL-Home) · **DE**

---

Deine Daten (Fahrten, Ladehistorie, Fahrtenbuch, Einstellungen) liegen in SQLite-Datenbanken auf deinem Server. Regelmäßige Backups schützen vor Hardware-Ausfall, versehentlichem Löschen oder Migration auf einen neuen Server.

---

## Was muss gesichert werden?

| Daten | Speicherort | Größe (typisch) |
|---|---|---|
| Master-Datenbank | `/app/data/master.db` | ~1 MB |
| Tenant-Datenbanken | `/app/data/tenants/*.db` | ~50 MB pro Tenant (3 Jahre) |
| Umgebungskonfiguration | `/opt/tesla-carview/backend/.env` | Klein |
| SSL-Zertifikat | `/etc/letsencrypt/` | Klein |

> Die Docker-Images und der App-Code **müssen nicht gesichert werden** — sie können jederzeit neu von GitHub heruntergeladen werden.

---

## Option 1: In-App Backup (empfohlen für die meisten Nutzer)

Tesla Carview hat eine eingebaute Backup-Funktion:

1. Zu **Admin → Datenverwaltung** gehen
2. Auf **„Backup erstellen"** klicken
3. Eine JSON-Datei wird heruntergeladen — enthält alle 25 Datenbanktabellen (Fahrzeuge, Fahrten + GPS-Punkte, Ladesessions, Logbuch, Benutzer, Audit-Logs, Einstellungen, Tesla-Tokens, Virtual Key, Legal-Akzeptanzen)
4. Irgendwo sicher speichern (externe Festplatte, Cloud-Speicher, anderes Gerät)

**Backup wiederherstellen:**
1. Zu **Admin → Datenverwaltung → Backup wiederherstellen** gehen
2. JSON-Datei auswählen
3. Bestätigungstext `WIEDERHERSTELLEN` exakt eingeben
4. „Jetzt wiederherstellen" — die Wiederherstellung dauert Sekunden
5. Vor dem Wiederherstellen wird automatisch ein Sicherheits-Backup der aktuellen Daten erstellt

---

## Option 2: Automatisches Backup-Skript

Für Backups ohne manuellen Aufwand, die täglich automatisch erstellt werden:

```bash
# Backup-Verzeichnis erstellen
mkdir -p /opt/backups/tesla-carview

# Backup-Skript erstellen
cat > /opt/backups/backup-tesla.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/opt/backups/tesla-carview"
DATA_DIR="/var/lib/docker/volumes/tesla_data/_data"

# Datenbanken kopieren
cp "$DATA_DIR/master.db" "$BACKUP_DIR/master-$DATE.db"
cp -r "$DATA_DIR/tenants" "$BACKUP_DIR/tenants-$DATE/"
cp "/opt/tesla-carview/backend/.env" "$BACKUP_DIR/env-$DATE.bak"

# Nur die letzten 14 Tage behalten
find "$BACKUP_DIR" -name "*.db" -mtime +14 -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +14 -delete
find "$BACKUP_DIR" -type d -name "tenants-*" -mtime +14 -exec rm -rf {} +

echo "Backup fertig: $DATE"
EOF

chmod +x /opt/backups/backup-tesla.sh

# Zum Cron hinzufügen (täglich um 2 Uhr nachts)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

**Alternative per CLI (atomar, ohne Service-Stop):**
```bash
docker compose -f docker-compose.prod.yml exec backend sh -c \
  "sqlite3 /app/data/master.db '.backup /app/data/backup-$(date +%F).db'"
docker cp tesla-carview-backend:/app/data/. /pfad/zu/backup/
```

---

## Option 3: Externes Backup (empfohlen für wichtige Daten)

Ein Backup auf demselben Server schützt nicht vor Server-Ausfall. Kopiere Backups daher auch extern:

### Auf einen entfernten SSH-Server / NAS

```bash
# Zum Backup-Skript hinzufügen:
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### Zur Hetzner Storage Box (~1 €/Monat für 100 GB)

```bash
# Zum Backup-Skript hinzufügen:
rsync -az /opt/backups/tesla-carview/ deine-storagebox.your-storagebox.de:/backups/
```

### Zu einem Cloud-Anbieter (Backblaze B2, AWS S3)

```bash
# rclone installieren (unterstützt die meisten Cloud-Anbieter):
curl https://rclone.org/install.sh | sudo bash
rclone config  # Interaktive Einrichtung für deinen Cloud-Anbieter

# Zum Backup-Skript hinzufügen:
rclone sync /opt/backups/tesla-carview/ backblaze:mein-bucket/tesla-carview/
```

---

## Auf einen neuen Server umziehen

Beim Wechsel auf einen neuen Server (Hardware-Upgrade, VPS-Wechsel):

1. **Auf dem alten Server:** Vollständiges Backup über Admin → Datenverwaltung → Backup herunterladen
2. **Auf dem neuen Server:** Setup-Skript ausführen: `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Bei der neuen Installation einloggen
4. Zu **Admin → Datenverwaltung → Backup wiederherstellen** → Backup hochladen
5. DNS-Eintrag aktualisieren, damit er auf die neue Server-IP zeigt
6. Im Tesla Developer Portal die Redirect-URI aktualisieren, falls sich die Domain geändert hat

---

## Nächtliche Wartung (automatisch)

Tesla Carview führt täglich zwischen **03:30 und 03:40 (Europe/Berlin)** automatisch eine Wartungsaufgabe durch:

- Abgelaufene Tokens und verwaiste Einträge entfernen
- WAL-Checkpoint (SQLite-Optimierung)
- VACUUM — gibt Speicherplatz frei wenn eine Datenbank über 50 MB groß ist
- Wenn `AUTO_UPDATE_ENABLED=true`: neuesten Code holen und neu starten

Manuell auslösen:
- **Admin → System → Nächtliche Wartung → Jetzt ausführen**

Letzten Wartungslauf prüfen:
- **Admin → System → Wartungslog**

---

## Backup-Best-Practices

- **3-2-1-Regel:** 3 Kopien, 2 verschiedene Speichermedien, 1 extern
- Backups testen, indem du tatsächlich eine Wiederherstellung durchführst (Admin → Restore Test-Funktion)
- Die `.env`-Datei separat und sicher aufbewahren (enthält Zugangsdaten)
- Vor jedem größeren Update oder Konfigurationsänderung ein Backup erstellen

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

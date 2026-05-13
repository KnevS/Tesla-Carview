# Backup & Restore

Your data (trips, charging history, logbook, settings) lives in SQLite databases on your server. Regular backups protect against hardware failure, accidental deletion, or migration to a new server.

---

## What needs backing up?

| Data | Location | Size (typical) |
|---|---|---|
| Master database | `/app/data/master.db` | ~1 MB |
| Tenant databases | `/app/data/tenants/*.db` | ~50 MB per tenant (3 years) |
| Environment config | `/opt/tesla-carview/backend/.env` | Tiny |
| SSL certificate | `/etc/letsencrypt/` | Tiny |

> The Docker images and app code **don't** need backing up — they can be re-downloaded from GitHub at any time.

---

## Option 1: In-app backup (recommended for most users)

Tesla Carview has a built-in backup feature:

1. Go to **Admin → Data → Backup**
2. Click **Download Backup**
3. A JSON file is downloaded containing all 25 database tables
4. Save it somewhere safe (external drive, cloud storage, different device)

**Restore from backup:**
1. Go to **Admin → Data → Restore**
2. Upload the backup JSON file
3. Type the confirmation phrase `RESTORE`
4. The restore completes in seconds
5. A safety backup of the current data is made automatically before restoring

---

## Option 2: Automated backup script

For hands-off backups, create a cron job that saves a copy daily:

```bash
# Create backup directory
mkdir -p /opt/backups/tesla-carview

# Create backup script
cat > /opt/backups/backup-tesla.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/opt/backups/tesla-carview"
DATA_DIR="/var/lib/docker/volumes/tesla_data/_data"

# Copy databases
cp "$DATA_DIR/master.db" "$BACKUP_DIR/master-$DATE.db"
cp -r "$DATA_DIR/tenants" "$BACKUP_DIR/tenants-$DATE/"
cp "/opt/tesla-carview/backend/.env" "$BACKUP_DIR/env-$DATE.bak"

# Keep only last 14 days
find "$BACKUP_DIR" -name "*.db" -mtime +14 -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +14 -delete
find "$BACKUP_DIR" -type d -name "tenants-*" -mtime +14 -exec rm -rf {} +

echo "Backup done: $DATE"
EOF

chmod +x /opt/backups/backup-tesla.sh

# Add to cron (runs daily at 2 AM)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

---

## Option 3: Offsite backup (recommended for important data)

A backup on the same server doesn't protect against server failure. Copy backups offsite:

### To a remote SSH server / NAS

```bash
# Add to your backup script:
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### To Hetzner Storage Box (cheap, ~1€/month for 100 GB)

```bash
# Add to your backup script:
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### To a cloud provider (Backblaze B2, AWS S3)

```bash
# Install rclone (supports most cloud providers):
curl https://rclone.org/install.sh | sudo bash
rclone config  # Interactive setup for your cloud provider

# Add to backup script:
rclone sync /opt/backups/tesla-carview/ backblaze:my-bucket/tesla-carview/
```

---

## Migrating to a new server

When moving to a new server (hardware upgrade, VPS change):

1. **On the old server:** Download a full backup via Admin → Data → Backup
2. **On the new server:** Run the setup script: `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Log in to the new installation
4. Go to **Admin → Data → Restore** → upload the backup
5. Update your DNS record to point to the new server IP
6. Update the Tesla Developer Portal's Redirect URI if your domain changed

---

## Nightly maintenance (automatic)

Tesla Carview runs an automatic maintenance task every night at 03:30 (Berlin timezone):

- Removes expired tokens and orphaned records
- WAL checkpoint (SQLite optimization)
- VACUUM — reclaims disk space if a database is over 50 MB
- If `AUTO_UPDATE_ENABLED=true`: pulls latest code and restarts

You can trigger it manually:
- **Admin → System → Run Maintenance Now**

Or view the maintenance log:
- **Admin → System → Maintenance Log**

---

## Backup best practices

- **3-2-1 rule:** 3 copies, 2 different storage types, 1 offsite
- Test your backups by actually restoring one (use the Admin → Restore test feature)
- Store your `.env` file backup separately and securely (it contains credentials)
- Back up before any major update or configuration change

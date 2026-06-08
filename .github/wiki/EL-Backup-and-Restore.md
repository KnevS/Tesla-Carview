# Αντίγραφα ασφαλείας & Επαναφορά

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [αγγλικό πρωτότυπο](Home). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

🌐 **Γλώσσα:** [EN](Backup-and-Restore) · [DE](DE-Backup-and-Restore) · [FR](FR-Backup-and-Restore) · [ES](ES-Backup-and-Restore) · [TR](TR-Backup-and-Restore) · **EL**

Τα δεδομένα σας (διαδρομές, ιστορικό φόρτισης, ημερολόγιο, ρυθμίσεις) βρίσκονται σε βάσεις δεδομένων SQLite στον διακομιστή σας. Τα τακτικά αντίγραφα ασφαλείας προστατεύουν από βλάβες υλικού, ακούσια διαγραφή ή μετεγκατάσταση σε νέο διακομιστή.

---

## Τι χρειάζεται αντίγραφο ασφαλείας;

| Δεδομένα | Τοποθεσία | Μέγεθος (τυπικό) |
|---|---|---|
| Κύρια βάση δεδομένων | `/app/data/master.db` | ~1 MB |
| Βάσεις δεδομένων μισθωτών | `/app/data/tenants/*.db` | ~50 MB ανά μισθωτή (3 χρόνια) |
| Διαμόρφωση περιβάλλοντος | `/opt/tesla-carview/backend/.env` | Πολύ μικρό |
| Πιστοποιητικό SSL | `/etc/letsencrypt/` | Πολύ μικρό |

> Τα Docker images και ο κώδικας της εφαρμογής **δεν** χρειάζονται αντίγραφο ασφαλείας — μπορούν να γίνουν λήψη ξανά από το GitHub ανά πάσα στιγμή.

---

## Επιλογή 1: Αντίγραφο ασφαλείας μέσα στην εφαρμογή (συνιστάται για τους περισσότερους χρήστες)

Το TeslaView διαθέτει ενσωματωμένη λειτουργία αντιγράφων ασφαλείας:

1. Μεταβείτε στο **Admin → Data → Backup**
2. Κάντε κλικ στο **Download Backup**
3. Γίνεται λήψη ενός αρχείου JSON που περιέχει και τους 25 πίνακες της βάσης δεδομένων
4. Αποθηκεύστε το σε ασφαλές μέρος (εξωτερικός δίσκος, cloud storage, διαφορετική συσκευή)

**Επαναφορά από αντίγραφο ασφαλείας:**
1. Μεταβείτε στο **Admin → Data → Restore**
2. Ανεβάστε το αρχείο JSON του αντιγράφου ασφαλείας
3. Πληκτρολογήστε τη φράση επιβεβαίωσης `RESTORE`
4. Η επαναφορά ολοκληρώνεται σε δευτερόλεπτα
5. Δημιουργείται αυτόματα ένα αντίγραφο ασφαλείας ασφαλείας των τρεχόντων δεδομένων πριν την επαναφορά

---

## Επιλογή 2: Αυτοματοποιημένο script αντιγράφων ασφαλείας

Για αντίγραφα ασφαλείας χωρίς παρέμβαση, δημιουργήστε μια εργασία cron που αποθηκεύει ένα αντίγραφο καθημερινά:

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

## Επιλογή 3: Εξωτερικό αντίγραφο ασφαλείας (συνιστάται για σημαντικά δεδομένα)

Ένα αντίγραφο ασφαλείας στον ίδιο διακομιστή δεν προστατεύει από βλάβη του διακομιστή. Αντιγράψτε τα αντίγραφα ασφαλείας εκτός τοποθεσίας:

### Σε απομακρυσμένο διακομιστή SSH / NAS

```bash
# Add to your backup script:
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### Σε Hetzner Storage Box (φθηνό, ~1€/μήνα για 100 GB)

```bash
# Add to your backup script:
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### Σε πάροχο cloud (Backblaze B2, AWS S3)

```bash
# Install rclone (supports most cloud providers):
curl https://rclone.org/install.sh | sudo bash
rclone config  # Interactive setup for your cloud provider

# Add to backup script:
rclone sync /opt/backups/tesla-carview/ backblaze:my-bucket/tesla-carview/
```

---

## Μετεγκατάσταση σε νέο διακομιστή

Όταν μετακινείστε σε νέο διακομιστή (αναβάθμιση υλικού, αλλαγή VPS):

1. **Στον παλιό διακομιστή:** Κατεβάστε ένα πλήρες αντίγραφο ασφαλείας μέσω Admin → Data → Backup
2. **Στον νέο διακομιστή:** Εκτελέστε το script εγκατάστασης: `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Συνδεθείτε στη νέα εγκατάσταση
4. Μεταβείτε στο **Admin → Data → Restore** → ανεβάστε το αντίγραφο ασφαλείας
5. Ενημερώστε την εγγραφή DNS ώστε να δείχνει στο IP του νέου διακομιστή
6. Ενημερώστε το Redirect URI στο Tesla Developer Portal εάν άλλαξε ο τομέας σας

---

## Νυχτερινή συντήρηση (αυτόματη)

Το TeslaView εκτελεί μια αυτόματη εργασία συντήρησης κάθε βράδυ στις 03:30 (ζώνη ώρας Βερολίνου):

- Αφαιρεί ληγμένα tokens και ορφανές εγγραφές
- WAL checkpoint (βελτιστοποίηση SQLite)
- VACUUM — απελευθερώνει χώρο στον δίσκο εάν μια βάση δεδομένων είναι πάνω από 50 MB
- Εάν `AUTO_UPDATE_ENABLED=true`: τραβάει τον τελευταίο κώδικα και επανεκκινεί

Μπορείτε να την ενεργοποιήσετε χειροκίνητα:
- **Admin → System → Run Maintenance Now**

Ή να δείτε το αρχείο καταγραφής συντήρησης:
- **Admin → System → Maintenance Log**

---

## Βέλτιστες πρακτικές αντιγράφων ασφαλείας

- **Κανόνας 3-2-1:** 3 αντίγραφα, 2 διαφορετικοί τύποι αποθήκευσης, 1 εκτός τοποθεσίας
- Δοκιμάστε τα αντίγραφα ασφαλείας σας κάνοντας πραγματικά επαναφορά ενός (χρησιμοποιήστε τη δοκιμαστική λειτουργία Admin → Restore)
- Αποθηκεύστε το αντίγραφο ασφαλείας του αρχείου `.env` ξεχωριστά και με ασφάλεια (περιέχει διαπιστευτήρια)
- Δημιουργήστε αντίγραφο ασφαλείας πριν από κάθε σημαντική ενημέρωση ή αλλαγή διαμόρφωσης

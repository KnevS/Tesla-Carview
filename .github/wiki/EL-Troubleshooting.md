# Αντιμετώπιση Προβλημάτων

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [αγγλικό πρωτότυπο](Home). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

🌐 **Γλώσσα:** [EN](Troubleshooting) · [DE](DE-Troubleshooting) · [FR](FR-Troubleshooting) · [ES](ES-Troubleshooting) · [TR](TR-Troubleshooting) · **EL**

Λύσεις στα πιο συνηθισμένα προβλήματα. Ξεκινήστε με την πιο πιθανή αιτία και προχωρήστε προς τα κάτω.

---

## 🚫 Δεν μπορώ να φτάσω στην εφαρμογή καθόλου

### Έλεγχος: Τρέχει ο διακομιστής;

```bash
# Check container status:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Should show all containers as "Up":
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Εάν κάποιο container εμφανίζει "Exit" ή "Restarting":
```bash
# View logs for the problem container:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Επανεκκινήστε τα πάντα:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Έλεγχος: Επιλύεται σωστά ο τομέας;

```bash
nslookup tesla.yourdomain.com
# Should show your server's IP address

# Or from your browser: visit https://dnschecker.org
```

Εάν το DNS δεν επιλύεται → περιμένετε 10–30 λεπτά μετά την αλλαγή εγγραφών DNS.

### Έλεγχος: Μπλοκάρει το firewall την πρόσβαση;

```bash
ufw status
# Ports 80 and 443 must show ALLOW
```

Εάν λείπουν:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" ή "503 Service Unavailable"

Αυτό σημαίνει ότι το nginx τρέχει αλλά το backend δεν αποκρίνεται.

```bash
# Check backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Συνηθισμένη αιτία: το backend κατέρρευσε λόγω σφάλματος εκκίνησης. Συχνά μια μεταβλητή `.env` που λείπει ή ζήτημα δικαιωμάτων βάσης δεδομένων.

Διορθώστε τα δικαιώματα βάσης δεδομένων:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 Σφάλματα SSL/HTTPS ("Certificate not valid", "NET::ERR_CERT_EXPIRED")

Το πιστοποιητικό Let's Encrypt έχει λήξει ή δεν εκδόθηκε σωστά.

```bash
# Check certificate status:
certbot certificates

# Renew manually:
certbot renew --force-renewal
systemctl restart nginx
```

Εάν το certbot δεν μπορεί να ανανεωθεί (το DNS δεν επιλύεται, η θύρα 80 μπλοκαρισμένη):
1. Ελέγξτε ότι η θύρα 80 είναι ανοιχτή στο firewall ΚΑΙ στον router σας (port forwarding)
2. Ελέγξτε ότι το DNS του τομέα σας δείχνει στην IP του διακομιστή σας

---

## 🚗 Το όχημα δεν εμφανίζει δεδομένα / εμφανίζεται ως "offline"

### Tesla API μη συνδεδεμένο
→ Ελέγξτε **Admin → System → System Health** — η ενότητα "Tesla Token" δείχνει την κατάσταση σύνδεσης.

Εάν έχει λήξει: **Admin → System → Reconnect Tesla Account**

### Το όχημα κοιμάται
Τα οχήματα Tesla κοιμούνται μετά από 15–30 λεπτά αδράνειας. Η εφαρμογή περιμένει να ξυπνήσει το αυτοκίνητο. Μπορείτε να το ξυπνήσετε χειροκίνητα:
1. Ανοίξτε την επίσημη εφαρμογή Tesla στο τηλέφωνό σας
2. Πατήστε οποιαδήποτε λειτουργία (κλιματισμός, κόρνα) για να ξυπνήσετε το αυτοκίνητο
3. Το TeslaView θα πρέπει να ενημερώσει εντός 60 δευτερολέπτων

### XP7 VIN (Model Y Juniper) — Το GPS δεν ενημερώνεται
Ορισμένα νεότερα οχήματα δεν επιστρέφουν δεδομένα GPS μέσω του τυπικού REST API. Αυτός είναι περιορισμός της Tesla. Το Fleet Telemetry παρέχει δεδομένα GPS για αυτά τα οχήματα — επικοινωνήστε με [Tesla Fleet Telemetry Access](https://developer.tesla.com) εάν το χρειάζεστε.

---

## 🔑 "Tesla API returned 403 Forbidden"

Όλες οι κλήσεις Tesla API επιστρέφουν 403; Αυτό συνήθως σημαίνει ότι ο **λογαριασμός Tesla Developer σας έχει ανασταλεί ή έχει ζήτημα χρέωσης**.

1. Συνδεθείτε στο [developer.tesla.com](https://developer.tesla.com)
2. Ελέγξτε για τυχόν προειδοποιήσεις λογαριασμού, ειδοποιήσεις χρέωσης ή μηνύματα αναστολής
3. Συμπληρώστε τυχόν απαιτούμενες πληροφορίες χρέωσης (ακόμα και για χρήση δωρεάν επιπέδου, ενδέχεται να απαιτείται πιστωτική κάρτα)
4. Μετά την επίλυση: **Admin → System → Reconnect Tesla Account**

---

## 🧭 Ο οδηγός εγκατάστασης αποτυγχάνει στη δημιουργία διαχειριστή

**Σύμπτωμα:** Σε μια νέα εγκατάσταση, το βήμα 2 του οδηγού (δημιουργία λογαριασμού διαχειριστή) αποτυγχάνει με `Transaction function cannot return a promise`. Αφορά εκδόσεις έως και την v3.32.5.

**Αιτία & λύση:** Ένα σφάλμα στο `/api/setup/init` ([#170](https://github.com/KnevS/Tesla-Carview/issues/170)) — **διορθώθηκε στην v3.32.6**. Ενημερώστε στην τελευταία έκδοση και ανοίξτε ξανά τον οδηγό:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Στη συνέχεια, ο λογαριασμός διαχειριστή μπορεί να δημιουργηθεί ξανά. Οι υπάρχουσες εγκαταστάσεις δεν επηρεάζονται.

---

## 🔐 Προβλήματα σύνδεσης

### "Invalid username or password" — αλλά είμαι σίγουρος ότι είναι σωστά

- Ελέγξτε το Caps Lock
- Εάν αλλάξατε πρόσφατα κωδικούς πρόσβασης, δοκιμάστε τον παλιό (ο περιηγητής μπορεί να έχει αποθηκεύσει τον παλιό)
- Οι λογαριασμοί διαχειριστή μπορούν να επαναφέρουν κωδικούς χρηστών: **Admin → Users → ο λογαριασμός σας → Reset Password**

### "Account locked"

Μετά από 5 αποτυχημένες προσπάθειες σύνδεσης, ο λογαριασμός κλειδώνεται για 15 λεπτά. Περιμένετε ή ζητήστε από έναν διαχειριστή να τον ξεκλειδώσει.

Οι διαχειριστές μπορούν να ξεκλειδώσουν μέσω:
```bash
# In the container:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Ξεχάσατε τον κωδικό πρόσβασης διαχειριστή

Εάν δεν μπορείτε να συνδεθείτε ως διαχειριστής:
```bash
# Get a shell in the backend container:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Reset password (replace values):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// You need the tenant ID — find it in master.db:
// getDb is called with tenant UUID
"
```

Ή απλούστερα: επαναφέρετε από ένα backup που κάνατε όταν γνωρίζατε τον κωδικό πρόσβασης.

---

## 📱 Οι push ειδοποιήσεις δεν λειτουργούν

### Desktop
1. Ελέγξτε τα δικαιώματα ειδοποιήσεων του περιηγητή: κάντε κλικ στο εικονίδιο κλειδαριάς στη γραμμή διεύθυνσης → Notifications → Allow
2. Ελέγξτε ότι η εφαρμογή χρησιμοποιεί HTTPS (απαιτείται για push)
3. Δοκιμάστε: Settings → Push Notifications → Test Notification

### iOS (iPhone/iPad)
Οι push ειδοποιήσεις στο iOS λειτουργούν μόνο από το **Home Screen shortcut** (PWA), όχι από την καρτέλα του περιηγητή.
1. Ανοίξτε το TeslaView στο Safari
2. Πατήστε Share → "Add to Home Screen"
3. Ανοίξτε από το εικονίδιο της Home Screen → οι ειδοποιήσεις τώρα λειτουργούν

---

## 🐛 Οι εντολές δεν λειτουργούν (κλιματισμός, κλειδαριές κ.λπ.)

Οι εντολές απαιτούν να έχει συζευχθεί το Virtual Key:
1. Έλεγχος: **Settings → Virtual Key** — η κατάσταση πρέπει να εμφανίζει "Paired"
2. Εάν δεν είναι συζευγμένο: ανοίξτε το URL σύζευξης στον **περιηγητή του αυτοκινήτου Tesla** (όχι στο τηλέφωνό σας)
3. Επιβεβαιώστε στην εφαρμογή Tesla στο τηλέφωνό σας

Ελέγξτε επίσης: **Admin → System → Virtual Key Status**

---

## 🗄️ Σφάλματα βάσης δεδομένων ("disk I/O error", "database is locked")

Συνήθως προκαλούνται από αποτυχημένη κάρτα SD στο Raspberry Pi. Ελέγξτε:

```bash
# Check filesystem for errors:
dmesg | grep -i "error\|fail\|corrupt"

# Check SD card health:
df -h
```

Εάν δείτε σφάλματα I/O → η κάρτα SD σας αποτυγχάνει. **Δημιουργήστε αμέσως ένα backup** και αλλάξτε σε USB SSD: [→ Raspberry Pi Storage](EL-Raspberry-Pi-Storage)

---

## 📋 Προβολή logs

```bash
# Backend application logs:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# nginx access log:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# System journal (fail2ban, etc.):
journalctl -u fail2ban --since "1 hour ago"

# fail2ban bans:
fail2ban-client status sshd
```

---

## Ακόμα κολλημένοι;

1. Ελέγξτε τα [GitHub Issues](https://github.com/KnevS/Tesla-Carview/issues) — κάποιος μπορεί να είχε το ίδιο πρόβλημα
2. Ανοίξτε ένα νέο issue με:
   - Τι δοκιμάσατε
   - Τι συνέβη (μηνύματα σφάλματος, screenshots)
   - Τη ρύθμισή σας (μοντέλο Pi, πάροχος VPS, έκδοση λειτουργικού)
   - Σχετική έξοδος log (αφαιρέστε κωδικούς πρόσβασης ή μυστικά)

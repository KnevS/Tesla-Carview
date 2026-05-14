# Αντιμετώπιση Προβλημάτων

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Troubleshooting)** | English version |
| 🇩🇪 **[Deutsch](DE-Troubleshooting)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Troubleshooting)** | Version française |
| 🇪🇸 **[Español](ES-Troubleshooting)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Troubleshooting)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Troubleshooting)** | Βρίσκεστε εδώ |

---

Λύσεις στα πιο συνηθισμένα προβλήματα. Ξεκινήστε με την πιο πιθανή αιτία και προχωρήστε προς τα κάτω.

---

## 🚫 Δεν μπορώ να προσεγγίσω καθόλου την εφαρμογή

### Ελέγξτε: Εκτελείται ο διακομιστής;

```bash
# Ελέγξτε κατάσταση κοντέινερ:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Θα πρέπει να εμφανίζει όλα τα κοντέινερ ως "Up":
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Εάν οποιοδήποτε κοντέινερ εμφανίζει "Exit" ή "Restarting":
```bash
# Δείτε αρχεία καταγραφής για το προβληματικό κοντέινερ:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Κάντε επανεκκίνηση των πάντων:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Ελέγξτε: Επιλύεται σωστά ο τομέας;

```bash
nslookup tesla.yourdomain.com
# Θα πρέπει να εμφανίζει τη διεύθυνση IP του διακομιστή σας

# Ή από το πρόγραμμα περιήγησής σας: επισκεφτείτε το https://dnschecker.org
```

Εάν το DNS δεν επιλύεται → περιμένετε 10–30 λεπτά μετά την αλλαγή εγγραφών DNS.

### Ελέγξτε: Αποκλείει το τείχος προστασίας την πρόσβαση;

```bash
ufw status
# Οι θύρες 80 και 443 πρέπει να εμφανίζουν ALLOW
```

Εάν λείπουν:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" ή "503 Service Unavailable"

Αυτό σημαίνει ότι το nginx εκτελείται αλλά το backend δεν ανταποκρίνεται.

```bash
# Ελέγξτε backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Συνηθισμένη αιτία: το backend κατέρρευσε λόγω σφάλματος εκκίνησης. Συχνά μια ελλείπουσα μεταβλητή `.env` ή πρόβλημα δικαιωμάτων βάσης δεδομένων.

Διόρθωση δικαιωμάτων βάσης δεδομένων:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 Σφάλματα SSL/HTTPS ("Certificate not valid", "NET::ERR_CERT_EXPIRED")

Το πιστοποιητικό Let's Encrypt έχει λήξει ή δεν εκδόθηκε σωστά.

```bash
# Ελέγξτε κατάσταση πιστοποιητικού:
certbot certificates

# Ανανέωση χειροκίνητα:
certbot renew --force-renewal
systemctl restart nginx
```

Εάν το certbot δεν μπορεί να ανανεώσει (DNS δεν επιλύεται, θύρα 80 αποκλεισμένη):
1. Ελέγξτε ότι η θύρα 80 είναι ανοιχτή στο τείχος προστασίας ΚΑΙ στο δρομολογητή σας (προώθηση θύρας)
2. Ελέγξτε ότι το DNS του τομέα σας δείχνει στην IP του διακομιστή σας

---

## 🚗 Το όχημα δεν εμφανίζει δεδομένα / εμφανίζεται "offline"

### Το Tesla API δεν είναι συνδεδεμένο
→ Ελέγξτε **Admin → System → System Health** — η ενότητα "Tesla Token" εμφανίζει την κατάσταση σύνδεσης.

Εάν έχει λήξει: **Admin → System → Reconnect Tesla Account**

### Το όχημα κοιμάται
Τα οχήματα Tesla κοιμούνται μετά από 15–30 λεπτά αδράνειας. Η εφαρμογή περιμένει να ξυπνήσει το αυτοκίνητο. Μπορείτε να το αφυπνίσετε χειροκίνητα:
1. Ανοίξτε την επίσημη εφαρμογή Tesla στο τηλέφωνό σας
2. Πατήστε οποιαδήποτε λειτουργία (κλιματισμός, κόρνα) για να αφυπνίσετε το αυτοκίνητο
3. Το Tesla Carview θα πρέπει να ενημερωθεί εντός 60 δευτερολέπτων

### XP7 VIN (Model Y Juniper) — Το GPS δεν ενημερώνεται
Ορισμένα νεότερα οχήματα δεν επιστρέφουν δεδομένα GPS μέσω του τυπικού REST API. Αυτός είναι περιορισμός της Tesla. Το Fleet Telemetry παρέχει δεδομένα GPS για αυτά τα οχήματα — επικοινωνήστε με [Tesla Fleet Telemetry Access](https://developer.tesla.com) εάν το χρειάζεστε.

---

## 🔑 "Tesla API returned 403 Forbidden"

Όλες οι κλήσεις Tesla API επιστρέφουν 403; Αυτό σημαίνει συνήθως ότι ο **λογαριασμός Tesla Developer σας είναι ανασταλμένος ή έχει πρόβλημα χρέωσης**.

1. Συνδεθείτε στο [developer.tesla.com](https://developer.tesla.com)
2. Ελέγξτε για τυχόν προειδοποιήσεις λογαριασμού, ειδοποιήσεις χρέωσης ή μηνύματα αναστολής
3. Συμπληρώστε τυχόν απαιτούμενα στοιχεία χρέωσης (ακόμα και για χρήση δωρεάν επιπέδου, ενδέχεται να απαιτείται πιστωτική κάρτα)
4. Μετά την επίλυση: **Admin → System → Reconnect Tesla Account**

---

## 🔐 Προβλήματα σύνδεσης

### "Invalid username or password" — αλλά είμαι σίγουρος ότι είναι σωστό

- Ελέγξτε το Caps Lock
- Εάν άλλαξατε πρόσφατα κωδικούς πρόσβασης, δοκιμάστε τον παλιό (το πρόγραμμα περιήγησης ενδέχεται να έχει αποθηκεύσει τον παλιό)
- Οι λογαριασμοί διαχειριστή μπορούν να επαναφέρουν κωδικούς πρόσβασης χρηστών: **Admin → Users → ο λογαριασμός σας → Reset Password**

### "Account locked"

Μετά από 5 αποτυχημένες προσπάθειες σύνδεσης, ο λογαριασμός κλειδώνεται για 15 λεπτά. Περιμένετε ή ζητήστε από έναν διαχειριστή να τον ξεκλειδώσει.

Οι διαχειριστές μπορούν να ξεκλειδώσουν μέσω:
```bash
# Στο κοντέινερ:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Ξεχάσατε τον κωδικό πρόσβασης διαχειριστή

Εάν δεν μπορείτε να συνδεθείτε ως διαχειριστής:
```bash
# Αποκτήστε ένα shell στο κοντέινερ backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Επαναφέρετε κωδικό πρόσβασης (αντικαταστήστε τιμές):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Χρειάζεστε το tenant ID — βρείτε το στο master.db:
// το getDb καλείται με tenant UUID
"
```

Ή απλούστερα: επαναφέρετε από ένα αντίγραφο ασφαλείας που δημιουργήσατε όταν γνωρίζατε τον κωδικό.

---

## 📱 Οι ειδοποιήσεις push δεν λειτουργούν

### Επιτραπέζιος υπολογιστής
1. Ελέγξτε τα δικαιώματα ειδοποιήσεων προγράμματος περιήγησης: κάντε κλικ στο εικονίδιο κλειδαριάς στη γραμμή διευθύνσεων → Ειδοποιήσεις → Να επιτρέπεται
2. Ελέγξτε ότι η εφαρμογή χρησιμοποιεί HTTPS (απαιτείται για push)
3. Δοκιμάστε: Ρυθμίσεις → Ειδοποιήσεις Push → Δοκιμαστική Ειδοποίηση

### iOS (iPhone/iPad)
Οι ειδοποιήσεις push στο iOS λειτουργούν μόνο από τη **συντόμευση Αρχικής Οθόνης** (PWA), όχι από την καρτέλα προγράμματος περιήγησης.
1. Ανοίξτε το Tesla Carview στο Safari
2. Πατήστε Κοινοποίηση → "Προσθήκη στην Αρχική Οθόνη"
3. Ανοίξτε από το εικονίδιο Αρχικής Οθόνης → οι ειδοποιήσεις λειτουργούν τώρα

---

## 🐛 Οι εντολές δεν λειτουργούν (κλιματισμός, κλειδαριές κ.λπ.)

Οι εντολές απαιτούν το Virtual Key να είναι συζευγμένο:
1. Ελέγξτε: **Ρυθμίσεις → Virtual Key** — η κατάσταση πρέπει να εμφανίζει "Paired"
2. Εάν δεν είναι συζευγμένο: ανοίξτε τη διεύθυνση URL σύζευξης στο **πρόγραμμα περιήγησης αυτοκινήτου Tesla** (όχι στο τηλέφωνό σας)
3. Επιβεβαιώστε στην εφαρμογή Tesla στο τηλέφωνό σας

Επίσης ελέγξτε: **Admin → System → Virtual Key Status**

---

## 🗄️ Σφάλματα βάσης δεδομένων ("disk I/O error", "database is locked")

Συνήθως προκαλείται από αποτυχία κάρτας SD σε Raspberry Pi. Ελέγξτε:

```bash
# Ελέγξτε σύστημα αρχείων για σφάλματα:
dmesg | grep -i "error\|fail\|corrupt"

# Ελέγξτε υγεία κάρτας SD:
df -h
```

Εάν βλέπετε σφάλματα I/O → η κάρτα SD σας αποτυγχάνει. **Δημιουργήστε αμέσως αντίγραφο ασφαλείας** και μεταβείτε σε USB SSD: [→ Αποθήκευση Raspberry Pi](Raspberry-Pi-Storage)

---

## 📋 Προβολή αρχείων καταγραφής

```bash
# Αρχεία καταγραφής εφαρμογής backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# Αρχείο καταγραφής πρόσβασης nginx:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Ημερολόγιο συστήματος (fail2ban κ.λπ.):
journalctl -u fail2ban --since "1 hour ago"

# Αποκλεισμοί fail2ban:
fail2ban-client status sshd
```

---

## Εξακολουθείτε να έχετε πρόβλημα;

1. Ελέγξτε τα [GitHub Issues](https://github.com/KnevS/Tesla-Carview/issues) — κάποιος μπορεί να έχει αντιμετωπίσει το ίδιο πρόβλημα
2. Ανοίξτε ένα νέο issue με:
   - Τι δοκιμάσατε
   - Τι συνέβη (μηνύματα σφάλματος, στιγμιότυπα οθόνης)
   - Τη ρύθμισή σας (μοντέλο Pi, πάροχος VPS, έκδοση ΛΣ)
   - Σχετική έξοδο αρχείου καταγραφής (καλύψτε τυχόν κωδικούς πρόσβασης ή μυστικά)

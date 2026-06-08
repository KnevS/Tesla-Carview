# Ασφάλεια — Authentication, MFA & Βέλτιστες Πρακτικές IT

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [αγγλικό πρωτότυπο](Home). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

🌐 **Γλώσσα:** [EN](Security) · [DE](DE-Security) · [FR](FR-Security) · [ES](ES-Security) · [TR](TR-Security) · **EL**

Το TeslaView διαχειρίζεται ευαίσθητα δεδομένα: τοποθεσία οχήματος, ιστορικό φόρτισης και εντολές ελέγχου προς το αυτοκίνητό σας. Αυτή η σελίδα καλύπτει το πώς ασφαλίζεται και τι πρέπει **εσείς** να κάνετε για να κρατήσετε την εγκατάστασή σας ασφαλή.

---

## Επιλογές σύνδεσης

### 1. Όνομα χρήστη + Κωδικός πρόσβασης (τυπικό)
- Ο κωδικός πρόσβασης κρυπτογραφείται με bcrypt (cost factor 12)
- Οι αποτυχημένες συνδέσεις περιορίζονται με rate limiting: μετά από 5 αποτυχημένες προσπάθειες, ο λογαριασμός κλειδώνεται για 15 λεπτά
- Όλα τα γεγονότα σύνδεσης καταγράφονται στο audit log

**Καλές πρακτικές κωδικών πρόσβασης:**
- Χρησιμοποιήστε passphrase: `Sonne-Berg-Auto-Kaffee` (4+ λέξεις, εύκολο να θυμηθείτε, δύσκολο να σπάσει)
- Ελάχιστο 12 χαρακτήρες — μεγαλύτερο είναι καλύτερο
- Μην ξαναχρησιμοποιείτε κωδικούς πρόσβασης από άλλες υπηρεσίες
- Χρησιμοποιήστε διαχειριστή κωδικών πρόσβασης (Bitwarden, 1Password, KeePass)

### 2. Passkeys (χωρίς κωδικό πρόσβασης, συνιστάται)
Τα passkeys χρησιμοποιούν τη βιομετρική της συσκευής σας (δακτυλικό αποτύπωμα, Face ID) αντί για κωδικό πρόσβασης. Είναι ανθεκτικά στο phishing και πολύ πιο ασφαλή.

Ρύθμιση:
1. **Settings → Security → Add Passkey**
2. Ο περιηγητής σας ανοίγει ένα βιομετρικό prompt — επιβεβαιώστε με δάχτυλο ή πρόσωπο
3. Έτοιμο — μπορείτε τώρα να συνδεθείτε μόνο με τη βιομετρική σας

Τα passkeys λειτουργούν σε:
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (δακτυλικό αποτύπωμα)
- Windows (Windows Hello)
- Hardware keys (YubiKey)

> ⚠️ Ο περιηγητής του αυτοκινήτου Tesla δεν υποστηρίζει passkeys. Χρησιμοποιήστε όνομα χρήστη + κωδικό πρόσβασης με "Stay signed in" στο αυτοκίνητο.

### 3. MFA / Επαλήθευση δύο παραγόντων (TOTP)
Προσθέστε επιπλέον στρώμα με μια εφαρμογή authenticator:
1. **Settings → Security → Enable MFA**
2. Σαρώστε τον κωδικό QR με Google Authenticator, Authy, Bitwarden ή παρόμοιο
3. Εισαγάγετε τον 6ψήφιο κωδικό για επιβεβαίωση

Μετά τη ρύθμιση: κάθε σύνδεση απαιτεί τον κωδικό πρόσβασής σας + τον 6ψήφιο κωδικό.

**Οι διαχειριστές μπορούν να απαιτήσουν MFA για όλους τους χρήστες:**
```env
# .env — forces MFA for all new users:
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Ασφάλεια συνεδρίας

| Ρύθμιση | Τιμή |
|---|---|
| Διάρκεια ζωής access token | 15 λεπτά (βραχείας διάρκειας) |
| Refresh token — τυπικό | 7 ημέρες |
| Refresh token — "Stay signed in" | 90 ημέρες |
| Αποθήκευση refresh token | cookie `httpOnly`, `Secure`, `SameSite=Lax` |
| Token rotation | Νέο refresh token σε κάθε χρήση |

Τα tokens αποθηκεύονται ως hashes SHA-256 — το cleartext δεν αγγίζει ποτέ τη βάση δεδομένων.

---

## Βέλτιστες πρακτικές ασφάλειας IT για τον διακομιστή σας

Πέρα από την ενσωματωμένη ασφάλεια του TeslaView, ο διακομιστής σας χρειάζεται επίσης προστασία.

### 🔒 Σκλήρυνση SSH

**Απενεργοποίηση authentication με κωδικό πρόσβασης — χρήση μόνο κλειδιών:**

```bash
# Generate a key pair on your LOCAL computer:
ssh-keygen -t ed25519 -C "tesla-server"

# Copy public key to server:
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR-SERVER-IP

# On the server, disable password auth:
nano /etc/ssh/sshd_config
```
Αλλάξτε αυτές τις γραμμές:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> ⚠️ Δοκιμάστε ότι η σύνδεση με κλειδί λειτουργεί **πριν** κλείσετε την τρέχουσα συνεδρία SSH.

**Αλλαγή της προεπιλεγμένης θύρας SSH (προαιρετικό, μειώνει τον θόρυβο στα logs):**
```bash
# In /etc/ssh/sshd_config:
Port 2222    # Any non-standard port

# Update firewall:
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Firewall (UFW)

Το script εγκατάστασης διαμορφώνει αυτόματα το UFW. Επαληθεύστε ότι είναι σωστό:

```bash
ufw status verbose
```

Θα πρέπει να δείξει:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (or your SSH port)  ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Μπλοκάρετε όλα τα άλλα — καμία άλλη θύρα δεν θα πρέπει να εκτίθεται δημόσια.

### 🛡️ Fail2ban (προστασία από brute-force)

Το Fail2ban μπλοκάρει αυτόματα IPs που αποτυγχάνουν επανειλημμένα σε συνδέσεις SSH ή web. Το script εγκατάστασης το εγκαθιστά και διαμορφώνει.

Ελέγξτε την κατάσταση:
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

Ξεμπλοκάρετε μια IP (αν αποκλείσατε τον εαυτό σας):
```bash
fail2ban-client set sshd unbanip YOUR-IP
```

### 🔄 Κρατήστε τα πάντα ενημερωμένα

**Αυτόματες ενημερώσεις για το λειτουργικό:**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Select yes
```

**Αυτόματες ενημερώσεις για το TeslaView:**
```env
# In /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

Οι ενημερώσεις τρέχουν νυχτερινά στις 03:30 (Europe/Berlin) εάν είναι ενεργοποιημένες.

**Ενημερώσεις Docker image:**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS & ανανέωση πιστοποιητικού

Τα πιστοποιητικά Let's Encrypt λήγουν κάθε 90 ημέρες και ανανεώνονται αυτόματα μέσω εργασίας cron (που έχει ρυθμιστεί από το script εγκατάστασης).

Ελέγξτε την κατάσταση πιστοποιητικού:
```bash
certbot certificates
```

Δοκιμάστε ανανέωση (dry run, χωρίς αλλαγές):
```bash
certbot renew --dry-run
```

Εξαναγκάστε ανανέωση εάν χρειάζεται:
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 Προστατέψτε το αρχείο `.env` σας

Το αρχείο `.env` σας περιέχει Tesla Client ID, Client Secret και μυστικό JWT. Δεν πρέπει ποτέ να:
- Γίνει commit στο git (είναι στο `.gitignore` — μην το αντικαταστήσετε)
- Γίνει δημόσια προσβάσιμο
- Μοιραστεί σε screenshots ή αιτήματα υποστήριξης

```bash
# Check permissions — should be 600 (owner read/write only):
ls -la /opt/tesla-carview/backend/.env

# Fix if wrong:
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Audit log

Το TeslaView καταγράφει όλες τις ευαίσθητες ενέργειες:
- Προσπάθειες σύνδεσης (επιτυχία και αποτυχία)
- Κλειδώματα λογαριασμού
- Αλλαγές κωδικού πρόσβασης
- Εκτελέσεις εντολών οχήματος
- Διαγραφές δεδομένων
- Ενέργειες διαχειριστή

Δείτε στο: **Admin → Audit Log**

Εξαγωγή για ανάλυση: **Admin → Audit Log → Export CSV**

---

## Κεφαλίδες ασφαλείας

Η διαμόρφωση nginx του TeslaView περιλαμβάνει σύγχρονες κεφαλίδες ασφαλείας:
- `Content-Security-Policy` (CSP) — αποτρέπει XSS
- `Strict-Transport-Security` (HSTS) — εξαναγκάζει HTTPS
- `X-Frame-Options: DENY` — αποτρέπει clickjacking
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — περιορίζει λειτουργίες περιηγητή

Ελέγξτε τις κεφαλίδες σας: [securityheaders.com](https://securityheaders.com)

---

## Αναφορά ευπάθειας ασφαλείας

Βρήκατε ένα ζήτημα ασφαλείας; Παρακαλώ αναφέρετέ το υπεύθυνα:
- **Μην** ανοίξετε δημόσιο GitHub issue
- Email: δείτε το [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) στο repository
- Στόχος μας είναι να απαντήσουμε εντός 48 ωρών

---

## Λίστα ελέγχου ασφαλείας για νέες εγκαταστάσεις

- [ ] Authentication με κλειδιά SSH ενεργοποιημένο, authentication με κωδικό πρόσβασης απενεργοποιημένο
- [ ] Firewall ενεργό (UFW), μόνο οι θύρες 22/80/443 ανοιχτές
- [ ] Fail2ban σε λειτουργία
- [ ] Ισχυρός κωδικός πρόσβασης διαχειριστή (16+ χαρακτήρες ή passphrase)
- [ ] MFA ενεργοποιημένο για τον λογαριασμό διαχειριστή
- [ ] Δικαιώματα αρχείου `.env` ρυθμισμένα σε 600
- [ ] Αυτόματες ενημερώσεις ενεργοποιημένες (OS + TeslaView)
- [ ] Τακτικά backups διαμορφωμένα (δείτε [Backup & Restore](EL-Backup-and-Restore))
- [ ] Audit log ελεγχόμενο περιοδικά

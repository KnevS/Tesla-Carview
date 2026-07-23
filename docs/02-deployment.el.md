# Deployment — Διακομιστής Linux & Raspberry Pi

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md)

Το Tesla Carview τρέχει σε **όλες τις συνηθισμένες πλατφόρμες Linux**:

| Πλατφόρμα | Αρχιτεκτονική | Δοκιμασμένο |
|---|---|---|
| Διακομιστής Linux (VPS, dedicated) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (και παλαιότερα) | ARMv7 | ✗ ¹ |
| Τοπική ανάπτυξη (Mac/Windows/Linux) | όλα | ✓ |

¹ **Το Raspberry Pi 3 και παλαιότερα (32-bit ARM) δεν υποστηρίζονται πλέον από την v3.51.0.** Η Node.js δεν δημοσιεύει εικόνες ARMv7 από την έκδοση 24 και μετά — ούτε alpine ούτε Debian —, οπότε η εικόνα του backend δεν μπορεί πλέον να χτιστεί εκεί. Το `deploy/setup.sh` σταματά σε τέτοια συστήματα με σχετική εξήγηση, αντί να αποτύχει αργότερα στο κατέβασμα της εικόνας.


---

## Προαπαιτούμενα

- Debian/Ubuntu (ή Raspberry Pi OS)
- Πρόσβαση root
- Προαιρετικά: ίδιον domain με A record που δείχνει στην IP του διακομιστή (για HTTPS)
- Λογαριασμός Tesla Developer ([04-tesla-api.en.md](./04-tesla-api.en.md))

> **Χρησιμοποιείτε Raspberry Pi;** Διαβάστε πρώτα το [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) — οι κάρτες SD αστοχούν υπό συνεχές φορτίο εγγραφής. Η ρύθμιση ενός USB SSD ή NVMe παίρνει 20 λεπτά και γλιτώνει πολλούς πονοκεφάλους αργότερα.
>
> **Δεν έχετε στατική IP;** Το [14-network-access.en.md](14-network-access.en.md) εξηγεί DynDNS, Cloudflare Tunnel και επιλογές VPS βήμα-βήμα.
>
> **Συνιστώμενο VPS αρχικού επιπέδου:** Το [netcup VPS nano G11s](https://www.netcup.com/en/server/vps-lite) (2 vCore, 2 GB RAM, 60 GB SSD, ~3,08€/μήνα) είναι το πιο φθηνό δοκιμασμένο VPS που πληροί όλες τις απαιτήσεις του Tesla Carview — συμπεριλαμβανομένου επαρκούς αποθηκευτικού χώρου για δεδομένα τηλεμετρίας πολλών ετών. Κωδικός έκπτωσης διαθέσιμος κατόπιν αιτήματος: [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com).

---

## 📦 Αυτόματη εγκατάσταση (για όλους)

```bash
# Ως root στο μηχάνημα-στόχο:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Ή χειροκίνητα:
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

Το script ανιχνεύει αυτόματα την αρχιτεκτονική και αναλαμβάνει:
1. Εγκατάσταση πακέτων συστήματος (nginx, certbot, docker, ufw, fail2ban)
2. Διαμόρφωση firewall (SSH, HTTP, HTTPS)
3. fail2ban για προστασία SSH
4. Εκκίνηση του βοηθού διαμόρφωσης
5. Let's Encrypt SSL (εάν δοθεί domain HTTPS)
6. nginx με σκλήρυνση TLS
7. Εκκίνηση Docker containers (multi-arch)

---

## Εκτέλεση του βοηθού διαμόρφωσης

```bash
bash /opt/tesla-carview/deploy/setup-wizard.sh
```

Ο wizard ρωτά διαδραστικά:
- Δημόσιο URL (π.χ. `https://tesla.example.com` ή `http://192.168.1.100:8080`)
- Tesla API Client-ID και Client-Secret
- Διαδρομή βάσης δεδομένων
- Διεύθυνση e-mail για πιστοποιητικά SSL
- Web Push VAPID keys (προαιρετικό)

---

## Raspberry Pi — ιδιαιτερότητες

```bash
# προετοιμασία Raspberry Pi OS (αν χρειάζεται):
sudo apt-get update && sudo apt-get upgrade -y

# εγκατάσταση Docker για ARM (γίνεται αυτόματα από το setup.sh):
curl -fsSL https://get.docker.com | sh
```

Σε ένα Raspberry Pi μέσα σε οικιακό δίκτυο, δεν χρειάζεται nginx/SSL — το container της εφαρμογής είναι προσβάσιμο απευθείας στη θύρα 8080.
Ορίστε `FRONTEND_URL=http://192.168.1.100:8080` στο `.env`.

---

## Διαμόρφωση Tesla API

```bash
nano /opt/tesla-carview/backend/.env
```

Υποχρεωτικά πεδία:
```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your.domain.com/api/auth/callback
```

Επανεκκίνηση των containers:
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

---

## Αρχική διαμόρφωση (web wizard)

Στην πρώτη εκκίνηση η εφαρμογή ανοίγει αυτόματα το **/setup** στον browser.
Εκεί δημιουργείται ο πρώτος λογαριασμός διαχειριστή.

---

## Εφαρμογή ενημερώσεων

```bash
bash /opt/tesla-carview/deploy/update.sh
```

---

## Αυτόματο deployment

Υπάρχουν δύο διαδρομές για αυτόματο deployment σε κάθε push στο `main`:

| Μέθοδος | Ιδανικό για | Οδηγός |
|---|---|---|
| **GitHub Actions + SSH** | Μία εφαρμογή, υπάρχων διακομιστής, πλήρης έλεγχος | Δείτε παρακάτω |
| **Dokploy** | Πολλαπλές εφαρμογές, επιθυμητό web UI, ευκολότερο SSL | [08-dokploy.en.md](./08-dokploy.en.md) |

---

## Auto-deploy μέσω GitHub Actions

Αυτόματο deployment σε κάθε push στο `main`.

### Προαπαιτούμενο: δημιουργία SSH deploy key

```bash
# στον διακομιστή:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""

# εξουσιοδότηση του δημόσιου κλειδιού για τον χρήστη SSH:
cat ~/.ssh/tesla_deploy.pub >> /home/YOUR_USER/.ssh/authorized_keys
```

> **Σημείωση**: ο deploy user χρειάζεται passwordless sudo για `docker` και `git`:
> ```bash
> echo 'YOUR_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/git' \
>   > /etc/sudoers.d/tesla-deploy
> ```

### Ορισμός GitHub secrets

GitHub → repository → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Περιγραφή | Παράδειγμα |
|---|---|---|
| `DEPLOY_HOST` | Hostname ή IP διακομιστή | `123.456.789.0` |
| `DEPLOY_USER` | Όνομα χρήστη SSH | `deploy` |
| `DEPLOY_SSH_KEY` | Περιεχόμενο του `~/.ssh/tesla_deploy` (private key) | `-----BEGIN OPENSSH…` |
| `DEPLOY_APP_DIR` | Διαδρομή εγκατάστασης στον διακομιστή | `/opt/tesla-carview` |


---

## Backup βάσης δεδομένων

```bash
# δημιουργία backup:
cp /opt/tesla-carview/data/master.db /opt/backups/master-$(date +%Y%m%d-%H%M).db
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/

# αυτόματο καθημερινά στις 3 το πρωί (crontab -e ως root):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

> **Σημείωση:** Το Tesla Carview χρησιμοποιεί bind-mount (`./data:/app/data`), όχι named Docker volume. Όλα τα αρχεία της βάσης βρίσκονται απευθείας κάτω από το `/opt/tesla-carview/data/` στον host. Εναλλακτικά, το ενσωματωμένο auto-backup μπορεί να διαμορφωθεί στις ρυθμίσεις συστήματος της εφαρμογής (τοπικό, διαδρομή, S3 ή SFTP).

---

## Έλεγχος υγείας μετά την εγκατάσταση

Μετά την αρχική εγκατάσταση (και ανά πάσα στιγμή στη συνέχεια) μπορείτε να εκτελέσετε τον ενσωματωμένο έλεγχο υγιεινής:

```bash
bash /opt/tesla-carview/scripts/hygiene-check.sh
```

Το script ελέγχει 7 περιοχές και εκτυπώνει χρωματιστή σύνοψη:

| # | Έλεγχος | Auto-fix |
|---|---|---|
| 1 | Περιβάλλον συστήματος — έκδοση Docker, Node.js ≥ 20, χρήση δίσκου | — |
| 2 | Ασφάλεια εξαρτήσεων — `npm audit` για frontend + backend | `--fix` τρέχει `npm audit fix` |
| 3 | Μέγεθος bundle — main JS chunk έναντι ορίων (προειδοποίηση > 1.2 MB, αποτυχία > 1.5 MB) | — |
| 4 | Πληρότητα `.env` — παρόντα όλα τα υποχρεωτικά keys; | — |
| 5 | Υγεία Docker — unhealthy/exited containers, dangling images + volumes | `--fix` εκτελεί prune images |
| 6 | Ακεραιότητα βάσης — SQLite `PRAGMA integrity_check` ανά tenant | — |
| 7 | Πιστοποιητικό SSL — ημέρες έως τη λήξη για το διαμορφωμένο domain | — |

```bash
# Λειτουργία CI (χωρίς χρώματα, exit 1 σε αποτυχίες — χρησιμοποιείται από setup.sh και GitHub Actions):
bash scripts/hygiene-check.sh --ci

# Λειτουργία auto-fix (τρέχει npm audit fix, καθαρίζει Docker images):
bash scripts/hygiene-check.sh --fix
```

Η εργασία νυχτερινής συντήρησης (`backend/src/services/nightlyMaintenance.js`) εκτελεί ένα υποσύνολο αυτών των ελέγχων αυτόματα κάθε βράδυ στις 03:30 Europe/Berlin και γράφει τα αποτελέσματα στο admin health log (`Admin → System → Maintenance`).

---

## Προβολή logs

```bash
# logs backend:
docker compose -f docker-compose.prod.yml logs -f backend

# logs nginx:
tail -f /var/log/nginx/tesla-carview.access.log
```

# Deployment — Διακομιστής Linux & Raspberry Pi

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md)

Το Tesla Carview τρέχει σε **όλες τις συνηθισμένες πλατφόρμες**:

| Πλατφόρμα | Αρχιτεκτονική | Δοκιμασμένο |
|---|---|---|
| Διακομιστής Linux (VPS, dedicated) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (και παλαιότερα) | ARMv7 | ✗ ¹ |
| Windows (Docker Desktop + WSL2) | x86_64 | ✓ ² |
| Τοπική ανάπτυξη (Mac/Windows/Linux) | όλα | ✓ |

¹ **Το Raspberry Pi 3 και παλαιότερα (32-bit ARM) δεν υποστηρίζονται πλέον από την v3.51.0.** Η Node.js δεν δημοσιεύει εικόνες ARMv7 από την έκδοση 24 και μετά — ούτε alpine ούτε Debian —, οπότε η εικόνα του backend δεν μπορεί πλέον να χτιστεί εκεί. Το `deploy/setup.sh` σταματά σε τέτοια συστήματα με σχετική εξήγηση, αντί να αποτύχει αργότερα στο κατέβασμα της εικόνας.

² **Τα Windows δουλεύουν, αλλά δεν ελέγχονται από CI.** Η εφαρμογή ζει εξ ολοκλήρου σε Linux containers· τα Windows είναι μόνο ο host. Λεπτομέρειες και οι δύο περιορισμοί: ενότητα «Windows (Docker Desktop)» στο τέλος αυτής της σελίδας.


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

---

## Λειτουργία πίσω από δικό σας reverse proxy

Αν εγκαταστήσετε το `setup.sh` σε **λειτουργία proxy** (υπάρχει ήδη nginx, Caddy ή Traefik), δεν δημιουργείται καμία ρύθμιση nginx και πρέπει να στήσετε μόνοι σας τα όρια ρυθμού. Αν λείπουν ή είναι πολύ αυστηρά, η εφαρμογή πέφτει σε HTTP 429 και δείχνει χαλασμένη: μισοφορτωμένες σελίδες που φαινομενικά τις διορθώνει μόνο μια ανανέωση.

| Διαδρομή | Σύσταση | Γιατί |
|---|---|---|
| `/api/auth/login` | 10/λεπτό, burst 3 | Προστασία από brute force |
| `/api/tiles/` | 1200/λεπτό, burst 300 | Ένα zoom στον χάρτη φορτώνει 50–150 πλακίδια μαζί |
| `/api/` (υπόλοιπα) | 120/λεπτό, **burst ≥ 60** | Μια αλλαγή σελίδας στέλνει 15–26 αιτήματα |

Η πιο ειδική διαδρομή πρέπει να υπερισχύει: αν το `/api/tiles/` πέσει στο γενικό όριο του API, ένα μόνο zoom στον χάρτη κλειδώνει ολόκληρο το API. Το κρίσιμο μέγεθος δεν είναι ο σταθερός ρυθμός αλλά το burst.

Έτοιμα πρότυπα υπάρχουν στο αποθετήριο: [`deploy/nginx-host.conf.template`](../deploy/nginx-host.conf.template) και [`deploy/traefik-dynamic.example.yml`](../deploy/traefik-dynamic.example.yml).

Από πού προήλθε ένα 429 το δείχνει η ίδια η απόκριση:

- Κεφαλίδα `x-retry-in` → **Traefik**
- Σελίδα σφάλματος HTML χωρίς πρόσθετες κεφαλίδες → **nginx** (`limit_req`)
- `ratelimit-limit` / `ratelimit-remaining` → **η εφαρμογή** (express-rate-limit)

---

## Windows (Docker Desktop)

Η εφαρμογή τρέχει εξ ολοκλήρου σε Linux containers — τα Windows είναι μόνο ο host. Με **Docker Desktop σε λειτουργία WSL2** ξεκινά η ίδια στοίβα όπως σε έναν Linux server. Το `setup.sh` δεν λειτουργεί εκεί (bash, apt, systemd, certbot)· τη θέση του παίρνει το `deploy/setup-windows.ps1`.

```powershell
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
powershell -ExecutionPolicy Bypass -File .\deploy\setup-windows.ps1
```

Το script δημιουργεί το `backend\.env` με τυχαίο `JWT_SECRET`, γράφει ένα `docker-compose.override.yml` για Windows και ξεκινά τη στοίβα. Έπειτα ανοίξτε `http://localhost:8080`.

### Δύο περιορισμοί — και οι δύο μετρημένοι, κανένας παρακάμψιμος

1. **Καμία εντολή προς το όχημα.** Οι υπογεγραμμένες εντολές περνούν από τον `tesla-http-proxy`, που χρειάζεται το bind mount `/etc/tesla-proxy` και το σταθερό UID 988 — τίποτα από τα δύο δεν υπάρχει στα Windows. Η υπηρεσία μένει έτσι εκτός· το backend ξεκινά ούτως ή άλλως, επειδή το `depends_on` του είναι σε `required: false`. Όλα τα αναγνωστικά — διαδρομές, φορτίσεις, αναλύσεις, ημερολόγιο, σχεδιαστής διαδρομής — λειτουργούν πλήρως.
2. **Το `host.docker.internal` δείχνει αλλού.** Το Docker Desktop γράφει αυτό το όνομα μόνο του στο `/etc/hosts` κάθε container, και η εγγραφή αυτή υπερισχύει του network alias από το compose. Μετρήθηκε: το όνομα τότε αναλύεται στο host gateway (172.17.0.1) αντί για το container του proxy — οι εντολές πήγαιναν σιωπηλά σε λάθος προορισμό. Όποιος τρέχει παρ' όλα αυτά τον proxy, βάζει στο `backend\.env` το `TESLA_PROXY_BASE=https://tesla-carview-proxy:4443`.

### Μην μπερδεύετε τα δύο αρχεία `.env`

Η εφαρμογή διαβάζει το `backend\.env` (δίνεται στο container ως `env_file`). Το ίδιο το Compose διαβάζει ένα `.env` στη **ρίζα του project** και με αυτό αντικαθιστά τα `${...}` στα αρχεία compose (`TESLA_PROXY_CONFIG_DIR`, `TESLA_PROXY_UID`, `OLLAMA_MEMORY_LIMIT`). Μετρήθηκε, γιατί το αντίθετο μοιάζει φυσικό: μια εγγραφή στο `backend/.env` **δεν** επηρεάζει αυτήν την αντικατάσταση. Πρότυπο: `.env.example` στη ρίζα του project.

### Το HTTPS δεν αφορά ειδικά τα Windows

Η Tesla απαιτεί δημόσια προσβάσιμη διεύθυνση HTTPS — για τη σύνδεση, την εγγραφή συνεργάτη και το Fleet Telemetry. Αυτό ισχύει το ίδιο για κάθε οικιακή εγκατάσταση, ανεξαρτήτως λειτουργικού. Οι τρόποι (DynDNS, Cloudflare Tunnel, VPS) βρίσκονται στο [14-network-access.el.md](14-network-access.el.md).

### Ενημερώσεις

Το `deploy/update.sh` είναι bash script και δεν τρέχει στα Windows. Αντ' αυτού:

```powershell
git pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
```

### Τι σημαίνει «δεν ελέγχεται από CI»

Το Docker build gate χτίζει Linux images για amd64 και arm64· κανένας Windows host δεν ελέγχεται αυτόματα πουθενά. Η διαδρομή είναι τεκμηριωμένη και οι παγίδες παραπάνω μετρήθηκαν σε πραγματικό Docker daemon — αλλά επαληθεύεται συνεχώς μόνο από όσους την ακολουθούν.

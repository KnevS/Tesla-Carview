# Deployment με Dokploy

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](08-dokploy.md)

Το [Dokploy](https://dokploy.com) είναι μια αυτο-φιλοξενούμενη open-source πλατφόρμα PaaS
(συγκρίσιμη με Coolify ή Railway). Διαχειρίζεται routing, SSL (μέσω Let's Encrypt + Traefik),
logs και GitHub webhooks για αυτόματο deployment — χωρίς το overhead ενός πλήρους
CI/CD pipeline.

**Πότε έχει νόημα:**
- Θέλετε web UI αντί για εντολές SSH για τη διαχείριση deployments
- Πολλαπλές εφαρμογές τρέχουν στον ίδιο διακομιστή
- Δεν θέλετε ξεχωριστό workflow GitHub Actions

---

## 1. Εγκατάσταση Dokploy στον διακομιστή

```bash
# ως root σε καινούργιο VPS (Debian/Ubuntu συνιστάται):
curl -sSL https://dokploy.com/install.sh | sh
```

Στη συνέχεια το Dokploy εκκινεί στη θύρα **3000**. Ανοίξτε το `http://YOUR-SERVER-IP:3000` στον browser
και δημιουργήστε τον λογαριασμό admin.

> Σημείωση firewall: η θύρα 3000 πρέπει να είναι προσωρινά προσβάσιμη. Μετά τη σύνδεση, το Dokploy
> μπορεί να ρυθμίσει το δικό του domain + SSL για το dashboard. Μετά από αυτό μπορείτε να κλείσετε ξανά τη θύρα 3000.

---

## 2. Προσθήκη του Tesla Carview ως app

Στο Dokploy dashboard:

1. **Projects** → **Create Project** (π.χ. `tesla-carview`)
2. Μέσα στο project: **Create Service** → **Application**
3. Όνομα: `tesla-carview`
4. Τύπος build: **Docker Compose**
5. Αρχείο compose: `docker-compose.prod.yml`

---

## 3. Σύνδεση του GitHub repository

### Επιλογή A — GitHub App (συνιστάται)

1. Dokploy dashboard → **Settings** → **Git Providers** → **GitHub App** → **Install**
2. Παραχωρήστε δικαίωμα για το `Tesla-Carview` repository
3. Στο config της εφαρμογής: **Source** → επιλέξτε repository, branch: `main`

### Επιλογή B — δημόσιο repository (χωρίς auth)

Απλά εισάγετε το HTTPS URL κάτω από **Source**:
```
https://github.com/YOUR-GITHUB-USER/Tesla-Carview.git
```
Branch: `main`

---

## 4. Ορισμός μεταβλητών περιβάλλοντος

Στην καρτέλα **Environment** της εφαρμογής, εισάγετε όλες τις μεταβλητές από το αρχείο `.env`.
Ελάχιστα υποχρεωτικά πεδία:

| Μεταβλητή | Περιγραφή |
|---|---|
| `JWT_SECRET` | Μακρά τυχαία τιμή (`openssl rand -hex 64`) |
| `TESLA_CLIENT_ID` | Client ID της εφαρμογής Tesla Developer |
| `TESLA_CLIENT_SECRET` | Secret της εφαρμογής Tesla Developer |
| `TESLA_REDIRECT_URI` | `https://your.domain.com/api/auth/callback` |
| `FRONTEND_URL` | `https://your.domain.com` |
| `NODE_ENV` | `production` |

> Όλες οι υπόλοιπες μεταβλητές από το `backend/.env.example` μπορούν να προστεθούν κατά περίπτωση.

---

## 5. Διαμόρφωση domain & SSL

Στην καρτέλα **Domains**:

1. **Add Domain** → `your.domain.com`
2. Πάροχος SSL: **Let's Encrypt** (αυτόματα μέσω Traefik)
3. Θύρα προορισμού: **80** (το nginx frontend container χειρίζεται το εσωτερικό routing)

Το A record του domain πρέπει να δείχνει στην IP του διακομιστή.

---

## 6. Μόνιμα δεδομένα (bind-mount)

Το Tesla Carview χρησιμοποιεί **bind-mount** (`./data:/app/data`), όχι named Docker volume.
Όλα τα αρχεία της βάσης (`master.db`, `tenants/*.db`) βρίσκονται απευθείας στον υποκατάλογο `data/`
του καταλόγου της εφαρμογής στον host — από προεπιλογή `/opt/tesla-carview/data/`.

Ένα απλό `cp` αρκεί για backups:

```bash
# χειροκίνητο backup:
cp /opt/tesla-carview/data/master.db /opt/backups/
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

Το ενσωματωμένο auto-backup (System Settings → Automatic Backup) μπορεί εναλλακτικά να στείλει backups
στο S3 ή μέσω SFTP — δεν χρειάζεται cron job στον host.

---

## 7. Έναυσμα του πρώτου deployment

Στην καρτέλα της εφαρμογής, πάνω δεξιά: **Deploy** → το Dokploy φέρνει τον κώδικα από το GitHub,
χτίζει τα Docker images και εκκινεί τα containers.

Logs κατά τη διάρκεια του build:
- Καρτέλα **Deployments** → κλικ στο τρέχον deployment → log σε πραγματικό χρόνο

---

## 8. Αυτόματο deployment σε push στο GitHub

### Προαπαιτούμενο: ενσωμάτωση GitHub App (βήμα 3A)

Με την ενσωμάτωση GitHub App το Dokploy καταχωρεί webhook αυτόματα.
Κάθε push στο `main` ενεργοποιεί ένα νέο deployment — χωρίς περαιτέρω διαμόρφωση.

### Χειροκίνητο webhook (επιλογή B / χωρίς GitHub App)

1. Dokploy → app → καρτέλα **General** → αντιγράψτε το **Webhook URL**
   (μορφή: `https://dokploy.your.domain.com/api/deploy/XXXXX`)
2. GitHub → repository → Settings → Webhooks → **Add webhook**
   - Payload URL: το αντιγραμμένο webhook URL
   - Content type: `application/json`
   - Secret: αφήστε κενό (ή ορίστε στο Dokploy)
   - Trigger: **Just the push event**

Από τώρα και στο εξής: push στο `main` → το Dokploy χτίζει και κάνει deploy αυτόματα.

---

## 9. Logs & παρακολούθηση

```
Dokploy dashboard → App → Logs
```

Ή απευθείας μέσω Docker στον διακομιστή:

```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs -f backend
```

---

## Σύγκριση: Dokploy vs. GitHub Actions SSH

| Κριτήριο | GitHub Actions + SSH | Dokploy |
|---|---|---|
| Web UI για logs/κατάσταση | ✗ (μόνο GitHub UI) | ✓ |
| Αυτοματοποίηση SSL | Χειροκίνητα (Certbot) | ✓ (Traefik) |
| Πολλαπλές εφαρμογές σε έναν διακομιστή | Πολύπλοκο | ✓ |
| Προσαρμοσμένη λογική CI/CD | ✓ (ευέλικτο) | ✗ (μόνο build + start) |
| Κόστος πόρων (Dokploy ίδιο) | κανένα | ~200 MB RAM |
| Εξάρτηση GitHub | ✓ (Actions) | Προαιρετικό (αρκεί webhook) |

---

## Περαιτέρω διάβασμα

- [Τεκμηρίωση Dokploy](https://docs.dokploy.com)
- [Tesla Carview — GitHub Actions SSH deploy](./02-deployment.en.md#github-actions-auto-deploy)
- [Διαμόρφωση του Tesla API](./04-tesla-api.en.md)

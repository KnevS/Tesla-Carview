# 🔧 Διαμόρφωση

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](10-configuration.md) · 👤 [Εγχειρίδιο χρήστη](../frontend/src/handbook/handbook.en.md) · 🏠 [Ευρετήριο docs](.)

Κάθε μεταβλητή περιβάλλοντος που ελέγχει το Tesla Carview. Οι περισσότερες ζουν στο `backend/.env` (δείτε το `backend/.env.example` ως πρότυπο). Καταχωρήσεις σημειωμένες ως **(required)** πρέπει να οριστούν· όλα τα υπόλοιπα έχουν λογική προεπιλογή.

---

## 🔐 Υποχρεωτικές

| Μεταβλητή | Περιγραφή | Παράδειγμα |
|---|---|---|
| `JWT_SECRET` | Μυστικό κλειδί για JSON Web Tokens. **≥ 32 χαρακτήρες, κρυπτογραφικά τυχαίο.** | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client ID από το [Tesla Developer Portal](https://developer.tesla.com) | `abc123…` |
| `TESLA_CLIENT_SECRET` | Client secret από το Tesla Developer Portal | `secret…` |
| `FRONTEND_URL` | Δημόσιο HTTPS URL της εφαρμογής — χρησιμοποιείται για το OAuth callback και την καταχώριση passkey | `https://carview.example.com` |
| `RP_NAME` | Όνομα εμφάνισης στους διαλόγους passkey | `Tesla Carview` |
| `RP_ID` | Domain για WebAuthn (χωρίς πρωτόκολλο, **πρέπει να ταιριάζει** με το `FRONTEND_URL`) | `carview.example.com` |

> ⚠️ Το `JWT_SECRET` **δεν πρέπει να αλλάζει** κατά την εκτέλεση αλλιώς όλες οι sessions ακυρώνονται. Η αλλαγή του `RP_ID` ακυρώνει κάθε υπάρχον passkey — οι χρήστες πρέπει να καταχωρηθούν ξανά.

---

## ⚡ Tesla Fleet API

| Μεταβλητή | Default | Περιγραφή |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | OAuth redirect URI. Πρέπει να εισαχθεί ακριβώς στο Tesla Developer Portal. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Endpoint Tesla API ανά περιοχή (NA: `…na.vn.cloud.tesla.com`). |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | Διεύθυνση του `tesla-http-proxy` για υπογεγραμμένες εντολές οχήματος. |

Λεπτομερή βήματα ρύθμισης: [04-tesla-api.en.md](04-tesla-api.en.md) (developer account, καταχώριση εφαρμογής, scopes) και [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) (κόστος / ποσοστώσεις).

---

## 🔔 Web Push (ειδοποιήσεις)

Τα κλειδιά VAPID απαιτούνται για ειδοποιήσεις push "η φόρτιση ολοκληρώθηκε" και υπενθυμίσεων συντήρησης. Χωρίς αυτά οι ειδοποιήσεις push δεν λειτουργούν — όλα τα υπόλοιπα συνεχίζουν να δουλεύουν.

| Μεταβλητή | Default | Περιγραφή |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Public key, δημιουργήστε μέσω `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Private key (ίδιος γεννήτορας) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | URI επικοινωνίας για την υπηρεσία push (ιδανικά το δικό σας email) |

---

## 🧪 Demo sandbox

| Μεταβλητή | Default | Περιγραφή |
|---|---|---|
| `DEMO_ENABLED` | `false` | Όταν `true`: δημιουργείται ξεχωριστός demo tenant με slug `demo` κατά την εκκίνηση. Η σελίδα σύνδεσης δείχνει κουμπί "🚀 Demo starten". Σκληρά όρια: 1 εγγραφή ανά IP ανά 24 ώρες, μέγ. 10 ταυτόχρονοι testers, κάθε λογαριασμός ζει 14 ημέρες. |

Λεπτομέρειες λειτουργίας + ασφαλείας: [11-operations.en.md → Demo mode](11-operations.en.md#demo-mode). Οι testers βλέπουν αυτόματα μια προσθήκη στις σελίδες ιδιωτικότητας / όρων που τεκμηριώνει την άνευ όρων διαγραφή μετά από 14 ημέρες.

---

## ⬆️ Auto-update

| Μεταβλητή | Default | Περιγραφή |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Όταν `true`: νυχτερινό cron περίπου στις 03:30 Europe/Berlin εκτελεί `git fetch origin main` και σε νέο commit εκτελεί το `deploy/update.sh`. Προκαλεί σύντομη επανεκκίνηση container — το maintenance overlay το καλύπτει στο UI. |
| `UPDATE_REPO_DIR` | `/opt/tesla-carview` | Διαδρομή προς το git working tree πάνω στο οποίο λειτουργεί ο auto-updater. |

Συνιστάται: εκτελέστε χειροκίνητα το `deploy/update.sh` μερικές φορές, εξοικειωθείτε και μετά ενεργοποιήστε.

---

## ⚙️ Λειτουργία & επιδόσεις

| Μεταβλητή | Default | Περιγραφή |
|---|---|---|
| `PORT` | `3000` | TCP θύρα του backend HTTP server (εντός του container). |
| `DB_PATH` | `/app/data/tesla-carview.db` | Διαδρομή προς την παλιά βάση — μεταβαίνει ως ο `default` tenant στην πρώτη εκκίνηση, μετά αχρησιμοποίητη. |
| `ENABLE_POLLER` | `true` | Όταν `false`: χωρίς κυκλικό polling Tesla API (π.χ. για αφιερωμένα read replicas). |
| `TESLA_DAILY_CAP` | `30` | Μέγιστες κλήσεις `vehicle_data` ανά όχημα ανά ημέρα. DB-persistent — επιβιώνει επανεκκινήσεων container. |
| `TESLA_MONTHLY_CAP` | `400` | Μέγιστες κλήσεις `vehicle_data` ανά όχημα ανά μήνα. Το polling σταματά αυτόματα όταν φτάσει το όριο. |
| `NODE_ENV` | `production` | Τυπική ρύθμιση production. Το `development` ενεργοποιεί συμπεριφορά dev-server. |

---

## 🌐 Frontend (`frontend/.env`)

Ενσωματώνεται στο bundle σε **build time**. Η αλλαγή τιμών απαιτεί rebuild.

| Μεταβλητή | Default | Περιγραφή |
|---|---|---|
| `VITE_FOOTER_EMAIL` | `''` | Email επικοινωνίας στο footer. Κενό = το block κρύβεται. |
| `VITE_FOOTER_ABOUT_DE` | `''` | URL της σελίδας "about me" (γερμανική παραλλαγή). |
| `VITE_FOOTER_ABOUT_EN` | `''` | URL της σελίδας "about me" (αγγλική παραλλαγή). |
| `VITE_FOOTER_LINKEDIN_URL` | `''` | LinkedIn προφίλ του διαχειριστή. |

Το αρχείο είναι `.gitignored`. Το `frontend/.env.example` είναι το πρότυπο που υπάρχει στο repo.

---

## 🖥️ Διαμόρφωση μέσω Admin UI (από v3.4.0)

Από την v3.4.0 τα περισσότερα secrets δεν χρειάζονται πια να προστεθούν χειροκίνητα στο `.env`. Το **Admin Setup Assistant** (Admin Hub → 🛠️) σας καθοδηγεί σε κάθε βήμα.

**Τεχνικό υπόβαθρο — DB-before-env pattern:**
Το `configService.js` διαβάζει κάθε τιμή πρώτα από το `tenant_settings` (η SQLite DB του tenant), στη συνέχεια κάνει fallback στο `.env`. Υπάρχουσες διαμορφώσεις `.env` συνεχίζουν να λειτουργούν αμετάβλητες· μόλις μια τιμή οριστεί μέσω του UI, η τιμή της DB έχει προτεραιότητα.

| Ρύθμιση | Διαδρομή UI | Μεταβλητή fallback `.env` |
|---------|---------|--------------------------|
| Tesla Client-ID | Admin Hub → 🛠️ → Tesla credentials | `TESLA_CLIENT_ID` |
| Tesla Client-Secret | Admin Hub → 🛠️ → Tesla credentials | `TESLA_CLIENT_SECRET` |
| Tesla Audience | Admin Hub → 🛠️ → Tesla credentials | `TESLA_AUDIENCE` |
| VAPID Public Key | Admin Hub → 🛠️ → Web Push | `VAPID_PUBLIC_KEY` |
| VAPID Private Key | Admin Hub → 🛠️ → Web Push | `VAPID_PRIVATE_KEY` |
| VAPID Contact | Admin Hub → 🛠️ → Web Push | `VAPID_CONTACT` |
| Telegram Bot Token | Admin Hub → 🛠️ → Telegram | `TELEGRAM_BOT_TOKEN` |
| xAI / Grok API Key | Admin Hub → 🛠️ → External APIs | `XAI_API_KEY` |
| ABRP Global App Key | Admin Hub → 🛠️ → External APIs | `ABRP_API_KEY` |

> **Δημιουργία κλειδιών VAPID:** Κλικ στο "🔑 Generate new" στον Admin Setup Assistant — δεν χρειάζεται `docker exec`.

> **Telegram Bot:** Απαιτεί επανεκκίνηση container αφού οριστεί το token για πρώτη φορά (`docker compose … up -d --build backend`). Ο assistant δείχνει ειδοποίηση.

---

## Γρήγορη αναφορά: ελάχιστη εγκατάσταση

```bash
# backend/.env (υποχρεωτικό)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://carview.example.com
RP_NAME="Tesla Carview"
RP_ID=carview.example.com

# Προαιρετικό αλλά συνιστάται
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public | awk '{print $3}')
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:you@example.com

# Demo μόνο όταν θέλετε να προσκαλέσετε testers
# DEMO_ENABLED=true

# Auto-update μόνο αφού έχετε κατανοήσει τη ροή ενημέρωσης
# AUTO_UPDATE_ENABLED=true
```

Μετά την αποθήκευση: `docker compose -f docker-compose.prod.yml up -d --build backend` — το backend διαβάζει το `.env` κατά την εκκίνηση.

---

## Δείτε επίσης

- [02-deployment.en.md](02-deployment.en.md) — πρώτο deployment + nginx + Let's Encrypt
- [07-setup-wizard.en.md](07-setup-wizard.en.md) — διαδραστικός βοηθός διαμόρφωσης
- [11-operations.en.md](11-operations.en.md) — καθημερινή χρήση: backup, restore, συντήρηση, demo

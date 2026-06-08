# 📚 Tesla Carview — Τεχνική τεκμηρίωση

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](README.md) · 👤 [Εγχειρίδιο χρήστη (EN)](../frontend/src/handbook/handbook.en.md)

Αυτή η τεκμηρίωση απευθύνεται σε **self-hosters, διαχειριστές και προγραμματιστές**. Καλύπτει εγκατάσταση, διαμόρφωση, λειτουργία και αρχιτεκτονική.

> Οι **χρήστες της εφαρμογής** (σύνδεση, ημερολόγιο διαδρομών, χειριστήρια, δικαιώματα, demo, …) θα βρουν τα πάντα στο **ενσωματωμένο εγχειρίδιο** στη διαδρομή `/handbook` ή απευθείας στο [`frontend/src/handbook/handbook.en.md`](../frontend/src/handbook/handbook.en.md). Τα δύο έγγραφα επικαλύπτονται σκόπιμα σε μερικά θέματα, αλλά παραπέμπουν πάντα μεταξύ τους.

---

## Ευρετήριο

### 🚀 Αρχική εγκατάσταση

| Έγγραφο | Θέμα |
|---|---|
| [01-quickstart.en.md](01-quickstart.en.md) | Γρήγορη εκκίνηση: κλωνοποίηση του repo, εκτέλεση backend + frontend τοπικά |
| [02-deployment.en.md](02-deployment.en.md) | Production deployment σε διακομιστή Linux / Raspberry Pi με Docker + nginx + Let's Encrypt |
| [14-network-access.en.md](14-network-access.en.md) | **Πρόσβαση από οπουδήποτε** χωρίς στατική IP — DynDNS, FritzBox, Cloudflare Tunnel, VPS, ίδιον domain |
| [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) | **Αποθηκευτικός χώρος Raspberry Pi** — αντικατάσταση κάρτας SD με USB SSD, NVMe HAT+, εκκίνηση μέσω δικτύου PXE |
| [07-setup-wizard.en.md](07-setup-wizard.en.md) | Διαδραστικός βοηθός διαμόρφωσης (`deploy/setup-wizard.sh`) |
| [08-dokploy.en.md](08-dokploy.en.md) | Εναλλακτικά: deployment μέσω Dokploy |

### ⚙️ Διαμόρφωση

| Έγγραφο | Θέμα |
|---|---|
| [10-configuration.en.md](10-configuration.en.md) | **Κάθε μεταβλητή περιβάλλοντος** — υποχρεωτικές, προαιρετικές, demo, auto-update |
| [04-tesla-api.en.md](04-tesla-api.en.md) | Δημιουργία λογαριασμού Tesla developer, καταχώριση της εφαρμογής, επιλογή scopes |
| [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) | Κόστος, ποσοστώσεις και παρακολούθηση χρήσης Tesla API |

### 🛠 Λειτουργία

| Έγγραφο | Θέμα |
|---|---|
| [11-operations.en.md](11-operations.en.md) | **Backup & επαναφορά**, **νυχτερινή συντήρηση**, **λειτουργία demo**, auto-update, υγεία συστήματος, logs |
| [12-high-availability.en.md](12-high-availability.en.md) | **Αρχιτεκτονική HA** (teaser) — warm standby, active-active, γεω-πλεονασμός, K8s. Παραδίδεται κατά παραγγελία ανά έργο. |

### 🔐 Ασφάλεια

| Έγγραφο | Θέμα |
|---|---|
| [03-authentication.en.md](03-authentication.en.md) | Ροή ταυτοποίησης: JWT, refresh token, MFA, passkeys |
| [05-security-architecture.en.md](05-security-architecture.en.md) | Μοντέλο απειλών και κάθε μέτρο ασφαλείας |
| [06-fail2ban.en.md](06-fail2ban.en.md) | Προστασία από brute-force με fail2ban |

---

## Πού βρίσκεται κάθε πληροφορία;

| Ερώτηση | Απάντηση |
|---|---|
| "Πώς εγκαθιστώ το Tesla Carview στον διακομιστή μου;" | [02-deployment.en.md](02-deployment.en.md) |
| "Ποια μεταβλητή env ελέγχει το Χ;" | [10-configuration.en.md](10-configuration.en.md) |
| "Πώς δημιουργώ ένα backup;" | [11-operations.en.md](11-operations.en.md) |
| "Το Tesla μου δεν εμφανίζεται — τι κάνω τώρα;" | [Εγχειρίδιο χρήστη → Troubleshooting](../frontend/src/handbook/handbook.en.md#-troubleshooting) |
| "Πώς χρησιμοποιώ το ημερολόγιο διαδρομών για την εφορία;" | [Εγχειρίδιο χρήστη → BMF logbook](../frontend/src/handbook/handbook.en.md#-logbook-for-the-tax-office-bmf-compliant-fahrtenbuch-bmf) |
| "Πώς ενεργοποιώ MFA για τον λογαριασμό μου;" | [Εγχειρίδιο χρήστη → Ασφάλεια](../frontend/src/handbook/handbook.en.md#-security) |
| "Γιατί οι νέοι λογαριασμοί απαιτούν MFA;" | [03-authentication.en.md](03-authentication.en.md) (αρχιτεκτονική) και [Εγχειρίδιο χρήστη → Ασφάλεια](../frontend/src/handbook/handbook.en.md#-security) (πλευρά χρήστη) |
| "Πώς λειτουργεί η λειτουργία demo στο παρασκήνιο;" | [11-operations.en.md → Demo mode](11-operations.en.md#-demo-mode) |
| "Τι καταγράφεται στο audit log;" | [05-security-architecture.en.md](05-security-architecture.en.md) και το UI στο `/admin/audit` |

---

## Σχετικό περιεχόμενο εκτός των docs

- **`backend/.env.example`** — σχολιασμένο πρότυπο για τη διαμόρφωση του backend
- **`frontend/.env.example`** — πρότυπο για τα στοιχεία επικοινωνίας στο footer (build-time)
- **`deploy/setup.sh`** — πλήρως αυτοματοποιημένη εγκατάσταση διακομιστή
- **`deploy/setup-wizard.sh`** — διαδραστικός βοηθός
- **`deploy/update.sh`** — ενημέρωση χωρίς διακοπή (zero-downtime)
- **`docker-compose.prod.yml`** — production stack με backend + frontend + nginx

# 🛠 Λειτουργία

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](11-operations.md) · 👤 [Εγχειρίδιο χρήστη](../frontend/src/handbook/handbook.en.md) · 🏠 [Ευρετήριο docs](.)

Καθημερινές λειτουργίες για self-hosters: backup, restore, συντήρηση, λειτουργία demo, ενημέρωση. Κάθε ενέργεια είναι **admin-only** και καταγράφεται στο audit log.

---

## 💾 Backup & restore

### Δημιουργία backup

**Μέσω του web UI (συνιστάται):**

1. Συνδεθείτε ως admin → **Admin → Διαχείριση δεδομένων**
2. Κάρτα "💾 Πλήρες backup & restore" → κουμπί **"⬇ Backup erstellen"**
3. Κατεβαίνει ένα αρχείο JSON — όνομα αρχείου `tesla-carview-backup-<slug>-YYYY-MM-DD.json`

Περιεχόμενα: και τα 26 tables του ενεργού tenant DB (οχήματα, διαδρομές + σημεία GPS, sessions φόρτισης, τηλεμετρία, ημερολόγιο διαδρομών, διαστήματα service, χρήστες, διαπιστευτήρια passkey, audit logs, ρυθμίσεις, Tesla OAuth tokens, Virtual Key, νομικές αποδοχές, ιστορικό αλλαγών διαδρομής). Σκόπιμα εξαιρούνται: `push_subscriptions` (browser-specific) και `refresh_tokens` (αυτά ζουν στο `master.db`).

> **Passkeys**: το `passkey_credentials` περιλαμβάνεται στο backup. Μετά την επαναφορά στον **ίδιο διακομιστή**, τα καταχωρισμένα passkeys λειτουργούν αμέσως — το `credential_id` αποθηκεύεται server-side και το `user_id` διατηρείται από την επαναφορά. Επαναφορά σε διαφορετικό διακομιστή ή domain απαιτεί επανακαταχώριση passkeys (το WebAuthn είναι domain-bound).

**Μέσω CLI / cron** (για εξωτερικές στρατηγικές backup):

```bash
# Κάνει backup απευθείας των αρχείων SQLite — ατομικά, χωρίς διακοπή υπηρεσίας
docker compose -f docker-compose.prod.yml exec backend sh -c \
  "sqlite3 /app/data/master.db '.backup /app/data/backup-$(date +%F).db'"
docker cp tesla-carview-backend:/app/data/. /path/to/backup/
```

Συνιστάται: αποθηκεύστε επίσης το UI backup σε εξωτερικό δίσκο — ένα μονό αρχείο JSON ανά tenant είναι portable και versionable.

### Επαναφορά από backup

**Περίπτωση χρήσης:** εγκατασταθεί νέο σύστημα, ή το παλιό μπερδεύτηκε. Επαναφέρετε την προηγούμενη κατάσταση:

1. Εκτελέστε τουλάχιστον μία φορά τον setup wizard (δημιουργία λογαριασμού admin)
2. Συνδεθείτε ως admin → **Admin → Διαχείριση δεδομένων → "⬆ Backup wiederherstellen…"**
3. Επιλέξτε το αρχείο JSON + πληκτρολογήστε την επιβεβαίωση `WIEDERHERSTELLEN`
4. "Jetzt wiederherstellen" → ο διακομιστής δημιουργεί πρώτα ένα **safety backup του τρέχοντος `.db`** (η διαδρομή επιστρέφεται στο μήνυμα επιτυχίας), στη συνέχεια αδειάζει όλα τα tables και τα ξαναγεμίζει από το JSON, όλα μέσα σε **μία συναλλαγή**, με rollback σε σφάλμα
5. Αποσυνδεθείτε + συνδεθείτε ξανά, έτοιμο

### Επίπεδα ασφαλείας κατά την επαναφορά

- middleware `requireAdmin`
- Η φράση επιβεβαίωσης `WIEDERHERSTELLEN` πρέπει να πληκτρολογηθεί ακριβώς
- Pre-restore file-level backup (`<dbname>_pre_restore_<timestamp>.db`)
- Τομή στηλών: όταν το live schema έχει μετονομασμένη στήλη, αυτή η στήλη παραλείπεται αντί να σκοτώσει όλο το import
- Καταχώριση audit log για κάθε backup και κάθε restore

---

## 🌙 Νυχτερινή συντήρηση

Τρέχει καθημερινά μεταξύ **03:30 και 03:40 Europe/Berlin** (DST-safe μέσω `Intl.DateTimeFormat`). Σταματά σε κάθε επανεκκίνηση backend, επιστρέφει με backoff 2 λεπτών.

### Τι κάνει

| Πού | Εργασία |
|---|---|
| `master.db` | Διαγραφή ληγμένων `refresh_tokens` |
| `master.db` | Διαγραφή καταστάσεων `oauth_pkce` > 24 ώρες παλιών |
| `master.db` | Διαγραφή soft-revoked tenant invites > 30 ημερών |
| `master.db` | `VACUUM` + `wal_checkpoint(TRUNCATE)` |
| κάθε `tenant.db` | Διαγραφή `audit_logs` > 180 ημερών |
| κάθε `tenant.db` | Διαγραφή χρησιμοποιημένων/ληγμένων `user_invites` > 30 ημερών |
| κάθε `tenant.db` | `wal_checkpoint(TRUNCATE)` |
| κάθε `tenant.db` | `VACUUM` μόνο όταν DB > 50 MB |
| κάθε `tenant.db` | Καταχώριση audit `system_maintenance` με μετρητές |

### Χειροκίνητη ενεργοποίηση

**UI:** System → System status → "🌙 Nächtliche Wartung" → **"Jetzt ausführen"**.

**API:**
```bash
curl -X POST https://carview.example.com/api/system/maintenance-now \
  -H "Authorization: Bearer $ADMIN_JWT"
```

### Επιθεώρηση τελευταίας εκτέλεσης

```bash
curl https://carview.example.com/api/system/maintenance-log \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

Δείχνει τις τελευταίες έως 50 εκτελέσεις με μετρητές, διάρκεια και κατάσταση σφάλματος.

---

## ⬆️ Auto-update (opt-in)

> ⚠️ **Απενεργοποιημένο από προεπιλογή.** Η ενεργοποίηση σημαίνει ότι το σύστημά σας τραβά νέα commits από το `main` κάθε βράδυ και ξαναχτίζει το container. Επαληθεύστε πρώτα ότι το `deploy/update.sh` τρέχει καθαρά στο setup σας.

### Ενεργοποίηση

```bash
# backend/.env
AUTO_UPDATE_ENABLED=true
UPDATE_REPO_DIR=/opt/tesla-carview   # default είναι ακριβώς αυτό, override μόνο αν διαφέρει
```

Στη συνέχεια επανεκκίνηση backend:
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Τι συμβαίνει τη νύχτα

1. `git fetch origin main` στη διαμορφωμένη διαδρομή repo
2. Συγκρίνει το `git rev-parse HEAD` με το `origin/main`
3. Αν διαφέρουν: `bash deploy/update.sh` (timeout 10 λεπτών)
4. Κατά τη διάρκεια του rebuild το frontend δείχνει αυτόματα το **maintenance overlay** (δείτε `frontend/src/components/MaintenanceOverlay.vue`) με ευφυολογήματα Tesla — οι χρήστες σχεδόν δεν το αντιλαμβάνονται
5. Η κατάσταση (local hash, remote hash, update outcome) προσγειώνεται στο maintenance log

### Χειροκίνητη ενημέρωση οποτεδήποτε

```bash
cd /opt/tesla-carview
bash deploy/update.sh
```

---

## 🧪 Λειτουργία demo

Για **testers χωρίς Tesla**. Αν το τρέχετε μόνο για τον εαυτό σας, αφήστε το απενεργοποιημένο.

### Ενεργοποίηση

```bash
# backend/.env
DEMO_ENABLED=true
```

Επανεκκίνηση backend. Ένας πρόσθετος tenant με slug `demo` και αρχείο DB `data/tenants/<uuid>.db` δημιουργείται στην πρώτη εκκίνηση.

### Σκληρά όρια (κωδικοποιημένα στο `routes/demo.js`)

| Σταθερά | Default | Μεταβλητή ENV | Σημασία |
|---|---|---|---|
| `MAX_ACTIVE_DEMO_USERS` | `200` | `MAX_ACTIVE_DEMO_USERS` | Ταυτόχρονοι testers. HTTP 503 όταν γεμίσει. |
| `DEMO_SIGNUPS_PER_IP` | `2` / 24 ώρες | `DEMO_SIGNUPS_PER_IP` | Το πολύ 2 εγγραφές ανά IP ανά παράθυρο 24 ωρών |
| `DEMO_LIFETIME_DAYS` | `2` | `DEMO_LIFETIME_DAYS` | Ο λογαριασμός + όλα τα δεδομένα του διαγράφονται μετά από 2 ημέρες, χωρίς υπολείμματα |

Και τα τρία μπορούν να αντικατασταθούν μέσω μεταβλητής περιβάλλοντος — για ιδιωτικό instance με `DEMO_ENABLED=true`, εξετάστε το ενδεχόμενο να ορίσετε `MAX_ACTIVE_DEMO_USERS=5` και `DEMO_LIFETIME_DAYS=1`.

### Τι βλέπουν οι testers

- Η σελίδα σύνδεσης δείχνει μια μπλε κάρτα "🧪 Tesla Carview ausprobieren — ohne Tesla" με τις διαθέσιμες θέσεις
- Ένα κλικ → δημιουργείται χρήστης `tester-<hex>`, γίνεται σύνδεση, σπέρνεται ψεύτικο όχημα + ιστορικό 3 εβδομάδων
- Banner στην κορυφή της εφαρμογής: "Demo-Modus — Konto und Daten werden am DD.MM.YYYY automatisch gelöscht (X Tage übrig)"
- Οι σελίδες ιδιωτικότητας και όρων δείχνουν αυτόματα μια **προσθήκη για testers** (χωρίς SLA, χωρίς υποστήριξη, ψεύτικα δεδομένα, διαγραφή μετά από `DEMO_LIFETIME_DAYS` ημέρες)
- Κάθε 30 λεπτά: μια νέα ψεύτικη διαδρομή ανά demo όχημα — έτσι το demo νιώθει ζωντανό

### Καθαρισμός

- Κάθε 6 ώρες τρέχει ο κύκλος ζωής demo: οι χρήστες με `expires_at < now` διαγράφονται σε μία συναλλαγή, μαζί με κάθε εξαρτημένο πίνακα (οχήματα, διαδρομές, σημεία GPS, φόρτιση, μπαταρία, τηλεμετρία, ημερολόγιο διαδρομών, κωδικοί MFA, audit logs, τοποθεσίες φόρτισης, διαστήματα service)
- Ο ίδιος ο demo tenant παραμένει — διαγράφονται μόνο τα δεδομένα των testers
- **Απομόνωση**: το demo slug **ποτέ** δεν γράφεται στο `localStorage` — ένας tester που κλείνει το tab του browser και ανοίγει ξανά το production URL δεν θα καταλήξει κατά λάθος στον demo tenant

---

## 🛡️ Παρακολούθηση & self-healing

Ένα cron job (`/opt/monitoring/bin/heal.sh`) τρέχει κάθε 15 λεπτά και παρακολουθεί τις κύριες υπηρεσίες:

1. **Κατάσταση container** — επιθεωρεί το `docker inspect` για `tesla-carview-backend`, `-frontend` και `-nginx`· αν ένα container δεν είναι σε κατάσταση `running` επανεκκινείται μέσω `docker compose up -d <service>`.
2. **Health endpoint** — όταν όλα τα containers τρέχουν, ελέγχει `GET /api/health`· αν η απόκριση δεν είναι `{"status":"ok"}` επανεκκινείται το backend container.
3. **Email alert** — μετά από κάθε αυτόματη επανεκκίνηση στέλνεται email ειδοποίησης στη διαμορφωμένη διεύθυνση (αν έχει οριστεί).
4. **Log rotation** — το `/var/log/tcv-heal.log` περικόπτεται αυτόματα στις τελευταίες 500 γραμμές όταν ξεπεράσει το 1 MB.

**Διαμόρφωση** (Admin → System → Monitoring & self-healing):

| Ρύθμιση | Περιγραφή |
|---|---|
| Self-healing on/off | DB key `monitoring.heal_enabled`· ορίστε σε `false` και το cron job εξέρχεται αμέσως |
| Alert email | DB key `monitoring.alert_email`· κενό = χωρίς alert |

**API endpoints** (admin-only):
- `GET /api/system/monitoring-config` — διαβάζει την τρέχουσα διαμόρφωση
- `PUT /api/system/monitoring-config` — αποθηκεύει διαμόρφωση
- `GET /api/system/monitoring-log?lines=50` — επιστρέφει τις τελευταίες N γραμμές από τα logs heal και security

**Χειροκίνητη επιθεώρηση logs:**
```bash
tail -50 /var/log/tcv-heal.log
tail -50 /var/log/security-check.log
```

**Καταχώριση cron** (`/etc/cron.d/tesla-carview-monitoring`):
```
*/15 * * * * root /opt/monitoring/bin/heal.sh >/dev/null 2>&1
```

---

## 📊 Υγεία συστήματος με μια ματιά

UI: **Admin → System** → ο admin βλέπει μια χρωματιστή κάρτα φαναριού στην κορυφή. Backend endpoint: `GET /api/system/health` (admin-only). Έλεγχοι:

| Έλεγχος | Πράσινο | Κίτρινο | Κόκκινο | Info (αμβλυωτικό) |
|---|---|---|---|---|
| Tesla OAuth token | έγκυρο, > 7 ημέρες υπόλοιπο | < 7 ημέρες | έληξε ή λείπει | — |
| Virtual Key | δημιουργήθηκε | — | δεν δημιουργήθηκε | — |
| Fleet Telemetry | τελευταίο data point < 24 ώρες | < 7 ημέρες | τίποτα ή > 7 ημέρες | — |
| Tesla poller | τελευταίο poll < 60 λεπτά | < 1 ημέρα | — | — |
| Tenant DB | πληροφοριακό — μέγεθος σε MB | — | — | — |
| Νυχτερινή συντήρηση | τελευταία εκτέλεση < 25 ώρες | — | — | — |
| OpenChargeMap | live probe OK | — | probe απέτυχε (key set) | δεν έχει διαμορφωθεί key |
| HERE Maps | live probe OK | — | probe απέτυχε (key set) | δεν έχει διαμορφωθεί key |

Προαιρετικές υπηρεσίες (OCM, HERE) μετρώνται ως σφάλματα μόνο όταν έχει διαμορφωθεί key αλλά το endpoint δεν απαντά. Χωρίς key: κατάσταση `info`, αμβλυωτικό, χωρίς επίδραση στο συνολικό χρώμα φαναριού.

---

## 🔍 Επιθεώρηση των logs

**Logs container:**
```bash
docker compose -f docker-compose.prod.yml logs -f --tail 200 backend
```

**Audit log** (συμβάντα σχετικά με ασφάλεια ανά tenant):
- UI: **Admin → Audit log** με φίλτρα (ενέργεια, user-id, ημερομηνία) και εξαγωγή CSV
- API: `GET /api/audit` (admin-only)

**Maintenance log** (τελευταίες νυχτερινές εκτελέσεις):
- UI: System → "🌙 Nächtliche Wartung" → λεπτομέρειες
- API: `GET /api/system/maintenance-log` (admin-only)

---

## 🚨 Έκτακτη ανάγκη: επαναφορά βάσης δεδομένων

Όταν τα πάντα είναι στη φωτιά και μόνο μια καθαρή επανεκκίνηση θα κάνει:

```bash
# 1. Κάντε ΠΡΩΤΑ ένα backup (δείτε παραπάνω)
# 2. Σταματήστε τα containers
docker compose -f docker-compose.prod.yml down

# 3. Σβήστε τον κατάλογο data — ΟΛΑ ΤΑ ΔΕΔΟΜΕΝΑ ΧΑΝΟΝΤΑΙ
# Τα δεδομένα ζουν στο bind-mount ./data (όχι σε Docker named volume!)
rm -rf ./data/master.db ./data/tenants/

# 4. Ξεκινήστε από την αρχή — ο setup wizard εμφανίζεται αυτόματα
docker compose -f docker-compose.prod.yml up -d
```

> Από την v2.0 οι βάσεις SQLite ζουν κάτω από το `./data` ως bind-mount (σχετικά με το αρχείο Compose), **όχι** σε Docker named volume. Το `docker volume rm` δεν έχει επίδραση σε αυτή τη ρύθμιση.

Για να επαναφέρετε ένα backup μετά, ολοκληρώστε τον setup wizard με προσωρινό λογαριασμό admin, συνδεθείτε και χρησιμοποιήστε τη ροή επαναφοράς UI.

---

## Δείτε επίσης

- [01-quickstart.en.md](01-quickstart.en.md) — αρχική εγκατάσταση
- [02-deployment.en.md](02-deployment.en.md) — production deployment
- [10-configuration.en.md](10-configuration.en.md) — όλες οι μεταβλητές περιβάλλοντος
- [05-security-architecture.en.md](05-security-architecture.en.md) — μοντέλο ασφαλείας

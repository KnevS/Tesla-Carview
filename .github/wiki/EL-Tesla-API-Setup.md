# Ρύθμιση Tesla API

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [αγγλικό πρωτότυπο](Home). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

🌐 **Γλώσσα:** [EN](Tesla-API-Setup) · [DE](DE-Tesla-API-Setup) · [FR](FR-Tesla-API-Setup) · [ES](ES-Tesla-API-Setup) · [TR](TR-Tesla-API-Setup) · **EL**

Η σύνδεση του TeslaView με τον λογαριασμό Tesla σας απαιτεί έναν **λογαριασμό Tesla Developer** και μια **εφαρμογή OAuth**. Αυτή η διαδικασία διαρκεί περίπου 20–30 λεπτά και χρειάζεται να γίνει μόνο μία φορά.

---

## Επισκόπηση: Τι συμβαίνει εδώ;

Η Tesla χρησιμοποιεί OAuth 2.0 — το ίδιο πρότυπο που χρησιμοποιείται από το "Login with Google". Δημιουργείτε μια εφαρμογή στο developer portal της Tesla, η οποία λαμβάνει ένα **Client ID** και ένα **Client Secret**. Το TeslaView τα χρησιμοποιεί για να ζητήσει πρόσβαση στα δεδομένα του οχήματός σας με την άδειά σας.

```
Tesla Developer Portal
  → Register App → get Client ID + Secret
  → Enter in Tesla Carview
  → Click "Connect Tesla Account"
  → Tesla login page opens
  → You approve access
  → Tesla sends tokens to Tesla Carview
  → Data flows ✅
```

---

## Βήμα 1: Δημιουργήστε έναν λογαριασμό Tesla Developer

1. Μεταβείτε στο [developer.tesla.com](https://developer.tesla.com)
2. Συνδεθείτε με τον κανονικό λογαριασμό Tesla σας (τον ίδιο που χρησιμοποιείτε για το αυτοκίνητο)
3. Αποδεχτείτε τους όρους developer

---

## Βήμα 2: Εγγράψτε την εφαρμογή σας

1. Στο developer portal, κάντε κλικ στο **"Add New Application"**
2. Συμπληρώστε τη φόρμα:

   | Πεδίο | Τι να εισαγάγετε |
   |---|---|
   | **Application Name** | Οτιδήποτε περιγραφικό, π.χ. "My Tesla Carview" |
   | **Description** | "Private self-hosted Tesla data logger" |
   | **Allowed Origin URL** | `https://tesla.yourdomain.com` |
   | **Redirect URI** | `https://tesla.yourdomain.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. Στα **Scopes**, επιλέξτε:
   - `vehicle_device_data` — για ανάγνωση κατάστασης οχήματος
   - `vehicle_cmds` — για αποστολή εντολών (κλιματισμός, κλειδαριές κ.λπ.)
   - `vehicle_charging_cmds` — για έλεγχο φόρτισης
   - `offline_access` — για να παραμένει συνδεδεμένο χωρίς να συνδέεστε ξανά κάθε ώρα

4. Κάντε κλικ στο **Save**

5. Σημειώστε το **Client ID** και το **Client Secret** σας — θα τα χρειαστείτε στο επόμενο βήμα

> ⚠️ **Κρατήστε το Client Secret σας ιδιωτικό.** Πηγαίνει στο αρχείο `.env` σας και δεν πρέπει ποτέ να μοιραστεί ή να γίνει commit στο git.

---

## Βήμα 3: Ρύθμιση του Virtual Key (για εντολές)

Το Virtual Key είναι ο μηχανισμός ασφαλείας της Tesla για την αποστολή εντολών στο αυτοκίνητο. Χωρίς αυτό, μπορείτε να διαβάσετε δεδομένα αλλά να μην ελέγξετε τίποτα (καμία εκκίνηση κλιματισμού, καμία κλειδαριά/ξεκλείδωμα).

Το TeslaView παράγει αυτόματα ένα κλειδί. Απλώς πρέπει να το προσθέσετε στο αυτοκίνητό σας:

1. Στο TeslaView, μεταβείτε στο **Settings → Virtual Key**
2. Αντιγράψτε το URL που εμφανίζεται (μοιάζει με `https://tesla.yourdomain.com/api/virtual-key/pair`)
3. Ανοίξτε αυτό το URL στον **περιηγητή Tesla στην οθόνη αφής του αυτοκινήτου σας** (όχι στο τηλέφωνό σας)
4. Πατήστε **"Add key"** στην οθόνη του αυτοκινήτου
5. Επιβεβαιώστε με την εφαρμογή Tesla στο τηλέφωνό σας (σας ζητά να εγκρίνετε το νέο κλειδί)

Μετά τη σύζευξη, οι εντολές (κλιματισμός, κλείδωμα κ.λπ.) θα λειτουργούν από το TeslaView.

---

## Βήμα 4: Εισαγάγετε τα διαπιστευτήρια στο TeslaView

1. Μεταβείτε στο **Admin → System** στο TeslaView
2. Εισαγάγετε το **Client ID** και το **Client Secret** σας
3. Κάντε κλικ στο **Save**

Ή προσθέστε τα απευθείας στο αρχείο `.env`:

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=your-client-id-here
TESLA_CLIENT_SECRET=your-client-secret-here
```

Στη συνέχεια επανεκκινήστε:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Βήμα 5: Συνδέστε τον λογαριασμό Tesla σας

1. Στο TeslaView, μεταβείτε στο **Dashboard → Connect Tesla Account** (ή στο prompt στην πρώτη σύνδεση)
2. Κάντε κλικ στο **"Connect with Tesla"**
3. Ανακατευθύνεστε στη σελίδα σύνδεσης της Tesla — συνδεθείτε με τον λογαριασμό Tesla σας
4. Η Tesla ρωτά σε ποιο όχημα να δώσει πρόσβαση — επιλέξτε το αυτοκίνητό σας
5. Ανακατευθύνεστε πίσω στο TeslaView — η σύνδεση έχει εγκατασταθεί ✅

Η εφαρμογή τώρα κάνει polling των δεδομένων του οχήματός σας κάθε 60 δευτερόλεπτα ενώ το αυτοκίνητο είναι ενεργό και αναστέλλει το polling όταν το αυτοκίνητο είναι παρκαρισμένο και κοιμάται (για να αποφύγει το άδειασμα της μπαταρίας).

---

## Συνηθισμένα προβλήματα

### "403 Forbidden" σε όλες τις κλήσεις Tesla API

Ο λογαριασμός Tesla developer σας μπορεί να έχει **ανασταλεί ή να έχει rate-limit**. Αυτό συμβαίνει εάν:
- Έγιναν πολλές κλήσεις API (throttling)
- Οι πληροφορίες χρέωσης στο developer portal είναι ελλιπείς
- Η Tesla έχει επισημάνει τον λογαριασμό

Ελέγξτε [developer.tesla.com](https://developer.tesla.com) — εάν δείτε ειδοποίηση χρέωσης ή αναστολής, λύστε το πρώτα.

### Το όχημα εμφανίζεται ως "offline" ακόμα και όταν οδηγείτε

Το API της Tesla έχει έναν γνωστό περιορισμό: ορισμένα νεότερα οχήματα (ειδικά εκείνα με VINs XP7 όπως το Model Y Juniper) δεν επιστρέφουν δεδομένα GPS μέσω του τυπικού endpoint. Το TeslaView χρησιμοποιεί Fleet Telemetry για αυτά τα οχήματα. Αυτό διαμορφώνεται αυτόματα.

### Οι εντολές δεν λειτουργούν ("Virtual Key not paired")

→ Επαναλάβετε το Βήμα 3 παραπάνω. Βεβαιωθείτε ότι ανοίξατε το URL σύζευξης στον **περιηγητή Tesla** (όχι στο τηλέφωνο ή στον υπολογιστή σας).

### "Redirect URI mismatch"

Το Redirect URI στο Tesla Developer Portal πρέπει να **ταιριάζει ακριβώς** με αυτό που εισαγάγατε — συμπεριλαμβανομένου του `https://`, του σωστού τομέα και χωρίς trailing slash.

---

## Πώς λειτουργεί το data polling

Το TeslaView κάνει polling του οχήματός σας κάθε 60 δευτερόλεπτα από προεπιλογή όταν το αυτοκίνητο είναι ενεργό. Όταν το αυτοκίνητο κοιμάται (παρκαρισμένο για περισσότερα από μερικά λεπτά), το polling επιβραδύνεται σε κάθε 10 λεπτά για να αποφευχθεί η αφύπνιση του αυτοκινήτου (που αδειάζει την μπαταρία 12V).

Μπορείτε να προσαρμόσετε το διάστημα polling στο αρχείο `.env`:
```env
POLL_INTERVAL_MS=60000        # 60 seconds (default)
POLL_SLEEP_INTERVAL_MS=600000 # 10 minutes when sleeping
```

# Διαμόρφωση — Μεταβλητές περιβάλλοντος

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [αγγλικό πρωτότυπο](Home). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

🌐 **Γλώσσα:** [EN](Configuration) · [DE](DE-Configuration) · [FR](FR-Configuration) · [ES](ES-Configuration) · [TR](TR-Configuration) · **EL**

Όλες οι ρυθμίσεις του TeslaView διαμορφώνονται μέσω του αρχείου `.env` στο `/opt/tesla-carview/backend/.env`.

Μετά από οποιαδήποτε αλλαγή στο `.env`, επανεκκινήστε το backend:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Απαιτούμενες ρυθμίσεις (πρέπει να οριστούν για να λειτουργήσει η εφαρμογή)

| Μεταβλητή | Παράδειγμα | Περιγραφή |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Μυστικό κλειδί για την υπογραφή tokens σύνδεσης. Δημιουργήστε με: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Από το Tesla Developer Portal |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Από το Tesla Developer Portal |
| `TESLA_AUTH_BASE` | `https://auth.tesla.com/oauth2/v3` | Βασικό URL OAuth της Tesla — προ-συμπληρωμένο από τον οδηγό εγκατάστασης· αλλάξτε το μόνο εάν η Tesla ενημερώσει το endpoint authentication |
| `FRONTEND_URL` | `https://tesla.yourdomain.com` | Το δημόσιο URL της εγκατάστασής σας |
| `DATABASE_PATH` | `/app/data` | Πού αποθηκεύονται οι βάσεις δεδομένων (μην το αλλάξετε στο Docker) |

---

## Προαιρετικές αλλά συνιστώμενες

| Μεταβλητή | Προεπιλογή | Περιγραφή |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Ορίστε σε `true` για αυτόματη νυχτερινή ενημέρωση |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Εξαναγκάστε ρύθμιση MFA για όλους τους νέους λογαριασμούς χρηστών |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Απαίτηση κωδικού πρόσκλησης για εγγραφή νέου μισθωτή |
| `POLL_INTERVAL_MS` | `60000` | Συχνότητα polling του Tesla API όταν το αυτοκίνητο είναι ενεργό (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Διάστημα polling όταν το αυτοκίνητο κοιμάται (ms) |

---

## Δυναμικός τιμολογιακός κατάλογος (τιμολόγηση ηλεκτρικής ενέργειας)

| Μεταβλητή | Περιγραφή |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — ενεργοποίηση aWATTar (DE/AT, δωρεάν) |
| `TIBBER_TOKEN` | Το API token σας στο Tibber (αποκτήστε στο [developer.tibber.com](https://developer.tibber.com)) |

---

## Λειτουργία demo

| Μεταβλητή | Προεπιλογή | Περιγραφή |
|---|---|---|
| `DEMO_ENABLED` | `false` | Ενεργοποίηση δημόσιου μισθωτή demo με ψεύτικα δεδομένα |
| `DEMO_MAX_CONCURRENT` | `10` | Μέγιστος αριθμός ταυτόχρονων χρηστών demo |
| `DEMO_LIFETIME_DAYS` | `14` | Πόσο διαρκούν οι λογαριασμοί demo |

---

## Web Push (ειδοποιήσεις)

Τα κλειδιά VAPID απαιτούνται για push ειδοποιήσεις ("Η φόρτιση ολοκληρώθηκε", "Λήγει το διάστημα service"). Χωρίς αυτά, οι ειδοποιήσεις push δεν λειτουργούν — η υπόλοιπη εφαρμογή τρέχει κανονικά.

| Μεταβλητή | Προεπιλογή | Περιγραφή |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Δημόσιο κλειδί — δημιουργήστε με `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Ιδιωτικό κλειδί (δημιουργείται ταυτόχρονα) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | URI επικοινωνίας για την υπηρεσία push — ιδανικά το δικό σας email |

Δημιουργήστε και τα δύο κλειδιά με μία εντολή:
```bash
npx web-push generate-vapid-keys
```

---

## Προηγμένα / Fleet Telemetry

Το Fleet Telemetry παρέχει **GPS και τηλεμετρία σε πραγματικό χρόνο** που στέλνονται απευθείας από το αυτοκίνητο στον διακομιστή σας — αντί για polling του Tesla API κάθε λεπτό. Είναι προαιρετικό για τις περισσότερες εγκαταστάσεις, αλλά συνιστάται (ή απαιτείται) για νεότερα μοντέλα Tesla.

**Πότε έχει σημασία το Fleet Telemetry:**
- Νεότερα μοντέλα (π.χ. Model Y Juniper, VINs που ξεκινούν με XP7) δεν επιστρέφουν πλέον δεδομένα GPS μέσω του τυπικού API polling — το Fleet Telemetry είναι τότε ο μόνος τρόπος για ζωντανά δεδομένα τοποθεσίας.
- Για παλαιότερα μοντέλα, είναι μια προαιρετική αναβάθμιση: χαμηλότερο φορτίο API, ταχύτερα δεδομένα και ενημερώσεις θέσης σε πραγματικό χρόνο.

**Προαπαιτούμενα:**
1. Το Virtual Key πρέπει να έχει συζευχθεί πρώτα (δείτε [Tesla API Setup](EL-Tesla-API-Setup#βήμα-3-ρύθμιση-του-virtual-key-για-εντολές))
2. Το Fleet Telemetry πρέπει να έχει **εγκριθεί για το Client-ID σας** στο [Tesla Developer Portal](https://developer.tesla.com) — αυτό είναι ξεχωριστό βήμα έγκρισης πέρα από τη βασική πρόσβαση API. Ζητήστε το από τις ρυθμίσεις της εφαρμογής σας.

| Μεταβλητή | Περιγραφή |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — ενεργοποίηση GPS πραγματικού χρόνου μέσω Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Θύρα για τον διακομιστή Fleet Telemetry (προεπιλογή: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Διαδρομή προς το αρχείο ιδιωτικού κλειδιού του Virtual Key |

---

## Πώς να δημιουργήσετε ένα ασφαλές JWT_SECRET

```bash
openssl rand -hex 32
# Output: something like a8f3e9b2c1d4...
# Copy this into your .env file
```

---

## Έλεγχος της τρέχουσας διαμόρφωσης

```bash
# View current .env (careful with sharing output — contains secrets):
cat /opt/tesla-carview/backend/.env

# Check which environment variables the running container sees:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Διαμόρφωση μέσα στην εφαρμογή (Admin → Admin Settings)

Ορισμένες ρυθμίσεις δεν απαιτούν αλλαγές στο `.env` — διαμορφώνονται απευθείας από τη διεπαφή διαχείρισης και αποθηκεύονται στη βάση δεδομένων. Αυτές οι ρυθμίσεις διατηρούνται μετά από ενημερώσεις και δεν απαιτούν επανεκκίνηση container.

| Ρύθμιση | Τοποθεσία | Σημειώσεις |
|---|---|---|
| Παράδοση SMTP / e-mail | Admin → Admin Settings → E-Mail | Host, port, χρήστης, κωδικός, αποστολέας — περιλαμβάνει κουμπί δοκιμαστικής αποστολής |
| Κλειδί API OpenChargeMap | Admin → Admin Settings → External APIs | Επικάλυψη σταθμών φόρτισης στον σχεδιαστή διαδρομών — δωρεάν, εγγραφή στο [openchargemap.io/site/develop](https://openchargemap.io/site/develop#api) |
| Κλειδί API HERE Maps | Admin → Admin Settings → External APIs | Κίνηση σε πραγματικό χρόνο στον σχεδιαστή διαδρομών — δωρεάν επίπεδο (250 k req/μήνα), εγγραφή στο [developer.here.com](https://developer.here.com) |
| Κλειδί API xAI | Admin → Admin Settings → External APIs | Βοηθός AI Grok Chat — αποκτήστε στο [console.x.ai](https://console.x.ai) |
| Κλειδί API Anthropic | Admin → Admin Settings → Monitoring | Αυτόματη διόρθωση με AI (Claude Haiku) — δείτε παρακάτω |
| Διακόπτης αυτόματης επιδιόρθωσης | Admin → Admin Settings → Monitoring | Ενεργοποίηση/απενεργοποίηση αυτόματης επανεκκίνησης container |
| Διεύθυνση e-mail ειδοποιήσεων | Admin → Admin Settings → Monitoring | Πού στέλνονται οι ειδοποιήσεις παρακολούθησης |
| Διαπιστευτήρια Monta | Settings → Vehicle profile → Home charging | Ανά όχημα: Client ID, Client Secret, Charge-Point ID — διαθέσιμα για όλες τις κατηγορίες οχημάτων |
| Τιμή ηλεκτρικού ρεύματος ανά kWh | Settings → Vehicle profile ή οδηγός εγκατάστασης | Κόστος ενέργειας ανά όχημα για υπολογισμούς φόρτισης |

Όλα τα παραπάνω μπορούν επίσης να διαμορφωθούν κατά τη διάρκεια του **οδηγού εγκατάστασης** — δεν απαιτείται άμεση πρόσβαση στον διακομιστή.

### Σε τι χρησιμεύει το κλειδί API Anthropic;

Το TeslaView περιλαμβάνει ένα σύστημα παρακολούθησης αυτο-θεραπείας δύο επιπέδων που τρέχει αυτόματα στον διακομιστή:

- **Επίπεδο 1 — Αυτόματη διόρθωση βασισμένη σε κανόνες** (τρέχει κάθε 20 λεπτά): Χειρίζεται γνωστά, ντετερμινιστικά προβλήματα — επανεκκίνηση σταματημένων containers, καθαρισμός γεμάτων δίσκων, διόρθωση δικαιωμάτων αρχείων. Δεν απαιτείται AI, πάντα ενεργό.
- **Επίπεδο 2 — Αυτόματη διόρθωση με AI** *(προαιρετικό)*: Ενεργοποιείται όταν το Επίπεδο 1 δεν μπορεί να διορθώσει ένα πρόβλημα. Στέλνει το αρχείο καταγραφής σφάλματος στο Claude Haiku (Anthropic) και του ζητά να προτείνει και προαιρετικά να εφαρμόσει μια διόρθωση — μια πιο ισχυρή εναλλακτική για ασυνήθιστα προβλήματα.

> **Το Επίπεδο 2 είναι εντελώς προαιρετικό και μπορεί απλώς να παραλειφθεί.** Το σύστημα αυτο-θεραπεύεται αξιόπιστα μόνο με το Επίπεδο 1 — για τις περισσότερες εγκαταστάσεις αυτό είναι περισσότερο από αρκετό. Χωρίς κλειδί Anthropic, τα άλυτα προβλήματα ενεργοποιούν αντί αυτού μια ειδοποίηση e-mail.

Αποκτήστε ένα κλειδί στο [console.anthropic.com](https://console.anthropic.com) (πληρωμή ανά χρήση, το Claude Haiku είναι πολύ φθηνό — τυπικά μερικά cents τον μήνα για περιστασιακές κλήσεις αυτόματης διόρθωσης).

---

## Πλήρης αναφορά

Για πλήρη λίστα κάθε μεταβλητής περιβάλλοντος με λεπτομερείς περιγραφές, δείτε την τεχνική τεκμηρίωση:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)

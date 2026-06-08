# 🛡️ High Availability (HA) — επιλογές αρχιτεκτονικής

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](12-high-availability.md) · 🏠 [Ευρετήριο docs](.)

Το Tesla Carview παραδίδεται ως **single-node deployment** σε έναν διακομιστή Linux ή Raspberry Pi — απολύτως κατάλληλο για οικιακό self-hosting: γρήγορο, ελαφρύ, φθηνό. Για **εμπορικές multi-vehicle / multi-tenant εγκαταστάσεις** με καθορισμένες απαιτήσεις SLA, διατίθεται ένα **high-availability (HA) setup** κατόπιν αιτήματος — σχεδιάζεται ανά έργο, δεν αποτελεί μέρος του τυπικού repo.

---

## Πότε αξίζει το HA;

Εμπειρικοί κανόνες. Αν κάποιο από αυτά είναι "ναι", μια συζήτηση HA έχει νόημα:

- 🚛 **Περισσότερα από 5 οχήματα** ή/και πολλαπλοί tenants σε production → ένα outage χτυπά πολλούς χρήστες ταυτόχρονα
- 📑 **Φορολογικά δεσμευτικό ημερολόγιο διαδρομών** (BMF export) — η απώλεια δεδομένων γίνεται γρήγορα ακριβή
- ⏱ **Ενεργές εντολές Tesla** (preconditioning, charge schedule) πρέπει να λειτουργούν 24/7
- 🛠 **Παράθυρα συντήρησης μόνο εκτός γερμανικών ωρών γραφείου**, χωρίς νυχτερινό ρίσκο
- 📈 **Επίπεδα υπηρεσιών υποσχεμένα σε τρίτους** (διαχειριστές στόλου, εταιρικά car pools)

Για ιδιωτική χρήση με 1–2 οχήματα, single-node + καθημερινό backup + ροή restore είναι αρκετά (δείτε [11-operations.en.md](11-operations.en.md)).

---

## Πιθανές τοπολογίες HA (teaser)

Αυτές οι επιλογές είναι εφικτές και μπορούν να παραδοθούν κατόπιν αιτήματος — η σωστή επιλογή εξαρτάται από τους στόχους διαθεσιμότητας, τον προϋπολογισμό και την υπάρχουσα υποδομή.

### Tier 1 — Warm standby (RTO ≈ 5 λεπτά, RPO ≈ 5 λεπτά)
- Δεύτερος ταυτόσημος διακομιστής σε δεύτερο site
- Περιοδική αναπαραγωγή backup SQLite (π.χ. μέσω `litestream` → S3-συμβατή object storage)
- DNS failover ή floating IP για switchover
- **Υπέρ:** φθηνό, απλό, καλύπτει το 95 % των σεναρίων βλάβης
- **Επιφύλαξη:** πιθανή σύντομη απώλεια δεδομένων (δευτερόλεπτα έως λίγα λεπτά)

### Tier 2 — Active-active πίσω από load balancer (RTO < 1 λεπτό, RPO ≈ 0)
- Πολλά backend containers πίσω από L7 load balancer (nginx/HAProxy/Traefik)
- Αντικατάσταση SQLite με server-side Postgres (ή sqlite-ικανό cluster όπως `rqlite`)
- Stateless backend (JWT-based, χωρίς ανάγκη session affinity)
- Κοινόχρηστο object storage για backups και μεταναστεύσεις tenant
- **Υπέρ:** πραγματικό failover χωρίς ανθρώπινη παρέμβαση
- **Επιφύλαξη:** περισσότερα κινούμενα μέρη, υψηλότερο λειτουργικό κόστος

### Tier 3 — Γεω-πλεονασματικό (RTO < 1 λεπτό, RPO ≈ 0, καλύπτει περιφερειακά outages)
- Tier 2 αναπτυγμένο σε δεύτερη γεωγραφική περιοχή (π.χ. Φρανκφούρτη + Βερολίνο)
- Βάση δεδομένων με σύγχρονη αναπαραγωγή ή quorum cluster (PostgreSQL Patroni, CockroachDB)
- Anycast DNS ή global load balancer για cross-region routing
- **Υπέρ:** επιβιώνει outage data centre
- **Επιφύλαξη:** απαιτητικό setup· η καθυστέρηση προς τη βάση μεταξύ περιοχών πρέπει να σχεδιαστεί

### Tier 4 — Kubernetes-native multi-replica deployment
- Helm chart για backend + frontend + reverse proxy
- Horizontal Pod Autoscaler (HPA)
- PersistentVolume με αναπαραγόμενη κλάση storage backend (Longhorn, OpenEBS, Ceph)
- Sealed Secrets / External Secrets Operator για τιμές `.env`
- **Υπέρ:** ενσωματώνεται με υπάρχουσα πλατφόρμα cloud / on-prem K8s
- **Επιφύλαξη:** αξίζει μόνο σε ≥ 10 tenants ή με υπάρχον τοπίο K8s

---

## Τι είναι ήδη HA-ready στο τυπικό repo

Ακόμα και χωρίς ρητό HA setup, η αρχιτεκτονική είναι σχεδιασμένη ώστε μια αναβάθμιση να μην σπάει τα πάντα:

- **Stateless backend** — δεν απαιτείται session store, το οριζόντιο scaling είναι απλό (JWT + httpOnly refresh cookie)
- **Multi-tenant απομόνωση** — κάθε tenant DB ξεχωριστή, backup/restore ανά tenant μέσω `/api/data/backup` + `/restore` (δείτε [11-operations.en.md](11-operations.en.md))
- **Maintenance overlay στο frontend** — οι χρήστες δεν βλέπουν "σφάλμα" κατά την εναλλαγή container, βλέπουν μια φιλική κάρτα ενημέρωσης
- **Audit log** — κάθε ενέργεια σχετική με ασφάλεια καταγράφεται, forensic trail μετά από failover
- **Νυχτερινή συντήρηση** — DB vacuum, ληγμένα tokens, παλιά audit logs καθαρίζονται αυτόματα
- **System-health endpoint** (`/api/system/health`) — άμεσα χρησιμοποιήσιμο ως Kubernetes liveness/readiness probe ή σε εξωτερική παρακολούθηση (Uptime Kuma, Healthchecks.io, Statping)

---

## Πώς να προχωρήσετε αν χρειάζεστε HA

1. **Διασαφήνιση απαιτήσεων** — στόχοι RTO/RPO, αριθμός tenants και οχημάτων, συμμόρφωση (GDPR processing agreement, διατήρηση BMF)
2. **Επιλογή τοπολογίας** — ένα από τα παραπάνω tiers ή ειδικός για το έργο συνδυασμός
3. **Σχέδιο μετάβασης** — single-node → HA χωρίς απώλεια δεδομένων, ενδεχομένως πρώτη μετάβαση σε Postgres
4. **Παράδοση λειτουργίας** — runbooks, παρακολούθηση, on-call setup, incident playbooks
5. **Δοκιμές φόρτου** — drills failover, πρόβες backup-restore

Αυτά τα βήματα σχεδιάζονται ατομικά με τον operator σε ένα πελατειακό έργο — δεν υπάρχει συνταγή one-size-fits-all στο repo.

---

## Επικοινωνία / ενδιαφέρον

Συμβουλευτική και συγκεκριμένη αρχιτεκτονική HA κατόπιν αιτήματος. Τα κανάλια επικοινωνίας βρίσκονται στο footer της εφαρμογής (δείτε `frontend/.env.example` για τη διεύθυνση του operator) και στα [`AUTHORS`](../AUTHORS) και [`NOTICE.md`](../NOTICE.md).

---

## Δείτε επίσης

- [02-deployment.en.md](02-deployment.en.md) — τυπικό single-node deployment
- [05-security-architecture.en.md](05-security-architecture.en.md) — μοντέλο ασφαλείας και μοντέλο απειλών (η βάση για απαιτήσεις HA)
- [11-operations.en.md](11-operations.en.md) — backup, restore, συντήρηση — τα δομικά στοιχεία πάνω στα οποία στηρίζεται το HA

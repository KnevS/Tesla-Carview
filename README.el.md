# ⚡ Tesla Carview

[![Version](https://img.shields.io/badge/version-v3.17.0-E31937?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-PolyForm_Noncommercial-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry_Pi_%7C_Linux_%7C_VPS-lightgrey?style=flat-square)](docs/02-deployment.en.md)

> 🇩🇪 [Deutsch](README.md) · 🇬🇧 [English](README.en.md) · 🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md) · 🇹🇷 [Türkçe](README.tr.md) · 🇺🇦 [Українська](README.uk.md)
>
> 📋 [Changelog](CHANGELOG.md) · 📚 [Τεκμηρίωση](docs/README.en.md)
>
> 🤖 *Οι μεταφράσεις για FR/ES/TR/EL/UK δημιουργούνται με τη βοήθεια AI από DE/EN. Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> **© 2026 Sven Krische** · Αδειοδοτημένο υπό [PolyForm Noncommercial 1.0.0](LICENSE) · [AUTHORS](AUTHORS) · [NOTICE](NOTICE.md)
> Πρωτότυπος σχεδιασμός, αρχιτεκτονική και υλοποίηση από τον Sven Krische ([@KnevS](https://github.com/KnevS)).

**Car Usability Management** — αυτο-φιλοξενούμενο, χωρίς cloud, χωρίς τρίτους.
Από διαδρομές GPS και ημερολόγιο διαδρομών έως σχεδιασμό διαδρομής με προγραμματισμό φόρτισης και αρχεία συντήρησης:
όλα τα δεδομένα του οχήματος παραμένουν στον δικό σας server.

Εκτελείται σε: **Linux servers** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), τοπική ανάπτυξη.

<!-- Operator-Hinweis im Footer / Footer note for operators:
     Wer Tesla Carview selbst hostet, kann die eigenen Kontaktdaten
     ueber frontend/.env (siehe frontend/.env.example) einsetzen.
     Self-hosters can configure their own footer contact via the .env. -->


---

## ⚠ Σημαντικό — Κατάσταση Tesla API τον 2026

Η Tesla έκλεισε το **ανεπίσημο Owner API** για τα endpoints οχημάτων μεταξύ Μαΐου και Ιουνίου 2026. Η προηγουμένως κοινή λύση της κοινότητας (σύνδεση με refresh token λογαριασμού Tesla, κλήση `/api/1/vehicles/{id}/vehicle_data`) επιστρέφει πλέον **HTTP 401 "invalid bearer token"** — η λύση είναι νεκρή και κανένα patch δεν μπορεί να την αναβιώσει.

Για ζωντανά δεδομένα οχήματος (μπαταρία, κλιματισμός, TPMS, τηλεμετρική ροή) υπάρχει **μόνο μία επίσημη οδός**: το **Fleet API** της Tesla με έγκριση εφαρμογής μέσω [developer.tesla.com](https://developer.tesla.com/). Ο τρέχων χρόνος αναμονής είναι **εβδομάδες έως μήνες**.

**💡 Δωρεάν όριο Tesla — η τυπική ιδιωτική χρήση κοστίζει 0 €/μήνα:** Η Tesla παρέχει **10 USD δωρεάν πίστωση ανά λογαριασμό κάθε μήνα** — συνήθως αρκεί για να καλύψει τη ροή τηλεμετρίας ενός οχήματος και τις καθημερινές εντολές. Πέρα από αυτό η χρέωση είναι pay-as-you-go (150.000 σήματα stream = 1 USD, 1.000 εντολές = 1 USD, 50 wake-ups = 1 USD). Το TeslaView είναι πλήρως έτοιμο — τη στιγμή που εγκρίνεται η εφαρμογή σας, όλες οι λειτουργίες ενεργοποιούνται αμέσως. Η αναμονή είναι αποκλειστικά από την πλευρά της Tesla· το ίδιο το TeslaView παραμένει πάντα δωρεάν.

**Τι προσφέρει ακόμα το TeslaView χωρίς έγκριση Fleet API:**

| Σύνδεση | Πηγή δεδομένων | Τι παίρνετε | Εγκατάσταση |
|---|---|---|---|
| **OwnTracks** (συνιστάται, άμεσο) | Smartphone οδηγού | Διαδρομές, GPS track, απόσταση, ταχύτητα | Wizard βήμα 5, ~5 λεπτά |
| **Tesla Fleet OAuth** | Tesla cloud | Μπαταρία, κλιματισμός, TPMS, όλα μέσω polling | Απαιτείται έγκριση Fleet API |
| **Tesla Fleet Telemetry** | Tesla → push WebSocket | Ζωντανή ροή | Fleet API + Virtual Key + **εγγραφή εφαρμογής με 1 κλικ στον οδηγό** (v3.23.5) |
| **Tesla Owner API** | Tesla cloud | ❌ **μπλοκαρισμένο το 2026** | — |
| **Ενσωμάτωση Monta** | Monta cloud | Κόστος οικιακής φόρτισης για χρέωση εταιρικού αυτοκινήτου | API key στο wizard |

**Συγκεκριμένα για νέες εγκαταστάσεις χωρίς έγκριση Fleet:** ενεργοποιήστε το OwnTracks — λαμβάνετε ένα νομικά συμβατό ημερολόγιο διαδρομών βασισμένο σε GPS, heatmap διαδρομών, παρακολούθηση απόστασης, αυτόματη ανάθεση οδηγού. Οι ελλείπουσες τιμές μπαταρίας/κλιματισμού δεν είναι αυστηρά απαραίτητες για ένα κλασικό επιχειρηματικό ημερολόγιο διαδρομών.

---

## Χαρακτηριστικά

| Περιοχή | Περιγραφή |
|---|---|
| **Dashboard** | Συνολικά στατιστικά, τελευταία διαδρομή, μηνιαίο γράφημα απόστασης |
| **Διαδρομές** | GPS track στον χάρτη, κατανάλωση, ταχύτητα, SoC με την πάροδο του χρόνου |
| **Μετρήσεις διαδρομής** (v3.37.0) | Πίνακας ανά διαδρομή: διάρκεια, απόσταση, κατανάλωση, ταχύτητα και ισχύς ως ελάχ./μέγ./μέσος — ταξινομήσιμος, με κάρτες σύνοψης και εξαγωγή CSV |
| **Χάρτης θερμότητας** (v3.41.0) | Γεωγραφικός χάρτης θερμότητας με τέσσερα εναλλάξιμα επίπεδα: διαδρομές (πυκνότητα αφετηρίας/προορισμού), φορτίσεις, καθορισμένα σημεία φόρτισης και δρομολόγια (ως γραμμές) — επιλέξιμο εύρος χρόνου, προσαρμόσιμα χρώματα επιπέδων, χωρίς εξωτερικά πρόσθετα χάρτη |
| **Ανάλυση ζωνών** (v3.39.0) | Ανάλυση της διαδρομής ανά ζώνες: εύρη ταχύτητας, δικές σου ζώνες (geofences/σημεία φόρτισης) ή ελεύθερο τμήμα — τιμές σε πίνακα + επισήμανση στον χάρτη, δείκτες (Vmax, μέγιστη ισχύς, ανάκτηση, στάσεις) |
| **Προγραμματιστής φόρτισης** (v3.42.0) | Φθηνότερα διαστήματα φόρτισης πριν την αναχώρηση από το δυναμικό τιμολόγιο (aWattar/Tibber): από την επιθυμητή φόρτιση, τη χωρητικότητα μπαταρίας, την ισχύ φόρτισης και την ώρα αναχώρησης επιλέγει τις φθηνότερες ώρες — με κόστος, διάρκεια φόρτισης και εξοικονόμηση σε σχέση με άμεση φόρτιση. Μόνο ανάλυση της καμπύλης τιμών, χωρίς πρόσβαση στο όχημα |
| **Διαχωρισμός εταιρικού οχήματος** (v3.43.0) | Διαχωρίζει τη φόρτιση στο σπίτι σε επαγγελματική/ιδιωτική και την εξάγει ως PDF αποζημίωσης — πάγιο (γερμανικό § 3 Nr. 50 EStG, 30/70 €) ή μερίδιο km (επαγγελματικό μερίδιο km × κόστος φόρτισης στο σπίτι). Μόνο εταιρικά οχήματα, στα γερμανικά |
| **Φόρτιση** | Συνεδρίες φόρτισης με κόστος, αντιστοίχιση τοποθεσίας φόρτισης βασισμένη σε GPS, δωρεάν συνεδρίες μπορούν να επισημανθούν |
| **Τοποθεσίες φόρτισης** | Καθορίσιμα σημεία με ακτίνα GPS, τιμή/kWh, αυτόματη ανίχνευση |
| **Μπαταρία / Battery-Health Companion** | Φάση 1 (v3.6.0): ιστορικό αυτονομίας, υποβάθμιση, καμπύλη φόρτισης, αποδοτικότητα έναντι εξωτερικής θερμοκρασίας, phantom drain, ανωμαλίες — όλα καθαρά στατιστικά από τα δικά σας δεδομένα. Φάση 2 (v3.7.0): επίμονες ειδοποιήσεις ανωμαλιών μέσω push + προτάσεις προ-κλιματισμού σε παγετό/ζέστη (Open-Meteo) |
| **App hub** (v3.9.0) | Επιμελημένες web apps για τον browser της Tesla: ARD Audiothek, Deutschlandfunk Live, GoingElectric, OpenChargeMap, Telegram Web, Wikipedia, ABRP — δωρεάν, χωρίς αναγκαστικό λογαριασμό, **σκόπιμα χωρίς διπλότυπα** των native apps της Tesla. Admin whitelist ανά tenant. Οι διαχειριστές προσθέτουν δικές τους web εφαρμογές (v3.40.0). |
| **Nearby** (v3.13.0) | POIs γύρω σας (καφέ, τουαλέτες, παιδική χαρά, **geocaches**, σούπερ μάρκετ, θέα…) μέσω OpenStreetMap Overpass. Επιλογέας πηγής: τρέχουσα θέση οχήματος / ενεργή συνεδρία φόρτισης / τελευταία διαδρομή. Τοπική cache 24 ωρών |
| **Σημεία φόρτισης με αυτόματο όριο** (v3.12.0) | Διαχείριση οικιακών/εργασιακών/συχνών φορτιστών: όνομα, GPS, ακτίνα, χρέωση, επιθυμητό όριο φόρτισης. Κατά την άφιξη → εντολή Tesla `set_charge_limit` (Fleet API) ή push υπενθύμιση ως εφεδρεία |
| **Επικύρωση OwnTracks** (v3.11.0) | Τρεις γραμμές άμυνας ενάντια σε ψευδείς εγγραφές: επικύρωση Bluetooth μέσω iOS Shortcut, κλείδωμα διαδρομής ανά όχημα, χειροκίνητο toggle παύσης — αποτρέπει διαδρομές car-sharing ή διπλή καταγραφή με 2+ συσκευές από το να μολύνουν το ημερολόγιο |
| **Διεύθυνση πριν από συντεταγμένες** (v3.10.0) | Όλες οι λίστες και προβολές λεπτομερειών προτιμούν τη διεύθυνση· lat/lon μόνο ως εφεδρεία (4 δεκαδικά ψηφία, ~11 m) |
| **Αυτόματη γεωκωδικοποίηση** (v3.8.0) | Διαδρομές/συνεδρίες φόρτισης με GPS αλλά χωρίς διεύθυνση επιλύονται αυτόματα μέσω Nominatim/OSM — live hook + νυχτερινό backfill + admin trigger, αποθηκευμένο τοπικά για 24 ώρες
| **Tech** | Ζωντανή τηλεμετρία: TPMS, ροή ισχύος, κλιματισμός, κατάσταση φόρτισης |
| **Έλεγχοι** | Εντολές οχήματος: κλιματισμός, climate-keeper (dog/camp), θέρμανση καθισμάτων (5 θέσεις × 4 επίπεδα), θέρμανση τιμονιού, πόρτες, frunk/πορτμπαγκάζ, παράθυρα, sentry mode, φόρτιση συμπεριλαμβανομένου slider amps και θύρας φόρτισης, προγραμματισμός αναχώρησης, boombox, ενημέρωση λογισμικού, πλοήγηση (απαιτείται Virtual Key) |
| **Σχεδιαστής διαδρομής** | Διαδραστικός σχεδιαστής διαδρομής με στάσεις φόρτισης ευαίσθητες σε SoC, συμπεριλαμβανομένης εκτίμησης χρόνου φόρτισης· SoC αναχώρησης (live ή χειροκίνητο), στόχος SoC και στόχος φόρτισης διαμορφώσιμα· καιρός (Open-Meteo), κίνηση (HERE Maps), κάμερες ταχύτητας (OpenStreetMap) κατά μήκος της διαδρομής· προβολή χάρτη με tile proxy |
| **Ημερολόγιο διαδρομών** | Ηλεκτρονικό Fahrtenbuch συμβατό με BMF: ταξινόμηση, επιχειρηματικός εταίρος, σκοπός, στήλες οδομέτρου, διαδοχική αρίθμηση σε PDF, κλείδωμα μετά την εξαγωγή, χειροκίνητη καταχώρηση, συγχώνευση/διαχωρισμός διαδρομής |
| **Χρέωση** | Συνεδρίες οικιακής φόρτισης & ενσωμάτωση Monta για όλα τα οχήματα· δήλωση κόστους (PDF, πρότυπο επιστροφής) για εταιρικά αυτοκίνητα |
| **Μητρώο σέρβις** | Συντήρηση, επισκευές, ελαστικά, επιθεωρήσεις με κόστος |
| **Εξαγωγή** | Εξαγωγή CSV/JSON/**PDF** για διαδρομές & φόρτιση, πλήρες backup· PDF ημερολόγιο διαδρομών έτοιμο για εκτύπωση με ημερομηνία, απόσταση, ενέργεια, SOC |
| **Διαστήματα σέρβις** | Επαναλαμβανόμενες εργασίες σέρβις ανά όχημα (ΚΤΕΟ, ελαστικά, υγρό φρένων, …) με διαστήματα χρόνου και km + καθημερινές push υπενθυμίσεις |
| **Audit log** | Admin viewer για συμβάντα ασφαλείας με φίλτρα και εξαγωγή CSV (φιλικό προς GDPR) |
| **Δυναμικό τιμολόγιο** | Ενσωμάτωση aWattar (DE/AT) και Tibber: 24ωρη καμπύλη τιμών στο dashboard, προγραμματισμός φόρτισης με ένα κλικ στο φθηνότερο παράθυρο 4 ωρών |
| **PDF επιστροφή κόστους** | PDF προς υπογραφή για επιστροφή κόστους οικιακής φόρτισης (client-side, χωρίς cloud) |
| **Ειδοποιήσεις** | Web Push + Telegram + **email** παράλληλα σε τέλος φόρτισης, όρια SOC, geofence και υπενθυμίσεις συντήρησης — κάθε κανάλι ρυθμίζεται ξεχωριστά |
| **Telegram bot** | Πλήρες 1:1 bot με inline buttons: `/status` (με κουμπιά lock/climate/sentry/charge + επιβεβαίωση unlock), `/battery`, `/range`, `/location` (σύνδεσμος Maps), `/today`, `/trips`, `/classify` (ετικέτα διαδρομής), `/service`, `/firmware`, `/clean` — συν προληπτικό push για ολοκλήρωση φόρτισης, ειδοποιήσεις sentry, υπενθυμίσεις σέρβις και νέες εκδόσεις firmware. Audit log για κάθε ενέργεια οχήματος. Δείτε ["Γιατί Telegram, όχι WhatsApp / Signal;"](#γιατί-telegram-όχι-whatsapp--signal) παρακάτω |
| **Εγχειρίδιο χρήστη** | Πλήρης οδηγός αναγνώσιμος απευθείας μέσα στην εφαρμογή |
| **Σχεδιασμός & θέματα** | 5 στυλ σχεδιασμού (Glass, Cyber, Minimal, Sport, **Nevs-Edition**) + 6 χρώματα έμφασης, όλα αποθηκευμένα τοπικά· Nevs-Edition με τη δική του τυπογραφία Bricolage Grotesque και ζωντανή γραμμή κατάστασης |
| **Ρυθμίσεις** | Όλες οι ενότητες αναδιπλώσιμες και ξεχωριστά αναδιαταξιμές (drag-to-sort) |
| **Πλοήγηση** | Ταξινομήσιμες, ξεχωριστά αποκρύψιμες καταχωρήσεις πλοήγησης |
| **Mobile / Tesla** | Εγκαταστάσιμη PWA για iPhone/iPad (Safari), Android, τον in-car browser της Tesla και desktop. Bottom tab bar τύπου iOS (4 γρήγορες καρτέλες + bottom sheet "More"). Συμπαγής προβολή κάρτας στο ημερολόγιο διαδρομών σε στενές οθόνες. |
| **Ισοζύγιο CO₂** | Αυτόνομη σελίδα που συγκρίνει το CO₂ που εξοικονομήθηκε έναντι ισοδύναμου βενζινοκίνητου (6,5 l/100 km), ισοδύναμα σε δέντρα/έτος και πτήσεις μετ' επιστροφής Φρανκφούρτη–Μαγιόρκα, διαφανής μεθοδολογία. Επίσης εβδομαδιαία στο Energy Report. |
| **Εβδομαδιαία σύνοψη** | Κάθε Δευτέρα στις 07:00 αυτόματα: km, κατανάλωση, κόστος φόρτισης, τάση έναντι προηγούμενης εβδομάδας — μέσω push, Telegram και email |
| **Κατανάλωση βάσει καιρού** | Συσχέτιση κατανάλωσης ανά διαστήματα θερμοκρασίας (< −10 °C έως > 30 °C) στο Energy Report — δείχνει πώς το κρύο και η ζέστη επηρεάζουν την αυτονομία |
| **Στατιστικά κλιματισμού** | Καθημερινή χρήση AC (ώρες), θέρμανση καθισμάτων, αριθμός προ-κλιματισμών, ψυχρότερη/θερμότερη ημέρα |
| **Firmware tracker** | Καταγράφει αυτόματα κάθε νέα έκδοση λογισμικού οχήματος με ιστορικό και ημέρες εγκατεστημένο |
| **Community Benchmark** | Opt-in ανώνυμη σύγκριση κατανάλωσης με άλλους οδηγούς του ίδιου μοντέλου· k-anonymity, SHA-256 hash, συμβατό με GDPR |
| **Κατάσταση συστήματος** | Κάρτα φωτεινής σηματοδότησης (Tesla token, Virtual Key, Fleet Telemetry, poller, DB) — πράσινο/κίτρινο/κόκκινο με μια ματιά |
| **Λειτουργικός αυτοέλεγχος** (v3.32) | Αυτοέλεγχος διαχειριστή στο **Σύστημα**: κατ' απαίτηση και αυτόματα κάθε εβδομάδα στη νυχτερινή συντήρηση ελέγχει την ασφάλεια και την ακεραιότητα των αντιγράφων ασφαλείας — κάλυψη MFA, κλειδί κρυπτογράφησης, κρίσιμα μυστικά, δραστηριότητα αρχείου καταγραφής ελέγχου, ακεραιότητα SQLite, καθώς και επικαιρότητα και ακεραιότητα του τελευταίου αντιγράφου — ως αναφορά φωτεινής σηματοδότησης. Καθαρά διαγνωστικά, χωρίς ΤΝ |
| **Heatmap δραστηριότητας** | Heatmap ημερολογίου όλων των διαδρομών (Έτος/Μήνας/Εβδομάδα/Όλα), το κλικ πλοηγεί στη λίστα διαδρομών εκείνης της ημέρας |
| **Ψευδώνυμο tenant** | Απόρρητο: η σελίδα σύνδεσης εμφανίζει τυχαίο ψευδώνυμο `επίθετο-ουσιαστικό` αντί του πραγματικού ονόματος tenant, αναγεννώμενο από admin |
| **Fleet Telemetry first** | WebSocket streaming ως προτιμώμενη πηγή δεδομένων (απαιτείται έγκριση Tesla). Όταν είναι ενεργό → ο poller πέφτει σε heartbeat 1×/h, εξοικονομώντας >95 % του API budget. Διαφορετικά API polling ως εφεδρεία |
| **Εγγραφή Tesla με 1 κλικ** (v3.23.5) | Ο οδηγός εγγράφει την εφαρμογή σας στην Tesla μόνος του (`partner_accounts`) — χωρίς terminal, χωρίς `curl`. Εισαγάγετε Client ID + Secret, επιβεβαιώστε τον τομέα, εγγραφή. Το secret παραμένει στον διακομιστή, ο τομέας = `FRONTEND_URL` (μη πλαστογραφήσιμος). Προϋπόθεση για Fleet Telemetry |
| **Κρυπτογράφηση εν ηρεμία** | AES-256-GCM για Tesla OAuth tokens, μυστικό TOTP MFA, ιδιωτικό κλειδί Virtual-Key. Hash + timing-safe σύγκριση για tokens επαναφοράς κωδικού. Αυτόματα δημιουργημένο κλειδί στο `data/.encryption-key` |
| **Αυτόματα ενημερωνόμενη PWA** | Ο service worker ανιχνεύει deploys και κάνει αυτόματη επαναφόρτωση — δεν απαιτείται `Ctrl+Shift+R`, συμπεριλαμβανομένης της iOS PWA |

---

## Προεπισκόπηση

Ζωντανά screenshots από το demo instance, ανανεωμένα καθημερινά στις 04:45:

<table>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/dashboard.png" alt="Dashboard" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/trips.png" alt="Trips" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/charging.png" alt="Charging" /></td>
  </tr>
  <tr>
    <td align="center"><em>Dashboard</em></td>
    <td align="center"><em>Διαδρομές</em></td>
    <td align="center"><em>Φόρτιση</em></td>
  </tr>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/routes.png" alt="Route planner" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/telemetry.png" alt="Telemetry" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/settings.png" alt="Settings" /></td>
  </tr>
  <tr>
    <td align="center"><em>Σχεδιαστής διαδρομής</em></td>
    <td align="center"><em>Τηλεμετρία</em></td>
    <td align="center"><em>Ρυθμίσεις</em></td>
  </tr>
</table>

📸 Live demo: **[demo.teslaview.krische.com](https://demo.teslaview.krische.com)** · [Mobile view](https://www.teslaview.krische.com/shots/mobile/dashboard.png) · [Όλα τα screenshots](https://www.teslaview.krische.com/#screens)

### Telegram bot

Συνδέστε τον λογαριασμό σας στις *Ρυθμίσεις → Telegram* και χρησιμοποιήστε το bot απευθείας σε iPhone/Android:

<table>
  <tr>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-status.png" alt="/status with inline buttons" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-notification.png" alt="Push notification" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-classify.png" alt="Classify a trip" /></td>
  </tr>
  <tr>
    <td align="center"><em>/status με inline buttons</em></td>
    <td align="center"><em>Push ειδοποίηση</em></td>
    <td align="center"><em>Ταξινόμηση διαδρομής</em></td>
  </tr>
</table>

Εντολές: `/status`, `/battery`, `/range`, `/location`, `/today`, `/trips`, `/classify`, `/service`, `/firmware`, `/clean`, `/help`, `/unlink`. Inline buttons κάτω από `/status` για lock/unlock (με επιβεβαίωση), κλιματισμό, sentry, φόρτιση. Push ειδοποιήσεις για ολοκλήρωση φόρτισης, ειδοποιήσεις sentry, υπενθυμίσεις σέρβις και ενημερώσεις λογισμικού — παράλληλα με Web Push.

[Δείτε όλα τα mockups του Telegram ↗](https://www.teslaview.krische.com/#telegram)

#### Γιατί Telegram, όχι WhatsApp / Signal;

Μας ρωτούν συχνά — σύντομη περίληψη:

| Υπηρεσία | Αυτο-φιλοξενούμενη; | API ιδιωτικού bot; | Χρησιμοποιείται εδώ |
|---|---|---|---|
| **Telegram** | Bot API πλήρως ανοιχτό, BotFather είναι δωρεάν, χωρίς ρίσκο λογαριασμού | ✅ Ναι | ✅ **Ναι, κύριο κανάλι** |
| **WhatsApp** | Μόνο μέσω Meta Cloud API (Business λογαριασμός + επαληθευμένος επαγγελματικός αριθμός + έγκριση template). Η ιδιωτική χρήση με τον δικό σας αριθμό **δεν προβλέπεται**. Ανεπίσημες βιβλιοθήκες (whatsapp-web.js, baileys) αποτελούν **παραβίαση ToS** και οδηγούν σε αποκλεισμό λογαριασμού. | ❌ Όχι για ιδιώτες χρήστες | ❌ **Όχι** — σκόπιμα δεν υλοποιήθηκε |
| **Signal** | Δεν υπάρχει επίσημος bot server, ούτε webhook API. Αυτο-φιλοξενούμενα forks (signald) είναι εύθραυστα και μπλοκάρονται τακτικά από το Signal. | ❌ Όχι | ❌ **Όχι** |
| **Threema** | Επίσημο REST API για επιχειρήσεις — αλλά επί πληρωμή (~50€/χρόνο gateway λογαριασμός) | ⚠ Ναι, εμπορικό | ❌ Δεν υλοποιήθηκε (επί πληρωμή) |
| **Web Push** (PWA) | Πρότυπο browser, τρέχει απευθείας σε iPhone/Android, χωρίς λογαριασμό, χωρίς τρίτο server πέραν της υπηρεσίας push του browser | ✅ Ναι | ✅ **Ναι, κύριο κανάλι** |

**Συμπέρασμα:** Telegram + Web Push μαζί καλύπτουν τα πιο σημαντικά κανάλια — χωρίς κόστος τρίτων, χωρίς παραβιάσεις ToS, χωρίς tracking. Το WhatsApp θα ήταν τεχνικά δυνατό, αλλά η εγκατάσταση (επιχειρηματική δομή με τη διαδικασία έγκρισης της Meta) έρχεται σε αντίθεση με τη φύση αυτο-φιλοξενίας του TeslaView. Αν θέλετε πραγματικά WhatsApp: bridge λύσεις όπως το *whatsapp-web.js* μπορούν να προστεθούν από power users οι ίδιοι — δεν το συνιστούμε.

---

## Αρχιτεκτονική πολλαπλών tenants (από την v2.0)

Από την v2.0 το Tesla Carview υποστηρίζει **πολλαπλούς tenants** με πλήρη απομόνωση δεδομένων:

- Κάθε tenant έχει τη δική του βάση δεδομένων SQLite
- Νέοι tenants μόνο μέσω **invite link** με προαιρετική **σημείωση** (Admin → Χρήστες → Δημιουργία invite link, ισχύει 7 ημέρες, μίας χρήσης)· τα invites μπορούν να επανεκδοθούν, soft-revoked ή να διαγραφούν
- **Πολλαπλά οχήματα** ανά tenant: συγχρονισμός μέσω Ρυθμίσεις → 🔄 Συγχρονισμός οχημάτων
- **Διαχείριση χρηστών** ανά tenant (ρόλοι, ανάθεση οχημάτων, κλείδωμα) με λεπτομερή δικαιώματα: `Επεξεργασία οχημάτων`, `Προσθήκη οχημάτων`, `Απαιτείται MFA` ανά χρήστη
- **Υποχρεωτικό MFA για νέους λογαριασμούς** — ο router guard ανακατευθύνει στη ρύθμιση TOTP μέχρι να είναι ενεργό το MFA
- **Κάρτα εργασιών admin** εμφανίζει ενεργούς χρήστες χωρίς εκχωρημένο όχημα με ενέργειες ενός κλικ
- **Καταχωρήσεις ημερολογίου διαδρομών παρακολουθούν τον συγγραφέα τους** και τον εμφανίζουν δίπλα σε κάθε καταχώρηση
- **Έλεγχος ταυτότητας Passkey** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Επαναφορά κωδικού** μέσω συνδέσμου που δημιουργείται από admin
- **Ανίχνευση οικιακής wallbox μέσω Monta** (αντιστοίχιση charge-point-ID → 🏠 σήμανση στη λίστα φόρτισης και στη χρέωση)
- **Δωρεάν συνεδρίες φόρτισης**: επισημάνσιμες στο ιστορικό φόρτισης, εξαιρούνται από τη χρέωση
- **Version bump σε νομικές σελίδες** γράφει αυτόματα τη σημερινή ημερομηνία στη γραμμή "Stand:" πριν από την αύξηση

---

## Απαιτήσεις συστήματος

| Στοιχείο | Ελάχιστο | Συνιστώμενο | Σημείωση |
|---|---|---|---|
| **CPU** | 1 πυρήνας | 2+ πυρήνες | Pi 5 / VPS / x86 — ARM64 + AMD64 υποστηρίζονται |
| **RAM** | 2 GB | 4+ GB | με Ollama: 4+ GB απαιτούνται (μοντέλο 1B), 8+ GB για μοντέλα 3B |
| **Δίσκος** | 2 GB | 10+ GB | με Ollama: επιπλέον 1–20 GB ανά μοντέλο |
| **OS** | Συμβατό με Docker | Debian/Ubuntu/Pi OS | συνιστάται βασισμένο σε systemd |
| **Internet** | όχι | DSL+ | για Tesla API + GHCR image pulls + Ollama λήψεις μοντέλων |

### Πίνακας υλικού για AI-mode (Ollama τοπικό)

Εάν θέλετε να χρησιμοποιήσετε το τοπικό AI chat με κυριαρχία δεδομένων (Ollama, ενεργοποιημένο από προεπιλογή):

| Υλικό | Συνιστώμενο μοντέλο | RAM | tok/s (inference) | Χρησιμοποιήσιμο για |
|---|---|---|---|---|
| Pi 4 (4 GB) | `llama3.2:1b` | ~1.5 GB | 4–6 | απλές Q&A, η καθυστέρηση είναι αισθητή |
| Pi 4 (8 GB) | `qwen2.5:1.5b` | ~1.8 GB | 3–5 | καλύτερο, ακόμα αργό |
| Pi 5 (8 GB) | `qwen2.5:3b` | ~3 GB | 4–6 | συνιστώμενη προεπιλογή |
| VPS (4 vCPU / 8 GB) | `qwen2.5:3b` | ~3 GB | 8–12 | άνετο |
| VPS / workstation (16 GB+) | `llama3:8b` | ~6.5 GB | 5–8 | πολύ καλό, λίγο πιο αργό |
| GPU (8+ GB VRAM) | `llama3:8b` ή παρόμοιο | ανά μοντέλο | 30–80+ | enterprise-grade |

**Απενεργοποιήστε το Ollama** εάν το υλικό σας δεν μπορεί να το εκτελέσει — δημιουργήστε ένα `docker-compose.override.yml` με:
```yaml
services:
  ollama:
    profiles: [disabled]
```
Στη συνέχεια `docker compose up -d` χωρίς Ollama. Ή απλούστερα: στο wizard ορίστε `AI provider = Off`. Εναλλακτική cloud: `AI provider = Grok` (απαιτείται xAI API key, τα δεδομένα πηγαίνουν στο cloud).

## Quickstart

> **⏳ Προετοιμασία από πλευράς Tesla (μπορεί να εκτελεστεί παράλληλα με την εγκατάσταση):**
> Η χρήση του Tesla Fleet API σημαίνει εγγραφή μιας εφαρμογής στο [developer.tesla.com](https://developer.tesla.com/). **Η έγκριση της Tesla μπορεί να πάρει 1–3 εβδομάδες.** Η ίδια η εγκατάσταση λειτουργεί χωρίς αυτή — κάθε χαρακτηριστικό μη-Tesla είναι άμεσα διαθέσιμο και μπορείτε να προσθέσετε τα Tesla credentials αργότερα μέσω `bash deploy/setup-wizard.sh`. Δείτε [docs/04-tesla-api.en.md](docs/04-tesla-api.en.md) για τα βήματα και τη ρύθμιση Virtual Key.

### Raspberry Pi / Linux server (συνιστώμενο)

```bash
# Ως root στο μηχάνημα προορισμού:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Το script ανιχνεύει αυτόματα την αρχιτεκτονική (x86_64, ARM64, ARMv7) και εγκαθιστά τα πάντα.

### Τοπική ανάπτυξη

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# Backend
cd backend
cp .env.example .env
# προσαρμόστε το .env (το JWT_SECRET είναι υποχρεωτικό!)
npm install && npm run dev

# Frontend (δεύτερο terminal)
cd frontend && npm install && npm run dev
```

→ ανοίξτε browser: **http://localhost:5173**
→ στην πρώτη εκκίνηση ανακατευθύνεστε αυτόματα στο setup wizard

### Μόνο διαμόρφωση (χωρίς εγκατάσταση)

```bash
bash deploy/setup-wizard.sh
```

Διαδραστικός βοηθός για: domain, Tesla API credentials, e-mail, Web Push.

---

## Αρχική διαμόρφωση (web wizard)

Στην πρώτη εκκίνηση η εφαρμογή ανακατευθύνει στο **/setup** αυτόματα.
Εκεί μπορείτε να δημιουργήσετε το όνομα tenant και τον λογαριασμό διαχειριστή στον browser.

Συνιστώμενα βήματα μετά τη σύνδεση:
1. Σύνδεση οχήματος Tesla (Ρυθμίσεις → Tesla)
2. Καταχώρηση Virtual Key στο όχημα (Ρυθμίσεις → Virtual Key)
3. Ενεργοποίηση MFA (Ρυθμίσεις → Έλεγχος ταυτότητας δύο παραγόντων)
4. Διαμόρφωση τοποθεσιών φόρτισης

Το **εγχειρίδιο χρήστη** είναι διαθέσιμο απευθείας μέσα στην εφαρμογή στο `/handbook`.

---

## Εντολές οχήματος & Virtual Key

Απαιτείται ένα **Virtual Key** για εντολές οχήματος (κλιματισμός, πόρτες, κόρνα, κ.λπ.).
Το Virtual Key επιτρέπει στην εφαρμογή να στείλει υπογεγραμμένες εντολές απευθείας στο όχημα.

**Προϋπόθεση**: ένα τρέχον [`tesla-http-proxy`](https://github.com/teslamotors/vehicle-command) στον server.

```bash
# εκκίνηση του proxy (παράδειγμα — προσαρμόστε τις διαδρομές):
tesla-http-proxy -port 4443 -host 0.0.0.0 \
  -tls-key /etc/tesla-proxy/server.key \
  -cert /etc/tesla-proxy/server.crt \
  -key-file /etc/tesla-proxy/tesla_priv.pem
```

Το δημόσιο κλειδί πρέπει να είναι προσβάσιμο στο `/.well-known/appspecific/com.tesla.3p.public-key.pem`
στο domain της εφαρμογής ώστε το όχημα να μπορεί να επαληθεύσει το κλειδί.


---

## Ενσωμάτωση Monta (προαιρετικά)

Το Tesla Carview υποστηρίζει προαιρετικό συγχρονισμό με το [Monta](https://monta.com) — μια υπηρεσία διαχείρισης φόρτισης EV. Η ενσωμάτωση είναι διαθέσιμη για **όλα τα οχήματα**:

- **Ιδιωτικά οχήματα**: Οι συνεδρίες φόρτισης Monta εμφανίζονται στην προβολή χρέωσης ως οικιακές φορτίσεις (🏠 badge, αυτόματη ανίχνευση οικιακής wallbox).
- **Εταιρικά αυτοκίνητα**: Επιπλέον, πλήρης χρέωση κόστους — μηνιαία επισκόπηση, φύλλο επιστροφής κόστους PDF προς υπογραφή, πρότυπο χρέωσης για τον εργοδότη.

Διαμόρφωση ανά όχημα στις ρυθμίσεις (Προφίλ οχήματος → Οικιακή φόρτιση):
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (φιλτράρει συνεδρίες σε συγκεκριμένο charge point)
- **Τιμή ρεύματος wallbox** (€/kWh, βάση χρέωσης για εταιρικά αυτοκίνητα)

Ο συγχρονισμός εκτελείται χειροκίνητα μέσω **Χρέωση → Monta Sync**.


---

## Ασφάλεια

- JWT (access token 15 λεπτά, refresh token 7 ημέρες ως httpOnly cookie)
- **TOTP MFA** (Google Authenticator, Authy, 1Password, κ.λπ.)
- **Passkeys** (WebAuthn, σύνδεση χωρίς κωδικό)
- **10 backup codes** (bcrypt-hashed, μίας χρήσης)
- **Κλείδωμα λογαριασμού** μετά από 5 αποτυχημένες προσπάθειες (15 λεπτά)
- **fail2ban** IP block μετά από 3 αποτυχημένες συνδέσεις (10 λεπτά)
- **HTTPS** με TLS 1.2/1.3, HSTS, OCSP stapling
- Headers **CSP, X-Frame-Options, Permissions-Policy**
- **Rate limiting** σε endpoints σύνδεσης και API
- **Audit log** όλων των ενεργειών που σχετίζονται με την ασφάλεια
- **Διαγραφή δεδομένων** με προειδοποίηση backup και κείμενο επιβεβαίωσης

---

## Tech stack

| Επίπεδο | Τεχνολογία |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) + WebAuthn (@simplewebauthn) |
| Δεδομένα Tesla | Tesla Fleet API (OAuth2) + Fleet Telemetry (WebSocket) |
| Multi-tenancy | Ξεχωριστές βάσεις δεδομένων SQLite ανά tenant, master DB για παγκόσμια δεδομένα |
| Deployment | Docker Compose + nginx + Let's Encrypt |
| Πλατφόρμες | linux/amd64 · linux/arm64 · linux/arm/v7 |

---

## Δομή έργου

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # schema + αρχικοποίηση DB (master-schema.sql)
│   │   ├── middleware/    # auth.js (multi-tenant JWT), security.js, validate.js
│   │   ├── routes/        # auth, setup, register, passkey, password-reset,
│   │   │                  # users, vehicles, trips, charging, data-management, …
│   │   └── services/      # teslaApi, poller (multi-tenant), dataSync (GPS), …
│   └── .env.example       # πρότυπο διαμόρφωσης
├── frontend/
│   └── src/
│       ├── views/         # Login, Register, Setup, Dashboard, Trips,
│       │                  # Settings (Passkey), UserManagement, DataManagement,
│       │                  # Handbook, PasswordReset, …
│       ├── components/    # NavBar (admin links, handbook), StatCard
│       ├── store/         # auth.js (passkey, tenant), index.js
│       └── router/        # routes με admin guard
├── deploy/
│   ├── setup.sh                  # πλήρως αυτοματοποιημένη εγκατάσταση server
│   ├── setup-wizard.sh           # διαδραστικός βοηθός διαμόρφωσης
│   ├── nginx-host.conf.template  # nginx config (HTTPS, TLS hardening)
│   └── update.sh                 # zero-downtime update
├── docs/                  # λεπτομερείς οδηγοί
├── docker-compose.yml          # development
└── docker-compose.prod.yml     # production
```

---

## Σημαντικές μεταβλητές περιβάλλοντος (.env)

| Μεταβλητή | Περιγραφή | Παράδειγμα |
|---|---|---|
| `JWT_SECRET` | Μυστικό κλειδί για JWT (≥ 32 χαρ., τυχαίο) | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Tesla Developer app client ID | `abc123…` |
| `TESLA_CLIENT_SECRET` | Tesla Developer app secret | `secret…` |
| `FRONTEND_URL` | Δημόσιο URL της εφαρμογής (για OAuth callback + passkeys) | `https://carview.example.com` |
| `RP_NAME` | Όνομα εμφάνισης για διαλόγους passkey | `Tesla Carview` |
| `RP_ID` | Domain για WebAuthn (χωρίς πρωτόκολλο) | `carview.example.com` |

---

## Τεκμηρίωση

Το Tesla Carview παρέχει δύο ξεχωριστά επίπεδα τεκμηρίωσης:

### 👤 Για χρήστες της εφαρμογής

Εγχειρίδιο εντός εφαρμογής στο `/handbook` στην εκτελούμενη εφαρμογή — ή διαβάστε το απευθείας στο [`frontend/src/handbook/handbook.en.md`](frontend/src/handbook/handbook.en.md). Θέματα: dashboard, διαδρομές, φόρτιση, ημερολόγιο διαδρομών συμβατό με BMF, έλεγχοι οχήματος, διαστήματα σέρβις, demo mode, εγκατάσταση mobile, αντιμετώπιση προβλημάτων από πλευράς χρήστη.

### 🛠 Για αυτο-φιλοξενούντες και διαχειριστές

Τεχνική τεκμηρίωση στον φάκελο [`docs/`](docs/README.en.md):

| Έγγραφο | Περιεχόμενο |
|---|---|
| [📚 Ευρετήριο Docs](docs/README.en.md) | Χάρτης κάθε τεχνικού εγγράφου |
| [Quickstart](docs/01-quickstart.en.md) | Τοπικό περιβάλλον ανάπτυξης |
| [Deployment](docs/02-deployment.en.md) | Server deployment + Raspberry Pi |
| [Έλεγχος ταυτότητας & MFA](docs/03-authentication.en.md) | Σύστημα σύνδεσης, MFA, passkeys |
| [Tesla Fleet API](docs/04-tesla-api.en.md) | Δημιουργία λογαριασμού Tesla Developer |
| [Αρχιτεκτονική ασφάλειας](docs/05-security-architecture.en.md) | Μοντέλο απειλής, όλα τα μέτρα |
| [fail2ban](docs/06-fail2ban.en.md) | Διαμόρφωση προστασίας brute-force |
| [Setup wizard](docs/07-setup-wizard.en.md) | Διαδραστικός βοηθός διαμόρφωσης |
| [Dokploy deployment](docs/08-dokploy.en.md) | Εναλλακτική πλατφόρμα deployment |
| [Tesla API quota](docs/09-tesla-api-usage.en.md) | Κόστος και παρακολούθηση API |
| **[🔧 Διαμόρφωση (ENV)](docs/10-configuration.en.md)** | Κάθε μεταβλητή περιβάλλοντος — απαιτούμενη, προαιρετική, demo, auto-update |
| **[🛠 Λειτουργίες](docs/11-operations.en.md)** | Backup/restore, νυχτερινή συντήρηση, demo mode, auto-update, logs |
| **[🛡️ Υψηλή διαθεσιμότητα (HA)](docs/12-high-availability.en.md)** | Επιλογές αρχιτεκτονικής για κρίσιμες SLA εγκαταστάσεις (teaser, κατόπιν αιτήματος) |

---

## Ενημερώσεις

```bash
bash deploy/update.sh
```

---

## Συνεισφορά

Οι συνεισφορές είναι ευπρόσδεκτες! Διαβάστε πρώτα τις [Οδηγίες Συνεισφοράς](CONTRIBUTING.md), στη συνέχεια επιλέξτε ένα [good first issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue) ή ανοίξτε ένα pull request απευθείας.

---

## Άδεια χρήσης

[**PolyForm Noncommercial 1.0.0**](LICENSE) — μη εμπορική άδεια λογισμικού από [polyformproject.org](https://polyformproject.org).

**Επιτρέπεται:** προσωπική χρήση, αυτο-φιλοξενία (συμπεριλαμβανομένης για οικογένεια/νοικοκυριό), τροποποιήσεις, δωρεάν αναδιανομή υπό τους ίδιους όρους, χρήση από φιλανθρωπικούς οργανισμούς, εκπαιδευτικά ιδρύματα και ιδρύματα δημόσιας έρευνας.

**Απαγορεύεται:** η πώληση του λογισμικού, η εκτέλεσή του ως υπηρεσία επί πληρωμή (SaaS) για τρίτους, εμπορική χρήση οποιουδήποτε είδους, sublicensing.

Οποιαδήποτε αναδιανομή πρέπει να περιλαμβάνει το πλήρες κείμενο της άδειας και το copyright `Required Notice`. Το λογισμικό παρέχεται "ως έχει", χωρίς εγγύηση — λεπτομέρειες δείτε [LICENSE](LICENSE).

### 📜 Δήλωση Prior-Art

Όλες οι τεχνικές διαδικασίες που τεκμηριώνονται σε αυτό το repository — ιδιαίτερα το **Battery-Health Companion** (φάση 1+2), η **επικύρωση OwnTracks μέσω Bluetooth trigger** με κλείδωμα διαδρομής ανά όχημα, το **αυτόματο όριο φόρτισης ανά γεω-περιφραγμένη τοποθεσία**, το **επιμελημένο hub web apps για τον browser της Tesla**, η **αναζήτηση POI γύρω από μια συνεδρία φόρτισης μέσω OSM Overpass**, η **αυτόματη αντίστροφη γεωκωδικοποίηση με τοπική cache**, η **στρατηγική UI με προτεραιότητα στη διεύθυνση** και η **πολυσταδιακή ανίχνευση ανωμαλιών με συστάσεις push** — δημοσιεύονται δημόσια από την ημερομηνία του αντίστοιχου Git commit και αποτελούν "prior art" κατά την έννοια του δικαίου διπλωμάτων ευρεσιτεχνίας και εμπορικών σημάτων.

Αυτή η αποκάλυψη αποσκοπεί στην αποτροπή μεταγενέστερων κατατεθειμένων δικαιωμάτων διανοητικής ιδιοκτησίας από τρίτους επί των ίδιων διαδικασιών.

Τα Git hashes και timestamps των commits είναι κρυπτογραφικά επαληθεύσιμα και ανεξάρτητα timestamped από το GitHub.

---

## ❤️ Υποστήριξη

Το Tesla Carview είναι δωρεάν και χωρίς διαφημίσεις **για ιδιωτική, αυτο-φιλοξενούμενη χρήση στο δικό σας νοικοκυριό** (δείτε [LICENSE](LICENSE) και [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)). Η εμπορική μεταπώληση, η φιλοξενία SaaS από τρίτους ή η ενσωμάτωση σε εμπορικά προϊόντα **δεν** επιτρέπεται.

Εάν το πρόγραμμα αξίζει κάτι για εσάς, οι ακόλουθοι μη κερδοσκοπικοί
οργανισμοί χαίρονται με την άμεση υποστήριξή σας:

| Οργανισμός | Περιγραφή |
|---|---|
| **Aktion Deutschland Hilft** | Συμμαχία οργανισμών αρωγής για γρήγορη και αποτελεσματική βοήθεια σε καταστροφές παγκοσμίως |
| **Lebenshilfe Rems-Murr** | Στήριξη, συνοδεία και ένταξη ατόμων με αναπηρία στην περιοχή Rems-Murr |
| **Radio 7 Drachenkinder** | Βοήθεια για σοβαρά άρρωστα παιδιά στην περιοχή — χρηματοδοτεί θεραπείες και ευχές |

> **Το 100 % της δωρεάς σας πηγαίνει απευθείας στον οργανισμό. Δεν βλέπουμε ούτε το ποσό ούτε τα δεδομένα σας.**

Προσβάσιμο στην εφαρμογή μέσω του συνδέσμου **❤ Υποστήριξη** στο footer στο κάτω μέρος κάθε σελίδας, ή απευθείας στο `/support`.

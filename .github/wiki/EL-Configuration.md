# Διαμόρφωση — Μεταβλητές Περιβάλλοντος

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Configuration)** | English version |
| 🇩🇪 **[Deutsch](DE-Configuration)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Configuration)** | Version française |
| 🇪🇸 **[Español](ES-Configuration)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Configuration)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Configuration)** | Βρίσκεστε εδώ |

---

Όλες οι ρυθμίσεις του Tesla Carview διαμορφώνονται μέσω του αρχείου `.env` στο `/opt/tesla-carview/backend/.env`.

Μετά από οποιαδήποτε αλλαγή στο `.env`, κάντε επανεκκίνηση του backend:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Απαιτούμενες ρυθμίσεις (πρέπει να οριστούν για να λειτουργεί η εφαρμογή)

| Μεταβλητή | Παράδειγμα | Περιγραφή |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Μυστικό κλειδί για υπογραφή tokens σύνδεσης. Δημιουργήστε με: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Από την Πύλη Tesla Developer |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Από την Πύλη Tesla Developer |
| `FRONTEND_URL` | `https://tesla.yourdomain.com` | Η δημόσια διεύθυνση URL της εγκατάστασής σας |
| `DATABASE_PATH` | `/app/data` | Πού αποθηκεύονται οι βάσεις δεδομένων (μην αλλάζετε στο Docker) |

---

## Προαιρετικό αλλά συνιστώμενο

| Μεταβλητή | Προεπιλογή | Περιγραφή |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Ορίστε σε `true` για αυτόματη νυχτερινή ενημέρωση |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Επιβολή ρύθμισης MFA για όλους τους νέους λογαριασμούς χρηστών |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Απαίτηση κωδικού πρόσκλησης για εγγραφή νέου tenant |
| `POLL_INTERVAL_MS` | `60000` | Πόσο συχνά να ελέγχεται το Tesla API όταν το αυτοκίνητο είναι ενεργό (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Διάστημα ελέγχου όταν το αυτοκίνητο κοιμάται (ms) |

---

## Δυναμική τιμολόγηση (τιμολόγηση ηλεκτρικής ενέργειας)

| Μεταβλητή | Περιγραφή |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — ενεργοποίηση aWATTar (DE/AT, δωρεάν) |
| `TIBBER_TOKEN` | Το token API Tibber σας (αποκτήστε στο [developer.tibber.com](https://developer.tibber.com)) |

---

## Για προχωρημένους / Fleet Telemetry

| Μεταβλητή | Περιγραφή |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — ενεργοποίηση GPS σε πραγματικό χρόνο μέσω Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Θύρα για διακομιστή Fleet Telemetry (προεπιλογή: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Διαδρομή προς αρχείο ιδιωτικού κλειδιού Virtual Key |

---

## Πώς να δημιουργήσετε ένα ασφαλές JWT_SECRET

```bash
openssl rand -hex 32
# Έξοδος: κάτι σαν a8f3e9b2c1d4...
# Αντιγράψτε αυτό στο αρχείο .env σας
```

---

## Έλεγχος της τρέχουσας διαμόρφωσής σας

```bash
# Προβολή τρέχοντος .env (προσοχή με την κοινοποίηση εξόδου — περιέχει μυστικά):
cat /opt/tesla-carview/backend/.env

# Ελέγξτε ποιες μεταβλητές περιβάλλοντος βλέπει το εκτελούμενο κοντέινερ:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Πλήρης αναφορά

Για μια πλήρη λίστα κάθε μεταβλητής περιβάλλοντος με λεπτομερείς περιγραφές, δείτε την τεχνική τεκμηρίωση:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)

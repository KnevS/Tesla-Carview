# Ρύθμιση του Tesla Fleet API

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](04-tesla-api.md)

## Στρατηγική πηγής δεδομένων (Telemetry-first, polling ως fallback)

Από την αλλαγή του υβριδικού poller (2026-05) το Tesla Carview προτιμά
το **Fleet Telemetry (push)** έναντι του polling. Και οι δύο διαδρομές είναι ενεργές, αλλά
ο poller αυτόματα κάνει fallback σε λειτουργία heartbeat μόλις
ξεκινήσει το Telemetry stream για ένα όχημα:

| Διαδρομή | Καθυστέρηση | Κόστος | Προϋπόθεση |
|---|---|---|---|
| **1. Fleet Telemetry (WebSocket push)** | 1–5 δευτ. live | δωρεάν | Εγκεκριμένο virtual key + HTTPS endpoint + Tesla whitelisting ανά VIN |
| **2. Fleet API polling (pull)** | 30s online / 5min idle | προϋπολογισμός $ ανά κλήση | Μόνο OAuth token |
| **3. Heartbeat polling** | 1×/ώρα | ελάχιστο | Αυτόματη ενεργοποίηση όταν το Telemetry είναι ενεργό για ένα VIN |

Υλοποίηση: `backend/src/services/poller.js`, streaming server στο
`backend/src/services/fleetTelemetry.js`, δείκτης κατάστασης ανά VIN στο
Settings → ⚡ Tesla connection → 📡 Fleet Telemetry.

> Το Fleet Telemetry απαιτεί έγκριση Tesla ανά **application client ID**
> στο Developer Portal. Χωρίς έγκριση το API διαμόρφωσης
> επιστρέφει HTTP 404 — η διαδρομή polling fallback συνεχίζει να λειτουργεί.

## Δημιουργία λογαριασμού Tesla Developer

1. Δημιουργήστε λογαριασμό στο https://developer.tesla.com
2. Δημιουργήστε μια νέα εφαρμογή:
   - **Όνομα**: Tesla Carview (ή ό,τι θέλετε)
   - **Allowed Origins**: `https://your-domain.com`
   - **Allowed Redirect URIs**: `https://your-domain.com/api/auth/callback`
3. Σημειώστε το **Client ID** και το **Client Secret**


---

## Διαμόρφωση .env

```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your-domain.com/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Περιοχές**:
> - Βόρεια Αμερική: `fleet-api.prd.na.vn.cloud.tesla.com`
> - Ευρώπη: `fleet-api.prd.eu.vn.cloud.tesla.com`
>
> Επιλέξτε την περιοχή που ταιριάζει στην τοποθεσία του οχήματός σας.

---

## Σύνδεση οχήματος Tesla

Αφού συνδεθείτε στην εφαρμογή, κάντε κλικ στον σύνδεσμο **"Connect Tesla"**
(ή απευθείας: `https://your-domain.com/api/auth/tesla/login`).

Ανακατευθύνεστε στη σελίδα σύνδεσης Tesla. Μετά την παραχώρηση πρόσβασης, το όχημα
ανιχνεύεται αυτόματα και ξεκινά ο συγχρονισμός.

---

## Δικαιώματα (OAuth scopes)

| Scope | Σκοπός |
|---|---|
| `openid` | Ταυτότητα Tesla |
| `offline_access` | Refresh token (χωρίς επαναλαμβανόμενη σύνδεση) |
| `vehicle_device_data` | Ανάγνωση δεδομένων διαδρομής, κατάστασης φόρτισης, μπαταρίας |
| `vehicle_cmds` | Εντολές οχήματος (μόνο με Virtual Key) |
| `vehicle_charging_cmds` | Εντολές φόρτισης |
| `vehicle_location` | Θέση GPS |

---

## Εντολές οχήματος (Virtual Key)

Για εντολές όπως κλιματισμός, κόρνα ή πόρτες απαιτείται επιπλέον ένα **Virtual Key**.
Ο proxy `tesla-http-proxy` υπογράφει τις εντολές κρυπτογραφικά — η Tesla δέχεται μόνο
εντολές που έχουν υπογραφεί με το ζεύγος κλειδιών.

### Βήματα ρύθμισης

1. **Δημιουργία ζεύγους κλειδιών**:
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out tesla_priv.pem
   openssl ec -in tesla_priv.pem -pubout -out tesla_pub.pem
   ```

2. **Σερβίρισμα του δημόσιου κλειδιού** στο:
   `https://your-domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. **Εγκατάσταση του `tesla-http-proxy`** και εκκίνηση:
   ```bash
   # κατεβάστε το binary από https://github.com/teslamotors/vehicle-command
   tesla-http-proxy -port 4443 -host 0.0.0.0 \
     -tls-key server.key -cert server.crt \
     -key-file tesla_priv.pem
   ```

4. **Καταχώριση του Virtual Key στο όχημα** μέσω της εφαρμογής (Settings → Virtual Key).

> **Σημαντικό**: το ιδιωτικό κλειδί (`tesla_priv.pem`) και το δημόσιο κλειδί
> (`.well-known/…`) πρέπει να παραμένουν ταιριασμένα. Ένα νέο ιδιωτικό κλειδί απαιτεί άλλη μια
> ενέργεια pairing στο όχημα.


---

## Διάστημα polling

Ο ενσωματωμένος poller ερωτά το Tesla API:
- **Κάθε 30 δευτερόλεπτα** όταν το όχημα είναι ενεργό (κίνηση ή φόρτιση)
- **Κάθε 5 λεπτά** όταν το όχημα κοιμάται (status 408)

Ο poller **δεν ξυπνά το όχημα** — η κατάσταση ύπνου γίνεται σεβαστή για διατήρηση της μπαταρίας.

Απενεργοποίηση του poller (π.χ. για δοκιμή): `ENABLE_POLLER=false` στο `.env`.

---

## Ιδιαιτερότητα XP7 VIN

Οχήματα με πρόθεμα VIN `XP7` (π.χ. Model Y Juniper) δεν υποστηρίζουν την
παράμετρο `?endpoints=…` στο `/vehicle_data`.

**Λύση**: καλέστε το `/vehicle_data` χωρίς την παράμετρο `endpoints` — επιστρέφει
`charge_state`, `climate_state` και `vehicle_state`.

Το GPS μέσω `drive_state` δεν είναι διαθέσιμο για αυτά τα οχήματα μέσω του REST API·
το GPS προέρχεται αντ' αυτού από το Fleet Telemetry.

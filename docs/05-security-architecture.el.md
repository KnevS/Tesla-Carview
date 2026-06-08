# Αρχιτεκτονική ασφαλείας

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](05-security-architecture.md)

## Μοντέλο απειλών

Αυτή η εφαρμογή προστατεύει τα δεδομένα οχήματος ενός μεμονωμένου χρήστη/νοικοκυριού
σε αυτο-διαχειριζόμενο διακομιστή. Οι κύριες απειλές είναι:

| Απειλή | Μέτρο μετριασμού |
|---|---|
| Μη εξουσιοδοτημένη πρόσβαση στο web UI | Ταυτοποίηση χρήστη με JWT + MFA |
| Brute force στη σύνδεση | Rate limiting + κλείδωμα λογαριασμού |
| Session hijacking μέσω XSS | Access token μόνο στη RAM, χωρίς localStorage |
| Cookie theft (CSRF) | `SameSite=Strict` + JSON API (χωρίς form submit) |
| Man-in-the-middle | TLS 1.3, HSTS, OCSP stapling |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src 'none'` |
| Διαρροή δεδομένων από παραβίαση DB | Hashes κωδικών (Argon2id), hashes tokens (SHA-256), κωδικοί MFA (bcrypt) **+ AES-256-GCM at-rest** για Tesla tokens, MFA secret, ιδιωτικό κλειδί Virtual-Key (δείτε "Encryption at rest" παρακάτω) |
| Stored XSS μέσω markdown διαχειριστή (νομικές σελίδες) | `DOMPurify` πριν το `v-html`, allow-list των tags/attributes, σχήματα URL περιορισμένα σε http(s)/mailto/tel |
| IDOR (ο χρήστης A διαβάζει δεδομένα του χρήστη B μέσα στον ίδιο tenant) | Helpers `assertVehicleAccess`/`assertTripAccess`/`assertChargingAccess` σε κάθε mutating route· οι admins βλέπουν τα πάντα μέσα στον tenant τους, οι κανονικοί χρήστες βλέπουν μόνο οχήματα συνδεδεμένα μέσω `vehicle_users` |
| Setup-race hijack (επιτιθέμενος καταχωρεί τον πρώτο admin) | Προαιρετικό ENV gate `SETUP_TOKEN` (header `X-Setup-Token`) + rate limit + ατομικό check-then-write |
| Tenant enumeration μέσω σελίδας σύνδεσης | Ψευδώνυμα αντί για πραγματικά ονόματα στη σελίδα σύνδεσης (επιμελημένο `adjective-noun` pool) |
| Ξεπερασμένες εξαρτήσεις | Ενεργοποιήστε τις ειδοποιήσεις Dependabot στο repository |

## Encryption at rest (από 2026-05)

Αμφίδρομη κρυπτογράφηση (AES-256-GCM) για στήλες DB των οποίων το plaintext
χρειάζεται το backend κατά την εκτέλεση και επομένως δεν μπορεί να γίνει hash:

| Δεδομένα | Πίνακας.στήλη | Μορφή |
|---|---|---|
| Tesla OAuth access token | `tokens.access_token` | `v1:iv:tag:ciphertext` |
| Tesla OAuth refresh token | `tokens.refresh_token` | `v1:iv:tag:ciphertext` |
| TOTP MFA secret | `users.mfa_secret` | `v1:iv:tag:ciphertext` |
| Ιδιωτικό κλειδί Tesla Virtual-Key (PEM) | `virtual_key.private_key_pem` | `v1:iv:tag:ciphertext` |

**Πηγές κλειδιού (προτεραιότητα):**
1. `ENCRYPTION_KEY_B64` (μεταβλητή περιβάλλοντος, base64-encoded 32 bytes) — συνιστάται· ζει εκτός του `data/`. Δημιουργία: `openssl rand -base64 32`
2. `/run/secrets/encryption_key` (Docker secret, 32 raw bytes)
3. `data/.encryption-key` (αρχείο, mode 0600) — fallback και υπάρχουσες εγκαταστάσεις· δημιουργείται αυτόματα στην πρώτη εκκίνηση.

**Σημαντικό:** Το κλειδί πρέπει να περιλαμβάνεται στο backup σας. Χωρίς αυτό, οι συνδέσεις Tesla, οι ρυθμίσεις MFA και τα Virtual Keys χάνονται μόνιμα.

δημιουργείται στην πρώτη εκκίνηση του backend. **Συμπεριλάβετέ το στο backup σας** — χωρίς
το κλειδί, οι συνδέσεις Tesla, οι ρυθμίσεις MFA και τα Virtual-Keys είναι μη ανακτήσιμα.

Μονόδρομο hash (SHA-256 + `timingSafeEqual`) για τυχαία tokens που
απλώς επαληθεύονται, ποτέ δεν επαναχρησιμοποιούνται:

| Δεδομένα | Μέθοδος |
|---|---|
| Session refresh tokens | SHA-256, ακατέργαστη τιμή μόνο στο httpOnly cookie |
| Tokens επαναφοράς κωδικού | SHA-256, στο `tenant_settings` |

Υλοποίηση: `backend/src/services/cryptoService.js`.

## Όριο εμπιστοσύνης tenant

Το μοντέλο multi-tenant αντιμετωπίζει έναν tenant ως **μία ομάδα εμπιστοσύνης**:

- Κάθε tenant έχει απομονωμένη βάση SQLite (καμία cross-tenant ανάγνωση δυνατή).
- Μέσα σε έναν tenant, ο ρόλος **admin** βλέπει κάθε όχημα και τα δεδομένα κάθε χρήστη —
  απαραίτητο για τη διαχείριση του tenant (ανάθεση οχημάτων, δημιουργία συνδέσμων επαναφοράς,
  διαχείριση νομικών αποδοχών, κ.λπ.).
- Οι κανονικοί λογαριασμοί **user** βλέπουν μόνο οχήματα συνδεδεμένα με αυτούς μέσω του
  πίνακα `vehicle_users(vehicle_id, user_id)`. Οι helpers IDOR στο
  `backend/src/middleware/vehicleAccess.js` το επιβάλλουν σε κάθε endpoint
  trip, charging και vehicle.

**Σύσταση για νοικοκυριά / εταιρείες με πολλούς οδηγούς:**

- Εάν όλοι οι οδηγοί εμπιστεύονται πλήρως ο ένας τον άλλον (ένα νοικοκυριό, οικογενειακός στόλος):
  βάλτε όλους σε έναν tenant, αναθέστε κάθε όχημα σε κάθε χρήστη μέσω
  `vehicle_users`. Βολικό.
- Εάν οι οδηγοί ΔΕΝ πρέπει να βλέπουν τα GPS / Fahrtenbuch εγγραφές ο ένας του άλλου
  (ανεξάρτητοι υπάλληλοι, σχετική με φόρους διάκριση ιδιωτικής vs. επαγγελματικής χρήσης
  ανά οδηγό): δώστε σε κάθε οδηγό **τον δικό του tenant**, καταχωρίστε κάθε όχημα
  στον αντίστοιχο tenant. Οι IDOR guards επιβάλλουν τότε το όριο.

Δεν υπάρχει σκόπιμα ένα λεπτομερές μοντέλο δικαιωμάτων ανά χαρακτηριστικό
μέσα σε έναν tenant — αυτή η πολυπλοκότητα μετατοπίζεται στο όριο του tenant
αντ' αυτού.

## Ροή ταυτοποίησης

```
                    HTTPS
Browser  <---------------------  nginx (TLS termination)
                                   |
                               Docker network
                                   |
                              Express backend
                                   |
                              SQLite database
```

### Κύκλος ζωής token

```
Login       --> access token (15 min, RAM)  +  refresh cookie (7d, httpOnly)
API request --> Authorization: Bearer <access-token>
401         --> POST /api/auth/refresh  (το cookie στέλνεται αυτόματα)
                --> νέο access token + νέο refresh cookie (rotation)
Logout      --> διαγραφή refresh token από τη DB + καθαρισμός cookie
```

### Γιατί όχι localStorage;

```
localStorage:  αναγνώσιμο από JavaScript      -->  το XSS μπορεί να κλέψει το token
Memory (RAM):  μόνο για το ενεργό tab         -->  το XSS δεν μπορεί να διατηρήσει το token
httpOnly cookie: μη αναγνώσιμο από JS         -->  το XSS δεν μπορεί να διαβάσει το cookie
```

## Hashing κωδικών

**Argon2id** (από v3.1.5, σύσταση OWASP 2024):
- Παράμετροι: t=3 επαναλήψεις, m=65536 (64 MB RAM), p=4 threads
- Memory-hard: το brute-forcing με GPU/ASIC είναι σημαντικά πιο ακριβό από το bcrypt
- Κάθε hash περιέχει τυχαίο salt (προστασία rainbow-table)
- Timing-safe σύγκριση μέσω `argon2.verify()`

**Μετάβαση:** Υπάρχοντα bcrypt hashes (12 rounds) αντικαθίστανται διαφανώς
με Argon2id στην επόμενη επιτυχημένη σύνδεση. Και οι δύο μορφές γίνονται δεκτές κατά
τη μεταβατική περίοδο.

## MFA TOTP

- **Αλγόριθμος**: HMAC-SHA1 (RFC 4226)
- **Περίοδος**: 30 δευτερόλεπτα
- **Ανοχή**: ±1 περίοδος (επιτρέπεται clock drift έως 60 s)
- **Ψηφία**: 6
- **Secret**: 20 τυχαία bytes (160 bit εντροπία)

## Διαμόρφωση TLS nginx

```nginx
# πρωτόκολλα
ssl_protocols TLSv1.2 TLSv1.3;

# session tickets off = το perfect forward secrecy διατηρείται
# ακόμα κι αν το κλειδί διακομιστή παραβιαστεί αργότερα
ssl_session_tickets off;

# HSTS: ο browser κάνει cache HTTPS για 2 χρόνια
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Content Security Policy (CSP)

```
default-src 'self'          # τα πάντα μόνο από το ίδιο μας domain
script-src  'self'          # χωρίς inline JS, χωρίς eval()
style-src   'self' 'unsafe-inline'  # το Tailwind χρειάζεται inline styles
img-src     'self' data: https://*.tile.openstreetmap.org  # map tiles
connect-src 'self'          # μόνο το ίδιο μας API
object-src  'none'          # χωρίς Flash, χωρίς PDF reader
frame-src   'none'          # χωρίς ενσωμάτωση iframe
```

**Permissions-Policy** (από v3.1.5) — κλειδώνει browser APIs που η εφαρμογή δεν χρησιμοποιεί:
```
camera=(), microphone=(), geolocation=(), payment=(),
usb=(), bluetooth=(), display-capture=()
```

## Σχήμα βάσης δεδομένων (πίνακες σχετικοί με ασφάλεια)

```sql
users
  password_hash  -- Argon2id (παλιά bcrypt hashes μεταναστεύουν κατά τη σύνδεση)
  mfa_secret     -- base32 encoded (TOTP secret)
  locked_until   -- timestamp κλειδώματος

refresh_tokens
  token_hash     -- SHA-256 του αρχικού token
  expires_at     -- λήγει αυτόματα

mfa_backup_codes
  code_hash      -- bcrypt, 10 rounds
  used           -- μίας χρήσης

audit_logs
  action         -- π.χ. login_success, mfa_enabled, password_changed
  ip_address     -- για forensic ανάλυση
```

## Συστάσεις μετά το deployment

1. **Αλλάξτε αμέσως τον κωδικό admin** (Ρυθμίσεις → Κωδικός)
2. **Ενεργοποιήστε MFA** για όλους τους χρήστες
3. **Αποθηκεύστε τα backup codes ασφαλώς** (password manager)
4. **Κρατήστε τακτικά αντίγραφα της βάσης δεδομένων** (δείτε [02-deployment.en.md](./02-deployment.en.md))
5. **Ταυτοποίηση με SSH key** αντί για κωδικό στον διακομιστή
6. **Ενεργοποιήστε ειδοποιήσεις Dependabot** στο GitHub repository
7. **Επιθεωρείτε τακτικά τα logs**: `docker logs tesla-carview-backend`

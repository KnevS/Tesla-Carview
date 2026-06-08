# Ταυτοποίηση & MFA

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](03-authentication.md)

## Ροή σύνδεσης

```
[Browser]  POST /api/auth/login  { username, password }

  Περίπτωση A: χωρίς MFA
  <-- { accessToken, user }
  ανακατεύθυνση στο dashboard

  Περίπτωση B: MFA ενεργοποιημένο
  <-- { requiresMfa: true, tempToken }  (έγκυρο για 5 λεπτά)
  ανακατεύθυνση στην εισαγωγή MFA

  POST /api/auth/mfa/verify  { tempToken, code }
  <-- { accessToken, user }
  ανακατεύθυνση στο dashboard
```

## Έννοια των tokens

| Token | Αποθήκευση | Διάρκεια | Χρήση για |
|---|---|---|---|
| **Access token** | JS memory (Pinia) | 15 λεπτά | αιτήματα API ως `Bearer` header |
| **Refresh token** | httpOnly cookie | 7 ημέρες | απόκτηση νέου access token |
| **Temp token** | JS memory | 5 λεπτά | μόνο για επαλήθευση MFA |

**Γιατί όχι localStorage;** Το localStorage είναι αναγνώσιμο από JavaScript και επομένως ευάλωτο σε XSS.
Το access token στη μνήμη εξαφανίζεται όταν κλείνει το tab, το httpOnly cookie όχι.
Το refresh cookie δεν μπορεί να διαβαστεί από JavaScript.

## Ρύθμιση MFA

### Ως χρήστης

1. Ανοίξτε τις **Ρυθμίσεις** (⚙️)
2. Κάντε κλικ στο **"Ενεργοποίηση MFA"**
3. Σκανάρετε τον κωδικό QR με μια εφαρμογή authenticator:
   - [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (Android/iOS)
   - [Authy](https://authy.com/) (Android/iOS/Desktop, με backup)
   - [1Password](https://1password.com/) (ενσωματωμένο TOTP)
   - [Bitwarden](https://bitwarden.com/) (ενσωματωμένο TOTP)
4. Πληκτρολογήστε τον 6-ψήφιο κωδικό που εμφανίζεται
5. **Αποθηκεύστε τους 10 backup codes** (εμφανίζονται μόνο μία φορά!)
   - Κρατήστε τους σε έναν password manager
   - Ή εκτυπώστε τους και φυλάξτε τους ασφαλώς

### Backup codes

- Κάθε κωδικός είναι **μίας χρήσης**
- Μορφή: `XXXX-XXXX` (8 hex χαρακτήρες με παύλα)
- Πληκτρολογήστε αντί του κωδικού TOTP όταν δεν έχετε πρόσβαση στην εφαρμογή
- Μετρητής υπολειπόμενων κωδικών ορατός στις ρυθμίσεις
- Όταν εξαντληθούν: απενεργοποιήστε το MFA και ρυθμίστε το ξανά

## Δημιουργία χρήστη (admin)

Μόνο χρήστες με ρόλο `admin` μπορούν να δημιουργήσουν νέους χρήστες:

```bash
# απευθείας μέσω του API (κωδικός ≥ 12 χαρακτήρες):
curl -X POST https://your-domain.com/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "karin", "password": "strongPassword123!", "role": "user"}'
```

## Passkeys (χωρίς κωδικό)

Το Tesla Carview υποστηρίζει WebAuthn/FIDO2 passkeys ως εναλλακτική των κωδικών:

1. Ανοίξτε **Ρυθμίσεις → Passkeys**
2. Κάντε κλικ στο **"+ Προσθήκη passkey"** — ανοίγει ο διάλογος του browser
3. Επιβεβαιώστε με Face ID, Touch ID ή security key
4. Από τώρα και στο εξής: επιλέξτε **"Σύνδεση με passkey"** στη σελίδα σύνδεσης

Τα passkeys είναι ανθεκτικά σε phishing και δεν απαιτούν κωδικό.

## QR SSO login (για τον browser της οθόνης Tesla)

Ο ενσωματωμένος browser στις οθόνες Tesla δεν υποστηρίζει WebAuthn/Face ID.
Με τη ροή QR pair, μπορείτε ωστόσο να συνδεθείτε χρησιμοποιώντας Passkey/Face ID:

```
[Tesla browser]              [Smartphone]
  άνοιγμα σελίδας σύνδεσης
  "Σύνδεση με smartphone"
  εμφάνιση κωδικού QR  ────── σκανάρισμα
  (poll κάθε 2 s)              άνοιγμα /pair/{token}
                               πάτημα "Επιβεβαίωση με passkey"
                               Face ID / Touch ID ✓
                               POST /api/pair/confirm/{token}
  η σύνοδος επιβεβαιώθηκε ◄───
  λήψη JWT
  άνοιγμα dashboard
```

**Βήμα-βήμα:**

1. Στον browser του Tesla, πατήστε **"Σύνδεση με smartphone"**
2. Εμφανίζεται ένας κωδικός QR (έγκυρος για 5 λεπτά)
3. Σκανάρετε τον κωδικό QR με την κάμερα του smartphone
4. Ανοίγει στο τηλέφωνο το `https://your-domain.com/pair/{token}`
5. Πατήστε **"Επιβεβαίωση με passkey"** → Face ID / Touch ID
6. Ο browser του Tesla συνδέεται αυτόματα

**Ιδιότητες ασφαλείας:**
- Token: τυχαία τιμή 256-bit, μη μαντεύσιμη
- TTL: 5 λεπτά, μίας χρήσης
- Tenant-scoped: το token είναι έγκυρο μόνο για τον δικό σας tenant
- Το passkey στο smartphone επαληθεύει την ταυτότητα server-side

**Απαίτηση:** Πρέπει να έχει καταχωριστεί τουλάχιστον ένα passkey στο smartphone εκ των προτέρων (Ρυθμίσεις → Passkeys).

## Απαιτήσεις κωδικού

- Τουλάχιστον **12 χαρακτήρες**
- Το πολύ 256 χαρακτήρες
- Καμία περαιτέρω απαίτηση κλάσης χαρακτήρων (το μήκος μετράει περισσότερο από την πολυπλοκότητα)
- Σύσταση: μια φράση 4+ τυχαίων λέξεων

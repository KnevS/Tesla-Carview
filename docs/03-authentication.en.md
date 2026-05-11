# Authentication & MFA

> 🇩🇪 [Auf Deutsch lesen](03-authentication.md)

## Login flow

```
[Browser]  POST /api/auth/login  { username, password }

  Case A: no MFA
  <-- { accessToken, user }
  redirect to dashboard

  Case B: MFA enabled
  <-- { requiresMfa: true, tempToken }  (valid for 5 min)
  redirect to MFA input

  POST /api/auth/mfa/verify  { tempToken, code }
  <-- { accessToken, user }
  redirect to dashboard
```

## Token concept

| Token | Storage | Validity | Used for |
|---|---|---|---|
| **Access token** | JS memory (Pinia) | 15 minutes | API requests as `Bearer` header |
| **Refresh token** | httpOnly cookie | 7 days | obtaining a new access token |
| **Temp token** | JS memory | 5 minutes | only for MFA verification |

**Why no localStorage?** localStorage is readable by JavaScript and therefore vulnerable to XSS.
The access token in memory disappears when the tab is closed, the httpOnly cookie does not.
The refresh cookie cannot be read by JavaScript.

## Set up MFA

### As a user

1. Open **Settings** (⚙️)
2. Click **"Enable MFA"**
3. Scan the QR code with an authenticator app:
   - [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (Android/iOS)
   - [Authy](https://authy.com/) (Android/iOS/Desktop, with backup)
   - [1Password](https://1password.com/) (built-in TOTP)
   - [Bitwarden](https://bitwarden.com/) (built-in TOTP)
4. Enter the displayed 6-digit code
5. **Save the 10 backup codes** (shown only once!)
   - Keep them in a password manager
   - Or print them and store them safely

### Backup codes

- Each code is **single-use**
- Format: `XXXX-XXXX` (8 hex characters with hyphen)
- Enter instead of the TOTP code when you have no access to the app
- Remaining-codes counter visible in the settings
- When used up: disable MFA and set it up again

## Create a user (admin)

Only users with role `admin` can create new users:

```bash
# directly via the API (password ≥ 12 chars):
curl -X POST https://your-domain.com/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "karin", "password": "strongPassword123!", "role": "user"}'
```

## Password requirements

- At least **12 characters**
- At most 256 characters
- No further character-class requirements (length matters more than complexity)
- Recommendation: a passphrase of 4+ random words

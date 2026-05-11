# Security architecture

> 🇩🇪 [Auf Deutsch lesen](05-security-architecture.md)

## Threat model

This application protects the vehicle data of a single user/household
on a self-operated server. The main threats are:

| Threat | Mitigation |
|---|---|
| Unauthorised access to the web UI | User auth with JWT + MFA |
| Brute force on login | Rate limiting + account lockout |
| Session hijacking via XSS | Access token in RAM only, no localStorage |
| Cookie theft (CSRF) | `SameSite=Strict` + JSON API (no form submit) |
| Man-in-the-middle | TLS 1.3, HSTS, OCSP stapling |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src 'none'` |
| Data leak from DB compromise | Password hashes (bcrypt), token hashes (SHA-256), MFA codes (bcrypt) **+ AES-256-GCM at-rest** for Tesla tokens, MFA secret, Virtual-Key private key (see "Encryption at rest" below) |
| Stored XSS via admin markdown (legal pages) | `DOMPurify` before `v-html`, allow-list of tags/attributes, URL schemes restricted to http(s)/mailto/tel |
| IDOR (user A reads user B's data within the same tenant) | `assertVehicleAccess`/`assertTripAccess`/`assertChargingAccess` helpers in every mutating route; admins see everything within their tenant, regular users see only vehicles linked via `vehicle_users` |
| Setup-race hijack (attacker registers the first admin) | Optional `SETUP_TOKEN` env gate (header `X-Setup-Token`) + rate limit + atomic check-then-write |
| Tenant enumeration via login page | Pseudonyms instead of real names on the login page (curated `adjective-noun` pool) |
| Outdated dependencies | Enable Dependabot alerts in the repository |

## Encryption at rest (since 2026-05)

Two-way encryption (AES-256-GCM) for DB columns whose plaintext the
backend needs at runtime and therefore cannot be hashed:

| Data | Table.column | Format |
|---|---|---|
| Tesla OAuth access token | `tokens.access_token` | `v1:iv:tag:ciphertext` |
| Tesla OAuth refresh token | `tokens.refresh_token` | `v1:iv:tag:ciphertext` |
| TOTP MFA secret | `users.mfa_secret` | `v1:iv:tag:ciphertext` |
| Tesla Virtual-Key private key (PEM) | `virtual_key.private_key_pem` | `v1:iv:tag:ciphertext` |

**Key persistence:** `data/.encryption-key` (32 bytes, mode 0600). Auto-
generated on first backend start. **Include it in your backup** — without
the key, Tesla connections, MFA setups and Virtual-Keys are unrecoverable.

One-way hashed (SHA-256 + `timingSafeEqual`) for random tokens that are
only verified, never replayed:

| Data | Method |
|---|---|
| Session refresh tokens | SHA-256, raw value only in the httpOnly cookie |
| Password-reset tokens | SHA-256, in `tenant_settings` |

Implementation: `backend/src/services/cryptoService.js`.

## Tenant trust boundary

The multi-tenant model treats one tenant as **one trust group**:

- Each tenant has an isolated SQLite database (no cross-tenant reads possible).
- Within a tenant, the **admin** role sees every vehicle and every user's data —
  needed to administer the tenant (assigning vehicles, generating reset links,
  managing legal acceptances, etc.).
- Regular **user** accounts see only vehicles linked to them via the
  `vehicle_users(vehicle_id, user_id)` table. The IDOR helpers in
  `backend/src/middleware/vehicleAccess.js` enforce this on every trip,
  charging and vehicle endpoint.

**Recommendation for multi-driver households / companies:**

- If all drivers fully trust each other (one household, family fleet):
  put everyone into one tenant, assign every vehicle to every user via
  `vehicle_users`. Convenient.
- If drivers should NOT see each other's GPS / Fahrtenbuch entries
  (independent employees, tax-relevant private vs. business split per
  driver): give each driver **their own tenant**, register each vehicle
  in the respective tenant. The IDOR guards then enforce the boundary.

There is intentionally no fine-grained per-attribute permission model
within a tenant — that complexity is pushed up to the tenant boundary
instead.

## Authentication flow

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

### Token lifecycle

```
Login       --> access token (15 min, RAM)  +  refresh cookie (7d, httpOnly)
API request --> Authorization: Bearer <access-token>
401         --> POST /api/auth/refresh  (cookie sent automatically)
                --> new access token + new refresh cookie (rotation)
Logout      --> delete refresh token from DB + clear cookie
```

### Why no localStorage?

```
localStorage:  readable by JavaScript    -->  XSS can steal the token
Memory (RAM):  only the active tab       -->  XSS cannot persist the token
httpOnly cookie: not readable from JS    -->  XSS cannot read the cookie
```

## Password hashing

**bcrypt** with 12 rounds:
- ~300 ms compute per hash (slows brute forcing)
- Every hash contains a random salt (rainbow-table protection)
- Timing-safe comparison (no timing attack possible)

## MFA TOTP

- **Algorithm**: HMAC-SHA1 (RFC 4226)
- **Period**: 30 seconds
- **Tolerance**: ±1 period (clock drift up to 60 s allowed)
- **Digits**: 6
- **Secret**: 20 random bytes (160 bit entropy)

## nginx TLS configuration

```nginx
# protocols
ssl_protocols TLSv1.2 TLSv1.3;

# session tickets off = perfect forward secrecy is preserved
# even if the server key is compromised later
ssl_session_tickets off;

# HSTS: browser caches HTTPS for 2 years
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Content Security Policy (CSP)

```
default-src 'self'          # everything only from our own domain
script-src  'self'          # no inline JS, no eval()
style-src   'self' 'unsafe-inline'  # Tailwind needs inline styles
img-src     'self' data: https://*.tile.openstreetmap.org  # map tiles
connect-src 'self'          # only own API
object-src  'none'          # no Flash, no PDF reader
frame-src   'none'          # no iframe embedding
```

## Database schema (security-relevant tables)

```sql
users
  password_hash  -- bcrypt, 12 rounds
  mfa_secret     -- base32 encoded (TOTP secret)
  locked_until   -- lockout timestamp

refresh_tokens
  token_hash     -- SHA-256 of the original token
  expires_at     -- expires automatically

mfa_backup_codes
  code_hash      -- bcrypt, 10 rounds
  used           -- single use

audit_logs
  action         -- e.g. login_success, mfa_enabled, password_changed
  ip_address     -- for forensic analysis
```

## Recommendations after deployment

1. **Change the admin password immediately** (Settings → Password)
2. **Enable MFA** for all users
3. **Store the backup codes safely** (password manager)
4. **Back up the database regularly** (see [02-deployment.en.md](./02-deployment.en.md))
5. **SSH key authentication** instead of password on the server
6. **Enable Dependabot alerts** in the GitHub repository
7. **Review logs regularly**: `docker logs tesla-carview-backend`

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
| Data leak from DB compromise | Password hashes (bcrypt), token hashes (SHA-256), MFA codes (bcrypt) |
| Outdated dependencies | Enable Dependabot alerts in the repository |

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

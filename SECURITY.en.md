# Security Policy

> 🇩🇪 [Auf Deutsch lesen](SECURITY.md)

## Supported versions

Security updates are only provided for the current `main` branch.

## Reporting a vulnerability

Please **do not** report vulnerabilities as a public GitHub issue.
Instead, file a **private GitHub security advisory** or e-mail the repository maintainer.

Please include:
- Type of vulnerability (e.g. XSS, SQL injection, auth bypass)
- Steps to reproduce
- Affected component(s)
- Estimated impact

You will receive an acknowledgement within 72 hours.

## Security architecture (short version)

### Authentication
- **Password hashing**: bcrypt with 12 rounds (compute-intensive, brute-force resistant)
- **JWT access token**: 15-minute validity, HS256, kept only in memory
- **Refresh token**: 7 days, SHA-256 hashed in the DB, served as `httpOnly; Secure; SameSite=Strict` cookie
- **Token rotation**: every refresh issues a new refresh token and deletes the old one
- **Account lockout**: 15-minute lock after 5 failed attempts

### MFA (two-factor authentication)
- TOTP per RFC 6238 (30-second window, ±1 period tolerance)
- Compatible with all standard authenticator apps
- 10 single-use backup codes (bcrypt hashed, shown in plain text only on setup)
- MFA setup requires confirmation with a valid code before activation

### Transport security
- TLS 1.2 and 1.3 (no TLS 1.0/1.1)
- Perfect forward secrecy (session tickets disabled)
- HSTS with 2-year max-age and preload
- OCSP stapling

### HTTP security headers
| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | Only own resources + OSM tiles |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera, microphone, payment blocked |

### Rate limiting
| Endpoint | Limit |
|---|---|
| `/api/auth/login` | 10 requests / 15 min / IP (backend) + 10 req/min (nginx) |
| All API endpoints | 120 requests / minute / IP |

### Privacy
- All vehicle data stays local on your own server
- No telemetry, no external services (other than the Tesla Fleet API)
- The SQLite database lives in a Docker volume (not in the container image)
- Password hashes and refresh-token hashes are never stored in plain text
- MFA backup codes are shown in plain text only once

### Known limitations
- The MFA secret is not additionally encrypted at rest in the DB (DB access already requires OS-level access)
- No CSRF token (mitigated by `SameSite=Strict` cookie + JSON API)
- No second factor on password change (only the current password is required)

## Cyclic security review

Security is a process, not a state — the existing setup is verified automatically on a recurring basis:

- **Per commit / pull request**: `gitleaks` (secret scan, `.github/workflows/gitleaks.yml`) and `npm audit` + `trivy fs` (`.github/workflows/security.yml`).
- **Weekly (Mon 06:00 UTC)**: `security.yml` also runs on cron so that new CVEs against unchanged code are caught promptly.
- **Operator side** (on the live host): two cron jobs check container health, TLS cert remaining lifetime, fail2ban, auth anomalies, disk and Tesla API status (`security-check.sh` daily) plus npm audit, certbot renew, fail2ban banlist (`security-audit.sh` weekly). These scripts are operational and not part of the repository.

# Sicherheitsarchitektur

> 🇬🇧 [Read in English](05-security-architecture.en.md)

## Threat-Model

Diese Applikation schuetzt Fahrzeugdaten eines einzelnen Benutzers/Haushalts
auf einem selbst betriebenen Server. Die Hauptbedrohungen sind:

| Bedrohung | Gegenmassnahme |
|---|---|
| Unautorisierter Zugriff auf die Web-UI | Benutzer-Auth mit JWT + MFA |
| Brute-Force auf Login | Rate-Limiting + Account-Lockout |
| Session-Hijacking via XSS | Access-Token nur im RAM, kein localStorage |
| Cookie-Diebstahl (CSRF) | `SameSite=Strict` + JSON-API (kein Formular-Submit) |
| Man-in-the-Middle | TLS 1.3, HSTS, OCSP-Stapling |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src 'none'` |
| Datenleck bei DB-Kompromittierung | Passwort-Hashes (bcrypt), Token-Hashes (SHA-256), MFA-Codes (bcrypt) |
| Veraltete Abhaengigkeiten | Dependabot-Alerts im Repository aktivieren |

## Authentifizierungs-Flow

```
                    HTTPS
Browser  <---------------------  Nginx (TLS-Termination)
                                   |
                               Docker-Netz
                                   |
                              Express-Backend
                                   |
                              SQLite-Datenbank
```

### Token-Lebenszyklus

```
Login       --> Access-Token (15 min, RAM)  +  Refresh-Cookie (7d, httpOnly)
API-Request --> Authorization: Bearer <access-token>
401         --> POST /api/auth/refresh  (Cookie wird automatisch mitgesendet)
                --> neuer Access-Token + neuer Refresh-Cookie (Rotation)
Logout      --> Refresh-Token aus DB loeschen + Cookie leeren
```

### Warum kein localStorage?

```
localStorage:  Von JavaScript lesbar  -->  XSS kann Token stehlen
Memory (RAM):  Nur aktives Tab          -->  XSS kann Token NICHT persistieren
httpOnly Cookie: Nicht per JS lesbar   -->  XSS kann Cookie nicht lesen
```

## Passwort-Hashing

**bcrypt** mit 12 Runden:
- ~300ms Rechenzeit pro Hash (erschwertes Brute-Forcing)
- Jeder Hash enthält ein zufälliges Salt (Rainbow-Table-Schutz)
- Timing-safe Vergleich (kein Timing-Angriff möglich)

## MFA-TOTP

- **Algorithmus**: HMAC-SHA1 (RFC 4226)
- **Periode**: 30 Sekunden
- **Toleranz**: ±1 Periode (Uhr-Abweichung bis 60s erlaubt)
- **Ziffern**: 6
- **Secret**: 20 zufällige Bytes (160 Bit Entropie)

## Nginx TLS-Konfiguration

```nginx
# Protokolle
ssl_protocols TLSv1.2 TLSv1.3;

# Session-Tickets off = Perfect Forward Secrecy bleibt erhalten
# auch wenn der Server-Key spaeter kompromittiert wird
ssl_session_tickets off;

# HSTS: Browser cached HTTPS fuer 2 Jahre
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Content Security Policy (CSP)

```
default-src 'self'          # Alles nur von der eigenen Domain
script-src  'self'          # Kein Inline-JS, kein eval()
style-src   'self' 'unsafe-inline'  # Tailwind braucht inline styles
img-src     'self' data: https://*.tile.openstreetmap.org  # Kartenbilder
connect-src 'self'          # Nur eigene API
object-src  'none'          # Kein Flash, kein PDF-Reader
frame-src   'none'          # Kein iFrame-Embedding
```

## Datenbankschema (Sicherheitsrelevante Tabellen)

```sql
users
  password_hash  -- bcrypt, 12 Runden
  mfa_secret     -- base32-kodiert (TOTP-Secret)
  locked_until   -- Lockout-Zeitstempel

refresh_tokens
  token_hash     -- SHA-256 des originalen Tokens
  expires_at     -- automatisch ablaufend

mfa_backup_codes
  code_hash      -- bcrypt, 10 Runden
  used           -- einmalig verwendbar

audit_logs
  action         -- z.B. login_success, mfa_enabled, password_changed
  ip_address     -- fuer forensische Auswertung
```

## Empfehlungen nach dem Deployment

1. **Admin-Passwort sofort aendern** (Einstellungen → Passwort)
2. **MFA aktivieren** fuer alle Benutzer
3. **Backup-Codes sicher aufbewahren** (Passwort-Manager)
4. **Datenbank regelmaessig sichern** (siehe [02-deployment.md](./02-deployment.md))
5. **SSH-Key-Authentifizierung** statt Passwort auf dem Server
6. **Dependabot-Alerts** im GitHub-Repository aktivieren
7. **Logs regelmaessig pruepen**: `docker logs tesla-carview-backend`

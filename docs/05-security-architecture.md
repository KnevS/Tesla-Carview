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
| Datenleck bei DB-Kompromittierung | Passwort-Hashes (Argon2id), Token-Hashes (SHA-256), MFA-Codes (bcrypt) **+ AES-256-GCM at-rest** für Tesla-Tokens, MFA-Secret, Virtual-Key Private-Key (siehe „Encryption at rest" unten) |
| Stored-XSS via Admin-Markdown (Legal-Texte) | `DOMPurify` vor `v-html`, Allow-List Tags + Attribute, Link-Schemata auf http(s)/mailto/tel beschränkt |
| IDOR (User A liest Daten von User B im selben Tenant) | `assertVehicleAccess`/`assertTripAccess`/`assertChargingAccess`-Helper in jeder mutierenden Route; Admin sieht alles im Tenant, normale User nur via `vehicle_users` zugeordnete Fahrzeuge |
| Setup-Race-Hijack (Angreifer registriert ersten Admin) | Optionales `SETUP_TOKEN`-ENV-Gate (Header `X-Setup-Token`) + Rate-Limit + atomare Check-then-Write |
| Mandanten-Enumeration über Login-Seite | Pseudonyme statt Klarnamen (kuratierte `adjective-noun`-Pool) |
| Veraltete Abhaengigkeiten | Dependabot-Alerts im Repository aktivieren |

## Encryption at rest (seit 2026-05)

Zweiseitige Verschlüsselung (AES-256-GCM) für die DB-Felder, deren
Klartext das Backend zur Laufzeit braucht und die deshalb nicht gehashed
werden können:

| Daten | Tabelle.Spalte | Format |
|---|---|---|
| Tesla OAuth Access-Token | `tokens.access_token` | `v1:iv:tag:ciphertext` |
| Tesla OAuth Refresh-Token | `tokens.refresh_token` | `v1:iv:tag:ciphertext` |
| TOTP MFA-Secret | `users.mfa_secret` | `v1:iv:tag:ciphertext` |
| Tesla Virtual-Key Private-Key (PEM) | `virtual_key.private_key_pem` | `v1:iv:tag:ciphertext` |

**Key-Quellen (Priorität):**
1. `ENCRYPTION_KEY_B64` (Umgebungsvariable, base64-codierte 32 Bytes) — empfohlen, liegt außerhalb von `data/`. Erzeugen: `openssl rand -base64 32`
2. `/run/secrets/encryption_key` (Docker Secret, 32 Raw-Bytes)
3. `data/.encryption-key` (Datei, mode 0600) — Fallback und bestehende Installationen; beim ersten Start automatisch generiert.

**Wichtig:** Der Key gehört ins Backup. Ohne ihn sind Tesla-Verbindungen, MFA-Setups und Virtual-Keys unwiederbringlich verloren.

Einseitig gehashed (SHA-256 + `timingSafeEqual`) für Random-Tokens, die
nur verifiziert werden:

| Daten | Verfahren |
|---|---|
| Session-Refresh-Tokens | SHA-256, Raw nur im httpOnly-Cookie |
| Password-Reset-Tokens | SHA-256, in `tenant_settings` |

Implementierung: `backend/src/services/cryptoService.js`.

## Mandanten-Vertrauensgrenze

Das Multi-Mandanten-Modell behandelt einen Mandanten als **eine
Vertrauensgruppe**:

- Jeder Mandant hat eine isolierte SQLite-Datenbank (keine Cross-
  Tenant-Reads moeglich).
- Innerhalb eines Mandanten sieht die **admin**-Rolle alle Fahrzeuge
  und alle User-Daten — erforderlich um den Mandanten zu verwalten
  (Fahrzeuge zuweisen, Reset-Links erzeugen, Legal-Akzeptanzen
  pruefen).
- Normale **user**-Konten sehen nur Fahrzeuge, die ihnen ueber die
  Tabelle `vehicle_users(vehicle_id, user_id)` zugeordnet sind. Die
  IDOR-Helper in `backend/src/middleware/vehicleAccess.js` setzen das
  pro Trip-, Charging- und Vehicle-Route durch.

**Empfehlung fuer Mehr-Fahrer-Haushalte / Firmen:**

- Wenn alle Fahrer einander voll vertrauen (ein Haushalt, Familien-
  Fuhrpark): alle in einen Mandanten, jedes Fahrzeug ueber
  `vehicle_users` jedem User zuweisen. Bequem.
- Wenn Fahrer untereinander KEINE GPS- / Fahrtenbuch-Eintraege sehen
  sollen (unabhaengige Mitarbeiter, steuerrelevante Trennung Privat-/
  Dienstfahrten pro Person): jedem Fahrer einen **eigenen Mandanten**,
  Fahrzeug pro Mandant. Die IDOR-Guards sorgen dann fuer die Trennung.

Bewusst keine feingranulare Per-Attribut-Berechtigung innerhalb eines
Mandanten — die Komplexitaet wird stattdessen auf die Mandanten-Grenze
verschoben.

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

**Argon2id** (seit v3.1.5, OWASP-Empfehlung 2024):
- Parameter: t=3 Iterationen, m=65536 (64 MB RAM), p=4 Threads
- Memory-Hard: GPU/ASIC-Brute-Force erheblich teurer als bei bcrypt
- Jeder Hash enthält ein zufälliges Salt (Rainbow-Table-Schutz)
- Timing-safe Vergleich via `argon2.verify()`

**Migration:** Bestehende bcrypt-Hashes (12 Runden) werden beim nächsten
erfolgreichen Login transparent durch Argon2id ersetzt. Beide Formate
werden während der Übergangsphase gleichzeitig akzeptiert.

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

**Permissions-Policy** (seit v3.1.5) — sperrt Browser-APIs, die die App nicht nutzt:
```
camera=(), microphone=(), geolocation=(), payment=(),
usb=(), bluetooth=(), display-capture=()
```

## Datenbankschema (Sicherheitsrelevante Tabellen)

```sql
users
  password_hash  -- Argon2id (bcrypt-Altdaten werden beim Login migriert)
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

# Sicherheitsrichtlinie / Security Policy

> 🇬🇧 [Read in English](SECURITY.en.md)

## Unterstützte Versionen

Sicherheitsupdates werden nur für den aktuellen `main`-Branch bereitgestellt.

## Sicherheitslücke melden

Bitte Sicherheitslücken **nicht** als öffentliches GitHub-Issue melden.
Stattdessen als **privates GitHub-Issue** oder per E-Mail an den Repository-Maintainer.

Bitte folgende Informationen mitsenden:
- Art der Lücke (z.B. XSS, SQL Injection, Auth-Bypass)
- Schritte zur Reproduktion
- Betroffene Komponente(n)
- Eingeschätzte Auswirkung

Rückmeldung erfolgt innerhalb von 72 Stunden.

## Sicherheitsarchitektur (Kurzfassung)

### Authentifizierung
- **Passwort-Hashing**: bcrypt mit 12 Runden (rechenintensiv, brute-force-resistent)
- **JWT Access-Token**: 15 Minuten Gültigkeit, HS256, nur im Arbeitsspeicher gespeichert
- **Refresh-Token**: 7 Tage, SHA-256-gehasht in der DB, als `httpOnly; Secure; SameSite=Strict` Cookie
- **Token-Rotation**: Bei jedem Refresh wird ein neues Refresh-Token ausgestellt und das alte gelöscht
- **Account-Lockout**: Nach 5 Fehlversuchen 15 Minuten gesperrt

### MFA (Zwei-Faktor-Authentifizierung)
- TOTP nach RFC 6238 (30-Sekunden-Fenster, ±1 Periode Toleranz)
- Kompatibel mit allen Standard-Authenticator-Apps
- 10 Einmal-Backup-Codes (bcrypt-gehasht, werden nur bei Einrichtung im Klartext angezeigt)
- MFA-Setup erfordert Bestaetigung mit gültigem Code bevor Aktivierung

### Transport-Sicherheit
- TLS 1.2 und 1.3 (kein TLS 1.0/1.1)
- Perfect Forward Secrecy (Session-Tickets deaktiviert)
- HSTS mit 2 Jahren max-age und Preload
- OCSP-Stapling

### HTTP-Security-Header
| Header | Wert |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | Nur eigene Ressourcen + OSM-Kacheln |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Kamera, Mikrofon, Zahlung gesperrt |

### Rate-Limiting
| Endpunkt | Limit |
|---|---|
| `/api/auth/login` | 10 Anfragen / 15 Min / IP (Backend) + 10 Req/min (Nginx) |
| Alle API-Endpunkte | 120 Anfragen / Minute / IP |

### Datenschutz
- Alle Fahrzeugdaten bleiben lokal auf dem eigenen Server
- Keine Telemetrie, keine externen Dienste (ausser Tesla Fleet API)
- SQLite-Datenbank liegt im Docker-Volume (nicht im Container-Image)
- Passwort-Hashes und Refresh-Token-Hashes werden nie im Klartext gespeichert
- MFA-Backup-Codes werden nur einmal im Klartext ausgegeben

### Bekannte Einschränkungen
- MFA-Secret wird nicht zusätzlich verschlüsselt in der DB gespeichert (der DB-Zugriff setzt bereits OS-Zugriffsschutz voraus)
- Kein CSRF-Token (gemindert durch `SameSite=Strict` Cookie + JSON-API)
- Kein 2. Faktor beim Passwort-Ändern (nur aktuelles Passwort erforderlich)

## Zyklische Sicherheitsprüfung

Sicherheit ist kein Zustand, sondern ein Prozess — wir verifizieren das vorhandene Setup regelmäßig automatisiert:

- **Pro Commit / Pull-Request**:
  - `gitleaks` über die volle Historie (`.github/workflows/gitleaks.yml`).
  - `npm audit` (prod-only, blockierend bei high/critical), `trivy fs`, **`semgrep`** (OWASP-Top-10 + JS/TS + Secrets) und **CycloneDX-SBOM** als Artefakt (`.github/workflows/security.yml`).
  - `ci.yml` installiert Dependencies mit `npm ci --ignore-scripts` — keine automatische Ausführung von `postinstall`-Hooks externer Pakete im CI-Runner.
- **Wöchentlich (Mo 06:00 UTC)**: `security.yml` läuft zusätzlich per Cron, damit neue CVEs gegen unveränderten Code rechtzeitig auffallen.
- **Strukturell**: `.github/CODEOWNERS` erzwingt Sven-Review für alle sensiblen Pfade (Auth, Crypto, DB-Schema, Audit-Service, externe API-Integrationen, Lockfiles, CI/CD).
- **Auto-Update**: Dependabot überwacht npm Backend+Frontend, GitHub-Actions und Docker-Basisimages wöchentlich (Mo 06:00 Europe/Berlin). Patch- und Minor-Updates werden bei grünem CI über `.github/workflows/dependabot-auto-merge.yml` automatisch gemerged; Major-Bumps werden gelabelt und warten auf manuellen Review.
- **Operator-seitig** (auf dem Live-Host): zwei Cron-Jobs prüfen Container-Health, TLS-Cert-Restlaufzeit, fail2ban, Auth-Anomalien, Disk und Tesla-API-Status (`security-check.sh` täglich) sowie npm audit, certbot-Renew, fail2ban-Banlist (`security-audit.sh` wöchentlich). Diese Skripte sind betriebsintern und nicht Teil des Repos.

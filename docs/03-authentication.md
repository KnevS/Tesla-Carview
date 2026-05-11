# Authentifizierung & MFA

> 🇬🇧 [Read in English](03-authentication.en.md)

## Login-Ablauf

```
[Browser]  POST /api/auth/login  { username, password }

  Fall A: Kein MFA
  <-- { accessToken, user }
  Weiterleitung zum Dashboard

  Fall B: MFA aktiviert
  <-- { requiresMfa: true, tempToken }  (5 Min gültig)
  Weiterleitung zur MFA-Eingabe

  POST /api/auth/mfa/verify  { tempToken, code }
  <-- { accessToken, user }
  Weiterleitung zum Dashboard
```

## Token-Konzept

| Token | Speicherort | Gültigkeit | Verwendung |
|---|---|---|---|
| **Access-Token** | JS-Arbeitsspeicher (Pinia) | 15 Minuten | API-Anfragen als `Bearer`-Header |
| **Refresh-Token** | httpOnly Cookie | 7 Tage | Neues Access-Token holen |
| **Temp-Token** | JS-Arbeitsspeicher | 5 Minuten | Nur für MFA-Verifizierung |

**Warum kein localStorage?** localStorage ist per JavaScript lesbar und damit XSS-anfällig.
Der Access-Token im Arbeitsspeicher verschwindet bei Tab-Schließung, der httpOnly-Cookie nicht.
Das Refresh-Cookie kann von JavaScript nicht gelesen werden.

## MFA einrichten

### Als Benutzer

1. **Einstellungen** (⚙️) öffnen
2. Auf **"MFA aktivieren"** klicken
3. QR-Code mit einer Authenticator-App scannen:
   - [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (Android/iOS)
   - [Authy](https://authy.com/) (Android/iOS/Desktop, mit Backup)
   - [1Password](https://1password.com/) (integrierter TOTP)
   - [Bitwarden](https://bitwarden.com/) (integrierter TOTP)
4. Den angezeigten 6-stelligen Code eingeben
5. **10 Backup-Codes sichern** (werden nur einmal angezeigt!)
   - In einem Passwort-Manager speichern
   - Oder ausdrucken und sicher aufbewahren

### Backup-Codes

- Jeder Code ist **einmalig** verwendbar
- Format: `XXXX-XXXX` (8 Hex-Zeichen mit Bindestrich)
- Einzugeben statt des TOTP-Codes wenn kein Zugriff auf die App
- Anzahl verbleibender Codes in den Einstellungen sichtbar
- Nach Aufbrauch: MFA deaktivieren und neu einrichten

## Benutzer anlegen (Admin)

Nur Benutzer mit der Rolle `admin` können neue Benutzer erstellen:

```bash
# Direkt per API (Passwort mind. 12 Zeichen):
curl -X POST https://deine-domain.de/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "karin", "password": "sicheresPasswort123!", "role": "user"}'
```

## Passwort-Anforderungen

- Mindestens **12 Zeichen**
- Maximal 256 Zeichen
- Keine weiteren Zeichenklassen-Anforderungen (Laenge ist wichtiger als Komplexität)
- Empfehlung: Passphrase aus 4+ zufälligen Wörtern

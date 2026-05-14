# Sicherheit — Authentifizierung, MFA & Best Practices

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Security)** | English version |
| 🇩🇪 **[Deutsch](DE-Security)** | Du bist hier |

---

Tesla Carview verarbeitet sensible Daten: Fahrzeugstandort, Ladehistorie und Steuerbefehle an dein Auto. Diese Seite erklärt, wie die App abgesichert ist und was **du** tun solltest, um deine Installation sicher zu halten.

---

## Login-Optionen

### 1. Benutzername + Passwort (Standard)
- Passwörter werden mit bcrypt gehasht (Kostenfaktor 12)
- Fehlgeschlagene Logins sind rate-limitiert: nach 5 Fehlversuchen wird das Konto für 15 Minuten gesperrt
- Alle Login-Ereignisse werden im Audit-Log festgehalten

**Gute Passwort-Praktiken:**
- Verwende eine Passphrase: `Sonne-Berg-Auto-Kaffee` (4+ Wörter, leicht zu merken, schwer zu knacken)
- Mindestens 12 Zeichen — länger ist besser
- Keine Passwörter von anderen Diensten wiederverwenden
- Passwort-Manager nutzen (Bitwarden, 1Password, KeePass)

### 2. Passkeys (passwortlos, empfohlen)
Passkeys verwenden die Biometrie deines Geräts (Fingerabdruck, Face ID) anstelle eines Passworts. Sie sind Phishing-resistent und deutlich sicherer.

Einrichten:
1. **Einstellungen → Sicherheit → Passkey hinzufügen**
2. Der Browser öffnet eine biometrische Aufforderung — bestätige mit Finger oder Gesicht
3. Fertig — du kannst dich jetzt nur mit deiner Biometrie anmelden

Passkeys funktionieren auf:
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (Fingerabdruck)
- Windows (Windows Hello)
- Hardware-Keys (YubiKey)

> Der Tesla-Auto-Browser unterstützt keine Passkeys. Im Auto Benutzername + Passwort mit „Angemeldet bleiben" verwenden.

### 3. MFA / Zwei-Faktor-Authentifizierung (TOTP)
Füge eine zusätzliche Sicherheitsschicht mit einer Authenticator-App hinzu:
1. **Einstellungen → Sicherheit → MFA aktivieren**
2. QR-Code mit Google Authenticator, Authy, Bitwarden oder ähnlichem scannen
3. Den 6-stelligen Code zur Bestätigung eingeben

Nach dem Einrichten: Jeder Login erfordert dein Passwort + den 6-stelligen Code.

**Backup-Codes nicht vergessen:** Die 10 Backup-Codes werden nur einmal angezeigt — in einem Passwort-Manager speichern oder ausdrucken.

**Admins können MFA für alle Benutzer erzwingen:**
```env
# .env — MFA-Pflicht für alle neuen Benutzer:
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Session-Sicherheit

| Einstellung | Wert |
|---|---|
| Access-Token-Laufzeit | 15 Minuten (kurzlebig) |
| Refresh-Token — Standard | 7 Tage |
| Refresh-Token — „Angemeldet bleiben" | 90 Tage |
| Refresh-Token Speicherort | `httpOnly`, `Secure`, `SameSite=Lax` Cookie |
| Token-Rotation | Neuer Refresh-Token bei jeder Nutzung |

Tokens werden als SHA-256-Hashes gespeichert — der Klartext berührt nie die Datenbank.

**Warum kein localStorage?** localStorage ist per JavaScript lesbar und damit XSS-anfällig. Der Access-Token im Arbeitsspeicher verschwindet bei Tab-Schließung, der httpOnly-Cookie nicht und kann von JavaScript nicht gelesen werden.

---

## Verschlüsselung gespeicherter Daten

Sensible Datenbankfelder werden mit AES-256-GCM verschlüsselt:

| Daten | Verschlüsselt |
|---|---|
| Tesla OAuth Access-Token | Ja (`v1:iv:tag:ciphertext`) |
| Tesla OAuth Refresh-Token | Ja |
| TOTP MFA-Secret | Ja |
| Tesla Virtual-Key Private-Key | Ja |

Der Verschlüsselungskey liegt unter `data/.encryption-key` und wird beim ersten Start automatisch erzeugt. **Dieser Key gehört ins Backup** — ohne ihn sind Tesla-Verbindungen, MFA-Setups und Virtual-Keys verloren.

---

## IT-Sicherheits-Best-Practices für deinen Server

Neben der integrierten Sicherheit von Tesla Carview braucht auch dein Server Schutz.

### SSH absichern

**Passwort-Authentifizierung deaktivieren — nur SSH-Keys nutzen:**

```bash
# Schlüsselpaar auf deinem LOKALEN Computer generieren:
ssh-keygen -t ed25519 -C "tesla-server"

# Public Key auf den Server kopieren:
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@DEINE-SERVER-IP

# Auf dem Server Passwort-Auth deaktivieren:
nano /etc/ssh/sshd_config
```
Diese Zeilen ändern:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> Teste den Key-basierten Login **bevor** du die aktuelle SSH-Session schließt.

**Standard-SSH-Port ändern (optional, reduziert Log-Rauschen):**
```bash
# In /etc/ssh/sshd_config:
Port 2222    # Beliebiger nicht-standardmäßiger Port

# Firewall aktualisieren:
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### Firewall (UFW)

Das Setup-Skript konfiguriert UFW automatisch. Überprüfen:

```bash
ufw status verbose
```

Sollte zeigen:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (oder dein Port)    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Alle anderen Ports sollten nicht öffentlich erreichbar sein.

### Fail2ban (Brute-Force-Schutz)

Fail2ban sperrt automatisch IPs, die wiederholt SSH- oder Web-Logins fehlschlagen. Das Setup-Skript installiert und konfiguriert es.

Status prüfen:
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-tesla-login
```

IP entsperren (falls du dich ausgesperrt hast):
```bash
fail2ban-client set sshd unbanip DEINE-IP
```

**Sperrzeiten:**

| Szenario | Fehlversuche | Zeitraum | Sperrzeit |
|---|---|---|---|
| Login 401 (Brute-Force) | 3 | 60 s | 10 min |
| Rate-Limit überschritten | 3 | 60 s | 3 min |
| SSH-Brute-Force | 5 | 600 s | 1 h |

Das App-seitige Account-Lockout (5 Fehlversuche → 15 min) und fail2ban ergänzen sich: fail2ban schützt auf Netzwerkebene, bevor Anfragen Node.js erreichen.

### Alles aktuell halten

**Automatische OS-Updates:**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Ja auswählen
```

**Automatische Tesla Carview Updates:**
```env
# In /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

Updates laufen nächtlich um ~03:30 (Europe/Berlin).

**Docker-Image Updates:**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### HTTPS & Zertifikatserneuerung

Let's Encrypt Zertifikate laufen alle 90 Tage ab und erneuern sich automatisch per Cron-Job (vom Install-Skript eingerichtet).

Zertifikatsstatus prüfen:
```bash
certbot certificates
```

Erneuerung testen (Probelauf, keine Änderungen):
```bash
certbot renew --dry-run
```

Erneuerung erzwingen:
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### `.env`-Datei schützen

Deine `.env`-Datei enthält Tesla Client-ID, Client-Secret und JWT-Secret. Sie darf niemals:
- In git commitet werden (steht in `.gitignore` — nicht überschreiben)
- Öffentlich zugänglich sein
- In Screenshots oder Support-Anfragen geteilt werden

```bash
# Berechtigungen prüfen — sollte 600 sein (nur Eigentümer lesen/schreiben):
ls -la /opt/tesla-carview/backend/.env

# Korrigieren falls falsch:
chmod 600 /opt/tesla-carview/backend/.env
```

### Audit-Log

Tesla Carview protokolliert alle sicherheitsrelevanten Aktionen:
- Login-Versuche (Erfolg und Fehlschlag)
- Konto-Sperrungen
- Passwort-Änderungen
- Fahrzeugbefehl-Ausführungen
- Datenlöschungen
- Admin-Aktionen

Einsehen unter: **Admin → Audit-Log**

Exportieren: **Admin → Audit-Log → CSV exportieren**

---

## Sicherheits-Header

Die nginx-Konfiguration von Tesla Carview enthält moderne Sicherheits-Header:
- `Content-Security-Policy` (CSP) — verhindert XSS
- `Strict-Transport-Security` (HSTS) — erzwingt HTTPS
- `X-Frame-Options: DENY` — verhindert Clickjacking
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — schränkt Browser-Features ein

Header prüfen: [securityheaders.com](https://securityheaders.com)

---

## Sicherheitslücke melden

Sicherheitsproblem gefunden? Bitte verantwortungsvoll melden:
- **Kein** öffentliches GitHub-Issue öffnen
- E-Mail: siehe [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) im Repository
- Antwort wird innerhalb von 48 Stunden angestrebt

---

## Sicherheits-Checkliste für neue Installationen

- [ ] SSH Key-basierte Auth aktiviert, Passwort-Auth deaktiviert
- [ ] Firewall aktiv (UFW), nur Ports 22/80/443 offen
- [ ] Fail2ban läuft
- [ ] Starkes Admin-Passwort (16+ Zeichen oder Passphrase)
- [ ] MFA für Admin-Konto aktiviert
- [ ] `.env`-Datei-Berechtigungen auf 600 gesetzt
- [ ] Auto-Updates aktiviert (OS + Tesla Carview)
- [ ] Regelmäßige Backups konfiguriert (siehe [Backup & Wiederherstellung](DE-Backup-and-Restore))
- [ ] Audit-Log regelmäßig geprüft

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

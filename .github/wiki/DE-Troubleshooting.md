# Fehlerbehebung

🌐 **Sprache / Language:** [EN](Troubleshooting) · [FR](FR-Troubleshooting) · [ES](ES-Troubleshooting) · [TR](TR-Troubleshooting) · [EL](EL-Home) · **DE**

---

Lösungen für die häufigsten Probleme. Beginne mit der wahrscheinlichsten Ursache und arbeite dich nach unten vor.

---

## App überhaupt nicht erreichbar

### Prüfen: Läuft der Server?

```bash
# Container-Status prüfen:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Sollte alle Container als „Up" zeigen:
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Falls ein Container „Exit" oder „Restarting" anzeigt:
```bash
# Logs des Problem-Containers anzeigen:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Alles neu starten:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Prüfen: Wird die Domain korrekt aufgelöst?

```bash
nslookup tesla.meinedomain.de
# Sollte die IP deines Servers anzeigen

# Oder im Browser: https://dnschecker.org besuchen
```

Falls DNS nicht aufgelöst wird → 10–30 Minuten nach der DNS-Änderung warten.

### Prüfen: Blockiert die Firewall den Zugriff?

```bash
ufw status
# Ports 80 und 443 müssen ALLOW anzeigen
```

Falls fehlend:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## „502 Bad Gateway" oder „503 Service Unavailable"

Das bedeutet: nginx läuft, aber das Backend antwortet nicht.

```bash
# Backend prüfen:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Häufige Ursache: Backend abgestürzt wegen eines Startfehlers. Oft eine fehlende `.env`-Variable oder ein Datenbankberechtigungsproblem.

Datenbankberechtigungen korrigieren:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## SSL/HTTPS-Fehler („Zertifikat nicht gültig", „Zertifikat abgelaufen")

Das Let's Encrypt Zertifikat ist abgelaufen oder wurde nicht korrekt ausgestellt.

```bash
# Zertifikatsstatus prüfen:
certbot certificates

# Manuell erneuern:
certbot renew --force-renewal
systemctl restart nginx
```

Falls certbot nicht erneuern kann (DNS wird nicht aufgelöst, Port 80 blockiert):
1. Prüfen, dass Port 80 in der Firewall UND im Router (Portweiterleitung) offen ist
2. Prüfen, dass der DNS der Domain auf die Server-IP zeigt

---

## Fahrzeug zeigt keine Daten / zeigt „offline"

### Tesla API nicht verbunden
→ **Admin → System → System-Health** prüfen — der Abschnitt „Tesla Token" zeigt den Verbindungsstatus.

Falls abgelaufen: **Admin → System → Tesla-Konto erneut verbinden**

### Fahrzeug schläft
Tesla-Fahrzeuge schlafen nach 15–30 Minuten Inaktivität. Die App wartet darauf, dass das Auto aufwacht. Manuell aufwecken:
1. Die offizielle Tesla-App auf dem Handy öffnen
2. Irgendeine Funktion tippen (Klimaanlage, Hupen) um das Auto aufzuwecken
3. Tesla Carview sollte innerhalb von 60 Sekunden aktualisieren

### XP7-VIN (Model Y Juniper) — GPS aktualisiert nicht
Einige neuere Fahrzeuge geben keine GPS-Daten über die Standard-REST-API zurück. Das ist eine Tesla-Einschränkung. Fleet Telemetry liefert GPS-Daten für diese Fahrzeuge — kontaktiere [Tesla Fleet Telemetry Access](https://developer.tesla.com) wenn du das benötigst.

---

## „Tesla API returned 403 Forbidden"

Alle Tesla API-Aufrufe geben 403 zurück? Das bedeutet typischerweise, dass dein **Tesla Developer Account gesperrt ist oder ein Abrechnungsproblem hat**.

1. Bei [developer.tesla.com](https://developer.tesla.com) einloggen
2. Nach Konto-Warnungen, Abrechnungshinweisen oder Sperr-Meldungen suchen
3. Erforderliche Abrechnungsdaten ausfüllen (auch für kostenlose Nutzung kann eine Kreditkarte nötig sein)
4. Nach der Behebung: **Admin → System → Tesla-Konto erneut verbinden**

---

## 🧭 Setup-Assistent bricht bei der Admin-Erstellung ab

**Symptom:** Bei einer frischen Installation schlägt Schritt 2 des Setup-Assistenten (Admin-Konto anlegen) fehl mit `Transaction function cannot return a promise`. Betrifft Versionen bis einschließlich v3.32.5.

**Ursache & Lösung:** Ein Bug in `/api/setup/init` ([#170](https://github.com/KnevS/Tesla-Carview/issues/170)) — **behoben in v3.32.6**. Auf die aktuelle Version aktualisieren und den Assistenten erneut aufrufen:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Danach lässt sich das Admin-Konto wieder anlegen. Bereits eingerichtete Installationen sind nicht betroffen.

---

## Login-Probleme

### „Ungültiger Benutzername oder Passwort" — aber ich bin sicher, dass es stimmt

- Feststelltaste prüfen
- Falls das Passwort kürzlich geändert wurde, das alte versuchen (Browser hat möglicherweise das alte gecacht)
- Admin-Konten können Benutzerpasswörter zurücksetzen: **Admin → Benutzer → dein Konto → Passwort zurücksetzen**

### „Konto gesperrt"

Nach 5 fehlgeschlagenen Login-Versuchen wird das Konto für 15 Minuten gesperrt. Warten oder einen Admin bitten, das Konto zu entsperren.

Admins können über die Konsole entsperren:
```bash
# Im Container:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('DEINE-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('BENUTZERNAME');
"
```

### Admin-Passwort vergessen

Falls du dich nicht als Admin einloggen kannst:
```bash
# Shell im Backend-Container öffnen:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Passwort zurücksetzen:
node -e "
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('NeuesPasswort123!', 12);
// Tenant-ID in master.db suchen, dann:
// db.getDb('tenant-uuid').prepare('UPDATE users SET password_hash=? WHERE username=?').run(hash, 'admin');
"
```

Einfacher: Aus einem Backup wiederherstellen, das du gemacht hast, als du das Passwort noch wusstest.

---

## Push-Benachrichtigungen funktionieren nicht

### Desktop
1. Browser-Benachrichtigungsberechtigungen prüfen: Schloss-Symbol in der Adressleiste klicken → Benachrichtigungen → Erlauben
2. Prüfen, dass die App HTTPS verwendet (für Push erforderlich)
3. Versuchen: Einstellungen → Push-Benachrichtigungen → Test-Benachrichtigung

### iOS (iPhone/iPad)
Push-Benachrichtigungen auf iOS funktionieren nur von der **Startseiten-Verknüpfung (PWA)**, nicht aus dem Browser-Tab.
1. Tesla Carview in Safari öffnen
2. Teilen → „Zum Home-Bildschirm"
3. Vom Startseiten-Symbol öffnen → Benachrichtigungen funktionieren jetzt

---

## Befehle funktionieren nicht (Klima, Schlösser, etc.)

Befehle erfordern den gepairten Virtual Key:
1. Prüfen: **Einstellungen → Virtual Key** — Status sollte „Gepairt" zeigen
2. Falls nicht gepairt: Pairing-URL im **Tesla-Auto-Browser** öffnen (nicht auf dem Handy)
3. In der Tesla-App auf dem Handy bestätigen

Außerdem prüfen: **Admin → System → Virtual Key Status**

---

## Datenbankfehler („disk I/O error", „database is locked")

Normalerweise durch eine defekte SD-Karte auf dem Raspberry Pi verursacht. Prüfen:

```bash
# Dateisystem auf Fehler prüfen:
dmesg | grep -i "error\|fail\|corrupt"

# SD-Karten-Gesundheit prüfen:
df -h
```

Wenn du I/O-Fehler siehst → deine SD-Karte versagt. **Sofort ein Backup erstellen** und auf USB SSD wechseln: [→ Raspberry Pi Speicher](DE-Raspberry-Pi-Storage)

---

## Logs einsehen

```bash
# Backend-Anwendungslogs:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# nginx-Zugriffslog:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# System-Journal (fail2ban, etc.):
journalctl -u fail2ban --since "1 hour ago"

# fail2ban-Sperren:
fail2ban-client status sshd
fail2ban-client status nginx-tesla-login
```

### In-App Audit-Log

Alle sicherheitsrelevanten Ereignisse werden protokolliert:
- **Admin → Audit-Log** mit Filter (Aktion, Benutzer-ID, Datum) und CSV-Export

---

## Immer noch nicht gelöst?

1. Die [GitHub Issues](https://github.com/KnevS/Tesla-Carview/issues) prüfen — jemand anderes hatte möglicherweise dasselbe Problem
2. Ein neues Issue öffnen mit:
   - Was du versucht hast
   - Was passiert ist (Fehlermeldungen, Screenshots)
   - Dein Setup (Pi-Modell, VPS-Anbieter, OS-Version)
   - Relevante Log-Ausgabe (Passwörter und Secrets schwärzen)

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

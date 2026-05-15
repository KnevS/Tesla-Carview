# Erster Login & Tenant-Einrichtung

🌐 **Sprache / Language:** [EN](First-Login) · [FR](FR-First-Login) · [ES](ES-First-Login) · [TR](TR-First-Login) · [EL](EL-Home) · **DE**

---

Nach der Installation führt diese Seite durch den ersten Start von Tesla Carview.

---

## Was ist ein „Tenant"?

Tesla Carview unterstützt mehrere voneinander isolierte Konten auf einem Server — sogenannte **Tenants** (Mandanten). Jeder Tenant hat:
- Eigene Benutzer und Fahrzeuge
- Eine eigene Datenbank (Daten sind vollständig getrennt)
- Eigene Einstellungen und rechtliche Inhalte

**Für den Einzelnutzer:** Du hast einen Tenant (wird bei der Installation erstellt). Du musst dich um Tenants überhaupt nicht kümmern — die Login-Seite erledigt das automatisch.

**Für Familie / kleine Gruppe:** Jede Person kann ein eigenes Konto unter demselben Tenant haben. Oder du erstellst separate Tenants für vollständige Isolation.

---

## Erster Login

1. `https://tesla.meinedomain.de` im Browser öffnen
2. Die Login-Seite erscheint

   Wenn du auf deinem Server nur **einen Tenant** hast, ist das Tenant-Feld automatisch ausgeblendet — einfach Benutzername und Passwort eingeben.

   Wenn du **mehrere Tenants** hast, erscheint ein Dropdown zur Auswahl.

3. Admin-Benutzername und Passwort eingeben (bei der Installation festgelegt)
4. **„Angemeldet bleiben (90 Tage)"** aktivieren — besonders wichtig für den Tesla-Browser

5. Auf **Anmelden** klicken

---

## Der Setup-Wizard

Wenn du zum ersten Mal nach der Installation einloggst, öffnet die App automatisch **/setup** im Browser, sofern noch kein Administrator-Account existiert:

1. **Administrator-Konto anlegen** — Benutzername und sicheres Passwort setzen
2. Weiterleitung zum Login

Danach beim ersten Login wird ein **Verbindungs-Wizard** geführt:

1. **Tesla-Konto verbinden** → Siehe [Tesla API Setup](DE-Tesla-API-Setup)
2. **Fahrzeug auswählen** → Welches Auto soll getrackt werden
3. **Rechtliche Inhalte** → Impressum/Datenschutz konfigurieren (erforderlich bei öffentlichem Zugang)
4. **Fertig!** → Du wirst zum Dashboard weitergeleitet

---

## Andere Benutzer einladen

Als Admin kannst du andere Personen zu deinem Tenant einladen (Familienmitglieder, Partner):

1. Zu **Admin → Benutzer → Benutzer einladen** gehen
2. E-Mail oder Benutzernamen eingeben
3. Der Eingeladene erhält einen Link zur Passwort-Erstellung
4. Du kannst festlegen, welche Fahrzeuge er sehen und welche Aktionen er durchführen darf

Siehe [Multi-Tenant & Benutzer](DE-Multi-Tenant) für alle Details.

---

## Tesla Carview aus dem Tesla-Browser verwenden

Der Tesla-Touchscreen hat einen eingebauten Browser. Du kannst Tesla Carview direkt aus dem Auto verwenden:

1. Den Browser auf dem Tesla-Touchscreen öffnen
2. Zu `https://tesla.meinedomain.de` navigieren
3. Mit Benutzername und Passwort anmelden („Angemeldet bleiben" für 90 Tage aktivieren)
4. Lesezeichen setzen oder zur Startseite hinzufügen für schnellen Zugriff

> **Tipp QR-SSO-Login:** Tippe auf **„Mit Smartphone anmelden"** auf der Login-Seite. Ein QR-Code erscheint. Scan ihn mit deinem Smartphone, bestätige per Face ID oder Touch ID → der Tesla-Browser loggt sich automatisch ein, ohne dass du Passwort oder Passkey direkt im Auto eingibst.

---

## Als Progressive Web App (PWA) installieren

Tesla Carview lässt sich als App auf deinem Gerät installieren:

- **Android/Desktop Chrome:** Auf das Installier-Symbol in der Adressleiste tippen
- **iOS Safari:** Teilen → „Zum Home-Bildschirm" tippen
- **Tesla-Browser:** Menü → „Zur Startseite hinzufügen"

Die installierte PWA funktioniert für gecachte Seiten auch offline und erhält Benachrichtigungen wie eine native App.

---

## Passwort ändern

1. Zu **Einstellungen → Konto** gehen
2. Auf **Passwort ändern** klicken
3. Aktuelles Passwort und neues Passwort eingeben (mindestens 12 Zeichen)

---

## Zwei-Faktor-Authentifizierung (MFA) einrichten

Für mehr Sicherheit, MFA mit einer Authenticator-App einrichten (Google Authenticator, Authy, Bitwarden):

1. Zu **Einstellungen → Sicherheit** gehen
2. Auf **Zwei-Faktor-Authentifizierung einrichten** klicken
3. QR-Code mit der Authenticator-App scannen
4. Den 6-stelligen Code zur Bestätigung eingeben

Nach der Einrichtung wird bei jedem Login der Code abgefragt (außer bei Passkeys).

**Backup-Codes sicher aufbewahren** — sie werden nur einmal angezeigt!

Weitere Details zu allen Auth-Optionen: [Sicherheit](DE-Security)

---

## Konfiguration nachträglich anpassen

```bash
# Terminal-Wizard erneut ausführen:
bash /opt/tesla-carview/deploy/setup-wizard.sh

# Oder direkt bearbeiten:
nano /opt/tesla-carview/backend/.env

# Danach Backend neu starten:
docker compose -f docker-compose.prod.yml up -d
```

---

## Weiterführende Schritte

Nach dem ersten Login:
- **[Tesla API Setup](DE-Tesla-API-Setup)** — Tesla-Konto verbinden
- **[Konfiguration](DE-Configuration)** — App-Einstellungen anpassen
- **[Sicherheit](DE-Security)** — Passkeys und MFA einrichten
- **[Backup & Wiederherstellung](DE-Backup-and-Restore)** — Erste Datensicherung erstellen

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

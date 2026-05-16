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

Nach dem ersten Admin-Login öffnet automatisch ein **Setup-Wizard**. Er führt durch die vollständige Erstkonfiguration — von der Tesla-Konto-Verbindung bis zu SMTP-E-Mail-Versand und rechtlichen Inhalten.

**Erster Start (Admin) — 16 Schritte:**
Tesla OAuth → Fahrzeuge → Virtual Key → Fleet Telemetry → Strompreis → Legal-Inhalte → Externe API-Keys → Monitoring (SMTP + Anthropic) → Design → Einheiten → Dashboard → Navigation → Benachrichtigungen → Zusammenfassung

**Jederzeit wieder:** Wizard unter **Einstellungen → Wizard starten** erneut aufrufen, um Präferenzen anzupassen.

Nicht-Admin-Benutzer sehen nur die Präferenz-Schritte (Design, Einheiten, Dashboard, Navigation, Benachrichtigungen).

> Vollständige Schritt-Tabelle: [Features → Einrichtungs-Wizard](DE-Features#-einrichtungs-wizard)

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

Die meisten Einstellungen sind im Browser direkt anpassbar:
- **Wizard:** Einstellungen → Wizard starten (Präferenzen, Tesla OAuth, Legal, APIs, Monitoring)
- **Admin-Oberfläche:** Admin → System (SMTP, API-Keys, Selbstheilung)

Für Systemkonfiguration (JWT_SECRET, TESLA_CLIENT_ID etc.):
```bash
nano /opt/tesla-carview/backend/.env
docker compose -f docker-compose.prod.yml up -d --build backend
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

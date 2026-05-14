# Multi-Tenant & Benutzerverwaltung

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Multi-Tenant)** | English version |
| 🇩🇪 **[Deutsch](DE-Multi-Tenant)** | Du bist hier |

---

Tesla Carview unterstützt mehrere voneinander isolierte Konten („Tenants") auf einem einzigen Server — ideal für Familien oder wenn du den Dienst im Rahmen der nicht-kommerziellen Lizenz für enge Freunde anbieten möchtest.

---

## Tenants verstehen

Stell dir Tenants wie separate Wohnungen im selben Gebäude vor:
- Jeder Tenant hat eigene **Benutzer**, **Fahrzeuge** und **Daten**
- Tenants können gegenseitig keine Daten einsehen
- Ein Server, mehrere isolierte Umgebungen

**Wann brauchst du mehrere Tenants?**
- Familie mit zwei Tesla-Besitzern, die separate Daten wollen
- Du und ein Freund teilen sich einen Server
- Du möchtest eine zweite Konfiguration testen ohne die Produktionsdaten anzufassen

**Wann reicht ein Tenant?**
- Du und dein Partner teilen einen Tesla
- Du hast mehrere Teslas, möchtest aber alle Daten an einem Ort
- Einzelnutzer

**Empfehlung:** Wenn alle Fahrer einander voll vertrauen (ein Haushalt, Familien-Fuhrpark): alle in einen Tenant, jedes Fahrzeug über die Fahrzeug-Zuordnung jedem Benutzer zuweisen. Wenn Fahrer untereinander keine GPS-/Fahrtenbuch-Einträge sehen sollen (steuerrelevante Trennung): jedem Fahrer einen eigenen Tenant.

---

## Master-Datenbank vs. Tenant-Datenbanken

Tesla Carview verwendet zwei Datenbanktypen:

| Datenbank | Speicherort | Enthält |
|---|---|---|
| `master.db` | `/app/data/master.db` | Tenant-Liste, Benutzer-Tokens, OAuth-Status |
| `{tenant-uuid}.db` | `/app/data/tenants/` | Alle Fahrzeug- und Benutzerdaten eines Tenants |

Die Daten jedes Tenants sind vollständig auf Dateiebene isoliert.

---

## Neuen Tenant erstellen

### Option 1: Selbst-Registrierung (falls aktiviert)

Benutzer können ihren eigenen Tenant unter `https://tesla.meinedomain.de/register` registrieren:
1. Tenant-Name, Slug (kurze URL-sichere Kennung), Admin-Benutzername und Passwort eingeben
2. Nutzungsbedingungen akzeptieren
3. Fertig — ein neuer isolierter Tenant wird erstellt

**Selbst-Registrierung mit Einladungscodes einschränken:**
In `.env`:
```env
REGISTRATION_REQUIRES_INVITE=true
```
Dann Einladungscodes unter **Admin → Einladungen → Einladungscode erstellen** anlegen und den Link teilen.

### Option 2: Als Admin (ohne Selbst-Registrierung)

Falls die Selbst-Registrierung deaktiviert ist, erstellst du Tenants direkt als Admin — oder aktivierst die Registrierung vorübergehend.

---

## Benutzer innerhalb eines Tenants verwalten

### Benutzerrollen

| Rolle | Was sie tun können |
|---|---|
| **Admin** | Alles — Fahrzeuge, Benutzer, Einstellungen, Datenverwaltung |
| **Benutzer** | Daten für zugewiesene Fahrzeuge einsehen, Fahrtenbuch-Einträge erstellen |

Admins legen zusätzliche Berechtigungen fest:

| Berechtigung | Standard für Benutzer |
|---|---|
| Kann Fahrzeuge bearbeiten | Nein |
| Kann Fahrzeuge hinzufügen | Nein |
| MFA erforderlich | Ja (konfigurierbar) |

### Benutzer einladen

Als Admin andere Personen zum Tenant einladen:
1. **Admin → Benutzer → Benutzer einladen**
2. E-Mail eingeben (oder einfach einen Link ohne E-Mail generieren)
3. Anfangsberechtigungen festlegen
4. Der Eingeladene klickt auf den Link und setzt sein Passwort

### Fahrzeuge Benutzern zuweisen

Ein Benutzer kann nur Fahrzeuge sehen, denen er zugewiesen ist:
1. **Admin → Benutzer** → auf einen Benutzer klicken
2. Unter „Fahrzeuge" → festlegen, welche Fahrzeuge er sehen kann
3. Änderungen werden sofort wirksam (kein Abmelden nötig)

---

## Tenant-Pseudonyme

Aus Datenschutzgründen werden Tenants auf der Login-Seite durch ein **Pseudonym** identifiziert (z.B. „brave-eagle") — nicht durch den echten Tenant-Namen. Das verhindert, dass die Login-Seite verrät, wer diesen Server betreibt.

Das Pseudonym ändern:
- **Admin → Einstellungen → Tenant → Pseudonym ändern**

---

## Tenant löschen

Das Löschen eines Tenants ist eine destruktive Operation und erfordert Bestätigung:
1. **Admin → Datenverwaltung → Tenant löschen**
2. Den Bestätigungstext eingeben
3. Vor dem Löschen wird automatisch ein Backup erstellt

---

## Tenant sperren

Tenants können ohne Löschung gesperrt werden:
- **Admin → Tenants → Sperren**
- Gesperrte Tenants können sich nicht einloggen
- Daten bleiben erhalten

---

## Technische Limits (Einzelserver)

| Ressource | Praktisches Limit |
|---|---|
| Anzahl Tenants | Kein hartes Limit (SQLite skaliert gut) |
| Fahrzeuge pro Tenant | Kein hartes Limit |
| Benutzer pro Tenant | Kein hartes Limit |
| Datenbankgröße pro Tenant | ~50 MB für 3 Jahre Daten (typisch) |

Tesla Carview ist nicht für großen SaaS-Mehrmandanten-Betrieb ausgelegt — es ist für privaten/familiären Einsatz. Siehe [Lizenz & Nutzung](DE-License-and-Usage) für das Erlaubte.

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

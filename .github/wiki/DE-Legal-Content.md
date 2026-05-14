# Rechtliche Inhalte (Impressum, Datenschutz, Nutzungsbedingungen)

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Legal-Content)** | English version |
| 🇩🇪 **[Deutsch](DE-Legal-Content)** | Du bist hier |

---

Wenn Tesla Carview öffentlich zugänglich ist (nicht nur im lokalen Netzwerk), bist du möglicherweise rechtlich verpflichtet, ein Impressum, eine Datenschutzerklärung und Nutzungsbedingungen bereitzustellen — insbesondere nach deutschem/EU-Recht (DSGVO/TMG).

---

## Ist das für mich relevant?

**Ich nutze Tesla Carview nur im lokalen Netzwerk (keine öffentliche Domain):**
→ Keine rechtlichen Anforderungen. Diese Seite kann übersprungen werden.

**Ich habe eine öffentliche Domain und nutze die App nur selbst:**
→ Geringes Risiko, aber ein Impressum wird in Deutschland/EU empfohlen.

**Ich nutze Tesla Carview mit Familie oder Freunden (nicht-kommerziell):**
→ Impressum und Datenschutzerklärung sollten konfiguriert werden.

---

## Wo werden rechtliche Inhalte konfiguriert?

1. Als **Admin** einloggen
2. Zu **Admin → Rechtliche Inhalte** gehen
3. Dort gibt es drei Bereiche: **Impressum**, **Datenschutzerklärung**, **Nutzungsbedingungen**

---

## Vorlagen ausfüllen

Tesla Carview stellt Vorlagen mit Platzhalterfeldern bereit, die als `<<PLATZHALTER>>` markiert sind. Folgendes muss ausgefüllt werden:

| Platzhalter | Was einzutragen ist |
|---|---|
| `<<NAME>>` | Vollständiger gesetzlicher Name |
| `<<STRASSE>>` | Straße und Hausnummer |
| `<<ORT>>` | Ort und Postleitzahl |
| `<<LAND>>` | Land |
| `<<EMAIL>>` | Kontakt-E-Mail-Adresse |
| `<<TELEFON>>` | Telefonnummer (in Deutschland Pflicht) |

> **Die App warnt dich**, wenn `<<PLATZHALTER>>`-Felder noch nicht ausgefüllt sind. Nicht öffentlich gehen, bevor alle Platzhalter ausgefüllt sind.

---

## Versionierung und Veröffentlichung

Rechtliche Inhalte werden versioniert. Wenn du Änderungen vornimmst:
1. Inhalt im Editor bearbeiten
2. Auf **„Neue Version veröffentlichen"** klicken
3. Benutzer, die eine vorherige Version akzeptiert haben, werden beim nächsten Login gebeten, die neue zu akzeptieren

Das erstellt einen Audit-Trail, der zeigt wer welche Version wann akzeptiert hat.

---

## Mehrsprachige rechtliche Inhalte

Tesla Carview verwaltet rechtliche Inhalte in einer Hauptsprache (für DE-Server standardmäßig Deutsch) und spiegelt sie in andere Sprachen. Wenn du die deutsche Version änderst, werden die anderen Sprachen automatisch aktualisiert.

Wenn du eigene Übersetzungen benötigst, kannst du jede Sprache separat bearbeiten.

---

## DSGVO-Mindestanforderungen für die Datenschutzerklärung

Wenn du in der EU bist, muss deine Datenschutzerklärung folgendes angeben:
- Welche personenbezogenen Daten gesammelt werden (Benutzername, E-Mail, Fahrzeugdaten, Standort)
- Warum sie gesammelt werden (persönliche Nutzung, private Protokollierung)
- Wie lange sie gespeichert werden (bis zur Kontolöschung oder X Jahre)
- Wer Zugriff hat (nur du als Admin)
- Nutzerrechte (Auskunft, Löschung, Berichtigung)
- Kontakt für Datenschutzanfragen (deine E-Mail)

Die Tesla Carview-Vorlage deckt all das ab. Einfach die Kontaktdaten ausfüllen.



---

## Betreiber-Kontakt (separat vom Impressum)

Für allgemeine Anfragen oder Pressekontakt kann eine Footer-Kontakt-E-Mail konfiguriert werden:
- **Einstellungen → Betreiber-Kontakt**
- Erscheint im App-Footer und ist vom gesetzlichen Impressum getrennt

Konfiguration in der Frontend-Umgebungsdatei:
```bash
# /opt/tesla-carview/frontend/.env:
VITE_FOOTER_EMAIL=kontakt@meinedomain.de
VITE_FOOTER_ABOUT_DE=https://meinedomain.de/ueber-mich
VITE_FOOTER_LINKEDIN_URL=https://linkedin.com/in/deinprofil
```

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

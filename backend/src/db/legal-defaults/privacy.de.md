# Datenschutzerklärung

> Diese Datenschutzerklärung beschreibt, welche personenbezogenen Daten beim Betrieb dieser **privat selbst gehosteten** Tesla-Datenlogger-Instanz verarbeitet werden, auf welcher Rechtsgrundlage und für welchen Zweck. Maßgeblich ist die Datenschutz-Grundverordnung (DSGVO) und das Bundesdatenschutzgesetz (BDSG).

## 1. Verantwortlicher

Verantwortlicher im Sinne von Art. 4 Nr. 7 DSGVO:

<<NAME>>
<<STRASSE>>
<<PLZ_ORT>>
<<LAND>>
E-Mail: <<EMAIL>>

## 2. Charakter der Verarbeitung

Die Anwendung wird **ausschließlich für den privaten Gebrauch** des Betreibers und seines Haushalts betrieben. Es findet **keine** Verarbeitung von Daten Dritter statt; eine öffentliche Registrierung ist nicht möglich.

Sämtliche Daten verbleiben **lokal auf dem eigenen Server** unter der Kontrolle des Verantwortlichen. Es findet **keine** Übermittlung an Dritte statt — mit zwei dokumentierten Ausnahmen (Tesla, optional Monta), siehe Abschnitt 5.

## 3. Welche Daten werden verarbeitet?

| Datenart | Zweck | Rechtsgrundlage |
|---|---|---|
| Benutzername, Passwort-Hash, MFA-Secret, Login-Historie | Authentifizierung & Kontoschutz | Art. 6 (1) (b) DSGVO — Vertragserfüllung |
| Tesla-Account-OAuth-Token | Zugriff auf die Tesla Fleet API für eigene Fahrzeuge | Art. 6 (1) (b) DSGVO |
| Fahrzeug-Stammdaten (VIN, Modell, Baujahr) | Fahrzeug-Verwaltung | Art. 6 (1) (b) DSGVO |
| Fahrtenstrecken (GPS, Geschwindigkeit, Verbrauch) | Fahrtenbuch, Reichweiten- und Verbrauchsanalyse | Art. 6 (1) (a/b) DSGVO |
| Ladevorgänge (Energie, Dauer, Kosten, GPS) | Lade-Historie, Kostenabrechnung Heimladen | Art. 6 (1) (b) DSGVO |
| Batterie-Telemetrie (SoC, Temperatur, Spannung) | Degradationsanalyse | Art. 6 (1) (b) DSGVO |
| Server-Logs (IP, User-Agent, Zeitstempel, Statuscodes) | Sicherheit, Missbrauchsabwehr (fail2ban, Rate-Limiting) | Art. 6 (1) (f) DSGVO — berechtigtes Interesse |
| Audit-Log sicherheitsrelevanter Aktionen | Forensik bei Vorfällen | Art. 6 (1) (f) DSGVO |

## 4. Speicherdauer

| Datenart | Aufbewahrung |
|---|---|
| Refresh-Tokens | 7 Tage rollierend, danach automatische Löschung |
| Server-Logs (nginx) | 14 Tage rotiert |
| Fahrt- und Ladedaten | unbefristet — Lösch-/Bereinigungsfunktion in der App verfügbar |
| Benutzerkonto | bis zur aktiven Löschung |

Auf Wunsch kann der Verantwortliche jederzeit Datenbestände vollständig löschen (Funktion **„Daten verwalten"** in der App).

## 5. Empfänger / Drittlandsübermittlung

### 5.1 Tesla, Inc. (USA)

Zur Abfrage von Fahrzeugdaten und zur Steuerung des Fahrzeugs wird die [Tesla Fleet API](https://developer.tesla.com) genutzt. Hierbei werden API-Aufrufe (inkl. OAuth-Token, Fahrzeug-VIN, Befehlsparameter) an Tesla, Inc. (3500 Deer Creek Road, Palo Alto, CA 94304, USA) übermittelt. Eine Auftragsverarbeitung im Sinne von Art. 28 DSGVO besteht nicht; Tesla agiert als eigenverantwortliche Stelle. Übermittlungsgrundlage: **Standardvertragsklauseln** der EU-Kommission und das **EU-US Data Privacy Framework**. Datenschutzerklärung von Tesla: [https://www.tesla.com/legal/privacy](https://www.tesla.com/legal/privacy).

### 5.2 Monta ApS (Dänemark) — optional

Wenn die Monta-Integration in den Einstellungen aktiviert ist, werden Ladesessions zur Abrechnung über die Monta Partner-API synchronisiert. Empfänger: Monta ApS, Vesterbrogade 26, 1620 Kopenhagen, Dänemark. Verarbeitung erfolgt im EWR — kein Drittlandstransfer. Datenschutz: [https://monta.com/de/privacy](https://monta.com/de/privacy).

## 6. Cookies

Die Anwendung verwendet ausschließlich **technisch notwendige Cookies**:

- `refreshToken` (httpOnly, Secure, SameSite=Strict) — Login-Session, 7 Tage Gültigkeit
- `localStorage['locale']` — gewählte Sprache, ausschließlich lokal im Browser, wird nicht übertragen

Tracking-, Werbe- und Analyse-Cookies werden **nicht** eingesetzt. Eine Einwilligung nach § 25 TDDDG ist daher nicht erforderlich.

## 7. Empfangene Auftragsverarbeitungen

Hosting des Servers, auf dem diese Instanz läuft, erfolgt durch den Verantwortlichen selbst (Self-Hosting) oder bei einem Hosting-Provider unter Auftragsverarbeitungsvertrag. Der konkrete Provider wird auf Anfrage benannt.

## 8. Deine Rechte als betroffene Person

Du hast nach Art. 15–22 DSGVO insbesondere folgende Rechte:

- **Auskunft** über die zu deiner Person verarbeiteten Daten (Art. 15)
- **Berichtigung** unrichtiger Daten (Art. 16)
- **Löschung** („Recht auf Vergessenwerden", Art. 17) — soweit gesetzlich zulässig
- **Einschränkung** der Verarbeitung (Art. 18)
- **Datenübertragbarkeit** in einem strukturierten, maschinenlesbaren Format (Art. 20) — die App stellt CSV/JSON-Export zur Verfügung
- **Widerspruch** gegen Verarbeitung auf Grundlage berechtigter Interessen (Art. 21)
- **Beschwerderecht** bei einer Aufsichtsbehörde (Art. 77) — zuständig ist deine jeweilige Landesdatenschutzbehörde

Anfragen bitte formlos per E-Mail an <<EMAIL>>.

## 9. Sicherheit

Die Anwendung implementiert technische und organisatorische Maßnahmen nach Art. 32 DSGVO. Details: siehe [Security Policy](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) im Repository.

## 10. Änderungen dieser Datenschutzerklärung

Diese Erklärung kann bei Änderungen der Verarbeitung oder Rechtslage angepasst werden. Beim ersten Login nach einer Änderung wirst du um erneute Bestätigung gebeten. Frühere Versionen werden zu Nachweiszwecken im System aufbewahrt.

Stand: <<DATUM>>

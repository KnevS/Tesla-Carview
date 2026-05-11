# Disclaimer / Haftungsausschluss

> 🇬🇧 [Read in English](DISCLAIMER.en.md)

> ⚠️ Dieses Dokument ist **keine Rechtsberatung**. Es fasst Standardklauseln
> zusammen, die ergänzend zur [LICENSE](LICENSE) gelten. Der englische Lizenztext
> in `LICENSE` ist im Streitfall maßgeblich.

## Bereitstellung „wie sie ist"

Die Software wird **„as is" / „wie sie ist"** ohne jegliche Gewährleistung
ausgeliefert. Soweit gesetzlich zulässig, schließt der Lizenzgeber jegliche
Haftung für Schäden aus, die aus der Nutzung der Software, ihrem Verhalten
oder ihrer Bereitstellung entstehen — gleich auf welcher Anspruchsgrundlage.

Nach deutschem Recht bleibt eine Haftung **nur** in folgenden gesetzlich
zwingenden Fällen unberührt:

- Vorsatz (§276 BGB)
- Grobe Fahrlässigkeit (§276 BGB)
- Verletzung von Leben, Körper oder Gesundheit (§309 Nr. 7a BGB)
- Zwingende Haftung nach dem Produkthaftungsgesetz (ProdHaftG)

Da diese Software **kostenlos und nicht-kommerziell** bereitgestellt wird,
greift zusätzlich die Schenkungshaftung nach **§521 BGB**: der Schenker
haftet ausschließlich für Vorsatz und grobe Fahrlässigkeit.

## Eigenverantwortung des Betreibers

Wer Tesla Carview installiert und/oder selbst hostet, übernimmt die volle
Verantwortung für:

1. **Den Betrieb des Servers** — Betriebssystem, Patches, Backups, Firewall,
   physische Sicherheit, Verfügbarkeit.
2. **Die Tesla-API-Compliance** — die [Tesla Developer Terms of Service](https://developer.tesla.com/terms),
   die Wahl der korrekten API-Region, das Ratenlimit, Tarif-Pflichten,
   die Sicherheit der eigenen `Client ID` / `Client Secret`.
3. **Den Datenschutz** — DSGVO/EU-Compliance, korrektes Impressum nach §5 DDG,
   die Aufklärung aller Nutzer der eigenen Instanz, das Erfüllen von
   Auskunfts-, Lösch- und Korrekturansprüchen.
4. **Die Konfiguration** — sichere `JWT_SECRET`, MFA-Aktivierung, Verzicht
   auf öffentlich erreichbare Test-Credentials, Aktualität der App.
5. **Drittanbieter-Verträge** — Monta-Integration, Hosting-Provider, TLS-Zertifikate.

Der Lizenzgeber tritt **nicht** als Betreiber der eigenen Instanz auf und
übernimmt keine Verantwortung für Konfiguration, Daten oder Schäden, die
aus dem Betrieb durch Dritte entstehen.

## Tesla-Markenrechte

„Tesla", „Model Y", „Fleet API" und ähnliche Begriffe sind Marken der Tesla,
Inc. Diese Software ist **kein offizielles Tesla-Produkt** und steht nicht
in Verbindung mit Tesla, Inc. oder einem ihrer Tochterunternehmen. Die
Verwendung der Tesla-Markennamen erfolgt ausschließlich zu beschreibenden
Zwecken und beansprucht keine Rechte an diesen Marken.

## Drittsoftware-Lizenzen

Tesla Carview verwendet zahlreiche Open-Source-Bibliotheken (npm-Packages).
Die jeweiligen Lizenzen — überwiegend MIT, Apache-2.0, BSD-2/3-Clause — sind
in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) aufgelistet.

Bei jedem Distribution-Vorgang von Tesla Carview muss diese Liste
mitgeliefert werden, damit die Attribution-Pflichten der Drittlizenzen
erfüllt werden.

## Keine Beratung, keine Gewährleistung der Geeignetheit

Die Software, ihre Dokumentation und die in ihr enthaltenen Hinweise
(insbesondere zu Tesla-API-Zugängen, Steuer-/Abrechnungsfragen, Wartung
oder Sicherheit) sind **keine Beratung im rechtlichen, steuerlichen,
technischen oder fahrzeugbezogenen Sinne**. Wer auf Basis der von der
App angezeigten Daten Entscheidungen trifft, trägt das Risiko allein.

# ⚡ Tesla Carview

[![Version](https://img.shields.io/github/package-json/v/KnevS/Tesla-Carview?filename=backend/package.json&style=flat-square&label=version&color=E31937)](CHANGELOG.md)
[![Lizenz](https://img.shields.io/badge/Lizenz-PolyForm_Noncommercial-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry_Pi_%7C_Linux_%7C_VPS-lightgrey?style=flat-square)](docs/02-deployment.md)

> 🇬🇧 [English](README.en.md) · 🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md) · 🇹🇷 [Türkçe](README.tr.md) · 🇬🇷 [Ελληνικά](README.el.md) · 🇺🇦 [Українська](README.uk.md)
>
> 📋 [Changelog](CHANGELOG.md) · 📚 [Dokumentation](docs/README.md)
>
> 🤖 *Übersetzungen für FR/ES/TR/EL/UK sind KI-unterstützt aus DE/EN. Korrekturen via GitHub willkommen.*

> **© 2026 Sven Krische** · Lizenz: [PolyForm Noncommercial 1.0.0](LICENSE) · [AUTHORS](AUTHORS) · [NOTICE](NOTICE.md)
> Original-Entwurf, Architektur und Implementierung von Sven Krische ([@KnevS](https://github.com/KnevS)).

**Car Usability Management** — selbst gehostet, keine Cloud, keine Drittparteien.
Von GPS-Track und Fahrtenbuch über Routenplanung mit Ladeplanung bis zur Betriebsbuchführung:
alle Fahrzeugdaten bleiben auf deinem eigenen Server.

Läuft auf: **Linux-Server** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), lokale Entwicklung.

<!-- Operator-Hinweis im Footer / Footer note for operators:
     Wer Tesla Carview selbst hostet, kann die eigenen Kontaktdaten
     ueber frontend/.env (siehe frontend/.env.example) einsetzen.
     Self-hosters can configure their own footer contact via the .env. -->


---

## ⚠ Wichtig — Tesla-API-Anbindung Stand 2026

Tesla hat zwischen Mai und Juni 2026 die **inoffizielle Owner API** für Fahrzeug-Endpoints geschlossen. Bisher gängige Community-Workarounds (eingelogt mit dem Tesla-Account-Refresh-Token, Aufruf von `/api/1/vehicles/{id}/vehicle_data`) liefern jetzt **HTTP 401 „invalid bearer token"** — der Workaround ist tot, kein Patch kann ihn wiederbeleben.

Für Live-Vehicle-Daten (Akku, Klima, TPMS, Telemetry-Stream) gibt es **nur einen offiziellen Weg**: Tesla **Fleet API** mit App-Approval bei [developer.tesla.com](https://developer.tesla.com/). Wartezeit aktuell **Wochen bis Monate**.

**💡 Tesla-Freikontingent — typische private Nutzung kostet €0/Monat:** Tesla schenkt pro Account **10 USD freies Guthaben pro Monat** — das deckt typischerweise Telemetry-Stream für 1 Fahrzeug + tägliche Befehle vollständig ab. Erst darüber hinaus pay-as-you-go (150.000 Stream-Signale = 1 USD, 1.000 Commands = 1 USD, 50 Wake-ups = 1 USD). TeslaView ist vollständig vorbereitet — sobald deine App approved ist, sind alle Funktionen sofort aktiv. Wartezeit liegt allein auf Tesla-Seite; TeslaView selbst bleibt immer kostenlos.

**Was TeslaView trotz fehlender Fleet-API liefert:**

| Anbindung | Datenquelle | Was du bekommst | Setup |
|---|---|---|---|
| **OwnTracks** (empfohlen, sofort) | Smartphone der Fahrer | Fahrten, GPS-Track, Distanz, Geschwindigkeit | Wizard-Schritt 5, ~5 Min |
| **Tesla Fleet OAuth** | Tesla Cloud | Akku, Klima, TPMS, alles via Polling | Fleet-API-Approval nötig |
| **Tesla Fleet Telemetry** | Tesla → Push-WebSocket | Live-Stream | Fleet-API + Virtual Key + **1-Klick-App-Registrierung im Wizard** (v3.23.5) |
| **Tesla Owner API** | Tesla Cloud | ❌ **2026 blockiert** | — |
| **Monta-Integration** | Monta Cloud | Heimlade-Kosten für Dienstwagen-Abrechnung | API-Key in Wizard |

**Konkret für neue Installationen ohne Fleet-Approval:** OwnTracks aktivieren — du bekommst rechtssicheres GPS-basiertes Fahrtenbuch, Trip-Heatmap, Distanz-Tracking, automatische Fahrer-Zuordnung. Die fehlenden Akku-/Klima-Werte sind für ein klassisches Dienst-Fahrtenbuch nicht zwingend nötig.

---

## Features

| Bereich | Beschreibung |
|---|---|
| **Dashboard** | Gesamtstatistiken, letzte Fahrt, monatliches Kilometerdiagramm |
| **Fahrten** | GPS-Track auf Karte, Verbrauch, Geschwindigkeit, SoC-Verlauf |
| **Fahrtwerte** (v3.37.0) | Tabellarische Analyse pro Fahrt: Dauer, Strecke, Verbrauch, Geschwindigkeit und Leistung jeweils als Min/Max/Ø — sortierbar, mit Summen-Kacheln und CSV-Export |
| **Heatmap** (v3.41.0) | Geografische Karten-Heatmap mit vier ein-/ausblendbaren Layern: Fahrten (Start/Ziel-Dichte), Ladevorgänge, definierte Ladeorte und Fahrwege (Routen-Linien) — Zeitraum wählbar, Ebenen-Farben frei anpassbar, ohne externe Karten-Plugins |
| **Zonen-Analyse** (v3.39.0) | Fahrtdetail nach Zonen auswerten: Tempo-Bereiche, eigene Geofence-/Ladeort-Zonen oder freier Abschnitt — tabellarische Werte + Karten-Hervorhebung, Hinweis-Marker (Vmax, Spitzenleistung, Rekuperation, Stopps) |
| **Ladewirkungsgrad** (v3.48.0) | Wie viel der bezogenen Energie kommt wirklich im Akku an? Aufschlüsselung nach Leistungsband zeigt, welche Ladeart teuer ist — an der Wallbox wenige Prozent Verlust, an der Schuko-Dose über ein Fünftel. Geeicht über MID-Zähler oder geschätzt aus Fahrzeugdaten; Ladungen ohne belastbare Datenlage bleiben bewusst unbewertet |
| **Ladeplaner** (v3.42.0) | Günstigste Ladeslots bis zur Abfahrt aus dem dynamischen Tarif (aWattar/Tibber): aus Ziel-Ladestand, Akkukapazität, Ladeleistung und Abfahrtszeit die billigsten Stunden wählen — mit Kosten, Ladedauer und Ersparnis gegenüber sofortigem Laden. Reine Preiskurven-Auswertung, kein Fahrzeug-Zugriff |
| **Dienstwagen-Kostensplit** (v3.43.0) | Heimladen dienstlich/privat aufteilen und als Erstattungs-PDF ausgeben — Pauschale (§ 3 Nr. 50 EStG, 30/70 €) oder Fahranteil (dienstlicher km-Anteil × Heimladekosten). Nur Dienstwagen, deutschsprachig |
| **PV-Überschussladen** (v3.44.0) | Nur mit Solarüberschuss laden: liest den Überschuss aus Home Assistant und leitet die empfohlene Ladestromstärke ab — „Jetzt anwenden" setzt Ladestrom + startet/stoppt (Fleet-API). Rein lokal, kein Cloud-Zwang |
| **Dienstwagen-Versteuerung** (v3.45.0) | 1-%-Regel vs. Fahrtenbuchmethode für den geldwerten Vorteil — mit datumsabhängigem E-Fahrzeug-Satz (0,25 %/0,5 %/1 %, BLP-Grenze nach Anschaffungsdatum). Orientierungsrechnung, nur Dienstwagen, deutschsprachig |
| **SoH-Zertifikat** (v3.46.0) | Batterie-Gesundheitszertifikat als PDF für Leasingrückgabe/Wiederverkauf — Reichweite bei 100 %, Degradationsrate, Prognose bis 80 %, optional SoH in %. Statistische Schätzung, keine Gewährleistung |
| **Manipulationssicheres Fahrtenbuch** (v3.47.0) | Jede Fahrt-Änderung landet in einer HMAC-signierten, verketteten Hash-Chain — die Änderungshistorie ist nachträglich nicht unbemerkt veränderbar (GoBD). Integritäts-Prüfung + Aussage im Finanzamt-PDF |
| **Laden** | Ladesessions mit Kosten, GPS-basierter Ladeort-Zuordnung, kostenlose Ladungen markierbar; **Ladeverlauf je Session** (Leistungs-/Ladestandskurve), **Kosten nach Ort** und **günstige Ladefenster** aus dynamischem Strompreis (v3.24–v3.26) |
| **Ladeorte** | Definierbare Standorte mit GPS-Radius, Preis/kWh, Auto-Erkennung |
| **Batterie / Battery-Health-Companion** | Phase 1 (v3.6.0): Reichweiten-Verlauf, Degradation, Ladekurve, Effizienz vs. Außentemperatur, Phantom-Drain, Anomalien — alles rein statistisch aus eigenen Daten. Phase 2 (v3.7.0): persistierte Anomalie-Alerts via Push + Vorklimatisierungs-Vorschläge bei Frost/Hitze (Open-Meteo). **Gesundheit & Prognose (v3.27–v3.28): Reichweiten-Hochrechnung per Regression mit Konfidenzband + Standby-Drain-Trend-Warnung — reine Statistik, keine KI** |
| **App-Hub** (v3.9.0) | Kuratierte Web-Apps für den Tesla-Browser: ARD Audiothek, Deutschlandfunk Live, GoingElectric, OpenChargeMap, Telegram Web, Wikipedia, ABRP — kostenfrei, ohne Account-Zwang, **bewusst keine Doppelung** zu Tesla-Native-Apps. Admin-Whitelist pro Mandant. Admins ergänzen eigene Web-Apps (v3.40.0). |
| **In der Nähe** (v3.13.0) | POIs im Umfeld (Café, WC, Spielplatz, **Geocaches**, Supermarkt, Aussichten…) via OpenStreetMap Overpass. Quelle wählbar: aktuelle Fahrzeug-Position / aktive Lade-Session / letzter Trip. 24h lokaler Cache |
| **Ladeorte mit Auto-Limit** (v3.12.0) | Heim/Arbeit/häufige Ladestationen pflegen: Name, GPS, Radius, Tarif, Wunsch-Ladelimit. Bei Ankunft → Tesla-Befehl `set_charge_limit` (Fleet API) oder Push-Erinnerung als Fallback |
| **OwnTracks-Validation** (v3.11.0) | Drei Schutzlinien gegen Falsch-Erfassung: Bluetooth-Validierung via iOS-Kurzbefehl, Trip-Lock pro Fahrzeug, manueller Pause-Toggle — verhindert dass Carsharing-Fahrten oder Doppelerfassung bei 2+ Devices ins Fahrtenbuch fließen |
| **Adresse vor Koordinaten** (v3.10.0) | In allen Listen und Detailansichten wird die Adresse bevorzugt angezeigt; lat/lon nur als Fallback (4 Dezimalstellen ~11 m) |
| **Auto-Geocoding** (v3.8.0) | Trips/Lade-Sessions mit GPS aber ohne Adresse werden automatisch via Nominatim/OSM ergänzt — Live-Hook + nightly Backfill + Admin-Trigger, 24h lokal gecacht
| **Technik** | Live-Telemetrie: TPMS, Leistungsfluss, Klimaanlage, Ladestatus; Fake-Daten für Demo-Fahrzeuge |
| **Routenplaner** | Interaktiver Routenplaner mit SoC-aware Ladeplanung: automatische Ladestopps inkl. Ladezeit-Schätzung; Abfahrts-SoC (live oder manuell), Ziel-SoC und Ladeziel konfigurierbar; Wetter (Open-Meteo), Verkehr (HERE Maps), Blitzer (OpenStreetMap) entlang der Route; Kartendarstellung mit Tile-Proxy. **Persönliche Reichweite (v3.29): Ankunfts-SoC aus deinem temperatur-abhängigen Verbrauch statt WLTP, mit Vertrauensband und „Könnte knapp werden"-Warnung — reine Statistik** |
| **Steuerung** | Fahrzeugbefehle: Klima, Climate-Keeper (Hund/Camp), Sitzheizung (5 Plätze × 4 Stufen), Lenkradheizung, Türen, Frunk/Heckklappe, Fenster, Sentry-Mode, Laden inkl. Ampere-Slider und Ladeklappe, Vorklim-Zeitplan, Boombox, Software-Update, Navigation (Virtual Key erforderlich) |
| **Fahrtenbuch** | Finanzamt-konform nach BMF-Schreiben: Klassifikation, Geschäftspartner, Reisezweck, Kilometerstände, lückenlose Nummerierung im PDF, Lock nach Export, manuelle Nachträge, Trip-Merge/Split |
| **Abrechnung** | Heimladen-Sessions & Monta-Integration für alle Fahrzeuge; Kostenabrechnung (PDF, Erstattungsvorlage) für Dienstwagen |
| **Betriebsbuch** | Wartungen, Reparaturen, Reifen, Inspektionen mit Kosten |
| **Export** | CSV/JSON/**PDF**-Export für Fahrten & Laden, Vollbackup; PDF-Fahrtenbuch druckfertig mit Datum, Strecke, Verbrauch, SoC |
| **Wartungsintervalle** | Pro Fahrzeug konfigurierbare Service-Aufgaben (TÜV, Reifen, Bremsflüssigkeit, …) mit Zeit- und km-Intervall + tägliche Push-Erinnerung; **vorausschauende Zeitprognose aus der Fahrleistung + 12-Monats-Kostenausblick im TCO (v3.31)** |
| **Audit-Log** | Admin-Viewer für sicherheitsrelevante Ereignisse mit Filter und CSV-Export (DSGVO-konform) |
| **Dynamischer Stromtarif** | aWattar (DE/AT) und Tibber-Integration: 24h-Preiskurve im Dashboard, Auto-Set des günstigsten 4h-Lade-Fensters |
| **PDF-Abrechnung** | Unterschriftsreife PDF für Heimladen-Erstattung (clientseitig, keine Cloud) |
| **Benachrichtigungen** | Web Push + Telegram + **E-Mail** bei Ladeende, SOC-Schwellwerten, Geofence-Events und Wartungserinnerungen — alle Kanäle parallel, jeder einzeln konfigurierbar |
| **Telegram-Bot** | Vollständiger 1:1-Bot mit Inline-Buttons: `/status` (mit Lock/Klima/Sentry/Charge-Buttons + Unlock-Confirm), `/battery`, `/range`, `/location` (Maps-Link), `/today`, `/trips`, `/classify` (Fahrt klassifizieren), `/service`, `/firmware`, `/clean` — plus proaktive Push für Ladung-Ende, Sentry-Alarm, Service-Reminder, neue Firmware-Versionen. Audit-Log für jede Vehicle-Action |
| **Benutzerhandbuch** | Vollständige Anleitung direkt in der App lesbar |
| **Design & Themes** | 5 Design-Stile (Glass, Cyber, Minimal, Sport, **Nevs-Edition**) + 6 Akzentfarben, alles lokal gespeichert; Nevs-Edition mit eigener Bricolage-Grotesque-Typographie und Live-Status-Streifen |
| **Einstellungen** | Alle Sektionen per Klick ein-/ausklappbar (SortableSection), Reihenfolge persönlich sortierbar |
| **Navigation** | Individuell sortierbare und ein-/ausblendbare Navigationspunkte |
| **Mobile / Tesla** | Installierbare PWA für iPhone/iPad (Safari), Android, Tesla-Fahrzeug-Browser und Desktop. iOS-style Tab Bar am unteren Bildschirmrand (4 Schnell-Tabs + „Mehr"-Bottom-Sheet). Kompakte Karten-Ansicht im Fahrtenbuch für schmale Bildschirme. |
| **CO₂-Bilanz** | Eigene Seite mit eingespartem CO₂ vs. fiktiver Verbrenner (6,5 l/100 km), Vergleichswerte (Bäume/Jahr, Flüge FRA-PMI) und transparenter Methodik. Auch wöchentlich im Energiebericht. |
| **Wöchentlicher Fahr-Report** | Jeden Montag 07:00 Uhr automatisch: km der Woche, Verbrauch, Ladekosten, Trend gegenüber Vorwoche — per Push, Telegram und E-Mail |
| **Proaktive Wochen-Insights** (v3.30) | Dashboard-Karte „Deine Woche" mit Klartext-Hinweisen: Fahrleistung, Verbrauch vs. 90-Tage-Schnitt (inkl. Kälte-Begründung), Ladekosten, offene Auffälligkeiten. Reine Statistik; optionale lokale LLM-Veredelung (Ollama) nachrüstbar |
| **Wetter-Verbrauch** | Verbrauchskorrelation nach Temperatur-Bucket (< −10 °C bis > 30 °C) im Energiebericht — sieht wie Kälte/Hitze den Verbrauch beeinflusst |
| **Klimastatistiken** | Tägliche Klimaanlage-Nutzung (Stunden), Sitzheizung, Vorklimatisierungen, kältester/wärmster Tag |
| **Firmware-Tracker** | Automatisches Aufzeichnen jeder neuen Fahrzeug-Softwareversion mit Verlauf und Installationsdauer |
| **Community Benchmark** | Opt-in anonymer Verbrauchsvergleich mit anderen Fahrern desselben Modells; k-Anonymität, SHA-256-Hash, DSGVO-konform |
| **System-Status** | Ampel-Karte (Tesla-Token, Virtual Key, Fleet Telemetry, Poller, DB) — grün/gelb/rot auf einen Blick |
| **Betriebs-Selbsttest** (v3.32) | Admin-Selbsttest unter **System**: prüft auf Knopfdruck und automatisch wöchentlich im nächtlichen Wartungslauf Sicherheit und Backup-Integrität — MFA-Abdeckung, Verschlüsselungsschlüssel, kritische Secrets, Audit-Log-Aktivität, SQLite-Integrität sowie Aktualität und Integrität des letzten Backups — als Ampel-Report. Reine Diagnostik, keine KI |
| **Aktivitäts-Heatmap** | Kalender-Heatmap aller Fahrten (Jahr/Monat/Woche/Alle) im Fahrtenbuch, Klick führt zur Fahrtenliste des Tages |
| **Mandanten-Pseudonym** | Datenschutz: Login-Seite zeigt zufälligen `adjective-noun`-Pseudonym statt Klarnamen, vom Admin neu generierbar |
| **Fleet Telemetry primär** | WebSocket-Streaming als bevorzugte Datenquelle (Tesla-Approval-pflichtig). Wenn aktiv → Poller schaltet auf 1×/h-Heartbeat, spart >95 % API-Budget. Sonst API-Polling als Fallback |
| **1-Klick-Tesla-Registrierung** (v3.23.5) | Der Wizard meldet deine App selbst bei Tesla an (`partner_accounts`) — kein Terminal, kein `curl`. Client ID + Secret eintragen, Domain bestätigen, registrieren. Secret bleibt serverseitig, Domain = `FRONTEND_URL` (nicht fälschbar). Voraussetzung für Fleet Telemetry |
| **Encryption at rest** | AES-256-GCM für Tesla-OAuth-Tokens, TOTP MFA-Secret, Virtual-Key Private-Key. Hash + timing-safe Compare für Password-Reset-Tokens. Auto-generierter Key in `data/.encryption-key` |
| **Auto-Update PWA** | Service-Worker erkennt Deploys und reloaded automatisch — kein `Strg+Shift+R` mehr nötig, auch iOS-PWA |

---

## Vorschau

Live-Screenshots aus der Demo-Instanz, täglich um 04:45 automatisch erneuert:

<table>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/dashboard.png" alt="Dashboard" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/trips.png" alt="Fahrten" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/charging.png" alt="Laden" /></td>
  </tr>
  <tr>
    <td align="center"><em>Dashboard</em></td>
    <td align="center"><em>Fahrten</em></td>
    <td align="center"><em>Laden</em></td>
  </tr>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/routes.png" alt="Routenplaner" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/telemetry.png" alt="Telemetrie" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/settings.png" alt="Einstellungen" /></td>
  </tr>
  <tr>
    <td align="center"><em>Routenplaner</em></td>
    <td align="center"><em>Telemetrie</em></td>
    <td align="center"><em>Einstellungen</em></td>
  </tr>
</table>

📸 Live-Demo: **[demo.teslaview.krische.com](https://demo.teslaview.krische.com)** · [Mobile-Ansicht](https://www.teslaview.krische.com/shots/mobile/dashboard.png) · [Alle Screenshots](https://www.teslaview.krische.com/#screens)

### Telegram-Bot

Verknüpfe dein Konto unter *Einstellungen → Telegram* und nutze den Bot direkt auf dem iPhone/Android:

<table>
  <tr>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-status.png" alt="/status mit Inline-Buttons" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-notification.png" alt="Push-Benachrichtigung" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-classify.png" alt="Fahrt klassifizieren" /></td>
  </tr>
  <tr>
    <td align="center"><em>/status mit Inline-Buttons</em></td>
    <td align="center"><em>Push-Benachrichtigung</em></td>
    <td align="center"><em>Fahrt klassifizieren</em></td>
  </tr>
</table>

Befehle: `/status`, `/battery`, `/range`, `/location`, `/today`, `/trips`, `/classify`, `/service`, `/firmware`, `/clean`, `/help`, `/unlink`. Inline-Buttons unter `/status` für Lock/Unlock (mit Confirm), Klima, Sentry, Laden. Push-Notifications für Ladung-Ende, Sentry-Alarm, Wartungsfälligkeit und Software-Updates — parallel zum WebPush.

[Alle Telegram-Mockups ansehen ↗](https://www.teslaview.krische.com/#telegram)

#### Warum Telegram und nicht WhatsApp / Signal?

Diese Entscheidung wird oft gefragt — kurz zusammengefasst:

| Dienst | Selbst-Hosten? | API für private Bots? | Eingesetzt |
|---|---|---|---|
| **Telegram** | Bot-API komplett offen, BotFather kostet 0 €, kein Account-Risiko | ✅ Ja | ✅ **Ja, primärer Kanal** |
| **WhatsApp** | Nur via Meta Cloud API (Business-Konto + verifizierte Business-Nummer + Template-Approval). Privat-Use mit eigener Nummer **nicht vorgesehen**. Inoffizielle Libs (whatsapp-web.js, baileys) sind **ToS-Verstoß** und führen zu Account-Bann. | ❌ Nicht für Privatnutzer | ❌ **Nein** — bewusst nicht implementiert |
| **Signal** | Kein offizieller Bot-Server, keine Webhook-API. Selbst-betriebene Forks (signald) sind fragil und werden von Signal regelmäßig blockiert. | ❌ Nein | ❌ **Nein** |
| **Threema** | Offizielle REST-API für Business — aber kostenpflichtig (~50 €/Jahr Gateway-Account) | ⚠ Ja, kommerziell | ❌ Nicht implementiert (kostenpflichtig) |
| **Web Push** (PWA) | Browser-Standard, läuft direkt auf iPhone/Android, kein Konto, keine Server-Verbindung zu Dritten außer dem Browser-Push-Service | ✅ Ja | ✅ **Ja, primärer Kanal** |

**Fazit:** Telegram + Web Push decken zusammen die wichtigsten Kanäle ab, ohne Drittanbieter-Kosten, ohne ToS-Verletzungen und ohne Tracking. WhatsApp wäre technisch möglich, aber das Setup (Business-Konstruktion mit Approval-Prozess von Meta) widerspricht dem Self-Hosting-Charakter von TeslaView. Wer trotzdem WhatsApp will: Bridge-Lösungen wie *whatsapp-web.js* können sich Power-User selbst dazubauen — wir empfehlen es nicht.

---

## Multi-Mandanten-Architektur (seit v2.0)

Seit v2.0 unterstützt Tesla Carview **mehrere Mandanten** mit vollständiger Datenisolierung:

- Jeder Mandant hat seine eigene SQLite-Datenbank
- Neue Mandanten nur per **Einladungslink** mit optionaler **Notiz** (Admin → Benutzer → Einladungslink erstellen, 7 Tage, einmalig); Einladungen lassen sich erneut ausstellen, sperren oder löschen
- **Mehrere Fahrzeuge** pro Mandant: Sync über Einstellungen → 🔄 Fahrzeuge synchronisieren
- **Benutzerverwaltung** pro Mandant (Rollen, Fahrzeugzuweisung, Sperren) mit feingranularen Permissions: `Fahrzeuge bearbeiten`, `Fahrzeuge anlegen`, `MFA-Pflicht` pro Benutzer
- **Erzwungene MFA für neue Konten** — Router-Guard leitet zur TOTP-Einrichtung um, bis MFA aktiv ist
- **Admin-Aufgabenkarte** zeigt aktive Benutzer ohne zugewiesenes Fahrzeug mit Direkt-Aktionen
- **Eintrag-Ersteller im Betriebsbuch** wird automatisch mitgeführt und angezeigt
- **Passkey-Authentifizierung** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Passwort-Reset** via Admin-generiertem Link
- **Heim-Wallbox-Erkennung über Monta** (Charge-Point-ID-Match → 🏠-Marker in Lade-Liste und Abrechnung)
- **Kostenlose Ladungen**: in der Ladehistorie markierbar, werden aus der Abrechnung ausgeschlossen
- **Versionsbump auf Legal-Seiten** schreibt automatisch das aktuelle Datum in die „Stand:"-Zeile, bevor versioniert wird

---

## System-Voraussetzungen

| Komponente | Mindest | Empfohlen | Hinweis |
|---|---|---|---|
| **CPU** | 1 Kern | 2+ Kerne | Pi 5 / VPS / x86 — alles ARM64 + AMD64 |
| **RAM** | 2 GB | 4+ GB | mit Ollama: 4+ GB Pflicht (1B-Modell), 8+ GB für 3B-Modelle |
| **Disk** | 2 GB | 10+ GB | mit Ollama: zusätzlich 1–20 GB pro Modell |
| **OS** | Docker-fähig | Debian/Ubuntu/Pi OS | systemd-basiert empfohlen |
| **Internet** | nein | DSL+ | für Tesla-API + GHCR-Image-Pulls + Ollama-Modell-Downloads |

### KI-Modus-Hardware-Tabelle (Ollama lokal)

Falls du den datensouveränen lokalen KI-Chat (Ollama, default-aktiv) nutzen willst:

| Hardware | Empfohlenes Modell | RAM-Bedarf | tok/s (Inferenz) | Brauchbar für |
|---|---|---|---|---|
| Pi 4 (4 GB) | `llama3.2:1b` | ~1.5 GB | 4–6 | einfache Q&A, Wartezeit spürbar |
| Pi 4 (8 GB) | `qwen2.5:1.5b` | ~1.8 GB | 3–5 | besser, immer noch langsam |
| Pi 5 (8 GB) | `qwen2.5:3b` | ~3 GB | 4–6 | empfohlener Standard |
| VPS (4 vCPU/8 GB) | `qwen2.5:3b` | ~3 GB | 8–12 | komfortabel |
| VPS/Workstation (16 GB+) | `llama3:8b` | ~6.5 GB | 5–8 | sehr gut, etwas langsamer |
| GPU (8+ GB VRAM) | `llama3:8b` o.ä. | je Modell | 30–80+ | enterprise-grade |

**Ollama deaktivieren** wenn deine Hardware nicht reicht — `docker-compose.override.yml` anlegen mit:
```yaml
services:
  ollama:
    profiles: [disabled]
```
Danach `docker compose up -d` ohne Ollama. Oder einfacher: im Wizard `KI-Provider = Aus`. Cloud-Alternative: `KI-Provider = Grok` (xAI API-Key nötig, Daten gehen in die Cloud).

## Schnellstart

> **⏳ Vorbereitung Tesla-Side (kannst du parallel zum Setup anstoßen):**
> Tesla Fleet API nutzen heißt: bei [developer.tesla.com](https://developer.tesla.com/) eine Application registrieren. **Tesla-Approval kann 1–3 Wochen dauern.** Die Installation selbst läuft auch ohne — alle Nicht-Tesla-Features funktionieren sofort, die Tesla-Werte trägst du später mit `bash deploy/setup-wizard.sh` nach. Siehe [docs/04-tesla-api.md](docs/04-tesla-api.md) für Schritte und Virtual-Key-Setup.

### Raspberry Pi / Linux-Server (empfohlen)

```bash
# Als root auf dem Zielgerät:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Das Script erkennt automatisch die Architektur (x86_64, ARM64, ARMv7) und installiert alles.

### Lokale Entwicklung

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# Backend
cd backend
cp .env.example .env
# .env anpassen (JWT_SECRET ist Pflicht!)
npm install && npm run dev

# Frontend (zweites Terminal)
cd frontend && npm install && npm run dev
```

→ Browser öffnen: **http://localhost:5173**
→ Beim ersten Start automatisch zum Setup-Wizard weitergeleitet

### Nur Konfiguration einrichten

```bash
bash deploy/setup-wizard.sh
```

Interaktiver Assistent für: Domain, Tesla-API-Zugangsdaten, E-Mail, Web-Push.

---

## Erstkonfiguration (Web-Wizard)

Beim ersten Start wird automatisch auf **/setup** weitergeleitet.
Dort kannst du im Browser Mandantenname und Administrator-Account anlegen.

Empfohlene Schritte nach dem Login:
1. Tesla-Fahrzeug verbinden (Einstellungen → Tesla)
2. Virtual Key am Fahrzeug registrieren (Einstellungen → Virtual Key)
3. MFA aktivieren (Einstellungen → Zwei-Faktor-Authentifizierung)
4. Ladeorte konfigurieren

Das **Benutzerhandbuch** ist direkt in der App unter `/handbook` verfügbar.

---

## Fahrzeugbefehle & Virtual Key

Für Fahrzeugbefehle (Klimaanlage, Türen, Hupen etc.) ist ein **Virtual Key** notwendig.
Der Virtual Key erlaubt der App, signierte Befehle direkt ans Fahrzeug zu senden.

**Voraussetzung**: Ein laufender [`tesla-http-proxy`](https://github.com/teslamotors/vehicle-command) auf dem Server.

```bash
# Proxy starten (Beispiel – Pfade anpassen):
tesla-http-proxy -port 4443 -host 0.0.0.0 \
  -tls-key /etc/tesla-proxy/server.key \
  -cert /etc/tesla-proxy/server.crt \
  -key-file /etc/tesla-proxy/tesla_priv.pem
```

Der öffentliche Schlüssel muss unter `/.well-known/appspecific/com.tesla.3p.public-key.pem`
der App-Domain erreichbar sein, damit das Fahrzeug den Key verifizieren kann.


---

## Monta-Integration (optional)

Tesla Carview unterstützt optionale Synchronisation mit [Monta](https://monta.com) –
einem EV-Lademanagement-Dienst. Die Integration steht für **alle Fahrzeuge** zur Verfügung:

- **Privatfahrzeuge**: Monta-Ladesessions werden in der Abrechnung als Heim-Ladung angezeigt (🏠-Badge, automatische Heimladerkennung).
- **Dienstwagen**: Zusätzlich vollständige Kostenabrechnung — Monatsübersicht, PDF-Erstattungsblatt, Abrechnungsvorlage für den Arbeitgeber.

Konfiguration pro Fahrzeug in den Einstellungen (Fahrzeugprofil → Heimladen):
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (filtert Sessions auf einen bestimmten Ladepunkt)
- **Strompreis Wallbox** (€/kWh, Abrechnungsgrundlage für Dienstwagen)

Die Synchronisation läuft manuell über **Abrechnung → Monta Sync**.


---

## Sicherheit

- JWT (Access-Token 15 min, Refresh-Token 7 Tage als httpOnly-Cookie)
- **TOTP-MFA** (Google Authenticator, Authy, 1Password etc.)
- **Passkeys** (WebAuthn, passwortloser Login)
- **10 Backup-Codes** (bcrypt-gehasht, einmalig verwendbar)
- **Account-Lockout** nach 5 Fehlversuchen (15 min)
- **fail2ban** IP-Sperre nach 3 fehlgeschlagenen Logins (10 min)
- **HTTPS** mit TLS 1.2/1.3, HSTS, OCSP-Stapling
- **CSP, X-Frame-Options, Permissions-Policy** Header
- **Rate-Limiting** auf Login- und API-Endpunkten
- **Audit-Log** aller sicherheitsrelevanten Aktionen
- **Datenlöschung** mit Backup-Warnung und Bestätigungstext

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) + WebAuthn (@simplewebauthn) |
| Tesla-Daten | Tesla Fleet API (OAuth2) + Fleet Telemetry (WebSocket) |
| Multi-Tenancy | Separate SQLite-Datenbanken pro Mandant, Master-DB für globale Daten |
| Deployment | Docker Compose + Nginx + Let's Encrypt |
| Plattformen | linux/amd64 · linux/arm64 · linux/arm/v7 |

---

## Projektstruktur

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # Schema + DB-Initialisierung (master-schema.sql)
│   │   ├── middleware/    # auth.js (multi-tenant JWT), security.js, validate.js
│   │   ├── routes/        # auth, setup, register, passkey, password-reset,
│   │   │                  # users, vehicles, trips, charging, data-management, …
│   │   └── services/      # teslaApi, poller (multi-tenant), dataSync (GPS), …
│   └── .env.example       # Konfigurationsvorlage
├── frontend/
│   └── src/
│       ├── views/         # Login, Register, Setup, Dashboard, Trips,
│       │                  # Settings (Passkey), UserManagement, DataManagement,
│       │                  # Handbook, PasswordReset, …
│       ├── components/    # NavBar (Admin-Links, Handbuch), StatCard
│       ├── store/         # auth.js (Passkey, Mandant), index.js
│       └── router/        # Routen mit Admin-Guard
├── deploy/
│   ├── setup.sh                  # Vollautomatisches Server-Setup
│   ├── setup-wizard.sh           # Interaktiver Konfigurations-Assistent
│   ├── nginx-host.conf.template  # Nginx-Config (HTTPS, TLS-Hardening)
│   └── update.sh                 # Zero-Downtime-Update
├── docs/                  # Detaillierte Anleitungen
├── docker-compose.yml          # Entwicklung
└── docker-compose.prod.yml     # Produktion
```

---

## Wichtige Umgebungsvariablen (.env)

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `JWT_SECRET` | Geheimer Schlüssel für JWT (mind. 32 Zeichen, zufällig) | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Tesla Developer App Client-ID | `abc123…` |
| `TESLA_CLIENT_SECRET` | Tesla Developer App Secret | `secret…` |
| `FRONTEND_URL` | Öffentliche URL der App (für OAuth-Callback + Passkeys) | `https://carview.example.com` |
| `RP_NAME` | Anzeigename für Passkey-Dialoge | `Tesla Carview` |
| `RP_ID` | Domain für WebAuthn (ohne Protokoll) | `carview.example.com` |

---

## Dokumentation

Tesla Carview hat zwei getrennte Dokumentations-Ebenen:

### 👤 Für Benutzer der App

In-App-Handbuch unter `/handbook` in der laufenden App — oder direkt in [`frontend/src/handbook/handbook.de.md`](frontend/src/handbook/handbook.de.md) (deutsch) bzw. [`handbook.en.md`](frontend/src/handbook/handbook.en.md) lesbar. Themen: Dashboard, Fahrten, Laden, Fahrtenbuch (BMF), Steuerung, Wartungsintervalle, Demo-Modus, mobile Installation, Fehlerbehebung aus User-Sicht.

### 🛠 Für Self-Hoster und Administratoren

Technische Dokumentation im [`docs/`](docs/README.md)-Ordner:

| Dokument | Inhalt |
|---|---|
| [📚 Doku-Übersicht](docs/README.md) | Wegweiser durch alle Tech-Dokumente |
| [Quickstart](docs/01-quickstart.md) | Lokale Entwicklungsumgebung |
| [Deployment](docs/02-deployment.md) | Server-Deployment + Raspberry Pi |
| [Authentifizierung & MFA](docs/03-authentication.md) | Login-System, MFA, Passkeys |
| [Tesla Fleet API](docs/04-tesla-api.md) | Tesla Developer Account einrichten |
| [Sicherheitsarchitektur](docs/05-security-architecture.md) | Threat-Model, alle Maßnahmen |
| [fail2ban](docs/06-fail2ban.md) | Brute-Force-Schutz konfigurieren |
| [Setup-Wizard](docs/07-setup-wizard.md) | Interaktiver Konfigurations-Assistent |
| [Dokploy-Deployment](docs/08-dokploy.md) | Alternative Deployment-Plattform |
| [Tesla-API-Quota](docs/09-tesla-api-usage.md) | API-Kosten und Tracking |
| **[🔧 Konfiguration (ENV)](docs/10-configuration.md)** | Alle Umgebungsvariablen — Pflicht, Optional, Demo, Auto-Update |
| **[🛠 Betrieb & Operationen](docs/11-operations.md)** | Backup/Restore, nächtliche Wartung, Demo-Modus, Auto-Update, Logs |
| **[🛡️ Hochverfügbarkeit (HA)](docs/12-high-availability.md)** | Architektur-Optionen für SLA-kritische Setups (Teaser, auf Anfrage) |

---

## Updates

```bash
bash deploy/update.sh
```

---

## Mitmachen

Beiträge sind willkommen! Lies zuerst die [Contribution Guidelines](CONTRIBUTING.de.md), dann such dir ein [good first issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue) aus oder öffne direkt einen Pull Request.

---

## Lizenz

[**PolyForm Noncommercial 1.0.0**](LICENSE) — nicht-kommerzielle Software-Lizenz von [polyformproject.org](https://polyformproject.org).

**Erlaubt:** Privatnutzung, Self-Hosting (auch für Familie/Haushalt), Modifikationen, kostenlose Weitergabe unter denselben Bedingungen, Nutzung durch gemeinnützige Organisationen, Bildungs- und Forschungseinrichtungen.

**Verboten:** Verkauf der Software, kostenpflichtiger Betrieb als Dienst (SaaS) für Dritte, kommerzielle Nutzung in jeglicher Form, Unterlizenzierung.

Bei Weitergabe muss der vollständige Lizenztext und der Copyright-`Required Notice` mitgeliefert werden. Software wird „wie sie ist" bereitgestellt, ohne Gewährleistung — Details siehe [LICENSE](LICENSE).

### 📜 Prior-Art-Disclosure

Alle in diesem Repository dokumentierten technischen Verfahren — insbesondere **Battery-Health-Companion** (Phase 1+2), **OwnTracks-Validation via Bluetooth-Trigger** mit Trip-Lock pro Fahrzeug, **automatisches Ladelimit pro Geofence-Standort**, **Kuratierter Web-App-Hub für den Tesla-Browser**, **POI-Suche im Umfeld einer Lade-Session via OSM Overpass**, **Auto-Reverse-Geocoding mit lokalem Cache**, **Adress-First-UI-Strategie** und **multi-stufige Anomalie-Detection mit Push-Empfehlung** — sind zum Datum des jeweiligen Git-Commits öffentlich publiziert und gelten als „prior art" im Sinne des Patent- und Markenrechts.

Diese Offenlegung soll spätere Schutzrechtsanmeldungen Dritter auf dieselben Verfahren verhindern.

Git-Hashes + Commit-Datumsstempel sind kryptografisch verifizierbar und durch GitHub als unabhängiger Dritter zeitlich bestätigt.

---

## ❤️ Unterstützen

Tesla Carview ist **für die private, selbst gehostete Nutzung im eigenen Haushalt** kostenlos und werbefrei (siehe [LICENSE](LICENSE) und [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)). Kommerzieller Verkauf, SaaS-Angebote für Dritte oder die Einbettung in kommerzielle Produkte sind nicht gestattet.

Wenn dir das Programm etwas wert ist, freuen sich folgende gemeinnützige
Organisationen über deine direkte Unterstützung:

| Organisation | Beschreibung |
|---|---|
| **Aktion Deutschland Hilft** | Bündnis von Hilfsorganisationen für schnelle und wirkungsvolle Katastrophenhilfe weltweit |
| **Lebenshilfe Rems-Murr** | Unterstützung, Begleitung und Teilhabe für Menschen mit Behinderung im Rems-Murr-Kreis |
| **Radio 7 Drachenkinder** | Hilfe für schwer kranke Kinder in der Region – finanziert Therapien und Wünsche |

> **100 % deiner Spende geht direkt an die Einrichtung. Wir sehen weder den Betrag noch deine Daten.**

In der App erreichbar über den **❤ Unterstützen**-Link im Footer am unteren Seitenrand oder direkt unter `/support`.

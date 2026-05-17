# Funktionsübersicht

🌐 **Sprache / Language:** [EN](Features) · [FR](FR-Features) · [ES](ES-Features) · [TR](TR-Features) · [EL](EL-Features) · **DE**

---

Tesla Carview deckt den gesamten Lebenszyklus deines Tesla ab — vom Tracking jeder Fahrt über die Fahrzeugsteuerung und Routenplanung bis zur Verwaltung der Ladekosten. Alles läuft auf deinem eigenen Server.

---

## Was bietet Tesla Carview?

| Modul | Kurzbeschreibung |
|---|---|
| 📊 Dashboard | Live-Status, Statistiken, Tarif-Widget, System-Health |
| 🚗 Fahrtenbuch | Automatisch aufgezeichnete Fahrten, BMF-konformer PDF-Export |
| ⚡ Laden | Ladesitzungen, Orte, Monta-Sync, Kostenabrechnung |
| 🔋 Akku | Gesundheitsanalyse, Degradation, Reichweite-Historie |
| 🗺️ Routenplaner | OSRM-Routing, intelligente Ladeplanung, SoC-aware, Wetter/Verkehr/Blitzer, Tile-Proxy |
| 🎮 Fahrzeugsteuerung | Klima, Schlösser, Laden, OTA, geplantes Laden |
| 📝 Wartungsbuch | Wartungseinträge, Intervalle, Push-Erinnerungen |
| 💬 Grok Chat | xAI-gestützter KI-Assistent mit Fahrzeugkontext |
| 📤 Export | CSV, JSON, PDF-Rechnungen, vollständiges Backup |
| 🔐 Sicherheit | Passkeys, MFA (TOTP), QR-SSO für Tesla-Browser |
| 🌍 Mehrsprachig | DE · EN · FR · ES · TR · EL |
| 📱 PWA | Auf Home-Screen installierbar, Offline-Shell |

---

## 📊 Dashboard

Das Dashboard ist deine zentrale Übersicht:
- **Live-Fahrzeugstatus** — Akkustand, Reichweite, Standort, Ladestatus
- **Letzte Fahrten** — die letzten 5 Fahrten mit Distanz und Verbrauch
- **Monatsstatistiken** — Kilometer, verbrauchte Energie, Ladekosten
- **Dynamisches Tarif-Widget** — aktueller Strompreis (aWATTar DE/AT, Tibber) mit 24-h-Preiskurve und Auto-Set-Ladefenster
- **Wartungsintervalle** — anstehende Erinnerungen (TÜV, Öl, Bremsflüssigkeit, etc.)
- **System-Health** — Tesla API-Status, Fleet Telemetry, Datenbankgröße

Das Dashboard ist vollständig anpassbar: Karten ein-/ausblenden und neu sortieren unter **Einstellungen → Wizard starten**.

---

## 🚗 Fahrten (Fahrtenbuch)

Jede Fahrt wird automatisch aufgezeichnet:
- Start- und Endort (Adresse + GPS-Koordinaten)
- Distanz, Dauer, Durchschnittsgeschwindigkeit
- Energieverbrauch (kWh und kWh/100 km)
- Akkustand bei Start/Ende
- Fahrttyp (privat / Arbeitsweg / dienstlich)

### BMF-konformes Fahrtenbuch
Das Fahrtenbuch erfüllt die Anforderungen des deutschen Finanzamts:
- Geschäftspartner- und Zweck-Felder
- Fortlaufende Nummerierung
- Sperr-Funktion zur Finalisierung
- **PDF-Export** in A4-Querformat mit allen Pflichtfeldern
- Fahrten zusammenführen und aufteilen
- Manuelle Fahrteinträge für vergessene Fahrten

### GPS-Ortskorrektur
Fehlende oder falsche Adressen lassen sich direkt in der Fahrtdetailansicht bearbeiten.

---

## ⚡ Laden

Alle Ladesitzungen werden automatisch protokolliert:
- Ort (GPS-Abgleich mit gespeicherten Ladeorten)
- Geladene Energie (kWh) und geschätzte Kosten
- Ladegeschwindigkeit und Dauer
- Heimladungs-Flag (🏠) via Monta-Integration

### Ladeorte
Definiere Heim- und Lieblingsladepunkte unter **Einstellungen → Ladeorte** — Sitzungen werden automatisch zugeordnet, und ein kWh-Tarif für die Kostenberechnung wird gesetzt.

### Monta-Integration
Monta-API-Key in den Einstellungen hinterlegen. Ladesitzungen synchronisieren sich automatisch mit korrekten kWh- und Kostendaten.

### Kostenabrechnung & PDF-Rechnung
PDF-Rechnungen für die Erstattung (z. B. durch den Arbeitgeber) unter **Abrechnung → Rechnung erstellen** — vollständig clientseitig generiert.

---

## 🔋 Akku

Akkugesundheit im Zeitverlauf:
- Degradationskurve (geschätzte vs. Nenn-Reichweite)
- Ladezyklus-Zähler
- Historische Ladestandsdaten
- Reichweitenvergleich bei verschiedenen Temperaturen

---

## 🗺️ Routenplaner

Routen im Voraus planen und direkt an die Tesla-Navigation senden:

- **Startort** — automatisch aus Fahrzeug-GPS, Browser-GPS oder manueller Eingabe
- **Zielsuche** — Geocoding via Nominatim (Backend-Proxy, keine CSP-Probleme)
- **Bis zu 5 Zwischenstopps** — beliebige Zwischenpunkte hinzufügen
- **OSRM-Routing** — Open-Source-Routenengine, kein Account erforderlich
- **Ankunfts-SoC** — berechnet den Akkustand am Ziel basierend auf deinem echten Verbrauch
- **Ladestation-Overlay** — zeigt Schnellladestationen (CCS, CHAdeMO, Tesla) entlang der Route via OpenChargeMap
- **An Tesla senden** — ein Tipp übermittelt das Ziel an die Fahrzeugnavigation
- **Routen speichern & laden** — Lieblingsrouten für schnellen Zugriff speichern
- **ABRP-Fallback** — optionaler Link zu A Better Route Planner mit vorausgefülltem Ziel
- **Intelligente Ladeplanung** — fügt automatisch Ladestopps ein wenn die Strecke den Akku überschreitet; jeder Stopp zeigt geschätzte Ladezeit, Ladertyp und SoC bei An-/Abfahrt
- **Abfahrts-SoC** — auto-befüllt aus Live-Fahrzeugdaten (Ad-hoc) oder manuell eingebar (geplante Abfahrt mit geschätztem Ladestand)
- **Ziel-SoC** — konfigurierbarer Mindest-Ladestand am Zielort (Standard 20%)
- **Lade-Ziel je Stopp** — wie voll aufladen an jedem Ladestopp (Standard 80%)
- **Wetter entlang der Route** — Temperatur, Niederschlag, Wind (Open-Meteo, kostenlos)
- **Verkehrshinweise** — Staumeldungen via HERE Maps (optionaler API-Key)
- **Blitzer-Overlay** — Radar-/Kamera-Warnungen aus OpenStreetMap (Rechtshinweis wird angezeigt)
- **Tile-Proxy** — alle Kartenkacheln über Backend-Proxy (kein CSP-Block, kein Rate-Limit)

---

## 🎮 Fahrzeugsteuerung

Steuere deinen Tesla direkt aus der App:
- 🌡️ **Klima** — starten/stoppen, Temperatur setzen, Sitzheizung, Lenkradheizung, Keeper-Modi (Camp/Dog/Keep)
- 🔓 **Schlösser** — Türen öffnen/schließen
- 💡 **Lichter** — Lichthupe, Hupe
- 🚪 **Kofferraum/Frunk** — öffnen
- 🪟 **Fenster** — öffnen/schließen
- 🔌 **Laden** — Ladeklappe, Ladestromstärke, starten/stoppen
- ⏰ **Geplantes Laden** — Günstig-Ladefenster setzen
- 🔄 **Software-Updates** — OTA anstoßen und überwachen
- 🎵 **Boombox** — Boombox-Sounds abspielen (wo unterstützt)

> Befehle erfordern den gepaarten **Virtual Key**. Siehe [Tesla API Setup](DE-Tesla-API-Setup).

---

## 📝 Wartungsbuch (Betriebsbuch)

Alle Wartungsereignisse dokumentieren:
- Datum, Kategorie (Wartung / Reparatur / Reifen / Inspektion / Notiz)
- Kosten, Kilometerstand, Werkstattname
- Beschreibung

### Wartungsintervalle & Erinnerungen
Intervalle unter **Einstellungen → Wartungsintervalle** konfigurieren. Web-Push-Benachrichtigungen werden 30 Tage und 1 000 km vor Fälligkeit gesendet. Das Dashboard zeigt eine Vorschaukarte mit anstehenden Terminen.

---

## 💬 Grok Chat (KI-Assistent)

Stelle Fragen zu deinen Tesla-Daten in natürlicher Sprache — angetrieben von xAI Grok:
- **Kontext-bewusst** — Grok sieht deine letzten Fahrten, Ladesitzungen und Fahrzeugdaten
- **Streaming** — Antworten erscheinen Wort für Wort
- **Chat-Historie** — Gespräche werden gespeichert und sind durchsuchbar
- **Tagesbudget** — maximale Token-Ausgaben täglich begrenzen
- **Datenschutz** — Anfragen laufen über das Backend, nie direkt vom Browser zu xAI; keine vollständigen VINs oder exakten Adressen werden übermittelt

> Erfordert einen xAI-API-Key (`XAI_API_KEY` in `.env`). Erhältlich unter [console.x.ai](https://console.x.ai).

---

## 🔐 Sicherheit & Authentifizierung

### Passkeys (WebAuthn)
Login mit Face ID, Touch ID oder Hardware-Schlüssel statt Passwort. Passkeys verwalten unter **Einstellungen → Passkeys**.

### MFA (TOTP)
Zwei-Faktor-Authentifizierung mit jeder Authenticator-App. Backup-Codes werden bei der Einrichtung generiert.

### QR-SSO für den Tesla-Browser
Der eingebaute Tesla-Browser kann kein Face ID oder Hardware-Schlüssel verwenden. Der QR-Login löst das:
1. Tesla-Browser zeigt einen QR-Code (5 min gültig)
2. Mit Smartphone scannen
3. Passkey / Face ID auf dem Smartphone bestätigen
4. Die Tesla-Browser-Session wird automatisch freigeschaltet

### Passwort
Standard-Benutzername/Passwort-Authentifizierung mit bcrypt. Admins können Reset-Links für Benutzer generieren.

---

## 🧙 Einrichtungs-Wizard

Ein schrittweiser Wizard führt durch die Erstkonfiguration und kann jederzeit unter **Einstellungen → Wizard starten** neu gestartet werden.

**Admin-Schritte (Ersteinrichtung):**

| # | Schritt | Was konfiguriert wird |
|---|---|---|
| 1 | Sprache | Oberflächensprache |
| 2 | Tesla OAuth | Tesla-Konto verbinden |
| 3 | Fahrzeuge | Fahrzeuge auswählen und synchronisieren |
| 4 | Virtual Key | Für Fahrzeugbefehle pairen |
| 5 | Fleet Telemetry | Echtzeit-GPS pro Fahrzeug aktivieren |
| 6 | Strompreis | Energiekosten pro Fahrzeug |
| 7 | Legal | Impressum, Datenschutz, AGB (prüft auf offene Platzhalter) |
| 8 | Externe APIs | Monta · OpenChargeMap · HERE Maps · Tibber · xAI |
| 9 | Monitoring | SMTP E-Mail-Versand · Anthropic-Key für KI-Autofix |
| 10 | Design | Glass / Cyber / Minimal / Sport |
| 11 | Akzentfarbe | Theme-Farbe |
| 12 | Einheiten | km/mi · °C/°F · kWh |
| 13 | Dashboard | Karten-Sichtbarkeit und Reihenfolge |
| 14 | Navigation | Tab-Sichtbarkeit |
| 15 | Benachrichtigungen | Push-Benachrichtigungs-Einstellungen |
| 16 | Zusammenfassung | Alle Änderungen prüfen und bestätigen |

Nicht-Admin-Benutzer sehen nur Schritte 10–16 (Design, Einheiten, Dashboard, Navigation, Benachrichtigungen, Zusammenfassung).

---

## 🌡️ Dynamischer Tarif (aWATTar / Tibber)

aWATTar (DE/AT, kein API-Key nötig) oder Tibber (API-Key in Einstellungen) verbinden:
- Dashboard zeigt aktuellen Preis und 24-h-Preiskurve
- **Auto-Set-Ladefenster** — ein Klick setzt geplantes Laden auf das günstigste 4-h-Fenster in den nächsten 24 Stunden

---

## 🌍 Mehrsprachig

Vollständig übersetzt in: 🇩🇪 Deutsch · 🇬🇧 Englisch · 🇫🇷 Französisch · 🇪🇸 Spanisch · 🇹🇷 Türkisch · 🇬🇷 Griechisch

Sprachauflösung:
1. Benutzerprofil-Einstellung (höchste Priorität)
2. Mandanten-Standardsprache
3. Browser-Sprache

---

## 📱 PWA (Progressive Web App)

Tesla Carview auf dem Home-Screen installieren:
- **Android/Desktop Chrome:** Installations-Icon in der Adressleiste
- **iOS Safari:** Teilen → „Zum Home-Bildschirm"
- **Tesla-Browser:** Menü → „Zum Home-Bildschirm"

Die installierte PWA cachet die App-Shell, funktioniert offline für gecachte Seiten und empfängt Push-Benachrichtigungen.

---

## 🔔 Push-Benachrichtigungen

Benachrichtigungen werden gesendet wenn:
- Laden abgeschlossen ist
- Ein Wartungsintervall bald fällig wird
- Ein Software-Update verfügbar ist

**Einrichten:** Einstellungen → Push-Benachrichtigungen → Aktivieren.

---

## 👥 Multi-Mandant & Benutzer

- Jeder Mandant hat eine vollständig isolierte SQLite-Datenbank
- Admins laden Benutzer per Einmal-Link ein
- Benutzerrechte: Fahrzeuge bearbeiten, Fahrzeuge hinzufügen, MFA-Pflicht
- Mandanten-Standardsprache und -einstellungen

Siehe [Multi-Mandant & Benutzer](DE-Multi-Tenant) für Details.

---

## 🧪 Demo-Modus

Demo-Sandbox mit `DEMO_ENABLED=true` in `.env` aktivieren:
- Fake-Fahrten und Ladehistorie werden automatisch generiert
- Demo-Accounts laufen nach 14 Tagen ab
- IP-basiertes Rate-Limiting verhindert Missbrauch

---

## 📤 Export & Backup

- **Fahrten** — CSV oder JSON
- **Ladesitzungen** — CSV oder JSON
- **Wartungsbuch** — CSV
- **Vollständiges Backup** — JSON (alle Tabellen), wiederherstellbar über **Admin → Datenverwaltung**

---

## 🌙 Wartungsmodus

Wenn das Backend nach einem Update neu startet, zeigt die App einen Overlay mit Tesla-Zitaten, einem Countdown und verbindet sich automatisch wieder sobald das Backend erreichbar ist.

---

## 📅 ICS-Kalenderexport

Geplante Routen können als `.ics`-Datei exportiert und in beliebige Kalender-Apps importiert werden (Google Calendar, Apple Kalender, Outlook, …):

- Exportiert Abfahrtszeit, Ankunftszeit und Gesamtdauer inkl. Ladestopps
- Beschreibung enthält Routenübersicht, Distanz und Energieschätzung
- `CLASS:PRIVATE` wird automatisch gesetzt, um Fahrtdaten in geteilten Kalendern zu schützen
- Hinweis erinnert an die **Privat**-Einstellung bei geteilten Kalendern

Verfügbar im Routenplaner nach Berechnung einer Route.

---

## 🛞 Reifendruck (TireMap)

Die Telemetrie-Ansicht zeigt den Reifendruck als interaktive Fahrzeug-Draufsicht:

- **Farbkodierte Reifen**: grün (2,3–2,9 bar OK), gelb (außerhalb Empfehlung), rot (kritisch < 1,8 oder > 3,4 bar)
- **Glow-Effekt** je nach Drucklevel
- **Tooltip** mit vollständiger Reifenbezeichnung und Status
- **Legende** unterhalb des Fahrzeugs zur schnellen Orientierung
- Kein Signal wird als grauer Platzhalter angezeigt

---

## ♻️ Rekuperationsstatistik

Fahrtdetailseiten zeigen die beim Bremsen zurückgewonnene Energie:

- **Rückgewonnene kWh** während der Fahrt
- **Rekuperationsanteil** (% der verbrauchten Bruttoenergie)
- **Netto-Verbrauch** nach Abzug der Rekuperation (kWh/100 km)
- Visueller Balken zeigt das Rekuperationsverhältnis
- Nur sichtbar wenn Daten vorhanden (ältere Fahrten ohne Power-Daten bleiben sauber)

---

## 🔲 Layout-Toggle in der Fahrzeugsteuerung

Die Fahrzeugsteuerung bietet zwei Darstellungsmodi:

- **Kachel-Layout** — großzügige Karten, ideal für Tablets und große Bildschirme
- **Kompakte Liste** — dichte Übersicht, ideal für kleine Bildschirme oder Power-User
- Umschalter im Header; Einstellung wird in `localStorage` gespeichert

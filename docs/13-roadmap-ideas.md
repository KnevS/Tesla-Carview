# Roadmap-Ideen

> 🇬🇧 [Read in English](13-roadmap-ideas.en.md)

Sammlung von Feature-Ideen für künftige Releases. Inspiriert vom üblichen
Funktionsumfang der Tesla-Datenlogger-Branche (Teslamate, TeslaFi, TeslaLogger,
TeslaMate-Forks, ABRP-Companion, Watt for Tesla u. a.) — **ausschliesslich
Funktionsbeschreibungen**, keine UI-Layouts, keine Texte, keine Code-Snippets
und keine Marken-/Namens-Übernahmen.

> **Rechtlicher Hinweis:** Funktionalität als solche ist im deutschen und
> EU-Recht in der Regel nicht urheberrechtlich geschützt (BGH I ZR 159/10
> „Lottoblock", EuGH C-406/10 „SAS Institute"); was geschützt ist, sind
> konkrete Ausdrucksformen (Code, Texte, grafische Designs). Diese
> Sammlung beschränkt sich auf **was** Apps üblicherweise können —
> Tesla Carview implementiert das **wie** unabhängig.

## Aus der Branche oft gesehen — Kandidaten für Tesla Carview

### Energie & Effizienz
- **Verbrauchs-Vergleich pro Fahrt** vs. WLTP-Konsumwert pro Modell
  (Ist-vs.-Soll-Indikator mit %-Abweichung).
- **Eco-Score pro Fahrt** abgeleitet aus Wh/km vs. eigener
  Fahrzeug-Baseline (rein lokale Berechnung, keine Cloud-Modelle).
- **Energie-Heatmap** auf der GPS-Linie der Fahrt: Farbverlauf zeigt,
  wo Energie verbraucht (rot), zurückgewonnen (grün) und konstant
  gefahren (gelb) wurde.
- **Steigungs-Profil** pro Fahrt (aus open-elevation oder offline-
  Höhen-Tile). Korrelation Verbrauch ↔ Höhenmeter.
- **Klima-Verbrauch separat** ausweisen (Differenz zwischen Drive
  Power und Wheel Power, wenn beides geliefert wird).

### Batterie & Ladung
- **Kapazitäts-Trend** (kWh netto über Zeit, Regression auf
  Degradation, „90 % SoH erreicht in ~X Monaten").
- **Empfohlenes Lade-Fenster** ableiten aus Tarif-Kurve + Soll-SoC +
  geplanter Abfahrtszeit (kombiniert die bestehende aWattar/Tibber-
  Integration mit dem Ziel-Zustand).
- **Verlust-Schätzung beim Schnellladen** (Differenz „bezahlte kWh"
  vs. „nutzbar im Akku angekommen kWh") für Heimladen-Abrechnung
  und für DC-Lader getrennt.
- **Schnellladekurven-Vergleich**: dieselbe Sitzung gegen historische
  Sitzungen am selben Standort/Lader-Typ als Linien-Chart.
- **Phantom-Drain-Tracker**: SoC-Veränderung im Standzustand, pro
  Standort/Saison ausgewertet (Sentry-Mode-Kosten-Schätzung).

### Fahrten & Logbuch
- **Standort-Heatmap** (komplementär zur jetzt vorhandenen Aktivitäts-
  Heatmap): „wo war ich häufig" auf der Karte, ohne Pfad-Linien.
- **Frequente-Routen-Erkennung** — wenn Start/Ziel ähnlich zu einer
  bestehenden Route ist, optional automatisch klassifizieren
  (Arbeitsweg ↔ Privat) und Reisezweck vorschlagen.
- **Trip-Replay**: Fahrt entlang der Zeitachse abspielen mit SoC,
  Speed und Klima-Werten zeitgenau dazu.
- **Geofence-Auto-Klassifikation**: Polygon „Arbeit", „zu Hause",
  Trips zwischen diesen Punkten automatisch als `commute` markieren.
- **Reisezweck-Vorlagen** (häufige Kunden/Geschäftspartner als
  Dropdown im Eingabefeld).

### Komfort & Steuerung
- **Vorklimatisierung-Automatik**: bei nächstem Kalender-Eintrag
  X Min vorher Klima starten, wenn Auto in Reichweite + Plug-in.
- **Sentry-Mode-Smartness**: an Heimat-Punkt nach X Min automatisch
  aus, am Hotel/Parkhaus automatisch an.
- **Tür-Verhalten**: bei Approach + Phone-Key + Heim-Geofence
  Tasche-Mode-Verriegelung.
- **Charging-Limit dynamisch**: SoC-Ziel kommt aus dem
  morgigen Tagesplan (Kalender-Integration optional).

### Auswertungen & Berichte
- **Wartungs-Vorhersage** auf Basis Kilometer-Trend (linear
  extrapoliert): „TÜV wird bei dieser Fahrtfrequenz am DD.MM.YY
  fällig". Bereits halb umgesetzt durch die Service-Intervals.
- **Reichweiten-Realismus pro Wetter**: Tatsächliche Verbrauchsdaten
  korreliert mit Außentemperatur (kommt aus state.outside_temp);
  Vorhersage „bei -5 °C voller Akku entspricht heute ~280 km".
- **Jahresbericht-PDF**: einseitiger Visual-Report mit Heatmap,
  Top-5-Routen, Total-kWh, Total-Kosten, CO₂-Vergleich vs. Diesel-
  Äquivalent (lokal berechnet, keine Cloud-Schätzung).
- **CO₂-Berichts-Modus**: pro Fahrt eine geschätzte CO₂-Bilanz
  mit dem deutschen/EU-Strommix als Default (Operator kann eigene
  g/kWh setzen, z. B. für PV-Anteil).

### System & Multi-User
- **Family-Sharing-Dashboard**: zweiter Tab pro Fahrzeug zeigt
  „Wer hat wann gefahren" — Diagramm pro Fahrer pro Woche
  (nutzt vorhandene `driver_id`-Spalte).
- **Push-Benachrichtigungs-Regeln**: konfigurierbarer Trigger
  (z. B. „SoC < 20 % UND nicht zu Hause" → Reminder).
- **Webhook-Outbound**: pro Tenant einstellbares Ziel
  (Home-Assistant, IFTTT, n8n) — Trip-Ende, Lade-Ende, Wartungs-
  Fälligkeit als JSON-POST.
- **API-Read-Only-Token** für Drittauswertungen, mit Scope-Selektion
  (nur Trips / nur Charging / nur Battery).

### Sicherheit & Datenschutz (über das aktuelle hinaus)
- **GPS-Fuzzing-Modus** pro Tenant einstellbar: Last-Mile-Koordinaten
  um z. B. 200 m gerundet, damit der genaue Wohnort nie persistiert
  wird (relevant bei mehreren Fahrern in einem Tenant).
- **Vergessene-Daten-Job**: Trips älter als N Jahre automatisch
  anonymisieren (GPS-Punkte runden auf 4 Nachkommastellen,
  Adressen entfernen), Audit-Eintrag bleibt.
- **WebAuthn-Step-Up** für besonders schützenswerte Aktionen
  (Backup-Download, Mandant löschen) zusätzlich zum Login-Passkey.

## Aus der Branche bewusst NICHT übernommen

- **Externe Cloud-Sync-Komponenten** (z. B. Datenfreigabe an ein
  Drittanbieter-Dashboard). Widerspricht dem Self-Hosting-Versprechen.
- **Proprietäre Datenformate** für Export. Wir exportieren weiter
  CSV / JSON, damit Daten frei portabel bleiben.
- **Identifizierende Auto-Statistik-Teilnahme** (anonymisierte
  Fahrtdaten an einen Pool senden, um Modell-Durchschnitte zu
  berechnen). Kann optional als opt-in kommen, aber niemals Default.

## Reihenfolge-Vorschlag

Wenn man die Liste priorisiert nach Nutzen-pro-Aufwand:

1. **Geofence-Auto-Klassifikation** (kleine UI, sofort spürbar im Alltag)
2. **Verbrauchs-Vergleich pro Fahrt** vs. WLTP (1 Number, viel Wert)
3. **Standort-Heatmap** (analog zur Aktivitäts-Heatmap, gleiche Render-Logik)
4. **Webhook-Outbound** (öffnet das Ökosystem)
5. **Reichweiten-Realismus pro Wetter** (braucht 1–2 Wochen Datensammlung,
   sonst zu wenig Stützstellen)
6. **Jahresbericht-PDF** (gibt sehr schönes Marketing-Material her)
7. **GPS-Fuzzing-Modus** (für Firmen-Mandanten interessant)

Alle hier genannten Funktionen sind **Vorschläge**, keine Zusagen.
Implementierung erfolgt unabhängig, ohne Übernahme externen Codes
oder externer Texte.

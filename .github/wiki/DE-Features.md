# Funktionsübersicht

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | English version |
| 🇩🇪 **[Deutsch](DE-Features)** | Du bist hier |

---

Tesla Carview deckt den gesamten Lebenszyklus deines Tesla ab — vom Tracking jeder Fahrt bis zur Fahrzeugsteuerung und Verwaltung der Ladekosten.

---

## Dashboard

Das Dashboard ist deine zentrale Übersicht und zeigt:
- **Live-Fahrzeugstatus** — Akkustand, Reichweite, Standort, Ladestatus
- **Letzte Fahrten** — die letzten 5 Fahrten mit Distanz und Verbrauch
- **Monatsstatistiken** — Gefahrene Kilometer, verbrauchte Energie, Ladekosten
- **Dynamisches Tarif-Widget** — Aktueller Strompreis (aWATTar DE/AT, Tibber)
- **Wartungsintervalle** — Anstehende Wartungserinnerungen (TÜV, Öl, Bremsflüssigkeit, etc.)
- **System-Health** — Tesla API-Verbindungsstatus, Fleet Telemetry, Datenbankgröße

Das Dashboard aktualisiert sich automatisch alle 60 Sekunden wenn der Tab geöffnet ist.

---

## Fahrten (Fahrtenbuch)

Jede Fahrt wird automatisch aufgezeichnet mit:
- Start- und Endort (Adresse + GPS-Koordinaten)
- Distanz, Dauer, Durchschnittsgeschwindigkeit
- Energieverbrauch (kWh und kWh/100 km)
- Akkustand bei Start/Ende
- Fahrtentyp-Klassifizierung (privat / Pendeln / geschäftlich)

### Fahrtenbuch (BMF-konform)
Das Fahrtenbuch erfüllt die Anforderungen des deutschen Finanzamts (BMF):
- Felder für Geschäftspartner und Fahrtenzweck
- Fortlaufende Fahrtnummerierung
- „Sperren"-Funktion zum Abschließen des Fahrtenbuchs
- **PDF-Export** im A4-Querformat mit allen gesetzlich geforderten Feldern
- Fahrten zusammenführen und aufteilen für mehrstöpfige Reisen
- Manuelle Fahrt-Erstellung für vergessene Einträge

### GPS-Standort bearbeiten
Falls eine Fahrt eine fehlende oder falsche Adresse hat:
- Auf Fahrt klicken → Standort bearbeiten
- Adresse manuell eingeben oder Kartennadel ziehen

---

## Laden

Alle Ladesessions werden automatisch protokolliert:
- Standort (GPS-Zuordnung zu gespeicherten Ladestandorten)
- Geladene Energie (kWh) und geschätzte Kosten
- Ladegeschwindigkeit und Dauer
- Heimladen-Kennzeichnung (🏠) via Monta-Integration

### Ladestandorte
Eigene Heimlade- und regelmäßige Ladeorte definieren:
- **Einstellungen → Ladestandorte** → Mit Adresse + GPS + Radius hinzufügen
- Sessions an diesem Standort werden automatisch markiert
- Einen kWh-Preis pro Standort für die Kostenberechnung festlegen

### Monta-Integration
Wenn du Monta für Heimladen verwendest:
- Monta API-Key in Einstellungen eintragen
- Monta-Sessions werden automatisch mit korrekten kWh- und Kostendaten synchronisiert
- Heimladen-Kennzeichnung wird automatisch gesetzt

### Kostenberechnung & PDF-Rechnung
PDF-Rechnungen für Erstattungen erstellen (z.B. für den Arbeitgeber):
- **Abrechnung → Rechnung erstellen**
- Zeitraum auswählen und einzelne Sessions ein-/ausschließen
- PDF mit Briefkopf, Tabelle, Summen und Unterschriftsfeld
- Vollständig clientseitig generiert — keine Daten verlassen deinen Server

---

## Batterie

Akkugesundheit über Zeit verfolgen:
- Degradationskurve (geschätzte vs. bewertete Reichweite)
- Ladezyklus-Zähler
- Historische Akkustanddaten
- Reichweite bei verschiedenen Temperaturen (Winter- vs. Sommervergleich)

---

## Fahrzeugsteuerung

Deinen Tesla direkt aus der App steuern:
- 🌡️ **Klimaanlage** — starten/stoppen, Temperatur einstellen, Sitzheizung, Lenkradheizung
- 🔓 **Schlösser** — Türen ver-/entriegeln
- 💡 **Lichter** — Lichter blinken, Hupen
- 🚪 **Kofferraum/Frunk** — Kofferraum und Frunk öffnen
- 🔌 **Laden** — Ladeanschluss öffnen/schließen, Ladeampere einstellen, starten/stoppen
- 🔄 **Software-Updates** — OTA-Updates auslösen und überwachen
- ⏰ **Geplantes Laden** — Niedertarif-Ladefenster festlegen
- 🎵 **Remote Boombox** — Boombox-Töne auslösen (wo unterstützt)
- 🌬️ **Klimabewachung** — Camp-/Hunde-/Keep-Modus einstellen
- 🪟 **Fenster** — Fenster öffnen/schließen

> Befehle erfordern den gepairten **Virtual Key**. Siehe [Tesla API Setup](DE-Tesla-API-Setup#schritt-3-virtual-key-einrichten-für-fahrzeugbefehle).

---

## Betriebsbuch (Service-Logbuch)

Alle Wartungsereignisse protokollieren:
- Datum, Kategorie (Wartung / Reparatur / Reifen / Inspektion / Notiz)
- Kosten, Kilometerstand
- Beschreibung und Anhänge
- Wer die Arbeit durchgeführt hat (Werkstattname)

### Wartungsintervalle & Erinnerungen
Wiederkehrende Wartungserinnerungen einrichten:
- **Einstellungen → Wartungsintervalle** → Intervall hinzufügen (z.B. „TÜV in 2 Jahren", „Bremsflüssigkeit alle 2 Jahre")
- Push-Benachrichtigungen 30 Tage vor und 1.000 km vor jedem Intervall
- Dashboard zeigt anstehende Services als Vorschaukarte

---

## Datenexport

Alle Daten exportieren:
- **Fahrten** — CSV oder JSON
- **Ladesessions** — CSV oder JSON
- **Service-Logbuch** — CSV
- **Vollständiges Backup** — JSON (alle Tabellen), importierbar für Wiederherstellung

---

## Push-Benachrichtigungen

Benachrichtigungen im Browser erhalten wenn:
- Ladevorgang abgeschlossen
- Wartungsintervall naht
- Software-Update verfügbar

Benachrichtigungen funktionieren auf Desktop (Chrome, Firefox, Edge) und mobil (Android Chrome, iOS Safari mit Startseiten-Verknüpfung).

**Einrichten:** Einstellungen → Push-Benachrichtigungen → Benachrichtigungen aktivieren

---

## PWA (Progressive Web App)

Tesla Carview funktioniert als PWA — du kannst es auf deiner Startseite installieren:

- **Android/Desktop Chrome:** Installier-Symbol in der Adressleiste antippen
- **iOS Safari:** Teilen → „Zum Home-Bildschirm"
- **Tesla-Browser:** Menü → „Zur Startseite hinzufügen"

Die installierte PWA funktioniert für gecachte Seiten auch offline und erhält Benachrichtigungen wie eine native App.

---

## Dynamischer Stromtarif (aWATTar / Tibber)

Wenn du einen dynamischen Stromtarif hast:
- aWATTar verbinden (DE/AT, kein API-Key nötig) oder Tibber (API-Key in Einstellungen)
- Dashboard zeigt aktuellen Preis und 24-Stunden-Preiskurve
- **Automatisches Ladefenster setzen** — ein Klick setzt das geplante Laden auf das günstigste 4-Stunden-Fenster in den nächsten 24 Stunden

---

## Tesla API Nutzungs-Tracker

Da die Tesla Fleet API kostenpflichtig ist, zählt die App jeden ausgehenden API-Call und berechnet die voraussichtlichen Kosten:
- Live-Anzeige im Dashboard (30s-Refresh)
- Kategorie-Aufschlüsselung: Fahrzeugdaten / Wake / Befehle / Streaming / Sonstiges
- Optionaler Hard-Stop: weitere API-Calls ab einer konfigurierten Schwelle blockieren
- Admin-Panel unter Einstellungen → Tesla API Nutzung

---

## Mehrsprachigkeit

Die App ist vollständig übersetzt in:
🇩🇪 Deutsch · 🇬🇧 Englisch · 🇫🇷 Französisch · 🇪🇸 Spanisch · 🇹🇷 Türkisch · 🇬🇷 Griechisch

Die Sprache wird bestimmt durch:
1. Deine Benutzerprofil-Einstellung (überschreibt alles)
2. Die Standardsprache des Tenants
3. Deine Browser-Sprache

---

## Wartungs-Overlay

Die App zeigt automatisch ein „Wartungs"-Overlay wenn das Backend nicht erreichbar ist (z.B. beim Neustart nach Updates). Es zeigt Tesla-Zitate auf Deutsch/Englisch, einen Countdown-Timer und fragt alle 3 Sekunden nach bis das Backend zurück ist — dann verschwindet es.

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*

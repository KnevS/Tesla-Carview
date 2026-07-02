# TeslaView — Roadmap

> Mehrwerte im 2-Wochen-Takt. Tiefe statt Breite: Die App kann schon viel
> (Laden, TCO, Batterie, Routen, CO₂, KI-Chat). Die nächsten Drops bauen auf
> diesen Daten auf und machen sie klüger, statt neue Kacheln danebenzustellen.
>
> Stand: v3.32.6 · 2026-07-02

## Leitplanken (gelten für jeden Drop)

- **Hygiene im selben PR**: CHANGELOG (DE/EN), HelpView/Handbuch und alle Sprachen
  kommen mit dem Feature — keine nachgelagerte Doku-Welle.
- **Performance zuerst**: Aggregation in SQL statt JS-Schleifen über große
  Datenmengen, optimistische Updates, Lazy-Loading.
- **KI bleibt lokal**: Ollama statt öffentlichem Cloud-Modell; Fahrzeug- und
  Standortdaten verlassen den Server nicht.
- **Privat bleibt privat**: keine echten VINs, Koordinaten oder Personendaten in
  Repo, Demo oder Logs (siehe `CLAUDE.md`).

## Sprints

Reihenfolge nach Nutzen × Aufwand — jederzeit umsortierbar.

> **Status:** S01–S06 sind **ausgeliefert** (als Value-Drops v3.24–v3.32, Stand v3.32.6).
> Die nächste Welle **S07–S09** baut auf der seit v3.32.5 **live funktionierenden
> Fleet-Telemetrie** auf — Echtzeit zuerst, dann gesteuertes Laden, dann Dienstwagen/Werterhalt.

### S01 · Ladekosten, die sich selbst erklären — 23. Jun – 04. Jul
*Nutzer · Aufwand M · Nutzen Hoch · baut auf `charging` · `tariff`*

Du siehst heute, dass geladen wurde — aber nicht, was es wirklich gekostet hat.

- **Lade-Session-Detail** — Ladekurve (kW über Ladestand) und Ladeverluste:
  gezogen gegen tatsächlich geladen.
- **Kosten nach Ort & Quelle** — zuhause gegen öffentlich, €/kWh und €/100 km je Standort.
- **Günstigste Ladefenster** — Tarif-Heatmap aus dem dynamischen Strompreis, Peak gegen Off-Peak.

### S02 · Batterie-Gesundheit mit Prognose — 07. Jul – 18. Jul
*KI · Aufwand M · Nutzen Hoch · baut auf `battery` · `community`*

Aus den Messwerten wird ein Trend.

- **Gesundheits-Verlauf** — Kapazität über die Zeit mit geglätteter Degradationskurve.
- **Restkapazität-Prognose** — geschätzter Stand in X Jahren bzw. nach Y km, mit Unsicherheitsband.
- **Standby-Verlust-Warnung** — erkennt erhöhten Ruhe-Verbrauch (Phantom-Drain) und meldet ihn aktiv.

### S03 · Deine Reichweite, nicht die vom Prospekt — 21. Jul – 01. Aug
*KI · Aufwand L · Nutzen Hoch · baut auf `routing` · `wltp` · `trips`*

WLTP kennt dein Fahrprofil nicht.

- **Verbrauchsmodell** pro Fahrzeug und Fahrer aus der tatsächlichen Fahrhistorie.
- **Ankunfts-Ladestand** — die Routenplanung sagt, mit wie viel Prozent du ankommst.
- **„Schaffe ich es?"-Band** — ein Vertrauensbereich statt einer Schönwetter-Zahl.

### S04 · Der Assistent meldet sich von selbst — 04. Aug – 15. Aug
*KI + Nutzer · Aufwand M · Nutzen Mittel–Hoch · baut auf `grok` · `companion` · `ollama`*

Statt nur auf Fragen zu warten, kommentiert die KI von sich aus.

- **Wochen-Insight** — „Verbrauch 12 % über Schnitt, Ursache: Kälte" als Karte im Dashboard.
- **Klartext-Begründungen** zu erkannten Auffälligkeiten, nicht nur ein roter Punkt.
- **Lokal über Ollama** — kein öffentliches Cloud-Modell.

### S05 · Wartung, bevor sie fällig wird — 18. Aug – 29. Aug
*Nutzer + Betrieb · Aufwand M · Nutzen Mittel · baut auf `serviceIntervals` · `tco`*

Feste Intervalle passen nie zu deinem Fahrprofil.

- **Vorausschauende Fenster** — Reifen und Bremsen nach Fahrweise statt nach Kalender.
- **Termin-Countdown** — HU/TÜV, Reifenwechsel-Saison, Inspektion an einem Ort.
- **Kostenausblick 12 Monate** — was an Wartung kommt, eingebettet in die TCO-Rechnung.

### S06 · Der Betrieb wird sichtbar und selbstheilend — 01. Sep – 12. Sep
*Betrieb · Aufwand M · Nutzen Hoch · baut auf `teslaUsage` · `audit` · `autoBackup`*

Vieles läuft schon automatisch — dieser Drop macht es sichtbar, prüfbar und robuster.

- **Betriebs-Dashboard** — Tesla-API-Budget, Poller-Latenz und Circuit-Breaker auf einen Blick.
- **Wöchentlicher Sicherheits-Selbsttest** — Auth-Abdeckung, Zugriffs-Stichproben, Abhängigkeits-Audit als Report.
- **Backup-Probe & Wiederherstellungs-Test** — Integritätsprüfung plus verschlüsselte Off-Site-Option.

---

## Nächste Welle (nach v3.32)

### S07 · Live-Telemetrie, endlich sichtbar — ab v3.33
*Nutzer · Aufwand M · Nutzen Hoch · baut auf `fleetTelemetry` · `charging` · `battery`*

Seit v3.32.5 kommt der Fleet-Telemetrie-Stream live an — dieser Drop macht ihn erlebbar, statt ihn nur zu loggen.

- **Live-Ladekurve** — Leistung, Ladestand und Zelltemperatur in Echtzeit während des Ladens, mit Soll-Kurve und sofort sichtbarer Drosselung.
- **Fahrstil- & Effizienz-Score** — aus Beschleunigung, Rekuperationsanteil und Tempo/Verbrauch ein Eco-Score mit Klartext-Spartipps. Rein statistisch, lokal.
- **Reifendruck-Trend & Slow-Leak-Warnung** — TPMS über die Zeit: langsamer Druckverlust je Reifen wird früh erkannt und gemeldet (baut TireMap vom Momentwert zum Trend aus).

### S08 · Laden, das sich selbst timt — ab v3.34
*Nutzer + Betrieb · Aufwand L · Nutzen Hoch · baut auf `tariff` · `charging` · `chargeLocations`*

Die günstigsten Fenster zeigt die App schon — dieser Drop handelt danach.

- **Gesteuertes Laden** — automatisch in die günstigste Stunde laden (Tesla-Charge-Schedule bzw. Wallbox/Monta), mit Ziel-Ladestand und Abfahrtszeit.
- **PV-Überschussladen** — nur mit Solarüberschuss laden, über lokale Anbindung (EVCC/Home Assistant/Modbus). Datenlokal, kein Cloud-Zwang.
- **Kosten-Splitting dienstlich/privat** — getrennt erfasste kWh und Arbeitgeber-Erstattung als PDF, eingebettet in die bestehende Abrechnung.

### S09 · Dienstwagen & Werterhalt, belegbar — ab v3.35
*Nutzer · Aufwand M · Nutzen Hoch · baut auf `trips` · `tco` · `battery`*

Zwei harte Argumente — für die Steuer und für den Wiederverkauf.

- **Dienstwagen-Versteuerungs-Assistent** — 1%-Regel gegen Fahrtenbuchmethode gegenüberstellen, geldwerten Vorteil inkl. 0,25/0,5%-BEV-Privileg rechnen.
- **State-of-Health-Zertifikat (PDF)** — belastbarer Batterie-Gesundheitsreport aus den Snapshots, für Leasingrückgabe, Wiederverkauf oder Garantie.
- **Manipulationssicheres Fahrtenbuch** — lückenlose, gehashte Änderungskette als Argument fürs Finanzamt.

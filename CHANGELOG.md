# Changelog

Alle relevanten Änderungen werden in dieser Datei dokumentiert.
Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

> 🇬🇧 [Read in English](CHANGELOG.en.md)

---

## [v3.0.0] — 2026-05-15

### Major Milestone — Car Usability Management

Tesla Carview wächst mit v3.0 zum vollständigen **Car Usability Management**-System:
weit mehr als ein Datenlogger — eine ganzheitliche Plattform für Fahrzeugnutzung,
Betriebsführung, Kostenmanagement und Reiseplanung.

### Neu in v3.0
- **Plattform-Rebranding** — Tesla Carview wird zum Car Usability Management System; neue Beschreibung in allen Dokumenten und Sprachen
- **Demo-Sandbox** — öffentliche Testumgebung mit echtem UI und synthetischen Fahrzeugdaten; 2-Tage-Testaccount; erreichbar über `demo.teslaview.krische.com`
- **Benutzerverwaltung** — Self-Delete-Guard (eigener Account nicht löschbar), Löschen-Button klar als destruktive Aktion gekennzeichnet
- **Deploy-Pipeline** — Private-Overlay-Dateien werden vor `git pull` zurückgesetzt und danach automatisch wieder eingespielt; kein manueller Eingriff nötig

### Vollständig: alle Features aus v2.0–v2.4
Multi-Tenancy, Routenplaner mit SoC-aware Ladeplanung, Routenvermeidung (Valhalla), Passkey/WebAuthn + QR-SSO für Tesla-Browser, Einstellungs-Wizard, dynamisches Dashboard, Legal-Layer (Imprint/Datenschutz/AGB mit Akzept-Tracking), 6 Sprachen (DE/EN/FR/ES/TR/EL), Monitoring & Selbstheilung, OCM-Ladestation-Overlay, HERE Maps Verkehr, Sleep Monitor, Energy Report, Automationen, Betriebsbuch, Fahrtenbuch (BMF-konform), Kostenabrechnung, Web-Push, Verschlüsselung at rest.

---

## [v2.4.0] — 2026-05-15

### Neu
- **Routenvermeidung** — Routenplaner kann Autobahnen, Mautstraßen und Fähren meiden; Routing über Valhalla public API (OSRM unterstützt das nicht); Einstellung wird persistent im Browser gespeichert; bei Valhalla-Ausfall automatischer Fallback auf OSRM mit Hinweis
- **OpenChargeMap API-Key-Verwaltung** — OCM-Schlüssel direkt in Admin → System eintragen, einsehen (maskiert) und löschen; kein SSH-Zugang nötig; Toast-Hinweis bei fehlendem Key enthält Direkt-Link zu den Einstellungen; Registrierungs-Links direkt in der UI
- **Monitoring & Selbstheilung** — Cron-Job `heal.sh` prüft alle 15 min Container-Status und `/api/health`; bei Ausfall automatischer Neustart; optionaler E-Mail-Alert; Konfiguration (Alert-E-Mail, Selbstheilung an/aus) über Admin → System; Heal- und Security-Logs direkt in der Admin-UI einsehbar

### Verbessert
- **System-Health** — 8 Checks statt 5; OCM- und HERE-Maps-Status mit Live-HTTP-Probe; optionale Services erscheinen als `info`-Eintrag (gedimmt, kein Fehler wenn nicht konfiguriert), mit Direkt-Link „Einrichten →" zum API-Schlüssel-Abschnitt
- **update.sh** — stabiler Deploy-Ablauf: explizit Stop → Prune → Up statt `up --build` allein (verhindert Container-Name-Konflikte bei schnellen Redeploys)

---

## [v2.3.0] — 2026-05-14

### Neu
- **SoC-aware Ladeplanung** — Routenplaner plant intelligente Ladestopps mit Zeitschätzung; Abfahrts-SoC auto-befüllt aus Live-Fahrzeugdaten (Ad-hoc) oder manuell eingebar (geplante Abfahrt); konfigurierbarer Ziel-SoC am Zielort und Ladeziel je Ladestopp
- **Routenplaner-Layout** — linke Spalte scrollbar + sticky, Map bleibt immer sichtbar; Sektionsreihenfolge optimiert (Timing / Laden vor Wegpunkten)
- **Einstellungen kollabierbar** — alle 17 Sektionen der Einstellungsseite per Klick ein-/ausklappbar via SortableSection
- **Demo-Dienstfahrzeug** — Demo-Mandanten erhalten automatisch ein zweites Fahrzeug (category=company, Model 3) mit 15 Tagen Geschäftsreisen für die Abrechungs-Demo
- **Fahrzeugtechnik Demo-Daten** — DEMO-Fahrzeuge liefern plausible Fake-Telemetrie ohne Tesla-API-Aufruf
- **Standort-Heatmaps** — Leaflet-Kacheln laufen jetzt über den Backend-Tile-Proxy (kein CSP-Block mehr)
- **Abschnitte standardmäßig ausgeklappt** — neues localStorage-Profil: alle Sections auf allen Seiten initial expanded

### Verbessert
- **i18n** — neue SoC-Schlüssel (departureSocLabel, minArrivalSocLabel, chargeToLabel, chargeToTip) in allen 6 Sprachen (de/en/fr/es/tr/el)
- **SortableSection** — neues sortable-Prop versteckt Drag-Handle, wenn Sektion nicht umsortierbar ist

---

## [v2.2.0] — 2026-05-14

### Neu
- **QR-SSO-Login für Tesla-Browser** — Tesla-Display-Browser zeigt QR-Code; Nutzer scannt mit Smartphone, authentifiziert per Passkey/Face ID → Session wird automatisch auf den Tesla-Browser übertragen. Kein WebAuthn nötig im Tesla-Browser.
- **Routenplaner** — Kartenansicht korrigiert (Leaflet CSS jetzt statisch importiert), OSRM-Routing (echte Straßenrouten, kostenlos), Ladestation-Overlay via OpenChargeMap, Ankunfts-SoC-Schätzung aus eigenen Fahrtdaten, ABRP nur noch als optionaler Link
- **Einstellungs-Wizard** — 8-stufiger Wizard (Sprache, Design, Farbe, Einheiten, Dashboard-Karten, Navigation, Benachrichtigungen, Zusammenfassung), re-launchbar aus Einstellungen, Draft-Modus bis zur finalen Bestätigung
- **Dynamisches Dashboard** — Karten-Sichtbarkeit und -Reihenfolge aus Benutzerpräferenzen; serverseitig gespeichert (cross-device sync)
- **Präferenzen-API** — `GET/PATCH /api/users/me/preferences` (Partial-Merge), `users.preferences` JSON-Spalte pro Tenant, 800ms Debounce-Sync im Store

### Verbessert
- **Passkey-Login** — `/api/passkey/login-options` akzeptiert jetzt sowohl `tenantSlug` als auch `tenantId`
- **Neue Icons** — `qr-code`, `warning`, `fingerprint` in AppIcon-Bibliothek

---

## [v2.1.0] — 2026-05-14

### Neu
- **GitHub Wiki** — umfangreiches, laienverständliches Wiki mit 16 Seiten (Installation, Netzwerkzugang, Raspberry-Pi-Speicher, Sicherheit, Backup, Troubleshooting u.v.m.) Automatische Synchronisation aus dem Repo bei jedem Push
- **Tesla Model Y Favicon** — Seitenprofilsilhouette als App-Icon in allen Browsern, als PWA-Icon und iOS-Home-Screen-Icon (ersetzt Blitz-Platzhalter)
- **Netzwerk-Anleitung für Laien** (`docs/14-network-access`) — DynDNS, Cloudflare Tunnel, FritzBox-Setup, CG-NAT-Erkennung, VPS-Optionen mit Entscheidungsbaum
- **Raspberry-Pi-Speicher-Anleitung** (`docs/15-raspberry-pi-storage`) — USB-SSD, NVMe M.2 HAT+, PXE-Boot, Samsung-T7-Quirk-Fix, Migrationsleitfaden von SD-Karte
- **InfoTip-Komponente** — globale `<InfoTip text="…" />`-Komponente für Inline-Erläuterungen (ⓘ-Icon mit Hover-Tooltip)
- **Benutzerhandbuch Wiki-Hinweis** — alle 6 Sprachversionen des In-App-Handbuchs verweisen auf das GitHub Wiki
- **Eingeloggt-bleiben-Option** — „Remember me"-Checkbox im Login setzt 90-Tage-Session (statt 7 Tage Standard)

### Verbessert
- **Usability** — umfassende Tooltip-Abdeckung in Fahrtdetail, GrokChat, Fahrtenbuch, Logbuch, Benutzerverwaltung und weiteren Ansichten
- **Login-Seite** — für Tesla-Touchscreen optimiert (größere Eingabefelder, kein QR-Code-Umweg)
- **Favicon** — Ersetzte Lightning-Bolt-Platzhalter durch Tesla Model Y Silhouette

### Entfernt
- **QR-Pair-Login** — Komplettes Entfernen des QR-Code-basierten Geräte-Logins (technisch nicht sinnvoll; Tesla-Browser hat Touchscreen-Tastatur)

---

## [v2.0.0] — 2026-05-12

### Neu
- **Multi-Mandanten-Architektur** — vollständige Datenisolierung, eigene SQLite-DB pro Mandant
- **Einladungslinks** — neuer Mandant nur per Einladungslink (7 Tage, einmalig, mit optionaler Notiz)
- **Mandanten-Pseudonym** — datenschutzkonformer Login-Identifier statt Klarname, Admin-regenerierbar
- **Passwortloses sudo via SSH-Agent** — `pam_ssh_agent_auth` für deploy-sicheres Rechtekonzept
- **AES-256-GCM Encryption at rest** — Tesla-OAuth-Token, TOTP-Secrets, Virtual-Key per AES-GCM verschlüsselt
- **Audit-Log** — Admin-Viewer für sicherheitsrelevante Ereignisse (CSV-Export, DSGVO-konform)
- **Fleet Telemetry Primär** — WebSocket-Streaming als bevorzugte Datenquelle, spart >95 % API-Budget
- **Vollbackup + Restore** — JSON-Export aller 25 Tabellen, sicherheits-aware Restore mit Vor-Backup
- **GitHub Actions CI/CD** — gitleaks, OWASP-Dependency-Check, Auto-Deploy via SSH

### Verbessert
- Poller schaltet bei aktivem Fleet-Telemetry auf 1×/h-Heartbeat
- Automatische Nacht-Wartung (WAL-Checkpoint, VACUUM, Auto-Update)
- Service-Worker + PWA-Auto-Update — kein manueller Browser-Reload mehr

---

## [v1.x] — Frühere Versionen

Die initiale Einzelmandanten-Version enthielt:
- Dashboard, Fahrten, Laden, Batterie, Technik-Telemetrie
- Fahrtenbuch (BMF-konform) inkl. PDF-Export
- Steuerung (Klima, Türen, Laden, Sentry, Navigation)
- Wartungsintervalle + Betriebsbuch
- Push-Benachrichtigungen (Web Push)
- Mehrsprachigkeit (DE/EN/FR/ES/TR/EL)
- aWattar + Tibber-Integration (Dynamischer Tarif)
- Installierbare PWA (iOS, Android, Tesla-Browser)

---

*Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/). Breaking changes → Major, neue Features → Minor, Bugfixes → Patch.*

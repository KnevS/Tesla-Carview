# CLAUDE.md — Repo-Anweisungen für KI-Assistenten

Diese Datei wird von Claude Code (und vergleichbaren KI-Agenten) bei
jeder Session in das Kontext-Fenster geladen. Sie ergänzt die normalen
Coding-Konventionen um **harte Regeln zum Schutz privater Daten**, weil
dieses Repo öffentlich ist.

## Tesla Carview ist ein Public-Repo

`github.com/KnevS/Tesla-Carview` — PolyForm Noncommercial 1.0.0.
Alles in `main` ist weltweit lesbar und wird vermutlich gespiegelt /
gecrawlt / im Web-Archive landen. **Was einmal drin ist, ist drin.**

## Was NIE committet werden darf

### Geheime Zugangsdaten
- Tesla OAuth Access-Tokens, Refresh-Tokens, Client-Secrets
- JWT_SECRET, SESSION_SECRET, Cookie-Keys (Backend `.env`)
- Google-Maps API-Keys, Tibber/aWattar Tokens
- VAPID-Private-Key (WebPush)
- TLS / SSH / GPG Private-Keys (`*.key`, `*.pem`, `*.p12`)

### Identifizierende Personendaten
- Echte VINs (17-stellig, beginnt mit `5YJ` / `7SA`)
  → Doku/Tests immer mit Demo-VIN `5YJ3E1EA1NF000000` arbeiten
- Operator-Mailadresse außerhalb von
  README / NOTICE / AUTHORS (dort als Attribution gewollt)
- Konkrete Lat/Lon-Koordinaten mit > 4 Nachkommastellen aus
  Live-Fahrten (Demo-Seeder rundet bewusst auf 4)
- Reale Klar-IP-Adressen aus Logs / Tests
- Reale Benutzernamen, Telefonnummern, Adressen von Testern

### Datenbank-Inhalte
- `*.db`, `*.sqlite` — Tenant-DBs enthalten Live-Daten
- `data/`-Verzeichnis komplett (enthält auch `.encryption-key`, s. u.)
- DB-Dumps, SQL-Snapshots mit echten Rows
- Backup-JSONs aus dem Restore-Endpoint

### Encryption-Key
- `data/.encryption-key` (32 Bytes, 0600) — entschlüsselt Tesla-Tokens,
  MFA-Secrets und Virtual-Key Private-Keys at-rest. **Nie ins Repo,
  nie in Logs, nie in Issues.** Backup zusammen mit `data/`.
- `data/.ledger-key` (32 Bytes, 0600) — HMAC-Signaturschlüssel des
  manipulationssicheren Fahrtenbuchs (`trip_ledger`, S09). **Nie ins Repo,
  nie in Logs.** Backup zusammen mit `data/`; ohne ihn ist die Änderungs-
  Chain nicht mehr verifizierbar.

### Build- und Runtime-Artefakte
- `.env`, `.env.local`, `.env.production` (nur `.env.example` ist OK)
- `node_modules/`, `dist/`, `.vite/`, `coverage/`
- Crash-Dumps, `*.log`

## Wenn ich (Claude) unsicher bin

**Lieber fragen als raten.** Bei Beispiel-Daten in Tests, Docs oder
Migrations: vor dem Commit kurz nachfragen, ob die konkrete Zahl /
ID / Adresse ein Platzhalter oder echte Daten ist.

Standard-Platzhalter, die immer OK sind:
- VIN: `5YJ3E1EA1NF000000`
- E-Mail: `user@example.com`, `tester@example.org`
- Tenant-Slug: `demo`, `acme`, `default`
- Tesla-ID: `123456789`
- Lat/Lon: `52.5200, 13.4050` (Berlin Mitte, vier Nachkommastellen)

## Sicherheitsnetze, die ohnehin greifen

1. **`.gitignore`** blockiert `.env`, `data/`, `*.db`, `*.key`, `*.pem`,
   `*.log` schon auf der Indexer-Ebene.
2. **Pre-Commit Hook** (`scripts/git-hooks/pre-commit`) ruft `gitleaks`
   gegen `.gitleaks.toml` auf — fängt VINs, Tokens, Operator-E-Mail
   noch lokal ab.
3. **GitHub Push Protection** blockiert Pushes mit bekannten
   Token-Patterns serverseitig.
4. **CI-Workflow** (`.github/workflows/gitleaks.yml`) scannt nochmal
   im Build — letzte Reissleine.

**Trotzdem gilt:** Diese Netze fangen Bekanntes ab. Wenn ich ein
neues Geheimnis-Pattern erfinde, fängt es niemand außer aufmerksamem
Lesen. Deshalb diese Datei.

## Commit-Konventionen

- Sprache: Commit-Messages auf **Englisch** (Repo geht an
  internationale Audience)
- Code-Kommentare bleiben **deutsch** (siehe Memory)
- Commit-Author: `Sven Krische <15202551+KnevS@users.noreply.github.com>`
- Co-Author-Line am Ende: `Co-Authored-By: Sven Krische <…>`
- Format: `<type>(<scope>): <subject>`, type ∈ `fix|feat|chore|docs|refactor`

## Workflow: PR-Pflicht (seit 2026-07-09)

Änderungen laufen über Feature-Branches und Pull Requests — **kein
Direkt-Push auf `main` mehr** (einzige Ausnahme: das GitHub-Wiki, das
technisch keine PRs unterstützt). Gilt auch für `teslaview-web`.

1. Branch `feat/…` / `fix/…` / `docs/…` / `chore/…` von aktuellem `origin/main`
2. Commits nach den Konventionen oben; Version-Bump + CHANGELOG DE/EN
   gehören in denselben PR
3. PR öffnen (`gh pr create`) — CI, Security und Secret-Scan müssen grün sein
4. Squash-Merge (`gh pr merge --squash --delete-branch`) — Historie bleibt
   linear, PR-Nummer landet im Commit-Titel
5. Deploy läuft wie gehabt automatisch nach dem Merge auf `main`

**Vor jedem Commit/PR** (unverändert):

1. `git diff --cached` reviewen, nicht nur die Summary
2. Auf Dateinamen achten, die nach Test-Fixtures aussehen
3. Bei Markdown-Änderungen: hat sich ein realer Datensatz
   eingeschlichen?
4. Backend-Logs in Code-Blocks → IPs / VINs / Tokens redacten


---

## Aktueller Entwicklungsstand

> ⚠️ **Dieser Abschnitt darf nie veralten.** Jede Session, die am Repo arbeitet,
> aktualisiert die „Aktuell"-Zeilen unten (Version + zuletzt geliefert), bevor sie
> fertig meldet. Im Zweifel gelten die verbindlichen Live-Quellen, NICHT dieser Text:
> - **Version:** `backend/package.json` + `frontend/package.json` (Single Source of Truth, auch live unter `/api/system/version`)
> - **Was zuletzt geschah:** oberster Eintrag in [`CHANGELOG.md`](CHANGELOG.md) / [`CHANGELOG.en.md`](CHANGELOG.en.md)
> - **Letzte Commits:** `git log --oneline -15 origin/main`

### Aktuell (Stand 2026-07-18)

- **Version:** v3.47.0
- **Zuletzt geliefert:**
  - **v3.47.0 (Feature Manipulationssicheres Fahrtenbuch, S09 — Sven wählte „Hash-Chain je Änderung + HMAC-signiert"):** `services/tripLedger.js` — append-only `trip_ledger`, jede Fahrt-Änderung schreibt einen HMAC-signierten Eintrag (`prev_hash` verkettet auf Vorgänger-HMAC), Signaturschlüssel `data/.ledger-key`. Zentral über `logChanges` (tripAudit.js) eingehängt + explizit bei create/delete. `GET /api/trips/ledger/verify` (rechnet Kette nach) + `GET /api/trips/:id/ledger`. Migration legt Tabelle an + Genesis-Backfill (Marker `ledger.genesis_done`). `Fahrtenbuch.vue`: Integritäts-Badge + Aussage im Finanzamt-PDF (DE-only View). **Live verifiziert:** Snapshot-Manipulation → `content_hash`-Bruch, Eintrag gelöscht → `prev_hash`-Bruch. **Damit S09 komplett** (Versteuerung + SoH + Ledger).
  - **v3.46.0 (Feature SoH-Zertifikat, S09):** Batterie-Ansicht („Prognose") erzeugt ein **Batterie-Gesundheitszertifikat als PDF** (`exportSohCertificate` in `Battery.vue`, jsPDF+autoTable). Nutzt das bestehende `/api/battery/forecast` (kein neues Backend): aktuelle Reichweite @100 % (`current_soh_km`), Degradationsrate %/a, R², Datenbasis, 3-Jahres-Prognose, Zeit bis 80 %. Optionale WLTP-Neu-Reichweite (localStorage) → SoH in %. Klarer Gewährleistungs-Ausschluss. i18n ×7 (`battery.sohCert`, 25 Keys). Merke: keine Werks-Reichweite je Modell gespeichert → SoH-% nur mit User-Eingabe.

  - **v3.45.0 (Feature Dienstwagen-Versteuerungs-Assistent, S09):** neue View `CompanyCarTax.vue` (`/dienstwagen-steuer`, Nav „Auswertungen", nur `category=company`) + reine Rechenlogik in `frontend/src/lib/companyCarTax.js` (unit-getestet). Vergleicht 1-%-Regel vs. Fahrtenbuchmethode. **E-Satz ist datumsabhängig** (Sven-Vorgabe): `determineFactor` wählt 0,25/0,5/1 % nach Fahrzeugtyp + BLP + Anschaffungsdatum; BEV-Viertelungs-Grenze 60.000 € (bis 2023) / 70.000 € (ab 2024) / 100.000 € (ab 01.07.2025), Sonderregel bis Ende 2030; PHEV 0,5 % nur bei ≤50 g/km oder E-Reichweite ≥40/60/80 km je Jahr. Reduktion wirkt auch auf 0,03-%-Pendlerzuschlag + (Fahrtenbuch) AfA. Kosten aus `/tco/vehicles/:id`, Privatanteil aus `/trips/stats`. Rein clientseitig, DE-only, Orientierungsrechnung. Regeln 2026-07 gegen ADAC/Haufe verifiziert. **Offen S09:** SoH-Zertifikat-PDF, manipulationssicheres Fahrtenbuch.
  - **v3.44.0 (Feature PV-Überschussladen, S08):** neue View `PvSolar.vue` (`/pv-solar`, Nav „Planung") + `homeAssistantService.js` (`readEntityState` liest HA-Sensor via REST, `surplusToAmps`) + Route `pv.js` (`GET/PUT /api/pv/config` [Admin, Token redacted], `GET /api/pv/status`, `POST /api/pv/:vehicleId/apply`). Empfehlung = `Überschuss ÷ (Spannung × Phasen)`, gedeckelt auf Max-Strom, unter 5 A = nicht ladbar. „Anwenden" sendet `set_charging_amps` + `charge_start`/`charge_stop` via `apiProxyPost` (Fleet + Virtual Key). Config in `tenant_settings` (configService). Rein lokal, kein Cloud-Zwang. Live gegen Mock-HA verifiziert (3200 W → 13 A, Schwellen-Logik korrekt). i18n ×7, Handbuch 6 Sprachen, README ×7. **Offen (v2):** kontinuierlicher Regelkreis (Scheduler statt manuellem „Anwenden") — braucht Svens Live-HA + Auto zum Tunen. **Damit S08 komplett** (Ladeplaner + Kostensplit + PV).
  - **v3.43.0 (Feature Dienstlich/Privat-Kostensplit, S08):** neue Sektion „Dienstlich / Privat — Erstattung" in `Kostenabrechnung.vue` (nur `category=company`) + Backend `GET /api/billing/:vehicleId/reimbursement` in `billing.js` (Heimladekosten + km nach `trip_type` je Jahr/Monat, UTC-Fenster wie die Summary). Zwei Methoden: **Pauschale** (§ 3 Nr. 50 EStG, 30/70 € × Monate, client-berechnet) und **Fahranteil** (dienstlich = business+commute ÷ gesamt × Heimladekosten). Erstattungs-PDF je Methode via jsPDF+autoTable. **Bewusst deutschsprachig** (kein i18n — wie die gesamte Kostenabrechnung, deutsches Steuerthema); CHANGELOG DE/EN, Handbuch DE/EN, README ×7. Live gegen injizierte Testdaten verifiziert (400/600 km = 67 %, 21 € Heim → 14 € Erstattung). Merke: Dienstwagen-Gate ist `category==='company'` (nicht 'business').
  - **v3.42.0 (Feature Ladeplaner, S08):** neue View `ChargePlanner.vue` (`/ladeplan`, Nav-Gruppe „Planung") + Backend `planCharge()` in `tariffService.js` und `GET /api/tariff/charge-plan`. Greedy wählt die günstigsten — auch nicht zusammenhängenden — Stundenslots bis zur Abfahrt aus der aWattar/Tibber-Preiskurve (Rand-Slots anteilig); vier Kennzahlen (Nachladen inkl. erreichtem SoC / Ladedauer / optimale Kosten / Ersparnis gegen „sofort") + Balken mit grün markierten Slots; Ladeverluste via `efficiency` (AC ~0,9). **Reine Preiskurven-Rechnung, KEIN Tesla-/Fleet-Call.** i18n ×7 (`chargePlanner`, `nav.chargePlanner`), Handbuch DE/EN/ES/FR/TR/EL, README ×7. Merke: NavBar nutzt hardcoded `label` (`it.label ?? t(...)`); der i18n-Key `nav.<key>` greift nur in SettingsWizard/MobileTabBar. **Offen für S08:** PV-Überschussladen (EVCC/HA/Modbus) und dienstlich/privat-Kostensplit-PDF sind noch nicht gebaut.
  - **v3.41.5:** CI-Ausbau nach fleet/Skillmatrix-Muster: (1) Auto-Rebase-Fix — `dependabot-auto-merge.yml` zieht bei jedem main-Push alle offenen Dependabot-PRs per `gh pr update-branch` nach (vorher blieben Bot-PRs „behind" hängen). (2) Neuer Workflow `security-autofix.yml`: täglich `npm audit fix` (semver-kompatibel) über backend+frontend → idempotenter PR auf `chore/security-autofix`, plus trivy-CVE-Sammel-Issue (schließt sich bei 0 Findings). Required-Checks werden nach dem Bot-Push per `workflow_dispatch` angestoßen (GITHUB_TOKEN-Rekursionsschutz), dafür hat ci.yml jetzt einen dispatch-Trigger.
  - **v3.41.4:** Zoom-Drossel Teil 2 — der Live-429 kam NICHT nur von express, sondern (auf iland) vom **Host-nginx** (`deploy/nginx-host.conf.template`: zone=api 120r/m burst=20 auf `location /api/` inkl. Tiles). Template hat jetzt eigene zone=tiles (1200r/m, burst=300) + `location /api/tiles/`. **Host-nginx auf iland muss manuell nachgezogen werden** (Template anwenden + reload) — Container-Deploy ändert die Host-Config nicht. Merke: 429-Quelle unterscheiden via `ratelimit-*`-Header (express) vs. nackte nginx-Antwort.
  - **v3.41.3:** Karten-Zoom fraß das API-Rate-Limit leer (Sven-Report: „nach Map-Zoom muss ich die Seite neu laden um Menüpunkte auszuwählen"). `/api/tiles` zählte gegen `apiRateLimit` (120/min/IP); ein Zoom = 50–150 Kacheln → Rest der Minute 429 auf ALLE API-Calls. Fix: eigener `tileRateLimit` (1200/min/IP) + `skip` für `/api/tiles` im allgemeinen Limiter (`security.js`, `index.js`). Diagnose-Weg: lokal Demo-Tenant + Playwright; 150 parallele Tile-Requests → `/api/health` 429 reproduziert.
  - **v3.41.2:** Einmalige mph-Korrektur-Migration für Telemetrie-Punkte vor v3.35.3 (Marker `migration.telemetry_speed_mph_fix` in tenant_settings, Cutoff 2026-07-03T19:25:45Z).
  - **v3.41.1:** Nav thematisch statt alphabetisch (Sven-Wahl per Preview): `GROUP_ORDER` in nav.js, `NAV_DEFAULTS_VERSION=3` (einmaliger Order-Reset). Erster Release über den neuen PR-Workflow.
  - **v3.41.0:** Heatmap-Ebenen-Farben anpassbar (Color-Picker je Layer, localStorage, Reset-Button). Tile-Leere Runde 2: Cache-Default nach `data/tiles` (persistent), Upstream-Retry über Mirror-Rotation, Frontend-Tile-Retry via gemeinsamem `lib/tiles.js#osmTileLayer` (alle 5 Karten). NavBar-Dropdowns hinter Karte gefixt: `isolate` auf allen Karten-Containern.
  - **v3.40.0 (Sammel-Release):** (1) Heatmap-Layer „Fahrwege" — `GET /api/trips/route-lines` (max. 300 Trips, 60 Punkte/Trip downsampled), lazy im Frontend. (2) App-Hub-CRUD für Admins — Tabelle `launcher_custom_apps`, POST/PUT/DELETE `/api/launcher/admin/apps`, Custom-Apps mit Klartext-`label` (kein i18n-Key; Frontend-Fallback `label_i18n ? $t(...) : label`). (3) Fahrtwerte-Limit „Alle" (`limit=0` → SQLite `LIMIT -1`). (4) Nav alphabetisch je Gruppe (programmatischer Sort in nav.js, `NAV_DEFAULTS_VERSION=2` resettet gespeicherte Order einmalig, hidden bleibt). (5) Tile-Proxy: In-flight-Dedupe + max. 8 parallele OSM-Fetches + Stale-Fallback; `TILE_CACHE_DIR`-Env für persistentes Volume.
  - **Feature Zonen-Analyse im Fahrtdetail (v3.39.0):** Karte „Zonen-Analyse" in `TripDetail.vue` — 3 Modi (Tempo-Zonen / Meine Zonen [Geofences+Ladeorte] / Abschnitt via Von-Bis-Regler), tabellarische Werte + Karten-Hervorhebung (Segment-Refs aus initMap, `applyMapOverlay()`); Checkbox „📍 Hinweise" (Vmax/Max-Leistung/Max-Reku/Stopps ≥ 1 min). Alles clientseitig aus `trip.points` (dt-Cap 120 s, Energie netto). i18n ×7 (`tripDetail.zones`), Handbuch DE/EN (Rest im nächsten Doku-Sync).
  - **Fix Telemetrie-Erfassungskette (v3.38.4):** (1) `/api/trips/metrics` aggregierte nur `trip_points` → Fahrtwerte-Tabelle leer für Telemetrie-Fahrten; jetzt UNION ALL über `trip_points`+`telemetry_points`. (2) fleetTelemetry rief nie `geocodeTrip` → Koordinaten statt Adressen; jetzt Fire-and-forget-Hook bei Trip-Start/-Close (wie OwnTracks). (3) Gear-Datum ohne GPS → `start_/end_lat` NULL; Trip-Close zieht Start/Ziel aus Trackpunkten nach + idempotenter Daten-Repair in `runTenantMigrations`. Merke: `trip_points` = Poller/OwnTracks, `telemetry_points` = Fleet-Telemetry (Detail-Endpoint `/:id` switcht nach `t.source`).
  - **Fix Heatmap-Layer unsichtbar (v3.38.3):** `HeatmapMap.vue` + `LocationHeatmap.vue` zeichneten `L.circle` mit Meter-Radius (60–140 m) — bei auto-gefitteter Übersichtskarte (Zoom ≤ 11) subpixel-klein, Layer wirkten leer trotz korrekter Punktzähler. Jetzt `L.circleMarker` mit zoomunabhängigem Pixel-Radius (5–14 px, gewichtsabhängige Größe/Deckkraft).
  - **Webfonts self-hosted (v3.38.2, Privacy):** Bricolage/Manrope/JetBrains Mono als variable woff2 unter `frontend/public/fonts/` (SIL OFL, Subsets latin/-ext/cyrillic/-ext/greek/-ext), same-origin via `/fonts/fonts.css`; Google-`<link>`+preconnect aus `index.html` raus → keine Google-Requests mehr. CSP wieder strikt (`font-src 'self'`, helmet + `deploy/nginx-host.conf.template` zurückgesetzt). **Hinweis Live-iland:** die traefik-Middleware `sec-headers-app` erlaubt noch die Font-Hosts — harmlos (App fragt Google nicht mehr an), kann aber zurückgedreht werden. Font-Extraktion: `scripts`-losem curl-Skript, Details [[project_teslaview_csp_source]].
  - **Doku-Sync (v3.38.1):** Handbuch-Sektion „Fahrtwerte & Heatmap" ({#fahrtwerte-heatmap}) in allen 6 Handbüchern + Feature-Zeilen in README es/fr/tr/el/uk nachgezogen. Doku-Pflicht für v3.37/3.38 damit vollständig.
  - **Feature Geo-Heatmap (v3.38.0):** neue View `HeatmapMap.vue` (`/heatmap`) — Leaflet-Karte, 3 toggle-Layer (Fahrten rot / Ladevorgänge grün / Ladeorte blau). Rendering per gewichteten `L.circle` (kein Extra-Dep, wie das bisher ungenutzte `LocationHeatmap.vue`). Backend: neuer `GET /api/charging/location-heatmap` (charging_sessions ~100-m-Raster) + vorhandener `/api/trips/location-heatmap` + `/api/charging-locations`. Nav-Eintrag `heatmap`. i18n×7 (`heatmap`). Gitleaks-Falle: KEINE `key: '<langer_wert>'`-Muster (triggert generic-api-key) — Tabellen-Property hieß darum `field`.
  - **Feature Fahrtwerte-Tabelle (v3.37.0):** neue View `TripMetrics.vue` (`/fahrtwerte`), Backend `GET /api/trips/metrics` (EIN SQL-Query: trips LEFT JOIN GROUP-BY-Aggregat aus `trip_points` → min/max/Ø Speed+Leistung, kein N+1). Sortierbar, Summen-Kacheln, CSV (`;`+BOM), unit-aware (useUnits). Nav-Eintrag `fahrtwerte` + Button in Trips.vue. i18n×7 (`tripMetrics`).
  - **Fix `null.toFixed`-Render-Crash (v3.36.9):** ungeschützte `.toFixed()` auf leeren Feldern (`Battery.vue` Precondition-Temp, `TripsHeatmap.vue` km, `ChargingHeatmap.vue` Ø/Peak-kW) mit `?? 0` abgesichert.
  - **Fix Logout-bei-Reload — ECHTE Ursache: Router-Guard-vs-Restore-Race (v3.36.8, #14):** Serverseitig alles ok (Live-nginx-Log: `/auth/refresh` UND `/auth/me` beim Reload beide `200`), aber der Referer war schon `/login`. Grund: Router-Initial-Navigation lief parallel zur Session-Wiederherstellung; der `beforeEach`-Guard las `isAuthenticated`, während `refresh` lief aber `user` noch nicht gesetzt war → `false` → redirect `/login`; das nachziehende `200` kam zu spät. Fix: geteilte `ensureSessionRestored()` in `store/auth.js` — `main.js`-Boot UND Guard warten auf DIESELBE einmalige Restore-Promise (genau ein `/auth/refresh`, kein Rotations-Race). **Diagnose-Weg:** Container-nginx-Access-Log (`sudo docker logs tesla-carview-nginx`), nicht Host-nginx (leer). Die vorigen Anläufe v3.36.4 (`no-store`) und v3.36.6 (Service-Worker) waren Fehldiagnosen — bleiben als Härtung drin.
  - **CSP Google Fonts (v3.36.7):** Der ausgelieferte CSP-Header kommt vom **nginx** (`deploy/nginx-host.conf.template`), NICHT von helmet → helmet-Edit aus v3.36.6 war wirkungslos. Template erlaubt jetzt `fonts.googleapis.com`/`fonts.gstatic.com`. Wird nur via `setup.sh` angewendet → Live-Host braucht manuellen nginx-Reload. **Hinweis:** ausgeliefert wird über die Container (`tesla-carview-nginx`/`-proxy`), der Host-nginx-Site-Log ist leer — die maßgebliche nginx-Instanz ist noch zu verifizieren.
  - **Fix Safari-Logout-bei-Reload (v3.36.4, #14):** API-Antworten hatten kein `Cache-Control` (nur ETag) → Safari cachte `GET /auth/me` → gecachte Fehlantwort → Session-Restore scheiterte trotz erfolgreichem Refresh. Fix: `Cache-Control: no-store` für alle `/api` (außer `/api/tiles`) in `index.js`. Temp-Diagnose (`/api/auth/_diag`) wieder entfernt (auch Security-Finding erledigt). Diagnose-Weg war: HTTPS-Ringpuffer, weil SSH-Whitelist unzuverlässig.
  - **Geschwindigkeit mph/km/h wählbar (v3.36.0):** Speed folgt `unit_distance` (km→km/h, mi→mph). Neuer `fmtSpeed` in `useUnits` (prefs.js); umgestellt: TripDetail (Ø/Slider/Chart) + Telemetry Live-Speed. Interne Basis bleibt km/h.
  - **Fix Telemetrie-Speed mph→km/h (v3.35.3):** `VehicleSpeed` (mph) wurde ungerechnet als `speed_kmh` gespeichert → Schieber zeigte mph als km/h. Jetzt `× 1,60934` in `extractPoint`. Diag-Log aus v3.35.2 entfernt (Value-Typ-Fix bestätigt: SoC 742/Leistung 213 in 3h, vorher 0). Alte Telemetrie-Punkte behalten mph-Wert.
  - **Fix Telemetrie-Value-Typen (v3.35.2):** SoC/PackVoltage/PackCurrent kamen als int/string, Decoder las nur float → SoC & Leistung wurden NIE gespeichert (0/15k). `numVal` in `fleetTelemetry.js` liest alle Zahlentypen robust. **Verifiziert live.**
  - **Fix Fahrt-Detail GPS-Strecke/Slider (v3.35.1):** Telemetrie-Punkte sind sparse (Felder in eigenem Takt) — `GET /api/trips/:id` liefert jetzt kohärente Trackpunkte (LOCF für Speed/Leistung/SoC, nur Punkte mit lat/lon, gerundet). Route-Polylinie + Slider funktionieren mit Telemetrie-Fahrten. `trips.js` + `TripDetail.vue`.
  - **Live-Ladekurve (S07, v3.35.0, #174):** `GET /api/charging/current` (offene Session + Erwartungskurve aus vergleichbarer Session, nutzt vorhandene `charging_points` — kein Extra-Tesla-Call); `ChargingLive.vue` (30-s-Poll, Live-Power/SoC + Erwartungs-Overlay), eingehängt in `Charging.vue`.
  - **Fahrstil-/Effizienz-Score (S07, v3.34.0, #175):** `buildEcoScore` in `insightEngine.js` — relativer Effizienz-Index (Median letzte 30 T vs. eigener 180-T-Schnitt) + datenbelegte Tipps; Endpoint `GET /api/insights/eco-score`; Dashboard-Karte `eco_score` (Donut) in `Dashboard.vue`. Rein statistisch, lokal.
  - **Reifendruck-Trend & Slow-Leak-Warnung (S07, v3.33.0, #176):** TPMS-Zeitreihe (`tire_pressure_snapshots`, Poller-Write in `dataSync.js`) + temperaturbereinigte Trenderkennung in `companionEngine.js` (`findTireAnomalies`, stabiler Wochen-Hash gegen Alarm-Spam) → Warnung über die bestehenden Kanäle; `TireMap.vue` zeigt Warn-Ring/Badge + Trend-Tooltip; Endpoint `GET /api/telemetry/:id/tire-history`.
  - **Setup-Wizard-Fix (#170):** `db.transaction()`-Callback in `/api/setup/init` synchron gemacht (better-sqlite3 lehnt async-Callbacks ab).
  - **Fleet-Telemetry Ende-zu-Ende funktionsfähig (v3.32.4/.5):** Receiver entpackt FlatBuffers-Envelope + eingebettetes Protobuf; `fleet_telemetry_config` über den Fleet-Level-Endpoint mit echter CA-Kette. Live verifiziert.
  - **Betriebs-Selbsttest (v3.32.0):** `selfCheck.js` + `GET/POST /api/system/self-check`.
- **Doku-Stand:** Ladeplaner (v3.42.0), Kostensplit (v3.43.0), PV-Überschuss (v3.44.0): App-Doku (README ×7, Handbuch) + **Wiki (7 Sprachen, gepusht)** synchron; Marketing-Site `teslaview-web` bis v3.44.0 gepflegt (PR #5 offen). **Dienstwagen-Steuer (v3.45.0):** README ×7 + Handbuch DE/EN. **SoH-Zertifikat (v3.46.0):** README ×7 + Handbuch DE/EN + i18n ×7. **Manipulationssicheres Fahrtenbuch (v3.47.0):** README ×7 + Handbuch DE/EN (DE-only View). **Offen:** Wiki + Marketing für v3.45.0–v3.47.0. **Regel (Sven): Doku + Marketing-Site immer im selben Arbeitsgang wie das Feature — nie auf einen Sammel-Sync verschieben.**

### Architektur-Ankerpunkte (stabil — hier nachschlagen)

- **DB-vor-env-Pattern:** `backend/src/services/configService.js` → `getTenantSetting(db, key, envFallbackKey)` liest `tenant_settings` (SQLite), Fallback `.env`.
- **Fleet-Telemetry-Receiver:** `backend/src/services/fleetTelemetry.js` (FlatBuffers-Envelope → eingebettetes Protobuf).
- **Betriebs-Selbsttest:** `backend/src/services/selfCheck.js`.
- **Version dynamisch:** Backend liefert sie über `/api/system/version` aus der package.json; Frontend zeigt sie in `AppFooter.vue`/`System.vue` — niemals hart kodieren.
- **Admin-UI-Config-Routen:** `GET/PUT /api/system/{tesla-credentials,vapid-config,telegram-config,abrp-config}`, `POST /api/system/vapid-generate`, `PUT /api/grok/config`.

### Offen / Ideen

- Neue Feature-Roadmap nach v3.32 (siehe Issues). Die Value-Drop-Roadmap S01–S06 ist abgeschlossen.

### Deployment

Dokploy deployt die App automatisch nach jedem Merge auf `main`. Die Marketing-Site `teslaview-web` deployt per SSH-Pull auf den Host (GitHub Action, kein Build) beim Merge auf deren `main`. Für manuelle Eingriffe: Zugang und Repo-Pfad sind in der privaten Deployment-Dokumentation hinterlegt.

---

## Was bei Verdacht auf bereits geleaktes Geheimnis tun

1. **Sofort rotieren** — Token, Key, Password in der Quelle ändern
2. **NICHT** `git rm` + commit — das Original bleibt in der Historie
3. `gh secret-scanning ...` bzw. GitHub-UI nutzen, um den Alert
   zu öffnen
4. Falls History-Rewrite nötig: `git filter-repo` + force-push +
   alle aktiven Clones invalidieren

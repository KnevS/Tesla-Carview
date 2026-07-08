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

## Bei jedem Push auf main

Direkt-Push auf `main` ist explizit erlaubt für diesen Single-Maintainer-
Workflow — keine PRs nötig. Aber **vor jedem Push**:

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

### Aktuell (Stand 2026-07-08)

- **Version:** v3.38.4
- **Zuletzt geliefert:**
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
- **Doku-Stand:** README (7 Sprachen), In-App-Handbuch (6 Sprachen), GitHub-Wiki (7 Sprachen) und Marketing-Site `teslaview-web` auf v3.32.6 synchronisiert; Marketing-/Wiki-Bump auf v3.33.0 folgt im nächsten Sync.

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

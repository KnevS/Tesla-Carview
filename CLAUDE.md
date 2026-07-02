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

### Aktuell (Stand 2026-07-02)

- **Version:** v3.35.0
- **Zuletzt geliefert:**
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

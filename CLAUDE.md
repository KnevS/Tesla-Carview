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
- Operator-Mailadresse `sven.krische@indasys.de` außerhalb von
  README / NOTICE / AUTHORS (dort als Attribution gewollt)
- Konkrete Lat/Lon-Koordinaten mit > 4 Nachkommastellen aus
  Live-Fahrten (Demo-Seeder rundet bewusst auf 4)
- Reale Klar-IP-Adressen aus Logs / Tests
- Reale Benutzernamen, Telefonnummern, Adressen von Testern

### Datenbank-Inhalte
- `*.db`, `*.sqlite` — Tenant-DBs enthalten Live-Daten
- `data/`-Verzeichnis komplett
- DB-Dumps, SQL-Snapshots mit echten Rows
- Backup-JSONs aus dem Restore-Endpoint

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

## Was bei Verdacht auf bereits geleaktes Geheimnis tun

1. **Sofort rotieren** — Token, Key, Password in der Quelle ändern
2. **NICHT** `git rm` + commit — das Original bleibt in der Historie
3. `gh secret-scanning ...` bzw. GitHub-UI nutzen, um den Alert
   zu öffnen
4. Falls History-Rewrite nötig: `git filter-repo` + force-push +
   alle aktiven Clones invalidieren

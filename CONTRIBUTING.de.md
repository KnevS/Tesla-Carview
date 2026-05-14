# Beitragen zu Tesla Carview

> 🇬🇧 [Read in English](CONTRIBUTING.md)

Schön, dass du zu Tesla Carview beitragen möchtest! Diese Anleitung erklärt
alles, was du brauchst — von der ersten Idee bis zum gemergten Pull Request.

---

## Inhaltsverzeichnis

1. [Wie du helfen kannst](#wie-du-helfen-kannst)
2. [Einsteigerfreundliche Issues](#einsteigerfreundliche-issues)
3. [Lokale Entwicklungsumgebung](#lokale-entwicklungsumgebung)
4. [Git-Workflow](#git-workflow)
5. [Commit-Konventionen](#commit-konventionen)
6. [Code-Stil](#code-stil)
7. [Sprachpflege](#sprachpflege)
8. [Tests ausführen](#tests-ausführen)
9. [Sicherheitslücken](#sicherheitslücken)
10. [Lizenz und DCO](#lizenz-und-dco)

---

## Wie du helfen kannst

Du musst **keinen Code schreiben**, um sinnvoll beizutragen:

| Art | Beispiele |
|---|---|
| **Fehlerberichte** | Etwas sieht falsch aus, stürzt ab oder verhält sich unerwartet |
| **Dokumentation** | Tippfehler, unklare Passagen, fehlende Schritte in einer Anleitung |
| **Übersetzungen** | UI-Strings oder Handbuch-Seiten in einer der sechs unterstützten Sprachen |
| **Feature-Ideen** | Diskussion öffnen, bevor du codest — ein kurzer Austausch spart allen Zeit |
| **Code** | Bugfixes, Roadmap-Features, Test-Abdeckung, Barrierefreiheit |
| **Triage** | Gemeldete Bugs reproduzieren, Reproduktionsschritte ergänzen, Duplikate erkennen |

Für alles, was über eine Einzeiler-Korrektur hinausgeht, bitte erst ein Issue
oder eine Discussion öffnen, damit wir vor dem Coden abstimmen können.

---

## Einsteigerfreundliche Issues

Issues mit dem Label **`good first issue`** sind klar abgegrenzt und
erfordern keine tiefe Kenntnis der gesamten Codebasis. Sie eignen sich
besonders gut als Einstieg.

Übersicht aller einsteigerfreundlichen Issues:
[github.com/KnevS/Tesla-Carview/labels/good%20first%20issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue)

Typische Aufgaben für Einsteiger:

- Tippfehler oder unklare Sätze in einer Markdown-Datei korrigieren
- Übersetzungsstrings in einer der Locale-JSON-Dateien ergänzen oder korrigieren
- `aria-label`- / `title`-Attribute an Icon-only-Buttons verbessern
- Englische Kommentare neben deutschen Kommentaren in Konfigurationsdateien ergänzen

Hinterlasse bitte einen Kommentar im Issue, damit andere sehen, dass du daran arbeitest.

---

## Lokale Entwicklungsumgebung

### Voraussetzungen

| Tool | Mindestversion |
|---|---|
| Node.js | 20 LTS |
| npm | 10 |
| Docker + Docker Compose | eine aktuelle Version (für den vollständigen Stack) |

### Schritte

```bash
# 1. Repo auf GitHub forken, dann den Fork klonen
git clone https://github.com/<dein-handle>/Tesla-Carview.git
cd Tesla-Carview

# 2. Beispiel-Env-Datei kopieren und Werte eintragen
cp backend/.env.example backend/.env
$EDITOR backend/.env   # mindestens JWT_SECRET setzen

# 3. Abhängigkeiten installieren
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Gesamten Stack starten (Backend + Frontend + SQLite)
docker compose up --build          # oder die Dienste einzeln:
#   cd backend  && node src/index.js
#   cd frontend && npm run dev

# 5. App öffnen
#   http://localhost:5173
```

Für reine **Dokumentationsänderungen** reicht ein Markdown-Previewer —
kein Node.js oder Docker erforderlich.

---

## Git-Workflow

```
main (geschützt)
  └── dein-fork/fix/mein-bugfix   ← PR von hier öffnen
```

1. **Forke** das Repository auf dein eigenes GitHub-Konto.
2. Erstelle einen **Feature-Branch** mit einem kurzen, aussagekräftigen Namen:
   ```bash
   git checkout -b fix/tippfehler-in-quickstart
   git checkout -b feat/eco-score-label
   git checkout -b docs/env-example-englische-kommentare
   ```
3. Mache deine Änderungen in kleinen, logischen Commits (siehe [Commit-Konventionen](#commit-konventionen)).
4. Pushe auf deinen Fork und öffne einen **Pull Request** gegen `main`.
5. Fülle die PR-Vorlage aus — insbesondere die Checkliste für i18n und Doku.
6. Ein Maintainer reviewt und kann Änderungen anfragen; bitte beantworte sie
   mit neuen Commits (kein Force-Push), damit das Diff lesbar bleibt.

---

## Commit-Konventionen

Format: `<type>(<scope>): <subject>`

| Type | Wann verwenden |
|---|---|
| `fix` | Korrigiert einen Bug |
| `feat` | Fügt ein neues, nutzersichtbares Feature hinzu |
| `docs` | Nur Dokumentation |
| `chore` | Build, CI, Tooling, Dependency-Updates |
| `refactor` | Interne Umstrukturierung ohne Verhaltensänderung |
| `i18n` | Übersetzungs- / Locale-Dateiänderungen |
| `a11y` | Verbesserungen zur Barrierefreiheit |

Beispiele:

```
fix(poller): retry on 429 instead of crashing
feat(dashboard): add per-trip eco-score chip
docs(quickstart): add Windows WSL2 note
i18n(fr): sync handbook with German original
a11y(ui): add aria-label to sidebar icon buttons
```

- Subject auf **Englisch**, Imperativ, kein Punkt am Ende.
- Subject unter 72 Zeichen.
- Code-Kommentare in den Dateien selbst bleiben auf **Deutsch** (bestehende Konvention).
- Jeden Commit mit `-s` signieren (siehe [Lizenz und DCO](#lizenz-und-dco)).

---

## Code-Stil

- **Schreibe wie der umgebende Code** — Einrückung, Benennung, Kommentardichte.
- Frontend: Vue 3 `<script setup>` + Composition API. Keine Class-Komponenten.
- Backend: Node.js ESM (`import`/`export`). Kein CommonJS `require()`.
- Keine neuen Abhängigkeiten ohne vorherige Diskussion in einem Issue.
- Nie `node_modules/`, `dist/`, `.vite/`, `*.log` oder `.env`-Dateien committen
  (das `.gitignore` blockiert sie, aber behalte es im Blick).

---

## Sprachpflege

Tesla Carview erscheint in **sechs UI-Sprachen** und hält die Repo-Doku
zweisprachig (🇩🇪 + 🇬🇧).

Wenn deine Änderung etwas Nutzersichtbares berührt, aktualisiere bitte
**alle** folgenden Artefakte im selben PR:

| Artefakt | Speicherort |
|---|---|
| UI-Strings | `frontend/src/locales/{de,en,fr,es,tr,el}.json` |
| In-App-Handbuch | `frontend/src/handbook/handbook.{de,en,fr,es,tr,el}.md` |
| Repo-Doku (deutsches Original) | `README.md`, `docs/*.md` |
| Repo-Doku (englischer Spiegel) | `README.en.md`, `docs/*.en.md` |

Wenn du nicht alle sechs Sprachen sprichst, ist das kein Problem — aktualisiere
die Sprachen, die du kannst, und weise in der PR-Beschreibung auf die Lücken
hin. Ein anderer Contributor oder ein Maintainer füllt den Rest vor dem Merge.

---

## Tests ausführen

```bash
# Backend-Unit- & Integrationstests
cd backend && npm test

# Frontend-Typecheck + Lint
cd frontend && npm run type-check && npm run lint

# Vollständiger Build (fängt Import-Fehler ab)
cd frontend && npm run build
```

Bitte führe vor dem PR mindestens die relevanten Tests für den geänderten
Bereich aus. Eine fehlschlagende Test-Suite blockiert das Review.

---

## Sicherheitslücken

Wenn du eine Sicherheitslücke entdeckst, öffne **kein** öffentliches Issue.

Folge [SECURITY.md](SECURITY.md) und melde sie zuerst privat. Wir bestätigen
Meldungen innerhalb von 48 Stunden und veröffentlichen einen Fix innerhalb von
14 Tagen.

---

## Lizenz und DCO

Mit dem Einreichen eines Pull Requests stimmst du zu, dass dein Beitrag unter
der [PolyForm Noncommercial 1.0.0](LICENSE)-Lizenz steht, die auch für den
Rest des Projekts gilt.

Wir verwenden das **Developer Certificate of Origin (DCO)** — keine separate
CLA erforderlich. Signiere jeden Commit mit:

```bash
git commit -s
```

Das fügt folgenden Trailer hinzu:

```
Signed-off-by: Dein Name <du@example.com>
```

Der vollständige DCO-Text steht unter <https://developercertificate.org/>.
Durch das Signieren versicherst du, dass du das Recht hast, den Beitrag unter
der Projektlizenz einzureichen.

---

**Fragen?** Öffne eine [Discussion](https://github.com/KnevS/Tesla-Carview/discussions)
oder einen Draft-PR — wir geben gerne frühzeitiges Feedback, noch bevor du
eine einzige Zeile Code schreibst.

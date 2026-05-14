# Contributing to Tesla Carview

> 🇩🇪 [Auf Deutsch lesen](CONTRIBUTING.de.md)

Thank you for your interest in Tesla Carview! This guide explains everything
you need to go from curiosity to a merged pull request.

---

## Table of contents

1. [Ways to contribute](#ways-to-contribute)
2. [Good first issues](#good-first-issues)
3. [Local development setup](#local-development-setup)
4. [Git workflow](#git-workflow)
5. [Commit conventions](#commit-conventions)
6. [Code style](#code-style)
7. [Multi-language coverage](#multi-language-coverage)
8. [Running tests](#running-tests)
9. [Security vulnerabilities](#security-vulnerabilities)
10. [License and DCO](#license-and-dco)

---

## Ways to contribute

You do **not** have to write code to make a meaningful contribution:

| Type | Examples |
|---|---|
| **Bug reports** | Something looks wrong, crashes, or behaves unexpectedly |
| **Documentation** | Typos, unclear paragraphs, missing steps in a guide |
| **Translations** | UI strings or in-app handbook pages in one of the six supported locales |
| **Feature ideas** | Open a Discussion before coding — a quick sanity-check saves everyone time |
| **Code** | Bug fixes, roadmap features, test coverage, accessibility |
| **Triage** | Reproduce reported bugs, add steps-to-reproduce, confirm duplicates |

For anything bigger than a one-line fix, please open an issue or a Discussion
first so we can align before you invest time writing code.

---

## Good first issues

Issues labelled **`good first issue`** are scoped to be self-contained and
require no deep familiarity with the whole codebase.  They are a great
starting point if this is your first contribution.

Browse them here:
[github.com/KnevS/Tesla-Carview/labels/good%20first%20issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue)

Typical beginner-friendly tasks:

- Fixing a typo or unclear sentence in a markdown doc
- Adding or correcting a translation string in one of the locale JSON files
- Improving `aria-label` / `title` attributes on icon-only UI buttons
- Adding an English comment next to a German-only comment in config files

Leave a comment on the issue to let others know you are working on it.

---

## Local development setup

### Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20 LTS |
| npm | 10 |
| Docker + Docker Compose | any recent version (for the full stack) |

### Steps

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-handle>/Tesla-Carview.git
cd Tesla-Carview

# 2. Copy the example env file and fill in your values
cp backend/.env.example backend/.env
$EDITOR backend/.env   # set JWT_SECRET at minimum

# 3. Install dependencies
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Start the full stack (backend + frontend + SQLite)
docker compose up --build          # or run each service manually:
#   cd backend  && node src/index.js
#   cd frontend && npm run dev

# 5. Open the app
#   http://localhost:5173
```

For **documentation-only** changes you only need a Markdown previewer — no
Node.js or Docker required.

---

## Git workflow

```
main (protected)
  └── your-fork/fix/my-bugfix   ← open a PR from here
```

1. **Fork** the repository to your own GitHub account.
2. Create a **feature branch** — use a short, descriptive name:
   ```bash
   git checkout -b fix/typo-in-quickstart
   git checkout -b feat/eco-score-label
   git checkout -b docs/env-example-english-comments
   ```
3. Make your changes in small, logical commits (see [Commit conventions](#commit-conventions)).
4. Push to your fork and open a **Pull Request** against `main`.
5. Fill in the PR template — in particular the checklist for i18n and docs.
6. A maintainer will review and may request changes; please address them in
   new commits (not force-pushes) so the diff stays readable.

---

## Commit conventions

Format: `<type>(<scope>): <subject>`

| Type | When to use |
|---|---|
| `fix` | Corrects a bug |
| `feat` | Adds a new user-facing feature |
| `docs` | Documentation only |
| `chore` | Build, CI, tooling, dependency updates |
| `refactor` | Internal restructuring without behaviour change |
| `i18n` | Translation / locale file changes |
| `a11y` | Accessibility improvements |

Examples:

```
fix(poller): retry on 429 instead of crashing
feat(dashboard): add per-trip eco-score chip
docs(quickstart): add Windows WSL2 note
i18n(fr): sync handbook with German original
a11y(ui): add aria-label to sidebar icon buttons
```

- Subject in **English**, imperative mood, no trailing period.
- Keep the subject under 72 characters.
- Code comments in the files themselves stay in **German** (existing convention).
- Sign every commit with `-s` (see [License and DCO](#license-and-dco)).

---

## Code style

- **Match the surrounding code** — indentation, naming, comment density.
- Frontend: Vue 3 `<script setup>` + Composition API. No class components.
- Backend: Node.js ESM (`import`/`export`). No CommonJS `require()`.
- No new dependencies without prior discussion in an issue.
- Do not commit `node_modules/`, `dist/`, `.vite/`, `*.log`, or any `.env`
  file (the `.gitignore` blocks these, but keep an eye on it).

---

## Multi-language coverage

Tesla Carview ships in **six UI locales** and keeps repo docs bilingual (🇩🇪 + 🇬🇧).

If your change touches anything user-visible, please update **all** of the
following in the same PR:

| Artefact | Location |
|---|---|
| UI strings | `frontend/src/locales/{de,en,fr,es,tr,el}.json` |
| In-app handbook | `frontend/src/handbook/handbook.{de,en,fr,es,tr,el}.md` |
| Repo docs (German original) | `README.md`, `docs/*.md` |
| Repo docs (English mirror) | `README.en.md`, `docs/*.en.md` |

If you do not speak all six languages, that is fine — update the ones you can
and note the gap in the PR description. Another contributor or a maintainer
will fill in the rest before merging.

---

## Running tests

```bash
# Backend unit & integration tests
cd backend && npm test

# Frontend type-check + lint
cd frontend && npm run type-check && npm run lint

# Full build (catches import errors)
cd frontend && npm run build
```

Please run at least the relevant tests for the area you touched before
opening a PR. A failing test suite blocks the review.

---

## Security vulnerabilities

If you discover a security vulnerability, **do not** open a public issue.

Follow [SECURITY.md](SECURITY.md) and report it privately first. We aim to
acknowledge reports within 48 hours and publish a fix within 14 days.

---

## License and DCO

By submitting a pull request you agree that your contribution will be
published under the [PolyForm Noncommercial 1.0.0](LICENSE) license that
covers the rest of the project.

We use the **Developer Certificate of Origin (DCO)** — no separate CLA
required. Sign every commit with:

```bash
git commit -s
```

This appends:

```
Signed-off-by: Your Name <you@example.com>
```

The full DCO text is at <https://developercertificate.org/>. Signing asserts
that you have the right to submit the contribution under the project's license.

---

**Questions?** Open a [Discussion](https://github.com/KnevS/Tesla-Carview/discussions)
or a draft PR — we are happy to give early feedback before you write a single
line of code.

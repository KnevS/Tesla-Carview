# Contributing to Tesla Carview

> 🇩🇪 [Auf Deutsch lesen](CONTRIBUTING.de.md)

Thank you for your interest in contributing to Tesla Carview. A few rules to keep things clean and lawful:

## License of contributions

By submitting a pull request you agree that your contribution is licensed under the [PolyForm Noncommercial 1.0.0](LICENSE) license that covers the rest of the project.

You also confirm — for every commit — that you can submit it under those terms. We use the **Developer Certificate of Origin (DCO)** for that. Sign your commits with `git commit -s`, which appends a `Signed-off-by:` trailer like:

```
Signed-off-by: Jane Doe <jane@example.com>
```

The DCO text is at <https://developercertificate.org/>; signing a commit means you assert all five clauses for that commit. We do not require a CLA.

## Code style

- Match the surrounding code (indentation, naming, comment density).
- Keep frontend code in the existing Vue 3 + `<script setup>` style.
- Backend code stays Node.js ESM.
- Run a local build before opening a PR (`npm run build` in `frontend/`, `npm test` in `backend/` if tests exist for the area you touched).

## Multi-language coverage

This project ships in six UI locales **and** keeps a bilingual repo doc layout. If your change touches user-visible text or docs, please update them all in the same PR (the PR template has a checklist):

- App UI strings — all six locale files in `frontend/src/locales/{de,en,fr,es,tr,el}.json`
- In-app handbook — all six markdowns in `frontend/src/handbook/handbook.{de,en,fr,es,tr,el}.md`
- Repo docs — German originals (`README.md`, `docs/*.md`) and English mirrors (`README.en.md`, `docs/*.en.md`) stay in sync

## Security

If you discover a vulnerability, **do not** open a public issue. Follow [SECURITY.md](SECURITY.md) and report it privately first.

## Commercial use

The license **forbids commercial redistribution and SaaS-for-third-parties**. If your contribution requires the project to allow that, it is unfortunately out of scope here — see [LICENSE](LICENSE) for the precise wording.

## Questions

Open a discussion or a draft PR — we're happy to help shape contributions before they land.

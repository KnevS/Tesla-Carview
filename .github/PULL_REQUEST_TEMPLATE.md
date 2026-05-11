<!--
Thank you for contributing to Tesla Carview!
Please fill in the sections below; delete what is not relevant.
-->

## Summary

<!-- One or two sentences describing what this PR does and why. -->

## Changes

<!-- Bullet list of the concrete changes. Group by area if helpful. -->
- 

## Testing notes

<!-- How to verify the change. Manual steps, automated tests, screenshots, console output. -->
- 

## Multi-language coverage

This project ships in six UI locales **and** keeps a bilingual repo doc layout.
Tick the boxes that apply, or write *N/A* if the change does not touch user-visible text or docs.

- [ ] App UI strings — all six locale files updated:
      `frontend/src/locales/de.json`, `en.json`, `fr.json`, `es.json`, `tr.json`, `el.json`
- [ ] In-app handbook — all six markdowns updated:
      `frontend/src/handbook/handbook.{de,en,fr,es,tr,el}.md`
- [ ] Repo documentation — German originals and English mirrors stay in sync:
      `README.md` ↔ `README.en.md`, `docs/*.md` ↔ `docs/*.en.md`

## Security review

The repo's policy is to do a diff-focused security review on every change.

- [ ] No secrets, VINs, tokens, private keys or `.env` content added
- [ ] CSP and existing security headers are not weakened
- [ ] No new `new Function` / `eval` paths reachable at runtime
- [ ] Dependencies added: vetted (npm audit clean, license OK)
- [ ] If this changes auth, refresh tokens, MFA or backup codes — the threat model
      in `docs/05-security-architecture.md` was reviewed

## Related issues

<!-- e.g. Closes #123, Refs #456 -->

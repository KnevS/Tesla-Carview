# Beitragen zu Tesla Carview

> 🇬🇧 [Read in English](CONTRIBUTING.md)

Vielen Dank, dass du zu Tesla Carview beitragen möchtest. Ein paar Regeln, damit alles sauber und rechtskonform bleibt:

## Lizenz der Beiträge

Mit dem Einreichen eines Pull Requests stimmst du zu, dass dein Beitrag unter der [PolyForm Noncommercial 1.0.0](LICENSE)-Lizenz steht, die auch für den Rest des Projekts gilt.

Außerdem bestätigst du — für jeden Commit — dass du ihn unter diesen Bedingungen einreichen darfst. Dafür verwenden wir das **Developer Certificate of Origin (DCO)**. Signiere deine Commits mit `git commit -s`, das fügt einen `Signed-off-by:`-Trailer hinzu, z. B.:

```
Signed-off-by: Erika Muster <erika@example.com>
```

Der DCO-Text steht unter <https://developercertificate.org/>; mit dem Signieren eines Commits versicherst du dessen fünf Punkte. Eine separate CLA ist nicht erforderlich.

## Code-Stil

- Schreibe so, wie der umgebende Code aussieht (Einrückung, Benennung, Kommentar-Dichte).
- Frontend bleibt im bestehenden Vue-3- + `<script setup>`-Stil.
- Backend bleibt Node.js-ESM.
- Vor dem PR lokal bauen (`npm run build` in `frontend/`, `npm test` in `backend/`, soweit Tests im betroffenen Bereich existieren).

## Sprachpflege

Das Projekt erscheint in sechs UI-Sprachen **und** hält die Repo-Doku zweisprachig. Wenn deine Änderung sichtbare Texte oder Doku berührt, aktualisiere bitte alles gemeinsam im selben PR (die PR-Vorlage hat eine Checkliste):

- UI-Strings — alle sechs Locale-Dateien `frontend/src/locales/{de,en,fr,es,tr,el}.json`
- In-App-Handbuch — alle sechs Markdowns `frontend/src/handbook/handbook.{de,en,fr,es,tr,el}.md`
- Repo-Doku — deutsche Originale (`README.md`, `docs/*.md`) und englische Spiegel (`README.en.md`, `docs/*.en.md`) bleiben synchron

## Sicherheit

Wenn du eine Sicherheitslücke entdeckst, öffne **kein** öffentliches Issue. Folge [SECURITY.md](SECURITY.md) und melde sie zuerst privat.

## Kommerzielle Nutzung

Die Lizenz **verbietet kommerzielle Weitergabe und SaaS-Angebote für Dritte**. Wenn dein Beitrag das ändern müsste, ist er hier leider außerhalb des Rahmens — siehe [LICENSE](LICENSE) für den exakten Wortlaut.

## Fragen

Eröffne eine Discussion oder einen Draft-PR — wir helfen gerne, Beiträge schon im Frühstadium zu formen.

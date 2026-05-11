# Drittanbieter-Hinweise

> 🇬🇧 [Read in English](THIRD_PARTY_NOTICES.md)

Tesla Carview baut auf zahlreichen Open-Source-npm-Bibliotheken auf. Die nachfolgend aufgelisteten Pakete sind in den Production-Docker-Images enthalten. Ihre jeweiligen Lizenzen gelten zusätzlich zur eigenen Projektlizenz [LICENSE](LICENSE) (PolyForm Noncommercial 1.0.0).

## Lizenzverteilung im Überblick

Die 232 transitiven npm-Abhängigkeiten verteilen sich auf 8 unterschiedliche Lizenzen — durchgängig OSI-anerkannt und mit dem Projekt kompatibel:

| Lizenz | Anzahl | Hinweis |
|---|--:|---|
| MIT | 188 | Permissiv, keine Auflagen außer Attribution |
| Apache-2.0 | 16 | Permissiv, mit Patent-Klausel |
| ISC | 10 | Permissiv (≈ MIT) |
| BSD-2-Clause | 10 | Permissiv |
| BSD-3-Clause | 3 | Permissiv |
| MPL-2.0 | 3 | Schwaches Copyleft auf Datei-Ebene |
| CC-BY-4.0 | 1 | Permissiv mit Attribution |
| BlueOak-1.0.0 | 1 | Permissiv |

Eine **vollständige Auflistung aller Pakete** mit Versionen, Lizenzen und Quell-URLs befindet sich in der englischen Datei [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Pflichten bei Weitergabe

Bei jeder Distribution von Tesla Carview (Container-Image, Source-Tarball, Forks) müssen die Lizenztexte und Copyright-Hinweise der enthaltenen Drittpakete mitgeliefert werden — die Lizenzen oben verlangen das durchgängig (Attribution-Pflicht).

## Aktualisierung der Liste

Die Liste wird **automatisch generiert** aus den `package.json`-Metadaten aller `node_modules`-Einträge in `frontend/` und `backend/`. Sobald Abhängigkeiten geändert werden (`npm install`, Versions-Bump), bitte das Generator-Skript erneut ausführen:

```bash
node /tmp/gen-notices.mjs   # siehe Commit-History für die aktuelle Version
```

Das Skript liegt nicht im Repo, da es als Build-Artefakt-Helfer eingestuft ist; bei Bedarf neu erzeugen.

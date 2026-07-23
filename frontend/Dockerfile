# Multi-Arch: linux/amd64 · linux/arm64 (Pi 4/5)
#
# linux/arm/v7 (Pi 3) ist NICHT mehr baubar: Node veroeffentlicht ab
# Major 24 keine arm/v7-Images mehr — weder alpine noch Debian. Die
# fruehere Begruendung fuer den glibc-Builder (rolldown liefert kein
# @rolldown/binding-linux-arm-musleabihf, nur die gnueabihf-Variante)
# ist damit gegenstandslos: Es gibt fuer node:26 ueberhaupt kein
# arm/v7-Basisimage. Wer Pi 3 wieder unterstuetzen will, muss auf
# node:22 zurueck (letzte Major mit arm/v7).
#
# bookworm-slim bleibt trotzdem — ein Wechsel auf alpine waere jetzt
# zwar technisch pruefbar, bringt aber messbar nichts: node:26-alpine,
# node:24-alpine, node:26-trixie-slim und node:26-bookworm-slim melden
# alle dieselben 4 behebbaren Findings (3 HIGH, 1 CRITICAL). Es sind
# Node-eigene gebuendelte Pakete, unabhaengig von der Distro.
#
# Der Runtime-Layer bleibt nginx:alpine (kleines Image, kein Node noetig)
# und ist mit 0 behebbaren HIGH/CRITICAL sauber. Die CVEs dieser
# Builder-Stage laufen nie mit: uebernommen wird nur /app/dist.
FROM node:26-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# GIT_HASH wird vom CI als --build-arg uebergeben (kein .git-Dir im Build-Context).
# Ohne ARG wuerde vite.config.js auf 'local' zurueckfallen → unveraenderlicher
# Dateiname index-local.js → Browser cached das Bundle immutable fuer 1 Jahr.
ARG GIT_HASH=local
RUN GIT_HASH=${GIT_HASH} npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

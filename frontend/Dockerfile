# Multi-Arch: linux/amd64 · linux/arm64 (Pi 4/5) · linux/arm/v7 (Pi 3)
#
# Builder ist bewusst glibc-basiert (bookworm-slim) statt alpine/musl:
# Vite 8 nutzt rolldown, und rolldown veroeffentlicht KEIN
# @rolldown/binding-linux-arm-musleabihf — nur die gnueabihf-Variante.
# Der Runtime-Layer bleibt nginx:alpine (kleines Image, kein Node noetig).
FROM node:20-bookworm-slim AS builder
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

# Multi-Arch: linux/amd64 · linux/arm64 (Pi 4/5)
#
# linux/arm/v7 (Pi 3) ist NICHT mehr baubar: Node veroeffentlicht ab
# Major 24 keine arm/v7-Images mehr — weder alpine noch Debian. Mit dem
# Wechsel auf node:26 ist der Pi-3-Build faktisch entfallen; `docker
# buildx --platform linux/arm/v7` bricht hier mit "no match for platform
# in manifest" ab. Wer Pi 3 wieder unterstuetzen will, muss auf node:22
# zurueck (letzte Major mit arm/v7).
FROM node:26-alpine
ARG GIT_HASH=unknown
ARG GIT_BRANCH=unknown
ARG BUILD_DATE
ENV GIT_HASH=$GIT_HASH
ENV GIT_BRANCH=$GIT_BRANCH
ENV BUILD_DATE=$BUILD_DATE
WORKDIR /app
COPY package*.json ./
# python3 + make + g++ werden von better-sqlite3 (node-gyp) zum Kompilieren benötigt
#
# npm wird nach der Installation entfernt: Der Container startet mit
# `node src/index.js`, zur Laufzeit wird kein Paketmanager gebraucht.
# Das mit Node gebündelte npm bringt eigene Abhängigkeiten mit (tar,
# undici, brace-expansion), deren CVEs sonst im Laufzeit-Image landen,
# obwohl kein Anwendungscode sie erreicht — und die kein Base-Image-
# Update behebt: node:24/26-alpine liefern tar 7.5.16, der Fix für
# CVE-2026-59873 (CRITICAL) liegt in 7.5.19. Nebeneffekt: Wer Code im
# Container ausführen kann, kann nichts nachinstallieren.
RUN apk add --no-cache python3 make g++ \
 && npm ci --omit=dev \
 && apk del python3 make g++ \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.js"]

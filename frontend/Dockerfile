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
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

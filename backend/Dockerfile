# Multi-Arch: linux/amd64 · linux/arm64 (Pi 4/5) · linux/arm/v7 (Pi 3)
FROM node:22-alpine
ARG GIT_HASH=unknown
ARG GIT_BRANCH=unknown
ARG BUILD_DATE
ENV GIT_HASH=$GIT_HASH
ENV GIT_BRANCH=$GIT_BRANCH
ENV BUILD_DATE=$BUILD_DATE
WORKDIR /app
COPY package*.json ./
# python3 + make + g++ werden von better-sqlite3 (node-gyp) zum Kompilieren benötigt
RUN apk add --no-cache python3 make g++ && npm ci --omit=dev && apk del python3 make g++
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.js"]

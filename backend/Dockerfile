# Multi-Arch: linux/amd64 · linux/arm64 (Pi 4/5) · linux/arm/v7 (Pi 3)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.js"]

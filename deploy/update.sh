#!/bin/bash
# Zero-Downtime Update-Script
# Aufruf: bash /opt/tesla-carview/deploy/update.sh
set -e

APP_DIR="/opt/tesla-carview"
cd $APP_DIR

echo "==> Git Pull"
git pull origin main

echo "==> Docker Images bauen und Container neu starten"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Alte Images aufräumen"
docker system prune -f

echo "==> Update abgeschlossen: $(date)"
docker compose -f docker-compose.prod.yml ps

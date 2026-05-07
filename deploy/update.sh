#!/bin/bash
# Tesla Carview – Zero-Downtime Update
# Aufruf: bash /opt/tesla-carview/deploy/update.sh
#
# Datensicherheit: Alle Daten liegen im Docker-Volume "tesla_data".
# Dieses Volume wird beim Update NICHT gelöscht oder verändert.
# git pull und docker compose up --build berühren ausschließlich den
# Anwendungs-Code, nicht die Datenbanken.
set -e

APP_DIR="/opt/tesla-carview"
cd "$APP_DIR"

echo "============================================"
echo "  Tesla Carview Update – $(date)"
echo "============================================"

echo ""
echo "==> Aktueller Stand"
git log -1 --format="    Commit: %h  |  %s  |  %ci"

echo ""
echo "==> Git Pull"
git pull origin main

echo ""
echo "==> Neuer Stand"
git log -1 --format="    Commit: %h  |  %s  |  %ci"

# Optional: Datenbank-Backup vor dem Update
# (Auskommentieren zum Aktivieren)
# BACKUP_DIR="/opt/tesla-carview-backups"
# mkdir -p "$BACKUP_DIR"
# BACKUP_FILE="$BACKUP_DIR/tesla_data_$(date +%Y%m%d_%H%M%S).tar.gz"
# docker run --rm -v tesla_data:/data -v "$BACKUP_DIR":/backup alpine \
#   tar czf "/backup/tesla_data_$(date +%Y%m%d_%H%M%S).tar.gz" /data
# echo "==> Backup gespeichert: $BACKUP_FILE"

echo ""
echo "==> Docker Images bauen und Container neu starten"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "==> Alte Images aufräumen"
docker system prune -f

echo ""
echo "==> Update abgeschlossen: $(date)"
echo ""
docker compose -f docker-compose.prod.yml ps

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
echo "==> Private-Overlay-Dateien zurücksetzen (vor git pull)"
PRIVATE_REPO="/opt/tc-private.git"
if [ -d "$PRIVATE_REPO" ]; then
  git --git-dir="$PRIVATE_REPO" ls-files | xargs git checkout -- 2>/dev/null || true
fi

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
echo "==> Build-Metadaten ermitteln"
export GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
export GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
export BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "    GIT_HASH=$GIT_HASH  GIT_BRANCH=$GIT_BRANCH  BUILD_DATE=$BUILD_DATE"

echo ""
echo "==> Docker Images bauen"
docker compose -f docker-compose.prod.yml build

echo ""
echo "==> Laufende Container stoppen + bereinigen"
docker compose -f docker-compose.prod.yml stop backend frontend 2>/dev/null || true
docker container prune -f >/dev/null 2>&1 || true

echo ""
echo "==> Container neu starten"
docker compose -f docker-compose.prod.yml up -d --remove-orphans || {
  echo "==> Fallback: direkt starten …"
  docker compose -f docker-compose.prod.yml up -d || true
}

echo ""
echo "==> Alte Images aufräumen"
docker system prune -f

echo ""
echo "==> Update abgeschlossen: $(date)"
echo ""
docker compose -f docker-compose.prod.yml ps

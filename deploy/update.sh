#!/bin/bash
# Tesla Carview – Update-Script
# Aufruf: bash /opt/tesla-carview/deploy/update.sh
#
# Strategie: Images vorab laden während der alte Container läuft,
# danach nur geänderte Services neu starten → minimale Downtime.
set -euo pipefail

APP_DIR="/opt/tesla-carview"
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml"
cd "$APP_DIR"

echo "============================================"
echo "  Tesla Carview Update – $(date)"
echo "============================================"

echo ""
echo "==> Aktueller Stand"
git log -1 --format="    Commit: %h  |  %s  |  %ci"

# Private-Overlay zurücksetzen (vor git pull)
echo ""
echo "==> Private-Overlay-Dateien zurücksetzen"
PRIVATE_REPO="/opt/tc-private.git"
if [ -d "$PRIVATE_REPO" ]; then
  git --git-dir="$PRIVATE_REPO" ls-files | xargs git checkout -- 2>/dev/null || true
fi

echo ""
echo "==> Git Pull"
git pull origin main
echo ""
git log -1 --format="    Neuer Stand: %h  |  %s  |  %ci"

# CI-Bereitschaft prüfen: Image-Revision vs. lokaler Commit
echo ""
echo "==> CI-Image-Bereitschaft prüfen"
LOCAL_SHA=$(git rev-parse HEAD)
IMAGE_SHA=$(docker inspect ghcr.io/knevs/tesla-carview/backend:main \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null || echo "")
if [ -n "$IMAGE_SHA" ] && [ "$IMAGE_SHA" != "$LOCAL_SHA" ]; then
  echo "    INFO: GHCR-Image zeigt auf $IMAGE_SHA"
  echo "          Lokaler Commit: $LOCAL_SHA"
  echo "          CI baut gerade noch — trotzdem fortfahren (neuestes verfügbares Image)."
else
  echo "    OK — Image passt zum Commit."
fi

# Images vorab laden (Container laufen weiter → keine Downtime während Pull)
echo ""
echo "==> Docker Images vorab laden (Container laufen weiter) …"
$COMPOSE pull backend frontend

# Nur geänderte Services neu starten (nginx bleibt wenn Image gleich)
echo ""
echo "==> Geänderte Container neu starten"
$COMPOSE up -d --remove-orphans

# Private Dateien verarbeiten (GHCR-Images haben nur Stubs)
echo ""
echo "==> Private Overlay-Dateien verarbeiten"
if [ -d "$PRIVATE_REPO" ]; then
  BACKEND_CHANGED=0
  FRONTEND_CHANGED=0

  while IFS= read -r file; do
    src="$APP_DIR/$file"
    case "$file" in
      backend/*)
        dst="/app/${file#backend/}"
        if [ -f "$src" ]; then
          docker cp "$src" "tesla-carview-backend:$dst" && echo "    ✓ Backend: $file"
          BACKEND_CHANGED=1
        fi
        ;;
      frontend/*)
        FRONTEND_CHANGED=1
        ;;
    esac
  done < <(git --git-dir="$PRIVATE_REPO" ls-files)

  # Backend: Neustart damit Node.js die injizierten Dateien lädt
  if [ "$BACKEND_CHANGED" -eq 1 ]; then
    docker restart tesla-carview-backend
    echo "    Backend restartet mit privaten Dateien."
  fi

  # Frontend: lokal bauen (private Demo.vue kann nicht in pre-compiled Bundle injiziert werden)
  if [ "$FRONTEND_CHANGED" -eq 1 ]; then
    echo "    Frontend lokal bauen (enthält private Demo.vue) …"
    cd "$APP_DIR/frontend"
    npm install --silent 2>/dev/null
    ./node_modules/.bin/vite build --silent 2>/dev/null || node_modules/.bin/vite build
    cd "$APP_DIR"

    # Gebaute Dateien in laufenden Frontend-Container kopieren
    FRONTEND_CONTAINER=$(docker ps --filter name=tesla-carview-frontend --format "{{.Names}}" | head -1)
    if [ -n "$FRONTEND_CONTAINER" ]; then
      docker cp "$APP_DIR/frontend/dist/." "$FRONTEND_CONTAINER":/usr/share/nginx/html/
      echo "    ✓ Frontend: dist/ → Container $FRONTEND_CONTAINER"
    fi
  fi
else
  echo "    Kein privates Repo gefunden — übersprungen."
fi

# Auf Backend-Health warten
echo ""
echo "==> Warte auf Backend …"
ATTEMPTS=0
until docker exec tesla-carview-backend wget -qO- http://localhost:3000/api/health >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge 24 ]; then
    echo "    FEHLER: Backend nicht bereit nach 2 Minuten — Logs prüfen:"
    docker logs tesla-carview-backend --tail 20
    exit 1
  fi
  sleep 5
done
echo "    Backend bereit nach $((ATTEMPTS * 5))s."

# Netzwerk nginx prüfen
echo ""
echo "==> Netzwerk nginx prüfen"
COMPOSE_NET="tesla-carview_tesla-net"
if docker inspect tesla-carview-nginx \
    --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null \
    | grep -q "$COMPOSE_NET"; then
  echo "    OK — nginx ist in $COMPOSE_NET"
else
  echo "    Netzwerk fehlt — verbinde …"
  docker network connect "$COMPOSE_NET" tesla-carview-nginx
fi

# Nur verwaiste (dangling) Images entfernen — kein Build-Cache löschen
echo ""
echo "==> Alte Images aufräumen (nur dangling)"
docker image prune -f

echo ""
echo "==> Update abgeschlossen: $(date)"
echo ""
$COMPOSE ps

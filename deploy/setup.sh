#!/bin/bash
# ============================================================
# Tesla Carview – Server Setup für iland.krische.com (Netcup)
# Ausführen als root oder mit sudo
# ============================================================
set -e

APP_DIR="/opt/tesla-carview"
DOMAIN="tesla.iland.krische.com"
APP_USER="tesla"

echo "==> [1/7] System-Pakete aktualisieren"
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw

echo "==> [2/7] Docker installieren (falls nicht vorhanden)"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

echo "==> [3/7] App-Benutzer und Verzeichnis anlegen"
useradd -r -s /bin/bash -d $APP_DIR $APP_USER 2>/dev/null || true
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR

echo "==> [4/7] Repository klonen"
if [ ! -d "$APP_DIR/.git" ]; then
    git clone https://github.com/KnevS/Tesla-Carview.git $APP_DIR
else
    git -C $APP_DIR pull
fi
chown -R $APP_USER:$APP_USER $APP_DIR

echo "==> [5/7] .env konfigurieren"
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp $APP_DIR/backend/.env.example $APP_DIR/backend/.env
    echo ""
    echo "WICHTIG: Bitte $APP_DIR/backend/.env mit deinen Tesla API Credentials befüllen!"
    echo "  TESLA_CLIENT_ID=..."
    echo "  TESLA_CLIENT_SECRET=..."
    echo "  TESLA_REDIRECT_URI=https://$DOMAIN/api/auth/callback"
    echo "  JWT_SECRET=$(openssl rand -hex 32)"
fi

echo "==> [6/7] Nginx konfigurieren"
cp $APP_DIR/deploy/nginx-host.conf /etc/nginx/sites-available/tesla-carview
ln -sf /etc/nginx/sites-available/tesla-carview /etc/nginx/sites-enabled/tesla-carview
nginx -t && systemctl reload nginx

echo "==> [7/7] SSL-Zertifikat via Let's Encrypt holen"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@krische.com --redirect

echo ""
echo "============================================================"
echo " Setup abgeschlossen!"
echo " Nächste Schritte:"
echo "   1. $APP_DIR/backend/.env befüllen"
echo "   2. cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"
echo "   3. https://$DOMAIN aufrufen"
echo "============================================================"

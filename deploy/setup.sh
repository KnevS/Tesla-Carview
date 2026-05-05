#!/bin/bash
# =================================================================
# Tesla Carview - Server-Setup fuer iland.krische.com (Netcup)
# Ausfuehren als root: bash deploy/setup.sh
# =================================================================
set -euo pipefail

DOMAIN="tesla.iland.krische.com"
APP_DIR="/opt/tesla-carview"
CERT_EMAIL="admin@krische.com"

echo "==> [1/8] Systempakete aktualisieren"
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw fail2ban

echo "==> [2/8] Docker installieren"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

echo "==> [3/8] Firewall konfigurieren (UFW)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall aktiv: nur SSH, HTTP und HTTPS erlaubt"

echo "==> [4/8] fail2ban konfigurieren (SSH-Brute-Force-Schutz)"
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban

echo "==> [5/8] Repository klonen"
if [ ! -d "$APP_DIR/.git" ]; then
    git clone https://github.com/KnevS/Tesla-Carview.git "$APP_DIR"
else
    git -C "$APP_DIR" pull origin main
fi

echo "==> [6/8] .env anlegen"
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
    # Sicheres JWT_SECRET automatisch generieren
    JWT=$(openssl rand -hex 64)
    sed -i "s|change-me-to-a-very-long-random-secret-min-64-chars|$JWT|" "$APP_DIR/backend/.env"
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$APP_DIR/backend/.env"
    sed -i "s|TESLA_REDIRECT_URI=.*|TESLA_REDIRECT_URI=https://$DOMAIN/api/auth/callback|" "$APP_DIR/backend/.env"
    echo ""
    echo "WICHTIG: Trage deine Tesla-API-Zugangsdaten ein:"
    echo "  nano $APP_DIR/backend/.env"
fi

echo "==> [7/8] Nginx + SSL konfigurieren"
# Temporaere HTTP-Config fuer certbot-Challenge
cat > /etc/nginx/sites-available/tesla-carview-tmp <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root /var/www/html;
}
EOF
ln -sf /etc/nginx/sites-available/tesla-carview-tmp /etc/nginx/sites-enabled/tesla-carview
nginx -t && systemctl reload nginx

# SSL-Zertifikat holen
certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --email "$CERT_EMAIL" --redirect || true

# Haertete Nginx-Config einsetzen
cp "$APP_DIR/deploy/nginx-host.conf" /etc/nginx/sites-available/tesla-carview
nginx -t && systemctl reload nginx

# Certbot Auto-Renewal als systemd-Timer aktivieren
systemctl enable certbot.timer
systemctl start  certbot.timer

echo "==> [8/8] App-Container starten"
cd "$APP_DIR"
mkdir -p data
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "================================================================"
echo " Setup abgeschlossen!"
echo " URL: https://$DOMAIN"
echo " "
echo " Naechste Schritte:"
echo "   1. Tesla-API-Daten eintragen: nano $APP_DIR/backend/.env"
echo "   2. Container neu starten:     cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d"
echo "   3. Admin-Passwort aus Logs:   docker logs tesla-carview-backend | grep -A3 'ERSTER START'"
echo "================================================================"

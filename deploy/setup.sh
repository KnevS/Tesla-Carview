#!/bin/bash
# ============================================================
# Tesla Carview – Automatisches Server-Setup
# Getestet auf: Debian/Ubuntu (x86_64, ARM64)
# Kompatibel mit:  Linux-VMs, Netcup, Hetzner, Raspberry Pi 4/5 (ARM64)
#
# Aufruf als root:  bash deploy/setup.sh
# ============================================================
set -euo pipefail

APP_DIR="/opt/tesla-carview"
REPO_URL="https://github.com/KnevS/Tesla-Carview.git"

# ---- Farben -----------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

step() { echo -e "\n${BOLD}${CYAN}==> $1${RESET}"; }
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }

if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}Bitte als root ausfuehren: sudo bash deploy/setup.sh${RESET}"
    exit 1
fi

# Architektur erkennen
ARCH="$(uname -m)"

# 32-Bit-ARM (Pi 3 und aelter) frueh und verstaendlich abfangen. Ohne diese
# Pruefung laeuft das komplette Setup durch und bricht erst beim Image-Pull
# mit "no match for platform in manifest" ab — einer Meldung, die niemandem
# sagt, was zu tun ist.
case "$ARCH" in
    armv6l|armv7l|armhf)
        echo ""
        echo -e "${RED}Nicht unterstuetzte Architektur: ${ARCH} (32-Bit-ARM)${RESET}"
        echo ""
        echo "  Tesla Carview braucht ARM64. Node.js veroeffentlicht seit"
        echo "  Version 24 keine 32-Bit-ARM-Images mehr — weder alpine noch"
        echo "  Debian. Damit laesst sich das Backend-Image auf einem"
        echo "  Raspberry Pi 3 (oder aelter) nicht mehr bauen."
        echo ""
        echo "  Moeglichkeiten:"
        echo "    - Raspberry Pi 4 oder 5 verwenden (ARM64, empfohlen)"
        echo "    - Auf einem Pi 4/5 laeuft auch ein 64-Bit-Raspberry-Pi-OS:"
        echo "      pruefe mit 'uname -m', ob dort aarch64 gemeldet wird"
        echo "    - Beliebiger x86_64-Linux-Server"
        echo ""
        echo "  Wer bei 32-Bit-ARM bleiben muss, kann die Dockerfiles auf"
        echo "  node:22 zuruecksetzen — die letzte Major mit armv7-Images."
        echo "  Das ist ein Fork-Pfad ohne kuenftige Node-Security-Updates."
        echo ""
        exit 1
        ;;
esac
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║        Tesla Carview – Server-Setup          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo "  Erkannte Architektur: ${YELLOW}${ARCH}${RESET}"
echo "  Zielverzeichnis:      ${YELLOW}${APP_DIR}${RESET}"
echo ""

# ---- Deployment-Modus abfragen ------------------------------------
echo -e "${BOLD}Deployment-Modus:${RESET}"
echo "  [1] Direct  – nginx wird von diesem Skript installiert und konfiguriert"
echo "                (empfohlen fuer dedizierte VMs ohne bestehenden Proxy)"
echo "  [2] Proxy   – du hast bereits nginx, Caddy, Traefik o.ae. am Laufen"
echo "                (nginx-Installation und -Konfiguration werden uebersprungen)"
echo ""
echo -en "${CYAN}  Auswahl [1/2, Standard 1]: ${RESET}"
read -r DEPLOY_MODE_INPUT
DEPLOY_MODE="${DEPLOY_MODE_INPUT:-1}"
if [[ "$DEPLOY_MODE" != "1" && "$DEPLOY_MODE" != "2" ]]; then
    echo -e "${RED}Ungueltige Auswahl – Abbruch.${RESET}"; exit 1
fi
echo ""

step "[1/7] Systempakete aktualisieren"
apt-get update -qq
if [ "$DEPLOY_MODE" = "1" ]; then
    apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw fail2ban
else
    apt-get install -y -qq curl git ufw fail2ban
    echo -e "${YELLOW}  nginx/certbot uebersprungen (Proxy-Modus).${RESET}"
fi
ok "Pakete installiert"

step "[2/7] Docker installieren"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    ok "Docker installiert"
else
    ok "Docker bereits vorhanden"
fi

step "[3/7] Firewall konfigurieren (UFW)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall aktiv: SSH, HTTP, HTTPS"

step "[4/7] fail2ban konfigurieren"
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban
ok "fail2ban aktiv"

step "[5/7] Repository klonen"
if [ ! -d "$APP_DIR/.git" ]; then
    git clone "$REPO_URL" "$APP_DIR"
    ok "Repository geklont"
else
    git -C "$APP_DIR" pull origin main
    ok "Repository aktualisiert"
fi

step "[6/7] Erstkonfiguration"
if [ ! -f "$APP_DIR/backend/.env" ]; then
    bash "$APP_DIR/deploy/setup-wizard.sh"
else
    echo -e "${YELLOW}Konfiguration bereits vorhanden: $APP_DIR/backend/.env${RESET}"
    echo "  Zum Aendern: bash $APP_DIR/deploy/setup-wizard.sh"
fi

# Domain aus .env lesen fuer Nginx/SSL
DOMAIN=""
if [ -f "$APP_DIR/backend/.env" ]; then
    FRONTEND_URL="$(grep '^FRONTEND_URL=' "$APP_DIR/backend/.env" | cut -d= -f2- | tr -d '"' || true)"
    # Nur bei https:// eine Domain extrahieren
    if [[ "$FRONTEND_URL" == https://* ]]; then
        DOMAIN="$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')"
        CERT_EMAIL="$(grep '^ADMIN_EMAIL=' "$APP_DIR/backend/.env" | cut -d= -f2- | tr -d '"' || echo '')"
    fi
fi

step "[7/7] Nginx + SSL einrichten"
if [ "$DEPLOY_MODE" = "2" ]; then
    echo -e "${YELLOW}Proxy-Modus – nginx-Konfiguration uebersprungen.${RESET}"
    echo "  Docker lauscht auf Port 8080. Bitte in deinem Proxy weiterleiten:"
    echo "    proxy_pass http://127.0.0.1:8080;"
elif [ -n "$DOMAIN" ]; then
    # Temporaere HTTP-Config fuer certbot-Challenge
    cat > /etc/nginx/sites-available/tesla-carview <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root /var/www/html;
}
EOF
    ln -sf /etc/nginx/sites-available/tesla-carview /etc/nginx/sites-enabled/tesla-carview
    nginx -t && systemctl reload nginx

    # SSL-Zertifikat
    if [ -n "$CERT_EMAIL" ]; then
        certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos \
            --email "$CERT_EMAIL" --redirect || true
    else
        echo -e "${YELLOW}Keine E-Mail angegeben – SSL-Zertifikat uebersprungen.${RESET}"
        echo "  Spaeter: certbot --nginx -d $DOMAIN --email deine@email.com"
    fi

    # Nginx-Config mit echter Domain generieren
    sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx-host.conf.template" \
        > /etc/nginx/sites-available/tesla-carview 2>/dev/null || \
        cp "$APP_DIR/deploy/nginx-host.conf" /etc/nginx/sites-available/tesla-carview

    nginx -t && systemctl reload nginx
    systemctl enable certbot.timer && systemctl start certbot.timer
    ok "Nginx + SSL konfiguriert fuer $DOMAIN"
else
    echo -e "${YELLOW}Kein HTTPS-Domain erkannt – Nginx nicht konfiguriert.${RESET}"
    echo "  Fuer Raspberry Pi / Heimnetz ist das korrekt."
fi  # end DEPLOY_MODE branch

step "Container starten"
cd "$APP_DIR"
mkdir -p data
# Try-pull-then-build: GHCR-Images von KnevS/tesla-carview sind nur ueber
# OAuth-Token erreichbar wenn die Visibility auf "private" steht. Wir
# tolerieren einen fehlgeschlagenen Pull und fallen auf den lokalen Build
# zurueck (build:-Block in docker-compose.prod.yml fuer backend/frontend).
if ! docker compose -f docker-compose.prod.yml pull 2>&1 | tee /tmp/tcv-pull.log; then
    echo -e "${YELLOW}Pull fehlgeschlagen (GHCR-Images evtl. privat) – baue lokal...${RESET}"
elif grep -qiE "denied|forbidden|not found|unauthorized" /tmp/tcv-pull.log; then
    echo -e "${YELLOW}Pull-Antwort enthielt Fehler – baue lokal...${RESET}"
fi
# Build greift nur fuer Services mit build:-Block; pre-built tesla-proxy
# und nginx werden uebersprungen.
docker compose -f docker-compose.prod.yml build --pull 2>&1 || {
    echo -e "${RED}Build fehlgeschlagen. Logs oben pruefen.${RESET}"
    exit 1
}
docker compose -f docker-compose.prod.yml up -d
ok "Container laufen"

# Post-Install Hygiene-Check — validiert das frisch aufgesetzte System
if [[ -f "$APP_DIR/scripts/hygiene-check.sh" ]]; then
  echo ""
  step "Post-Install Systemcheck"
  bash "$APP_DIR/scripts/hygiene-check.sh" --ci 2>/dev/null || true
fi

FRONTEND_URL="${FRONTEND_URL:-http://localhost:8080}"
echo ""
echo -e "${BOLD}${GREEN}================================================================${RESET}"
echo -e "${BOLD}${GREEN} Setup abgeschlossen!${RESET}"
echo -e "${GREEN} URL: ${YELLOW}$FRONTEND_URL${RESET}"
echo ""
echo "  Admin-Passwort lesen:"
echo "    docker logs tesla-carview-backend 2>&1 | grep -A3 'ERSTER START'"
echo ""
echo "  Konfiguration aendern:"
echo "    bash $APP_DIR/deploy/setup-wizard.sh"
echo -e "${BOLD}${GREEN}================================================================${RESET}"
echo ""

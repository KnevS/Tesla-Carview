#!/bin/bash
# ============================================================
# Tesla Carview – Erster-Start-Assistent (Terminal)
# Erstellt/aktualisiert die backend/.env Konfigurationsdatei
#
# Aufruf:  bash deploy/setup-wizard.sh
# ============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$APP_DIR/backend/.env"
ENV_EXAMPLE="$APP_DIR/backend/.env.example"

# ---- Farben -----------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ask()   { echo -en "${CYAN}${1}${RESET}"; read -r "$2"; }
askpw() { echo -en "${CYAN}${1}${RESET}"; read -rs "$2"; echo; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║     Tesla Carview – Erstkonfiguration        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo "Dieser Assistent fuehrt durch die Basiskonfiguration."
echo "Alle Werte landen in: ${YELLOW}$ENV_FILE${RESET}"
echo ""
echo -e "${BOLD}${YELLOW}── Bevor du loslegst — Tesla-Vorbereitungen ──${RESET}"
echo ""
echo "  1. ${BOLD}Tesla Developer Account${RESET} unter https://developer.tesla.com"
echo "     → Application registrieren (Client-ID + Secret bekommen)"
echo -e "     ${YELLOW}Hinweis:${RESET} Tesla-Approval kann ${BOLD}1–3 Wochen${RESET} dauern. Wenn du den"
echo "     Antrag noch nicht gestellt hast, kannst du den Wizard trotzdem fertig"
echo -e "     fuehren und die Tesla-Felder spaeter via ${YELLOW}bash deploy/setup-wizard.sh${RESET}"
echo "     nachtragen — alle anderen Funktionen laufen schon vorher."
echo ""
echo "  2. ${BOLD}Region${RESET} (NA / EU / Asia): bestimmt die TESLA_AUDIENCE-URL —"
echo "     der Wizard fragt das gleich ab."
echo ""
echo "  3. ${BOLD}Virtual Key${RESET} (fuer Fahrzeugbefehle): wird nach dem Setup per"
echo -e "     Browser-Link + Tesla-App eingerichtet — Details in ${CYAN}docs/04-tesla-api.md${RESET}"
echo "     (Abschnitt 'Fahrzeugbefehle')."
echo ""
echo -en "${CYAN}  Weiter mit ENTER (Strg+C zum Abbruch)... ${RESET}"
read -r _
echo ""

# ---- Domain / URL -----------------------------------------
echo -e "${BOLD}[1/5] Oeffentliche URL${RESET}"
echo "      Beispiele:"
echo "        https://tesla.example.com   (Produktiv mit eigener Domain)"
echo "        http://192.168.1.100:8080   (Heimnetz / Raspberry Pi)"
echo "        http://localhost:5173       (Lokale Entwicklung)"
echo ""
ask "  URL der Anwendung: " FRONTEND_URL
FRONTEND_URL="${FRONTEND_URL%/}"   # trailing slash entfernen

# ---- Tesla API --------------------------------------------
echo ""
echo -e "${BOLD}[2/5] Tesla Fleet API${RESET}"
echo "      Zugangsdaten aus https://developer.tesla.com/"
echo "      (Leer lassen, wenn du die API spaeter konfigurieren moechtest)"
echo ""
ask "  Tesla Client-ID:     " TESLA_CLIENT_ID
ask "  Tesla Client-Secret: " TESLA_CLIENT_SECRET

TESLA_REDIRECT_URI="${FRONTEND_URL}/api/auth/callback"

# ---- Datenbank --------------------------------------------
echo ""
echo -e "${BOLD}[3/5] Datenbank${RESET}"
echo "      Pfad zur SQLite-Datei (Standard: ./data/tesla-carview.db)"
ask "  DB-Pfad [./data/tesla-carview.db]: " DB_PATH
DB_PATH="${DB_PATH:-./data/tesla-carview.db}"

# ---- E-Mail fuer Let's Encrypt ----------------------------
echo ""
echo -e "${BOLD}[4/5] E-Mail-Adresse${RESET}"
echo "      Fuer Let's Encrypt SSL-Zertifikate und Systembenachrichtigungen"
echo "      (Nur noetig bei Produktiv-Deployment mit HTTPS)"
ask "  E-Mail: " ADMIN_EMAIL

# ---- Web Push (optional) ----------------------------------
echo ""
echo -e "${BOLD}[5/5] Web Push (optional)${RESET}"
echo "      Benachrichtigungen bei Ladeende. VAPID-Keys generieren mit:"
echo "      npx web-push generate-vapid-keys"
ask "  VAPID Public Key  (leer = deaktiviert): " VAPID_PUBLIC_KEY
if [ -n "$VAPID_PUBLIC_KEY" ]; then
    ask "  VAPID Private Key: " VAPID_PRIVATE_KEY
else
    VAPID_PRIVATE_KEY=""
fi

# ---- JWT Secret generieren --------------------------------
JWT_SECRET="$(openssl rand -hex 64)"

# ---- .env schreiben ---------------------------------------
echo ""
echo -e "${YELLOW}==> Schreibe Konfiguration nach $ENV_FILE${RESET}"

cat > "$ENV_FILE" <<EOF
# Tesla Carview – automatisch generiert am $(date '+%Y-%m-%d %H:%M:%S')
# Bearbeiten mit: nano $ENV_FILE

PORT=3000
JWT_SECRET=${JWT_SECRET}

FRONTEND_URL=${FRONTEND_URL}

TESLA_CLIENT_ID=${TESLA_CLIENT_ID}
TESLA_CLIENT_SECRET=${TESLA_CLIENT_SECRET}
TESLA_REDIRECT_URI=${TESLA_REDIRECT_URI}
TESLA_AUTH_BASE=https://auth.tesla.com/oauth2/v3
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com

DB_PATH=${DB_PATH}
ENABLE_POLLER=true

ADMIN_EMAIL=${ADMIN_EMAIL}

VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
EOF

# Dateirechte absichern
chmod 600 "$ENV_FILE"

echo ""
echo -e "${GREEN}✓ Konfiguration gespeichert!${RESET}"
echo ""
echo "  Naechste Schritte:"
echo "  1. App starten:"

if command -v docker &>/dev/null; then
    echo "     cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"
else
    echo "     cd $APP_DIR/backend && npm install && npm start"
fi

echo "  2. Im Browser oeffnen: ${YELLOW}$FRONTEND_URL${RESET}"
echo "  3. Admin-Passwort aus Log lesen:"
if command -v docker &>/dev/null; then
    echo "     docker logs tesla-carview-backend 2>&1 | grep -A3 'ERSTER START'"
fi
echo ""

#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  Tesla Carview — System-Hygiene-Check
#  Aufruf:  bash scripts/hygiene-check.sh [--fix] [--ci]
#
#  --fix   versucht harmlose Probleme automatisch zu beheben (npm audit fix,
#          Docker-Prune, VACUUM)
#  --ci    CI-Modus: kein Farb-Output, Exit-Code 1 bei kritischen Befunden
#
#  Geprüft wird:
#   1. Systemenvironment  (Docker, Node, Disk)
#   2. Dependencies       (npm audit frontend + backend)
#   3. Bundle-Größe       (Warnung wenn Haupt-Chunk > Schwelle)
#   4. .env-Vollständigkeit (alle Pflicht-Variablen vorhanden?)
#   5. Docker-Gesundheit  (Container-Status, dangling Images)
#   6. Datenbank-Integrität (SQLite integrity_check)
#   7. SSL/TLS-Zertifikat (Ablauf-Prüfung falls Domain konfiguriert)
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
FIX=0; CI_MODE=0; FAILURES=0; WARNINGS=0

for arg in "$@"; do
  case "$arg" in
    --fix) FIX=1 ;;
    --ci)  CI_MODE=1 ;;
  esac
done

# ─── Farben ────────────────────────────────────────────────────────────────
if [[ "$CI_MODE" -eq 1 ]]; then
  RED=""; GREEN=""; YELLOW=""; CYAN=""; BOLD=""; RESET=""
else
  RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"
  CYAN="\033[0;36m"; BOLD="\033[1m"; RESET="\033[0m"
fi

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; WARNINGS=$((WARNINGS+1)); }
fail() { echo -e "  ${RED}✗${RESET} $*"; FAILURES=$((FAILURES+1)); }
info() { echo -e "  ${CYAN}ℹ${RESET} $*"; }
section() { echo -e "\n${BOLD}${CYAN}═══ $* ═══${RESET}"; }

echo -e "${BOLD}Tesla Carview Hygiene-Check — $(date)${RESET}"

# ─── 1. System-Environment ────────────────────────────────────────────────
section "1. System-Environment"

# Docker
if command -v docker &>/dev/null; then
  DOCKER_V=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
  ok "Docker $DOCKER_V"
else
  fail "Docker nicht gefunden — Installation erforderlich"
fi

# Node.js
if command -v node &>/dev/null; then
  NODE_V=$(node --version)
  NODE_MAJOR=$(echo "$NODE_V" | tr -d 'v' | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 20 ]]; then
    ok "Node.js $NODE_V (>= 20 ✓)"
  else
    warn "Node.js $NODE_V — empfohlen >= 20 (aktuelle LTS)"
  fi
else
  warn "Node.js nicht auf dem Host — nur im Docker relevant"
fi

# Disk Space
DISK_USAGE=$(df -h "$APP_DIR" 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%')
if [[ -n "$DISK_USAGE" ]]; then
  if [[ "$DISK_USAGE" -ge 90 ]]; then
    fail "Disk-Auslastung ${DISK_USAGE}% — kritisch! Bereinigung nötig."
  elif [[ "$DISK_USAGE" -ge 80 ]]; then
    warn "Disk-Auslastung ${DISK_USAGE}% — Achtung, wenig Platz."
  else
    ok "Disk-Auslastung ${DISK_USAGE}%"
  fi
fi

# ─── 2. npm audit ─────────────────────────────────────────────────────────
section "2. Dependency-Sicherheit (npm audit)"

audit_check() {
  local label="$1"; local dir="$2"
  if [[ ! -d "$dir" ]]; then info "$label: Verzeichnis nicht gefunden — übersprungen"; return; fi
  local audit_out
  audit_out=$(cd "$dir" && npm audit --json 2>/dev/null || true)

  local critical high moderate
  critical=$(echo "$audit_out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('critical',0))" 2>/dev/null || echo "?")
  high=$(echo "$audit_out"     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('high',0))" 2>/dev/null || echo "?")
  moderate=$(echo "$audit_out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('moderate',0))" 2>/dev/null || echo "?")

  if [[ "$critical" == "0" && "$high" == "0" ]]; then
    ok "$label: kritisch=$critical, hoch=$high, moderat=$moderate"
  elif [[ "$critical" != "0" ]]; then
    fail "$label: ${critical} KRITISCHE Schwachstellen — sofort handeln!"
    if [[ "$FIX" -eq 1 ]]; then
      info "Versuche npm audit fix…"
      (cd "$dir" && npm audit fix --force 2>&1 | tail -3) || true
    fi
  else
    warn "$label: ${high} hohe Schwachstellen (moderat: ${moderate})"
    [[ "$FIX" -eq 1 ]] && (cd "$dir" && npm audit fix 2>&1 | tail -3) || true
  fi
}

audit_check "Frontend" "$APP_DIR/frontend"
audit_check "Backend"  "$APP_DIR/backend"

# ─── 3. Bundle-Größe ──────────────────────────────────────────────────────
section "3. Bundle-Größe"

DIST_DIR="$APP_DIR/frontend-dist-private"
if [[ ! -d "$DIST_DIR/assets" ]]; then
  DIST_DIR="$APP_DIR/frontend/dist"
fi

if [[ -d "$DIST_DIR/assets" ]]; then
  # Haupt-Chunk (index-*.js oder index.js)
  MAIN_CHUNK=$(ls "$DIST_DIR/assets/index-"*.js 2>/dev/null | head -1 || ls "$DIST_DIR/assets/index.js" 2>/dev/null || echo "")
  if [[ -n "$MAIN_CHUNK" ]]; then
    SIZE_BYTES=$(stat -c%s "$MAIN_CHUNK" 2>/dev/null || stat -f%z "$MAIN_CHUNK" 2>/dev/null || echo 0)
    SIZE_KB=$((SIZE_BYTES / 1024))
    GZIP_KB=$(gzip -c "$MAIN_CHUNK" 2>/dev/null | wc -c | awk '{printf "%.0f", $1/1024}')

    if [[ "$SIZE_KB" -gt 800 ]]; then
      fail "Haupt-Bundle: ${SIZE_KB} KB (gzip: ~${GZIP_KB} KB) — über Budget (800 KB)!"
    elif [[ "$SIZE_KB" -gt 500 ]]; then
      warn "Haupt-Bundle: ${SIZE_KB} KB (gzip: ~${GZIP_KB} KB) — Tendenz beobachten"
    else
      ok "Haupt-Bundle: ${SIZE_KB} KB (gzip: ~${GZIP_KB} KB)"
    fi
  else
    info "Kein Build-Artefakt gefunden — Bundle-Größe nicht prüfbar"
  fi

  # Gesamtgröße aller Chunks
  TOTAL_KB=$(du -sk "$DIST_DIR/assets/" 2>/dev/null | awk '{print $1}' || echo "?")
  info "Gesamt assets/: ${TOTAL_KB} KB (unkomprimiert)"
else
  info "Kein dist-Verzeichnis — Bundle-Prüfung übersprungen"
fi

# ─── 4. .env-Vollständigkeit ──────────────────────────────────────────────
section "4. .env-Konfiguration"

ENV_FILE="$APP_DIR/backend/.env"
ENV_EXAMPLE="$APP_DIR/backend/.env.example"

if [[ -f "$ENV_FILE" && -f "$ENV_EXAMPLE" ]]; then
  MISSING=()
  while IFS= read -r line; do
    [[ "$line" =~ ^#|^$ ]] && continue
    KEY="${line%%=*}"
    if ! grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
      MISSING+=("$KEY")
    fi
  done < "$ENV_EXAMPLE"

  if [[ "${#MISSING[@]}" -eq 0 ]]; then
    ok ".env vollständig (alle Schlüssel aus .env.example vorhanden)"
  else
    warn "Fehlende .env-Schlüssel: ${MISSING[*]}"
  fi
else
  [[ ! -f "$ENV_FILE" ]]     && fail ".env nicht gefunden — von .env.example kopieren!"
  [[ ! -f "$ENV_EXAMPLE" ]]  && info ".env.example nicht gefunden"
fi

# Auf plaintext-Geheimnisse prüfen (kein API-Key in falscher Datei)
if [[ -f "$APP_DIR/.env" ]]; then
  warn "Achtung: .env im Repo-Root — sollte in backend/.env sein"
fi

# ─── 5. Docker-Gesundheit ─────────────────────────────────────────────────
section "5. Docker-Container + Images"

if command -v docker &>/dev/null; then
  COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
  if [[ -f "$COMPOSE_FILE" ]]; then
    UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
      | python3 -c "
import sys, json
lines = sys.stdin.read().strip().splitlines()
for line in lines:
  try:
    c = json.loads(line)
    s = c.get('Health','') or c.get('State','')
    n = c.get('Name','?')
    if 'unhealthy' in s or 'exited' in s:
      print(f'  ✗ {n}: {s}')
  except: pass
" 2>/dev/null || echo "")
    if [[ -z "$UNHEALTHY" ]]; then
      ok "Alle Container gesund"
    else
      fail "Ungesunde Container:\n$UNHEALTHY"
    fi
  fi

  # Dangling Images
  DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$DANGLING" -gt 0 ]]; then
    warn "$DANGLING dangling Docker-Images — belasten Disk"
    if [[ "$FIX" -eq 1 ]]; then
      docker image prune -f 2>/dev/null && ok "Dangling Images entfernt"
    else
      info "Mit --fix automatisch bereinigen"
    fi
  else
    ok "Keine dangling Images"
  fi

  # Volumes ohne Referenz
  ORPHAN_VOL=$(docker volume ls -f "dangling=true" -q 2>/dev/null | wc -l | tr -d ' ')
  [[ "$ORPHAN_VOL" -gt 3 ]] && warn "$ORPHAN_VOL verwaiste Docker-Volumes" || ok "Volumes OK ($ORPHAN_VOL verwaist)"
fi

# ─── 6. Datenbank-Integrität ──────────────────────────────────────────────
section "6. SQLite-Datenbank-Integrität"

DB_DIR="$APP_DIR/data"
# Versuche DB-Pfad aus .env zu lesen
if [[ -f "$ENV_FILE" ]]; then
  DB_DATA_DIR=$(grep "^DATA_DIR=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "")
  [[ -n "$DB_DATA_DIR" ]] && DB_DIR="$DB_DATA_DIR"
fi

# Prüfe per docker exec falls Container läuft
if docker inspect tesla-carview-backend &>/dev/null; then
  INTEGRITY=$(docker exec tesla-carview-backend \
    node -e "
const b = await import('./src/db/database.js');
const db = b.getMasterDb();
const r = db.prepare('PRAGMA integrity_check').get();
console.log(JSON.stringify(r));
" 2>/dev/null || echo '{"integrity_check":"skipped"}')
  RESULT=$(echo "$INTEGRITY" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('integrity_check','?'))" 2>/dev/null || echo "?")
  if [[ "$RESULT" == "ok" ]]; then
    ok "master.db: integrity_check = ok"
  elif [[ "$RESULT" == "skipped" ]]; then
    info "DB-Integritätsprüfung übersprungen (Container nicht erreichbar)"
  else
    fail "master.db: integrity_check = $RESULT"
  fi
else
  info "Backend-Container nicht gefunden — DB-Prüfung übersprungen"
fi

# ─── 7. SSL-Zertifikat ────────────────────────────────────────────────────
section "7. SSL-Zertifikat"

# Domain aus .env lesen
if [[ -f "$ENV_FILE" ]]; then
  DOMAIN=$(grep "^DOMAIN=\|^PUBLIC_URL=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '"' | sed 's|https://||')
  if [[ -n "$DOMAIN" && "$DOMAIN" != "YOUR_DOMAIN"* ]]; then
    EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
      | openssl x509 -noout -enddate 2>/dev/null \
      | cut -d= -f2 || echo "")
    if [[ -n "$EXPIRY" ]]; then
      EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null || echo 0)
      NOW_EPOCH=$(date +%s)
      DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
      if [[ "$DAYS_LEFT" -lt 14 ]]; then
        fail "SSL-Zertifikat läuft in ${DAYS_LEFT} Tagen ab! ($DOMAIN)"
      elif [[ "$DAYS_LEFT" -lt 30 ]]; then
        warn "SSL-Zertifikat läuft in ${DAYS_LEFT} Tagen ab ($DOMAIN)"
      else
        ok "SSL-Zertifikat gültig noch ${DAYS_LEFT} Tage ($DOMAIN)"
      fi
    else
      info "SSL-Prüfung für '$DOMAIN' nicht möglich (openssl oder Netz)"
    fi
  else
    info "Keine DOMAIN konfiguriert — SSL-Prüfung übersprungen"
  fi
fi

# ─── Zusammenfassung ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══ Ergebnis ════════════════════════════════════════════════════${RESET}"
if [[ "$FAILURES" -eq 0 && "$WARNINGS" -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}✓ Alles in Ordnung${RESET} — System ist hygienisch und performant."
elif [[ "$FAILURES" -eq 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}⚠ ${WARNINGS} Warnung(en)${RESET} — kein Handlungsbedarf, aber im Auge behalten."
else
  echo -e "  ${RED}${BOLD}✗ ${FAILURES} Fehler, ${WARNINGS} Warnung(en)${RESET} — Maßnahmen erforderlich."
fi
echo ""

# Im CI-Modus: Exit 1 bei Fehlern (blockiert PR-Merge)
[[ "$CI_MODE" -eq 1 && "$FAILURES" -gt 0 ]] && exit 1
exit 0

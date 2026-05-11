#!/usr/bin/env bash
# Installiert die projekt-lokalen Git-Hooks. Einmalig nach dem Klonen
# ausführen:  bash scripts/install-git-hooks.sh
#
# Was passiert:
#   - Setzt core.hooksPath auf scripts/git-hooks/ — alle Hooks im Repo
#     unter Versionskontrolle, kein Symlink-Gefrickel mehr.
#   - Prüft, ob gitleaks im PATH ist; wenn nicht, gibt Hinweise zur
#     Installation (apt / brew / go install) aus. Hook funktioniert auch
#     ohne gitleaks (skipped dann den Scan mit Warnung), aber die volle
#     Schutzwirkung gibt's nur mit installiertem Binary.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo "→ Setze core.hooksPath = scripts/git-hooks"
git config core.hooksPath scripts/git-hooks

chmod +x scripts/git-hooks/*

if ! command -v gitleaks >/dev/null 2>&1; then
  cat <<'EOF'

⚠  gitleaks ist NICHT installiert.

Hook funktioniert trotzdem — überspringt den Scan dann aber mit
Warnung. Für vollen Schutz bitte gitleaks installieren:

  Debian/Ubuntu:  sudo apt install gitleaks
  macOS:          brew install gitleaks
  Manuell (Go):   go install github.com/gitleaks/gitleaks/v8@latest
  Docker:         alias gitleaks='docker run --rm -v $PWD:/scan zricethezav/gitleaks:latest'

EOF
else
  echo "✓ gitleaks gefunden: $(gitleaks version 2>/dev/null | head -1)"
fi

echo "✓ Hooks aktiv. Test mit:  git commit --allow-empty -m 'test hook'"

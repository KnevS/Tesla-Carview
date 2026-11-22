#!/bin/bash
# Als root ausführen (einmalig und nach Änderungen an deploy/server/):
#   sudo bash deploy/server/install-deploy-gate.sh
# Installiert Pförtner und Tesla-Carview-Deploy root-eigen. Die Schlüssel in ~sven/.ssh/authorized_keys
# müssen auf command="/usr/local/lib/deploy-gate/gate <label>" zeigen.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
install -d -o root -g root -m 755 /usr/local/lib/deploy-gate /usr/local/lib/tesla-carview
install -o root -g root -m 755 "$SRC/deploy-gate"          /usr/local/lib/deploy-gate/gate
install -o root -g root -m 755 "$SRC/tesla-carview-deploy" /usr/local/lib/tesla-carview/deploy
echo "installiert: /usr/local/lib/deploy-gate/gate, /usr/local/lib/tesla-carview/deploy"

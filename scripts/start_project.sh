#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

MOBILE_SCRIPT="$SCRIPT_DIR/start-mobile.sh"
BACKEND_SCRIPT="$SCRIPT_DIR/start-backend.sh"

[[ -f "$MOBILE_SCRIPT" ]] || {
  echo "Not found: $MOBILE_SCRIPT" >&2
  exit 1
}

[[ -f "$BACKEND_SCRIPT" ]] || {
  echo "Not found: $BACKEND_SCRIPT" >&2
  exit 1
}

hyprctl dispatch 'hl.dsp.focus({ workspace = "2" })'

kitty --detach \
  --title mobile \
  --directory "$SCRIPT_DIR" \
  bash -c '
    bash "$1"
    echo
    echo "Mobile process stopped. Terminal remains open."
    exec bash -i
  ' _ "$MOBILE_SCRIPT"

kitty --detach \
  --title backend \
  --directory "$SCRIPT_DIR" \
  bash -c '
    echo "LAN IPv4 addresses:"
    ip -brief -4 address show up scope global
    echo
    echo "Starting backend..."
    echo

    bash "$1"

    echo
    echo "Backend process stopped. Terminal remains open."
    exec bash -i
  ' _ "$BACKEND_SCRIPT"

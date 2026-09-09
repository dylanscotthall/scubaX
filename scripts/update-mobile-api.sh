#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LAN_IP="${1:-}"
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}')"
fi

if ! [[ "$LAN_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  printf 'Could not determine a valid LAN IPv4 address.\n' >&2
  printf 'Run: ./scripts/update-mobile-api.sh 192.168.x.x\n' >&2
  exit 1
fi

printf 'EXPO_PUBLIC_API_URL=http://%s:3000\n' "$LAN_IP" > mobile/.env
printf 'mobile/.env now points to http://%s:3000\n' "$LAN_IP"
printf 'Open http://%s:3000/health in the phone browser before starting Metro.\n' "$LAN_IP"

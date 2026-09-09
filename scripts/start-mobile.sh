#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/mobile"

if [ ! -f .env ]; then
  printf 'mobile/.env is missing. Run ./scripts/setup-local.sh first.\n' >&2
  exit 1
fi

cat <<'NOTICE'
Starting Metro for the ScubaXcursions development client.
Install an EAS development build on the phone first; see docs/ARCH_START_TO_FINISH.md.
During the Expo SDK 57 transition, the store version of Expo Go may not support this project.
NOTICE

npm run start:dev

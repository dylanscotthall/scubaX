#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ "${1:-}" != "--yes" ]; then
  cat <<'EOF' >&2
This permanently deletes the local ScubaX PostgreSQL Docker volume and all local data.
Run it only with:

  ./scripts/reset-local.sh --yes
EOF
  exit 1
fi

docker compose down -v
rm -rf backend/dist backend/src/generated/prisma
./scripts/setup-local.sh

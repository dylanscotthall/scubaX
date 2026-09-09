#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/check-arch.sh
node scripts/verify-source.mjs

if [ ! -f backend/.env ]; then
  printf 'FAIL  backend/.env is missing; run ./scripts/setup-local.sh\n' >&2
  exit 1
fi
if [ ! -f mobile/.env ]; then
  printf 'FAIL  mobile/.env is missing; run ./scripts/setup-local.sh\n' >&2
  exit 1
fi

printf 'OK    local environment files exist\n'
docker compose config >/dev/null
printf 'OK    compose.yaml is valid\n'

if docker compose ps --status running --services | grep -qx postgres; then
  docker compose exec -T postgres pg_isready -U scubaxcursions -d scubaxcursions >/dev/null
  printf 'OK    local PostgreSQL is ready\n'
else
  printf 'WARN  local PostgreSQL container is not running\n'
fi

printf 'Doctor checks passed.\n'

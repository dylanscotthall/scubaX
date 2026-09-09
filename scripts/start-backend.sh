#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f backend/.env ]; then
  printf 'backend/.env is missing. Run ./scripts/setup-local.sh first.\n' >&2
  exit 1
fi

if ! docker compose ps --status running --services | grep -qx postgres; then
  printf 'Starting the local PostgreSQL container...\n'
  docker compose up -d postgres
fi

for attempt in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U scubaxcursions -d scubaxcursions >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    docker compose logs postgres
    printf 'PostgreSQL did not become ready.\n' >&2
    exit 1
  fi
  sleep 1
done

cd backend
npm run dev

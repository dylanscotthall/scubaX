#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_HOST_PORT="${SCUBAX_DB_PORT:-5433}"
export SCUBAX_DB_PORT="$DB_HOST_PORT"
LOCAL_DATABASE_URL="postgresql://scubaxcursions:scubax_local_dev_password@localhost:${DB_HOST_PORT}/scubaxcursions?schema=public"

./scripts/check-arch.sh
node scripts/verify-source.mjs

if [ ! -f backend/.env ]; then
  JWT_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("hex"))')"
  cat > backend/.env <<ENV
DATABASE_URL=$LOCAL_DATABASE_URL
JWT_SECRET=$JWT_SECRET
DEFAULT_ORGANIZATION_ID=00000000-0000-0000-0000-000000000001
ORGANIZATION_NAME=ScubaXcursions
NODE_ENV=development
PORT=3000
CORS_ORIGINS=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_FIRST_NAME=Admin
SEED_ADMIN_LAST_NAME=User
SEED_ADMIN_RESET_PASSWORD=false
DEV_ADMIN_EMAIL=admin@scubaxcursion.local
DEV_ADMIN_PASSWORD=LocalAdmin123!
DEV_CLIENT_EMAIL=client@scubaxcursion.local
DEV_CLIENT_PASSWORD=LocalClient123!
ENV
  chmod 600 backend/.env
  printf 'Created backend/.env with a new JWT secret and PostgreSQL port %s.\n' "$DB_HOST_PORT"
else
  if grep -Eq '^DATABASE_URL=postgresql://scubaxcursions:scubax_local_dev_password@(localhost|127\.0\.0\.1):[0-9]+/scubaxcursions\?schema=public$' backend/.env; then
    awk -v url="$LOCAL_DATABASE_URL" '
      /^DATABASE_URL=/ { print "DATABASE_URL=" url; next }
      { print }
    ' backend/.env > backend/.env.tmp
    mv backend/.env.tmp backend/.env
    chmod 600 backend/.env
    printf 'Updated the local DATABASE_URL to PostgreSQL port %s.\n' "$DB_HOST_PORT"
  else
    printf 'Keeping the custom DATABASE_URL already present in backend/.env.\n'
  fi
fi

printf 'Starting PostgreSQL 17 in Docker on host port %s...\n' "$DB_HOST_PORT"
docker compose up -d postgres

for attempt in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U scubaxcursions -d scubaxcursions >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    docker compose logs postgres
    printf 'PostgreSQL did not become ready.\n' >&2
    exit 1
  fi
  sleep 2
done
printf 'PostgreSQL is ready. No native Arch PostgreSQL package is required.\n'

printf 'Installing and verifying the backend...\n'
(
  cd backend
  npm ci --no-audit --no-fund
  npm run prisma:generate
  npm run db:deploy
  npm run db:seed
  npm run db:seed:dev
  npm run typecheck
  npm run build
)

printf 'Starting the compiled backend for an automated API smoke test...\n'
BACKEND_LOG="$(mktemp)"
BACKEND_PID=""
cleanup_backend() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$BACKEND_LOG"
}
trap cleanup_backend EXIT

(
  cd backend
  exec node dist/index.js
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

for attempt in $(seq 1 45); do
  if curl --fail --silent http://127.0.0.1:3000/health >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    cat "$BACKEND_LOG" >&2
    printf 'The compiled backend exited before the health check passed.\n' >&2
    exit 1
  fi
  if [ "$attempt" -eq 45 ]; then
    cat "$BACKEND_LOG" >&2
    printf 'The compiled backend did not become healthy.\n' >&2
    exit 1
  fi
  sleep 1
done

(
  cd backend
  npm run smoke
  npm run test:equipment-flow
)
cleanup_backend
trap - EXIT
printf 'Backend runtime and structured equipment-flow tests passed.\n'

./scripts/update-mobile-api.sh

printf 'Installing and verifying the mobile app...\n'
(
  cd mobile
  npm ci --no-audit --no-fund
  npm run typecheck
  npx expo config --type public >/dev/null
  npx expo install --check
)

node scripts/verify-source.mjs

cat <<DONE

Local setup completed successfully.

PostgreSQL host port: $DB_HOST_PORT
API port: 3000

Everyday startup:

  Terminal 1:
    ./scripts/start-backend.sh

  Terminal 2, optional repeatable API check:
    cd backend
    npm run smoke

  Terminal 3, after installing an EAS development build on the phone:
    ./scripts/start-mobile.sh

Development accounts:
  Admin:  admin@scubaxcursion.local / LocalAdmin123!
  Client: client@scubaxcursion.local / LocalClient123!

Before opening the app, load the /health URL printed by update-mobile-api.sh in the phone browser.
The phone development-build procedure is in docs/ARCH_START_TO_FINISH.md.
DONE

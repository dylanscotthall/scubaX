#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_HOST_PORT="${SCUBAX_DB_PORT:-5433}"
failures=0
ok() { printf 'OK    %s\n' "$1"; }
warn() { printf 'WARN  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }

if [ -f /etc/arch-release ]; then
  ok "Arch Linux detected"
else
  warn "This package is documented for Arch Linux; generic Linux may also work"
fi

for command_name in git node npm docker curl python unzip ip ss; do
  if command -v "$command_name" >/dev/null 2>&1; then
    ok "$command_name is installed"
  else
    fail "$command_name is missing"
  fi
done

if command -v node >/dev/null 2>&1; then
  if node -e 'const major = Number(process.versions.node.split(".")[0]); process.exit(major === 24 ? 0 : 1)'; then
    ok "Node $(node --version) is supported"
  else
    fail "Node 24 LTS is required for this project; found $(node --version)"
  fi
fi

if command -v pacman >/dev/null 2>&1 && pacman -Q podman-docker >/dev/null 2>&1; then
  fail "podman-docker is installed; this project is tested with Docker Engine, not the Podman Docker shim"
fi

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose is available"
  else
    fail "docker compose is missing"
  fi

  if docker info >/dev/null 2>&1; then
    ok "Docker daemon is running and accessible without sudo"
  else
    fail "Docker daemon is unavailable to this user"
  fi
fi

if command -v ss >/dev/null 2>&1 && ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${DB_HOST_PORT}$"; then
  if SCUBAX_DB_PORT="$DB_HOST_PORT" docker compose ps --status running --services 2>/dev/null | grep -qx postgres; then
    ok "Port ${DB_HOST_PORT} is in use by this project's PostgreSQL container"
  else
    fail "Port ${DB_HOST_PORT} is already in use by another service"
  fi
else
  ok "Port ${DB_HOST_PORT} is available for the ScubaX PostgreSQL container"
fi

if command -v ss >/dev/null 2>&1 && ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq '(^|:)3000$'; then
  fail "Port 3000 is already in use; stop the old backend before setup"
else
  ok "Port 3000 is available"
fi

if command -v adb >/dev/null 2>&1; then
  ok "adb is installed for Android USB debugging"
else
  warn "adb is optional; install android-tools for Android USB debugging"
fi

printf '\n'
if [ "$failures" -gt 0 ]; then
  cat <<'HELP'
Install the required Arch packages:

  sudo pacman -Syu
  sudo pacman -S --needed git base-devel python curl unzip iproute2 docker docker-compose nvm

Load NVM and select the project runtime:

  source /usr/share/nvm/init-nvm.sh
  nvm install 24.19.0
  nvm use 24.19.0

If podman-docker is installed, remove the compatibility shim first:

  sudo pacman -Rns podman-docker
  sudo pacman -S --needed docker docker-compose

Enable Docker and allow your user to access it:

  sudo systemctl enable --now docker.service
  sudo usermod -aG docker "$USER"

Log out completely and log back in after changing Docker group membership.
Do not run npm or any project script with sudo.

ScubaX uses host port 5433 by default so an existing PostgreSQL service may keep port 5432.
To choose another ScubaX database port, run for example:

  SCUBAX_DB_PORT=55432 ./scripts/setup-local.sh

Optional Android USB tools:

  sudo pacman -S --needed android-tools android-udev
HELP
  exit 1
fi

printf 'Arch prerequisite check passed.\n'

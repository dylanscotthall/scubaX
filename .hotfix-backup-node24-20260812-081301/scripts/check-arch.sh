#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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
  if node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major === 22 && minor >= 12 ? 0 : 1)'; then
    ok "Node $(node --version) is supported"
  else
    fail "Node 22.12 or newer within the Node 22 line is required; found $(node --version)"
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

if command -v ss >/dev/null 2>&1 && ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq '(^|:)5432$'; then
  if docker compose ps --status running --services 2>/dev/null | grep -qx postgres; then
    ok "Port 5432 is in use by this project's PostgreSQL container"
  else
    fail "Port 5432 is already in use by another service"
  fi
else
  ok "Port 5432 is available"
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
  sudo pacman -S --needed git base-devel python curl unzip iproute2 docker docker-compose nodejs-lts-jod npm

If podman-docker is installed, remove the compatibility shim first:

  sudo pacman -Rns podman-docker
  sudo pacman -S --needed docker docker-compose

Enable Docker and allow your user to access it:

  sudo systemctl enable --now docker.service
  sudo usermod -aG docker "$USER"

Log out completely and log back in after changing Docker group membership.
Do not run npm or any project script with sudo.

Optional Android USB tools:

  sudo pacman -S --needed android-tools android-udev
HELP
  exit 1
fi

printf 'Arch prerequisite check passed.\n'

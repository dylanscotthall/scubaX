# Start Here: ScubaXcursions on Arch Linux

Use this file first. It is the only installation path for this package.

## What you are installing

- Express and TypeScript backend.
- Prisma 7 with generated client source in `backend/src/generated/prisma`.
- PostgreSQL 17 in Docker.
- Expo React Native mobile application.
- Base and local development seed data.
- Automated API and structured-equipment flow tests.

Do not install the Arch `postgresql` package for this project. PostgreSQL runs in Docker.

## 1. Back up the old project

From the directory that contains the old project:

```bash
mv scubaX scubaX-old-broken-backup
```

Use another backup name when that name already exists. Do not copy files from the old project into this one.

## 2. Extract this package

```bash
unzip ScubaXcursions-Arch-v0.3.0-FINAL.zip
cd ScubaXcursions-Arch-v0.3.0
```

Do not copy old `node_modules`, `.env`, generated Prisma files, `dist`, `.expo`, or migrations into this directory.

## 3. Install the Arch dependencies

```bash
sudo pacman -Syu
sudo pacman -S --needed \
  git \
  base-devel \
  python \
  curl \
  unzip \
  iproute2 \
  docker \
  docker-compose \
  nodejs-lts-jod \
  npm
```

Optional Android USB tools:

```bash
sudo pacman -S --needed android-tools android-udev
```

When `podman-docker` is installed, remove it before using Docker Engine:

```bash
pacman -Q podman-docker 2>/dev/null && sudo pacman -Rns podman-docker
sudo pacman -S --needed docker docker-compose
```

## 4. Enable Docker for your account

```bash
sudo systemctl enable --now docker.service
sudo usermod -aG docker "$USER"
```

Log out of the Arch desktop session completely, then log back in. Do not merely close the terminal.

Verify:

```bash
docker info
docker compose version
node --version
npm --version
```

Node must be version 22.12.0 or newer within the Node 22 line. Do not run project commands with `sudo`.

## 5. Run the complete setup

From the extracted repository root:

```bash
chmod +x scripts/*.sh
./scripts/setup-local.sh
```

This one command:

1. Validates Arch, Node, Docker, ports, source files and lockfiles.
2. Creates a fresh backend `.env` and JWT secret.
3. Starts PostgreSQL 17 in Docker.
4. Installs exact locked backend dependencies.
5. Generates Prisma Client explicitly.
6. Applies the committed database migration.
7. Seeds base and development data.
8. Typechecks and builds the backend.
9. Starts the compiled backend temporarily.
10. Runs live API and structured-equipment write/read/edit tests.
11. Writes the laptop LAN API address to `mobile/.env`.
12. Installs exact locked mobile dependencies.
13. Typechecks and checks the Expo project.

Do not continue when this command reports an error. Fix the first error shown and rerun the same command.

## 6. Start the backend each day

Terminal 1, from the repository root:

```bash
./scripts/start-backend.sh
```

Expected output includes:

```text
ScubaXcursions backend listening on 0.0.0.0:3000
```

Terminal 2, verify the API:

```bash
cd backend
npm run smoke
```

Development accounts:

```text
Admin:  admin@scubaxcursion.local / LocalAdmin123!
Client: client@scubaxcursion.local / LocalClient123!
```

## 7. Verify phone-to-laptop networking

Keep the backend running. Check the generated URL:

```bash
cat mobile/.env
```

It should contain the laptop's LAN address, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000
```

On the phone, open this URL in a browser:

```text
http://YOUR_LAPTOP_IP:3000/health
```

Do not proceed until the phone receives the JSON health response.

When the IP is wrong:

```bash
ip -4 route get 1.1.1.1
./scripts/update-mobile-api.sh YOUR_LAPTOP_IP
```

The laptop and phone must be on the same Wi-Fi. A VPN, firewall, guest Wi-Fi, or router client isolation can block local access.

## 8. Install the phone development build

From the repository root:

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

Android:

```bash
npx eas-cli@latest build --platform android --profile development
```

iPhone:

```bash
npx eas-cli@latest build --platform ios --profile development
```

Install the generated development build on the phone. EAS performs native builds in the cloud, so Arch can build for Android and iOS. Local iOS compilation still requires macOS and Xcode.

## 9. Start the mobile application each day

Terminal 3, from the repository root:

```bash
./scripts/start-mobile.sh
```

Open the installed ScubaXcursions development build on the phone and connect it to the Metro server.

When the phone cannot reach Metro over the LAN:

```bash
cd mobile
npm run start:dev:tunnel
```

A Metro tunnel does not expose the local backend. The phone must still reach the URL in `mobile/.env`; Railway staging is the clean fallback for restrictive networks.

## 10. Deploy Railway only after local setup passes

Follow:

```text
docs/RAILWAY_STAGING.md
```

Use local Docker PostgreSQL for normal development and Railway as staging first. Do not treat staging as production until the mobile booking and equipment-request flow has been tested against its public HTTPS URL.

## Reset disposable local data

This destroys only this project's Docker database volume and rebuilds it:

```bash
./scripts/reset-local.sh --yes
```

## Diagnostics

```bash
./scripts/doctor.sh
```

## Full detail

The expanded explanations and troubleshooting steps are in:

```text
docs/ARCH_START_TO_FINISH.md
docs/RAILWAY_STAGING.md
docs/PROJECT_STATUS.md
```

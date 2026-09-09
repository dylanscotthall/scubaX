# ScubaXcursions on Arch Linux: Start to Finish

This guide is the only local setup path for version 0.3.0. Do not combine it with the old v0.2 archive, old patches, copied `node_modules` directories, or an old `.env` file.

## 1. What failed in the previous package

The previous package installed `@prisma/client` but did not reliably run `prisma generate` before the backend started. That left this required generated folder missing:

```text
node_modules/.prisma/client
```

The resulting error was:

```text
Cannot find module '.prisma/client/default'
```

Version 0.3.0 does not import Prisma Client from that fragile implicit path. Its Prisma generator writes generated source to:

```text
backend/src/generated/prisma
```

The generated folder is intentionally not committed. It is recreated automatically by:

- `npm ci` through the backend `postinstall` script.
- `npm run dev` through the backend `predev` script.
- `npm run build`.
- `npm run typecheck`.
- `npm run prisma:generate`.
- The complete local setup script.

The setup script also starts the compiled backend and runs real HTTP requests against it. A missing Prisma client therefore makes setup fail immediately instead of appearing successful.

## 2. What this package contains

The repository contains:

```text
backend/        Express, TypeScript, Prisma and PostgreSQL API
mobile/         Expo React Native client
scripts/        Arch setup, startup, reset and diagnostic scripts
docs/           Setup, Railway and project-status documentation
compose.yaml    Local PostgreSQL 17 container
```

Local PostgreSQL runs in Docker. You do not need to install the Arch `postgresql` package.

## 3. Remove the old working copy from the setup path

Keep the old folder only as a backup. Do not install the new files over it.

From the directory containing your current `scubaX` folder:

```bash
mv scubaX scubaX-broken-backup
```

Extract the new archive:

```bash
unzip ScubaXcursions-Arch-v0.3.0-FINAL.zip
cd ScubaXcursions-Arch-v0.3.0
```

Do not copy these from the old folder:

```text
backend/node_modules
mobile/node_modules
backend/.env
mobile/.env
backend/src/generated/prisma
backend/dist
mobile/.expo
```

The new archive already contains the complete schema and initial migration. Do not restore migration files from the old project.

## 4. Install the Arch Linux dependencies

Update Arch first:

```bash
sudo pacman -Syu
```

Install the required packages:

```bash
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

### Podman conflict

Check for the Docker compatibility shim:

```bash
pacman -Q podman-docker 2>/dev/null
```

No output means there is no conflict. When `podman-docker` is installed, remove it and install Docker Engine:

```bash
sudo pacman -Rns podman-docker
sudo pacman -S --needed docker docker-compose
```

This project uses Docker Engine and the `docker compose` plugin directly.

## 5. Enable Docker

Start Docker now and at boot:

```bash
sudo systemctl enable --now docker.service
```

Add your user to the Docker group:

```bash
sudo usermod -aG docker "$USER"
```

Log out of the desktop session completely and log back in. Opening a new terminal alone is often not enough.

Verify access without `sudo`:

```bash
docker info
docker compose version
```

Do not run `npm`, `npx`, or any project script with `sudo`. Doing so creates root-owned files in the project.

Docker group membership effectively gives the user root-equivalent control over Docker. Only add trusted local users.

## 6. Verify Node

The project requires Node 22.12.0 or newer within the Node 22 release line. The package includes:

```text
.nvmrc = 22.23.2
```

Check the installed version:

```bash
node --version
npm --version
```

A valid Node result begins with `v22.` and is at least `v22.12.0`.

When Arch's installed Node version is not compatible, use NVM instead of mixing package versions:

```bash
sudo pacman -S --needed nvm
source /usr/share/nvm/init-nvm.sh
nvm install 22.23.2
nvm use 22.23.2
nvm alias default 22.23.2
```

For Bash, load NVM in future shells:

```bash
grep -qxF 'source /usr/share/nvm/init-nvm.sh' ~/.bashrc 2>/dev/null || \
  echo 'source /usr/share/nvm/init-nvm.sh' >> ~/.bashrc
source ~/.bashrc
```

For Zsh, use `~/.zshrc` instead of `~/.bashrc`.

## 7. Check ports before setup

The local database needs port 5432 and the API needs port 3000.

```bash
ss -ltnp | grep -E ':(3000|5432)\b'
```

No output is ideal before the first setup.

When a native PostgreSQL service occupies port 5432 and you do not need it:

```bash
sudo systemctl stop postgresql.service
```

Do not remove or stop a database that contains data you care about without making a backup.

When an old Node backend occupies port 3000, stop that process before continuing.

## 8. Run the one-time setup

From the repository root:

```bash
chmod +x scripts/*.sh
./scripts/setup-local.sh
```

Do not prefix that command with `sudo`.

The script performs these steps in order:

1. Confirms Arch, Node, npm, Git, Docker, networking tools and free ports.
2. Runs source and package-lock consistency checks.
3. Creates `backend/.env` with a new random JWT secret when it does not exist.
4. Starts PostgreSQL 17 in Docker.
5. Waits until PostgreSQL reports ready.
6. Runs a clean backend `npm ci`.
7. Generates Prisma Client into `backend/src/generated/prisma`.
8. Applies the committed database migration.
9. Runs the production-safe base seed.
10. Runs the local-only development seed.
11. Typechecks and compiles the backend.
12. Starts the compiled API temporarily.
13. Runs a live, read-only API smoke test against the seeded database.
14. Runs a live structured equipment flow: create booking, store details, edit, verify staff manifest, clear request and cancel the development booking.
15. Stops the temporary API.
16. Detects the laptop LAN address and writes `mobile/.env`.
17. Runs a clean mobile `npm ci`.
18. Typechecks the mobile application.
19. Validates Expo configuration and dependency compatibility.

Setup is complete only when the final line reports success. When any command fails, stop and fix that exact failure. Do not continue manually past it.

### Local development accounts

```text
Admin
Email:    admin@scubaxcursion.local
Password: LocalAdmin123!

Client
Email:    client@scubaxcursion.local
Password: LocalClient123!
```

These accounts are created only by the local development seed. They are not production credentials.

## 9. Start the backend each day

Open Terminal 1 at the repository root:

```bash
./scripts/start-backend.sh
```

This starts the database container when necessary, waits for PostgreSQL, regenerates Prisma Client, and starts the development API.

Expected final output includes:

```text
ScubaXcursions backend listening on 0.0.0.0:3000
```

In Terminal 2, verify the running system:

```bash
cd backend
npm run smoke
```

The smoke test verifies:

- API health.
- Client and admin login.
- Safe user/profile responses.
- Equipment catalogue.
- Client equipment profile.
- Trips, launch sites, courses and conditions.
- Booking and waitlist response shape.
- Staff equipment manifest access.

It does not create or change data.

The setup script also runs the separate write-flow test once. To repeat it while
the backend is running:

```bash
cd backend
npm run test:equipment-flow
```

That test creates one development booking, validates the structured equipment
contract and staff manifest, clears the request, then leaves the booking
cancelled so it does not occupy a seat.

You can also check health directly:

```bash
curl http://127.0.0.1:3000/health
```

## 10. Make the backend reachable from the phone

The setup script writes the detected LAN address to:

```text
mobile/.env
```

View it:

```bash
cat mobile/.env
```

It should resemble:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000
```

When the address is wrong, find the laptop's current LAN address:

```bash
ip -4 route get 1.1.1.1
```

Then set it explicitly:

```bash
./scripts/update-mobile-api.sh 192.168.1.50
```

Replace the example with the actual address.

Keep the laptop and phone on the same Wi-Fi. Turn off a VPN temporarily when it blocks local traffic.

Before opening the app, use the phone browser to open:

```text
http://YOUR_LAPTOP_IP:3000/health
```

The phone must receive the JSON health response. When it cannot, fix networking before debugging React Native.

### Firewall examples

Only add rules when a firewall is enabled.

UFW:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8081/tcp
```

firewalld:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --reload
```

Port 3000 is the API. Expo normally uses 8081 but prints the actual Metro port if it chooses another one.

Some Wi-Fi networks enable client isolation, which prevents devices from reaching each other. Railway staging avoids that problem by giving the phone a public HTTPS API.

## 11. Install the mobile development build

The recommended phone workflow is an Expo development build, not the public Expo Go store build. Expo SDK 57 may be newer than the Expo Go version currently approved in an app store.

From the repository root:

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

`eas init` links the app to a project in your Expo account and writes the correct EAS project identifier. Do not copy an EAS project ID from another project.

### Android development build

```bash
npx eas-cli@latest build \
  --platform android \
  --profile development
```

Open the build link on the Android phone and install the resulting internal development build. Android may require permission to install an app from the browser.

### iPhone development build

```bash
npx eas-cli@latest build \
  --platform ios \
  --profile development
```

Arch Linux cannot compile a native iOS app locally because Apple's iOS toolchain requires macOS and Xcode. EAS performs the build in the cloud. A physical iPhone development build normally requires the appropriate Apple Developer account and device registration.

## 12. Start the mobile app each day

Keep the backend running in Terminal 1.

At the repository root, open another terminal:

```bash
./scripts/start-mobile.sh
```

This starts Metro for the installed development client. Open the ScubaXcursions development build on the phone and connect to the displayed development server.

When Metro cannot be reached over the LAN:

```bash
cd mobile
npm run start:dev:tunnel
```

A Metro tunnel does not make a local API public. The phone must still reach the URL in `mobile/.env`. Use Railway staging when the phone cannot reach the laptop API.

### Optional Expo Go fallback

When you have an Expo Go build compatible with SDK 57:

```bash
cd mobile
npm run start:go
```

Use the development build as the normal path because it matches the project's native dependency model and future development needs.

## 13. Normal shutdown

Stop backend and Metro with `Ctrl+C` in their terminals.

Leave PostgreSQL available for the next session, or stop it without deleting data:

```bash
docker compose stop
```

Start it again through `./scripts/start-backend.sh`.

## 14. Completely reset disposable local data

This deletes the entire ScubaX local PostgreSQL Docker volume, recreates the database, reapplies the migration and reruns all seeds and checks:

```bash
./scripts/reset-local.sh --yes
```

Do not use it once local data matters.

## 15. Run diagnostics

```bash
./scripts/doctor.sh
```

The doctor checks Arch dependencies, Docker access, source consistency, environment files, Compose configuration and PostgreSQL readiness.

## 16. Future Prisma schema changes

Never edit the committed initial migration after another environment has used it.

For a new schema change:

```bash
cd backend
npm run db:migrate -- --name describe_the_change
npm run prisma:generate
npm run typecheck
npm run build
```

Commit both:

```text
backend/prisma/schema.prisma
backend/prisma/migrations/<new_timestamp>_describe_the_change/migration.sql
```

Use `prisma migrate dev` only against a development database. Railway runs `prisma migrate deploy`.

## 17. Common failures

### `Cannot find module '.prisma/client/default'`

That exact path identifies the old package or old dependencies. Confirm that the current backend schema contains:

```prisma
provider = "prisma-client"
output   = "../src/generated/prisma"
```

Then clean and regenerate:

```bash
rm -rf backend/node_modules backend/src/generated/prisma backend/dist
cd backend
npm ci
npm run prisma:generate
npm run typecheck
```

The current source imports:

```text
backend/src/generated/prisma/client
```

It does not import Prisma Client from `@prisma/client` at runtime.

### `EAI_AGAIN` or npm registry DNS errors

Test network and DNS:

```bash
curl -I https://registry.npmjs.org/
```

Fix the network or DNS issue, then rerun `./scripts/setup-local.sh`. Do not replace `npm ci` with random dependency upgrades.

### Docker permission denied

Confirm the service is running:

```bash
sudo systemctl enable --now docker.service
```

Confirm membership:

```bash
groups "$USER"
```

When `docker` is missing from the output, rerun:

```bash
sudo usermod -aG docker "$USER"
```

Then log out completely and log back in.

### Port 5432 is occupied

```bash
ss -ltnp | grep ':5432'
```

Stop an unneeded native PostgreSQL service:

```bash
sudo systemctl stop postgresql.service
```

### Port 3000 is occupied

```bash
ss -ltnp | grep ':3000'
```

Stop the old backend process. Do not run two copies on the same port.

### Phone cannot reach the API

1. Keep `./scripts/start-backend.sh` running.
2. Confirm the phone and laptop are on the same Wi-Fi.
3. Confirm `mobile/.env` contains the current LAN address.
4. Open `http://YOUR_IP:3000/health` in the phone browser.
5. Check firewall, VPN and Wi-Fi client isolation.
6. Use Railway staging when local routing remains blocked.

## 18. Continue to Railway

After local setup and `npm run smoke` pass, follow:

```text
docs/RAILWAY_STAGING.md
```

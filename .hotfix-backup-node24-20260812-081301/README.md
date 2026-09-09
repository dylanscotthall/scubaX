# ScubaXcursions v0.3.0

Expo React Native dive-centre application with an Express, Prisma and PostgreSQL backend.

This package is rebuilt for one clean Arch Linux workflow. Do not layer it over the older v0.2 package.

## Local requirements

- Arch Linux.
- Node 22.12.0 or newer within Node 22.
- Docker Engine and Docker Compose.
- npm, Git, curl, Python, unzip and `iproute2` networking tools.

PostgreSQL runs in Docker. A native Arch PostgreSQL installation is not required.

## Start here

Read `START_HERE_ARCH.md` first. It is the short, unambiguous install path.

## One-time setup

```bash
chmod +x scripts/*.sh
./scripts/setup-local.sh
```

The setup command installs dependencies, generates Prisma Client, applies the committed migration, seeds the database, compiles the backend, starts it temporarily, runs live read and structured-equipment write tests, configures the mobile API URL and typechecks the Expo app.

## Daily startup

Terminal 1:

```bash
./scripts/start-backend.sh
```

Terminal 2, optional API verification:

```bash
cd backend
npm run smoke
```

Terminal 3, after installing an EAS development build on the phone:

```bash
./scripts/start-mobile.sh
```

## Local accounts

```text
Admin:  admin@scubaxcursion.local / LocalAdmin123!
Client: client@scubaxcursion.local / LocalClient123!
```

These accounts are local development data only.

## Documentation

- `docs/ARCH_START_TO_FINISH.md` - exact Arch installation, startup, phone and troubleshooting steps.
- `docs/RAILWAY_STAGING.md` - Railway staging, production and EAS environment setup.
- `docs/PROJECT_STATUS.md` - implemented features, limitations and next work.
- `docs/PLANNING.md` - current architecture and product decisions.

## Repository layout

```text
backend/       Express, Prisma and PostgreSQL API
mobile/        Expo React Native application
scripts/       Setup, startup, reset, doctor and source checks
docs/          Complete operating documentation
compose.yaml   Local PostgreSQL 17
```

## Verification boundary

The source package includes deterministic lockfiles, a committed initial migration, static source checks and a live API smoke-test script. The final runtime proof occurs on the target Arch laptop because this build environment cannot access npm or run Docker. `./scripts/setup-local.sh` fails on the first real install, database, compilation, API or mobile verification error.

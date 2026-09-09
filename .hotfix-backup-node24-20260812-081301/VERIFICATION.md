# Verification Report

Package: ScubaXcursions Arch Linux v0.3.0
Date: 2026-08-11

## Passed in the build environment

- Required project-file inventory.
- JSON syntax for package, lock, Expo, EAS and Railway files.
- Exact top-level dependency agreement between both `package.json` files and both lockfiles.
- Offline npm lock-resolution dry runs for backend and mobile.
- JavaScript syntax checks for setup verification and API test scripts.
- Bash syntax checks for every shell script.
- TypeScript/TSX syntax transpilation for 48 source files.
- Relative source-import resolution checks.
- Removal of old mock fallback, `sizeNote`, `quantityAvailable` and implicit `node_modules/.prisma` runtime imports.
- Presence of the explicit Prisma generator output path.
- Complete schema-to-initial-migration table and scalar-column comparison across 24 Prisma models.
- Duplicate migration-column detection.
- Presence of structured equipment models, enums, profile relation, request relation and launch-site model.
- Package scan confirming no `.env`, `node_modules`, `dist`, `.expo` or generated Prisma client is shipped.

## Automatically executed on the Arch laptop by `./scripts/setup-local.sh`

These checks need dependency downloads, Docker and PostgreSQL and therefore run on the target machine:

1. Arch dependency and Docker access check.
2. Backend `npm ci`.
3. Prisma Client generation.
4. PostgreSQL migration deployment.
5. Base and development seeds.
6. Backend dependency-aware TypeScript typecheck.
7. Backend production compilation.
8. Compiled backend startup and `/health` database check.
9. Live read-only API smoke test.
10. Live structured equipment create/read/edit/manifest/clear/cancel flow.
11. Mobile `npm ci`.
12. Mobile dependency-aware TypeScript typecheck.
13. Expo public-config validation.
14. Expo dependency compatibility check.

The setup script uses `set -euo pipefail` and exits on the first failed command. It does not print a success result after a failed Prisma generation, migration, build or live API test.

## Not claimed as already executed

- A complete online dependency install in this build container. The npm registry was unavailable here and the offline cache did not contain every tarball.
- Docker/PostgreSQL runtime execution in this build container.
- A physical Android or iPhone development build.
- Railway deployment in the user's account.

The project is therefore source-verified and contains automated target-machine runtime verification, but final runtime proof is the successful completion of `./scripts/setup-local.sh` on the Arch laptop.

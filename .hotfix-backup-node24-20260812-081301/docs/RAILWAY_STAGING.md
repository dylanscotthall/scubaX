# Railway Staging and Production

Deploy Railway only after the complete local setup and backend smoke test pass. Keep local Docker PostgreSQL for daily schema work and fast resets.

## 1. Commit the clean project

From the repository root:

```bash
git init
git branch -M main
git add .
git commit -m "feat: establish ScubaXcursions v0.3.0"
```

Create a private GitHub repository and push the `main` branch. Do not commit `.env`, `node_modules`, `dist`, `.expo`, or generated Prisma output. The included `.gitignore` excludes them.

## 2. Create Railway staging

In Railway:

1. Create a new project.
2. Create a PostgreSQL service.
3. Create an application service from the GitHub repository.
4. Set the application service root directory to:

```text
/backend
```

5. Set the Railway configuration file path to:

```text
/backend/railway.json
```

The config path is repository-root-relative even though the service root is `/backend`.

Optional watch path for the backend service:

```text
/backend/**
```

## 3. Set staging variables

Generate a staging-only JWT secret locally:

```bash
openssl rand -hex 48
```

Set these variables on the Railway backend service:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=REPLACE_WITH_THE_NEW_STAGING_SECRET
DEFAULT_ORGANIZATION_ID=00000000-0000-0000-0000-000000000001
ORGANIZATION_NAME=ScubaXcursions
NODE_ENV=production
CORS_ORIGINS=
SEED_ADMIN_EMAIL=your-admin-email@example.com
SEED_ADMIN_PASSWORD=REPLACE_WITH_A_STRONG_FIRST_PASSWORD
SEED_ADMIN_FIRST_NAME=YourFirstName
SEED_ADMIN_LAST_NAME=YourLastName
SEED_ADMIN_RESET_PASSWORD=false
```

Do not set `PORT`. Railway supplies it.

Do not set any `DEV_ADMIN_*` or `DEV_CLIENT_*` variables in Railway. The development seed is not run by the Railway release command.

The first deployment needs both `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to create the owner account. The seed does not overwrite an existing account password unless `SEED_ADMIN_RESET_PASSWORD=true`.

After the first successful login, remove `SEED_ADMIN_PASSWORD` from Railway or replace the seed-created password through a future secure password-management flow. Never set `SEED_ADMIN_RESET_PASSWORD=true` during routine deployments.

## 4. What Railway runs

`backend/railway.json` defines:

```text
Build command:       npm run build
Pre-deploy command:  npm run db:release
Start command:       npm run start
Health check:        /health
```

`npm run db:release` runs:

```bash
npm run db:deploy
npm run db:seed
```

That applies committed migrations and runs only the production-safe, idempotent base seed. It never runs `npm run db:seed:dev`.

The backend listens on Railway's injected port and on `0.0.0.0`.

## 5. Verify staging

Generate a public Railway domain for the backend service.

Open:

```text
https://YOUR-STAGING-DOMAIN/health
```

Expected response:

```json
{
  "status": "ok"
}
```

Run the smoke test against staging from the local backend directory:

```bash
cd backend
SMOKE_API_URL=https://YOUR-STAGING-DOMAIN \
SMOKE_CLIENT_EMAIL=YOUR_TEST_CLIENT_EMAIL \
SMOKE_CLIENT_PASSWORD=YOUR_TEST_CLIENT_PASSWORD \
SMOKE_ADMIN_EMAIL=YOUR_ADMIN_EMAIL \
SMOKE_ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD \
npm run smoke
```

The production-safe seed does not create a client test account. Register a disposable staging client through the app or API before running the complete staging smoke test.

## 6. Point the local mobile app at staging

Replace `mobile/.env` with:

```env
EXPO_PUBLIC_API_URL=https://YOUR-STAGING-DOMAIN
```

Restart Metro after changing the value:

```bash
./scripts/start-mobile.sh
```

The API URL is public configuration bundled into the app. It is not a secret. Never put database credentials, JWT secrets, admin passwords, or private API keys in an `EXPO_PUBLIC_` variable.

## 7. Set EAS environment values

From `mobile/`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Set the staging API URL for development and preview builds:

```bash
npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_API_URL \
  --value https://YOUR-STAGING-DOMAIN \
  --environment development \
  --visibility plaintext

npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_API_URL \
  --value https://YOUR-STAGING-DOMAIN \
  --environment preview \
  --visibility plaintext
```

Build:

```bash
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform android --profile preview
```

Use `--platform ios` for iOS cloud builds.

## 8. Create a separate production environment

Do not reuse the staging database for production.

Create a Railway production environment with:

- A separate PostgreSQL database.
- A separate JWT secret.
- A production admin account.
- A production domain.
- Separate EAS production environment values.

Set the production mobile URL:

```bash
npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_API_URL \
  --value https://YOUR-PRODUCTION-DOMAIN \
  --environment production \
  --visibility plaintext
```

Build production:

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

## 9. Deployment rules

- Create migrations locally with `prisma migrate dev`.
- Commit every migration directory.
- Let Railway use `prisma migrate deploy`.
- Never run `prisma migrate reset` against staging or production.
- Never run the development seed against staging or production.
- Never expose PostgreSQL directly to the mobile application.
- Review Railway deployment logs after each migration.
- Back up production data before destructive schema changes.
- Add monitoring, error reporting and a tested database backup policy before a public launch.

## 10. Recommended environment flow

```text
Local Docker database
  -> Railway staging database
  -> Railway production database
```

Develop and create migrations locally. Verify on staging with real HTTPS and a physical phone. Promote only tested code and committed migrations to production.

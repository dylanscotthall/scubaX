import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` does not connect to PostgreSQL, but Prisma still loads this
// configuration file. A local fallback lets npm postinstall generate the client
// before backend/.env exists. Migrate, seed and the running API still require the
// real DATABASE_URL supplied by backend/.env or Railway.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://scubaxcursions:scubax_local_dev_password@localhost:5432/scubaxcursions?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});

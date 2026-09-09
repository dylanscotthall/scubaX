import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config";

// Use one Prisma client during local hot reload so ts-node-dev does not create a
// new PostgreSQL connection pool every time it reloads the source tree.
declare global {
  // eslint-disable-next-line no-var
  var __scubaxPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = global.__scubaxPrisma ?? createPrismaClient();

if (config.nodeEnv !== "production") {
  global.__scubaxPrisma = prisma;
}

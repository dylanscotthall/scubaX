import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must contain at least 32 characters"),
  DEFAULT_ORGANIZATION_ID: z.guid({
    error: "DEFAULT_ORGANIZATION_ID must be a UUID-shaped identifier",
  }),
  ORGANIZATION_NAME: z.string().trim().min(1).default("ScubaXcursions"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  CORS_ORIGINS: z.string().optional().default(""),
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  const messages = parsed.error.issues.map(
    (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
  );
  throw new Error(`Invalid backend configuration:\n- ${messages.join("\n- ")}`);
}

const values = parsed.data;

export const config = Object.freeze({
  databaseUrl: values.DATABASE_URL,
  jwtSecret: values.JWT_SECRET,
  defaultOrganizationId: values.DEFAULT_ORGANIZATION_ID,
  organizationName: values.ORGANIZATION_NAME,
  nodeEnv: values.NODE_ENV,
  port: values.PORT,
  corsOrigins: values.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

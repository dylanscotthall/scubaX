import { randomUUID } from "crypto";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { config } from "./config";
import { asyncRoute, HttpError } from "./lib/http";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import boatRoutes from "./routes/boats";
import diveSiteRoutes from "./routes/diveSites";
import launchSiteRoutes from "./routes/launchSites";
import tripRoutes from "./routes/trips";
import bookingRoutes from "./routes/bookings";
import courseRoutes from "./routes/courses";
import waiverRoutes from "./routes/waivers";
import scheduleTemplateRoutes from "./routes/scheduleTemplates";
import equipmentRoutes from "./routes/equipment";
import conditionsRoutes from "./routes/conditions";
import { startSappiSyncJob } from "./jobs/sappiSync";

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  res.setHeader("x-request-id", requestId);
  res.locals.requestId = requestId;
  next();
});

app.get(
  "/health",
  asyncRoute(async (_req, res) => {
    await prisma.$queryRawUnsafe("SELECT 1");
    return res.json({
      status: "ok",
      database: "reachable",
      service: "scubaxcursions-backend",
      environment: config.nodeEnv,
    });
  }),
);

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/boats", boatRoutes);
app.use("/dive-sites", diveSiteRoutes);
app.use("/launch-sites", launchSiteRoutes);
app.use("/trips", tripRoutes);
app.use("/bookings", bookingRoutes);
app.use("/courses", courseRoutes);
app.use("/waivers", waiverRoutes);
app.use("/equipment", equipmentRoutes);
app.use("/conditions", conditionsRoutes);
app.use(scheduleTemplateRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const requestId = String(res.locals.requestId ?? "unknown");

    if (error instanceof HttpError) {
      return res.status(error.status).json({
        error: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId,
      });
    }

    console.error(`[${requestId}] Unhandled request error`, error);
    return res.status(500).json({
      error: "Internal server error",
      requestId,
    });
  },
);

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`ScubaXcursions backend listening on 0.0.0.0:${config.port}`);
  startSappiSyncJob();
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

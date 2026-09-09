import cron from "node-cron";
import { syncSappiBuoy } from "../services/sappiBuoy";

const SAPPI_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

async function runSappiSync() {
  try {
    const condition = await syncSappiBuoy(SAPPI_ORGANIZATION_ID);

    console.log(`[Sappi] Synced ${condition.recordedAt.toISOString()}`);
  } catch (error) {
    console.error("[Sappi] Sync failed", error);
  }
}

export function startSappiSyncJob() {
  // Sync immediately on startup
  void runSappiSync();

  // Then every 15 minutes
  cron.schedule("*/15 * * * *", runSappiSync, {
    noOverlap: true,
  });

  console.log("[Sappi] Scheduled every 15 minutes");
}

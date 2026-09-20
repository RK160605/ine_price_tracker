import { Router, Request, Response } from "express";
import { db } from "../db/client.js";
import { catalogService } from "../services/catalogService.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const dbStatus = db.getStatus();
    const storeHealth = await catalogService.checkStoreHealth();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      store: {
        ...storeHealth,
        status: storeHealth.reachable && storeHealth.catalogOk ? "HEALTHY" : "DEGRADED"
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

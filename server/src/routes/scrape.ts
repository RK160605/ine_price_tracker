import { Router, Request, Response } from "express";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { scraperService } from "../services/scraperService.js";

export const scrapeRouter = Router();

/**
 * POST /api/scrape/trigger
 * External scheduled cron trigger (e.g. from cron-job.org)
 * Safe for Render free-tier sleep: wakes server and executes scrape for all active products
 */
scrapeRouter.post("/trigger", async (req: Request, res: Response) => {
  try {
    const providedSecret =
      (req.headers["x-cron-secret"] as string) ||
      (req.query.secret as string) ||
      req.body.secret;

    // Optional secret check if configured
    if (config.cronSecret && providedSecret !== config.cronSecret) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or missing cron secret"
      });
    }

    console.log("[Cron Trigger] Received external scrape trigger request.");

    // Run scraping across active products
    const summary = await scraperService.scrapeAllTracked();

    res.json({
      success: true,
      message: `Scheduled scrape completed. Processed ${summary.total} products.`,
      summary
    });
  } catch (err: any) {
    console.error("[Cron Trigger] Error during scheduled scrape:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/scrape/product/:id
 * Manual on-demand scrape for a single tracked product
 */
scrapeRouter.post("/product/:id", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid product ID" });
    }

    const tracked = await db.getTrackedProduct(productId);
    if (!tracked) {
      return res.status(404).json({ success: false, error: `Product ${productId} is not tracked` });
    }

    const result = await scraperService.scrapeProduct(productId);

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully scraped product ${productId}`,
        result
      });
    } else {
      res.status(502).json({
        success: false,
        message: `Scrape failed after ${result.attempts} attempts: ${result.error}`,
        result
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/scrape/logs/recent
 * Retrieve global recent scrape attempts for dashboard monitoring
 */
scrapeRouter.get("/logs/recent", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const logs = await db.getAllRecentLogs(limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

import { Router, Request, Response } from "express";
import { db } from "../db/client.js";
import { catalogService } from "../services/catalogService.js";
import { scraperService } from "../services/scraperService.js";

export const productsRouter = Router();

/**
 * GET /api/products/search?q=phone
 * Search INE mock store by partial or full title/brand/sku
 */
productsRouter.get("/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const results = await catalogService.searchProducts(q);
    res.json({ success: true, count: results.length, items: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/tracked
 * List all tracked products with latest price, stock, and status
 */
productsRouter.get("/tracked", async (_req: Request, res: Response) => {
  try {
    const tracked = await db.getTrackedProducts();
    res.json({ success: true, count: tracked.length, products: tracked });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/track
 * Add product to tracking list and perform initial scrape
 */
productsRouter.post("/track", async (req: Request, res: Response) => {
  try {
    const { productId, scrapeIntervalHours } = req.body;
    const pId = Number(productId);
    if (isNaN(pId) || pId <= 0) {
      return res.status(400).json({ success: false, error: "Valid numeric productId is required" });
    }

    // 1. Fetch product metadata from mock store via lightweight HTTP
    const details = await catalogService.getProductDetails(pId);
    if (!details || !details.name) {
      return res.status(404).json({ success: false, error: `Product ${pId} not found in store` });
    }

    // 2. Persist in database
    const tracked = await db.addTrackedProduct({
      product_id: pId,
      name: details.name,
      brand: details.brand,
      category: details.category,
      sku: details.sku,
      image_url: undefined,
      current_price: null,
      mrp: null,
      current_stock: null,
      stock_status: null,
      last_scraped_at: null,
      scrape_interval_hours: scrapeIntervalHours ? Number(scrapeIntervalHours) : 2
    });

    // 3. Trigger initial scrape asynchronously (or wait if requested)
    scraperService.scrapeProduct(pId).catch(err => {
      console.error(`[Initial Scrape] Failed for product ${pId}:`, err);
    });

    res.json({
      success: true,
      message: `Product "${details.name}" added to tracking. Initial scrape in progress.`,
      product: tracked
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Untrack product
 */
productsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    await db.removeTrackedProduct(productId);
    res.json({ success: true, message: `Product ${productId} untracked successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id
 * Get single tracked product with price history and scrape logs
 */
productsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const tracked = await db.getTrackedProduct(productId);

    if (!tracked) {
      return res.status(404).json({ success: false, error: `Product ${productId} is not currently tracked` });
    }

    const [history, logs, details] = await Promise.all([
      db.getPriceHistory(productId, 100),
      db.getScrapeLogs(productId, 100),
      catalogService.getProductDetails(productId).catch(() => null)
    ]);

    res.json({
      success: true,
      product: tracked,
      details,
      history,
      logs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id/history
 * Get price history for a product
 */
productsRouter.get("/:id/history", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const history = await db.getPriceHistory(productId, limit);
    res.json({ success: true, count: history.length, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id/logs
 * Get scrape logs for a product
 */
productsRouter.get("/:id/logs", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = await db.getScrapeLogs(productId, limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

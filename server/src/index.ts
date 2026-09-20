import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { productsRouter } from "./routes/products.js";
import { scrapeRouter } from "./routes/scrape.js";
import { healthRouter } from "./routes/health.js";
import { scraperService } from "./services/scraperService.js";

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
app.use("/api/products", productsRouter);
app.use("/api/scrape", scrapeRouter);
app.use("/api/health", healthRouter);

// Root greeting
app.get("/", (_req, res) => {
  res.json({
    name: "INE Product Price Tracker API",
    version: "1.0.0",
    docs: {
      search: "GET /api/products/search?q=...",
      tracked: "GET /api/products/tracked",
      track: "POST /api/products/track",
      product: "GET /api/products/:id",
      scrapeProduct: "POST /api/scrape/product/:id",
      cronTrigger: "POST /api/scrape/trigger",
      health: "GET /api/health"
    }
  });
});

// Local scheduled background scraping (every 2 hours)
// In production on free-tier Render, external cron (cron-job.org) triggers POST /api/scrape/trigger
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
  console.log("[Scheduler] Running recurring 2-hour scheduled scrape cycle...");
  scraperService.scrapeAllTracked().catch(err => {
    console.error("[Scheduler] Error in 2-hour recurring scrape:", err);
  });
}, TWO_HOURS_MS);

// Start server
app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`  INE Product Price Tracker API Server Started        `);
  console.log(`  Port: ${config.port}                                 `);
  console.log(`  Mock Store Target: ${config.mockStoreUrl}           `);
  console.log(`  Cron Secret: ${config.cronSecret ? "Configured" : "None"} `);
  console.log(`=======================================================`);
});

export default app;

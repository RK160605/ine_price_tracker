import { chromium, Browser, BrowserContext } from "playwright";
import { config } from "../config.js";
import { db } from "../db/client.js";

export interface ScrapeOptions {
  headed?: boolean;
  maxAttempts?: number;
  slowMo?: number;
  timeoutMs?: number;
}

export interface ScrapedData {
  productId: number;
  price: number;
  mrp: number | null;
  discountPct: number | null;
  stock: number;
  stockStatus: string;
  durationMs: number;
  attempt: number;
  rawPriceText: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedData;
  error?: string;
  attempts: number;
  durationMs: number;
}

export class ScraperService {
  private browserInstance: Browser | null = null;

  /**
   * Helper to launch or reuse browser instance
   */
  private async getBrowser(headed = false, slowMo = 0): Promise<Browser> {
    if (this.browserInstance && !headed && slowMo === 0) {
      if (this.browserInstance.isConnected()) {
        return this.browserInstance;
      }
    }

    const launchOptions: any = {
      headless: !headed,
      slowMo: slowMo > 0 ? slowMo : undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu"
      ]
    };

    // Try Google Chrome channel first (for Mac / local), fallback to default Chromium
    try {
      const browser = await chromium.launch({
        ...launchOptions,
        channel: config.playwrightChannel || "chrome"
      });
      if (!headed && slowMo === 0) {
        this.browserInstance = browser;
      }
      return browser;
    } catch (channelErr) {
      console.warn("Could not launch with channel 'chrome', falling back to bundled chromium:", channelErr);
      const browser = await chromium.launch(launchOptions);
      if (!headed && slowMo === 0) {
        this.browserInstance = browser;
      }
      return browser;
    }
  }

  /**
   * Dismisses any cookie banner popup if present on the page
   */
  private async dismissCookieBanner(page: any): Promise<boolean> {
    try {
      const acceptBtn = page.locator(".cookie-banner button:has-text('Accept')");
      if (await acceptBtn.isVisible({ timeout: 800 })) {
        await acceptBtn.click({ force: true });
        await page.waitForTimeout(200);
        return true;
      }
    } catch (e) {
      // Cookie banner not present
    }
    return false;
  }

  /**
   * Simulates smooth human-like mouse movement across a bounding box
   * to satisfy minMoves: 8 and minDwellMs: 600
   */
  private async simulateMouseHover(page: any, boundingBox: { x: number; y: number; width: number; height: number }) {
    const steps = 14;
    const dwellStepMs = 60; // 14 * 60 = 840ms dwell time (> 600ms requirement)

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      // Smooth sinusoidal trajectory across the price box
      const x = boundingBox.x + 25 + (boundingBox.width - 50) * progress;
      const y = boundingBox.y + (boundingBox.height / 2) + Math.sin(progress * Math.PI) * 15;

      await page.mouse.move(x, y);
      await page.waitForTimeout(dwellStepMs);
    }
  }

  /**
   * Cleans and sanitizes raw price text:
   * - Strips zero-width spaces (\u200B, \u200C, \u200D, \uFEFF)
   * - Strips non-breaking spaces (\u00A0)
   * - Converts fullwidth unicode digits (\uFF10-\uFF19)
   * - Removes currency symbols, commas, trailing text
   */
  private sanitizePrice(rawText: string): number {
    if (!rawText) return 0;

    // 1. Remove all zero-width and invisible characters
    let cleaned = rawText.replace(/[\u200B\u200C\u200D\uFEFF\u00A0\s]/g, "");

    // 2. Convert fullwidth unicode numbers if present
    cleaned = cleaned.replace(/[\uFF10-\uFF19]/g, m => String.fromCharCode(m.charCodeAt(0) - 65248));

    // 3. Keep only numeric digits
    cleaned = cleaned.replace(/[^0-9]/g, "");

    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Scrapes price and stock for a single product with full anti-bot challenge solving
   */
  async scrapeProduct(productId: number, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const maxAttempts = options.maxAttempts || 4;
    const headed = !!options.headed;
    const slowMo = options.slowMo || 0;
    const timeoutMs = options.timeoutMs || 25000;

    const overallStartTime = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await this.getBrowser(headed, slowMo);
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      });

      const page = await context.newPage();

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const attemptStartTime = Date.now();
        console.log(`[Scraper] Product ${productId} -> Attempt ${attempt}/${maxAttempts} (headed=${headed})...`);

        try {
          // Navigate to product detail page
          const targetUrl = `${config.mockStoreUrl}/product/${productId}`;
          await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: timeoutMs
          });

          // Check & dismiss initial cookie banner
          await this.dismissCookieBanner(page);

          // Wait for price block
          const priceBlock = page.locator(".price-block");
          await priceBlock.waitFor({ state: "visible", timeout: 10000 });

          // If price is hidden behind "Reveal price" button
          const revealBtn = page.locator("button:has-text('Reveal price')");
          if (await revealBtn.count() > 0) {
            // Dismiss cookie banner again if it popped up late
            await this.dismissCookieBanner(page);

            const box = await priceBlock.boundingBox();
            if (box) {
              await this.simulateMouseHover(page, box);
            }

            // Wait for Reveal button to become enabled
            await page.waitForFunction(() => {
              const btn = document.querySelector("button[aria-label='Reveal price']") as HTMLButtonElement | null;
              return btn && !btn.disabled;
            }, { timeout: 6000 });

            // Check cookie banner once more right before click
            await this.dismissCookieBanner(page);

            await revealBtn.click();
          }

          // Wait for success or error state
          // The store might undergo an internal retry phase ("Retrying (attempt 1/6)...")
          await page.waitForSelector(".price-success, .price-error", { timeout: 20000 });

          // If store displayed an error state in the page UI
          if (await page.locator(".price-error").isVisible()) {
            const errorSubstatus = await page.locator(".price-error .price-substatus").textContent();
            throw new Error(`Store internal quote error: ${errorSubstatus?.trim() || "Quote request failed"}`);
          }

          // Successfully reached .price-success state! Extract DOM values safely
          const rawData = await page.evaluate(() => {
            const priceMain = document.querySelector(".price-main");
            if (!priceMain) return null;

            // Filter out decoy honeypots and line-through MRP
            const visibleChildren = Array.from(priceMain.children).filter((el: any) => {
              const style = window.getComputedStyle(el);
              return style.display !== "none" &&
                     style.visibility !== "hidden" &&
                     el.getAttribute("aria-hidden") !== "true" &&
                     !el.classList.contains("price-value") &&
                     !el.hasAttribute("data-price") &&
                     style.textDecorationLine !== "line-through";
            });

            // Find visible price element
            let priceText = "";
            for (const el of visibleChildren) {
              const txt = el.textContent || "";
              if (/[0-9\u0966-\u096F\uFF10-\uFF19]/.test(txt) && !txt.includes("% off") && !txt.includes("Deal price")) {
                priceText = txt;
                break;
              }
            }

            // MRP
            let mrpText = "";
            const mrpEl = priceMain.querySelector("span[style*='line-through']");
            if (mrpEl) {
              mrpText = mrpEl.textContent || "";
            }

            // Discount percentage badge
            let discountPct = 0;
            const badgeEl = priceMain.querySelector("span[style*='color']");
            if (badgeEl && badgeEl.textContent) {
              const match = badgeEl.textContent.match(/(\d+)%/);
              if (match) discountPct = parseInt(match[1], 10);
            }

            // Stock badge
            const stockEl = document.querySelector(".stock-badge");
            const stockText = stockEl ? (stockEl.textContent || "").trim() : "";
            let stock = 0;
            let stockStatus = "Out of stock";

            if (stockText.toLowerCase().includes("out of stock")) {
              stock = 0;
              stockStatus = "Out of stock";
            } else {
              const match = stockText.match(/(\d+)/);
              stock = match ? parseInt(match[1], 10) : 0;
              stockStatus = stockText;
            }

            return {
              priceText,
              mrpText,
              discountPct,
              stock,
              stockStatus
            };
          });

          if (!rawData || !rawData.priceText) {
            throw new Error("Could not extract valid visible price element from page DOM");
          }

          const price = this.sanitizePrice(rawData.priceText);
          const mrp = rawData.mrpText ? this.sanitizePrice(rawData.mrpText) : null;

          if (price <= 0) {
            throw new Error(`Sanitized price is invalid or zero: ${rawData.priceText}`);
          }

          const durationMs = Date.now() - attemptStartTime;

          const scrapedData: ScrapedData = {
            productId,
            price,
            mrp,
            discountPct: rawData.discountPct || null,
            stock: rawData.stock,
            stockStatus: rawData.stockStatus,
            durationMs,
            attempt,
            rawPriceText: rawData.priceText
          };

          // Record honest SUCCESS in scrape_logs
          await db.addScrapeLog({
            product_id: productId,
            attempt_number: attempt,
            status: "SUCCESS",
            duration_ms: durationMs,
            price,
            stock: rawData.stock,
            error_message: null,
            strategy: headed ? "PLAYWRIGHT_HEADED" : "PLAYWRIGHT_HEADLESS"
          });

          // Record price history
          await db.addPriceHistory({
            product_id: productId,
            price,
            stock: rawData.stock,
            stock_status: rawData.stockStatus,
            mrp,
            discount_pct: rawData.discountPct || null
          });

          // Update tracked_products current status
          await db.updateTrackedProduct(productId, {
            current_price: price,
            mrp,
            current_stock: rawData.stock,
            stock_status: rawData.stockStatus,
            last_scraped_at: new Date().toISOString()
          });

          console.log(`[Scraper] SUCCESS on attempt ${attempt}: ₹${price}, Stock: ${rawData.stock} (${durationMs}ms)`);

          return {
            success: true,
            data: scrapedData,
            attempts: attempt,
            durationMs: Date.now() - overallStartTime
          };

        } catch (attemptError: any) {
          const attemptDurationMs = Date.now() - attemptStartTime;
          console.warn(`[Scraper] Attempt ${attempt}/${maxAttempts} failed: ${attemptError.message}`);

          // Record RETRYING log if more attempts remain
          if (attempt < maxAttempts) {
            await db.addScrapeLog({
              product_id: productId,
              attempt_number: attempt,
              status: "RETRYING",
              duration_ms: attemptDurationMs,
              price: null,
              stock: null,
              error_message: attemptError.message,
              strategy: headed ? "PLAYWRIGHT_HEADED" : "PLAYWRIGHT_HEADLESS"
            });

            // Exponential backoff with jitter: (2^attempt * 500ms) + random jitter
            const backoffMs = Math.pow(2, attempt) * 500 + Math.floor(Math.random() * 400);
            console.log(`[Scraper] Waiting ${backoffMs}ms before retry...`);
            await new Promise(res => setTimeout(res, backoffMs));
          } else {
            // Final attempt failed -> Record honest FAILED log
            await db.addScrapeLog({
              product_id: productId,
              attempt_number: attempt,
              status: "FAILED",
              duration_ms: attemptDurationMs,
              price: null,
              stock: null,
              error_message: attemptError.message,
              strategy: headed ? "PLAYWRIGHT_HEADED" : "PLAYWRIGHT_HEADLESS"
            });

            return {
              success: false,
              error: attemptError.message,
              attempts: maxAttempts,
              durationMs: Date.now() - overallStartTime
            };
          }
        }
      }

      return {
        success: false,
        error: "Exhausted all scrape retry attempts",
        attempts: maxAttempts,
        durationMs: Date.now() - overallStartTime
      };

    } finally {
      if (context) await context.close();
      if (headed && browser) {
        await browser.close();
      }
    }
  }

  /**
   * Scrapes all currently active tracked products (used by scheduled cron)
   */
  async scrapeAllTracked(options: ScrapeOptions = {}): Promise<{
    total: number;
    successCount: number;
    failureCount: number;
    results: Record<number, ScrapeResult>;
  }> {
    const tracked = await db.getTrackedProducts();
    const activeProducts = tracked.filter(p => p.is_active);

    console.log(`[Scraper Scheduler] Triggered scrape for ${activeProducts.length} active products...`);
    const results: Record<number, ScrapeResult> = {};
    let successCount = 0;
    let failureCount = 0;

    for (const product of activeProducts) {
      try {
        const res = await this.scrapeProduct(product.product_id, options);
        results[product.product_id] = res;
        if (res.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (err: any) {
        failureCount++;
        results[product.product_id] = {
          success: false,
          error: err.message,
          attempts: 1,
          durationMs: 0
        };
      }

      // Small delay between products to avoid triggering aggressive store rate limits
      await new Promise(r => setTimeout(r, 1000));
    }

    return {
      total: activeProducts.length,
      successCount,
      failureCount,
      results
    };
  }
}

export const scraperService = new ScraperService();

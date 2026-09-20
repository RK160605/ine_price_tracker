import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function recordObservableRun() {
  const recordingsDir = path.resolve(process.cwd(), "recordings");
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  console.log("====================================================================");
  console.log("  INE SCRAPER: OBSERVABLE HEADED DEMO WITH VIDEO RECORDING");
  console.log("====================================================================");
  console.log(`Saving video recording to: ${recordingsDir}`);

  let browser;
  try {
    browser = await chromium.launch({
      channel: "chrome",
      headless: false,
      args: ["--window-size=1280,850"]
    });
  } catch (e) {
    browser = await chromium.launch({
      headless: false,
      args: ["--window-size=1280,850"]
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1280, height: 800 }
    }
  });

  const page = await context.newPage();

  async function scrapeWithObservability(productId, testTitle) {
    console.log(`\n>>> [TEST CASE] ${testTitle} (Product ID #${productId}) <<<`);
    const startTime = Date.now();

    // 1. Navigate
    console.log(`[1] Navigating to https://demo.inelabteamdev.com/product/${productId}`);
    await page.goto(`https://demo.inelabteamdev.com/product/${productId}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await page.waitForTimeout(1000);

    // 2. Cookie banner detection
    console.log("[2] Checking for dynamic cookie overlay modal...");
    try {
      const cookieBtn = page.locator(".cookie-banner button:has-text('Accept')");
      if (await cookieBtn.isVisible({ timeout: 1500 })) {
        console.log("! Cookie banner detected on screen. Dismissing via 'Accept' click...");
        await cookieBtn.click();
        await page.waitForTimeout(800);
      } else {
        console.log("• Cookie overlay not present at this instant.");
      }
    } catch (e) {}

    // 3. Locate price block
    console.log("[3] Inspecting Price Block (Initial State: 'Price hidden')...");
    const priceBlock = page.locator(".price-block");
    await priceBlock.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000);

    // 4. Mouse Dwell Simulation
    console.log("[4] Executing anti-bot mouse trajectory over price box (8+ moves, 600ms+ dwell)...");
    const box = await priceBlock.boundingBox();
    if (box) {
      for (let i = 0; i < 14; i++) {
        const progress = i / 13;
        const x = box.x + 30 + (box.width - 60) * progress;
        const y = box.y + (box.height / 2) + Math.sin(progress * Math.PI) * 14;
        await page.mouse.move(x, y);
        await page.waitForTimeout(70);
      }
    }
    console.log("✓ Mouse telemetry requirements fulfilled.");

    // 5. Wait for Reveal price button to enable
    console.log("[5] Waiting for 'Reveal price' button to become enabled...");
    await page.waitForFunction(() => {
      const btn = document.querySelector("button[aria-label='Reveal price']");
      return btn && !btn.disabled;
    }, { timeout: 6000 });
    await page.waitForTimeout(800);

    // Check for late cookie banner
    try {
      const lateCookie = page.locator(".cookie-banner button:has-text('Accept')");
      if (await lateCookie.isVisible({ timeout: 400 })) {
        console.log("! Late cookie banner popped up. Dismissing...");
        await lateCookie.click();
        await page.waitForTimeout(400);
      }
    } catch (e) {}

    console.log("✓ Clicking 'Reveal price' button...");
    const revealBtn = page.locator("button:has-text('Reveal price')");
    await revealBtn.click();

    // 6. Wait for verification & quote resolution
    console.log("[6] Waiting for store WebAssembly challenge & price quote resolution...");
    console.log("    (The store deliberately simulates delays, 429 retries, and rate limits)");
    await page.waitForSelector(".price-success, .price-error", { timeout: 25000 });

    if (await page.locator(".price-error").isVisible()) {
      const errTxt = await page.locator(".price-error .price-substatus").textContent();
      throw new Error(`Store internal error: ${errTxt}`);
    }
    console.log("✓ Price block successfully transitioned to '.price-success'!");
    await page.waitForTimeout(1500);

    // 7. Extract genuine price while discarding honeypots
    console.log("[7] Extracting price while filtering decoy honeypots...");
    const extracted = await page.evaluate(() => {
      const priceMain = document.querySelector(".price-main");
      if (!priceMain) return null;

      const visible = Array.from(priceMain.children).filter((el) => {
        const s = window.getComputedStyle(el);
        return s.display !== "none" &&
               s.visibility !== "hidden" &&
               el.getAttribute("aria-hidden") !== "true" &&
               !el.classList.contains("price-value") &&
               !el.hasAttribute("data-price") &&
               s.textDecorationLine !== "line-through";
      });

      let priceRaw = "";
      for (const el of visible) {
        const txt = el.textContent || "";
        if (/[0-9\u0966-\u096F\uFF10-\uFF19]/.test(txt) && !txt.includes("% off") && !txt.includes("Deal price")) {
          priceRaw = txt;
          break;
        }
      }

      const stockEl = document.querySelector(".stock-badge");
      const stockRaw = stockEl ? stockEl.textContent?.trim() || "" : "";

      const honeypots = Array.from(document.querySelectorAll(".price-value, [data-price='true']")).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent
      }));

      return { priceRaw, stockRaw, honeypots };
    });

    let cleaned = (extracted?.priceRaw || "")
      .replace(/[\u200B\u200C\u200D\uFEFF\u00A0\s]/g, "")
      .replace(/[\uFF10-\uFF19]/g, m => String.fromCharCode(m.charCodeAt(0) - 65248))
      .replace(/[^0-9]/g, "");

    const finalPrice = parseInt(cleaned, 10);
    const totalDuration = Date.now() - startTime;

    console.log(`✓ Scraped Genuine Price: ₹${finalPrice.toLocaleString("en-IN")}`);
    console.log(`✓ Scraped Stock Status:  ${extracted?.stockRaw}`);
    console.log(`✓ Honeypots Discarded:   ${JSON.stringify(extracted?.honeypots)}`);
    console.log(`✓ Execution Duration:    ${totalDuration}ms`);

    await page.waitForTimeout(3000);
  }

  try {
    // Run Test Case 1: Product 451
    await scrapeWithObservability(451, "Product #451 (Smart Home - Larkspur Video Doorbell)");

    // Run Test Case 2: Product 148
    await scrapeWithObservability(148, "Product #148 (Kitchen - Auralite Water Bottle Mini)");

  } catch (err) {
    console.error("Scrape test error:", err.message);
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      console.log(`\n====================================================================`);
      console.log(`✓ Video recording successfully saved to: ${videoPath}`);
      console.log(`====================================================================\n`);
    }
  }
}

recordObservableRun().catch(console.error);

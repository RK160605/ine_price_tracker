import { chromium } from "playwright";
import { config } from "../config.js";

async function runHeadedScrape() {
  const args = process.argv.slice(2);
  let productId = 451; // default

  for (const arg of args) {
    if (arg.startsWith("--product=")) {
      productId = parseInt(arg.split("=")[1], 10);
    }
  }

  console.log("\n==================================================================");
  console.log(`  INE SCRAPER: OBSERVABLE HEADED RUN (Product #${productId})`);
  console.log("==================================================================");
  console.log("Launching visible browser window with slowed actions (slowMo: 450ms)...");

  let browser;
  try {
    browser = await chromium.launch({
      channel: config.playwrightChannel || "chrome",
      headless: false,
      args: ["--window-size=1280,850"]
    });
  } catch (e) {
    console.log("Chrome channel fallback to chromium...");
    browser = await chromium.launch({
      headless: false,
      args: ["--window-size=1280,850"]
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    const startTime = Date.now();
    const url = `${config.mockStoreUrl}/product/${productId}`;
    console.log(`\n[Step 1] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("✓ Page loaded successfully.");

    // Check for cookie banner
    console.log("\n[Step 2] Checking for dynamic Cookie Consent overlay...");
    try {
      const cookieBtn = page.locator(".cookie-banner button:has-text('Accept')");
      if (await cookieBtn.isVisible({ timeout: 1500 })) {
        console.log("! Cookie banner detected on screen. Dismissing with 'Accept' click...");
        await cookieBtn.click();
        await page.waitForTimeout(400);
        console.log("✓ Cookie banner dismissed.");
      } else {
        console.log("• No cookie banner at initial load.");
      }
    } catch (e) {
      console.log("• Cookie banner check completed.");
    }

    // Locate price area
    console.log("\n[Step 3] Locating Price & Stock Container...");
    const priceBlock = page.locator(".price-block");
    await priceBlock.waitFor({ state: "visible", timeout: 10000 });
    console.log("✓ Price block detected in DOM (State: 'Price hidden').");

    const revealBtn = page.locator("button:has-text('Reveal price')");
    if (await revealBtn.count() > 0) {
      console.log("\n[Step 4] Simulating human mouse dwell & trajectory over price box...");
      const box = await priceBlock.boundingBox();
      if (box) {
        // Move mouse in smooth intervals to satisfy anti-bot mouse tracking
        for (let i = 0; i < 14; i++) {
          const progress = i / 13;
          const x = box.x + 30 + (box.width - 60) * progress;
          const y = box.y + (box.height / 2) + Math.sin(progress * Math.PI) * 12;
          await page.mouse.move(x, y);
          await page.waitForTimeout(60);
        }
      }

      console.log("✓ Anti-bot mouse dwell condition satisfied.");
      console.log("Waiting for 'Reveal price' button to enable...");
      await page.waitForFunction(() => {
        const btn = document.querySelector("button[aria-label='Reveal price']") as HTMLButtonElement | null;
        return btn && !btn.disabled;
      }, { timeout: 6000 });

      // Dismiss cookie banner again if it popped up late
      try {
        const lateCookie = page.locator(".cookie-banner button:has-text('Accept')");
        if (await lateCookie.isVisible({ timeout: 500 })) {
          console.log("! Late cookie banner popped up! Clicking Accept...");
          await lateCookie.click();
        }
      } catch (err) {}

      console.log("✓ 'Reveal price' button enabled. Clicking now...");
      await revealBtn.click();
    }

    console.log("\n[Step 5] Waiting for server quote verification and challenge resolution...");
    console.log("(The store may undergo simulated retry cycles or network delays...)");

    await page.waitForSelector(".price-success, .price-error", { timeout: 25000 });

    if (await page.locator(".price-error").isVisible()) {
      const errTxt = await page.locator(".price-error .price-substatus").textContent();
      throw new Error(`Store responded with quote error: ${errTxt}`);
    }

    console.log("✓ Price block transitioned to '.price-success'!");

    // Extract genuine price and stock
    console.log("\n[Step 6] Extracting price & stock while evading decoy honeypots...");
    const extracted = await page.evaluate(() => {
      const priceMain = document.querySelector(".price-main");
      if (!priceMain) return null;

      // Filter visible elements, strictly rejecting decoys (.price-value, [data-price="true"])
      const visible = Array.from(priceMain.children).filter((el: any) => {
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

    console.log("  Decoy honeypots successfully filtered:", extracted?.honeypots);
    console.log("  Raw price extracted from live DOM:", extracted?.priceRaw);

    // Sanitize price
    let cleaned = (extracted?.priceRaw || "")
      .replace(/[\u200B\u200C\u200D\uFEFF\u00A0\s]/g, "")
      .replace(/[\uFF10-\uFF19]/g, m => String.fromCharCode(m.charCodeAt(0) - 65248))
      .replace(/[^0-9]/g, "");

    const finalPrice = parseInt(cleaned, 10);
    const stockMatch = (extracted?.stockRaw || "").match(/(\d+)/);
    const finalStock = stockMatch ? parseInt(stockMatch[1], 10) : 0;
    const totalDuration = Date.now() - startTime;

    console.log("\n==================================================================");
    console.log("  SCRAPE RESULT SUMMARY:");
    console.log(`  Product ID:        ${productId}`);
    console.log(`  Genuine Price:     ₹${finalPrice.toLocaleString("en-IN")}`);
    console.log(`  Stock Level:       ${finalStock} (${extracted?.stockRaw})`);
    console.log(`  Execution Time:    ${totalDuration}ms`);
    console.log("==================================================================\n");

    // Keep window open for a moment so observer can inspect
    await page.waitForTimeout(3000);

  } catch (err: any) {
    console.error("\n Scrape encounter error:", err.message);
  } finally {
    await browser.close();
    console.log("Browser session closed.\n");
  }
}

runHeadedScrape().catch(console.error);

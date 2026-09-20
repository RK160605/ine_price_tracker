# Design Note: Scraping Reliability, Architectural Trade-offs & Lessons Learned

**Assignment**: INE Software Engineer Intern Assignment — Product Price Tracker  
**Author**: Rishab Koul  
**Target Storefront**: `https://demo.inelabteamdev.com/`  

---

## 1. How the Scraping Was Made Reliable

The INE mock storefront is deliberately designed to break standard web scrapers. Bypassing it reliably across unattended runs required reverse-engineering the client-side JavaScript bundle (`assets/index-B9UiQq4X.js`) and constructing an adaptive scraping engine.

### Key Obstacles & Solutions:

1. **Anti-Bot Mouse Telemetry Verification (`Ar` Class)**:
   - **Mechanism**: When a user lands on a product page, the price container starts in an `idle` state ("Price hidden") and the "Reveal price" button is disabled. An internal telemetry collector (`class Ar`) records cursor movements (`onMouseMove`, `onMouseEnter`). It enforces two strict conditions:
     ```javascript
     missing() {
       return this.moves.length < this.req.minMoves   // requires at least 8 moves
         ? "Hover over the price area to load the current price."
         : this.hoverAt && Date.now() - this.hoverAt < this.req.minDwellMs // requires at least 600ms dwell time
         ? "Hold on — checking availability…"
         : null;
     }
     ```
   - **Solution**: Rather than attempting to spoof synthetic non-trusted DOM click events (which the store rejects via `event.nativeEvent.isTrusted`), our Playwright scraper calculates the bounding box of the price container and executes a smooth, human-like sinusoidal path with 14 discrete cursor movements over 840ms. Once the button's `disabled` attribute clears, it dispatches an authentic trusted click.

2. **Decoy Honeypot Elements**:
   - **Mechanism**: The storefront plants deceptive price elements in the DOM to fool simple XPath or selector queries:
     ```html
     <span class="price-value" aria-hidden="true" style="display: none">₹11,550</span>
     <span class="amount" data-price="true" aria-hidden="true" style="display: none">₹13,450</span>
     ```
     Any scraper looking for `.price-value` or `[data-price="true"]` extracts fake numbers (`d.d1` and `d.d2`).
   - **Solution**: Our DOM extraction logic applies strict visibility and heuristic filtering. It rejects elements with `display: none`, `aria-hidden="true"`, strikethrough styles (MRP), and classes matching known decoy patterns. It locates only the active rendered element within `.price-main`.

3. **Invisible Characters and Obfuscated Number Formatting**:
   - **Mechanism**: The store splits price numbers and inserts zero-width spaces (`\u200B`), non-breaking spaces (`\u00A0`), fullwidth unicode numerals (`\uFF10-\uFF19`), or trailing strings (`/- (incl. of all taxes)`).
   - **Solution**: A multi-stage sanitizer strips invisible zero-width code points, normalizes unicode numbers to standard ASCII digits, removes currency signs and whitespace, and verifies that the resulting integer is strictly positive before saving.

4. **Dynamic Focus-Trapping Cookie Consent Overlays**:
   - **Mechanism**: A cookie banner (`.cookie-banner`) spawns randomly at unpredictable timeouts, setting `document.body.style.overflow = "hidden"` and capturing focus.
   - **Solution**: The scraper checks for the banner upon page navigation, before cursor movement, and immediately before clicking the reveal button, dismissing it if present.

5. **Store-Injected Latency & 429 / 500 Transient Errors**:
   - **Mechanism**: The mock store randomly returns 429 rate limits, slow responses, and transient 500s.
   - **Solution**: Multi-layer retry logic with exponential backoff and randomized jitter (`2^attempt * 500ms + random(400ms)`). If an attempt fails, it logs a `RETRYING` entry in the database. If all attempts are exhausted, it records an honest `FAILED` log with the exact error message, guaranteeing that corrupt or empty data is never written to price history.

---

## 2. Architectural Trade-Offs

### A. Lightweight HTTP Fetching vs. Headless Browser
- **Trade-off**: Running a full headless browser for every operation is resource-intensive and slow, especially on free-tier hosting.
- **Decision**: 
  - For **product selection, catalog search, SKU lookup, specifications, and customer reviews**, we utilize direct, lightweight HTTP requests to the store's REST endpoints (`/api/catalog` and `/api/product/:id`). This yields response times under 300ms.
  - For **price and stock extraction**, a headless browser (Playwright) is genuinely mandatory due to the client-side mouse telemetry and WebAssembly proof-of-work challenge.
  - This hybrid architecture maximizes search performance while keeping browser overhead strictly contained to price updates.

### B. Scheduling on Free-Tier Instances (Sleep Handling)
- **Trade-off**: Free cloud instances (e.g., Render) go to sleep after 15 minutes of inactivity, causing internal `setInterval` loops to freeze.
- **Decision**: We exposed a webhook endpoint (`POST /api/scrape/trigger`) protected by `x-cron-secret`. An external free-tier cron service ([cron-job.org](https://cron-job.org)) pings this endpoint every 2 hours. This automatically wakes the instance, executes the scrape across all active tracked products, and logs results into Supabase.

### C. Database Layer: Dual-Driver Architecture
- **Trade-off**: Requiring immediate live Supabase cloud credentials can hinder immediate local testing and evaluation.
- **Decision**: Implemented an automated dual-mode database client. If `SUPABASE_URL` and `SUPABASE_KEY` are provided, it executes queries against PostgreSQL; otherwise, it seamlessly falls back to an in-process JSON store with identical async interfaces. Full SQL schema migrations are included in `server/src/db/migrations.sql`.

---

## 3. What AI Tools Got Wrong on the First Attempt & How We Corrected It

During the initial exploration of the mock store, AI tools made several critical false assumptions:

### Mistake 1: Assuming Price & Stock Were Available via Static JSON APIs
- **What AI Did**: The AI assumed that since `/api/catalog` and `/api/product/:id` exist, price and stock could be scraped via a simple `axios.get()` or `fetch()`.
- **Why It Failed**: The mock store deliberately stripped price and stock from the static JSON responses. Attempting to parse the initial HTML yielded only an empty React root container (`<div id="root"></div>`).
- **Correction**: We inspected the JavaScript bundle, discovering that price resolution requires client-side execution, WebAssembly proof-of-work, and a token exchange. We switched to Playwright for the price extraction phase.

### Mistake 2: Falling for Decoy Honeypot Prices
- **What AI Did**: When inspecting the DOM after clicking reveal, the AI wrote CSS selectors such as:
  ```javascript
  const price = await page.locator(".price-value").innerText();
  // OR
  const price = await page.locator("[data-price='true']").innerText();
  ```
- **Why It Failed**: The mock store intentionally creates hidden decoy elements with `.price-value` and `data-price="true"`. These contain fake prices (e.g. ₹11,550 instead of ₹14,293).
- **Correction**: We inspected the computed styles of each child inside `.price-main` and explicitly excluded elements with `display: none`, `aria-hidden="true"`, or known decoy class names, extracting only the visibly rendered price container.

### Mistake 3: Failing to Trigger the "Reveal Price" Button Due to Mouse Telemetry
- **What AI Did**: The AI simply dispatched `await page.click("button:has-text('Reveal price')")`.
- **Why It Failed**: The button remained disabled (`disabled` attribute). Clicking it did nothing because the client tracker (`class Ar`) required 8+ cursor movements and 600ms dwell time within the price box.
- **Correction**: We implemented `simulateMouseHover()`, generating a multi-point smooth path across the price container's bounding box and awaiting `waitForFunction` until the button was verified enabled.

### Mistake 4: Getting Blocked by Late Cookie Overlay Popups
- **What AI Did**: The AI checked for the cookie banner once upon page load.
- **Why It Failed**: The cookie banner is set with a randomized `setTimeout(..., Gn + Math.random() * (Kn - Gn))`. It frequently appeared *after* page load, covering the reveal button with a focus-trapping modal and failing the click action.
- **Correction**: We integrated cookie dismissal checks right before cursor interaction and immediately before the button click, with automatic retry handling if interrupted.

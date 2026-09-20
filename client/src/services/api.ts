import { TrackedProduct, CatalogItem, ProductDetails, PriceHistory, ScrapeLog, StoreHealth } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const api = {
  // Tracked products
  async getTrackedProducts(): Promise<TrackedProduct[]> {
    const res = await fetch(`${API_BASE}/products/tracked`);
    const data = await res.json();
    return data.products || [];
  },

  // Search catalog via lightweight HTTP
  async searchCatalog(q: string): Promise<CatalogItem[]> {
    const res = await fetch(`${API_BASE}/products/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.items || [];
  },

  // Add product to tracking
  async trackProduct(productId: number, scrapeIntervalHours = 2): Promise<TrackedProduct> {
    const res = await fetch(`${API_BASE}/products/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, scrapeIntervalHours })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to track product");
    return data.product;
  },

  // Untrack product
  async untrackProduct(productId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to untrack product");
  },

  // Get full details, history, and logs for a product
  async getProduct(productId: number): Promise<{
    product: TrackedProduct;
    details: ProductDetails | null;
    history: PriceHistory[];
    logs: ScrapeLog[];
  }> {
    const res = await fetch(`${API_BASE}/products/${productId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch product details");
    return data;
  },

  // Trigger manual scrape
  async triggerScrape(productId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/scrape/product/${productId}`, {
      method: "POST"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Scrape failed");
    return data;
  },

  // Trigger global cron scrape
  async triggerCronScrape(secret?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/scrape/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-cron-secret": secret } : {})
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Cron trigger failed");
    return data;
  },

  // Store & system health
  async getStoreHealth(): Promise<{
    status: string;
    database: { provider: string; isUsingSupabase: boolean };
    store: StoreHealth;
  }> {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  },

  // Global recent logs
  async getRecentLogs(limit = 20): Promise<ScrapeLog[]> {
    const res = await fetch(`${API_BASE}/scrape/logs/recent?limit=${limit}`);
    const data = await res.json();
    return data.logs || [];
  }
};

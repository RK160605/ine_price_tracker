import { config } from "../config.js";

export interface CatalogItem {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  description: string;
}

export interface CatalogResponse {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
  items: CatalogItem[];
}

export interface ProductDetails extends CatalogItem {
  specs: Record<string, any>;
  reviews: Array<{
    id: string;
    author: string;
    rating: number;
    title: string;
    body: string;
    date: string;
    verifiedPurchase: boolean;
    helpfulVotes: number;
  }>;
}

class CatalogService {
  private cache: CatalogItem[] = [];
  private cacheExpiry = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Fetch catalog from mock store via lightweight HTTP GET
   */
  async fetchCatalogPage(page = 1, pageSize = 50): Promise<CatalogResponse> {
    const url = `${config.mockStoreUrl}/api/catalog?page=${page}&pageSize=${pageSize}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "INE-Price-Tracker/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch catalog from ${url}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as CatalogResponse;
  }

  /**
   * Loads or refreshes full catalog into memory for fast search
   */
  async ensureCatalogCached(): Promise<CatalogItem[]> {
    const now = Date.now();
    if (this.cache.length > 0 && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      // Fetch the first 2 pages (100 products) for fast, responsive search
      const page1 = await this.fetchCatalogPage(1, 50);
      let allItems = [...page1.items];

      if (page1.pages > 1) {
        try {
          const page2 = await this.fetchCatalogPage(2, 50);
          allItems = [...allItems, ...page2.items];
        } catch (e) {
          // Soft fail for page 2 if store rate limits
        }
      }

      this.cache = allItems;
      this.cacheExpiry = now + this.CACHE_TTL_MS;
      return this.cache;
    } catch (err) {
      if (this.cache.length > 0) return this.cache;
      throw err;
    }
  }

  /**
   * Search catalog by partial or full product name, brand, category, or SKU
   */
  async searchProducts(query: string, limit = 20): Promise<CatalogItem[]> {
    const items = await this.ensureCatalogCached();
    if (!query || query.trim().length === 0) {
      return items.slice(0, limit);
    }

    const q = query.toLowerCase().trim();
    const matches = items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q)
    );

    return matches.slice(0, limit);
  }

  /**
   * Fetch single product details (specs, reviews, sku) via lightweight HTTP GET
   */
  async getProductDetails(productId: number): Promise<ProductDetails> {
    const url = `${config.mockStoreUrl}/api/product/${productId}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "INE-Price-Tracker/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product ${productId} details: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as ProductDetails;
  }

  /**
   * Health and store structure check (Bonus feature)
   */
  async checkStoreHealth(): Promise<{
    reachable: boolean;
    catalogOk: boolean;
    sampleProductOk: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const cat = await this.fetchCatalogPage(1, 1);
      const catalogOk = cat.items && cat.items.length > 0;
      let sampleProductOk = false;
      if (catalogOk) {
        const sample = await this.getProductDetails(cat.items[0].id);
        sampleProductOk = !!sample.name && !!sample.sku;
      }

      return {
        reachable: true,
        catalogOk,
        sampleProductOk,
        latencyMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        reachable: false,
        catalogOk: false,
        sampleProductOk: false,
        latencyMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const catalogService = new CatalogService();

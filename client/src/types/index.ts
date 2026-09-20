export interface TrackedProduct {
  id: string;
  product_id: number;
  name: string;
  brand: string;
  category: string;
  sku: string;
  image_url?: string;
  current_price: number | null;
  mrp: number | null;
  current_stock: number | null;
  stock_status: string | null;
  last_scraped_at: string | null;
  scrape_interval_hours: number;
  is_active: boolean;
  created_at: string;
}

export interface PriceHistory {
  id: string;
  product_id: number;
  price: number;
  stock: number;
  stock_status: string;
  mrp: number | null;
  discount_pct: number | null;
  created_at: string;
}

export interface ScrapeLog {
  id: string;
  product_id: number;
  attempt_number: number;
  status: "SUCCESS" | "RETRYING" | "FAILED";
  duration_ms: number;
  price: number | null;
  stock: number | null;
  error_message: string | null;
  strategy: string;
  created_at: string;
}

export interface CatalogItem {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  description: string;
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

export interface StoreHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  reachable: boolean;
  catalogOk: boolean;
  sampleProductOk: boolean;
  latencyMs: number;
  error?: string;
}

export interface AlertRule {
  id: string;
  product_id: number;
  target_price: number | null;
  notify_email: string | null;
  alert_type: "PRICE_DROP" | "BACK_IN_STOCK";
  is_triggered: boolean;
  created_at: string;
}

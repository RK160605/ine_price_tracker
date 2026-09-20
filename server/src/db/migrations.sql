-- ==============================================================================
-- INE Product Price Tracker - Supabase SQL Schema
-- Run this script in the Supabase SQL Editor to set up all tables and indexes.
-- ==============================================================================

-- 1. Tracked Products Table
CREATE TABLE IF NOT EXISTS tracked_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT NOT NULL,
  image_url TEXT,
  current_price INTEGER,
  mrp INTEGER,
  current_stock INTEGER,
  stock_status TEXT,
  last_scraped_at TIMESTAMPTZ,
  scrape_interval_hours INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Price History Table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES tracked_products(product_id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  stock_status TEXT,
  mrp INTEGER,
  discount_pct INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scrape Logs Table (Audit trail of every scrape attempt)
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES tracked_products(product_id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'RETRYING', 'FAILED')),
  duration_ms INTEGER,
  price INTEGER,
  stock INTEGER,
  error_message TEXT,
  strategy TEXT DEFAULT 'PLAYWRIGHT_HEADLESS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES tracked_products(product_id) ON DELETE CASCADE,
  target_price INTEGER,
  notify_email TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('PRICE_DROP', 'BACK_IN_STOCK')),
  is_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_tracked_products_active ON tracked_products(is_active);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product ON scrape_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id, is_triggered);

-- Enable Row Level Security (RLS) with open read/write for public app usage
ALTER TABLE tracked_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on tracked_products" ON tracked_products FOR SELECT USING (true);
CREATE POLICY "Allow public insert on tracked_products" ON tracked_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on tracked_products" ON tracked_products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on tracked_products" ON tracked_products FOR DELETE USING (true);

CREATE POLICY "Allow public read access on price_history" ON price_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert on price_history" ON price_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on scrape_logs" ON scrape_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on scrape_logs" ON scrape_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on alerts" ON alerts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on alerts" ON alerts FOR DELETE USING (true);

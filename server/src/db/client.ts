import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { TrackedProduct, PriceHistory, ScrapeLog, AlertRule } from "./schema.js";

interface LocalDatabase {
  tracked_products: TrackedProduct[];
  price_history: PriceHistory[];
  scrape_logs: ScrapeLog[];
  alerts: AlertRule[];
}

class DatabaseManager {
  private supabase: SupabaseClient | null = null;
  private localDbPath: string;
  private isUsingSupabase = false;

  constructor() {
    this.localDbPath = path.resolve(process.cwd(), "data", "db.json");
    this.init();
  }

  private init() {
    if (config.supabaseUrl && config.supabaseKey) {
      try {
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
        this.isUsingSupabase = true;
        console.log("Connected to Supabase PostgreSQL database.");
      } catch (err) {
        console.warn("Failed to initialize Supabase client, falling back to local storage:", err);
        this.isUsingSupabase = false;
      }
    } else {
      console.log("No Supabase credentials detected. Running in Local Storage mode (data/db.json).");
      this.isUsingSupabase = false;
    }

    if (!this.isUsingSupabase) {
      this.ensureLocalDb();
    }
  }

  private ensureLocalDb() {
    const dir = path.dirname(this.localDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.localDbPath)) {
      const initialData: LocalDatabase = {
        tracked_products: [],
        price_history: [],
        scrape_logs: [],
        alerts: []
      };
      fs.writeFileSync(this.localDbPath, JSON.stringify(initialData, null, 2), "utf-8");
    }
  }

  private readLocalDb(): LocalDatabase {
    this.ensureLocalDb();
    try {
      const content = fs.readFileSync(this.localDbPath, "utf-8");
      return JSON.parse(content);
    } catch (err) {
      console.error("Error reading local db file:", err);
      return { tracked_products: [], price_history: [], scrape_logs: [], alerts: [] };
    }
  }

  private writeLocalDb(data: LocalDatabase) {
    this.ensureLocalDb();
    fs.writeFileSync(this.localDbPath, JSON.stringify(data, null, 2), "utf-8");
  }

  public getStatus() {
    return {
      provider: this.isUsingSupabase ? "supabase" : "local_file",
      isUsingSupabase: this.isUsingSupabase
    };
  }

  // --- Tracked Products ---

  async getTrackedProducts(): Promise<TrackedProduct[]> {
    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("tracked_products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as TrackedProduct[]) || [];
    } else {
      const db = this.readLocalDb();
      return [...db.tracked_products].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  }

  async getTrackedProduct(productId: number): Promise<TrackedProduct | null> {
    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("tracked_products")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      return (data as TrackedProduct) || null;
    } else {
      const db = this.readLocalDb();
      return db.tracked_products.find(p => p.product_id === productId) || null;
    }
  }

  async addTrackedProduct(
    product: Omit<TrackedProduct, "id" | "created_at" | "is_active">
  ): Promise<TrackedProduct> {
    const newRecord: TrackedProduct = {
      ...product,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      is_active: true,
      created_at: new Date().toISOString()
    };

    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("tracked_products")
        .upsert(newRecord, { onConflict: "product_id" })
        .select()
        .single();
      if (error) throw error;
      return data as TrackedProduct;
    } else {
      const db = this.readLocalDb();
      const existingIdx = db.tracked_products.findIndex(p => p.product_id === product.product_id);
      if (existingIdx >= 0) {
        db.tracked_products[existingIdx] = {
          ...db.tracked_products[existingIdx],
          ...newRecord,
          id: db.tracked_products[existingIdx].id
        };
        this.writeLocalDb(db);
        return db.tracked_products[existingIdx];
      } else {
        db.tracked_products.push(newRecord);
        this.writeLocalDb(db);
        return newRecord;
      }
    }
  }

  async updateTrackedProduct(productId: number, updates: Partial<TrackedProduct>): Promise<void> {
    if (this.isUsingSupabase && this.supabase) {
      const { error } = await this.supabase
        .from("tracked_products")
        .update(updates)
        .eq("product_id", productId);
      if (error) throw error;
    } else {
      const db = this.readLocalDb();
      const idx = db.tracked_products.findIndex(p => p.product_id === productId);
      if (idx >= 0) {
        db.tracked_products[idx] = { ...db.tracked_products[idx], ...updates };
        this.writeLocalDb(db);
      }
    }
  }

  async removeTrackedProduct(productId: number): Promise<void> {
    if (this.isUsingSupabase && this.supabase) {
      const { error } = await this.supabase
        .from("tracked_products")
        .delete()
        .eq("product_id", productId);
      if (error) throw error;
    } else {
      const db = this.readLocalDb();
      db.tracked_products = db.tracked_products.filter(p => p.product_id !== productId);
      db.price_history = db.price_history.filter(h => h.product_id !== productId);
      db.scrape_logs = db.scrape_logs.filter(l => l.product_id !== productId);
      db.alerts = db.alerts.filter(a => a.product_id !== productId);
      this.writeLocalDb(db);
    }
  }

  // --- Price History ---

  async addPriceHistory(
    history: Omit<PriceHistory, "id" | "created_at">
  ): Promise<PriceHistory> {
    const record: PriceHistory = {
      ...history,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      created_at: new Date().toISOString()
    };

    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("price_history")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as PriceHistory;
    } else {
      const db = this.readLocalDb();
      db.price_history.push(record);
      this.writeLocalDb(db);
      return record;
    }
  }

  async getPriceHistory(productId: number, limit = 50): Promise<PriceHistory[]> {
    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("price_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data as PriceHistory[]) || [];
    } else {
      const db = this.readLocalDb();
      return db.price_history
        .filter(h => h.product_id === productId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-limit);
    }
  }

  // --- Scrape Logs ---

  async addScrapeLog(
    log: Omit<ScrapeLog, "id" | "created_at">
  ): Promise<ScrapeLog> {
    const record: ScrapeLog = {
      ...log,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      created_at: new Date().toISOString()
    };

    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("scrape_logs")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as ScrapeLog;
    } else {
      const db = this.readLocalDb();
      db.scrape_logs.push(record);
      this.writeLocalDb(db);
      return record;
    }
  }

  async getScrapeLogs(productId: number, limit = 50): Promise<ScrapeLog[]> {
    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("scrape_logs")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as ScrapeLog[]) || [];
    } else {
      const db = this.readLocalDb();
      return db.scrape_logs
        .filter(l => l.product_id === productId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    }
  }

  async getAllRecentLogs(limit = 30): Promise<ScrapeLog[]> {
    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("scrape_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as ScrapeLog[]) || [];
    } else {
      const db = this.readLocalDb();
      return [...db.scrape_logs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    }
  }

  // --- Alerts (Bonus) ---

  async getAlerts(productId?: number): Promise<AlertRule[]> {
    if (this.isUsingSupabase && this.supabase) {
      let query = this.supabase.from("alerts").select("*");
      if (productId) {
        query = query.eq("product_id", productId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as AlertRule[]) || [];
    } else {
      const db = this.readLocalDb();
      if (productId) {
        return db.alerts.filter(a => a.product_id === productId);
      }
      return db.alerts;
    }
  }

  async addAlert(alert: Omit<AlertRule, "id" | "created_at" | "is_triggered">): Promise<AlertRule> {
    const record: AlertRule = {
      ...alert,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      is_triggered: false,
      created_at: new Date().toISOString()
    };

    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from("alerts")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as AlertRule;
    } else {
      const db = this.readLocalDb();
      db.alerts.push(record);
      this.writeLocalDb(db);
      return record;
    }
  }
}

export const db = new DatabaseManager();

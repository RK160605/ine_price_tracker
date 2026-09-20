import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingDown,
  Shield,
  HelpCircle,
  ExternalLink,
  Zap,
  Clock,
  Sparkles,
  Info,
  Sparkle
} from "lucide-react";
import { TrackedProduct, StoreHealth, ScrapeLog } from "./types";
import { api } from "./services/api";
import { Navbar } from "./components/Navbar";
import { TrackedProductCard } from "./components/TrackedProductCard";
import { ProductSearchModal } from "./components/ProductSearchModal";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { ScrapeLogsTable } from "./components/ScrapeLogsTable";

export function App() {
  const [trackedProducts, setTrackedProducts] = useState<TrackedProduct[]>([]);
  const [recentLogs, setRecentLogs] = useState<ScrapeLog[]>([]);
  const [storeHealth, setStoreHealth] = useState<StoreHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<TrackedProduct | null>(null);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [cronNotice, setCronNotice] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);

  // Load all initial data
  const loadDashboardData = async () => {
    try {
      const [products, logs, health] = await Promise.all([
        api.getTrackedProducts(),
        api.getRecentLogs(15),
        api.getStoreHealth().catch(() => null)
      ]);

      setTrackedProducts(products);
      setRecentLogs(logs);
      if (health) setStoreHealth(health.store);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Untrack product
  const handleUntrack = async (productId: number) => {
    try {
      await api.untrackProduct(productId);
      setTrackedProducts(prev => prev.filter(p => p.product_id !== productId));
      if (selectedProduct?.product_id === productId) {
        setSelectedProduct(null);
      }
    } catch (err: any) {
      alert(`Failed to untrack: ${err.message}`);
    }
  };

  // Trigger global scheduled cron scrape
  const handleTriggerCron = async () => {
    setIsTriggeringCron(true);
    setCronNotice(null);
    try {
      const res = await api.triggerCronScrape("ine-scrape-cron-secret-2026");
      setCronNotice(`Cron cycle executed successfully: Processed ${res.summary.total} products.`);
      await loadDashboardData();
    } catch (err: any) {
      setCronNotice(`Cron trigger failed: ${err.message}`);
    } finally {
      setIsTriggeringCron(false);
      setTimeout(() => setCronNotice(null), 6000);
    }
  };

  // Filter products
  const categories = ["All", ...Array.from(new Set(trackedProducts.map(p => p.category)))];
  const filteredProducts = trackedProducts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const totalTracked = trackedProducts.length;
  const inStockCount = trackedProducts.filter(
    p => p.current_stock !== null && p.current_stock > 0
  ).length;
  const outOfStockCount = trackedProducts.filter(
    p => p.current_stock === 0 || p.stock_status?.toLowerCase().includes("out of stock")
  ).length;
  const successRate = recentLogs.length > 0
    ? Math.round((recentLogs.filter(l => l.status === "SUCCESS").length / recentLogs.length) * 100)
    : 100;

  return (
    <div 
      style={{
        backgroundColor: '#3b0824',
        backgroundImage: 'radial-gradient(at 12% 15%, #6a0d42 0px, transparent 55%), radial-gradient(at 88% 12%, #7a124e 0px, transparent 55%), radial-gradient(at 50% 45%, #520b33 0px, transparent 65%), radial-gradient(at 15% 85%, #680d40 0px, transparent 60%), radial-gradient(at 85% 85%, #801351 0px, transparent 55%)',
        backgroundAttachment: 'fixed'
      }}
      className="min-h-screen bg-velvet-grid text-pink-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] relative selection:bg-pink-600 selection:text-white"
    >
      {/* Ambient Burgundy & Royal Purple Glow Lights */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse-burgundy"></div>
      <div className="fixed bottom-10 right-10 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="fixed top-1/2 right-1/4 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Navigation */}
      <Navbar
        health={storeHealth}
        onOpenSearch={() => setIsSearchOpen(true)}
        onTriggerCron={handleTriggerCron}
        isTriggeringCron={isTriggeringCron}
      />

      {/* Cron Notification Toast */}
      {cronNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 w-full animate-fade-in">
          <div className="p-3.5 bg-pink-950/90 border border-pink-700/80 rounded-2xl text-xs font-mono text-pink-200 flex items-center justify-between shadow-xl shadow-pink-950/60">
            <div className="flex items-center space-x-2.5">
              <Zap className="w-4 h-4 text-pink-400 shrink-0 animate-bounce" />
              <span>{cronNotice}</span>
            </div>
            <button onClick={() => setCronNotice(null)} className="text-pink-400 hover:text-white font-bold px-2">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Banner & Stats */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4d0c32]/95 via-[#3d0928]/90 to-[#2c051c]/95 border border-pink-500/35 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-gradient-to-br from-pink-500/30 to-rose-600/30 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-pink-600/20 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-pink-900/60 border border-pink-400/40 text-pink-200 text-xs font-bold shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                <span>Autonomous Web Scraping Engine · Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                Product Price & Stock Tracker
              </h1>
              <p className="text-sm text-pink-100/80 leading-relaxed">
                Reliable unattended scraping against INE's mock storefront. Handles WebAssembly
                proof-of-work challenges, simulated mouse dwell, decoy honeypot evasion, and
                transient store errors on a 2-hour schedule.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                <button
                  onClick={() => setShowArchitectureModal(true)}
                  className="flex items-center space-x-1.5 text-pink-200 hover:text-white font-bold underline decoration-pink-400/50 hover:decoration-pink-300 transition-all"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>How Scraper Solves Anti-Bot Challenges</span>
                </button>
                <span className="text-pink-400/40">|</span>
                <span className="text-pink-200/90">
                  Fixed Schedule: <strong className="text-white font-bold">Every 2 Hours</strong>
                </span>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 w-full md:w-auto">
              <div className="p-4 rounded-2xl bg-[#520f36]/70 border border-pink-400/30 backdrop-blur-md shadow-lg">
                <span className="text-[11px] font-bold text-pink-200/80 uppercase tracking-wider">Tracked</span>
                <p className="text-2xl font-black text-white font-mono mt-0.5">{totalTracked}</p>
                <span className="text-[10px] text-pink-300/70">Products</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#520f36]/70 border border-pink-400/30 backdrop-blur-md shadow-lg">
                <span className="text-[11px] font-bold text-pink-200/80 uppercase tracking-wider">In Stock</span>
                <p className="text-2xl font-black text-emerald-300 font-mono mt-0.5">{inStockCount}</p>
                <span className="text-[10px] text-pink-300/70">{outOfStockCount} Out of stock</span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#520f36]/70 border border-pink-400/30 backdrop-blur-md shadow-lg">
                <span className="text-[11px] font-bold text-pink-200/80 uppercase tracking-wider">Success Rate</span>
                <p className="text-2xl font-black text-pink-200 font-mono mt-0.5">{successRate}%</p>
                <span className="text-[10px] text-pink-300/70">Recent scrapes</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-pink-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filter tracked products by name, brand, or SKU..."
              className="w-full pl-11 pr-4 py-2.5 bg-[#420a2a]/80 border border-pink-500/30 rounded-2xl text-xs sm:text-sm text-white placeholder-pink-200/50 focus:outline-none focus:ring-2 focus:ring-pink-400/60 focus:border-pink-300 backdrop-blur-md transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/40"
                      : "bg-[#420a2a] text-pink-200 hover:text-white border border-pink-500/30 hover:border-pink-400/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-pink-600/40 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Track Item</span>
            </button>
          </div>
        </section>

        {/* Tracked Products Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center space-x-2.5">
              <span>Tracked Store Items</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-950/80 text-pink-300 border border-pink-500/30 font-mono font-bold">
                {filteredProducts.length}
              </span>
            </h2>
            <button
              onClick={loadDashboardData}
              className="text-xs text-pink-300/70 hover:text-pink-200 flex items-center space-x-1 font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Status</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-72 rounded-3xl bg-[#1e0517]/50 border border-pink-500/20 animate-pulse"></div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center rounded-3xl border border-dashed border-pink-500/30 bg-[#180312]/30 space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/15 text-pink-400 flex items-center justify-center mx-auto border border-pink-500/30 shadow-lg">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No tracked products found</h3>
                <p className="text-xs text-pink-300/60 mt-1">
                  {searchFilter ? "Try adjusting your search query" : "Search INE mock store and pick products to track their price"}
                </p>
              </div>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold inline-flex items-center space-x-2 shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-purple-500 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Track Your First Product</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <TrackedProductCard
                  key={product.id}
                  product={product}
                  onSelect={setSelectedProduct}
                  onScrapeUpdated={loadDashboardData}
                  onUntrack={handleUntrack}
                />
              ))}
            </div>
          )}
        </section>

        {/* Global Recent Scrape Audit Logs */}
        <section className="space-y-3.5 pt-6 border-t border-pink-950/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-pink-400" />
                <span>Scrape Attempt Audit Trail</span>
              </h2>
              <p className="text-xs text-pink-300/60 mt-0.5">
                Every scrape attempt (SUCCESS, RETRYING, FAILED) is recorded honestly with exact error reasons
              </p>
            </div>

            <span className="text-[11px] font-mono text-pink-400/70 bg-pink-950/60 px-2.5 py-1 rounded-full border border-pink-500/20">
              Honest Audit Trail
            </span>
          </div>

          <ScrapeLogsTable logs={recentLogs} showProductId={true} />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-pink-500/20 bg-[#250517]/90 backdrop-blur-md py-8 text-xs text-pink-300/60 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="font-medium text-pink-200/70">
            INE Software Engineer Intern Assignment — Product Price Tracker (Web Scraping)
          </p>
          <p className="text-pink-300/40 text-[11px]">
            Target Store: <a href="https://demo.inelabteamdev.com" target="_blank" rel="noreferrer" className="underline hover:text-pink-200">demo.inelabteamdev.com</a> · Built with React, Playwright, Node.js Express, and Supabase PostgreSQL.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ProductSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onProductTracked={() => {
          setIsSearchOpen(false);
          loadDashboardData();
        }}
        trackedProductIds={trackedProducts.map(p => p.product_id)}
      />

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onScrapeUpdated={loadDashboardData}
        />
      )}

      {/* Architecture & Reliability Explanation Modal */}
      {showArchitectureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-2xl bg-[#1c0414] border border-pink-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-pink-950/80 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-pink-400" />
                <span>Scraping Reliability Design Note</span>
              </h3>
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="p-1.5 rounded-lg text-pink-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-pink-100/90 leading-relaxed overflow-y-auto max-h-[70vh]">
              <div>
                <strong className="text-pink-300 font-bold">1. Anti-Bot Mouse Telemetry Bypass:</strong>
                <p className="mt-0.5 text-pink-200/70">
                  The store runs an in-memory client tracker (<code className="text-pink-200 font-mono">Ar</code>) requiring &gt;= 8 mouse moves over &gt;= 600ms dwell time before enabling the "Reveal price" button. Our Playwright engine simulates human-like mouse trajectories with micro-pauses to reliably unlock the button.
                </p>
              </div>

              <div>
                <strong className="text-pink-300 font-bold">2. Decoy Honeypot Filtering:</strong>
                <p className="mt-0.5 text-pink-200/70">
                  Naive scrapers targeting <code className="text-pink-200 font-mono">.price-value</code> or <code className="text-pink-200 font-mono">[data-price="true"]</code> capture intentionally planted fake prices. Our scraper verifies computed visibility, disregards zero-width characters (<code className="text-pink-200 font-mono">\u200b</code>), and extracts the genuine price element.
                </p>
              </div>

              <div>
                <strong className="text-pink-300 font-bold">3. Dynamic Cookie Overlay Dismissal:</strong>
                <p className="mt-0.5 text-pink-200/70">
                  The store spawns a focus-trapping modal (<code className="text-pink-200 font-mono">.cookie-banner</code>) randomly. The scraper intercepts and dismisses it before and during interactions.
                </p>
              </div>

              <div>
                <strong className="text-pink-300 font-bold">4. Multi-Layer Exponential Backoff & Jitter:</strong>
                <p className="mt-0.5 text-pink-200/70">
                  When the store throttles with 429 or 500 errors, our scraper retries with exponential backoff and randomized jitter (<code className="text-pink-200 font-mono">2^attempt * 500ms + jitter</code>), recording every attempt honestly in the audit log.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-pink-950 flex justify-end">
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-600/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;

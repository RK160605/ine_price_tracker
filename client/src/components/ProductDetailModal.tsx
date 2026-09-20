import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Star,
  FileText,
  History,
  Activity,
  Package
} from "lucide-react";
import { TrackedProduct, ProductDetails, PriceHistory, ScrapeLog } from "../types";
import { api } from "../services/api";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { ScrapeLogsTable } from "./ScrapeLogsTable";
import { getProductImage } from "../utils/productImages";

interface ProductDetailModalProps {
  product: TrackedProduct;
  onClose: () => void;
  onScrapeUpdated: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onScrapeUpdated
}) => {
  const [activeTab, setActiveTab] = useState<"history" | "logs" | "details">("history");
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProduct(product.product_id);
      setHistory(data.history || []);
      setLogs(data.logs || []);
      setDetails(data.details || null);
    } catch (err) {
      console.error("Failed to load product details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [product.product_id]);

  const handleManualScrape = async () => {
    setIsScraping(true);
    setScrapeMessage(null);
    try {
      const res = await api.triggerScrape(product.product_id);
      setScrapeMessage(`Scrape successful: ₹${res.result.data.price}`);
      await loadData();
      onScrapeUpdated();
    } catch (err: any) {
      setScrapeMessage(`Scrape failed: ${err.message}`);
      await loadData();
    } finally {
      setIsScraping(false);
    }
  };

  const isOutOfStock = product.current_stock === 0 || product.stock_status?.toLowerCase().includes("out of stock");
  const imageUrl = getProductImage(product.category, product.name, product.sku);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] glass-panel-burgundy bg-[#180310]/95 border border-pink-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        
        {/* Product Hero Image Header Banner */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-950 shrink-0">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover object-center brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#180310] via-[#180310]/60 to-black/50"></div>

          {/* Top action row */}
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
            <button
              onClick={handleManualScrape}
              disabled={isScraping}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 disabled:opacity-50 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? "animate-spin" : ""}`} />
              <span>{isScraping ? "Scraping..." : "Scrape Now"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-black/60 text-pink-300 hover:text-white hover:bg-black/80 border border-pink-500/20 backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hero text overlay */}
          <div className="absolute bottom-4 left-6 right-6 z-10 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-pink-950/90 text-pink-300 border border-pink-500/40 uppercase tracking-wider backdrop-blur-md">
                {product.category}
              </span>
              <span className="text-xs text-pink-200/70 font-mono bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                SKU: {product.sku}
              </span>
              <span className="text-xs text-pink-300/80 font-medium">
                · {product.brand}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
              {product.name}
            </h2>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-[#12020d] border-b border-pink-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-5">
            <div>
              <span className="text-pink-300/70">Current Price: </span>
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-100 to-fuchsia-200 font-mono">
                {product.current_price !== null ? `₹${product.current_price.toLocaleString("en-IN")}` : "Pending"}
              </span>
              {product.mrp && product.current_price && product.mrp > product.current_price && (
                <span className="ml-2 text-pink-400/60 line-through font-mono">
                  ₹{product.mrp.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            <div>
              <span className="text-pink-300/70">Stock: </span>
              {isOutOfStock ? (
                <span className="text-rose-400 font-bold">Out of stock</span>
              ) : (
                <span className="text-emerald-400 font-bold">
                  {product.current_stock ? `${product.current_stock} units` : "In stock"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-pink-300/80">
            <span>Schedule: <strong className="text-pink-100">Every {product.scrape_interval_hours}h</strong></span>
            <a
              href={`https://demo.inelabteamdev.com/product/${product.product_id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-pink-400 hover:text-pink-300 font-semibold"
            >
              <span>Storefront Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {scrapeMessage && (
          <div className="px-6 py-2 bg-pink-950/90 text-xs font-mono border-b border-pink-900/60 text-pink-200 flex items-center justify-between">
            <span>{scrapeMessage}</span>
            <button onClick={() => setScrapeMessage(null)} className="text-pink-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-pink-950/80 flex space-x-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === "history"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-pink-400/60 hover:text-pink-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Price History ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === "logs"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-pink-400/60 hover:text-pink-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Scrape Audit Logs ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("details")}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === "details"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-pink-400/60 hover:text-pink-200"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Specifications & Reviews</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-16 text-center text-pink-300/50 text-xs">
              Loading product data...
            </div>
          ) : (
            <>
              {activeTab === "history" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300/80 mb-2">
                      Price & Stock Trend Over Time
                    </h3>
                    <PriceHistoryChart history={history} />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300/80 mb-2">
                      Historical Price Records
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-pink-950/80 bg-[#12020d]/80 text-xs shadow-md">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="bg-[#180310] text-pink-300/80 font-sans border-b border-pink-950">
                          <tr>
                            <th className="py-2.5 px-3.5">Date & Time</th>
                            <th className="py-2.5 px-3">Price</th>
                            <th className="py-2.5 px-3">Stock Level</th>
                            <th className="py-2.5 px-3">Discount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-950/50">
                          {history.slice().reverse().map(h => (
                            <tr key={h.id} className="hover:bg-pink-950/30 transition-colors">
                              <td className="py-2.5 px-3.5 text-pink-100">
                                {new Date(h.created_at).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-pink-300">
                                ₹{h.price.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={h.stock > 0 ? "text-pink-200" : "text-rose-400"}>
                                  {h.stock > 0 ? `${h.stock} units` : "Out of stock"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-pink-300/70">
                                {h.discount_pct ? `${h.discount_pct}% off` : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300/80">
                      Scrape Attempt Audit Trail
                    </h3>
                    <span className="text-[11px] text-pink-400/60">
                      All attempts (SUCCESS, RETRYING, FAILED) recorded honestly
                    </span>
                  </div>
                  <ScrapeLogsTable logs={logs} />
                </div>
              )}

              {activeTab === "details" && details && (
                <div className="space-y-6 text-xs">
                  {/* Specifications */}
                  {details.specs && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300/80 mb-2">
                        Product Specifications
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#12020d]/80 p-4 rounded-2xl border border-pink-950">
                        {Object.entries(details.specs).map(([k, v]) => (
                          <div key={k} className="flex justify-between py-1.5 border-b border-pink-950/60 last:border-0">
                            <span className="text-pink-300/70 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                            <span className="text-pink-100 font-semibold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviews */}
                  {details.reviews && details.reviews.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300/80 mb-2">
                        Verified Store Reviews ({details.reviews.length})
                      </h3>
                      <div className="space-y-3">
                        {details.reviews.map(r => (
                          <div key={r.id} className="p-4 bg-[#12020d]/80 rounded-2xl border border-pink-950 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="flex text-amber-400">
                                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                                </div>
                                <span className="font-bold text-pink-100">{r.title}</span>
                              </div>
                              <span className="text-[10px] text-pink-400/60 font-mono">{r.date}</span>
                            </div>
                            <p className="text-pink-200/80 leading-relaxed">{r.body}</p>
                            <p className="text-[10px] text-pink-400/60 font-medium">
                              By {r.author} {r.verifiedPurchase && "· Verified purchase"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

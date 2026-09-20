import React, { useState } from "react";
import {
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Trash2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Tag
} from "lucide-react";
import { TrackedProduct } from "../types";
import { api } from "../services/api";
import { getProductImage } from "../utils/productImages";

interface TrackedProductCardProps {
  product: TrackedProduct;
  onSelect: (product: TrackedProduct) => void;
  onScrapeUpdated: () => void;
  onUntrack: (productId: number) => void;
}

export const TrackedProductCard: React.FC<TrackedProductCardProps> = ({
  product,
  onSelect,
  onScrapeUpdated,
  onUntrack
}) => {
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const handleManualScrape = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsScraping(true);
    setScrapeError(null);
    try {
      await api.triggerScrape(product.product_id);
      onScrapeUpdated();
    } catch (err: any) {
      setScrapeError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return "Never scraped";
    const date = new Date(isoString);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const isOutOfStock = product.current_stock === 0 || product.stock_status?.toLowerCase().includes("out of stock");
  const imageUrl = getProductImage(product.category, product.name, product.sku);

  return (
    <div
      onClick={() => onSelect(product)}
      className="group relative rounded-3xl glass-card-burgundy shadow-2xl transition-all duration-500 flex flex-col justify-between cursor-pointer overflow-hidden backdrop-blur-xl animate-slide-up"
    >
      {/* Top shimmer progress bar during live scrape */}
      {isScraping && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 animate-shimmer-wine z-20"></div>
      )}

      {/* Product Image Header with Gradient Overlay */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-950">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out brightness-90 group-hover:brightness-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14030d] via-transparent to-black/40"></div>

        {/* Category & SKU Pill */}
        <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-pink-950/80 text-pink-300 border border-pink-500/40 backdrop-blur-md uppercase tracking-wider shadow-md">
            {product.category}
          </span>
          <span className="text-[10px] text-slate-300 font-mono bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {product.sku}
          </span>
        </div>

        {/* Card Actions in top right */}
        <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleManualScrape}
            disabled={isScraping}
            title="Scrape current price now"
            className="p-2 rounded-xl bg-black/60 hover:bg-pink-900/80 text-pink-200 hover:text-white border border-pink-500/30 transition-all backdrop-blur-md disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? "animate-spin text-pink-400" : ""}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Stop tracking "${product.name}"?`)) {
                onUntrack(product.product_id);
              }
            }}
            title="Stop tracking"
            className="p-2 rounded-xl bg-black/60 hover:bg-rose-950/90 text-rose-300 hover:text-rose-100 border border-rose-500/30 transition-all backdrop-blur-md active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Product Content & Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <p className="text-xs text-pink-400 font-medium tracking-wide">{product.brand}</p>
          <h3 className="font-bold text-base text-white line-clamp-1 group-hover:text-pink-300 transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Price & Stock Display */}
        <div className="pt-3 border-t border-pink-950/80 space-y-2">
          {product.current_price !== null ? (
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-100 to-fuchsia-200 font-mono tracking-tight">
                  ₹{product.current_price.toLocaleString("en-IN")}
                </span>
                {product.mrp && product.mrp > product.current_price && (
                  <span className="text-xs text-pink-400/60 line-through font-mono">
                    ₹{product.mrp.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 mt-2">
                {/* Stock status badge */}
                {isOutOfStock ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold">
                    <AlertCircle className="w-3 h-3" />
                    <span>Out of Stock</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                    <CheckCircle className="w-3 h-3" />
                    <span>
                      {product.current_stock ? `${product.current_stock} in stock` : "In Stock"}
                    </span>
                  </span>
                )}

                {/* Discount percentage */}
                {product.mrp && product.current_price && product.mrp > product.current_price && (
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-500/30 shadow-sm">
                    {Math.round(((product.mrp - product.current_price) / product.mrp) * 100)}% OFF
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2">
              <span className="inline-flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Initial scrape pending...</span>
              </span>
            </div>
          )}

          {scrapeError && (
            <p className="text-[11px] text-rose-300 bg-rose-950/50 p-2 rounded-xl border border-rose-800/60 truncate">
              Scrape failed: {scrapeError}
            </p>
          )}
        </div>

        {/* Bottom row: Schedule and History Link */}
        <div className="pt-2 border-t border-pink-950/60 flex items-center justify-between text-xs text-pink-300/70">
          <div className="flex items-center space-x-1.5 text-pink-400/80">
            <Clock className="w-3.5 h-3.5" />
            <span>Checked {formatRelativeTime(product.last_scraped_at)}</span>
          </div>

          <div className="flex items-center space-x-1 text-pink-400 font-bold group-hover:text-pink-300 group-hover:translate-x-1 transition-all">
            <span>Details</span>
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

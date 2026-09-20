import React, { useState, useEffect } from "react";
import { Search, X, Plus, Check, Loader2, Tag, Layers, ArrowRight } from "lucide-react";
import { CatalogItem } from "../types";
import { api } from "../services/api";
import { getProductImage } from "../utils/productImages";

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductTracked: () => void;
  trackedProductIds: number[];
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  isOpen,
  onClose,
  onProductTracked,
  trackedProductIds
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [intervalHours, setIntervalHours] = useState<number>(2);

  useEffect(() => {
    if (!isOpen) return;
    const handler = setTimeout(async () => {
      setIsLoading(true);
      try {
        const items = await api.searchCatalog(query);
        setResults(items);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const categories = ["All", ...Array.from(new Set(results.map(r => r.category))).filter(Boolean)];
  const filtered = selectedCategory === "All" ? results : results.filter(r => r.category === selectedCategory);

  const handleTrack = async (item: CatalogItem) => {
    setTrackingId(item.id);
    try {
      await api.trackProduct(item.id, intervalHours);
      onProductTracked();
    } catch (err: any) {
      alert(`Error tracking product: ${err.message}`);
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-3xl max-h-[85vh] glass-panel-burgundy bg-[#180310]/95 border border-pink-500/25 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-pink-950/80 flex items-center justify-between bg-gradient-to-r from-pink-950/60 to-purple-950/60">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
              <span>Pick a Product from INE Store</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-semibold">
                Live Catalog
              </span>
            </h2>
            <p className="text-xs text-pink-300/70 mt-0.5">
              Search by product name, brand, or SKU
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-pink-300 hover:text-white hover:bg-pink-900/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar & filter controls */}
        <div className="p-4 bg-[#12020d]/80 border-b border-pink-950/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-pink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search e.g. 'Doorbell', 'Laptop', 'Water Bottle', 'LAR-10451'..."
              className="w-full pl-10 pr-10 py-2.5 bg-black/50 border border-pink-500/30 rounded-2xl text-sm text-white placeholder-pink-300/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400 transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips and Scrape Interval */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl transition-all font-medium ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/30 font-semibold"
                      : "bg-pink-950/40 text-pink-300 hover:text-white border border-pink-900/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5 text-pink-300/80">
              <span>Schedule:</span>
              <select
                value={intervalHours}
                onChange={e => setIntervalHours(Number(e.target.value))}
                className="bg-[#240518] border border-pink-500/30 rounded-xl px-2.5 py-1 text-pink-200 text-xs focus:outline-none focus:ring-1 focus:ring-pink-400 font-medium"
              >
                <option value={1}>Every 1 hour</option>
                <option value={2}>Every 2 hours (Default)</option>
                <option value={4}>Every 4 hours</option>
                <option value={12}>Every 12 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results List with Product Thumbnails */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-pink-950/50">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-pink-300/70 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
              <p className="text-xs">Searching store catalog...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-pink-300/50">
              <p className="text-sm">No products found matching "{query}"</p>
              <p className="text-xs mt-1 text-pink-300/40">Try searching for generic terms like 'audio', 'laptop', or 'bottle'</p>
            </div>
          ) : (
            filtered.map(item => {
              const isAlreadyTracked = trackedProductIds.includes(item.id);
              const isTracking = trackingId === item.id;
              const imgUrl = getProductImage(item.category, item.name, item.sku);

              return (
                <div
                  key={item.id}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-pink-950/40 border border-transparent hover:border-pink-500/20 transition-all group"
                >
                  {/* Image Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-pink-500/20 shadow-md">
                    <img
                      src={imgUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-950/80 text-pink-300 border border-pink-500/30">
                        {item.category}
                      </span>
                      <span className="text-xs text-pink-400 font-mono">
                        {item.sku}
                      </span>
                      <span className="text-xs text-pink-300/60 font-medium truncate">
                        · {item.brand}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-white truncate">{item.name}</h3>
                    <p className="text-xs text-pink-200/60 line-clamp-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-center self-center shrink-0">
                    {isAlreadyTracked ? (
                      <span className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Tracked</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTrack(item)}
                        disabled={isTracking}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-pink-600/30 active:scale-95 disabled:opacity-60"
                      >
                        {isTracking ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Track</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#0f020a] border-t border-pink-950/80 text-center text-xs text-pink-400/60">
          Real-time catalog from <span className="text-pink-300 font-mono">https://demo.inelabteamdev.com</span>
        </div>
      </div>
    </div>
  );
};

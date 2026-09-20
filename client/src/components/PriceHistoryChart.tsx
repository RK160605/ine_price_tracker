import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart
} from "recharts";
import { PriceHistory } from "../types";

interface PriceHistoryChartProps {
  history: PriceHistory[];
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-slate-800/80 rounded-xl bg-slate-900/30 text-slate-500 text-xs">
        <p>No price history recorded yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">Run a scrape to record the first price point.</p>
      </div>
    );
  }

  // Format chart data
  const data = history.map(item => {
    const d = new Date(item.created_at);
    return {
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
      price: item.price,
      stock: item.stock,
      stockStatus: item.stock_status,
      timestamp: d.getTime()
    };
  });

  const minPrice = Math.min(...data.map(d => d.price));
  const maxPrice = Math.max(...data.map(d => d.price));
  const priceMargin = Math.max(500, (maxPrice - minPrice) * 0.15);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="text-slate-400 font-mono">{p.date} at {p.time}</p>
          <div className="flex items-center justify-between space-x-3">
            <span className="text-slate-300">Price:</span>
            <span className="text-cyan-400 font-bold text-sm">
              ₹{p.price.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <span className="text-slate-300">Stock:</span>
            <span className={p.stock > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
              {p.stock > 0 ? `${p.stock} units` : "Out of stock"}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis
            yAxisId="priceAxis"
            domain={[Math.max(0, Math.floor(minPrice - priceMargin)), Math.ceil(maxPrice + priceMargin)]}
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
            tickFormatter={val => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="priceAxis"
            type="monotone"
            dataKey="price"
            stroke="#06b6d4"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#priceGradient)"
            dot={{ fill: "#06b6d4", strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: "#38bdf8", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

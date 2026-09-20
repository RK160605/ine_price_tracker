import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Cpu, ArrowUpRight } from "lucide-react";
import { ScrapeLog } from "../types";

interface ScrapeLogsTableProps {
  logs: ScrapeLog[];
  showProductId?: boolean;
}

export const ScrapeLogsTable: React.FC<ScrapeLogsTableProps> = ({ logs, showProductId = false }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="py-8 text-center text-pink-300/60 text-xs bg-[#380721]/50 rounded-2xl border border-pink-500/25">
        No scrape attempts logged yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-500/25 bg-[#380721]/60 backdrop-blur-md shadow-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#480a2b]/90 text-pink-200 font-semibold border-b border-pink-500/30">
          <tr>
            <th className="py-3 px-3.5">Timestamp</th>
            {showProductId && <th className="py-3 px-3">Product ID</th>}
            <th className="py-3 px-3">Outcome</th>
            <th className="py-3 px-3">Attempt</th>
            <th className="py-3 px-3">Duration</th>
            <th className="py-3 px-3">Scraped Price</th>
            <th className="py-3 px-3">Stock Level</th>
            <th className="py-3 px-3">Details / Errors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pink-900/40 font-mono text-[11px]">
          {logs.map(log => {
            const date = new Date(log.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

            return (
              <tr key={log.id} className="hover:bg-pink-900/30 transition-colors">
                {/* Timestamp */}
                <td className="py-2.5 px-3.5 whitespace-nowrap text-pink-100">
                  <span>{dateStr}</span> <span className="text-pink-300/60">{timeStr}</span>
                </td>

                {showProductId && (
                  <td className="py-2.5 px-3 whitespace-nowrap text-pink-300 font-semibold">
                    #{log.product_id}
                  </td>
                )}

                {/* Outcome Badge */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {log.status === "SUCCESS" && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-sans font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>SUCCESS</span>
                    </span>
                  )}
                  {log.status === "RETRYING" && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[10px] font-sans font-semibold">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>RETRYING</span>
                    </span>
                  )}
                  {log.status === "FAILED" && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25 text-[10px] font-sans font-semibold">
                      <XCircle className="w-3 h-3 text-rose-400" />
                      <span>FAILED</span>
                    </span>
                  )}
                </td>

                {/* Attempt */}
                <td className="py-2.5 px-3 whitespace-nowrap text-pink-200/80 font-sans">
                  Attempt #{log.attempt_number}
                </td>

                {/* Duration */}
                <td className="py-2.5 px-3 whitespace-nowrap text-pink-100">
                  {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : "-"}
                </td>

                {/* Scraped Price */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {log.price !== null && log.price !== undefined ? (
                    <span className="text-pink-300 font-bold">
                      ₹{log.price.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-pink-400/40">-</span>
                  )}
                </td>

                {/* Stock Level */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {log.stock !== null && log.stock !== undefined ? (
                    <span className={log.stock > 0 ? "text-pink-100" : "text-rose-400 font-bold"}>
                      {log.stock > 0 ? `${log.stock} units` : "Out of stock"}
                    </span>
                  ) : (
                    <span className="text-pink-400/40">-</span>
                  )}
                </td>

                {/* Details / Error */}
                <td className="py-2.5 px-3 text-pink-200/80 max-w-xs truncate font-sans">
                  {log.error_message ? (
                    <span className="text-rose-300 font-mono text-[10px] bg-rose-950/70 px-1.5 py-0.5 rounded border border-rose-800/60" title={log.error_message}>
                      {log.error_message}
                    </span>
                  ) : (
                    <span className="text-pink-300/60 text-[10px]">
                      {log.strategy.toLowerCase().replace("_", " ")}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

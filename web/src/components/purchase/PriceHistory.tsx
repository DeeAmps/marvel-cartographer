"use client";

import { useState, useEffect } from "react";
import { History, ArrowRight } from "lucide-react";
import type { PrintStatusChange } from "@/lib/types";

interface PriceHistoryProps {
  editionSlug: string;
}

const statusColors: Record<string, string> = {
  in_print: "var(--status-in-print)",
  out_of_print: "var(--status-out-of-print)",
  upcoming: "var(--status-upcoming)",
  digital_only: "var(--status-digital)",
  ongoing: "var(--status-ongoing)",
  check_availability: "var(--text-tertiary)",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function PriceHistory({ editionSlug }: PriceHistoryProps) {
  const [history, setHistory] = useState<PrintStatusChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(
          `/api/graph?action=price-history&edition=${editionSlug}`
        );
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch {
        // Silent fail — this data may not exist yet
      }
      setLoading(false);
    }
    fetchHistory();
  }, [editionSlug]);

  if (loading || history.length === 0) return null;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <History size={16} style={{ color: "var(--text-secondary)" }} />
        <h3 className="text-sm font-bold">Print Status History</h3>
      </div>

      <div className="space-y-2">
        {history.map((change, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="font-mono"
              style={{ color: "var(--text-tertiary)", minWidth: "80px" }}
            >
              {formatDate(change.changed_at)}
            </span>
            {change.old_status && (
              <>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    color: statusColors[change.old_status] || "var(--text-tertiary)",
                    background: (statusColors[change.old_status] || "var(--text-tertiary)") + "15",
                  }}
                >
                  {formatStatus(change.old_status)}
                </span>
                <ArrowRight size={12} style={{ color: "var(--text-tertiary)" }} />
              </>
            )}
            <span
              className="px-1.5 py-0.5 rounded font-bold"
              style={{
                color: statusColors[change.new_status] || "var(--text-tertiary)",
                background: (statusColors[change.new_status] || "var(--text-tertiary)") + "15",
              }}
            >
              {formatStatus(change.new_status)}
            </span>
            {change.source && (
              <span style={{ color: "var(--text-tertiary)" }}>
                via {change.source}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

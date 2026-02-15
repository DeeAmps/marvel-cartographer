import { ArrowRight } from "lucide-react";
import type { HandbookRetconEvent } from "@/lib/types";

export default function RetconTimeline({
  retcons,
}: {
  retcons: HandbookRetconEvent[];
}) {
  const sorted = [...retcons].sort((a, b) => a.year - b.year);

  return (
    <div className="space-y-0">
      {sorted.map((r, i) => {
        const isLast = i === sorted.length - 1;
        return (
          <div key={i} className="flex gap-4">
            {/* Timeline rail */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: "var(--accent-gold)",
                  border: "2px solid var(--bg-primary)",
                  boxShadow: "0 0 0 2px var(--accent-gold)",
                }}
              />
              {!isLast && (
                <div
                  className="w-0.5 flex-1 min-h-[32px]"
                  style={{ background: "var(--border-default)" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 -mt-0.5 min-w-0">
              <p
                className="text-xs font-bold mb-1"
                style={{
                  color: "var(--accent-gold)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {r.year}
              </p>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {r.description}
              </p>

              {/* Old state → New state */}
              <div
                className="rounded-lg border p-3 flex items-center gap-3"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-default)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                    Before
                  </p>
                  <p className="text-xs" style={{ color: "var(--status-out-of-print)" }}>
                    {r.old_state}
                  </p>
                </div>
                <ArrowRight size={14} className="flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                    After
                  </p>
                  <p className="text-xs" style={{ color: "var(--status-in-print)" }}>
                    {r.new_state}
                  </p>
                </div>
              </div>

              <p
                className="text-xs mt-1.5"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.7rem",
                }}
              >
                Source: {r.source}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

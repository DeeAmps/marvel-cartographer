"use client";

import { Star } from "lucide-react";

export default function RatingDisplay({
  average,
  count,
  compact = true,
}: {
  average: number;
  count: number;
  compact?: boolean;
}) {
  if (count === 0) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--accent-gold)" }}>
        {average.toFixed(1)}
        <Star size={10} fill="var(--accent-gold)" style={{ color: "var(--accent-gold)" }} />
        <span style={{ color: "var(--text-tertiary)" }}>({count})</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            fill={i <= Math.round(average) ? "var(--accent-gold)" : "transparent"}
            style={{
              color: i <= Math.round(average) ? "var(--accent-gold)" : "var(--text-tertiary)",
            }}
          />
        ))}
      </div>
      <span
        className="text-sm font-bold"
        style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace" }}
      >
        {average.toFixed(1)}
      </span>
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        ({count} {count === 1 ? "rating" : "ratings"})
      </span>
    </div>
  );
}

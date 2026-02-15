"use client";

import { Flame } from "lucide-react";
import { useStats } from "@/hooks/useStats";

export default function StreakBadge() {
  const { stats, loading } = useStats();

  if (loading || !stats || stats.current_streak <= 0) return null;

  const streak = stats.current_streak;
  let color = "var(--text-tertiary)";
  if (streak >= 14) color = "var(--accent-red)";
  else if (streak >= 7) color = "var(--accent-gold)";

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        fontFamily: "var(--font-geist-mono), monospace",
      }}
      title={`${streak}-day reading streak`}
    >
      <Flame size={14} />
      {streak}
    </div>
  );
}

"use client";

import { useStats } from "@/hooks/useStats";
import { getLevelFromXP, getXPProgress } from "@/lib/xp";

export default function LevelBadge({ showProgress = false }: { showProgress?: boolean }) {
  const { stats, loading } = useStats();

  if (loading || !stats) return null;

  const level = getLevelFromXP(stats.total_xp);
  const progress = getXPProgress(stats.total_xp);

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-md"
        style={{
          color: level.color,
          background: `color-mix(in srgb, ${level.color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${level.color} 25%, transparent)`,
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        {level.name}
      </span>
      {showProgress && progress.needed > 0 && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-20 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%`, background: level.color }}
            />
          </div>
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem" }}
          >
            {stats.total_xp} XP
          </span>
        </div>
      )}
    </div>
  );
}

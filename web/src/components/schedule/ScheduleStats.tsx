"use client";

import { TrendingUp, TrendingDown, Flame, CheckCircle2 } from "lucide-react";
import type { ScheduleStats as ScheduleStatsType, ScheduleItem } from "@/lib/types";

interface Props {
  stats: ScheduleStatsType;
  items: ScheduleItem[];
}

export default function ScheduleStats({ stats, items }: Props) {
  const completionPct =
    stats.total_scheduled > 0
      ? Math.round((stats.total_completed / stats.total_scheduled) * 100)
      : 0;

  const weekPct =
    stats.current_week_items > 0
      ? Math.round(
          (stats.current_week_completed / stats.current_week_items) * 100
        )
      : 0;

  // Calculate streak from consecutive completed weeks
  const completedDates = items
    .filter((i) => i.status === "completed" && i.completed_at)
    .map((i) => i.completed_at!.split("T")[0])
    .sort();

  const streak = completedDates.length;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
    >
      {/* Progress Ring */}
      <div
        className="rounded-lg p-4 flex flex-col items-center"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        <div className="relative w-16 h-16 mb-2">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="var(--accent-green)"
              strokeWidth="3"
              strokeDasharray={`${completionPct} ${100 - completionPct}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {completionPct}%
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {stats.total_completed}/{stats.total_scheduled} done
        </span>
      </div>

      {/* This Week */}
      <div
        className="rounded-lg p-4 flex flex-col items-center justify-center"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        <CheckCircle2 size={24} style={{ color: "var(--accent-blue)" }} />
        <span
          className="text-2xl font-bold mt-1"
          style={{ color: "var(--text-primary)" }}
        >
          {stats.current_week_completed}/{stats.current_week_items}
        </span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          This Week
        </span>
        {stats.current_week_items > 0 && (
          <div
            className="w-full h-1.5 rounded-full mt-2"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${weekPct}%`,
                background: "var(--accent-blue)",
              }}
            />
          </div>
        )}
      </div>

      {/* On Track / Behind */}
      <div
        className="rounded-lg p-4 flex flex-col items-center justify-center"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        {stats.on_track ? (
          <>
            <TrendingUp size={24} style={{ color: "var(--accent-green)" }} />
            <span
              className="text-lg font-bold mt-1"
              style={{ color: "var(--accent-green)" }}
            >
              On Track
            </span>
          </>
        ) : (
          <>
            <TrendingDown size={24} style={{ color: "var(--accent-red)" }} />
            <span
              className="text-lg font-bold mt-1"
              style={{ color: "var(--accent-red)" }}
            >
              Behind
            </span>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {stats.total_overdue} overdue
            </span>
          </>
        )}
      </div>

      {/* Streak */}
      <div
        className="rounded-lg p-4 flex flex-col items-center justify-center"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        <Flame size={24} style={{ color: streak > 0 ? "var(--accent-gold)" : "var(--text-tertiary)" }} />
        <span
          className="text-2xl font-bold mt-1"
          style={{ color: "var(--text-primary)" }}
        >
          {streak}
        </span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Completed
        </span>
      </div>
    </div>
  );
}

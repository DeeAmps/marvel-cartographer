"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleItem } from "@/lib/types";
import ScheduleItemCard from "./ScheduleItemCard";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  items: ScheduleItem[];
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  getItemsForMonth: (year: number, month: number) => ScheduleItem[];
}

export default function ScheduleMonthView({ items, onComplete, onSkip, getItemsForMonth }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const todayISO = now.toISOString().split("T")[0];
  const monthItems = getItemsForMonth(year, month);

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const totalDays = lastDay.getDate();

  const cells: { date: Date | null; iso: string; dayItems: ScheduleItem[] }[] = [];

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, iso: "", dayItems: [] });
  }

  // Day cells
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const iso = date.toISOString().split("T")[0];
    const dayItems = monthItems.filter(
      (item) => item.scheduled_date === iso
    );
    cells.push({ date, iso, dayItems });
  }

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
    setExpandedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
    setExpandedDay(null);
  };

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <span
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-bricolage)" }}
        >
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ChevronRight size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((day) => (
          <div
            key={day}
            className="text-center text-xs py-1 font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return <div key={`empty-${idx}`} className="min-h-[60px]" />;
          }

          const isToday = cell.iso === todayISO;
          const isExpanded = expandedDay === cell.iso;
          const hasItems = cell.dayItems.length > 0;
          const hasCompleted = cell.dayItems.some((i) => i.status === "completed");
          const hasOverdue = cell.dayItems.some((i) => i.status === "overdue");

          return (
            <button
              key={cell.iso}
              onClick={() =>
                hasItems ? setExpandedDay(isExpanded ? null : cell.iso) : undefined
              }
              className="min-h-[60px] rounded-lg p-1.5 text-left transition-colors"
              style={{
                background: hasCompleted
                  ? "rgba(0, 230, 118, 0.05)"
                  : isToday
                  ? "var(--bg-tertiary)"
                  : "var(--bg-secondary)",
                border: isToday
                  ? "1px solid var(--accent-blue)"
                  : isExpanded
                  ? "1px solid var(--accent-gold)"
                  : "1px solid var(--border-default)",
                cursor: hasItems ? "pointer" : "default",
              }}
            >
              <span
                className="text-xs"
                style={{
                  color: isToday ? "var(--accent-blue)" : "var(--text-secondary)",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {cell.date.getDate()}
              </span>

              {/* Dots for scheduled items */}
              {hasItems && (
                <div className="flex gap-0.5 mt-1 flex-wrap">
                  {cell.dayItems.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          item.status === "completed"
                            ? "var(--accent-green)"
                            : item.status === "overdue"
                            ? "var(--accent-red)"
                            : item.edition_era_color ?? "var(--accent-blue)",
                      }}
                    />
                  ))}
                  {cell.dayItems.length > 4 && (
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      +{cell.dayItems.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded day detail */}
      {expandedDay && (
        <div
          className="mt-4 rounded-lg p-4"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
        >
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {new Date(expandedDay + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h4>
          <div className="space-y-2">
            {monthItems
              .filter((item) => item.scheduled_date === expandedDay)
              .map((item) => (
                <ScheduleItemCard
                  key={item.id}
                  item={item}
                  onComplete={onComplete}
                  onSkip={onSkip}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleItem } from "@/lib/types";
import ScheduleItemCard from "./ScheduleItemCard";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  items: ScheduleItem[];
  weekStart: string;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onRemove: (id: string) => void;
  onReschedule: (id: string, newStartDate: string, newEndDate?: string) => void;
  onAddItem: (slug: string, startDate: string, endDate: string) => Promise<boolean>;
}

export default function ScheduleWeekView({
  items,
  weekStart,
  onComplete,
  onSkip,
  onRemove,
  onReschedule,
}: Props) {
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const monday = new Date(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split("T")[0];

  // Build 7 day columns — show items on any day within their reading window
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    const iso = date.toISOString().split("T")[0];
    const dayItems = items.filter((item) => {
      // Show item on days within its start→finish range
      return item.scheduled_date <= iso && item.due_date >= iso;
    });
    return { date, iso, dayItems, dayIndex: i };
  });

  const handleDrop = (dayIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDay(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;

    const targetDate = new Date(monday);
    targetDate.setDate(targetDate.getDate() + dayIndex);
    onReschedule(itemId, targetDate.toISOString().split("T")[0]);
  };

  return (
    <div>
      {/* Week header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Week of{" "}
            {monday.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {items.filter((i) => i.status === "completed").length}/{items.length} completed
        </div>
      </div>

      {/* Day columns — desktop grid, mobile stack */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map(({ date, iso, dayItems, dayIndex }) => {
          const isToday = iso === todayISO;
          const isPast = date < today && !isToday;
          const isDragOver = dragOverDay === dayIndex;

          return (
            <div
              key={iso}
              className="rounded-lg p-2 min-h-[200px] transition-colors"
              style={{
                background: isToday
                  ? "var(--bg-tertiary)"
                  : isDragOver
                  ? "rgba(79, 195, 247, 0.1)"
                  : "var(--bg-secondary)",
                border: isToday
                  ? "1px solid var(--accent-blue)"
                  : isDragOver
                  ? "1px solid var(--accent-blue)"
                  : "1px solid var(--border-default)",
                opacity: isPast ? 0.7 : 1,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDay(dayIndex);
              }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => handleDrop(dayIndex, e)}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: isToday ? "var(--accent-blue)" : "var(--text-secondary)" }}
                >
                  {DAY_LABELS[dayIndex]}
                </span>
                <span
                  className={`text-xs ${isToday ? "font-bold" : ""}`}
                  style={{
                    color: isToday ? "var(--accent-blue)" : "var(--text-tertiary)",
                  }}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <ScheduleItemCard
                    key={item.id}
                    item={item}
                    compact
                    draggable
                    onComplete={onComplete}
                    onSkip={onSkip}
                    onRemove={onRemove}
                  />
                ))}
              </div>

              {/* Empty state */}
              {dayItems.length === 0 && !isPast && (
                <div
                  className="flex items-center justify-center h-16 rounded border border-dashed"
                  style={{ borderColor: "var(--border-default)" }}
                >
                  <Plus size={14} style={{ color: "var(--text-tertiary)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked list */}
      <div className="md:hidden space-y-3">
        {days.map(({ date, iso, dayItems, dayIndex }) => {
          const isToday = iso === todayISO;
          if (dayItems.length === 0 && !isToday) return null;

          return (
            <div key={iso}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: isToday ? "var(--accent-blue)" : "var(--text-secondary)" }}
                >
                  {DAY_LABELS[dayIndex]}{" "}
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {isToday && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(79, 195, 247, 0.2)", color: "var(--accent-blue)" }}
                  >
                    Today
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <ScheduleItemCard
                    key={item.id}
                    item={item}
                    onComplete={onComplete}
                    onSkip={onSkip}
                    onRemove={onRemove}
                  />
                ))}
                {dayItems.length === 0 && isToday && (
                  <div
                    className="rounded-lg p-4 text-center text-sm"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-tertiary)" }}
                  >
                    Nothing scheduled for today
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

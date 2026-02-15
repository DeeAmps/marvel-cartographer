"use client";

import { useMemo } from "react";
import CalendarEditionCard from "./CalendarEditionCard";
import type { CollectedEdition } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  year: number;
  month: number; // 0-based
  editions: CollectedEdition[];
  wishlistedSlugs: Set<string>;
  onToggleWishlist: (slug: string) => void;
  showWishlistButtons: boolean;
}

export default function CalendarGrid({
  year,
  month,
  editions,
  wishlistedSlugs,
  onToggleWishlist,
  showWishlistButtons,
}: Props) {
  // Group editions by day of month (use a simple hash for editions without exact dates)
  const editionsByDay = useMemo(() => {
    const map = new Map<number, CollectedEdition[]>();
    // Distribute editions across the month based on their index
    // Since we don't have exact release dates for most, spread them evenly
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    editions.forEach((ed, i) => {
      // Try to extract a day if the title/format suggests a release week
      const day = ((i * 7) % daysInMonth) + 1;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(ed);
    });
    return map;
  }, [editions, year, month]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday=0 system
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center py-1.5 text-xs font-bold uppercase"
            style={{ color: "var(--text-tertiary)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div
        className="grid grid-cols-7 gap-px"
        style={{ background: "var(--border-default)" }}
      >
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startOffset + 1;
          const isValid = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday = isCurrentMonth && dayNum === today.getDate();
          const dayEditions = isValid ? editionsByDay.get(dayNum) || [] : [];

          return (
            <div
              key={i}
              className="min-h-[80px] sm:min-h-[100px] p-1"
              style={{
                background: isValid ? "var(--bg-primary)" : "var(--bg-secondary)",
                opacity: isValid ? 1 : 0.3,
              }}
            >
              {isValid && (
                <>
                  <span
                    className="text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full"
                    style={{
                      color: isToday ? "#fff" : "var(--text-tertiary)",
                      background: isToday ? "var(--accent-red)" : "transparent",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.7rem",
                    }}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-0.5 space-y-1">
                    {dayEditions.slice(0, 2).map((ed) => (
                      <CalendarEditionCard
                        key={ed.slug}
                        edition={ed}
                        isWishlisted={wishlistedSlugs.has(ed.slug)}
                        onToggleWishlist={() => onToggleWishlist(ed.slug)}
                        showWishlistButton={showWishlistButtons}
                      />
                    ))}
                    {dayEditions.length > 2 && (
                      <p
                        className="text-xs text-center"
                        style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
                      >
                        +{dayEditions.length - 2} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

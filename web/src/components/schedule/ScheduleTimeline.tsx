"use client";

import type { ScheduleItem } from "@/lib/types";
import ScheduleItemCard from "./ScheduleItemCard";

interface Props {
  items: ScheduleItem[];
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Sort items by chronological story order:
 * 1. Era number (ascending — earliest era first)
 * 2. Release date within era (ascending — publication order approximates story order)
 * 3. Position as tiebreaker
 */
function sortByStoryOrder(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => {
    const eraA = a.edition_era_number ?? 99;
    const eraB = b.edition_era_number ?? 99;
    if (eraA !== eraB) return eraA - eraB;

    const dateA = a.edition_release_date ?? "9999-12-31";
    const dateB = b.edition_release_date ?? "9999-12-31";
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    return a.position - b.position;
  });
}

export default function ScheduleTimeline({ items, onComplete, onSkip, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-center"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        <p style={{ color: "var(--text-secondary)" }}>
          No upcoming items. All caught up!
        </p>
      </div>
    );
  }

  const sorted = sortByStoryOrder(items);

  // Group by era
  const eraGroups: { eraName: string; eraColor: string; eraNumber: number; items: ScheduleItem[] }[] = [];
  const eraMap = new Map<string, ScheduleItem[]>();
  const eraMetaMap = new Map<string, { color: string; number: number }>();

  for (const item of sorted) {
    const eraName = item.edition_era_name ?? "Unknown Era";
    if (!eraMap.has(eraName)) {
      eraMap.set(eraName, []);
      eraMetaMap.set(eraName, {
        color: item.edition_era_color ?? "var(--text-tertiary)",
        number: item.edition_era_number ?? 99,
      });
    }
    eraMap.get(eraName)!.push(item);
  }

  for (const [eraName, eraItems] of eraMap) {
    const meta = eraMetaMap.get(eraName)!;
    eraGroups.push({
      eraName,
      eraColor: meta.color,
      eraNumber: meta.number,
      items: eraItems,
    });
  }

  // Already sorted by era number due to input ordering
  eraGroups.sort((a, b) => a.eraNumber - b.eraNumber);

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
        Sorted by chronological story order across eras, not by scheduled date.
      </p>
      <div className="space-y-6">
        {eraGroups.map((group) => (
          <div key={group.eraName}>
            {/* Era header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: group.eraColor }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: group.eraColor }}
              >
                {group.eraName}
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {group.items.length} edition{group.items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Items */}
            <div
              className="space-y-2 ml-6 border-l-2"
              style={{ borderColor: group.eraColor }}
            >
              {group.items.map((item, i) => (
                <div key={item.id} className="pl-4 flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs mt-3"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.6rem",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <ScheduleItemCard
                      item={item}
                      onComplete={onComplete}
                      onSkip={onSkip}
                      onRemove={onRemove}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

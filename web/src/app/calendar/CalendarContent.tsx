"use client";

import { useState, useMemo } from "react";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import CalendarEditionCard from "@/components/calendar/CalendarEditionCard";
import { useCollection } from "@/hooks/useCollection";
import { useReadingSchedule } from "@/hooks/useReadingSchedule";
import ScheduleItemCard from "@/components/schedule/ScheduleItemCard";
import type { CollectedEdition, ImportanceLevel, EditionFormat } from "@/lib/types";

const FORMAT_FILTERS = [
  { value: "", label: "All Formats" },
  { value: "omnibus", label: "Omnibus" },
  { value: "trade_paperback", label: "Trade" },
  { value: "epic_collection", label: "Epic" },
  { value: "hardcover", label: "Hardcover" },
  { value: "masterworks", label: "Masterworks" },
];

const IMPORTANCE_FILTERS = [
  { value: "", label: "All" },
  { value: "essential", label: "Essential" },
  { value: "recommended", label: "Recommended" },
  { value: "supplemental", label: "Supplemental" },
];

const STATUS_TABS = [
  { value: "upcoming", label: "Upcoming", color: "var(--accent-purple)" },
  { value: "in_print", label: "In Print", color: "var(--accent-green)" },
  { value: "ongoing", label: "Ongoing", color: "var(--accent-gold)" },
  { value: "my_schedule", label: "My Schedule", color: "var(--accent-blue)" },
];

function getMonthLabel(dateStr?: string): string {
  if (!dateStr) return "Date TBD";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "Date TBD";
  }
}

export default function CalendarContent({
  editions,
}: {
  editions: CollectedEdition[];
}) {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [formatFilter, setFormatFilter] = useState("");
  const [importanceFilter, setImportanceFilter] = useState("");

  const { items, addItem, removeItem, getStatus, authenticated } = useCollection();
  const { activeItems: scheduleItems, completeItem, skipItem } = useReadingSchedule();
  const wishlistedSlugs = useMemo(
    () => new Set(items.filter((i) => i.status === "wishlist").map((i) => i.edition_slug)),
    [items]
  );

  // Group editions by status
  const byStatus = useMemo(() => {
    const groups: Record<string, CollectedEdition[]> = {
      upcoming: [],
      in_print: [],
      ongoing: [],
    };
    for (const ed of editions) {
      if (ed.print_status === "upcoming") groups.upcoming.push(ed);
      else if (ed.print_status === "in_print") groups.in_print.push(ed);
      else if (ed.print_status === "ongoing") groups.ongoing.push(ed);
    }
    return groups;
  }, [editions]);

  // Apply filters to the active tab's editions
  const filtered = useMemo(() => {
    let result = byStatus[activeTab] || [];
    if (formatFilter) result = result.filter((e) => e.format === formatFilter);
    if (importanceFilter) result = result.filter((e) => e.importance === importanceFilter);
    // Sort by release date (earliest first), undated last
    result = [...result].sort((a, b) => {
      if (!a.release_date && !b.release_date) return 0;
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      return a.release_date.localeCompare(b.release_date);
    });
    return result;
  }, [byStatus, activeTab, formatFilter, importanceFilter]);

  // Group filtered by release month for organized display
  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, CollectedEdition[]>();
    for (const ed of filtered) {
      const monthLabel = getMonthLabel(ed.release_date);
      if (!groups.has(monthLabel)) groups.set(monthLabel, []);
      groups.get(monthLabel)!.push(ed);
    }
    return groups;
  }, [filtered]);

  function toggleWishlist(slug: string) {
    const status = getStatus(slug);
    if (status === "wishlist") {
      removeItem(slug);
    } else {
      addItem(slug, "wishlist");
    }
  }

  const activeColor = STATUS_TABS.find((t) => t.value === activeTab)?.color || "var(--text-primary)";

  return (
    <div>
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Marvel Calendar
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        Track upcoming releases, in-print editions, and ongoing series across the Marvel collected editions catalog.
      </p>

      {/* Status tabs */}
      <div
        className="flex gap-0 mb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        {STATUS_TABS.map((tab) => {
          const count = tab.value === "my_schedule"
            ? scheduleItems.filter((i) => i.status !== "completed" && i.status !== "skipped").length
            : byStatus[tab.value]?.length || 0;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px"
              style={{
                color: isActive ? tab.color : "var(--text-tertiary)",
                borderColor: isActive ? tab.color : "transparent",
              }}
            >
              {tab.label}
              <span
                className="ml-1.5 text-xs font-normal"
                style={{ opacity: 0.7 }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* My Schedule tab */}
      {activeTab === "my_schedule" && (
        <div className="mt-4">
          {!authenticated ? (
            <div className="rounded-lg border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}>
              <p style={{ color: "var(--text-secondary)" }}>Sign in to view your reading schedule.</p>
            </div>
          ) : scheduleItems.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}>
              <CalendarDays size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>No reading schedule yet.</p>
              <Link href="/schedule" className="text-sm font-medium" style={{ color: "var(--accent-blue)" }}>
                Create a schedule &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {scheduleItems.filter((i) => i.status !== "completed" && i.status !== "skipped").length} remaining
                </p>
                <Link href="/schedule" className="text-xs font-medium" style={{ color: "var(--accent-blue)" }}>
                  Full schedule &rarr;
                </Link>
              </div>
              {scheduleItems
                .filter((i) => i.status !== "completed" && i.status !== "skipped")
                .slice(0, 20)
                .map((item) => (
                  <ScheduleItemCard key={item.id} item={item} onComplete={completeItem} onSkip={skipItem} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Filters & Results (hidden on schedule tab) */}
      {activeTab !== "my_schedule" && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {FORMAT_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormatFilter(f.value)}
                className="px-2.5 py-1 rounded text-xs font-bold transition-all"
                style={{
                  background: formatFilter === f.value ? "var(--bg-tertiary)" : "transparent",
                  color: formatFilter === f.value ? "var(--accent-blue)" : "var(--text-tertiary)",
                  border: `1px solid ${formatFilter === f.value ? "var(--accent-blue)" : "transparent"}`,
                }}
              >
                {f.label}
              </button>
            ))}
            <span className="w-px h-5 self-center" style={{ background: "var(--border-default)" }} />
            {IMPORTANCE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setImportanceFilter(f.value)}
                className="px-2.5 py-1 rounded text-xs font-bold transition-all"
                style={{
                  background: importanceFilter === f.value ? "var(--bg-tertiary)" : "transparent",
                  color: importanceFilter === f.value ? "var(--accent-gold)" : "var(--text-tertiary)",
                  border: `1px solid ${importanceFilter === f.value ? "var(--accent-gold)" : "transparent"}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div
              className="rounded-lg border p-12 text-center"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
            >
              <CalendarDays size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                No editions match the current filters.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {filtered.length} edition{filtered.length !== 1 ? "s" : ""}
              </p>
              {[...groupedByMonth.entries()].map(([month, editions]) => (
                <div key={month}>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
                    style={{ color: activeColor }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: activeColor }} />
                    {month} ({editions.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {editions.map((ed) => (
                      <CalendarEditionCard
                        key={ed.slug}
                        edition={ed}
                        isWishlisted={wishlistedSlugs.has(ed.slug)}
                        onToggleWishlist={() => toggleWishlist(ed.slug)}
                        showWishlistButton={authenticated}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

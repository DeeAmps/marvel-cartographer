"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import type { Event, ImportanceLevel } from "@/lib/types";

const TAG_CATEGORIES: { label: string; tags: string[] }[] = [
  {
    label: "Mutant",
    tags: ["x-men", "mutant", "mutants", "krakoa", "magneto"],
  },
  {
    label: "Cosmic",
    tags: ["cosmic", "galactus", "thanos", "infinity", "celestial"],
  },
  {
    label: "Avengers",
    tags: ["avengers", "iron-man", "captain-america", "shield"],
  },
  {
    label: "Street-Level",
    tags: ["street-level", "spider-man", "daredevil", "defenders"],
  },
];

export default function EventsClient({
  events,
  editionCounts,
}: {
  events: Event[];
  editionCounts: Record<string, number>;
}) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    if (!activeFilter) return events;
    const category = TAG_CATEGORIES.find((c) => c.label === activeFilter);
    if (!category) return events;
    return events.filter((e) =>
      e.tags.some((t) => category.tags.includes(t.toLowerCase())),
    );
  }, [events, activeFilter]);

  const minYear = Math.min(...events.map((e) => e.year));
  const maxYear = Math.max(...events.map((e) => e.year));
  const yearSpan = maxYear - minYear || 1;

  const decades = useMemo(() => {
    const startDecade = Math.floor(minYear / 10) * 10;
    const endDecade = Math.floor(maxYear / 10) * 10;
    const result: number[] = [];
    for (let d = startDecade; d <= endDecade; d += 10) {
      result.push(d);
    }
    return result;
  }, [minYear, maxYear]);

  return (
    <div>
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Events & Sagas
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        {events.length} major Marvel events, crossovers, and saga-defining runs,
        from the Coming of Galactus to the present.
      </p>

      {/* Visual Timeline */}
      <div className="mb-8 pb-4">
        <div
          className="relative"
          style={{ height: 80, marginLeft: 24, marginRight: 24 }}
        >
          {/* Timeline line */}
          <div
            className="absolute top-8 left-0 right-0 h-px"
            style={{ background: "var(--border-default)" }}
          />
          {/* Decade markers */}
          {decades.map((decade) => {
            const pct = ((decade - minYear) / yearSpan) * 100;
            return (
              <div
                key={decade}
                className="absolute text-xs"
                style={{
                  left: `${pct}%`,
                  top: 14,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                  transform: "translateX(-50%)",
                }}
              >
                {decade}
              </div>
            );
          })}
          {/* Event dots */}
          {events.map((event) => {
            const pct = ((event.year - minYear) / yearSpan) * 100;
            const importanceColor =
              event.importance === "essential"
                ? "var(--importance-essential)"
                : event.importance === "recommended"
                  ? "var(--importance-recommended)"
                  : "var(--importance-supplemental)";

            // Dim dots that are filtered out
            const isVisible =
              !activeFilter ||
              (() => {
                const category = TAG_CATEGORIES.find(
                  (c) => c.label === activeFilter,
                );
                return (
                  category &&
                  event.tags.some((t) =>
                    category.tags.includes(t.toLowerCase()),
                  )
                );
              })();

            return (
              <a
                key={event.slug}
                href={`#${event.slug}`}
                className="absolute group"
                style={{
                  left: `${pct}%`,
                  top: 24,
                  transform: "translateX(-50%)",
                  opacity: isVisible ? 1 : 0.2,
                  transition: "opacity 0.3s",
                }}
              >
                <div
                  className="w-3 h-3 rounded-full transition-transform hover:scale-150"
                  style={{ background: importanceColor }}
                />
                <div
                  className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-2 py-1 rounded text-xs z-10"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    fontSize: "0.75rem",
                  }}
                >
                  {event.name} ({event.year})
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveFilter(null)}
          className="px-2.5 py-1 rounded text-xs font-bold transition-colors"
          style={{
            background: !activeFilter
              ? "var(--accent-red)"
              : "var(--bg-tertiary)",
            color: !activeFilter ? "#fff" : "var(--text-secondary)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          ALL
        </button>
        {TAG_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() =>
              setActiveFilter(activeFilter === cat.label ? null : cat.label)
            }
            className="px-2.5 py-1 rounded text-xs font-bold transition-colors"
            style={{
              background:
                activeFilter === cat.label
                  ? "var(--accent-gold)"
                  : "var(--bg-tertiary)",
              color:
                activeFilter === cat.label ? "#000" : "var(--text-secondary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {cat.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Event Cards */}
      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <Link
            key={event.slug}
            id={event.slug}
            href={`/event/${event.slug}`}
            className="block rounded-lg border p-5 transition-all hover:border-[var(--accent-gold)] scroll-mt-24"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                >
                  {event.name}
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {event.year} &middot; {event.core_issues}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editionCounts[event.slug] != null &&
                  editionCounts[event.slug] > 0 && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {editionCounts[event.slug]} edition
                      {editionCounts[event.slug] !== 1 ? "s" : ""}
                    </span>
                  )}
                <ImportanceBadge level={event.importance as ImportanceLevel} />
              </div>
            </div>

            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {event.synopsis}
            </p>

            <div
              className="rounded p-3 text-sm"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <span
                className="font-bold text-xs uppercase"
                style={{ color: "var(--accent-gold)" }}
              >
                Impact:
              </span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>
                {event.impact}
              </span>
            </div>

            {event.prerequisites && (
              <div className="mt-3">
                <span
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Prerequisites:
                </span>{" "}
                <span
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {event.prerequisites}
                </span>
              </div>
            )}

            {event.consequences && (
              <div className="mt-2">
                <span
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Consequences:
                </span>{" "}
                <span
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {event.consequences}
                </span>
              </div>
            )}

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <p
          className="text-center py-12"
          style={{ color: "var(--text-tertiary)" }}
        >
          No events match this filter.
        </p>
      )}
    </div>
  );
}

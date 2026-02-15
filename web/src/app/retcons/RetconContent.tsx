"use client";

import { useState, useMemo } from "react";
import { GitBranch } from "lucide-react";
import RetconFilterBar from "@/components/retcons/RetconFilterBar";
import RetconRiver from "@/components/retcons/RetconRiver";
import type { HandbookEntry } from "@/lib/types";

interface Era {
  slug: string;
  name: string;
  year_start: number;
  year_end: number;
}

interface RetconItem {
  entry_slug: string;
  entry_name: string;
  entry_type: string;
  retcon: {
    year: number;
    description: string;
    old_state: string;
    new_state: string;
    source: string;
  };
}

export default function RetconContent({
  entries,
  allRetcons,
  eras,
}: {
  entries: (HandbookEntry & { retcon_count: number })[];
  allRetcons: RetconItem[];
  eras: Era[];
}) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [selectedEra, setSelectedEra] = useState("");
  const [majorOnly, setMajorOnly] = useState(false);

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  // Find the selected era's year range
  const eraRange = useMemo(() => {
    if (!selectedEra) return null;
    const era = eras.find((e) => e.slug === selectedEra);
    return era ? { start: era.year_start, end: era.year_end } : null;
  }, [selectedEra, eras]);

  const filtered = useMemo(() => {
    return allRetcons.filter((item) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.entry_name.toLowerCase().includes(q) &&
          !item.retcon.description.toLowerCase().includes(q)
        )
          return false;
      }
      // Type filter
      if (activeTypes.size > 0 && !activeTypes.has(item.entry_type)) return false;
      // Era filter
      if (eraRange && (item.retcon.year < eraRange.start || item.retcon.year > eraRange.end))
        return false;
      // Major only — old_state and new_state differ significantly (>20 char difference or both exist)
      if (majorOnly) {
        if (!item.retcon.old_state || !item.retcon.new_state) return false;
        if (item.retcon.old_state === item.retcon.new_state) return false;
      }
      return true;
    });
  }, [allRetcons, search, activeTypes, eraRange, majorOnly]);

  // Stats
  const totalRetcons = allRetcons.length;
  const uniqueEntries = new Set(allRetcons.map((r) => r.entry_slug)).size;

  // Most retconned entry
  const entryCounts = new Map<string, { name: string; count: number }>();
  for (const r of allRetcons) {
    const existing = entryCounts.get(r.entry_slug);
    if (existing) existing.count++;
    else entryCounts.set(r.entry_slug, { name: r.entry_name, count: 1 });
  }
  let mostRetconned = { name: "", count: 0 };
  for (const v of entryCounts.values()) {
    if (v.count > mostRetconned.count) mostRetconned = v;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          <GitBranch size={28} style={{ color: "var(--accent-gold)" }} />
          Retcon Tracker
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Track how Marvel&apos;s continuity has been rewritten over the decades.
        </p>
      </div>

      {/* Stats */}
      <div
        className="rounded-lg border p-4 mb-6 flex flex-wrap gap-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <div>
          <p
            className="text-2xl font-bold"
            style={{
              color: "var(--accent-gold)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {totalRetcons}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            retcons tracked
          </p>
        </div>
        <div>
          <p
            className="text-2xl font-bold"
            style={{
              color: "var(--accent-blue)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {uniqueEntries}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            characters / concepts
          </p>
        </div>
        {mostRetconned.count > 0 && (
          <div>
            <p
              className="text-sm font-bold"
              style={{ color: "var(--accent-red)" }}
            >
              {mostRetconned.name}
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              most retconned ({mostRetconned.count} retcons)
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <RetconFilterBar
          search={search}
          onSearchChange={setSearch}
          activeTypes={activeTypes}
          onToggleType={toggleType}
          eras={eras}
          selectedEra={selectedEra}
          onEraChange={setSelectedEra}
          majorOnly={majorOnly}
          onMajorOnlyChange={setMajorOnly}
        />
      </div>

      {/* Result count */}
      <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
        Showing {filtered.length} of {totalRetcons} retcons
      </p>

      {/* Timeline */}
      <RetconRiver retcons={filtered} />
    </div>
  );
}

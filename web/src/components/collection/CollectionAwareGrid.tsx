"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";
import StatusBadge from "@/components/ui/StatusBadge";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import CoverImage from "@/components/ui/CoverImage";
import type { CollectedEdition, ImportanceLevel, PrintStatus } from "@/lib/types";

/**
 * A collection-aware edition grid that shows overlap badges.
 * This is a client component that wraps the standard edition card layout
 * and adds overlap % based on the user's localStorage collection.
 */
export default function CollectionAwareGrid({
  editions,
  editionIssueMap,
  eraColor,
  columns,
}: {
  editions: CollectedEdition[];
  editionIssueMap: Record<string, string[]>;
  eraColor?: string;
  columns?: number;
}) {
  const { items, hydrated } = useCollection();

  // Compute all owned issues once
  const ownedIssues = useMemo(() => {
    if (!hydrated) return new Set<string>();
    const owned = new Set<string>();
    for (const item of items) {
      if (item.status === "owned" || item.status === "completed" || item.status === "reading") {
        const issues = editionIssueMap[item.edition_slug] || [];
        for (const issue of issues) owned.add(issue);
      }
    }
    return owned;
  }, [items, hydrated, editionIssueMap]);

  // Compute overlap for each edition
  const overlapMap = useMemo(() => {
    if (!hydrated || items.length === 0) return new Map<string, number>();
    const map = new Map<string, number>();
    const ownedSlugs = new Set(
      items
        .filter((i) => i.status === "owned" || i.status === "completed")
        .map((i) => i.edition_slug)
    );
    for (const ed of editions) {
      if (ownedSlugs.has(ed.slug)) {
        map.set(ed.slug, -1); // -1 = already owned
        continue;
      }
      const issues = editionIssueMap[ed.slug] || [];
      if (issues.length === 0) continue;
      let overlap = 0;
      for (const issue of issues) {
        if (ownedIssues.has(issue)) overlap++;
      }
      const pct = Math.round((overlap / issues.length) * 100);
      if (pct > 0) map.set(ed.slug, pct);
    }
    return map;
  }, [editions, editionIssueMap, ownedIssues, items, hydrated]);

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns || 1}, minmax(0, 1fr))`,
      }}
    >
      {editions.map((edition) => {
        const overlapPct = overlapMap.get(edition.slug);
        const formatLabel = edition.format.replace(/_/g, " ").toUpperCase();
        const isOwned = overlapPct === -1;

        return (
          <Link key={edition.slug} href={`/edition/${edition.slug}`} className="block group">
            <div
              className="rounded-lg border p-4 transition-all hover:border-[var(--border-accent)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5 relative"
              style={{
                background: "var(--bg-secondary)",
                borderColor: isOwned ? "var(--accent-green)" : "var(--border-default)",
                borderLeftWidth: eraColor ? "3px" : undefined,
                borderLeftColor: eraColor || undefined,
              }}
            >
              {/* Owned badge */}
              {isOwned && (
                <span
                  className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{
                    background: "var(--accent-green)",
                    color: "#000",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.5rem",
                  }}
                >
                  OWNED
                </span>
              )}

              {/* Overlap badge */}
              {overlapPct && overlapPct > 0 && !isOwned && (
                <span
                  className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{
                    background: overlapPct > 50
                      ? "var(--status-out-of-print)"
                      : overlapPct > 20
                        ? "var(--status-ongoing)"
                        : "var(--bg-tertiary)",
                    color: overlapPct > 20 ? "#fff" : "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.5rem",
                  }}
                >
                  {overlapPct}% OWNED
                </span>
              )}

              <div className="flex items-start gap-3">
                {/* Cover image */}
                <div
                  className="flex-shrink-0 w-16 h-24 rounded flex items-center justify-center overflow-hidden relative"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <CoverImage
                    src={edition.cover_image_url}
                    alt={edition.title}
                    width={64}
                    height={96}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    format={edition.format}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className="text-sm font-bold leading-tight group-hover:text-[var(--accent-red)] transition-colors truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {edition.title}
                  </h3>

                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    {edition.issues_collected}
                  </p>

                  {edition.creator_names && edition.creator_names.length > 0 && (
                    <p className="text-xs mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
                      {edition.creator_names.slice(0, 3).join(", ")}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <ImportanceBadge level={edition.importance as ImportanceLevel} />
                    <StatusBadge status={edition.print_status as PrintStatus} />
                  </div>
                </div>
              </div>

              {edition.synopsis && (
                <p
                  className="text-xs mt-3 line-clamp-2 leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {edition.synopsis}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

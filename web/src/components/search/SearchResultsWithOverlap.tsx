"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import CoverImage from "@/components/ui/CoverImage";
import type { CollectedEdition } from "@/lib/types";
import { BookOpen } from "lucide-react";

export default function SearchResultsWithOverlap({
  results,
  query,
  editionIssueMap,
}: {
  results: CollectedEdition[];
  query: string;
  editionIssueMap: Record<string, string[]>;
}) {
  const { items, hydrated } = useCollection();

  // Compute owned issues once
  const { ownedIssues, ownedSlugs } = useMemo(() => {
    if (!hydrated) return { ownedIssues: new Set<string>(), ownedSlugs: new Set<string>() };
    const slugs = new Set(
      items
        .filter((i) => i.status === "owned" || i.status === "completed" || i.status === "reading")
        .map((i) => i.edition_slug)
    );
    const issues = new Set<string>();
    for (const slug of slugs) {
      for (const issue of editionIssueMap[slug] || []) {
        issues.add(issue);
      }
    }
    return { ownedIssues: issues, ownedSlugs: slugs };
  }, [items, hydrated, editionIssueMap]);

  function getOverlapPct(slug: string): number | null {
    if (!hydrated || items.length === 0) return null;
    if (ownedSlugs.has(slug)) return -1; // owned
    const issues = editionIssueMap[slug] || [];
    if (issues.length === 0) return null;
    let overlap = 0;
    for (const issue of issues) {
      if (ownedIssues.has(issue)) overlap++;
    }
    const pct = Math.round((overlap / issues.length) * 100);
    return pct > 0 ? pct : null;
  }

  const q = query.toLowerCase();

  return (
    <div className="space-y-3">
      {/* Generate Reading Guide CTA */}
      {query && results.length > 0 && (
        <Link
          href={`/guide/${encodeURIComponent(query)}`}
          className="flex items-center gap-2 px-4 py-3 rounded-lg border transition-all hover:border-[var(--accent-gold)] hover:shadow-lg hover:shadow-[var(--accent-gold)]/5"
          style={{
            background: "color-mix(in srgb, var(--accent-gold) 5%, var(--bg-secondary))",
            borderColor: "var(--border-default)",
          }}
        >
          <BookOpen size={16} style={{ color: "var(--accent-gold)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--accent-gold)" }}>
            Generate a &quot;{query}&quot; Reading Guide
          </span>
          <span className="ml-auto text-xs" style={{ color: "var(--text-tertiary)" }}>
            Auto-tiered: Essential / Recommended / Completionist
          </span>
        </Link>
      )}

      {results.map((edition) => {
        // Determine which fields matched
        const matchedFields: string[] = [];
        if (q && edition.title.toLowerCase().includes(q)) matchedFields.push("title");
        if (q && edition.synopsis.toLowerCase().includes(q)) matchedFields.push("synopsis");
        if (q && edition.issues_collected.toLowerCase().includes(q)) matchedFields.push("issues");
        if (q && edition.creator_names?.some((c) => c.toLowerCase().includes(q))) matchedFields.push("creator");
        if (q && edition.connection_notes?.toLowerCase().includes(q)) matchedFields.push("notes");

        // Highlight matching text in title
        let titleDisplay: React.ReactNode = edition.title;
        if (q && edition.title.toLowerCase().includes(q)) {
          const idx = edition.title.toLowerCase().indexOf(q);
          titleDisplay = (
            <>
              {edition.title.slice(0, idx)}
              <span style={{ background: "var(--accent-gold)", color: "#000", borderRadius: "2px", padding: "0 2px" }}>
                {edition.title.slice(idx, idx + q.length)}
              </span>
              {edition.title.slice(idx + q.length)}
            </>
          );
        }

        const overlapPct = getOverlapPct(edition.slug);
        const isOwned = overlapPct === -1;

        return (
          <Link
            key={edition.slug}
            href={`/edition/${edition.slug}`}
            className="block group"
          >
            <div
              className="rounded-lg border p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5 relative"
              style={{
                background: "var(--bg-secondary)",
                borderColor: isOwned ? "var(--accent-green)" : "var(--border-default)",
              }}
            >
              {/* Owned / Overlap badge */}
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
                <CoverImage
                  src={edition.cover_image_url}
                  alt={edition.title}
                  width={48}
                  height={72}
                  className="rounded flex-shrink-0 object-cover"
                  loading="lazy"
                  format={edition.format}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors">
                      {titleDisplay}
                    </h3>
                    {edition.era_slug && (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-bold"
                        style={{
                          background: "var(--bg-tertiary)",
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: "0.75rem",
                        }}
                      >
                        {edition.era_slug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    )}
                  </div>
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
                    <ImportanceBadge level={edition.importance} />
                    <StatusBadge status={edition.print_status} />
                    {query && matchedFields.length > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
                      >
                        matched: {matchedFields.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

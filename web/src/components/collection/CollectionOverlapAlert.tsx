"use client";

import { useMemo } from "react";
import { useCollection } from "@/hooks/useCollection";
import { AlertTriangle, Check, BookOpen } from "lucide-react";

/**
 * Shows a prominent alert on edition detail pages indicating
 * how much of this edition the user already owns via other editions.
 *
 * Props are server-provided: the edition's issue keys and the full issue map.
 */
export default function CollectionOverlapAlert({
  editionSlug,
  editionTitle,
  issueKeys,
  editionIssueMap,
}: {
  editionSlug: string;
  editionTitle: string;
  issueKeys: string[];
  editionIssueMap: Record<string, string[]>;
}) {
  const { items, hydrated } = useCollection();

  const analysis = useMemo(() => {
    if (!hydrated || items.length === 0 || issueKeys.length === 0) return null;

    // Check if user already owns this exact edition
    const myStatus = items.find((i) => i.edition_slug === editionSlug)?.status;
    if (myStatus === "owned" || myStatus === "completed") return { type: "owned" as const };

    // Find which issues from this edition the user already has via other editions
    const ownedSlugs = items
      .filter((i) => i.status === "owned" || i.status === "completed" || i.status === "reading")
      .map((i) => i.edition_slug);

    const ownedIssues = new Set<string>();
    const issueSourceMap = new Map<string, string[]>(); // issue -> [edition slugs that have it]

    for (const slug of ownedSlugs) {
      if (slug === editionSlug) continue;
      const issues = editionIssueMap[slug] || [];
      for (const issue of issues) {
        ownedIssues.add(issue);
        if (!issueSourceMap.has(issue)) issueSourceMap.set(issue, []);
        issueSourceMap.get(issue)!.push(slug);
      }
    }

    const overlapping = issueKeys.filter((k) => ownedIssues.has(k));
    const pct = Math.round((overlapping.length / issueKeys.length) * 100);

    if (pct === 0) return null;

    // Find which editions contribute the most overlap
    const editionOverlapCount = new Map<string, number>();
    for (const issue of overlapping) {
      const sources = issueSourceMap.get(issue) || [];
      for (const src of sources) {
        editionOverlapCount.set(src, (editionOverlapCount.get(src) || 0) + 1);
      }
    }
    const topSources = [...editionOverlapCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      type: "overlap" as const,
      pct,
      overlapping: overlapping.length,
      total: issueKeys.length,
      unique: issueKeys.length - overlapping.length,
      topSources,
    };
  }, [hydrated, items, editionSlug, issueKeys, editionIssueMap]);

  if (!hydrated || !analysis) return null;

  if (analysis.type === "owned") {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border px-4 py-3"
        style={{
          background: "var(--accent-green)" + "10",
          borderColor: "var(--accent-green)" + "40",
        }}
      >
        <Check size={16} style={{ color: "var(--accent-green)" }} />
        <span className="text-sm font-bold" style={{ color: "var(--accent-green)" }}>
          You own this edition
        </span>
      </div>
    );
  }

  const { pct, overlapping, total, unique, topSources } = analysis;

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        background: pct > 50 ? "var(--status-out-of-print)" + "10" : "var(--accent-gold)" + "10",
        borderColor: pct > 50 ? "var(--status-out-of-print)" + "40" : "var(--accent-gold)" + "40",
      }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={16}
          className="flex-shrink-0 mt-0.5"
          style={{ color: pct > 50 ? "var(--status-out-of-print)" : "var(--accent-gold)" }}
        />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: pct > 50 ? "var(--status-out-of-print)" : "var(--accent-gold)" }}>
            You already own {pct}% of this edition&apos;s content
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
              {overlapping}/{total}
            </span>{" "}
            issues overlap with your collection.{" "}
            {unique > 0 ? (
              <>
                <span
                  className="font-bold"
                  style={{ color: "var(--accent-green)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {unique}
                </span>{" "}
                unique issue{unique !== 1 ? "s" : ""} you don&apos;t have yet.
              </>
            ) : (
              <span style={{ color: "var(--status-out-of-print)" }}>
                You have all issues from other editions.
              </span>
            )}
          </p>
          {topSources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Overlap from:
              </span>
              {topSources.map(([slug, count]) => (
                <span
                  key={slug}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.75rem",
                  }}
                >
                  {slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} ({count})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

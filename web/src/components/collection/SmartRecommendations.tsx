"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ImportanceLevel, PrintStatus } from "@/lib/types";

interface EditionData {
  slug: string;
  title: string;
  importance: string;
  print_status: string;
  issue_count: number;
}

interface EraData {
  slug: string;
  name: string;
  color: string;
  number: number;
  editions: EditionData[];
  total_issues: number;
}

interface ConnectionData {
  source_type: string;
  source_slug: string;
  target_type: string;
  target_slug: string;
  connection_type: string;
  strength: number;
  confidence: number;
  description: string;
}

interface EditionIssueMap {
  [editionSlug: string]: string[];
}

interface Recommendation {
  edition: EditionData;
  eraName: string;
  eraColor: string;
  score: number;
  reasons: string[];
  overlapPct: number;
}

export default function SmartRecommendations({
  eras,
  connections,
  editionIssueMap,
}: {
  eras: EraData[];
  connections: ConnectionData[];
  editionIssueMap: EditionIssueMap;
}) {
  const { items, hydrated } = useCollection();

  const recommendations = useMemo(() => {
    const ownedSlugs = new Set(
      items
        .filter((i) => i.status === "owned" || i.status === "completed" || i.status === "reading")
        .map((i) => i.edition_slug)
    );

    if (ownedSlugs.size === 0) return [];

    // Collect all owned issue keys
    const ownedIssues = new Set<string>();
    for (const slug of ownedSlugs) {
      const issues = editionIssueMap[slug] || [];
      for (const issue of issues) ownedIssues.add(issue);
    }

    // Build edition lookup
    const allEditions = new Map<string, { edition: EditionData; eraName: string; eraColor: string }>();
    for (const era of eras) {
      for (const ed of era.editions) {
        allEditions.set(ed.slug, { edition: ed, eraName: era.name, eraColor: era.color });
      }
    }

    // Build outgoing connections from owned editions
    const connectionScore = new Map<string, { strength: number; types: Set<string>; from: string[] }>();
    for (const conn of connections) {
      if (
        conn.source_type === "edition" &&
        conn.target_type === "edition" &&
        ownedSlugs.has(conn.source_slug) &&
        !ownedSlugs.has(conn.target_slug)
      ) {
        if (!connectionScore.has(conn.target_slug)) {
          connectionScore.set(conn.target_slug, { strength: 0, types: new Set(), from: [] });
        }
        const entry = connectionScore.get(conn.target_slug)!;
        entry.strength += conn.strength;
        entry.types.add(conn.connection_type);
        entry.from.push(conn.source_slug);
      }
    }

    // Score all non-owned editions
    const scored: Recommendation[] = [];

    for (const [slug, info] of allEditions) {
      if (ownedSlugs.has(slug)) continue;

      const reasons: string[] = [];
      let score = 0;

      // Connection score (strongest signal)
      const connData = connectionScore.get(slug);
      if (connData) {
        score += connData.strength * 10;
        const typeLabels: Record<string, string> = {
          leads_to: "direct sequel to",
          recommended_after: "recommended after",
          spin_off: "spins off from",
          ties_into: "ties into",
          prerequisite: "prerequisite for",
        };
        for (const type of connData.types) {
          const fromEdition = allEditions.get(connData.from[0]);
          const label = typeLabels[type] || "connected to";
          if (fromEdition) {
            reasons.push(`${label} ${fromEdition.edition.title}`);
          }
        }
      }

      // Importance score
      const importanceBonus: Record<string, number> = {
        essential: 30,
        recommended: 15,
        supplemental: 5,
        completionist: 0,
      };
      score += importanceBonus[info.edition.importance] || 0;

      // Print status bonus (prefer buyable)
      if (info.edition.print_status === "in_print") score += 10;
      if (info.edition.print_status === "ongoing") score += 8;
      if (info.edition.print_status === "upcoming") score += 5;

      // Overlap penalty
      const editionIssues = editionIssueMap[slug] || [];
      let overlapCount = 0;
      for (const issue of editionIssues) {
        if (ownedIssues.has(issue)) overlapCount++;
      }
      const overlapPct = editionIssues.length > 0
        ? Math.round((overlapCount / editionIssues.length) * 100)
        : 0;

      // Heavy penalty for high overlap
      if (overlapPct > 80) score -= 50;
      else if (overlapPct > 50) score -= 25;
      else if (overlapPct > 20) score -= 10;

      if (overlapPct > 50) {
        reasons.push(`${overlapPct}% overlap with your collection`);
      }

      // Only include if score is positive and has some reason to be recommended
      if (score > 0 || connData) {
        if (reasons.length === 0) {
          reasons.push(`${info.edition.importance} reading`);
        }
        scored.push({
          edition: info.edition,
          eraName: info.eraName,
          eraColor: info.eraColor,
          score,
          reasons,
          overlapPct,
        });
      }
    }

    // Sort by score descending, take top 10
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 10);
  }, [eras, connections, editionIssueMap, items]);

  if (!hydrated) {
    return (
      <div className="text-center py-12">
        <div
          className="inline-block w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--border-default)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>
          Add editions to your collection to get personalized recommendations.
        </p>
        <Link
          href="/timeline"
          className="inline-block px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          Explore Timeline
        </Link>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--accent-green)" }}>
          You&apos;ve collected everything connected to your current library!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recommendations.map((rec, idx) => (
        <Link
          key={rec.edition.slug}
          href={`/edition/${rec.edition.slug}`}
          className="block group"
        >
          <div
            className="rounded-lg border p-3 sm:p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5 flex items-start gap-3"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
              borderLeft: `3px solid ${rec.eraColor}`,
            }}
          >
            {/* Rank */}
            <span
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: idx < 3 ? "var(--accent-gold)" : "var(--bg-tertiary)",
                color: idx < 3 ? "#000" : "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {idx + 1}
            </span>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors truncate">
                {rec.edition.title}
              </h4>

              {/* Reasons */}
              <div className="mt-1 space-y-0.5">
                {rec.reasons.slice(0, 2).map((reason, i) => (
                  <p
                    key={i}
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {reason}
                  </p>
                ))}
              </div>

              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <ImportanceBadge level={rec.edition.importance as ImportanceLevel} />
                <StatusBadge status={rec.edition.print_status as PrintStatus} />
                {rec.overlapPct > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{
                      background: rec.overlapPct > 50
                        ? "var(--status-out-of-print)"
                        : rec.overlapPct > 20
                          ? "var(--status-ongoing)"
                          : "var(--bg-tertiary)",
                      color: rec.overlapPct > 20 ? "#fff" : "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.5rem",
                    }}
                  >
                    {rec.overlapPct}% OVERLAP
                  </span>
                )}
              </div>
            </div>

            <span
              className="text-xs flex-shrink-0"
              style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
            >
              {rec.eraName}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

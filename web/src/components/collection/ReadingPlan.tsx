"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BookOpen, ArrowDown, Route } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import PathMatchCard from "./PathMatchCard";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  matchPathsToCollection,
  computeReadingOrder,
  type PathSummary,
} from "@/lib/reading-order";
import type { ImportanceLevel, PrintStatus } from "@/lib/types";

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

interface EraData {
  slug: string;
  name: string;
  color: string;
  number: number;
  editions: {
    slug: string;
    title: string;
    importance: string;
    print_status: string;
    issue_count: number;
  }[];
}

const CONNECTION_LABELS: Record<string, string> = {
  leads_to: "Leads to",
  recommended_after: "Read after",
  prerequisite: "Prerequisite for",
  spin_off: "Spins off into",
  ties_into: "Ties into",
  references: "References",
};

export default function ReadingPlan({
  pathSummaries,
  connections,
  eras,
}: {
  pathSummaries: PathSummary[];
  connections: ConnectionData[];
  eras: EraData[];
}) {
  const { items, hydrated } = useCollection();

  const ownedSlugs = useMemo(
    () =>
      new Set(
        items
          .filter((i) => i.status === "owned" || i.status === "completed")
          .map((i) => i.edition_slug)
      ),
    [items]
  );

  // Build edition lookup from eras data
  const editionMap = useMemo(() => {
    const map = new Map<
      string,
      {
        slug: string;
        era_number: number;
        importance: string;
        title: string;
        print_status: string;
        era_name: string;
        era_color: string;
      }
    >();
    for (const era of eras) {
      for (const ed of era.editions) {
        map.set(ed.slug, {
          slug: ed.slug,
          era_number: era.number,
          importance: ed.importance,
          title: ed.title,
          print_status: ed.print_status,
          era_name: era.name,
          era_color: era.color,
        });
      }
    }
    return map;
  }, [eras]);

  // Path matching
  const pathMatches = useMemo(
    () => matchPathsToCollection(pathSummaries, ownedSlugs),
    [pathSummaries, ownedSlugs]
  );

  // Compute reading order
  const readingOrder = useMemo(
    () => computeReadingOrder(ownedSlugs, editionMap, connections),
    [ownedSlugs, editionMap, connections]
  );

  // Build a connection description map for display between reading order entries
  const connectionLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const c of connections) {
      if (c.source_type !== "edition" || c.target_type !== "edition") continue;
      const key = `${c.source_slug}→${c.target_slug}`;
      const existing = labels.get(key);
      if (!existing || c.strength > 5) {
        labels.set(key, CONNECTION_LABELS[c.connection_type] || c.connection_type);
      }
    }
    return labels;
  }, [connections]);

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

  if (ownedSlugs.size === 0) {
    return (
      <div
        className="rounded-lg border p-12 text-center"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <Route size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Add editions to your collection to see reading path matches and an optimal reading order.
        </p>
        <Link
          href="/search"
          className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          Browse Editions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Path Matching Section */}
      <section>
        <h2
          className="text-lg font-bold mb-1"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-bricolage), sans-serif",
          }}
        >
          Reading Path Progress
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
          How your collection maps to curated reading paths. Expand to see what you own vs. what&apos;s missing.
        </p>

        {pathMatches.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Your owned editions don&apos;t match any reading paths yet. Keep collecting!
          </p>
        ) : (
          <div className="space-y-2">
            {pathMatches.map((match) => (
              <PathMatchCard key={match.path.slug} match={match} />
            ))}
          </div>
        )}
      </section>

      {/* Optimal Reading Order Section */}
      <section>
        <h2
          className="text-lg font-bold mb-1"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-bricolage), sans-serif",
          }}
        >
          Your Reading Order
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
          Optimal reading sequence for your owned editions, sorted by story connections and chronology.
        </p>

        <div className="space-y-0">
          {readingOrder.map((slug, index) => {
            const ed = editionMap.get(slug);
            if (!ed) return null;

            // Find connection label from previous entry
            const prevSlug = index > 0 ? readingOrder[index - 1] : null;
            const label = prevSlug
              ? connectionLabels.get(`${prevSlug}→${slug}`)
              : null;

            return (
              <div key={slug}>
                {/* Connection arrow between entries */}
                {index > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-4">
                    <ArrowDown size={12} style={{ color: "var(--text-tertiary)" }} />
                    {label && (
                      <span
                        className="text-xs"
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: "0.6rem",
                        }}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                )}

                {/* Edition entry */}
                <div
                  className="flex items-center gap-3 rounded-lg border p-3"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                    borderLeft: `3px solid ${ed.era_color}`,
                  }}
                >
                  {/* Number */}
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {index + 1}
                  </span>

                  {/* Title + era */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/edition/${slug}`}
                      className="text-sm font-bold truncate block transition-colors hover:text-[var(--accent-red)]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {ed.title}
                    </Link>
                    <span
                      className="text-xs"
                      style={{
                        color: ed.era_color,
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.65rem",
                      }}
                    >
                      {ed.era_name}
                    </span>
                  </div>

                  {/* Badges */}
                  <ImportanceBadge level={ed.importance as ImportanceLevel} />
                </div>
              </div>
            );
          })}
        </div>

        {readingOrder.length === 0 && ownedSlugs.size > 0 && (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Could not determine reading order for your collection.
          </p>
        )}
      </section>
    </div>
  );
}

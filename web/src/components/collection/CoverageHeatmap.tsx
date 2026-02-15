"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";

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
  total_issues: number;
}

export default function CoverageHeatmap({ eras }: { eras: EraData[] }) {
  const { items, hydrated } = useCollection();

  const coverage = useMemo(() => {
    const ownedSlugs = new Set(
      items
        .filter((i) => i.status === "owned" || i.status === "completed")
        .map((i) => i.edition_slug)
    );

    return eras.map((era) => {
      const total = era.editions.length;
      const owned = era.editions.filter((e) => ownedSlugs.has(e.slug)).length;
      const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
      const essentialTotal = era.editions.filter((e) => e.importance === "essential").length;
      const essentialOwned = era.editions.filter(
        (e) => e.importance === "essential" && ownedSlugs.has(e.slug)
      ).length;
      const essentialPct = essentialTotal > 0 ? Math.round((essentialOwned / essentialTotal) * 100) : 0;
      const missing = era.editions.filter((e) => !ownedSlugs.has(e.slug));

      return {
        ...era,
        total,
        owned,
        pct,
        essentialTotal,
        essentialOwned,
        essentialPct,
        missing,
      };
    });
  }, [eras, items]);

  const totalEditions = eras.reduce((sum, e) => sum + e.editions.length, 0);
  const totalOwned = coverage.reduce((sum, e) => sum + e.owned, 0);
  const overallPct = totalEditions > 0 ? Math.round((totalOwned / totalEditions) * 100) : 0;

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
          Add editions to your collection to see coverage data.
        </p>
        <Link
          href="/search"
          className="inline-block px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          Browse Editions
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Overall progress */}
      <div
        className="rounded-lg border p-5 mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Overall Collection
          </h3>
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {totalOwned} / {totalEditions} editions
          </span>
        </div>
        <div
          className="w-full h-3 rounded-full overflow-hidden"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${overallPct}%`,
              background: overallPct === 100
                ? "var(--accent-green)"
                : overallPct > 50
                  ? "var(--accent-gold)"
                  : "var(--accent-red)",
            }}
          />
        </div>
        <div className="text-right mt-1">
          <span
            className="text-lg font-bold"
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              color: overallPct === 100
                ? "var(--accent-green)"
                : overallPct > 50
                  ? "var(--accent-gold)"
                  : "var(--accent-red)",
            }}
          >
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Per-era breakdown */}
      <div className="space-y-3">
        {coverage.map((era) => (
          <div
            key={era.slug}
            className="rounded-lg border p-4 transition-all hover:shadow-md"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
              borderLeft: `4px solid ${era.color}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/timeline#${era.slug}`}
                className="text-sm font-bold tracking-tight transition-colors hover:text-[var(--accent-red)]"
                style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                {era.name}
              </Link>
              <div className="flex items-center gap-3">
                {era.essentialTotal > 0 && (
                  <span
                    className="text-xs"
                    style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    <span style={{ color: "var(--importance-essential)" }}>
                      {era.essentialOwned}/{era.essentialTotal}
                    </span>{" "}
                    <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
                      essential
                    </span>
                  </span>
                )}
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {era.owned}/{era.total}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-2 rounded-full overflow-hidden mb-1"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${era.pct}%`,
                  background: era.color,
                  opacity: era.pct === 0 ? 0 : 1,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold"
                style={{
                  color: era.pct === 100 ? "var(--accent-green)" : era.color,
                  fontFamily: "var(--font-bricolage), sans-serif",
                }}
              >
                {era.pct}%
              </span>
              {era.missing.length > 0 && era.missing.length <= 3 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
                >
                  Missing: {era.missing.map((m) => m.title).join(", ")}
                </span>
              )}
              {era.missing.length > 3 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
                >
                  {era.missing.length} editions remaining
                </span>
              )}
              {era.pct === 100 && (
                <span
                  className="text-xs font-bold"
                  style={{ color: "var(--accent-green)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
                >
                  COMPLETE
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

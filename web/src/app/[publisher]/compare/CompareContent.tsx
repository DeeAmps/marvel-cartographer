"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GitCompareArrows, X, Search, Plus, AlertTriangle, Check, ArrowRight } from "lucide-react";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import ComparisonChart from "@/components/compare/ComparisonChart";
import ComparisonVerdict from "@/components/compare/ComparisonVerdict";
import ComparisonVote from "@/components/compare/ComparisonVote";
import type { ImportanceLevel, PrintStatus } from "@/lib/types";

interface EditionData {
  slug: string;
  title: string;
  format: string;
  issues_collected: string;
  issue_count: number;
  page_count?: number;
  cover_price?: number;
  print_status: string;
  importance: string;
  era_slug?: string;
  era_name?: string;
  synopsis: string;
  creator_names?: string[];
  cover_image_url: string | null;
}

interface SuggestedComparison {
  slug_a: string;
  title_a: string;
  slug_b: string;
  title_b: string;
  overlap_count: number;
  reason: string;
}

export default function CompareContent({
  allEditions,
  editionIssueMap,
  suggestedComparisons,
}: {
  allEditions: EditionData[];
  editionIssueMap: Record<string, string[]>;
  suggestedComparisons: SuggestedComparison[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const selectedEditions = useMemo(
    () => selected.map((slug) => allEditions.find((e) => e.slug === slug)!).filter(Boolean),
    [selected, allEditions]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allEditions.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return allEditions
      .filter(
        (e) =>
          !selected.includes(e.slug) &&
          (e.title.toLowerCase().includes(q) ||
            e.issues_collected.toLowerCase().includes(q) ||
            (e.creator_names || []).some((c) => c.toLowerCase().includes(q)))
      )
      .slice(0, 20);
  }, [searchQuery, allEditions, selected]);

  // Compute overlap matrix between selected editions
  const overlapMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { count: number; issues: string[] }>> = {};
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = selected[i];
        const b = selected[j];
        const issuesA = new Set(editionIssueMap[a] || []);
        const issuesB = editionIssueMap[b] || [];
        const overlap = issuesB.filter((issue) => issuesA.has(issue));
        if (!matrix[a]) matrix[a] = {};
        if (!matrix[b]) matrix[b] = {};
        matrix[a][b] = { count: overlap.length, issues: overlap };
        matrix[b][a] = { count: overlap.length, issues: overlap };
      }
    }
    return matrix;
  }, [selected, editionIssueMap]);

  // Unique issues per edition (not in any other selected edition)
  const uniqueIssues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const slug of selected) {
      const myIssues = editionIssueMap[slug] || [];
      const othersIssues = new Set<string>();
      for (const other of selected) {
        if (other === slug) continue;
        for (const issue of editionIssueMap[other] || []) {
          othersIssues.add(issue);
        }
      }
      result[slug] = myIssues.filter((i) => !othersIssues.has(i));
    }
    return result;
  }, [selected, editionIssueMap]);

  function addEdition(slug: string) {
    if (selected.length >= 4) return;
    if (!selected.includes(slug)) {
      setSelected([...selected, slug]);
      setSearchQuery("");
      setShowPicker(false);
    }
  }

  function removeEdition(slug: string) {
    setSelected(selected.filter((s) => s !== slug));
  }

  function loadSuggested(slugA: string, slugB: string) {
    setSelected([slugA, slugB]);
  }

  const formatLabel = (f: string) => f.replace(/_/g, " ").toUpperCase();
  const priceLabel = (p?: number) => (p ? `$${p.toFixed(2)}` : "N/A");

  return (
    <div>
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Compare Editions
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        Pick up to 4 editions to compare side-by-side &mdash; format, page count, issue lists, overlap, and value.
      </p>

      {/* Selected editions chips + add button */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {selectedEditions.map((ed) => (
          <div
            key={ed.slug}
            className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded text-xs font-bold"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <span className="truncate max-w-[200px]">{ed.title}</span>
            <button
              onClick={() => removeEdition(ed.slug)}
              className="p-0.5 rounded-full transition-colors hover:bg-[var(--accent-red)]/20"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {selected.length < 4 && (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all"
            style={{
              border: "1px dashed var(--border-default)",
              color: "var(--text-tertiary)",
            }}
          >
            <Plus size={12} />
            Add Edition
          </button>
        )}
      </div>

      {/* Edition picker modal */}
      {showPicker && (
        <div
          className="rounded-lg border p-4 mb-6"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search editions by title, issues, or creator..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
              autoFocus
            />
            <button
              onClick={() => setShowPicker(false)}
              className="p-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {searchResults.map((ed) => {
              const isSelected = selected.includes(ed.slug);
              return (
                <button
                  key={ed.slug}
                  onClick={() => !isSelected && addEdition(ed.slug)}
                  disabled={isSelected}
                  className="w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2"
                  style={{
                    color: isSelected ? "var(--text-tertiary)" : "var(--text-primary)",
                    opacity: isSelected ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--bg-tertiary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span className="flex-1 truncate">{ed.title}</span>
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    {ed.issue_count} issues
                  </span>
                  {isSelected && <Check size={12} style={{ color: "var(--accent-green)" }} />}
                </button>
              );
            })}
            {searchResults.length === 0 && (
              <p className="text-xs py-4 text-center" style={{ color: "var(--text-tertiary)" }}>
                No editions found matching &quot;{searchQuery}&quot;
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {selected.length === 0 && (
        <div
          className="rounded-lg border p-12 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <GitCompareArrows size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Select 2 or more editions to compare them side-by-side.
          </p>
        </div>
      )}

      {/* Single edition selected */}
      {selected.length === 1 && (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Add at least one more edition to start comparing.
          </p>
        </div>
      )}

      {/* Comparison table */}
      {selected.length >= 2 && (
        <div className="space-y-6">
          {/* Side-by-side cards */}
          <div className="overflow-x-auto">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${selected.length}, minmax(200px, 1fr))`,
                minWidth: selected.length > 2 ? `${selected.length * 220}px` : undefined,
              }}
            >
              {selectedEditions.map((ed) => (
                <div
                  key={ed.slug}
                  className="rounded-lg border p-4"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
                >
                  <Link
                    href={`/edition/${ed.slug}`}
                    className="text-sm font-bold hover:text-[var(--accent-red)] transition-colors block mb-2 line-clamp-2"
                    style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                  >
                    {ed.title}
                  </Link>

                  <div className="space-y-2 text-xs">
                    <Row label="Format" value={formatLabel(ed.format)} />
                    <Row label="Issues" value={ed.issues_collected} mono />
                    <Row label="Issue Count" value={String(ed.issue_count)} mono />
                    <Row label="Pages" value={ed.page_count ? String(ed.page_count) : "N/A"} mono />
                    <Row label="Cover Price" value={priceLabel(ed.cover_price)} mono />
                    {ed.page_count && ed.cover_price ? (
                      <Row
                        label="Cost/Page"
                        value={`$${(ed.cover_price / ed.page_count).toFixed(3)}`}
                        mono
                      />
                    ) : null}
                    <Row label="Era" value={ed.era_name || "N/A"} />
                    <div>
                      <span style={{ color: "var(--text-tertiary)" }}>Status</span>
                      <div className="mt-0.5">
                        <StatusBadge status={ed.print_status as PrintStatus} />
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-tertiary)" }}>Importance</span>
                      <div className="mt-0.5">
                        <ImportanceBadge level={ed.importance as ImportanceLevel} />
                      </div>
                    </div>
                    {ed.creator_names && ed.creator_names.length > 0 && (
                      <div>
                        <span style={{ color: "var(--text-tertiary)" }}>Creators</span>
                        <p className="mt-0.5" style={{ color: "var(--text-primary)" }}>
                          {ed.creator_names.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual bar charts */}
          <ComparisonChart editions={selectedEditions} />

          {/* "Which Should I Buy?" verdict (only for 2 editions) */}
          {selected.length === 2 && (
            <ComparisonVerdict
              editions={selectedEditions}
              uniqueIssueCounts={Object.fromEntries(
                selected.map((slug) => [slug, (uniqueIssues[slug] || []).length])
              )}
              totalIssueCounts={Object.fromEntries(
                selected.map((slug) => [slug, (editionIssueMap[slug] || []).length])
              )}
            />
          )}

          {/* Community vote (only for 2 editions) */}
          {selected.length === 2 && (
            <ComparisonVote editions={selectedEditions} />
          )}

          {/* Overlap analysis */}
          <div
            className="rounded-lg border p-4"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
          >
            <h3
              className="text-sm font-bold tracking-tight mb-4"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              Issue Overlap Analysis
            </h3>

            {/* Pairwise overlap */}
            <div className="space-y-3 mb-4">
              {selected.map((a, i) =>
                selected.slice(i + 1).map((b) => {
                  const data = overlapMatrix[a]?.[b];
                  if (!data) return null;
                  const edA = allEditions.find((e) => e.slug === a)!;
                  const edB = allEditions.find((e) => e.slug === b)!;
                  const issuesA = (editionIssueMap[a] || []).length;
                  const issuesB = (editionIssueMap[b] || []).length;
                  const pctA = issuesA > 0 ? Math.round((data.count / issuesA) * 100) : 0;
                  const pctB = issuesB > 0 ? Math.round((data.count / issuesB) * 100) : 0;

                  return (
                    <div
                      key={`${a}-${b}`}
                      className="rounded border p-3"
                      style={{
                        borderColor: data.count > 0 ? "var(--accent-gold)" : "var(--border-default)",
                        borderLeftWidth: "3px",
                        borderLeftColor: data.count > 0 ? "var(--accent-gold)" : "var(--border-default)",
                      }}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        {data.count > 0 ? (
                          <AlertTriangle size={14} style={{ color: "var(--accent-gold)" }} className="flex-shrink-0 mt-0.5" />
                        ) : (
                          <Check size={14} style={{ color: "var(--accent-green)" }} className="flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">
                            <span className="truncate">{edA.title}</span>
                            {" vs "}
                            <span className="truncate">{edB.title}</span>
                          </p>
                          {data.count > 0 ? (
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <span
                                className="font-bold"
                                style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace" }}
                              >
                                {data.count} overlapping issue{data.count !== 1 ? "s" : ""}
                              </span>
                              {" "}({pctA}% of {edA.title.split(" ").slice(0, 3).join(" ")}..., {pctB}% of {edB.title.split(" ").slice(0, 3).join(" ")}...)
                            </p>
                          ) : (
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "var(--accent-green)" }}
                            >
                              No overlap &mdash; completely unique content
                            </p>
                          )}
                          {data.count > 0 && data.issues.length <= 10 && (
                            <p
                              className="text-xs mt-1"
                              style={{
                                color: "var(--text-tertiary)",
                                fontFamily: "var(--font-geist-mono), monospace",
                                fontSize: "0.75rem",
                              }}
                            >
                              {data.issues.join(", ")}
                            </p>
                          )}
                          {data.count > 10 && (
                            <p
                              className="text-xs mt-1"
                              style={{
                                color: "var(--text-tertiary)",
                                fontFamily: "var(--font-geist-mono), monospace",
                                fontSize: "0.75rem",
                              }}
                            >
                              {data.issues.slice(0, 8).join(", ")} + {data.count - 8} more
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Unique issues per edition */}
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-2 mt-4"
              style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "var(--text-secondary)" }}
            >
              UNIQUE ISSUES PER EDITION
            </h4>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
              {selectedEditions.map((ed) => {
                const unique = uniqueIssues[ed.slug] || [];
                const total = (editionIssueMap[ed.slug] || []).length;
                const pct = total > 0 ? Math.round((unique.length / total) * 100) : 0;
                return (
                  <div key={ed.slug} className="text-center">
                    <p
                      className="text-lg font-bold"
                      style={{
                        fontFamily: "var(--font-bricolage), sans-serif",
                        color: pct === 100 ? "var(--accent-green)" : pct > 50 ? "var(--text-primary)" : "var(--accent-gold)",
                      }}
                    >
                      {pct}%
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {unique.length} / {total} unique
                    </p>
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
                    >
                      {ed.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Value comparison */}
          {selectedEditions.some((e) => e.cover_price && e.issue_count) && (
            <div
              className="rounded-lg border p-4"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
            >
              <h3
                className="text-sm font-bold tracking-tight mb-3"
                style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                Value Comparison
              </h3>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
                {selectedEditions.map((ed) => {
                  const costPerIssue = ed.cover_price && ed.issue_count
                    ? ed.cover_price / ed.issue_count
                    : null;
                  return (
                    <div key={ed.slug} className="text-center">
                      <p
                        className="text-lg font-bold"
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          color: "var(--text-primary)",
                        }}
                      >
                        {costPerIssue ? `$${costPerIssue.toFixed(2)}` : "N/A"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        per issue
                      </p>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
                      >
                        {ed.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggested Comparisons */}
      {suggestedComparisons.length > 0 && (
        <div className="mt-8">
          <h2
            className="text-lg font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Popular Comparisons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestedComparisons.map((sc) => (
              <button
                key={`${sc.slug_a}-${sc.slug_b}`}
                onClick={() => loadSuggested(sc.slug_a, sc.slug_b)}
                className="rounded-lg border p-3 text-left transition-all hover:border-[var(--accent-gold)]"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold truncate flex-1" style={{ color: "var(--text-primary)" }}>
                    {sc.title_a}
                  </span>
                  <ArrowRight size={10} style={{ color: "var(--text-tertiary)" }} className="flex-shrink-0" />
                  <span className="text-xs font-bold truncate flex-1 text-right" style={{ color: "var(--text-primary)" }}>
                    {sc.title_b}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--accent-gold)" }}>
                  {sc.reason}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <p
        className="mt-0.5"
        style={{
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-geist-mono), monospace" : undefined,
        }}
      >
        {value}
      </p>
    </div>
  );
}

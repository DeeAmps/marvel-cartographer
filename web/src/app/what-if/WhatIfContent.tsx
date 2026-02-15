"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shuffle,
  ArrowRight,
  Route,
  Palette,
  Search,
  Filter,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import {
  bfsPath,
  dijkstraPath,
  themeFilter,
  getAvailableThemes,
} from "@/lib/graph-algorithms";
import type { PathEntry } from "@/lib/graph-algorithms";
import type { CollectedEdition, ImportanceLevel } from "@/lib/types";

type Mode = "start-from-here" | "shortest-path" | "theme-path";

interface RawConnection {
  source_type: string;
  source_slug: string;
  target_type: string;
  target_slug: string;
  connection_type: string;
  strength: number;
  confidence: number;
  description: string;
}

interface Props {
  editions: CollectedEdition[];
  connections: RawConnection[];
}

const connectionTypeLabels: Record<string, string> = {
  leads_to: "continues in",
  spin_off: "spins off into",
  recommended_after: "recommended after",
  ties_into: "ties into",
  prerequisite: "prerequisite for",
  start: "starting point",
};

const IMPORTANCE_OPTIONS: { value: ImportanceLevel; label: string; color: string }[] = [
  { value: "essential", label: "Essential", color: "var(--importance-essential)" },
  { value: "recommended", label: "Recommended", color: "var(--importance-recommended)" },
  { value: "supplemental", label: "Supplemental", color: "var(--importance-supplemental)" },
  { value: "completionist", label: "Completionist", color: "var(--importance-completionist)" },
];

export default function WhatIfContent({ editions, connections }: Props) {
  const [mode, setMode] = useState<Mode>("start-from-here");
  const [startSlug, setStartSlug] = useState("");
  const [endSlug, setEndSlug] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("cosmic");
  const [importanceFilter, setImportanceFilter] = useState<ImportanceLevel[]>([
    "essential",
    "recommended",
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [endSearchQuery, setEndSearchQuery] = useState("");
  const [maxDepth, setMaxDepth] = useState(10);

  const themes = getAvailableThemes();

  // Filter editions for dropdown
  const filteredEditions = useMemo(() => {
    if (!searchQuery) return editions.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return editions
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.issues_collected.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [editions, searchQuery]);

  const filteredEndEditions = useMemo(() => {
    if (!endSearchQuery) return editions.slice(0, 20);
    const q = endSearchQuery.toLowerCase();
    return editions
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.issues_collected.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [editions, endSearchQuery]);

  // Compute results
  const results: PathEntry[] = useMemo(() => {
    if (mode === "start-from-here" && startSlug) {
      return bfsPath(startSlug, connections, editions, {
        maxDepth,
        importanceFilter:
          importanceFilter.length > 0 ? importanceFilter : undefined,
      });
    }
    if (mode === "shortest-path" && startSlug && endSlug) {
      const result = dijkstraPath(startSlug, endSlug, connections, editions);
      return result.path;
    }
    if (mode === "theme-path") {
      return themeFilter(selectedTheme, connections, editions, {
        importanceFilter:
          importanceFilter.length > 0 ? importanceFilter : undefined,
      });
    }
    return [];
  }, [
    mode,
    startSlug,
    endSlug,
    selectedTheme,
    importanceFilter,
    maxDepth,
    connections,
    editions,
  ]);

  const selectedStart = editions.find((e) => e.slug === startSlug);
  const selectedEnd = editions.find((e) => e.slug === endSlug);

  const toggleImportance = (level: ImportanceLevel) => {
    setImportanceFilter((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shuffle size={20} style={{ color: "var(--accent-purple)" }} />
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--accent-purple)" }}
          >
            What If?
          </span>
        </div>
        <h1
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          What If? Paths
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Explore dynamically computed reading paths through the Marvel Universe.
          Pick a starting point and see where the story takes you.
        </p>
      </div>

      {/* Mode tabs */}
      <div
        className="flex rounded-lg border mb-6 overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        {[
          { id: "start-from-here" as Mode, label: "Start From Here", icon: Shuffle },
          { id: "shortest-path" as Mode, label: "Shortest Path", icon: Route },
          { id: "theme-path" as Mode, label: "Theme Path", icon: Palette },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className="flex items-center gap-2 flex-1 px-4 py-3 text-sm font-medium transition-all"
            style={{
              background:
                mode === tab.id ? "var(--accent-purple)" : "transparent",
              color: mode === tab.id ? "#fff" : "var(--text-secondary)",
            }}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">
              {tab.label.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div
        className="rounded-lg border p-4 mb-6 space-y-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        {/* Edition picker - Start */}
        {(mode === "start-from-here" || mode === "shortest-path") && (
          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider mb-2 block"
              style={{ color: "var(--text-tertiary)" }}
            >
              {mode === "shortest-path" ? "From" : "Starting Edition"}
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              />
              <input
                type="text"
                placeholder="Search editions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                }}
              />
            </div>
            {searchQuery && (
              <div
                className="mt-1 rounded-lg border max-h-48 overflow-y-auto"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-default)",
                }}
              >
                {filteredEditions.map((e) => (
                  <button
                    key={e.slug}
                    onClick={() => {
                      setStartSlug(e.slug);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span className="font-medium">{e.title}</span>
                    <span
                      className="ml-2 text-xs"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {e.issues_collected}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedStart && (
              <div
                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-tertiary)" }}
              >
                <span style={{ color: "var(--accent-purple)" }}>Selected:</span>
                <span className="font-medium">{selectedStart.title}</span>
                <button
                  onClick={() => setStartSlug("")}
                  className="ml-auto text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edition picker - End (Shortest Path only) */}
        {mode === "shortest-path" && (
          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider mb-2 block"
              style={{ color: "var(--text-tertiary)" }}
            >
              To
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              />
              <input
                type="text"
                placeholder="Search destination edition..."
                value={endSearchQuery}
                onChange={(e) => setEndSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                }}
              />
            </div>
            {endSearchQuery && (
              <div
                className="mt-1 rounded-lg border max-h-48 overflow-y-auto"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-default)",
                }}
              >
                {filteredEndEditions.map((e) => (
                  <button
                    key={e.slug}
                    onClick={() => {
                      setEndSlug(e.slug);
                      setEndSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span className="font-medium">{e.title}</span>
                    <span
                      className="ml-2 text-xs"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {e.issues_collected}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedEnd && (
              <div
                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-tertiary)" }}
              >
                <span style={{ color: "var(--accent-purple)" }}>
                  Destination:
                </span>
                <span className="font-medium">{selectedEnd.title}</span>
                <button
                  onClick={() => setEndSlug("")}
                  className="ml-auto text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme picker */}
        {mode === "theme-path" && (
          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider mb-2 block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background:
                      selectedTheme === theme.id
                        ? "var(--accent-purple)"
                        : "var(--bg-tertiary)",
                    color:
                      selectedTheme === theme.id
                        ? "#fff"
                        : "var(--text-secondary)",
                    border: `1px solid ${
                      selectedTheme === theme.id
                        ? "var(--accent-purple)"
                        : "var(--border-default)"
                    }`,
                  }}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Importance filter */}
        <div>
          <label
            className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Filter size={12} />
            Importance Filter
          </label>
          <div className="flex flex-wrap gap-2">
            {IMPORTANCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleImportance(opt.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                style={{
                  background: importanceFilter.includes(opt.value)
                    ? opt.color
                    : "var(--bg-tertiary)",
                  color: importanceFilter.includes(opt.value)
                    ? "#fff"
                    : "var(--text-tertiary)",
                  border: `1px solid ${
                    importanceFilter.includes(opt.value)
                      ? opt.color
                      : "var(--border-default)"
                  }`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Depth slider (BFS only) */}
        {mode === "start-from-here" && (
          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider mb-2 block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Max Depth: {maxDepth}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full accent-[var(--accent-purple)]"
            />
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {mode === "shortest-path"
                ? `Shortest Path (${results.length} steps)`
                : `${results.length} Editions Found`}
            </h2>
            <span
              className="text-xs"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {mode === "start-from-here" && `depth ≤ ${maxDepth}`}
              {mode === "theme-path" && selectedTheme}
            </span>
          </div>

          <div className="space-y-2">
            {results.map((entry, idx) => (
              <div key={entry.edition.slug}>
                {/* Connection arrow from previous */}
                {idx > 0 && entry.connectionType !== "start" && (
                  <div className="ml-6 my-1">
                    <div
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <ArrowRight size={10} />
                      <span>
                        {connectionTypeLabels[entry.connectionType] ||
                          entry.connectionType.replace(/_/g, " ")}
                        {entry.connectionDescription && (
                          <span
                            className="ml-1"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            — {entry.connectionDescription}
                          </span>
                        )}
                      </span>
                      <span
                        className="ml-auto text-xs"
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        str:{entry.strength} conf:{entry.confidence}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Edition card */}
                <Link
                  href={`/edition/${entry.edition.slug}`}
                  className="group block"
                >
                  <div
                    className="rounded-lg border p-4 transition-all hover:border-[var(--accent-purple)] hover:shadow-lg hover:shadow-[var(--accent-purple)]/5"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-default)",
                      borderLeft: `3px solid ${
                        entry.edition.era_color || "var(--border-default)"
                      }`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{
                              background: "var(--bg-tertiary)",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            #{idx + 1}
                          </span>
                          {entry.depth > 0 && (
                            <span
                              className="text-xs"
                              style={{
                                color: "var(--text-tertiary)",
                                fontFamily:
                                  "var(--font-geist-mono), monospace",
                              }}
                            >
                              depth {entry.depth}
                            </span>
                          )}
                          {entry.edition.era_name && (
                            <span
                              className="text-xs"
                              style={{
                                color:
                                  entry.edition.era_color ||
                                  "var(--text-tertiary)",
                              }}
                            >
                              {entry.edition.era_name}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold group-hover:text-[var(--accent-purple)] transition-colors">
                          {entry.edition.title}
                        </h3>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{
                            color: "var(--text-tertiary)",
                            fontFamily: "var(--font-geist-mono), monospace",
                          }}
                        >
                          {entry.edition.issues_collected}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <ImportanceBadge level={entry.edition.importance} />
                        <StatusBadge status={entry.edition.print_status} />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <Shuffle
            size={48}
            className="mx-auto mb-4"
            style={{ color: "var(--text-tertiary)" }}
          />
          <p
            className="text-lg font-bold mb-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {mode === "start-from-here" && "Pick a starting edition"}
            {mode === "shortest-path" && "Select start and destination editions"}
            {mode === "theme-path" && "Select a theme to explore"}
          </p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {mode === "start-from-here" &&
              "Search above to find an edition, then see where the story leads."}
            {mode === "shortest-path" &&
              "Find the shortest reading path between any two editions."}
            {mode === "theme-path" &&
              "Explore curated paths through cosmic, mutant, and street-level Marvel."}
          </p>
        </div>
      )}
    </div>
  );
}

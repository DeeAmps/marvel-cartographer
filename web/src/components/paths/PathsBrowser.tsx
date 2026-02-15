"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, X } from "lucide-react";

interface PathSummary {
  slug: string;
  name: string;
  category: string;
  path_type: string;
  difficulty: string;
  description: string;
  entryCount: number;
  estimated_issues: number;
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "getting-started", label: "Getting Started" },
  { key: "character", label: "Characters" },
  { key: "character-deep-dive", label: "Deep Dives" },
  { key: "team", label: "Teams" },
  { key: "event", label: "Events" },
  { key: "event-guide", label: "Event Guides" },
  { key: "thematic", label: "Thematic" },
  { key: "creator", label: "Creators" },
];

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "completionist"];

const difficultyColors: Record<string, string> = {
  beginner: "var(--accent-green)",
  intermediate: "var(--accent-gold)",
  advanced: "var(--accent-red)",
  completionist: "var(--text-tertiary)",
};

export default function PathsBrowser({ paths }: { paths: PathSummary[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = paths;

    if (activeCategory !== "all") {
      results = results.filter((p) => p.category === activeCategory);
    }

    if (activeDifficulty) {
      results = results.filter((p) => p.difficulty === activeDifficulty);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return results;
  }, [paths, query, activeCategory, activeDifficulty]);

  const hasActiveFilters =
    query.trim() !== "" ||
    activeCategory !== "all" ||
    activeDifficulty !== null;

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search paths by name or description..."
          className="w-full pl-9 pr-9 py-2.5 rounded-lg text-sm border outline-none transition-colors focus:border-[var(--accent-red)]"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-2 mb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors shrink-0"
              style={{
                background: isActive ? "var(--accent-red)" : "transparent",
                borderColor: isActive
                  ? "var(--accent-red)"
                  : "var(--border-default)",
                color: isActive ? "#fff" : "var(--text-secondary)",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-1.5 mb-6">
        {DIFFICULTIES.map((d) => {
          const isActive = activeDifficulty === d;
          return (
            <button
              key={d}
              onClick={() => setActiveDifficulty(isActive ? null : d)}
              className="px-2.5 py-1 rounded text-xs font-bold border transition-colors"
              style={{
                color: isActive ? "#fff" : difficultyColors[d],
                borderColor: difficultyColors[d],
                background: isActive ? difficultyColors[d] : "transparent",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {d.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Results count + clear */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-xs"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {filtered.length} path{filtered.length !== 1 ? "s" : ""}
        </span>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setQuery("");
              setActiveCategory("all");
              setActiveDifficulty(null);
            }}
            className="text-xs transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Path grid */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <BookOpen
            size={32}
            className="mx-auto mb-3"
            style={{ color: "var(--text-tertiary)" }}
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No paths match your filters.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setActiveCategory("all");
              setActiveDifficulty(null);
            }}
            className="text-xs mt-2 transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.slug}
              href={`/path/${p.slug}`}
              className="group rounded-lg border p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border-default)",
              }}
            >
              <h3 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors leading-snug mb-1.5">
                {p.name}
              </h3>
              <p
                className="text-xs leading-relaxed mb-3 line-clamp-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                {p.description}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                  style={{
                    color: difficultyColors[p.difficulty] || "var(--text-tertiary)",
                    borderColor:
                      difficultyColors[p.difficulty] || "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {p.difficulty.toUpperCase()}
                </span>
                <span
                  className="text-[10px]"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {p.entryCount} editions
                </span>
                <span
                  className="text-[10px]"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  ~{p.estimated_issues} issues
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useCollection, type CollectionStatus } from "@/hooks/useCollection";
import {
  BookOpen, Check, Eye, Heart, Star, Download, Upload, BarChart3,
  Sparkles, LogIn, LayoutGrid, List, X, Route,
} from "lucide-react";
import CoverImage from "@/components/ui/CoverImage";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import CoverageHeatmap from "@/components/collection/CoverageHeatmap";
import SmartRecommendations from "@/components/collection/SmartRecommendations";
import ReadingPlan from "@/components/collection/ReadingPlan";
import NewsletterSubscribe from "@/components/watcher/NewsletterSubscribe";
import type { PathSummary } from "@/lib/reading-order";
import type { ImportanceLevel, PrintStatus } from "@/lib/types";

const statusConfig: Record<CollectionStatus, { label: string; color: string; icon: typeof BookOpen }> = {
  owned: { label: "Owned", color: "var(--accent-green)", icon: Check },
  wishlist: { label: "Wishlist", color: "var(--accent-gold)", icon: Heart },
  reading: { label: "Reading", color: "var(--accent-blue)", icon: Eye },
  completed: { label: "Completed", color: "var(--accent-purple)", icon: Star },
};

type Tab = "library" | "coverage" | "recommendations" | "reading-plan";
type ViewMode = "list" | "grid";

interface EditionInfo {
  title: string;
  cover_image_url: string | null;
  format: string;
  importance: string;
  print_status: string;
  issues_collected: string;
}

interface CoverageData {
  eras: {
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
  }[];
  connections: {
    source_type: string;
    source_slug: string;
    target_type: string;
    target_slug: string;
    connection_type: string;
    strength: number;
    confidence: number;
    description: string;
  }[];
}

export default function CollectionContent({
  editionMap,
}: {
  editionMap: Record<string, EditionInfo>;
}) {
  const { items, hydrated, removeItem, updateStatus, authenticated } = useCollection();
  const [filter, setFilter] = useState<CollectionStatus | "all">("all");
  const [tab, setTab] = useState<Tab>("library");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Lazy-loaded data for Coverage & Recommendations tabs
  const [extraData, setExtraData] = useState<{
    coverageData: CoverageData;
    editionIssueMap: Record<string, string[]>;
    pathSummaries: PathSummary[];
  } | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchExtraData = useCallback(async () => {
    if (fetchedRef.current || extraData) return;
    fetchedRef.current = true;
    setExtraLoading(true);
    try {
      const res = await fetch("/api/collection-data");
      if (res.ok) {
        const json = await res.json();
        setExtraData(json);
      }
    } catch {
      fetchedRef.current = false;
    } finally {
      setExtraLoading(false);
    }
  }, [extraData]);

  useEffect(() => {
    if ((tab === "coverage" || tab === "recommendations" || tab === "reading-plan") && !extraData && !extraLoading) {
      fetchExtraData();
    }
  }, [tab, extraData, extraLoading, fetchExtraData]);

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts = {
    owned: items.filter((i) => i.status === "owned").length,
    wishlist: items.filter((i) => i.status === "wishlist").length,
    reading: items.filter((i) => i.status === "reading").length,
    completed: items.filter((i) => i.status === "completed").length,
  };

  function handleExport() {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marvel-cartographer-collection.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          for (const item of imported) {
            if (item.edition_slug && item.status) {
              updateStatus(item.edition_slug, item.status);
            }
          }
        }
      } catch {
        // Invalid file, ignore
      }
    };
    input.click();
  }

  if (!hydrated) {
    return (
      <div className="text-center py-20">
        <div
          className="inline-block w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--border-default)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          My Collection
        </h1>
        <div
          className="rounded-lg border p-12 text-center mt-6"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <LogIn size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
            Sign in to track your collection
          </p>
          <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
            Create an account to save your owned editions, wishlist, and reading progress across devices.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-red)", color: "#fff" }}
          >
            <LogIn size={16} />
            Sign In or Create Account
          </Link>
        </div>
      </div>
    );
  }

  const loadingSpinner = (
    <div className="text-center py-12">
      <div
        className="inline-block w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--border-default)", borderTopColor: "transparent" }}
      />
      <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
        Loading collection data...
      </p>
    </div>
  );

  return (
    <div>
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        My Collection
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        Track your Marvel collected editions. Your collection syncs across devices.
      </p>

      {/* Stats */}
      <div
        className="rounded-lg border p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        {(Object.entries(counts) as [CollectionStatus, number][]).map(([status, count]) => {
          const cfg = statusConfig[status];
          return (
            <div key={status} className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ color: cfg.color, fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                {count}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Newsletter Subscribe */}
      <div className="mb-6">
        <NewsletterSubscribe />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scrollbar-hide" style={{ borderColor: "var(--border-default)" }}>
        {([
          { id: "library" as Tab, label: "Library", icon: BookOpen },
          { id: "coverage" as Tab, label: "Coverage", icon: BarChart3 },
          { id: "recommendations" as Tab, label: "What to Buy Next", icon: Sparkles },
          { id: "reading-plan" as Tab, label: "Reading Plan", icon: Route },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all -mb-px whitespace-nowrap"
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              color: tab === t.id ? "var(--accent-red)" : "var(--text-tertiary)",
              borderBottom: tab === t.id ? "2px solid var(--accent-red)" : "2px solid transparent",
            }}
          >
            <t.icon size={14} />
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Coverage tab */}
      {tab === "coverage" && (
        extraData
          ? <CoverageHeatmap eras={extraData.coverageData.eras} />
          : loadingSpinner
      )}

      {/* Recommendations tab */}
      {tab === "recommendations" && (
        extraData ? (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Based on your collection, here are the best next editions to buy &mdash; scored by story connections,
              importance, availability, and overlap with what you already own.
            </p>
            <SmartRecommendations
              eras={extraData.coverageData.eras}
              connections={extraData.coverageData.connections}
              editionIssueMap={extraData.editionIssueMap}
            />
          </div>
        ) : loadingSpinner
      )}

      {/* Reading Plan tab */}
      {tab === "reading-plan" && (
        extraData ? (
          <ReadingPlan
            pathSummaries={extraData.pathSummaries}
            connections={extraData.coverageData.connections}
            eras={extraData.coverageData.eras}
          />
        ) : loadingSpinner
      )}

      {/* Library tab */}
      {tab === "library" && (
        <>
          {/* Filter + View toggle + Export/Import */}
          <div className="flex flex-wrap gap-1.5 mb-6 items-center">
            <button
              onClick={() => setFilter("all")}
              className="px-2.5 py-1 rounded text-xs font-bold transition-all"
              style={{
                background: filter === "all" ? "var(--bg-tertiary)" : "transparent",
                color: filter === "all" ? "var(--text-primary)" : "var(--text-tertiary)",
                border: `1px solid ${filter === "all" ? "var(--border-default)" : "transparent"}`,
              }}
            >
              All ({items.length})
            </button>
            {(Object.entries(statusConfig) as [CollectionStatus, typeof statusConfig.owned][]).map(
              ([status, cfg]) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className="px-2.5 py-1 rounded text-xs font-bold transition-all"
                  style={{
                    background: filter === status ? "var(--bg-tertiary)" : "transparent",
                    color: filter === status ? cfg.color : "var(--text-tertiary)",
                    border: `1px solid ${filter === status ? cfg.color : "transparent"}`,
                  }}
                >
                  {cfg.label} ({counts[status]})
                </button>
              )
            )}

            {/* Right side: view toggle + export/import */}
            <div className="flex gap-1 ml-auto items-center">
              {/* View mode toggle */}
              <div
                className="flex rounded-lg overflow-hidden border"
                style={{ borderColor: "var(--border-default)" }}
              >
                <button
                  onClick={() => setViewMode("list")}
                  className="flex items-center justify-center w-7 h-7 transition-colors"
                  style={{
                    background: viewMode === "list" ? "var(--bg-tertiary)" : "transparent",
                    color: viewMode === "list" ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                  title="List view"
                  aria-label="List view"
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className="flex items-center justify-center w-7 h-7 transition-colors"
                  style={{
                    background: viewMode === "grid" ? "var(--bg-tertiary)" : "transparent",
                    color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-tertiary)",
                    borderLeft: "1px solid var(--border-default)",
                  }}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              {items.length > 0 && (
                <>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    title="Export collection as JSON"
                  >
                    <Download size={12} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    title="Import collection from JSON"
                  >
                    <Upload size={12} />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Items */}
          {filtered.length === 0 ? (
            <div
              className="rounded-lg border p-12 text-center"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
            >
              <BookOpen size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {items.length === 0
                  ? "Your collection is empty. Browse editions and add them to start tracking."
                  : "No items match this filter."}
              </p>
              {items.length === 0 && (
                <Link
                  href="/search"
                  className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: "var(--accent-red)", color: "#fff" }}
                >
                  Browse Editions
                </Link>
              )}
            </div>
          ) : viewMode === "list" ? (
            /* ---- LIST VIEW ---- */
            <div className="space-y-2">
              {filtered.map((item) => {
                const cfg = statusConfig[item.status];
                const Icon = cfg.icon;
                const info = editionMap[item.edition_slug];
                const title = info?.title || item.edition_slug
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());

                return (
                  <div
                    key={item.edition_slug}
                    className="rounded-lg border p-3 flex items-center gap-3"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-default)",
                      borderLeft: `3px solid ${cfg.color}`,
                    }}
                  >
                    <Icon size={16} style={{ color: cfg.color }} className="flex-shrink-0" />
                    <Link
                      href={`/edition/${item.edition_slug}`}
                      className="flex-1 min-w-0 text-sm font-bold truncate transition-colors hover:text-[var(--accent-red)]"
                    >
                      {title}
                    </Link>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.edition_slug, e.target.value as CollectionStatus)}
                      className="text-xs rounded px-2 py-1 border cursor-pointer focus:outline-none"
                      style={{
                        background: "var(--bg-tertiary)",
                        borderColor: "var(--border-default)",
                        color: cfg.color,
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {Object.entries(statusConfig).map(([s, c]) => (
                        <option key={s} value={s}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeItem(item.edition_slug)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-red)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                      title="Remove from collection"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ---- GRID VIEW ---- */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((item) => {
                const cfg = statusConfig[item.status];
                const info = editionMap[item.edition_slug];
                const title = info?.title || item.edition_slug
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());

                return (
                  <div
                    key={item.edition_slug}
                    className="rounded-xl border overflow-hidden group relative"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    {/* Status color strip */}
                    <div className="h-1 w-full" style={{ background: cfg.color }} />

                    {/* Cover image */}
                    <Link href={`/edition/${item.edition_slug}`} className="block">
                      <div
                        className="relative w-full overflow-hidden"
                        style={{ aspectRatio: "2/3", background: "var(--bg-tertiary)" }}
                      >
                        <CoverImage
                          src={info?.cover_image_url}
                          alt={title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                          format={info?.format || "omnibus"}
                        />

                        {/* Status badge overlay */}
                        <div className="absolute top-2 left-2">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold"
                            style={{
                              background: cfg.color,
                              color: "#000",
                              fontSize: "0.6rem",
                              fontFamily: "var(--font-geist-mono), monospace",
                            }}
                          >
                            <cfg.icon size={10} />
                            {cfg.label.toUpperCase()}
                          </span>
                        </div>

                        {/* Importance badge overlay */}
                        {info && (
                          <div className="absolute top-2 right-2">
                            <ImportanceBadge level={info.importance as ImportanceLevel} />
                          </div>
                        )}

                        {/* Remove button (visible on hover) */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeItem(item.edition_slug);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                          title="Remove from collection"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </Link>

                    {/* Info below cover */}
                    <div className="p-2.5">
                      <Link href={`/edition/${item.edition_slug}`}>
                        <h3
                          className="text-xs font-bold leading-tight line-clamp-2 group-hover:text-[var(--accent-red)] transition-colors"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {title}
                        </h3>
                      </Link>

                      {info && (
                        <p
                          className="text-xs mt-1 truncate"
                          style={{
                            color: "var(--text-tertiary)",
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "0.65rem",
                          }}
                        >
                          {info.issues_collected}
                        </p>
                      )}

                      {/* Status selector */}
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.edition_slug, e.target.value as CollectionStatus)}
                        className="w-full mt-2 text-xs rounded px-1.5 py-1 border cursor-pointer focus:outline-none"
                        style={{
                          background: "var(--bg-tertiary)",
                          borderColor: "var(--border-default)",
                          color: cfg.color,
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: "0.7rem",
                        }}
                      >
                        {Object.entries(statusConfig).map(([s, c]) => (
                          <option key={s} value={s}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

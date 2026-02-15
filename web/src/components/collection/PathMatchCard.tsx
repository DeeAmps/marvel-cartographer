"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Check, AlertTriangle, Heart } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import type { PathMatch, PathSummaryEntry } from "@/lib/reading-order";
import type { ImportanceLevel, PrintStatus } from "@/lib/types";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "var(--accent-green)",
  intermediate: "var(--accent-gold)",
  advanced: "var(--accent-red)",
  completionist: "var(--text-tertiary)",
};

const PATH_TYPE_LABELS: Record<string, string> = {
  curated: "Curated",
  character: "Character",
  team: "Team",
  event: "Event",
  creator: "Creator",
  thematic: "Thematic",
  complete: "Complete",
};

export default function PathMatchCard({ match }: { match: PathMatch }) {
  const [expanded, setExpanded] = useState(false);
  const { addItem } = useCollection();
  const { path, ownedCount, totalCount, completionPct, gapCount } = match;

  const isComplete = completionPct === 100;
  const ownedSet = new Set(match.ownedSlugs);

  return (
    <div
      className="rounded-lg border overflow-hidden transition-colors"
      style={{
        background: "var(--bg-secondary)",
        borderColor: isComplete ? "var(--accent-green)" : "var(--border-default)",
      }}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        {/* Completion bar (circular) */}
        <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
          <svg viewBox="0 0 36 36" width={40} height={40}>
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={isComplete ? "var(--accent-green)" : "var(--accent-gold)"}
              strokeWidth="3"
              strokeDasharray={`${completionPct}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-bold"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              color: isComplete ? "var(--accent-green)" : "var(--text-primary)",
              fontSize: "0.65rem",
            }}
          >
            {completionPct}%
          </span>
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="text-sm font-bold truncate"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-bricolage), sans-serif",
              }}
            >
              {path.name}
            </h3>
            {isComplete && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold"
                style={{
                  background: "var(--accent-green)",
                  color: "#000",
                  fontSize: "0.6rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                <Check size={10} />
                COMPLETE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-tertiary)",
                color: DIFFICULTY_COLORS[path.difficulty] || "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.65rem",
              }}
            >
              {path.difficulty.toUpperCase()}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.65rem",
              }}
            >
              {PATH_TYPE_LABELS[path.path_type] || path.path_type}
            </span>
            <span
              className="text-xs"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.65rem",
              }}
            >
              {ownedCount} of {totalCount} owned
            </span>
            {gapCount > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-xs"
                style={{
                  color: "var(--accent-gold)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.65rem",
                }}
              >
                <AlertTriangle size={10} />
                {gapCount} missing
              </span>
            )}
          </div>
        </div>

        {/* Expand icon */}
        <div style={{ color: "var(--text-tertiary)" }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="border-t px-4 pb-4 pt-3"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* You Own column */}
            <div>
              <h4
                className="text-xs font-bold mb-2"
                style={{
                  color: "var(--accent-green)",
                  fontFamily: "var(--font-bricolage), sans-serif",
                }}
              >
                YOU OWN ({match.ownedSlugs.length})
              </h4>
              {match.ownedSlugs.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  None yet
                </p>
              ) : (
                <div className="space-y-1.5">
                  {path.entries
                    .filter((e) => ownedSet.has(e.edition_slug))
                    .map((entry) => (
                      <EntryRow
                        key={entry.edition_slug}
                        entry={entry}
                        owned
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Missing column */}
            <div>
              <h4
                className="text-xs font-bold mb-2"
                style={{
                  color: "var(--accent-red)",
                  fontFamily: "var(--font-bricolage), sans-serif",
                }}
              >
                MISSING ({match.missingSlugs.length})
              </h4>
              {match.missingSlugs.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  All editions owned!
                </p>
              ) : (
                <div className="space-y-1.5">
                  {path.entries
                    .filter((e) => !ownedSet.has(e.edition_slug))
                    .map((entry) => (
                      <EntryRow
                        key={entry.edition_slug}
                        entry={entry}
                        owned={false}
                        onAddToWishlist={() =>
                          addItem(entry.edition_slug, "wishlist")
                        }
                      />
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Link to full path */}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border-default)" }}>
            <Link
              href={`/path/${path.slug}`}
              className="text-xs font-bold transition-colors hover:opacity-80"
              style={{ color: "var(--accent-blue)" }}
            >
              View Full Reading Path →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  owned,
  onAddToWishlist,
}: {
  entry: PathSummaryEntry;
  owned: boolean;
  onAddToWishlist?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded px-2 py-1.5"
      style={{ background: "var(--bg-tertiary)" }}
    >
      {owned ? (
        <Check size={12} style={{ color: "var(--accent-green)" }} className="flex-shrink-0" />
      ) : (
        <div
          className="w-3 h-3 rounded-full border flex-shrink-0"
          style={{ borderColor: "var(--border-default)" }}
        />
      )}

      <Link
        href={`/edition/${entry.edition_slug}`}
        className="flex-1 min-w-0 text-xs truncate transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-primary)" }}
      >
        {entry.title}
      </Link>

      <ImportanceBadge level={entry.importance as ImportanceLevel} />

      {!owned && (
        <>
          <StatusBadge status={entry.print_status as PrintStatus} />
          {onAddToWishlist && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToWishlist();
              }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors hover:opacity-80"
              style={{
                background: "var(--accent-gold)",
                color: "#000",
                fontSize: "0.6rem",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
              title="Add to Wishlist"
            >
              <Heart size={9} />
              WISH
            </button>
          )}
        </>
      )}

      {entry.is_optional && (
        <span
          className="text-xs"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.55rem",
          }}
        >
          OPT
        </span>
      )}
    </div>
  );
}

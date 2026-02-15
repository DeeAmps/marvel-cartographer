"use client";

import Link from "next/link";
import { Check, X, Heart, BookOpen, Eye } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import type { ImportanceLevel } from "@/lib/types";

interface Props {
  editionSlug: string;
  editionTitle: string;
  issuesCollected: string;
  importance: string;
  connectionType: string;
  description: string;
  category: "required" | "recommended" | "helpful";
}

const CATEGORY_COLORS = {
  required: "var(--accent-red)",
  recommended: "var(--accent-gold)",
  helpful: "var(--accent-blue)",
};

const CONNECTION_LABELS: Record<string, string> = {
  prerequisite: "Read this first",
  recommended_after: "Best to read before",
  leads_to: "Leads into this story",
  references: "Referenced in this story",
  ties_into: "Ties into this story",
  spin_off: "Spins off into this",
  parallel: "Happening at the same time",
  retcons: "Recontextualizes this story",
};

const STATUS_CONFIG = {
  owned: { label: "OWNED", color: "var(--accent-green)", Icon: Check },
  completed: { label: "READ", color: "var(--accent-purple)", Icon: Check },
  reading: { label: "READING", color: "var(--accent-blue)", Icon: Eye },
  wishlist: { label: "WISHLIST", color: "var(--accent-gold)", Icon: Heart },
} as const;

export default function PrerequisiteItem({
  editionSlug,
  editionTitle,
  issuesCollected,
  importance,
  connectionType,
  description,
  category,
}: Props) {
  const { getStatus, addItem, authenticated, hydrated } = useCollection();
  const status = getStatus(editionSlug);

  const hasIt = status === "owned" || status === "completed" || status === "reading";
  const statusCfg = status ? STATUS_CONFIG[status] : null;

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: "var(--bg-tertiary)",
        borderColor: "var(--border-default)",
        borderLeftWidth: "3px",
        borderLeftColor: CATEGORY_COLORS[category],
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Collection status indicator */}
            {authenticated && hydrated && (
              hasIt ? (
                <Check size={14} style={{ color: "var(--accent-green)" }} className="flex-shrink-0" />
              ) : (
                <X size={14} style={{ color: "var(--accent-red)" }} className="flex-shrink-0 opacity-60" />
              )
            )}
            <Link
              href={`/edition/${editionSlug}`}
              className="text-sm font-bold hover:text-[var(--accent-red)] transition-colors"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {editionTitle}
            </Link>
          </div>
          <p
            className="text-xs mt-0.5"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.7rem",
              marginLeft: authenticated && hydrated ? "22px" : "0",
            }}
          >
            {issuesCollected}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Collection status badge */}
          {authenticated && hydrated && statusCfg && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold"
              style={{
                background: `color-mix(in srgb, ${statusCfg.color} 15%, transparent)`,
                color: statusCfg.color,
                fontSize: "0.6rem",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              <statusCfg.Icon size={9} />
              {statusCfg.label}
            </span>
          )}
          {/* Add to Wishlist button for missing prerequisites */}
          {authenticated && hydrated && !status && (
            <button
              onClick={() => addItem(editionSlug, "wishlist")}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold transition-colors hover:opacity-80"
              style={{
                background: "var(--accent-gold)",
                color: "#000",
                fontSize: "0.6rem",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
              title="Add to Wishlist"
            >
              <Heart size={9} />
              ADD
            </button>
          )}
          <ImportanceBadge level={importance as ImportanceLevel} />
        </div>
      </div>
      {description && (
        <p
          className="text-xs mt-1.5"
          style={{
            color: "var(--text-secondary)",
            marginLeft: authenticated && hydrated ? "22px" : "0",
          }}
        >
          {description}
        </p>
      )}
      <span
        className="text-xs mt-1 inline-block"
        style={{
          color: CATEGORY_COLORS[category],
          fontSize: "0.65rem",
          fontFamily: "var(--font-geist-mono), monospace",
          marginLeft: authenticated && hydrated ? "22px" : "0",
        }}
      >
        {CONNECTION_LABELS[connectionType] || connectionType.replace(/_/g, " ").toUpperCase()}
      </span>
    </div>
  );
}

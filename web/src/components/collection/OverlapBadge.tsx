"use client";

import { useMemo } from "react";
import { useCollection } from "@/hooks/useCollection";

/**
 * Displays an overlap percentage badge for an edition card.
 * Shows how much of this edition's content the user already owns.
 * Reads collection from localStorage via useCollection hook.
 */
export default function OverlapBadge({
  editionSlug,
  issueKeys,
  ownedIssueSet,
}: {
  editionSlug: string;
  issueKeys: string[];
  /** Pre-computed set of all owned issue keys (passed from parent to avoid re-computation per card) */
  ownedIssueSet: Set<string>;
}) {
  const { items, hydrated } = useCollection();

  const overlapPct = useMemo(() => {
    if (!hydrated || items.length === 0 || issueKeys.length === 0) return 0;

    // Check if user already owns this edition
    const status = items.find((i) => i.edition_slug === editionSlug)?.status;
    if (status === "owned" || status === "completed") return -1; // -1 = owned, don't show overlap

    let overlap = 0;
    for (const key of issueKeys) {
      if (ownedIssueSet.has(key)) overlap++;
    }
    return issueKeys.length > 0 ? Math.round((overlap / issueKeys.length) * 100) : 0;
  }, [hydrated, items, editionSlug, issueKeys, ownedIssueSet]);

  if (!hydrated || overlapPct === 0 || overlapPct === -1) return null;

  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-bold"
      style={{
        background: overlapPct > 50
          ? "var(--status-out-of-print)"
          : overlapPct > 20
            ? "var(--status-ongoing)"
            : "var(--bg-tertiary)",
        color: overlapPct > 20 ? "#fff" : "var(--text-tertiary)",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "0.5rem",
      }}
    >
      {overlapPct}% OWNED
    </span>
  );
}

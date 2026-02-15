"use client";

import { useCollection } from "@/hooks/useCollection";

export default function PathCollectionStatus({
  pathSlug,
  editionSlugs,
}: {
  pathSlug: string;
  editionSlugs: string[];
}) {
  const { items, hydrated } = useCollection();
  if (!hydrated) return null;

  const ownedSlugs = new Set(
    items
      .filter((i) => i.status === "owned" || i.status === "completed")
      .map((i) => i.edition_slug)
  );
  const ownedCount = editionSlugs.filter((s) => ownedSlugs.has(s)).length;
  const totalCount = editionSlugs.length;
  const gapCount = totalCount - ownedCount;
  const estimatedCost = gapCount * 50;
  const pct = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0;

  return (
    <div
      className="rounded-lg border p-4 mb-6"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-bold uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          Collection Progress
        </span>
        <span
          className="text-xs font-bold"
          style={{
            color: "var(--accent-gold)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {ownedCount} / {totalCount} owned
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              pct === 100 ? "var(--accent-green)" : "var(--accent-gold)",
          }}
        />
      </div>
      {gapCount > 0 && (
        <div className="flex items-center justify-between mt-2">
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {gapCount} edition{gapCount !== 1 ? "s" : ""} to complete this
            path
          </span>
          <span
            className="text-xs"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            ~${estimatedCost} estimated
          </span>
        </div>
      )}
      {pct === 100 && (
        <p
          className="text-xs mt-2 font-bold"
          style={{ color: "var(--accent-green)" }}
        >
          You own every edition in this path!
        </p>
      )}
    </div>
  );
}

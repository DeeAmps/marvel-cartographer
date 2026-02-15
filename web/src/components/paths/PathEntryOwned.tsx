"use client";

import { useCollection } from "@/hooks/useCollection";

export default function PathEntryOwned({
  editionSlug,
}: {
  editionSlug: string;
}) {
  const { getStatus, hydrated } = useCollection();
  if (!hydrated) return null;

  const status = getStatus(editionSlug);
  if (!status) return null;

  const isOwned = status === "owned" || status === "completed";

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold"
      style={{
        background: isOwned
          ? "rgba(0, 230, 118, 0.15)"
          : "rgba(240, 165, 0, 0.15)",
        color: isOwned ? "var(--accent-green)" : "var(--accent-gold)",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "0.75rem",
      }}
    >
      {status === "completed"
        ? "READ"
        : status === "owned"
          ? "OWNED"
          : status === "reading"
            ? "READING"
            : "WISHLIST"}
    </span>
  );
}

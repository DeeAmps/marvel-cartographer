"use client";

import { useCollection } from "@/hooks/useCollection";
import { Check, AlertTriangle } from "lucide-react";

export default function PrerequisiteCollectionStatus({
  prerequisiteSlugs,
}: {
  prerequisiteSlugs: string[];
}) {
  const { items, authenticated, hydrated } = useCollection();

  if (!authenticated || !hydrated || prerequisiteSlugs.length === 0) return null;

  const ownedOrCompleted = new Set(
    items
      .filter((i) => i.status === "owned" || i.status === "completed" || i.status === "reading")
      .map((i) => i.edition_slug)
  );

  const owned = prerequisiteSlugs.filter((s) => ownedOrCompleted.has(s));
  const missing = prerequisiteSlugs.filter((s) => !ownedOrCompleted.has(s));

  if (missing.length === 0) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 mt-2"
        style={{
          background: "rgba(0, 230, 118, 0.1)",
          border: "1px solid var(--accent-green)",
        }}
      >
        <Check size={14} style={{ color: "var(--accent-green)" }} />
        <span className="text-xs font-bold" style={{ color: "var(--accent-green)" }}>
          You own all {owned.length} prerequisite{owned.length !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 mt-2"
      style={{
        background: "rgba(233, 69, 96, 0.1)",
        border: "1px solid var(--accent-red)",
      }}
    >
      <AlertTriangle size={14} style={{ color: "var(--accent-red)" }} />
      <span className="text-xs font-bold" style={{ color: "var(--accent-red)" }}>
        Missing {missing.length} prerequisite{missing.length !== 1 ? "s" : ""}
      </span>
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        ({owned.length}/{prerequisiteSlugs.length} owned)
      </span>
    </div>
  );
}

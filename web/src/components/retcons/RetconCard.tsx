import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HandbookEntryType } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  character: "var(--accent-red)",
  team: "var(--accent-blue)",
  location: "var(--accent-green)",
  artifact: "var(--accent-gold)",
  species: "var(--accent-purple)",
  editorial_concept: "var(--text-tertiary)",
};

export default function RetconCard({
  entrySlug,
  entryName,
  entryType,
  year,
  description,
  oldState,
  newState,
  source,
}: {
  entrySlug: string;
  entryName: string;
  entryType: string;
  year: number;
  description: string;
  oldState: string;
  newState: string;
  source: string;
}) {
  const typeColor = TYPE_COLORS[entryType] || "var(--text-tertiary)";

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <Link
            href={`/handbook/${entrySlug}`}
            className="text-sm font-bold hover:text-[var(--accent-red)] transition-colors"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {entryName}
          </Link>
          <span
            className="ml-2 text-xs px-1.5 py-0.5 rounded font-bold uppercase"
            style={{
              background: `${typeColor}20`,
              color: typeColor,
              fontSize: "0.65rem",
            }}
          >
            {entryType.replace(/_/g, " ")}
          </span>
        </div>
        <span
          className="text-xs font-bold flex-shrink-0"
          style={{
            color: "var(--accent-gold)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {year}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>

      {/* Before → After */}
      <div
        className="rounded-lg border p-3 flex items-center gap-3"
        style={{
          background: "var(--bg-tertiary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-bold uppercase mb-0.5"
            style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
          >
            Before
          </p>
          <p className="text-xs" style={{ color: "var(--status-out-of-print)" }}>
            {oldState}
          </p>
        </div>
        <ArrowRight size={14} className="flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-bold uppercase mb-0.5"
            style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
          >
            After
          </p>
          <p className="text-xs" style={{ color: "var(--status-in-print)" }}>
            {newState}
          </p>
        </div>
      </div>

      {/* Source */}
      <p
        className="text-xs mt-2"
        style={{
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "0.65rem",
        }}
      >
        Source: {source}
      </p>
    </div>
  );
}

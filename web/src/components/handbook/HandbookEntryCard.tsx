import Link from "next/link";
import HandbookTypeBadge from "./HandbookTypeBadge";
import ConfidenceScore from "@/components/ui/ConfidenceScore";
import type { HandbookEntry } from "@/lib/types";

export default function HandbookEntryCard({
  entry,
}: {
  entry: HandbookEntry;
}) {
  return (
    <Link href={`/handbook/${entry.slug}`} className="block group">
      <div
        className="rounded-lg border p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <HandbookTypeBadge type={entry.entry_type} />
          <ConfidenceScore score={entry.canon_confidence} />
        </div>
        <h3
          className="text-sm font-bold tracking-tight mb-1 group-hover:text-[var(--accent-red)] transition-colors"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {entry.name}
        </h3>
        <p
          className="text-xs leading-relaxed line-clamp-2 mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          {entry.core_concept}
        </p>
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.65rem",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

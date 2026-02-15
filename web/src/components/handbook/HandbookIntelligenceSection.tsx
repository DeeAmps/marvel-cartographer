import Link from "next/link";
import { BookMarked } from "lucide-react";
import HandbookTypeBadge from "./HandbookTypeBadge";
import ConfidenceScore from "@/components/ui/ConfidenceScore";
import type { HandbookEntry } from "@/lib/types";

export default function HandbookIntelligenceSection({
  entries,
  title = "Continuity Intelligence",
}: {
  entries: HandbookEntry[];
  title?: string;
}) {
  if (entries.length === 0) return null;

  return (
    <section
      className="rounded-lg border p-6 mt-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <h2
        className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        <BookMarked size={18} style={{ color: "var(--accent-purple)" }} />
        {title}
      </h2>
      <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
        Key characters, concepts, and artifacts referenced in this volume.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={`/handbook/${entry.slug}`}
            className="rounded-lg border p-3 transition-all hover:border-[var(--accent-purple)] hover:shadow-lg hover:shadow-[var(--accent-purple)]/5"
            style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-default)" }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <HandbookTypeBadge type={entry.entry_type} />
              <ConfidenceScore score={entry.canon_confidence} />
            </div>
            <h4 className="text-sm font-bold mb-0.5">{entry.name}</h4>
            <p
              className="text-xs line-clamp-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {entry.core_concept}
            </p>
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-tertiary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
